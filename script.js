// Foxhunt Client-Side Logic (Student Only)

let currentToken = null;
let syncInterval = null;

async function fetchSyncState() {
    if (!currentToken) return;
    try {
        const res = await fetch('/api/sync', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            const state = await res.json();
            
            // Check for new discoveries to show toast
            if (allDiscoveries.length < state.discoveries.length && allDiscoveries.length > 0) {
                const newDiscs = state.discoveries.filter(d => !allDiscoveries.find(old => old.id === d.id));
                newDiscs.forEach(d => {
                   if (d.playerId !== myId) {
                       showToast(`🏆 ${d.playerName} just found ${d.foxName}!`, "success");
                   } 
                });
            }
            
            handleStateSync(state);
        }
    } catch(e) { console.error('Sync Error', e); }
}

async function updateLocationAPI(coords) {
    if (!currentToken) return;
    try {
        await fetch('/api/update_location', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(coords)
        });
    } catch(e) {}
}

let currentCoords = null;
let myId = null;

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

const joinBtn = document.getElementById('joinBtn');
const playerNameInput = document.getElementById('playerName');

const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const distanceVal = document.getElementById('distanceVal');
const coordsDisplay = document.getElementById('coordsDisplay');

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
    const myClaimedFoxIds = allDiscoveries
        .filter(d => d.playerId === myId)
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
        } else if (dist <= 100 && dist > 35) {
            statusIndicator.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            statusIndicator.style.color = '#f59e0b';
            statusText.innerText = 'Getting closer 👀';
        } else if (dist <= 35 && dist > 25) {
            statusIndicator.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            statusIndicator.style.color = '#ef4444';
            statusText.innerText = 'Very close 🔥';
        } else if (dist <= 25) {
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
}

// Map real-time state from Socket.io
function handleStateSync(state) {
    allFoxes = state.targets || [];
    
    // Process discoveries
    let newDiscoveries = state.discoveries || [];
    newDiscoveries.sort((a,b) => b.timestamp - a.timestamp);
    allDiscoveries = newDiscoveries;

    updateStudentUI();
    if (foxIdScanned) { checkPendingScans(); }
}

joinBtn.addEventListener('click', async () => {
    const name = playerNameInput.value.trim();
    if (!name) return alert('Please enter your Operative Name to join the hunt.');
    
    joinBtn.innerText = "Authenticating...";
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, isStudent: true })
        });
        
        const data = await res.json();
        if (!res.ok) {
            joinBtn.innerText = "Deploy / Login";
            return alert(data.error || 'Login failed');
        }

        currentToken = data.token;
        myId = data.id;

        loginView.style.display = 'none';

        // Connect HTTP Polling
        fetchSyncState();
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(fetchSyncState, 3000);

        gameView.style.display = 'block';
        console.log("Waiting for user to manually initialize GPS via explicit button click.");

    } catch (e) {
        console.error(e);
        alert('Could not reach the server.');
        joinBtn.innerText = "Deploy / Login";
    }
});

enableGpsBtn.addEventListener('click', () => {
    console.log("User clicked 'Enable GPS'. Requesting Permission...");
    coordsDisplay.innerText = "Requesting GPS Access...";
    coordsDisplay.style.color = "#fff";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                console.log("Initial quick location received:", position.coords.latitude, position.coords.longitude);
                
                enableGpsBtn.style.display = 'none';
                openGmapsBtn.style.display = 'inline-block';
                scanQrBtn.style.display = 'inline-block';
                
                currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                
                updateLocationAPI(currentCoords);
                updateStudentUI();

                navigator.geolocation.watchPosition(
                    async (highPos) => {
                        currentCoords = { lat: highPos.coords.latitude, lng: highPos.coords.longitude };
                        updateLocationAPI(currentCoords);
                        updateStudentUI();
                    }, 
                    (err) => console.log("High accuracy tracker waiting:", err.message), 
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
                );
            }, 
            (err) => {
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

async function checkPendingScans() {
    if (!foxIdScanned || !currentCoords || allFoxes.length === 0) {
        if (!currentCoords && foxIdScanned) showToast("Awaiting GPS lock... Please wait a moment.", "error");
        return;
    }
    
    console.log("Analyzing scanned QR code for Fox ID:", foxIdScanned);
    const targetFoxId = foxIdScanned; 
    foxIdScanned = null; // Clear to prevent loops

    // Delegate validation and saving entirely to backend
    showToast("Validating distance with server...", "info");
    try {
        const res = await fetch('/api/scan_target', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}` 
            },
            body: JSON.stringify({ foxId: targetFoxId })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast("Discovery Validated!", "success");
            showModal("🎉 Target Discovered!", `Incredible! You have successfully found a target!`, false, "Back to Hunting 🦊");
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchSyncState(); // Update UI immediately
        } else {
            showToast(data.msg || "Scan failed.", "error");
            showModal("Scan Failed", data.msg || "An error occurred.", false, "Keep Hunting 🧭");
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch(e) {
        showToast("Server error during scan.", "error");
        console.error(e);
    }
}

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
        showToast("Compressing high-res photo...", "info");
        file = await resizeImage(file, 800);

        const scanPromise = html5QrCode.scanFile(file, false);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
        
        const decodedText = await Promise.race([scanPromise, timeoutPromise]);
        
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
        }
    } catch(err) {
        if (err.message === "Timeout") {
            showToast("Analyzing took too long. Please try a clearer or smaller photo.", "error");
            showModal("Scanner Timeout 📸", "The image was too large or took too long to analyze. Try moving closer to the QR code and taking a clearer photo!", false, "Try Again");
        } else {
            showToast("No distinct QR code found. Try again.", "error");
            showModal("Scanning Error 📸", "We could not find a distinct QR code in that photo. Please get closer and make sure the QR code is centered, bright, and not blurry!", false, "Try Again");
        }
    }
    
    scanQrBtn.innerText = originalText;
    nativeCameraScanner.value = ''; 
});
