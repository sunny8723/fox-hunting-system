// Firebase initialization via CDN Compat
const firebaseConfig = {
  apiKey: "AIzaSyD-xAFC1swwvPHp7x0zpq6EnFFr2bBkoK0",
  authDomain: "fox-hunting-7a1cc.firebaseapp.com",
  projectId: "fox-hunting-7a1cc",
  storageBucket: "fox-hunting-7a1cc.firebasestorage.app",
  messagingSenderId: "581227582102",
  appId: "1:581227582102:web:423463c0069b52fd7c28b7"
};

console.log("Initializing Firebase Compat...");
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
console.log("Firebase initialized successfully.");

const ADMIN_PASSWORD = 'fox'; 

let currentCoords = null;
let participants = {};
let isAdmin = false;
let myId = crypto.randomUUID(); // Serverless unique identifier

// Map variables
let map = null;
let userMarker = null;
let pathLine = null;
let allFoxes = []; 
let lastBoundsUpdate = 0;
const mapContainer = document.getElementById('mapContainer');
const openGmapsBtn = document.getElementById('openGmapsBtn');
const enableGpsBtn = document.getElementById('enableGpsBtn');

const loginView = document.getElementById('loginView');
const gameView = document.getElementById('gameView');
const adminView = document.getElementById('adminView');

const joinBtn = document.getElementById('joinBtn');
const playerNameInput = document.getElementById('playerName');
const adminPasswordInput = document.getElementById('adminPassword');

const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const distanceVal = document.getElementById('distanceVal');
const coordsDisplay = document.getElementById('coordsDisplay');

const targetLatInput = document.getElementById('targetLat');
const targetLngInput = document.getElementById('targetLng');
const setTargetBtn = document.getElementById('setTargetBtn');
const participantsGrid = document.getElementById('participantsGrid');

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
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

function fitMapBounds() {
    const now = Date.now();
    if (now - lastBoundsUpdate > 5000) {
        if (!currentCoords || allFoxes.length === 0) return;
        let boundsPath = [[currentCoords.lat, currentCoords.lng]];
        allFoxes.forEach(f => boundsPath.push([f.lat, f.lng]));
        const bounds = L.latLngBounds(boundsPath);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true });
        lastBoundsUpdate = now;
    }
}

