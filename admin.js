// Admin Logic Only (admin.js)

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
            
            if (allDiscoveries.length < state.discoveries.length && allDiscoveries.length > 0) {
                showToast("New Discovery Relayed!", "success");
            }
            
            handleStateSync(state);
        }
    } catch(e) { console.error('Sync Error', e); }
}

let participants = {};
let allDiscoveries = [];
let allFoxes = []; 

let adminMap = null;
let adminMapTheme = 'dark';
let adminFoxLayerGroup = null;
let adminPlayerLayerGroup = null;

const loginView = document.getElementById('loginView');
const adminView = document.getElementById('adminView');
const adminPasswordInput = document.getElementById('adminPassword');
const joinBtn = document.getElementById('joinBtn');

const targetLatInput = document.getElementById('targetLat');
const themeToggleBtn = document.getElementById('themeToggleBtn');
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

function showModal(title, body, isHtml = false, btnText = "Close") {
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
        
        // ensure server time exists
        let timeStr = d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true}) : 'Processing...';
        const lat = d.lat || 0;
        const lng = d.lng || 0;
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
            const baseUrl = window.location.origin; // Admin is usually on /admin, so origin avoids /admin?fox=
            const fullUrl = `${baseUrl}/?fox=${f.id}`;
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
                await fetch('/api/admin_delete_target', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}` 
                    },
                    body: JSON.stringify({ foxId: f.id })
                });
                fetchSyncState();
            } catch(e) { console.error(e); }
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

function drawAdminMap() {
    if (!adminMap) {
        const adminMapDiv = document.getElementById('adminMap');
        if (!adminMapDiv) return;
        adminMap = L.map('adminMap').setView([0, 0], 2);
        
        const tileUrl = adminMapTheme === 'dark' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
            
        window.adminTileLayer = L.tileLayer(tileUrl, {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(adminMap);
        
        setTimeout(() => adminMap.invalidateSize(), 500);
    }
    
    if (adminFoxLayerGroup) adminMap.removeLayer(adminFoxLayerGroup);
    if (adminPlayerLayerGroup) adminMap.removeLayer(adminPlayerLayerGroup);
    
    adminFoxLayerGroup = L.layerGroup().addTo(adminMap);
    adminPlayerLayerGroup = L.layerGroup().addTo(adminMap);
    
    let boundsPath = [];
    
    allFoxes.forEach((f, idx) => {
        const fIcon = L.divIcon({ className: 'custom-div-icon', html: `<div style='font-size:24px; text-shadow: 0 0 10px rgba(239,68,68,1);'>🦊</div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
        L.marker([f.lat, f.lng], {icon: fIcon}).addTo(adminFoxLayerGroup).bindTooltip(`Fox Target ${idx+1}`, {permanent: true, direction: 'top', offset: [0, -10]});
        boundsPath.push([f.lat, f.lng]);
    });
    
    Object.values(participants).forEach(p => {
        if (!p.lat || !p.lng) return;
        const pIcon = L.divIcon({ className: 'custom-div-icon', html: `<div style='background-color:#3b82f6; width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow: 0 0 10px rgba(59,130,246,1);'></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
        L.marker([p.lat, p.lng], {icon: pIcon}).addTo(adminPlayerLayerGroup).bindTooltip(p.name, {permanent: true, direction: 'bottom', offset: [0, 10]});
        boundsPath.push([p.lat, p.lng]);
    });
    
    if (boundsPath.length > 0) {
        adminMap.fitBounds(L.latLngBounds(boundsPath), { padding: [50, 50], maxZoom: 18 });
    }
}

function handleStateSync(state) {
    allFoxes = state.targets || [];
    participants = state.players || {};
    
    let newDiscoveries = state.discoveries || [];
    newDiscoveries.sort((a,b) => b.timestamp - a.timestamp);
    allDiscoveries = newDiscoveries;

    renderAdminTargets();
    renderAdminParticipants();
    renderAdminDiscoveries();
    drawAdminMap();
}

joinBtn.addEventListener('click', async () => {
    const password = adminPasswordInput.value.trim();
    if (!password) return alert('Please enter the Master Secret admin password.');
    
    joinBtn.innerText = "Authenticating...";
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Admin', password, isStudent: false })
        });
        
        const data = await res.json();
        if (!res.ok) {
            joinBtn.innerText = "Console / Login";
            return alert(data.error || 'Login failed');
        }

        currentToken = data.token;
        loginView.style.display = 'none';

        // Connect HTTP Polling
        fetchSyncState();
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(fetchSyncState, 3000);

        adminView.style.display = 'flex';

    } catch (e) {
        console.error(e);
        alert('Could not reach the server.');
        joinBtn.innerText = "Console / Login";
    }
});

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        adminMapTheme = adminMapTheme === 'dark' ? 'light' : 'dark';
        themeToggleBtn.innerText = adminMapTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        
        if (adminMap && window.adminTileLayer) {
            const newUrl = adminMapTheme === 'dark' 
                ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
            window.adminTileLayer.setUrl(newUrl);
        }
    });
}

setTargetBtn.addEventListener('click', async () => {
    const lat = parseFloat(targetLatInput.value);
    const lng = parseFloat(targetLngInput.value);
    if (isNaN(lat) || isNaN(lng)) return alert('Please enter valid coordinates');
    
    try {
        const res = await fetch('/api/admin_set_target', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}` 
            },
            body: JSON.stringify({ lat, lng })
        });
        if (res.ok) {
            targetLatInput.value = '';
            targetLngInput.value = '';
            alert('Fox coordinate broadcasted globally!');
            fetchSyncState();
        } else {
            alert('Failed to set target');
        }
    } catch(e) { console.error(e); }
});
