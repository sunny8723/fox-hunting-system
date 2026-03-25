const socket = io();
let currentCoords = null;
let participants = {};
let isAdmin = false;

// Map variables
let map = null;
let userMarker = null;
let pathLine = null;
let allFoxes = []; 
let lastBoundsUpdate = 0;
const mapContainer = document.getElementById('mapContainer');
const openGmapsBtn = document.getElementById('openGmapsBtn');

const loginView = document.getElementById('loginView');
const gameView = document.getElementById('gameView');
const adminView = document.getElementById('adminView');

const joinBtn = document.getElementById('joinBtn');
const playerNameInput = document.getElementById('playerName');
const adminPasswordInput = document.getElementById('adminPassword');

// Student UI elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const distanceVal = document.getElementById('distanceVal');
const coordsDisplay = document.getElementById('coordsDisplay');

// Admin UI elements
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
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
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
    
    // Render all Foxes dynamically
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
        
        // Find closest fox for drawing the line
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

// Update Student View
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
                <strong style="color: #fff;">Fox Target ${f.id || idx+1}</strong>
                <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 10px;">${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}</span>
            </div>
            <button onclick="disableTarget(${f.id})" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--danger); box-shadow: none;">Disable</button>
        `;
        list.appendChild(item);
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

// Global function to attach to dynamic buttons
window.disableTarget = function(id) {
    socket.emit('disableTarget', id);
};

joinBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const password = adminPasswordInput.value.trim();
    if (!name && !password) return alert('Please enter your name (Student) or password (Admin).');
    socket.emit('login', { name, password });
});

setTargetBtn.addEventListener('click', () => {
    const lat = parseFloat(targetLatInput.value);
    const lng = parseFloat(targetLngInput.value);
    if (isNaN(lat) || isNaN(lng)) return alert('Please enter valid coordinates');
    
    socket.emit('setTarget', { lat, lng });
    alert('Target coordinates broadcasted!');
});

socket.on('loginResponse', (res) => {
    if (res.success) {
        loginView.style.display = 'none';
        
        if (res.role === 'admin') {
            isAdmin = true;
            adminView.style.display = 'flex';
        } else {
            isAdmin = false;
            gameView.style.display = 'block';

            if (navigator.geolocation) {
                navigator.geolocation.watchPosition((position) => {
                    currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                    socket.emit('updateLocation', currentCoords);
                    updateStudentUI();
                }, (err) => {
                    console.error(err);
                    coordsDisplay.innerText = "GPS access denied or unavailable.";
                }, { enableHighAccuracy: true });
            } else {
                coordsDisplay.innerText = "Geolocation not supported by browser.";
            }
        }
    } else {
        alert(res.message || 'Login failed');
    }
});

socket.on('targetsUpdate', (targetsArray) => {
    allFoxes = targetsArray;
    if (isAdmin) {
        renderAdminTargets();
        renderAdminParticipants();
    } else {
        updateStudentUI();
    }
});

socket.on('participantListUpdate', (list) => {
    if (!isAdmin) return;
    participants = {};
    list.forEach(p => participants[p.id] = p);
    renderAdminParticipants();
});

socket.on('participantLocationUpdate', (data) => {
    if (!isAdmin) return;
    if (participants[data.id]) {
        participants[data.id] = data;
        renderAdminParticipants();
    }
});
