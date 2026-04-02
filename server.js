const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 3000;
const ADMIN_PASSWORD = 'fox'; // Simple protection
const JWT_SECRET = 'super_secret_fox_key_123'; 

// Firebase Admin Initialization
let db;
try {
    if (fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))) {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        console.log('[+] Firebase Admin Initialized Successfully');
    } else {
        console.warn('[-] serviceAccountKey.json not found! Running in memory-only mode without Firestore syncing.');
        db = null;
    }
} catch (e) {
    console.error('[-] Failed to initialize Firebase Admin', e);
    db = null;
}

// Game State In-Memory (Cache)
const state = {
    players: {},    // { id: { id, name, lat, lng, updatedAt } }
    targets: [],    // [ { id, lat, lng, createdAt } ]
    discoveries: [] // [ { id, playerId, playerName, foxId, lat, lng, timestamp } ]
};

// Initial Sync from Firestore to Memory on Boot (if DB exists)
async function initializeState() {
    if (!db) return;
    try {
        console.log('[+] Fetching initial state from Firestore...');
        const tSnap = await db.collection('targets').get();
        state.targets = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const dSnap = await db.collection('discoveries').get();
        // For older records missing fields from the DB, normalize them:
        state.discoveries = dSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                playerId: data.playerId,
                playerName: data.playerName,
                foxId: data.foxId,
                foxName: data.foxName,
                lat: data.latitude || data.lat || 0,
                lng: data.longitude || data.lng || 0,
                timestamp: data.timestamp ? (data.timestamp.toMillis ? data.timestamp.toMillis() : Date.now()) : Date.now()
            };
        });

        const pSnap = await db.collection('players').get();
        pSnap.docs.forEach(d => {
            state.players[d.id] = { id: d.id, ...d.data(), updatedAt: Date.now() };
        });
        console.log(`[+] Loaded ${state.targets.length} targets, ${state.discoveries.length} discoveries, ${Object.keys(state.players).length} players.`);
    } catch(e) {
        console.error('[-] Failed to load initial state from Firestore', e);
    }
}
initializeState();

// Math function to calculate distance in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371e3;
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const dPhi = (lat2 - lat1) * rad;
    const dLambda = (lon2 - lon1) * rad;

    const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLambda/2) * Math.sin(dLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

app.use(express.static(__dirname));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Authentication Endpoint (Issues JWT)
app.post('/api/login', (req, res) => {
    const { name, password, isStudent } = req.body;

    let role = 'student';
    let playerId = null;

    if (!isStudent) {
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid admin password' });
        }
        role = 'admin';
        playerId = 'admin_' + Math.random().toString(36).substr(2, 9);
    } else {
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Name is required' });
        }
        role = 'student';
        playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        
        // Register player to memory and DB instantly on login
        if (!state.players[playerId]) {
            state.players[playerId] = {
                id: playerId,
                name: name.trim(),
                lat: null,
                lng: null,
                updatedAt: Date.now()
            };
            if(db) db.collection('players').doc(playerId).set(state.players[playerId]);
        }
    }

    const token = jwt.sign({ id: playerId, role, name }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, role, id: playerId });
});

// Socket Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token missing'));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error: Invalid token'));
        socket.user = decoded; // { id, role, name }
        next();
    });
});

