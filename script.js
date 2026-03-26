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

let foxIdScanned = new URLSearchParams(window.location.search).get("fox");
let allDiscoveries = [];

// Map variables
let map = null;
let userMarker = null;
let allFoxes = []; 
let lastBoundsUpdate = 0;
const mapContainer = document.getElementById('mapContainer');
const openGmapsBtn = document.getElementById('openGmapsBtn');
const enableGpsBtn = document.getElementById('enableGpsBtn');
const scanQrBtn = document.getElementById('scanQrBtn');
const nativeCameraScanner = document.getElementById('nativeCameraScanner');

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
        const activeFoxes = getActiveFoxesForMe();
        if (!currentCoords || activeFoxes.length === 0) return;
        let boundsPath = [[currentCoords.lat, currentCoords.lng]];
        activeFoxes.forEach(f => boundsPath.push([f.lat, f.lng]));
        const bounds = L.latLngBounds(boundsPath);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true });
        lastBoundsUpdate = now;
    }
}

function getActiveFoxesForMe() {
    const pName = playerNameInput.value.trim().toLowerCase();
    if (!pName && !myId) return allFoxes;
    
    const myClaimedFoxIds = allDiscoveries
        .filter(d => d.playerId === myId || (d.playerName && d.playerName.toLowerCase() === pName))
        .map(d => d.foxId);
        
    return allFoxes.filter(f => !myClaimedFoxIds.includes(f.id));
}

