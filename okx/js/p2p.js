/**
 * P2P Data Mesh (WebRTC) Module - ROBUST VERSION
 * Handles decentralized data distribution with improved stability
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
        this.retryCounts = new Map(); // id -> count
        this.isSuperPeer = false;
        this.knownPeers = [];
        this.config = { superPeers: [], gracePeriod: 600000 };
        this.onMeshReady = null; // Callback for server validation
        this.meshValidated = false;
        this.connectionTimeouts = new Map(); // id -> timeout
        this.validationSent = false;
        this.startTime = Date.now();

        // ⭐ TORRENT-STYLE: Chunk Cache & Peer Tracking
        this.chunkCache = new Map(); // coin -> { data, timestamp }
        this.peerChunks = new Map(); // peerId -> Set<coin>
        this.CHUNK_TTL = 5000; // 5s freshness guarantee
        this.pendingChunkRequests = new Map(); // coin -> Set<peerId> (who we asked)

        this.ICE_CONFIG = {
            iceServers: this.config.iceServers || [
                // Fallback if WServer doesn't provide (e.g. old version)
                { urls: 'stun:stun.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };
        this.MAX_RETRIES = 5; // allow more quick retries
        this.CONNECTION_TIMEOUT = 20000; // 20s per attempt (more patient)
        this.pendingAnswers = new Map(); // id -> answer (buffered answers)
    }

    sendMessage(msg) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
            return true;
        }
        return false;
    }

    init(peerId, config) {
        this.peerId = peerId;
        this.config = config;

        // ⭐ DYNAMIC STUN CONFIG: Use server-provided ICE servers
        if (config.iceServers && Array.isArray(config.iceServers) && config.iceServers.length > 0) {
            console.log(`[P2P] 📡 Received ${config.iceServers.length} ICE servers from WServer`);
            this.ICE_CONFIG.iceServers = config.iceServers;
        }

        this.isSuperPeer = config.superPeers?.includes(peerId) || false;
        console.log(`[P2P] Initialized as ${this.isSuperPeer ? 'SUPERPEER 🌟' : 'DATAPEER 📡'} (ID: ${peerId})`);
        console.log(`[P2P] Grace Period: ${Math.round(config.gracePeriod / 1000)}s`);

        // SuperPeers auto-validate (mereka gak perlu P2P)
        if (this.isSuperPeer && this.onMeshReady && !this.validationSent) {
            console.log('[P2P] SuperPeer auto-validating...');
            this.validationSent = true;
            this.onMeshReady();
        }
    }

    updatePeerList(peers, superPeers = []) {
        this.knownPeers = peers.filter(id => id !== this.peerId);

        // Dynamic Role Re-evaluation
        const wasSuperPeer = this.isSuperPeer;
        this.isSuperPeer = superPeers.includes(this.peerId);

        if (wasSuperPeer !== this.isSuperPeer) {
            console.log(`[P2P] Role Change: ${this.isSuperPeer ? '⬆️ PROMOTED TO SUPERPEER' : '⬇️ DEMOTED TO DATAPEER'}`);

            // Auto-validate jika jadi SuperPeer
            if (this.isSuperPeer && this.onMeshReady && !this.validationSent) {
                console.log('[P2P] Auto-validating as new SuperPeer...');
                this.validationSent = true;
                this.onMeshReady();
            }
        }

        // SIMPLIFIED TOPOLOGY - Prioritize stability over optimization
        let targets = new Set();

        if (peers.length <= 5) {
            // SMALL GROUP: Full-Mesh (everyone connects to everyone)
            peers.forEach(id => {
                if (id !== this.peerId) targets.add(id);
            });
        } else {
            // MEDIUM/LARGE GROUP: Connect to SuperPeers + 2 neighbors
            // 1. Always connect to all SuperPeers (reliable data sources)
            superPeers.forEach(id => {
                if (id !== this.peerId) targets.add(id);
            });

            // 2. Connect to nearest neighbors in ring topology
            const sortedPeers = [...peers].sort();
            const myIdx = sortedPeers.indexOf(this.peerId);
            if (myIdx !== -1) {
                const prev = sortedPeers[(myIdx - 1 + sortedPeers.length) % sortedPeers.length];
                const next = sortedPeers[(myIdx + 1) % sortedPeers.length];
                if (prev !== this.peerId) targets.add(prev);
                if (next !== this.peerId) targets.add(next);
            }
        }

        console.log(`[P2P] Target connections: ${targets.size} (${Array.from(targets).join(', ')})`);

        // Connect to new targets
        targets.forEach(id => {
            if (id !== this.peerId && !this.peers.has(id)) {
                // More aggressive initiation: initiate if lexicographically smaller
                // or with a probability to avoid waiting too long for the other side.
                // This trades occasional duplicate attempts for faster matching.
                // Strict initiation to avoid Glare (collision)
                // BUT: Always initiate to SuperPeers (servers are passive)
                const isTargetSuperPeer = superPeers.includes(id);
                const shouldInitiate = isTargetSuperPeer || (this.peerId < id);

                if (shouldInitiate) {
                    this.connectToPeer(id);
                }
            }
        });

        // Prune stale connections (Peers that are no longer in our target list)
        this.peers.forEach((pc, id) => {
            if (!targets.has(id)) {
                console.log(`[P2P] ✂️ Pruning stale connection: ${id}`);
                this.cleanupPeer(id);
            }
        });

        // Trigger early validation if we have at least one working connection
        this.checkEarlyValidation();
    }

    async connectToPeer(targetId) {
        if (this.peers.has(targetId)) return;

        // Notify server we're attempting
        this.sendMessage({ type: 'p2p:attempt', targetId });

        const pc = this.createPeerConnection(targetId);

        // Set connection timeout
        const timeout = setTimeout(() => {
            const state = pc.connectionState;
            if (state !== 'connected') {
                console.warn(`[P2P] ⏱️ Connection timeout to ${targetId} (state: ${state})`);
                this.cleanupPeer(targetId);
                this.retryConnection(targetId);
            }
        }, this.CONNECTION_TIMEOUT);
        this.connectionTimeouts.set(targetId, timeout);

        try {
            // CREATE Channel (Initiator Only)
            const dc = pc.createDataChannel("marketData", {
                ordered: false, // Faster delivery for real-time data
                maxRetransmits: 3
            });
            this.setupDataChannel(targetId, dc);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // ✅ FIX: Wait for ICE gathering
            console.log(`[P2P] ⏳ Waiting for ICE gathering for ${targetId}...`);
            await new Promise((resolve) => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const checkState = () => {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', checkState);
                            resolve();
                        }
                    };
                    pc.addEventListener('icegatheringstatechange', checkState);
                    setTimeout(resolve, 1000);
                }
            });

            this.sendMessage({
                type: 'offer',
                targetId,
                offer
            });
        } catch (err) {
            console.error(`[P2P] Error creating offer to ${targetId}:`, err);
            this.cleanupPeer(targetId);
        }
    }

    async handleOffer(senderId, offer) {
        if (this.peers.has(senderId)) {
            const pc = this.peers.get(senderId);
            if (pc.signalingState === 'stable') {
                console.log(`[P2P] Ignoring duplicate offer from ${senderId}`);
                return;
            }
        }

        // console.log(`[P2P] 📨 Processing offer from: ${senderId}`);

        // Notify server we're attempting
        this.sendMessage({ type: 'p2p:attempt', targetId: senderId });

        const pc = this.createPeerConnection(senderId);

        // Set connection timeout
        const timeout = setTimeout(() => {
            if (pc.connectionState !== 'connected') {
                console.warn(`[P2P] ⏱️ Connection timeout from ${senderId}`);
                this.cleanupPeer(senderId);
            }
        }, this.CONNECTION_TIMEOUT);
        this.connectionTimeouts.set(senderId, timeout);

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Drain buffered ICE candidates
            const buffer = this.iceCandidateBuffers.get(senderId) || [];
            if (buffer.length > 0) {
                console.log(`[P2P] 🧊 Applying ${buffer.length} buffered ICE candidates for ${senderId}`);
                for (const cand of buffer) {
                    await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => {
                        console.warn(`[P2P] ICE candidate error:`, e.message);
                    });
                }
                this.iceCandidateBuffers.delete(senderId);
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // ✅ FIX: Wait for ICE gathering
            console.log(`[P2P] ⏳ Waiting for ICE gathering (answer to ${senderId})...`);
            await new Promise((resolve) => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const checkState = () => {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', checkState);
                            resolve();
                        }
                    };
                    pc.addEventListener('icegatheringstatechange', checkState);
                    setTimeout(resolve, 1000);
                }
            });

            this.sendMessage({
                type: 'answer',
                targetId: senderId,
                answer
            });
        } catch (err) {
            console.error(`[P2P] Error handling offer from ${senderId}:`, err);
            this.cleanupPeer(senderId);
        }
    }

    async handleAnswer(senderId, answer) {
        const pc = this.peers.get(senderId);
        if (!pc) {
            console.warn(`[P2P] No peer connection for answer from ${senderId} — buffering until PC exists`);
            // Buffer the answer in case the offer/PC is still being created locally.
            // Try applying shortly after to handle races where answer arrives early.
            this.pendingAnswers.set(senderId, answer);
            setTimeout(async () => {
                const pending = this.pendingAnswers.get(senderId);
                const curPc = this.peers.get(senderId);
                if (!pending) return;
                if (curPc && (curPc.signalingState === 'have-local-offer' || curPc.signalingState === 'have-local-pranswer')) {
                    try {
                        await curPc.setRemoteDescription(new RTCSessionDescription(pending));
                        this.pendingAnswers.delete(senderId);
                        console.log(`[P2P] Applied buffered answer for ${senderId}`);
                    } catch (e) {
                        console.warn(`[P2P] Failed applying buffered answer for ${senderId}:`, e.message);
                    }
                }
            }, 500);
            return;
        }

        try {
            console.log(`[P2P] 📬 Processing answer from: ${senderId} (signalingState: ${pc.signalingState})`);

            // Only apply remote answer when we currently have a local offer.
            // If PC is already 'stable', the answer was likely already applied
            // or a glare resolution occurred; ignore to avoid InvalidStateError.
            // Sanitize answer type (handle cases where server sends null/missing type)
            const safeAnswer = {
                type: answer.type || 'answer',
                sdp: answer.sdp
            };

            if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-local-pranswer') {
                await pc.setRemoteDescription(new RTCSessionDescription(safeAnswer));

                // Drain buffered ICE candidates immediately after Remote Desc is set
                const buffer = this.iceCandidateBuffers.get(senderId) || [];
                if (buffer.length > 0) {
                    console.log(`[P2P] 🧊 Applying ${buffer.length} buffered ICE candidates for ${senderId}`);
                    for (const cand of buffer) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(cand));
                        } catch (e) {
                            console.warn(`[P2P] ICE candidate error:`, e.message);
                        }
                    }
                    this.iceCandidateBuffers.delete(senderId);
                }

            } else if (pc.signalingState === 'stable') {
                console.log(`[P2P] Ignoring answer from ${senderId}: already stable`);
                return;
            } else {
                // Buffer the answer briefly in case of race; try applying once shortly after.
                console.log(`[P2P] Buffering answer from ${senderId} (state: ${pc.signalingState})`);
                this.pendingAnswers.set(senderId, answer);
                setTimeout(async () => {
                    const pending = this.pendingAnswers.get(senderId);
                    const curPc = this.peers.get(senderId);
                    if (!pending || !curPc) return;
                    if (curPc.signalingState === 'have-local-offer' || curPc.signalingState === 'have-local-pranswer') {
                        try {
                            await curPc.setRemoteDescription(new RTCSessionDescription(pending));
                            this.pendingAnswers.delete(senderId);
                        } catch (e) {
                            console.warn(`[P2P] Failed applying buffered answer for ${senderId}:`, e.message);
                        }
                    }
                }, 500);
                return;
            }


        } catch (err) {
            console.error(`[P2P] Error handling answer from ${senderId}:`, err);
        }
    }

    async handleIceCandidate(senderId, candidate) {
        const pc = this.peers.get(senderId);

        if (!pc || !pc.remoteDescription) {
            // Buffer until remote description is set
            if (!this.iceCandidateBuffers.has(senderId)) {
                this.iceCandidateBuffers.set(senderId, []);
            }
            this.iceCandidateBuffers.get(senderId).push(candidate);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.warn(`[P2P] Error adding ICE candidate from ${senderId}:`, e.message);
        }
    }

    createPeerConnection(targetId) {
        // Robust ICE Servers (Google STUN + Community + Experimental TURN)
        const iceServers = [
            // Google STUN (Reliable)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Community STUN (Backups)
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.ideasip.com' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            { urls: 'stun:stun.voipstunt.com' },
            // Public TURN (Experimental/Unreliable - Use as last resort)
            {
                urls: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            }
        ];

        // Merge with existing config if needed, but prioritize our list
        const config = { ...this.config, iceServers };
        const pc = new RTCPeerConnection(config);

        // RECEIVE Channel (Responder Only)
        pc.ondatachannel = (event) => {
            console.log(`[P2P] 📡 Received DataChannel from: ${targetId}`);
            this.setupDataChannel(targetId, event.channel);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendMessage({
                    type: 'ice-candidate',
                    targetId,
                    candidate: event.candidate
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log(`[P2P] 🧊 ICE Connection State (${targetId}): ${state}`);
            if (state === 'failed') {
                console.warn(`[P2P] ❌ ICE Connection FAILED with ${targetId}`);
            }
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            console.log(`[P2P] Connection (${targetId}) state: ${state}`);

            if (state === 'connected') {
                // Clear timeout
                const timeout = this.connectionTimeouts.get(targetId);
                if (timeout) {
                    clearTimeout(timeout);
                    this.connectionTimeouts.delete(targetId);
                }

                // Clear buffers
                this.iceCandidateBuffers.delete(targetId);
                this.retryCounts.delete(targetId);

                // Notify server
                this.sendMessage({
                    type: 'p2p:connected',
                    targetId
                });

                console.log(`[P2P] ✅ Successfully connected to ${targetId}`);

                // ⭐ FORCE-CHECK: Send ping to ensure data channel works
                this.checkEarlyValidation();
            }

            if (['failed', 'closed', 'disconnected'].includes(state)) {
                // Notify server
                this.sendMessage({
                    type: 'p2p:disconnected',
                    targetId
                });

                this.cleanupPeer(targetId);

                // Only retry if peer still in known list
                if (this.knownPeers.includes(targetId)) {
                    this.retryConnection(targetId);
                }
            }
        };

        this.peers.set(targetId, pc);
        this.stats.set(targetId, { sent: 0, received: 0, lastSeen: Date.now(), rtt: 0 });
        return pc;
    }

    cleanupPeer(targetId) {
        // Clear timeout
        const timeout = this.connectionTimeouts.get(targetId);
        if (timeout) {
            clearTimeout(timeout);
            this.connectionTimeouts.delete(targetId);
        }

        // Close connection
        const pc = this.peers.get(targetId);
        if (pc) {
            try {
                pc.close();
            } catch (e) {
                console.warn(`[P2P] Error closing peer ${targetId}:`, e.message);
            }
        }

        this.peers.delete(targetId);
        this.dataChannels.delete(targetId);
        this.stats.delete(targetId); // ⭐ REMOVE Stats so they disappear from UI
        this.iceCandidateBuffers.delete(targetId);
    }

    retryConnection(targetId) {
        // Only initiator retries (lexicographic ordering)
        if (!this.knownPeers.includes(targetId) || this.peerId >= targetId) {
            return;
        }

        const count = this.retryCounts.get(targetId) || 0;
        if (count >= this.MAX_RETRIES) {
            console.warn(`[P2P] ❌ Max retries reached for ${targetId}`);
            return;
        }

        const delay = Math.min(Math.pow(2, count) * 1000, 10000); // exponential backoff, faster
        console.log(`[P2P] 🔄 Retrying connection to ${targetId} in ${delay / 1000}s (attempt ${count + 1}/${this.MAX_RETRIES})`);

        this.retryCounts.set(targetId, count + 1);

        setTimeout(() => {
            if (this.knownPeers.includes(targetId) && !this.peers.has(targetId)) {
                this.connectToPeer(targetId);
            }
        }, delay);
    }

    setupDataChannel(targetId, dc) {
        dc.onopen = () => {
            console.log(`[P2P] 🟢 Channel (${targetId}) OPEN`);
            this.checkEarlyValidation();
        };

        dc.onclose = () => {
            console.log(`[P2P] 🔴 Channel (${targetId}) CLOSED`);
        };

        dc.onerror = (err) => {
            console.error(`[P2P] Channel error (${targetId}):`, err);
        };

        dc.onmessage = async (e) => {
            try {
                let rawData;
                if (typeof e.data === 'string') {
                    rawData = e.data;
                } else if (e.data instanceof Blob) {
                    rawData = await e.data.text();
                } else if (e.data instanceof ArrayBuffer) {
                    rawData = new TextDecoder().decode(e.data);
                } else {
                    console.warn(`[P2P] Received unknown data format from ${targetId}`);
                    return;
                }

                if (!rawData) return;
                const packet = JSON.parse(rawData);
                const peerStat = this.stats.get(targetId);

                if (peerStat) {
                    peerStat.received++;
                    peerStat.lastSeen = Date.now();
                    if (packet.ts) {
                        peerStat.rtt = Date.now() - packet.ts;
                    }
                }

                // ⭐ TORRENT-STYLE: Handle chunk requests
                if (packet.type === 'chunk:request') {
                    const coin = packet.chunk;
                    const cached = this.chunkCache.get(coin);

                    if (cached && this.isChunkFresh(coin)) {
                        // Serve chunk to requesting peer
                        dc.send(JSON.stringify({
                            type: 'chunk:response',
                            chunk: coin,
                            data: cached.data,
                            timestamp: cached.timestamp
                        }));
                        console.log(`[TORRENT] 📤 Served chunk ${coin} to ${targetId}`);
                    } else {
                        console.log(`[TORRENT] ❌ Cannot serve stale/missing chunk ${coin}`);
                    }
                    return;
                }

                // ⭐ TORRENT-STYLE: Handle chunk responses
                if (packet.type === 'chunk:response') {
                    const coin = packet.chunk;
                    const age = Date.now() - packet.timestamp;

                    // Freshness check
                    if (age > this.CHUNK_TTL) {
                        console.log(`[TORRENT] ⏰ Rejected stale chunk ${coin} (age: ${age}ms)`);
                        return;
                    }

                    // Store and announce
                    this.chunkCache.set(coin, {
                        data: packet.data,
                        timestamp: packet.timestamp
                    });

                    // Clear pending request
                    this.pendingChunkRequests.get(coin)?.delete(targetId);

                    // Pass to main app
                    this.onData(packet.data, targetId);

                    // Announce that we now have this chunk
                    this.announceChunk(coin, packet.data);

                    console.log(`[TORRENT] ✅ Received fresh chunk ${coin} from ${targetId} (age: ${age}ms)`);
                    return;
                }

                // Route packet data to subscriber (include sender id when available)
                if (packet.type === 'stream' && packet.data) {
                    console.log(`[P2P] 📨 Stream Data from ${packet.from || targetId}: ${packet.data.coin}`);
                    try {
                        this.onData(packet.data, packet.from || targetId);
                    } catch (e) {
                        // fallback to original signature
                        this.onData(packet.data);
                    }
                }
            } catch (err) {
                console.warn(`[P2P] Parse Error from ${targetId}:`, err.message);
            }
        };

        this.dataChannels.set(targetId, dc);
    }

    checkEarlyValidation() {
        // Early validation: trigger as soon as we have ANY working connection
        const openChannels = Array.from(this.dataChannels.values())
            .filter(dc => dc.readyState === 'open');

        if (openChannels.length > 0 && !this.validationSent && this.onMeshReady) {
            console.log(`[P2P] ✅ Mesh validated! (${openChannels.length} active channels)`);
            this.validationSent = true;
            this.meshValidated = true;
            this.onMeshReady();
        }
    }

    broadcast(data) {
        const openChannels = Array.from(this.dataChannels.entries())
            .filter(([_, dc]) => dc.readyState === 'open');

        if (openChannels.length === 0) {
            return;
        }

        // Dashboard should NOT broadcast to SuperPeers (they are data sources, not consumers)
        // Only broadcast to other regular peers (if any)
        const targetChannels = openChannels.filter(([id, _]) => {
            return !this.config.superPeers?.includes(id);
        });

        if (targetChannels.length === 0) {
            // console.log('[P2P] No target peers for broadcast (only SuperPeers connected)');
            return;
        }

        console.log(`[P2P] Broadcasting to ${targetChannels.length} peers`);
        // Wrap in packet for P2P routing
        const packet = JSON.stringify({
            type: 'stream',
            ts: Date.now(),
            data: data,
            from: this.peerId
        });

        targetChannels.forEach(([id, dc]) => {
            try {
                dc.send(packet);
                const stat = this.stats.get(id);
                if (stat) stat.sent++;
            } catch (err) {
                console.warn(`[P2P] Send error to ${id}:`, err.message);
            }
        });
    }

    // ⭐ TORRENT-STYLE: Announce chunk availability
    announceChunk(coin, data) {
        const now = Date.now();

        // Store in cache with timestamp
        this.chunkCache.set(coin, { data, timestamp: now });

        // Announce to server (tracker)
        this.sendMessage({
            type: 'chunk:announce',
            chunk: coin
        });

        console.log(`[TORRENT] 📢 Announced chunk: ${coin}`);
    }

    // ⭐ TORRENT-STYLE: Request chunk from best peer
    requestChunk(coin) {
        // Find peers who have this chunk
        const candidates = [];
        this.peerChunks.forEach((chunks, peerId) => {
            if (chunks.has(coin)) {
                const stat = this.stats.get(peerId);
                candidates.push({ peerId, rtt: stat?.rtt || 999999 });
            }
        });

        if (candidates.length === 0) {
            console.log(`[TORRENT] ❌ No peers have chunk: ${coin}`);
            return false;
        }

        // Sort by RTT (prefer low-latency peers)
        candidates.sort((a, b) => a.rtt - b.rtt);
        const bestPeer = candidates[0].peerId;

        // Send request via P2P DataChannel
        const channel = this.dataChannels.get(bestPeer);
        if (channel && channel.readyState === 'open') {
            channel.send(JSON.stringify({
                type: 'chunk:request',
                chunk: coin
            }));

            // Track pending request
            if (!this.pendingChunkRequests.has(coin)) {
                this.pendingChunkRequests.set(coin, new Set());
            }
            this.pendingChunkRequests.get(coin).add(bestPeer);

            console.log(`[TORRENT] 📥 Requested chunk ${coin} from ${bestPeer}`);
            return true;
        }

        return false;
    }

    // ⭐ TORRENT-STYLE: Handle chunk availability update from server
    updatePeerChunks(peerId, chunks) {
        if (!this.peerChunks.has(peerId)) {
            this.peerChunks.set(peerId, new Set());
        }
        const peerSet = this.peerChunks.get(peerId);
        chunks.forEach(chunk => peerSet.add(chunk));
    }

    // ⭐ TORRENT-STYLE: Check if chunk is fresh
    isChunkFresh(coin) {
        const cached = this.chunkCache.get(coin);
        if (!cached) return false;
        return (Date.now() - cached.timestamp) < this.CHUNK_TTL;
    }

    getStats() {
        const peers = Array.from(this.stats.entries()).map(([id, s]) => ({
            id,
            ...s,
            isSuper: this.config.superPeers?.includes(id) || false,
            channelState: this.dataChannels.get(id)?.readyState || 'none',
            connectionState: this.peers.get(id)?.connectionState || 'none'
        }));

        return {
            myId: this.peerId,
            isSuperPeer: this.isSuperPeer,
            isValidated: this.meshValidated,
            startTime: this.startTime,
            peerCount: this.peers.size,
            activeChannels: Array.from(this.dataChannels.values())
                .filter(dc => dc.readyState === 'open').length,
            knownPeersCount: this.knownPeers.length,
            cachedChunks: this.chunkCache.size, // ⭐ NEW: Torrent stats
            peers
        };
    }
}

export default P2PMesh;