// Socket logic
io.on('connection', (socket) => {
    console.log(`[+] Client connected: ${socket.id} (User: ${socket.user.name || 'Admin'})`);
    
    // Immediately tell the new client the current targets and discoveries
    socket.emit('sync_state', state);

    // 2. Player updates location (GPS Heartbeat)
    socket.on('update_location', (data) => {
        if (socket.user.role === 'student') {
            const pid = socket.user.id;
            if (!state.players[pid]) {
                state.players[pid] = { id: pid, name: socket.user.name, lat: data.lat, lng: data.lng, updatedAt: Date.now() };
            } else {
                state.players[pid].lat = data.lat;
                state.players[pid].lng = data.lng;
                state.players[pid].updatedAt = Date.now();
            }
            
            // Fire and forget to DB (could throttle this in production)
            if (db) db.collection('players').doc(pid).set({
                lat: data.lat,
                lng: data.lng,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(e=>console.error('DB Error updating location', e));
            
            io.emit('sync_state', state); 
        }
    });

    // 3. Admin adds a target
    socket.on('admin_set_target', async (data) => {
        if (socket.user.role !== 'admin') return socket.emit('error_msg', 'Unauthorized');
        const newTarget = {
            id: 'fox_' + Math.random().toString(36).substr(2, 9),
            lat: data.lat,
            lng: data.lng,
            createdAt: Date.now() 
        };
        
        let targetId = newTarget.id;
        if (db) {
            try {
                const dbEntry = { ...newTarget, createdAt: admin.firestore.FieldValue.serverTimestamp() };
                const docRef = await db.collection('targets').add(dbEntry);
                targetId = docRef.id;
                newTarget.id = targetId; 
            } catch(e) { console.error('DB Error adding target', e); }
        }

        state.targets.push(newTarget);
        io.emit('sync_state', state);
        console.log('Target broadcasted globally');
    });

    // 4. Admin deletes a target
    socket.on('admin_delete_target', async (data) => {
        if (socket.user.role !== 'admin') return socket.emit('error_msg', 'Unauthorized');
        
        if (db) {
            try {
                await db.collection('targets').doc(data.foxId).delete();
            } catch(e) { console.error('DB Error deleting target', e); }
        }
        
        state.targets = state.targets.filter(t => t.id !== data.foxId);
        io.emit('sync_state', state);
    });

    // 5. Player Scans a Fox QR Code
    socket.on('scan_target', async (data) => {
        if (socket.user.role !== 'student') return socket.emit('scan_result', { success: false, msg: "Admins cannot hunt." });
        const pid = socket.user.id;
        const player = state.players[pid];
        
        if (!player || !player.lat) return socket.emit('scan_result', { success: false, msg: "Awaiting GPS lock." });
        
        // Find the target
        const target = state.targets.find(t => t.id === data.foxId);
        if (!target) return socket.emit('scan_result', { success: false, msg: "Fox ID invalid or removed." });

        // Check distance server-side to prevent client-side overriding (25 meter rule)
        const dist = calculateDistance(player.lat, player.lng, target.lat, target.lng);
        if (dist > 25) {
            return socket.emit('scan_result', { 
                success: false, 
                msg: `Validation failed. You are ${Math.round(dist)} meters away. Must be <25m.` 
            });
        }

        // Already discovered by this player?
        const alreadyFound = state.discoveries.some(d => d.playerId === pid && d.foxId === target.id);
        if (alreadyFound) {
            return socket.emit('scan_result', { success: false, msg: "You already claimed this fox." });
        }

        // Add discovery
        const discovery = {
            id: 'disc_' + Date.now(),
            playerId: pid,
            playerName: player.name,
            foxId: target.id,
            foxName: `Fox Target-${state.targets.indexOf(target)+1}`,
            lat: player.lat,
            lng: player.lng,
            timestamp: Date.now()
        };
        
        if (db) {
            try {
                const docData = { ...discovery, timestamp: admin.firestore.FieldValue.serverTimestamp() };
                const docRef = await db.collection('discoveries').add(docData);
                discovery.id = docRef.id;
            } catch(e) { console.error('DB Error adding discovery', e); }
        }

        state.discoveries.push(discovery);
        
        // Let the scanning player know it was successful
        socket.emit('scan_result', { success: true, discovery });

        // Broadcast a gloab toast event to everyone to see who found what
        io.emit('global_toast', { type: 'success', msg: `🏆 ${player.name} just found ${discovery.foxName}!` });
        
        // Sync entire state to all connected maps
        io.emit('sync_state', state);
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client disconnected: ${socket.id}`);
        // We do *not* delete state.players[socket.user.id] immediately so they can reconnect logic
    });
});

server.listen(PORT, () => {
    console.log(` Fox Tracking Node backend running on port ${PORT} `);
});
