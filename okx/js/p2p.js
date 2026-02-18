/**
 * P2P Data Mesh (WebTorrent) Module
 * Simplified P2P using WebTorrent with public trackers.
 * No manual WebRTC signaling needed — trackers handle peer discovery.
 */

let WebTorrent = null;
try {
    const mod = await import('https://cdn.jsdelivr.net/npm/webtorrent@2.8.5/dist/webtorrent.min.js');
    WebTorrent = mod.default || mod.WebTorrent || mod;
    console.log('[P2P] ✅ WebTorrent module loaded:', typeof WebTorrent);
} catch (err) {
    console.warn('[P2P] ❌ WebTorrent import failed:', err.message);
    console.warn('[P2P] P2P features will be disabled.');
}
const TRACKERS = [
    'wss://tracker.webtorrent.dev',
    'wss://tracker.openwebtorrent.com'
];

// Room ID used to group peers viewing the same dashboard
const ROOM_PREFIX = 'okx-mesh-v2-';

class P2PMesh {
    constructor(ws, onDataCallback) {
        this.ws = ws;
        this.onData = onDataCallback;
        this.peerId = null;
        this.isSuperPeer = false;
        this.client = null;
        this.peers = new Map();       // peerId -> { wire }
        this.chunkCache = new Map();  // coin -> { data, ts }
        this.activeTorrents = new Map(); // infoHash -> torrent
        this.roomId = ROOM_PREFIX + 'default';
        this._statsInterval = null;
        this._cleanupInterval = null;
        this.onMeshReady = null;

        // Stats
        this._stats = {
            connected: 0,
            totalPeers: 0,
            bytesSent: 0,
            bytesReceived: 0
        };
    }

    /**
     * Initialize the WebTorrent client and join the room
     */
    init(peerId, config = {}) {
        this.peerId = peerId;
        this.isSuperPeer = config.isSuperPeer || false;
        this.roomId = ROOM_PREFIX + (config.room || 'default');

        try {
            if (!WebTorrent) {
                console.warn('[P2P] WebTorrent module not loaded. P2P disabled.');
                return;
            }

            this.client = new WebTorrent({
                tracker: {
                    announce: TRACKERS
                }
            });

            this.client.on('error', (err) => {
                console.warn('[P2P] WebTorrent error:', err.message);
            });

            this.client.on('warning', (err) => {
                console.debug('[P2P] WebTorrent warning:', err.message);
            });

            // Seed an empty "room beacon" torrent so peers can find each other
            this._seedRoomBeacon();

            // Periodic cleanup of old torrents
            this._cleanupInterval = setInterval(() => this._cleanupOldTorrents(), 30000);

            // Periodic stats update
            this._statsInterval = setInterval(() => this._updateStats(), 5000);

            console.log(`[P2P] WebTorrent initialized. PeerId: ${peerId}, SuperPeer: ${this.isSuperPeer}`);

            // Notify mesh ready after short delay for tracker connection
            setTimeout(() => {
                if (this.onMeshReady) this.onMeshReady();
            }, 3000);

        } catch (err) {
            console.error('[P2P] Failed to initialize WebTorrent:', err);
        }
    }

    /**
     * Seed a room beacon torrent that all peers in the same room join.
     * This creates a swarm where peers can discover each other.
     */
    _seedRoomBeacon() {
        const beaconData = new Blob([JSON.stringify({ room: this.roomId, ts: Date.now(), peer: this.peerId })], { type: 'application/json' });

        // Create a deterministic torrent name so all peers join the same swarm
        const opts = {
            name: this.roomId + '-beacon.json',
            announce: TRACKERS
        };

        this.client.seed(beaconData, opts, (torrent) => {
            console.log(`[P2P] Room beacon seeded. Magnet: ${torrent.magnetURI.substring(0, 60)}...`);
            this.activeTorrents.set('beacon', torrent);

            torrent.on('wire', (wire) => {
                const remotePeerId = wire.peerId || `peer_${Math.random().toString(36).slice(2, 8)}`;
                this.peers.set(remotePeerId, { wire, connectedAt: Date.now() });
                console.log(`[P2P] 🟢 Peer connected: ${remotePeerId} (Total: ${this.peers.size})`);
                this._updateStats();
            });
        });
    }

