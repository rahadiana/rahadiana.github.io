/**
 * P2P Data Mesh (WebRTC) Module
 * Handles decentralized data distribution to reduce server bandwidth.
 */

class P2PMesh {
    constructor(ws, onDataCallback) {
        this.ws = ws;
        this.onData = onDataCallback;
        this.peerId = null;
        this.peers = new Map(); // id -> RTCPeerConnection
        this.dataChannels = new Map(); // id -> RTCDataChannel
        this.iceCandidateBuffers = new Map(); // id -> RTCIceCandidate[]
        this.stats = new Map(); // id -> { sent: 0, received: 0, lastSeen: Date.now(), rtt: 0 }
        this.isSuperPeer = false;
        this.knownPeers = [];
        this.config = { superPeers: [] };
        this.onMeshReady = null; // Callback for server validation
        this.meshValidated = false;
    }

    init(peerId, config) {
        this.peerId = peerId;
        this.config = config;
        this.isSuperPeer = config.superPeers?.includes(peerId) || false;
        console.log(`[P2P] Initialized as ${this.isSuperPeer ? 'SUPERPEER' : 'DATAPEER'} (ID: ${peerId})`);
    }

    updatePeerList(peers, superPeers = []) {
        this.knownPeers = peers.filter(id => id !== this.peerId);

        // Dynamic Role Re-evaluation
        const wasSuperPeer = this.isSuperPeer;
        this.isSuperPeer = superPeers.includes(this.peerId);

        if (wasSuperPeer !== this.isSuperPeer) {
            console.log(`[P2P] Role Change: ${this.isSuperPeer ? 'PROMOTED TO SUPERPEER' : 'DEMOTED TO DATAPEER'}`);
        }

        // REDUNDANT FULL-MESH STRATEGY
        // Connect to ALL known peers to maximize data paths
        // Use lexicographical comparison (myId < targetId) to decide who initiates
        peers.forEach(id => {
            if (id !== this.peerId && !this.peers.has(id)) {
                if (this.peerId < id) {
                    console.log(`[P2P] (Initiator) Establishing Mesh Link TO: ${id}`);
                    this.connectToPeer(id);
                } else {
                    console.log(`[P2P] (Responder) Awaiting Mesh Link FROM: ${id}`);
                }
            }
        });
    }

    async connectToPeer(targetId) {
        if (this.peers.has(targetId)) return;
        const pc = this.createPeerConnection(targetId);

        // CREATE Channel (Initiator Only)
        const dc = pc.createDataChannel("marketData");
        this.setupDataChannel(targetId, dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.ws.send(JSON.stringify({
            type: 'offer',
            targetId,
            offer
        }));
    }

    async handleOffer(senderId, offer) {
        if (this.peers.has(senderId)) {
            const pc = this.peers.get(senderId);
            if (pc.signalingState === 'stable') return;
        }

        console.log(`[P2P] Processing offer FROM: ${senderId}`);
        const pc = this.createPeerConnection(senderId);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Apply candidates arriving early
        const buffer = this.iceCandidateBuffers.get(senderId) || [];
        if (buffer.length > 0) {
            console.log(`[P2P] Draining ${buffer.length} buffered candidates for ${senderId}`);
            while (buffer.length > 0) {
                const cand = buffer.shift();
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => { });
            }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.ws.send(JSON.stringify({
            type: 'answer',
            targetId: senderId,
            answer
        }));
    }

    async handleAnswer(senderId, answer) {
        const pc = this.peers.get(senderId);
        if (pc) {
            console.log(`[P2P] Processing answer FROM: ${senderId}`);
            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            const buffer = this.iceCandidateBuffers.get(senderId) || [];
            while (buffer.length > 0) {
                const cand = buffer.shift();
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => { });
            }
        }
    }

    async handleIceCandidate(senderId, candidate) {
        const pc = this.peers.get(senderId);

        if (!pc || !pc.remoteDescription) {
            if (!this.iceCandidateBuffers.has(senderId)) this.iceCandidateBuffers.set(senderId, []);
            this.iceCandidateBuffers.get(senderId).push(candidate);
            return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => { });
    }

    createPeerConnection(targetId) {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // RECEIVE Channel (Responder Only)
        pc.ondatachannel = (event) => {
            console.log(`[P2P] Received DataChannel FROM: ${targetId}`);
            this.setupDataChannel(targetId, event.channel);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.ws.send(JSON.stringify({ type: 'ice-candidate', targetId, candidate: event.candidate }));
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[P2P] Mesh Link (${targetId}): ${pc.connectionState}`);
            if (pc.connectionState === 'connected') this.iceCandidateBuffers.delete(targetId);
            if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
                this.peers.delete(targetId);
                this.dataChannels.delete(targetId);
                this.iceCandidateBuffers.delete(targetId);
                this.stats.delete(targetId);
            }
        };

        this.peers.set(targetId, pc);
        this.stats.set(targetId, { sent: 0, received: 0, lastSeen: Date.now(), rtt: 0 });
        return pc;
    }

    setupDataChannel(targetId, dc) {
        dc.onopen = () => {
            console.log(`[P2P] Channel (${targetId}) READY`);
            // Anti-Leech Validation Signal
            if (!this.meshValidated && this.onMeshReady) {
                this.meshValidated = true;
                this.onMeshReady();
            }
        };
        dc.onmessage = (e) => {
            try {
                const packet = JSON.parse(e.data);
                const peerStat = this.stats.get(targetId);
                if (peerStat) {
                    peerStat.received++;
                    peerStat.lastSeen = Date.now();
                    if (packet.ts) peerStat.rtt = Date.now() - packet.ts;
                }

                // Route packet data
                if (packet.type === 'stream' && packet.data) {
                    this.onData(packet.data);
                }
            } catch (err) { }
        };
        this.dataChannels.set(targetId, dc);
    }

    broadcast(data) {
        if (this.dataChannels.size === 0) return;

        // Wrap data in a structured packet for P2P routing/metrics
        const packet = JSON.stringify({ type: 'stream', ts: Date.now(), data: data });

        // Update local stats for each open channel
        this.dataChannels.forEach((dc, id) => {
            if (dc.readyState === 'open') {
                dc.send(packet);
                const stat = this.stats.get(id);
                if (stat) stat.sent++;
            }
        });
    }

    getStats() {
        const peers = Array.from(this.stats.entries()).map(([id, s]) => ({
            id,
            ...s,
            isSuper: this.config.superPeers?.includes(id) || false
        }));

        return {
            myId: this.peerId,
            isSuperPeer: this.isSuperPeer,
            peerCount: this.peers.size,
            knownPeersCount: this.knownPeers.length,
            peers
        };
    }
}

export default P2PMesh;
