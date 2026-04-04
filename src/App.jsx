import React, { useState, useEffect, useRef } from 'react';
import { Shield, Activity, Power, Map as MapIcon, Target, Users, MapPin, Trash2, Crosshair, Layers, QrCode } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import jsQR from "jsqr";
import { QRCodeSVG } from 'qrcode.react';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

const API_BASE = '';

const calcDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dPhi = (lat2 - lat1) * rad;
    const dLambda = (lon2 - lon1) * rad;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    return Math.floor(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

function ChangeView({ center, zoom }) {
    const map = useMap();
    if (center[0] && center[1] && center[0] !== 37.7749) {
        map.setView(center, zoom || map.getZoom());
    }
    return null;
}

const AuthPanel = ({ onAuth, isAdminRoute }) => {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const payload = isAdminRoute
                ? { password: inputValue, isStudent: false }
                : { name: inputValue, isStudent: true };

            const res = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Login Failed');

            localStorage.setItem('fox_token', data.token);
            onAuth(data);
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-gray-900/90 backdrop-blur-md border border-neonBlue/30 shadow-2xl p-10 rounded-2xl w-[400px] flex flex-col items-center animate-fade-in relative z-50">
                <div className="absolute top-4 right-4 bg-neonBlue/10 p-1 px-3 rounded text-neonBlue text-xs font-bold tracking-widest border border-neonBlue/30">
                    {isAdminRoute ? 'ADMIN PORTAL' : 'STUDENT PORTAL'}
                </div>
                <div className="relative mt-4">
                    <Shield className="text-neonBlue w-16 h-16 mb-4 relative z-10" />
                    <div className="absolute top-0 left-0 w-16 h-16 bg-neonBlue/30 blur-xl rounded-full"></div>
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-1">Command Center</h2>
                <p className="text-gray-400 text-xs mb-8 uppercase tracking-widest font-semibold flex items-center gap-2">
                    <Activity size={14} className="text-red-500 animate-pulse" /> Authorized Access Only
                </p>

                {error && <p className="text-red-500 text-xs mb-4 uppercase tracking-wider font-bold animate-pulse">{error}</p>}

                <input
                    type={isAdminRoute ? "password" : "text"}
                    placeholder={isAdminRoute ? "ENTER ADMIN KEY" : "ENTER YOUR NAME"}
                    className="w-full bg-black/60 border border-neonBlue/30 rounded px-4 py-3 text-center text-white placeholder-gray-500 focus:outline-none focus:border-neonBlue focus:shadow-[0_0_10px_#00f3ff] transition-all mb-6 font-mono text-lg tracking-widest"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full py-4 bg-neonBlue/10 border border-neonBlue text-neonBlue uppercase tracking-widest font-bold rounded hover:bg-neonBlue/30 hover:shadow-[0_0_20px_#00f3ff] transition-all duration-300 disabled:opacity-50"
                >
                    {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
                </button>
            </div>

            {/* Light familiar Google Map background for Auth screen */}
            <div className="absolute inset-0 z-0">
                <MapContainer center={[27.133, 93.731]} zoom={15} zoomControl={false} style={{ width: '100%', height: '100%' }}>
                    <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
                </MapContainer>
            </div>
        </div>
    );
};

const AdminDashboard = ({ logout, token }) => {
    const [data, setData] = useState({ targets: [], discoveries: [], players: {} });
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [mapType, setMapType] = useState('roadmap');
    const [selectedQR, setSelectedQR] = useState(null);

    useEffect(() => {
        const fetchSync = () => {
            fetch(`${API_BASE}/api/sync`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => { if (!d.error) setData(d) });
        };
        fetchSync();
        const iv = setInterval(fetchSync, 5000);
        return () => clearInterval(iv);
    }, [token]);

    const deployFox = async () => {
        if (!lat || !lng) return;
        await fetch(`${API_BASE}/api/admin_set_target`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: 'Fox ' + Math.floor(Math.random() * 1000), lat: parseFloat(lat), lng: parseFloat(lng) })
        });
        setLat(''); setLng('');
    };

    const deleteFox = async (id) => {
        await fetch(`${API_BASE}/api/admin_delete_target`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id })
        });
    };

    const toggleBlockPlayer = async (playerId, currentStatus) => {
        await fetch(`${API_BASE}/api/admin_block_player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ playerId, block: !currentStatus })
        });
    };

    const deleteDiscovery = async (id) => {
        await fetch(`${API_BASE}/api/admin_delete_discovery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id })
        });
    };

    const tileUrl = mapType === 'roadmap' ? "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" : "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

    return (
        <>
            <div className="absolute inset-0 z-0">
                <MapContainer center={[37.7749, -122.4194]} zoom={18} zoomControl={true} style={{ width: '100%', height: '100%' }}>
                    <ChangeView center={data.targets.length > 0 ? [data.targets[0].lat, data.targets[0].lng] : [37.7749, -122.4194]} zoom={18} />
                    <TileLayer url={tileUrl} />

                    {data.targets.map(t => (
                        t.lat && t.lng ? <Marker key={t.id} position={[t.lat, t.lng]}><Popup>Target: {t.name || t.id}</Popup></Marker> : null
                    ))}

                    {Object.values(data.players || {}).map(p => (
                        p.lat && p.lng ? <Marker key={p.id} position={[p.lat, p.lng]}><Popup>Player: {p.name}</Popup></Marker> : null
                    ))}
                </MapContainer>
            </div>

            {selectedQR && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedQR(null)}>
                    <div className="bg-gray-900 overflow-hidden border border-neonBlue/50 shadow-[0_0_50px_#00f3ff4d] flex flex-col items-center animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="bg-white p-8 pb-4">
                            <QRCodeSVG value={selectedQR.id} size={256} />
                        </div>
                        <div className="w-full text-center py-4 bg-neonBlue/10 border-t border-neonBlue/30 text-white font-mono font-bold tracking-widest text-[10px]">
                            ID: {selectedQR.id}
                        </div>
                        <div className="w-full text-center pb-4 bg-neonBlue/10 text-white font-mono font-bold tracking-widest text-lg">
                            {selectedQR.name || 'TARGET'}
                        </div>
                        <button className="w-full bg-red-500/20 text-red-400 py-3 font-bold uppercase tracking-widest hover:bg-red-500/40 transition-colors" onClick={() => setSelectedQR(null)}>CLOSE TERMINAL</button>
                    </div>
                </div>
            )}

            <div className="w-80 h-full relative z-20 flex flex-col gap-4 p-6 pointer-events-none">
                {/* Operation Control Box */}
                <div className="bg-gray-900/85 backdrop-blur-md shadow-2xl pointer-events-auto w-full flex-1 rounded-xl flex flex-col border border-white/10 border-l-4 border-l-neonBlue overflow-hidden">
                    <div className="bg-gradient-to-r from-neonBlue/10 to-transparent p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Target className="text-neonBlue" />
                            <h2 className="text-white font-bold uppercase tracking-widest text-sm">Operation Control</h2>
                        </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
                        <div className="space-y-2">
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider">Deploy Target (Lat / Lng)</label>
                            <div className="flex gap-2">
                                <input value={lat} onChange={e => setLat(e.target.value)} placeholder="LAT..." className="w-1/2 bg-black/60 border border-white/10 rounded px-3 py-2 text-gray-200 text-sm font-mono focus:border-neonBlue outline-none" />
                                <input value={lng} onChange={e => setLng(e.target.value)} placeholder="LNG..." className="w-1/2 bg-black/60 border border-white/10 rounded px-3 py-2 text-gray-200 text-sm font-mono focus:border-neonBlue outline-none" />
                            </div>
                            <button onClick={deployFox} className="w-full py-2 mt-2 bg-neonBlue/20 border border-neonBlue/50 text-neonBlue font-bold rounded text-sm hover:bg-neonBlue/40 uppercase tracking-widest transition-colors">Deploy Fox</button>
                        </div>

                        <div className="w-full h-px bg-white/10 my-2"></div>

                        <div className="space-y-2 flex-1 overflow-y-auto">
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider">Active Targets</label>
                            {data.targets.map(t => (
                                <div key={t.id} className="flex justify-between items-center text-xs text-gray-300 border border-white/10 p-2 rounded bg-black/40 mb-2">
                                    <span className="font-mono truncate mr-2">{t.name || t.id}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setSelectedQR(t)} className="text-neonBlue hover:text-white transition-colors" title="Generate QR">
                                            <QrCode size={14} />
                                        </button>
                                        <button onClick={() => deleteFox(t.id)} className="text-red-500 hover:text-red-400 transition-colors" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto pt-4 space-y-4 border-t border-white/10">
                            <button onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')} className="w-full py-2 flex items-center justify-center gap-2 border border-white/20 rounded text-gray-300 hover:bg-white/10 transition-colors uppercase tracking-widest text-xs font-bold">
                                <Layers size={14} /> Toggle {mapType === 'roadmap' ? 'Satellite' : 'Map'}
                            </button>
                            <button onClick={logout} className="w-full py-3 flex items-center justify-between px-4 bg-red-500/10 border border-red-500/50 rounded text-red-500 hover:bg-red-500/30 transition-colors">
                                <span className="text-sm font-bold tracking-widest">Terminate Session</span>
                                <Power size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Active Participants Box */}
                <div className="bg-gray-900/85 backdrop-blur-md shadow-2xl pointer-events-auto w-full h-1/4 min-h-[140px] rounded-xl flex flex-col border border-white/10 border-l-4 border-l-yellow-500 overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-500/10 to-transparent p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="text-yellow-500" />
                            <h2 className="text-white font-bold uppercase tracking-widest text-sm">Roster</h2>
                        </div>
                        <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded font-mono font-bold">{Object.keys(data.players || {}).length} LIVE</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {Object.keys(data.players || {}).length === 0 && <p className="text-gray-500 text-xs text-center font-mono mt-2">No active agents.</p>}
                        {Object.values(data.players || {}).map(p => (
                            <div key={p.id} className="bg-black/60 border border-white/5 rounded p-2 flex justify-between items-center text-xs">
                                <div className="flex flex-col">
                                    <span className="text-gray-200 font-bold max-w-[120px] truncate">{p.name || 'Agent'}</span>
                                    {p.ip && <span className="text-[9px] text-gray-500 font-mono mt-0.5" title="Player IP Address">IP: {p.ip}</span>}
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    {p.isBlocked ? (
                                        <span className="text-[10px] text-red-500 font-mono tracking-widest animate-pulse font-bold">BLOCKED</span>
                                    ) : (
                                        <span className="text-[10px] text-yellow-500 font-mono tracking-widest animate-pulse">ACTIVE</span>
                                    )}
                                    <button onClick={() => toggleBlockPlayer(p.id, p.isBlocked)} className={`text-[9px] px-2 py-0.5 rounded border font-mono tracking-widest transition-colors ${p.isBlocked ? 'text-green-400 border-green-500/30 hover:bg-green-500/10' : 'text-red-400 border-red-500/30 hover:bg-red-500/10'}`}>
                                        {p.isBlocked ? 'UNBLOCK' : 'BLOCK'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-96 h-full relative z-20 flex flex-col p-6 ml-auto pointer-events-none">
                <div className="bg-gray-900/85 backdrop-blur-md shadow-2xl pointer-events-auto w-full h-full rounded-xl flex flex-col border border-white/10 border-r-4 border-r-neonGreen overflow-hidden">
                    <div className="bg-gradient-to-l from-neonGreen/10 to-transparent p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="text-neonGreen" />
                            <h2 className="text-white font-bold uppercase tracking-widest text-sm">Mission Log</h2>
                        </div>
                        <span className="bg-neonGreen/20 text-neonGreen text-xs px-2 py-1 rounded font-mono font-bold">{data.discoveries.length} REC</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {data.discoveries.length === 0 && <p className="text-gray-500 text-xs text-center font-mono mt-4">No discoveries yet.</p>}
                        {data.discoveries.map((d) => (
                            <div key={d.id} className="bg-black/60 border border-white/5 rounded p-3 hover:border-neonGreen/30 transition-colors group relative">
                                <div className="flex justify-between items-start mb-2 pr-6">
                                    <span className="text-gray-200 font-bold flex items-center gap-2 text-sm">
                                        <MapPin size={14} className="text-neonGreen" /> {d.playerName}
                                    </span>
                                    <span className="text-[10px] font-mono text-neonGreen border border-neonGreen/30 px-1 rounded bg-neonGreen/10">SECURED</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] text-gray-400 font-mono">TGT: {d.foxName || d.foxId}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">{new Date(d.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <button onClick={() => deleteDiscovery(d.id)} className="absolute top-3 right-3 text-red-500/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Mission Log">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

const StudentDashboard = ({ logout, token }) => {
    const [loc, setLoc] = useState({ lat: null, lng: null });
    const [closestDist, setClosestDist] = useState(null);
    const [mapType, setMapType] = useState('roadmap');

    const [scanStatus, setScanStatus] = useState(null);
    const [scanning, setScanning] = useState(false);
    const fileRef = useRef(null);

    const handleImageCapture = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setScanning(true);
        setScanStatus("ANALYZING IMAGE...");

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { willReadFrequently: true });
                const maxDim = 800;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxDim) { height *= maxDim / width; width = maxDim; }
                } else {
                    if (height > maxDim) { width *= maxDim / height; height = maxDim; }
                }
                canvas.width = width;
                canvas.height = height;
                context.drawImage(img, 0, 0, width, height);
                const imageData = context.getImageData(0, 0, width, height);

                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

                if (code && code.data) {
                    setScanStatus("QR FOUND. CONTACTING COMMAND...");
                    fetch(`${API_BASE}/api/scan_target`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ foxId: code.data })
                    })
                        .then(r => r.json())
                        .then(data => {
                            if (data.msg === "ACCESS REVOKED BY COMMAND.") {
                                alert("ACCESS DENIED: BAN HAMMER STRUCK. COMMENCE PANIC.");
                                logout();
                                return;
                            }
                            setScanStatus(data.msg || (data.success ? "TARGET SECURED!" : "FAILED TO CAPTURE"));
                            setScanning(false);
                            setTimeout(() => setScanStatus(null), 5000);
                        })
                        .catch(() => {
                            setScanStatus("UPLINK FAILED.");
                            setScanning(false);
                            setTimeout(() => setScanStatus(null), 5000);
                        });
                } else {
                    setScanStatus("NO QR DETECTED. RETRY.");
                    setScanning(false);
                    setTimeout(() => setScanStatus(null), 3000);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        let targets = [];
        const fetchSync = () => {
            fetch(`${API_BASE}/api/sync`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => { if (!d.error) targets = d.targets; });
        };
        fetchSync();
        const iv = setInterval(fetchSync, 5000);

        if (navigator.geolocation) {
            const wid = navigator.geolocation.watchPosition(
                (pos) => {
                    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setLoc(coords);
                    fetch(`${API_BASE}/api/update_location`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(coords)
                    }).then(r => {
                        if (r.status === 403) {
                            alert("ACCESS DENIED: BAN HAMMER STRUCK. YOUR DEVICE HAS BEEN BLOCKED.");
                            logout();
                        }
                    }).catch(() => { });

                    if (targets.length > 0) {
                        let minD = 999999;
                        targets.forEach(t => {
                            const d = calcDistance(coords.lat, coords.lng, t.lat, t.lng);
                            if (d < minD) minD = d;
                        });
                        setClosestDist(minD);
                    }
                },
                () => { }, { enableHighAccuracy: true }
            );
            return () => { navigator.geolocation.clearWatch(wid); clearInterval(iv); };
        }
    }, [token]);

    const tileUrl = mapType === 'roadmap' ? "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" : "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

    return (
        <>
            <div className="absolute inset-0 z-0">
                <MapContainer center={loc.lat ? [loc.lat, loc.lng] : [37.7749, -122.4194]} zoom={18} zoomControl={true} style={{ width: '100%', height: '100%' }}>
                    <ChangeView center={loc.lat ? [loc.lat, loc.lng] : [37.7749, -122.4194]} zoom={18} />
                    <TileLayer url={tileUrl} />

                    {loc.lat && <Marker position={[loc.lat, loc.lng]}><Popup>You are here</Popup></Marker>}
                </MapContainer>
            </div>

            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-11/12 max-w-md">
                <div className="bg-gray-900/85 backdrop-blur-md shadow-2xl p-4 rounded-xl border border-neonBlue/40 flex flex-col items-center justify-center pointer-events-auto">
                    <h3 className="text-neonBlue text-sm font-bold tracking-widest uppercase mb-1 drop-shadow-md">Awaiting Mission Briefing</h3>
                    <p className="text-gray-300 text-xs font-mono">
                        {closestDist === null ? "Locating nearest target..." : `Distance to closest target: ${closestDist} meters`}
                    </p>
                    {loc.lat && <p className="text-neutral-500 text-[10px] font-mono mt-2 flex gap-4"><span>LAT: {loc.lat.toFixed(5)}</span> <span>LNG: {loc.lng.toFixed(5)}</span></p>}
                </div>
                <div className="mt-4 flex gap-2 pointer-events-auto shadow-2xl">
                    <button onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')} className="flex-1 py-3 bg-gray-900/85 backdrop-blur-md border border-white/20 text-gray-300 text-xs font-bold rounded uppercase tracking-widest hover:bg-neutral-800 transition-colors">
                        Layer: {mapType}
                    </button>
                    <button onClick={logout} className="flex-1 py-3 bg-red-900/60 backdrop-blur-md border border-red-500/50 text-red-400 text-xs font-bold rounded hover:bg-red-900/80 tracking-widest">
                        ABORT MISSION
                    </button>
                </div>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center">
                {scanStatus && (
                    <div className="mb-4 bg-gray-900/90 border border-neonGreen/50 px-6 py-3 rounded text-neonGreen font-mono text-xs uppercase tracking-widest shadow-2xl animate-pulse">
                        {scanStatus}
                    </div>
                )}
                <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handleImageCapture} className="hidden" />

                <button disabled={scanning} onClick={() => fileRef.current.click()} className="bg-gray-900/85 backdrop-blur-md px-12 py-4 rounded-full border-2 border-neonGreen shadow-[0_0_15px_#39ff144d] hover:bg-black hover:scale-105 transition-all text-neonGreen font-bold tracking-widest text-lg flex items-center gap-3 group disabled:opacity-50 disabled:hover:scale-100">
                    <Crosshair className={`group-hover:animate-spin ${scanning ? 'animate-spin' : ''}`} /> {scanning ? 'SCANNING' : 'SCAN FOX'}
                </button>
            </div>
        </>
    );
};

export default function App() {
    const [auth, setAuth] = useState(null);

    const isAdminRoute = window.location.pathname.startsWith('/admin');

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-neutral-900 flex">
            {/* Minimalist Top Bars, transparent */}
            <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-4">
                <div className="w-full flex justify-between">
                    <div className="bg-gray-900/85 backdrop-blur-md px-4 py-1.5 rounded border-t-2 border-neonBlue shadow-lg">
                        <span className="text-neonBlue font-mono font-bold tracking-widest text-[10px]">SYS.ONLINE</span>
                    </div>
                </div>
            </div>

            {!auth ? (
                <AuthPanel onAuth={setAuth} isAdminRoute={isAdminRoute} />
            ) : (
                auth.role === 'admin'
                    ? <AdminDashboard logout={() => setAuth(null)} token={auth.token} />
                    : <StudentDashboard logout={() => setAuth(null)} token={auth.token} />
            )}
        </div>
    );
}