function drawMap() {
    if (!currentCoords || allFoxes.length === 0) return;

    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([currentCoords.lat, currentCoords.lng], 16);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        userMarker = L.marker([currentCoords.lat, currentCoords.lng], {
            icon: L.divIcon({ className: 'custom-div-icon', html: "<div style='background-color:#3b82f6; width:18px; height:18px; border-radius:50%; border:3px solid #fff; box-shadow: 0 0 15px rgba(59,130,246,1);'></div>", iconSize: [18, 18], iconAnchor: [9, 9] })
        }).addTo(map);
        
        setTimeout(() => {
            map.invalidateSize();
            fitMapBounds();
        }, 100);
    } else {
        userMarker.setLatLng([currentCoords.lat, currentCoords.lng]);
        fitMapBounds();
    }
    
    if (window.foxLayerGroup) {
        map.removeLayer(window.foxLayerGroup);
    }
    window.foxLayerGroup = L.layerGroup().addTo(map);

    let minD = Infinity;
    let closestFox = null;

    allFoxes.forEach((foxCoord) => {
        const foxSize = 36;
        const foxIcon = L.divIcon({ 
            className: 'custom-div-icon', 
            html: `<div style='font-size:${foxSize}px; line-height: 1; text-shadow: 0 0 15px rgba(239,68,68,1); animation: pulse 2s infinite;'>🦊</div>`, 
            iconSize: [foxSize, foxSize], 
            iconAnchor: [foxSize/2, foxSize/2] 
        });
        L.marker([foxCoord.lat, foxCoord.lng], {icon: foxIcon}).addTo(window.foxLayerGroup);
        
        const d = calculateDistance(currentCoords.lat, currentCoords.lng, foxCoord.lat, foxCoord.lng);
        if (d < minD) { minD = d; closestFox = foxCoord; }
    });

    if (closestFox) {
        if (!pathLine) {
            pathLine = L.polyline([[currentCoords.lat, currentCoords.lng], [closestFox.lat, closestFox.lng]], {
                color: '#3b82f6', weight: 4, dashArray: '8, 8', opacity: 0.8
            }).addTo(map);
        } else {
            pathLine.setLatLngs([[currentCoords.lat, currentCoords.lng], [closestFox.lat, closestFox.lng]]);
        }
        openGmapsBtn.onclick = () => {
            window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${closestFox.lat},${closestFox.lng}&travelmode=walking`, '_blank');
        };
    } else if (pathLine) {
        pathLine.remove();
        pathLine = null;
    }
}

function updateStudentUI() {
    if (currentCoords) {
        coordsDisplay.innerText = `GPS: ${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`;
    }
    
    if (allFoxes.length > 0 && currentCoords) {
        let minD = Infinity;
        allFoxes.forEach(f => {
            const d = calculateDistance(currentCoords.lat, currentCoords.lng, f.lat, f.lng);
            if (d < minD) minD = d;
        });
        
        const dist = minD;
        distanceVal.innerText = dist > 1000 ? (dist/1000).toFixed(2) : Math.round(dist);
        document.querySelector('.distance-unit').innerText = dist > 1000 ? 'km' : 'm';
        
        statusIndicator.className = 'status-pill';
        
        if (dist > 100) {
            statusIndicator.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            statusIndicator.style.color = 'var(--accent)';
            statusText.innerText = 'Far from target 🧭';
        } else if (dist <= 100 && dist > 30) {
            statusIndicator.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            statusIndicator.style.color = '#f59e0b';
            statusText.innerText = 'Getting closer 👀';
        } else if (dist <= 30 && dist > 10) {
            statusIndicator.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            statusIndicator.style.color = '#ef4444';
            statusText.innerText = 'Very close 🔥';
        } else if (dist <= 10) {
            statusIndicator.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            statusIndicator.style.color = 'var(--success)';
            statusText.innerText = 'FOX FOUND 🦊';
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
        drawMap();
    } else if (allFoxes.length > 0) {
        distanceVal.innerText = '--';
        statusIndicator.className = 'status-pill waiting';
        statusText.innerText = 'Targets active. Waiting for GPS...';
    } else {
        distanceVal.innerText = '--';
        statusIndicator.className = 'status-pill waiting';
        statusText.innerText = 'Awaiting Target Coordinates...';
        if (window.foxLayerGroup && map) { map.removeLayer(window.foxLayerGroup); window.foxLayerGroup = null; }
        if (pathLine) { pathLine.remove(); pathLine = null; }
    }
}

function renderAdminTargets() {
    const list = document.getElementById('adminTargetsList');
    list.innerHTML = '';
    
    if (allFoxes.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted);">No active targets.</p>';
        return;
    }
    
    allFoxes.forEach((f, idx) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.background = 'rgba(255,255,255,0.05)';
        item.style.padding = '0.5rem 1rem';
        item.style.borderRadius = '8px';
        item.style.marginBottom = '0.5rem';
        
        item.innerHTML = `
            <div>
                <strong style="color: #fff;">Fox Target ${idx+1}</strong>
                <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 10px;">${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}</span>
            </div>
            <button id="disable-btn-${f.id}" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--danger); box-shadow: none;">Disable</button>
        `;
        list.appendChild(item);
        
        document.getElementById(`disable-btn-${f.id}`).addEventListener('click', async () => {
            try {
                await db.collection('targets').doc(f.id).delete();
                console.log("Target disabled:", f.id);
            } catch(e) { console.error("Error disabling target", e); }
        });
    });
}

function renderAdminParticipants() {
    participantsGrid.innerHTML = '';
    const plist = Object.values(participants);
    if (plist.length === 0) {
        participantsGrid.innerHTML = '<p style="color: var(--text-muted);">No operatives active.</p>';
        return;
    }

    plist.forEach(p => {
        const card = document.createElement('div');
        card.className = 'participant-card';
        
        let distText = 'Location unknown';
        if (p.lat && p.lng && allFoxes.length > 0) {
            let minD = Infinity;
            allFoxes.forEach(f => {
                const d = calculateDistance(p.lat, p.lng, f.lat, f.lng);
                if (d < minD) minD = d;
            });
            distText = `${minD > 1000 ? (minD/1000).toFixed(2) + ' km' : Math.round(minD) + ' m'} to closest fox`;
        }
        
        const coordsText = (p.lat && p.lng) ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : 'Waiting for GPS...';

        card.innerHTML = `
            <div class="participant-name">${p.name}</div>
            <div class="participant-dist">${distText}</div>
            <div class="participant-coords">${coordsText}</div>
        `;
        participantsGrid.appendChild(card);
    });
}

// Global Firebase Listeners (Compat Architecture)
db.collection('targets').onSnapshot((snapshot) => {
    console.log("Fetched live targets from Firestore:", snapshot.docs.length);
    allFoxes = snapshot.docs.map(doc => ({ id: doc.id, lat: doc.data().lat, lng: doc.data().lng }));
    if (isAdmin) {
        renderAdminTargets();
        renderAdminParticipants();
    } else {
        updateStudentUI();
    }
}, (error) => console.error("Error fetching targets:", error));

db.collection('players').onSnapshot((snapshot) => {
    console.log("Fetched live dynamic players from Firestore:", snapshot.docs.length);
    participants = {};
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    
    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.updatedAt && typeof data.updatedAt.toMillis === 'function') {
            if (data.updatedAt.toMillis() > tenMinutesAgo) {
                participants[docSnap.id] = data;
            }
        } else {
            participants[docSnap.id] = data; // Keep newly joined without server time sync yet
        }
    });
    if (isAdmin) renderAdminParticipants();
}, (error) => console.error("Error fetching players:", error));


// App logic
joinBtn.addEventListener('click', async () => {
    const name = playerNameInput.value.trim();
    const password = adminPasswordInput.value.trim();
    if (!name && !password) return alert('Please enter your name (Student) or password (Admin).');
    
    loginView.style.display = 'none';
        
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        adminView.style.display = 'flex';
        renderAdminTargets();
        renderAdminParticipants();
    } else {
        isAdmin = false;
        gameView.style.display = 'block';

        try {
            await db.collection('players').doc(myId).set({ 
                name, lat: null, lng: null, updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
            });
            console.log("Player joined successfully and placeholder logged to Firestore.");
        } catch(e) { console.error("Error joining game:", e); }

        console.log("Waiting for user to manually initialize GPS via explicit button click.");

        window.addEventListener('beforeunload', () => {
             db.collection('players').doc(myId).delete();
        });
    }
});

enableGpsBtn.addEventListener('click', () => {
    console.log("User clicked 'Enable GPS'. Requesting Permission...");
    coordsDisplay.innerText = "Requesting GPS Access...";
    coordsDisplay.style.color = "#fff";
    
    if (navigator.geolocation) {
        // STEP 1: Fast ping (low accuracy) to force permissions quickly / rely on cellular towers
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                console.log("Initial quick location received:", position.coords.latitude, position.coords.longitude);
                
                enableGpsBtn.style.display = 'none';
                openGmapsBtn.style.display = 'inline-block';
                
                currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                
                try {
                    await db.collection('players').doc(myId).set({ 
                        name: playerNameInput.value.trim(), 
                        lat: currentCoords.lat, 
                        lng: currentCoords.lng,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
                    }, { merge: true });
                } catch(e) {}
                
                updateStudentUI();

                // STEP 2: Spin up the High Accuracy walker watchPosition in the background
                navigator.geolocation.watchPosition(
                    async (highPos) => {
                        currentCoords = { lat: highPos.coords.latitude, lng: highPos.coords.longitude };
                        try {
                            await db.collection('players').doc(myId).set({ 
                                lat: currentCoords.lat, 
                                lng: currentCoords.lng,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
                            }, { merge: true });
                        } catch(e) {}
                        updateStudentUI();
                    }, 
                    (err) => console.log("High accuracy tracker waiting:", err.message), 
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
                );
                
                // 10-second heartbeat to keep player listed as "active" natively
                setInterval(async () => {
                    try {
                        if (currentCoords) {
                            await db.collection('players').doc(myId).set({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
                        }
                    } catch(e) {}
                }, 10000); 
                
            }, 
            (err) => {
                console.error("GPS Initial Fetch Error:", err);
                let errMsg = "Unknown GPS Error.";
                if (err.code === 1) errMsg = "Location access blocked natively. Check Browser Settings.";
                if (err.code === 2) errMsg = "Location unavailable. Please turn on phone GPS.";
                if (err.code === 3) errMsg = "GPS request timed out. You may be deep indoors.";
                coordsDisplay.innerText = errMsg;
                coordsDisplay.style.color = "var(--danger)";
                enableGpsBtn.innerText = "Retry GPS 📍";
            }, 
            { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
        );
    } else {
        coordsDisplay.innerText = "Geolocation not supported by this browser.";
        coordsDisplay.style.color = "var(--danger)";
    }
});

setTargetBtn.addEventListener('click', async () => {
    const lat = parseFloat(targetLatInput.value);
    const lng = parseFloat(targetLngInput.value);
    if (isNaN(lat) || isNaN(lng)) return alert('Please enter valid coordinates');
    
    try {
        await db.collection('targets').add({ lat, lng, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        console.log("New Target pushed to Firestore globally!");
        alert('Fox coordinate broadcasted to all active players!');
        targetLatInput.value = '';
        targetLngInput.value = '';
    } catch (e) {
        console.error("Failed to commit target to DB:", e);
        alert('Failed to set target, please check console.');
    }
});
