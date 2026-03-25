const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// FIREBASE INITIALIZATION 
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD-xAFC1swwvPHp7x0zpq6EnFFr2bBkoK0",
  authDomain: "fox-hunting-7a1cc.firebaseapp.com",
  projectId: "fox-hunting-7a1cc",
  storageBucket: "fox-hunting-7a1cc.firebasestorage.app",
  messagingSenderId: "581227582102",
  appId: "1:581227582102:web:423463c0069b52fd7c28b7",
  measurementId: "G-9WYLN071L5"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = 3000;
const ADMIN_PASSWORD = 'fox'; 

const participants = {};
const lastSaved = {}; 
let targets = []; // Array of active targets
let targetIdCounter = 1;
let adminSocketId = null;

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('login', async ({ name, password }) => {
        if (password === ADMIN_PASSWORD) {
            adminSocketId = socket.id;
            socket.emit('loginResponse', { success: true, role: 'admin' });
            
            socket.emit('participantListUpdate', Object.values(participants));
            socket.emit('targetsUpdate', targets);
            try { await addDoc(collection(db, 'admin_logs'), { action: 'admin_login', timestamp: serverTimestamp() }); } catch (e) {}
            
        } else {
            if (!name) {
                socket.emit('loginResponse', { success: false, message: 'Operative Name is required.' });
                return;
            }
            socket.emit('loginResponse', { success: true, role: 'student' });
            
            participants[socket.id] = { id: socket.id, name, lat: null, lng: null };
            
            if (adminSocketId) io.to(adminSocketId).emit('participantListUpdate', Object.values(participants));
            socket.emit('targetsUpdate', targets);
            
            try { await addDoc(collection(db, 'players'), { name, timestamp: serverTimestamp() }); } catch (e) {}
        }
    });

    socket.on('updateLocation', async ({ lat, lng }) => {
        if (participants[socket.id]) {
            participants[socket.id].lat = lat;
            participants[socket.id].lng = lng;
            
            if (adminSocketId) {
                io.to(adminSocketId).emit('participantLocationUpdate', participants[socket.id]);
            }
            
            const now = Date.now();
            if (!lastSaved[socket.id] || now - lastSaved[socket.id] > 10000) {
                lastSaved[socket.id] = now;
                try {
                    await addDoc(collection(db, 'locations_tracking'), {
                        player: participants[socket.id].name,
                        lat, lng,
                        timestamp: serverTimestamp()
                    });
                } catch(e) {}
            }
        }
    });

    socket.on('setTarget', async ({ lat, lng }) => {
        if (socket.id === adminSocketId) {
            const newTarget = { id: targetIdCounter++, lat, lng };
            targets.push(newTarget);
            io.emit('targetsUpdate', targets); 
            
            try { await addDoc(collection(db, 'targets'), { id: newTarget.id, lat, lng, action: 'added', timestamp: serverTimestamp() }); } catch(e) {}
        }
    });

    socket.on('disableTarget', async (id) => {
        if (socket.id === adminSocketId) {
            targets = targets.filter(t => t.id !== id);
            io.emit('targetsUpdate', targets);
            try { await addDoc(collection(db, 'targets'), { targetId: id, action: 'disabled', timestamp: serverTimestamp() }); } catch(e) {}
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (participants[socket.id]) {
            delete participants[socket.id];
            delete lastSaved[socket.id];
            if (adminSocketId) io.to(adminSocketId).emit('participantListUpdate', Object.values(participants));
        }
        if (socket.id === adminSocketId) {
            adminSocketId = null;
        }
    });
});

server.listen(PORT, () => {
    console.log(`Foxhunting server running on port ${PORT}`);
});
