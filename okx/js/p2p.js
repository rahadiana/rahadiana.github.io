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
        this.isSuperPeer = config.superPeers.includes(peerId);
        console.log(`[P2P] Initialized as ${this.isSuperPeer ? 'SUPERPEER' : 'DATAPEER'} (ID: ${peerId})`);
    }

    updatePeerList(peers) {
        this.knownPeers = peers.filter(id => id !== this.peerId);

        // If we are a DataPeer, we want to connect to a SuperPeer (first in list)
        if (!this.isSuperPeer) {
            const superPeerId = peers[0]; // Simplistic election: first is always super
            if (superPeerId && superPeerId !== this.peerId && !this.peers.has(superPeerId)) {
                this.connectToPeer(superPeerId);
            }
        }
    }

    async connectToPeer(targetId) {
        if (this.peers.has(targetId)) return;
        console.log(`[P2P] Attempting connection to ${targetId}...`);
        const pc = this.createPeerConnection(targetId);

        const dc = pc.createDataChannel("marketData", { negotiated: true, id: 0 });
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
        if (this.peers.has(senderId)) return;
        console.log(`[P2P] Received offer from ${senderId}`);
        const pc = this.createPeerConnection(senderId);

        // Setup receiving channel
        const dc = pc.createDataChannel("marketData", { negotiated: true, id: 0 });
        this.setupDataChannel(senderId, dc);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
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
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    async handleIceCandidate(senderId, candidate) {
        const pc = this.peers.get(senderId);
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    createPeerConnection(targetId) {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    targetId,
                    candidate: event.candidate
                }));
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this.peers.delete(targetId);
                this.dataChannels.delete(targetId);
                this.stats.delete(targetId);
            }
        };

        this.peers.set(targetId, pc);
        this.stats.set(targetId, { sent: 0, received: 0, lastSeen: Date.now(), rtt: 0 });
        return pc;
    }

    setupDataChannel(targetId, dc) {
        dc.onopen = () => {
            console.log(`[P2P] DataChannel with ${targetId} OPEN`);
            // Anti-Leech Validation Signal
            if (!this.meshValidated && this.onMeshReady) {
                this.meshValidated = true;
                this.onMeshReady();
            }
        };
        dc.onmessage = (e) => {
            const data = JSON.parse(e.data);
            const peerStat = this.stats.get(targetId);
            if (peerStat) {
                peerStat.received++;
                peerStat.lastSeen = Date.now();
                // Simple RTT estimation if payload contains ts
                if (data.ts) peerStat.rtt = Date.now() - data.ts;
            }
            this.onData(data);
        };
        this.dataChannels.set(targetId, dc);
    }

    broadcast(data) {
        if (this.dataChannels.size === 0) return;
        const payload = JSON.stringify(data);
        this.dataChannels.forEach((dc, targetId) => {
            if (dc.readyState === 'open') {
                dc.send(payload);
                const peerStat = this.stats.get(targetId);
                if (peerStat) peerStat.sent++;
            }
        });
    }

    getStats() {
        const peers = Array.from(this.stats.entries()).map(([id, s]) => ({
            id,
            ...s,
            isSuper: this.config.superPeers.includes(id)
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