function drawMap() {
    const activeFoxes = getActiveFoxesForMe();
    if (!currentCoords || activeFoxes.length === 0) return;

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

    activeFoxes.forEach((foxCoord) => {
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
        openGmapsBtn.onclick = () => {
            window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${closestFox.lat},${closestFox.lng}&travelmode=walking`, '_blank');
        };
    }
}

function showModal(title, body, isHtml = false, btnText = "Claim Reward 🦊") {
    document.getElementById('modalTitle').innerText = title;
    if (isHtml) {
        document.getElementById('modalBody').innerHTML = body;
    } else {
        document.getElementById('modalBody').innerText = body;
    }
    const actionBtn = document.getElementById('modalActionBtn');
    if (actionBtn) actionBtn.innerText = btnText;
    document.getElementById('discoveryModal').style.display = 'flex';
}

function showToast(message, type="info") {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    toast.style.transition = 'opacity 0.5s ease-in-out';
    toast.style.opacity = '1';
    toast.style.fontSize = '0.9rem';
    
    if (type === 'success') {
        toast.style.background = 'linear-gradient(to right, #10b981, #059669)';
    } else if (type === 'error') {
        toast.style.background = 'linear-gradient(to right, #ef4444, #dc2626)';
    } else {
        toast.style.background = 'linear-gradient(to right, #3b82f6, #2563eb)';
    }
    
    toast.innerText = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

async function checkPendingScans() {
    if (!foxIdScanned || !currentCoords || isAdmin || allFoxes.length === 0) {
        if (!currentCoords && foxIdScanned) showToast("Awaiting GPS lock... Please wait a moment.", "error");
        return;
    }
    
    console.log("Analyzing scanned QR code for Fox ID:", foxIdScanned);
    const targetFoxId = foxIdScanned; 
    foxIdScanned = null; // Clear to prevent loops
    
    const foxIdx = allFoxes.findIndex(f => f.id === targetFoxId);
    const displayFox = foxIdx !== -1 ? `Fox ${foxIdx + 1}` : `the Target`;
    
    const pName = playerNameInput.value.trim().toLowerCase();
    const alreadyDiscovered = allDiscoveries.some(d => 
        (d.playerId === myId || (d.playerName && d.playerName.toLowerCase() === pName)) 
        && d.foxId === targetFoxId
    );
    
    if (alreadyDiscovered) {
        console.log("Firestore Check: Player already claimed this fox.");
        showModal("Already Discovered", `You have already hunted ${displayFox}!`, false, "Okay");
        showToast(`You already claimed ${displayFox}!`, "error");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    const foxTarget = allFoxes.find(f => f.id === targetFoxId);
    if (!foxTarget) {
        console.error("Validation Failed: Target Fox ID not found in live active foxes.");
        showModal("Target Missing", "This Fox does not exist or was disabled by Admin.", false, "Okay");
        showToast("Invalid Target Scanned", "error");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    const dist = calculateDistance(currentCoords.lat, currentCoords.lng, foxTarget.lat, foxTarget.lng);
    console.log(`Calculated physical distance to scanned Fox: ${dist} meters`);

    if (dist > 20) {
        console.log("Validation Failed: Too far from target.");
        showModal("Too Far!", `You must be physically within 20 meters of the specific GPS target to claim ${displayFox}. You are ${Math.round(dist)}m away.`, false, "Keep Hunting 🧭");
        showToast(`You are ${Math.round(dist)}m away from ${displayFox}.`, "error");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        console.log("Validation Passed! Preparing to write discovery to Firestore...");
        showToast("Validating distance...", "info");
        try {
            const docData = {
                playerName: playerNameInput.value.trim() || 'Operative',
                playerId: myId, // Kept to prevent duplicate scans mathematically
                foxId: targetFoxId,
                foxName: displayFox,
                latitude: currentCoords.lat,
                longitude: currentCoords.lng,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            console.log("Saving new scan to Firestore:", docData);
            await db.collection('discoveries').add(docData);
            console.log("Discovery successfully written to Firestore!");
            showModal("🎉 Target Discovered!", `Incredible! You have successfully found ${displayFox}!`, false, "Back to Hunting 🦊");
            showToast(`You have found ${displayFox}!`, "success");
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch(e) { 
            console.error("Firestore Error saving discovery:", e); 
            showToast("Database Error: Failed to save discovery. Please check connection.", "error");
            alert("Database Error: Failed to save discovery. Please check connection.");
        }
    }
}

function updateStudentUI() {
    if (currentCoords) {
        coordsDisplay.innerText = `GPS: ${currentCoords.lat.toFixed(7)}, ${currentCoords.lng.toFixed(7)}`;
    }
    
    const activeFoxes = getActiveFoxesForMe();
    
    if (activeFoxes.length > 0 && currentCoords) {
        let minD = Infinity;
        activeFoxes.forEach(f => {
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
    } else if (allFoxes.length > 0 && getActiveFoxesForMe().length === 0) {
        distanceVal.innerText = '🏆';
        document.querySelector('.distance-unit').innerText = 'Champion';
        statusIndicator.className = 'status-pill waiting';
        statusIndicator.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        statusIndicator.style.color = '#10b981';
        statusText.innerText = 'All Foxes Discovered! 🦊🎉';
        if (window.foxLayerGroup && map) { map.removeLayer(window.foxLayerGroup); window.foxLayerGroup = null; }
    } else if (allFoxes.length > 0) {
        distanceVal.innerText = '--';
        statusIndicator.className = 'status-pill waiting';
        statusText.innerText = 'Targets active. Waiting for GPS...';
    } else {
        distanceVal.innerText = '--';
        statusIndicator.className = 'status-pill waiting';
        statusText.innerText = 'Awaiting Target Coordinates...';
        if (window.foxLayerGroup && map) { map.removeLayer(window.foxLayerGroup); window.foxLayerGroup = null; }
    }
    
    if (!isAdmin) {
        checkPendingScans();
    }
}

function renderAdminDiscoveries() {
    const list = document.getElementById('adminDiscoveriesList');
    if (!list) return;
    list.innerHTML = '';
    
    if (allDiscoveries.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted);">No foxes discovered yet.</p>';
        return;
    }
    
    allDiscoveries.forEach((d) => {
        const card = document.createElement('div');
        card.style.background = 'rgba(16, 185, 129, 0.1)';
        card.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        card.style.padding = '1rem';
        card.style.borderRadius = '8px';
        card.style.fontFamily = 'monospace';
        card.style.fontSize = '0.95rem';
        card.style.lineHeight = '1.6';
        card.style.color = '#e2e8f0';
        
        let timeStr = "Processing...";
        if (d.timestamp && typeof d.timestamp.toDate === 'function') {
            timeStr = d.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
        }
        
        // Ensure backwards compatibility with old schema for existing documents
        const lat = d.latitude || d.lat || 0;
        const lng = d.longitude || d.lng || 0;
        let foxN = d.foxName;
        
        if (!foxN) {
            const matchedIndex = allFoxes.findIndex(f => f.id === d.foxId);
            foxN = matchedIndex !== -1 ? `Fox Target ${matchedIndex + 1}` : `A Target`;
        }

        card.innerHTML = `
            <div style="font-weight: bold; color: #10b981; font-size: 1.1rem; margin-bottom: 8px;">🎉 Fox Captured!</div>
            <div><span style="color: #94a3b8; width: 80px; display: inline-block;">Player:</span> <strong style="color: #fff;">${d.playerName}</strong></div>
            <div><span style="color: #94a3b8; width: 80px; display: inline-block;">Fox:</span> <strong style="color: #60a5fa;">${foxN}</strong></div>
            <div><span style="color: #94a3b8; width: 80px; display: inline-block;">Location:</span> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
            <div><span style="color: #94a3b8; width: 80px; display: inline-block;">Time:</span> ${timeStr}</div>
        `;
        list.appendChild(card);
    });
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
                <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 10px;">${f.lat.toFixed(7)}, ${f.lng.toFixed(7)}</span>
            </div>
            <div>
                <button id="qr-btn-${f.id}" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--accent); box-shadow: none; margin-right: 5px;">QR Code</button>
                <button id="disable-btn-${f.id}" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--danger); box-shadow: none;">Disable</button>
            </div>
        `;
        list.appendChild(item);
        
        document.getElementById(`qr-btn-${f.id}`).addEventListener('click', () => {
            const baseUrl = window.location.origin + window.location.pathname;
            const fullUrl = `${baseUrl}?fox=${f.id}`;
            const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(fullUrl)}`;
            
            const modalHtml = `
                <p style="color: var(--text-muted); margin-bottom: 1rem; font-size: 0.95rem;">Print or save this QR code and tape it exactly at the physical GPS location for operatives to scan!</p>
                <div style="background: white; padding: 15px; display: inline-block; border-radius: 8px; margin-bottom: 1rem;">
                    <img src="${qrSrc}" alt="QR Code" width="200" height="200" style="display: block;">
                </div>
                <br>
                <button id="downloadQrBtn" style="background: #3b82f6; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); margin-bottom: 10px;">Download PNG 📥</button>
            `;
            showModal(`Fox ${idx+1} QR Code`, modalHtml, true, "Close");
            
            setTimeout(() => {
                const dlBtn = document.getElementById('downloadQrBtn');
                if (dlBtn) {
                    dlBtn.addEventListener('click', async () => {
                        dlBtn.innerText = "Downloading...";
                        try {
                            const res = await fetch(qrSrc);
                            if (!res.ok) throw new Error("Fetch failed");
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Fox-${idx+1}-QRCode.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                            dlBtn.innerText = "Downloaded! ✅";
                        } catch(e) {
                            window.open(qrSrc, '_blank');
                            dlBtn.innerText = "Download PNG 📥";
                        }
                    });
                }
            }, 50);
        });
        
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
        
        const coordsText = (p.lat && p.lng) ? `${p.lat.toFixed(7)}, ${p.lng.toFixed(7)}` : 'Waiting for GPS...';

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

let isInitialDiscoveriesLoad = true;

db.collection('discoveries').onSnapshot((snapshot) => {
    console.log("Admin received new discovery update. Total docs:", snapshot.docs.length);
    
    if (!isInitialDiscoveriesLoad) {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                
                // Admins see all toasts. Students see toasts of rivals, but omit their own since checkPendingScans already shows them a huge Modal.
                if (data.playerId !== myId || isAdmin) {
                    const matchedIndex = allFoxes.findIndex(f => f.id === data.foxId);
                    let foxDisplay = `a Target`;
                    if (data.foxName) {
                         foxDisplay = data.foxName;
                    } else if (matchedIndex !== -1) {
                         foxDisplay = `Fox Target ${matchedIndex + 1}`;
                    }
                    showToast(`🏆 ${data.playerName || 'An Operative'} just found ${foxDisplay}!`, 'success');
                }
            }
        });
    }

    allDiscoveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    allDiscoveries.sort((a, b) => {
        const timeA = a.timestamp && typeof a.timestamp.toMillis === 'function' ? a.timestamp.toMillis() : Date.now();
        const timeB = b.timestamp && typeof b.timestamp.toMillis === 'function' ? b.timestamp.toMillis() : Date.now();
        return timeB - timeA;
    });
    if (isAdmin) renderAdminDiscoveries();
    if (!isAdmin && currentCoords) checkPendingScans();
    
    isInitialDiscoveriesLoad = false;
}, (error) => console.error("Error fetching discoveries:", error));

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
        renderAdminDiscoveries();
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
                scanQrBtn.style.display = 'inline-block';
                
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

let html5QrCode = null;

function resizeImage(file, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error("Canvas toBlob failed"));
                    resolve(new File([blob], file.name || "scanned.jpg", { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.8);
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

nativeCameraScanner.addEventListener('change', async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    let file = e.target.files[0];
    const originalText = scanQrBtn.innerText;
    scanQrBtn.innerText = "Analyzing... ⏳";
    showToast("Analyzing photo... please hold on.", "info");
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    try {
        // High resolution phone cameras crash the library. We must resize first!
        showToast("Compressing high-res photo...", "info");
        console.log("Original File Size:", file.size);
        file = await resizeImage(file, 800);
        console.log("Resized File Size:", file.size);

        // Prevent canvas rendering (false) to avoid out-of-memory hangs on 4k phone cameras
        const scanPromise = html5QrCode.scanFile(file, false);
        // Force a 10-second timeout so the UI never gets stuck on "Analyzing..." permanently
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
        
        const decodedText = await Promise.race([scanPromise, timeoutPromise]);
        
        console.log("OS Decoded QR payload:", decodedText);
        showToast("QR Code recognized!", "success");
        
        let extractedId = null;
        if (decodedText.includes("fox=")) {
            try {
                const url = new URL(decodedText);
                extractedId = url.searchParams.get("fox");
            } catch(err) {
                extractedId = decodedText.split('fox=')[1].split('&')[0];
            }
        } else {
            extractedId = decodedText;
        }

        if (extractedId) {
            foxIdScanned = extractedId;
            checkPendingScans();
        } else {
            showToast("QR Error: We couldn't extract a valid ID.", "error");
            alert("QR Error: We couldn't extract a valid ID from that image.");
        }
    } catch(err) {
        console.error("QR Decoding Engine Error:", err);
        if (err.message === "Timeout") {
            showToast("Analyzing took too long. Please try a clearer or smaller photo.", "error");
            showModal("Scanner Timeout 📸", "The image was too large or took too long to analyze. Try moving closer to the QR code and taking a clearer photo!", false, "Try Again");
        } else {
            showToast("No distinct QR code found. Try again.", "error");
            showModal("Scanning Error 📸", "We could not find a distinct QR code in that photo. Please get closer and make sure the QR code is centered, bright, and not blurry!", false, "Try Again");
        }
    }
    
    scanQrBtn.innerText = originalText;
    nativeCameraScanner.value = ''; // Safely reset file structure so re-snaps trigger exactly.
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