    /**
     * Broadcast data to all connected peers via a new torrent
     */
    broadcast(data) {
        if (!this.client) return;
        if (!data) return;

        try {
            const json = JSON.stringify(data);
            const blob = new Blob([json], { type: 'application/json' });
            const name = `${this.roomId}-${data.coin || 'broadcast'}-${Date.now()}.json`;

            this.client.seed(blob, { name, announce: TRACKERS }, (torrent) => {
                this._stats.bytesSent += json.length;
                this.activeTorrents.set(torrent.infoHash, torrent);

                // Auto-remove after 30s to prevent memory leak
                setTimeout(() => {
                    try {
                        torrent.destroy();
                        this.activeTorrents.delete(torrent.infoHash);
                    } catch (e) { }
                }, 30000);
            });
        } catch (err) {
            console.warn('[P2P] Broadcast error:', err.message);
        }
    }

    /**
     * Announce chunk availability (torrent-style)
     */
    announceChunk(coin, data) {
        this.chunkCache.set(coin, { data, ts: Date.now() });

        // Broadcast to peers
        this.broadcast({ ...data, __chunkType: 'announce', coin });
    }

    /**
     * Request chunk from peers
     */
    requestChunk(coin) {
        const cached = this.chunkCache.get(coin);
        if (cached && (Date.now() - cached.ts) < 10000) {
            // Fresh in cache
            if (this.onData) this.onData(cached.data, 'cache');
            return;
        }
        // Request not directly possible with WebTorrent without magnet
        // Peers will broadcast their chunks naturally
        console.debug(`[P2P] Chunk request for ${coin} — waiting for peer broadcast`);
    }

    /**
     * Update peer chunks (compatibility method)
     */
    updatePeerChunks(peerId, chunks) {
        // No-op in WebTorrent mode — chunks are handled via torrent protocol
    }

    /**
     * Check if chunk is fresh
     */
    isChunkFresh(coin) {
        const cached = this.chunkCache.get(coin);
        return cached && (Date.now() - cached.ts) < 10000;
    }

    /**
     * Update internal stats
     */
    _updateStats() {
        if (!this.client) return;

        // Count active wires across all torrents
        let totalWires = 0;
        const peerSet = new Set();

        this.client.torrents.forEach(torrent => {
            torrent.wires.forEach(wire => {
                totalWires++;
                if (wire.peerId) peerSet.add(wire.peerId);
            });
        });

        this._stats.connected = peerSet.size;
        this._stats.totalPeers = totalWires;
    }

    /**
     * Cleanup old torrents to prevent memory buildup
     */
    _cleanupOldTorrents() {
        const now = Date.now();
        const MAX_AGE = 60000; // 1 minute

        for (const [hash, torrent] of this.activeTorrents) {
            if (hash === 'beacon') continue; // Keep beacon alive
            if (torrent.created && (now - torrent.created.getTime()) > MAX_AGE) {
                try {
                    torrent.destroy();
                    this.activeTorrents.delete(hash);
                } catch (e) { }
            }
        }
    }

    /**
     * Send message via WebSocket (kept for compatibility with main.js)
     */
    sendMessage(msg) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    /**
     * Update peer list (compatibility — WebTorrent handles this via trackers)
     */
    updatePeerList(peers, superPeers = []) {
        // WebTorrent manages peers via tracker protocol
        // Just log for debugging
        console.debug(`[P2P] Server reported ${peers.length} peers, ${superPeers.length} super-peers`);
    }

    // WebRTC signaling methods — NO LONGER NEEDED (handled by WebTorrent/tracker)
    handleOffer() { }
    handleAnswer() { }
    handleIceCandidate() { }

    /**
     * Get stats for Info tab display
     */
    getStats() {
        const peerList = [];
        for (const [id, info] of this.peers) {
            peerList.push({
                id: id,
                connectionState: 'connected',
                channelState: 'open',
                connectedAt: info.connectedAt
            });
        }

        return {
            peerId: this.peerId,
            isSuperPeer: this.isSuperPeer,
            connected: this._stats.connected,
            totalPeers: this._stats.totalPeers,
            peers: peerList,
            activeTorrents: this.activeTorrents.size,
            chunksCached: this.chunkCache.size,
            bytesSent: this._stats.bytesSent,
            bytesReceived: this._stats.bytesReceived,
            transport: 'WebTorrent'
        };
    }

    /**
     * Destroy the WebTorrent client and cleanup
     */
    destroy() {
        if (this._statsInterval) clearInterval(this._statsInterval);
        if (this._cleanupInterval) clearInterval(this._cleanupInterval);
        if (this._readyInterval) clearInterval(this._readyInterval);

        if (this.client) {
            try {
                this.client.destroy();
            } catch (e) { }
        }

        this.peers.clear();
        this.chunkCache.clear();
        this.activeTorrents.clear();
        console.log('[P2P] WebTorrent client destroyed.');
    }
}

export default P2PMesh;