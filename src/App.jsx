import React, { useState, useEffect } from 'react';
import { Shield, Activity, Power, Map as MapIcon, Target, Users, MapPin, Trash2, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-panel p-10 rounded-2xl w-[400px] flex flex-col items-center animate-fade-in relative z-50">
                <div className="absolute top-4 right-4 bg-neonBlue/10 p-1 px-3 rounded text-neonBlue text-xs font-bold tracking-widest border border-neonBlue/30">
                    {isAdminRoute ? 'ADMIN PORTAL' : 'STUDENT PORTAL'}
                </div>
                <div className="relative mt-4">
                    <Shield className="text-neonBlue w-16 h-16 mb-4 relative z-10" />
                    <div className="absolute top-0 left-0 w-16 h-16 bg-neonBlue/30 blur-xl rounded-full"></div>
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-1">Command Center</h2>
                <p className="text-neonBlue/80 text-xs mb-8 uppercase tracking-widest font-semibold flex items-center gap-2">
                    <Activity size={14} className="text-red-500 animate-pulse" /> Authorized Access Only
                </p>

                {error && <p className="text-red-500 text-xs mb-4 uppercase tracking-wider font-bold animate-pulse">{error}</p>}

                <input
                    type={isAdminRoute ? "password" : "text"}
                    placeholder={isAdminRoute ? "ENTER ADMIN KEY" : "ENTER YOUR NAME"}
                    className="w-full bg-black/50 border border-neonBlue/30 rounded px-4 py-3 text-center text-white placeholder-neonBlue/30 focus:outline-none focus:border-neonBlue focus:shadow-[0_0_10px_#00f3ff] transition-all mb-6 font-mono text-lg tracking-widest"
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

            {/* Display static cool map background purely for auth screen */}
            <div className="absolute inset-0 z-0 opacity-40 brightness-75 contrast-125 hue-rotate-180 sepia-[.3]">
                <MapContainer center={[37.7749, -122.4194]} zoom={13} zoomControl={false} style={{ width: '100%', height: '100%' }}>
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </MapContainer>
            </div>
        </div>
    );
};

const AdminDashboard = ({ logout, token }) => {
    const [data, setData] = useState({ targets: [], discoveries: [], players: {} });
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

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
            body: JSON.stringify({ name: 'Fox ' + Math.floor(Math.random() * 100), lat: parseFloat(lat), lng: parseFloat(lng) })
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

    return (
        <>
            <div className="absolute inset-0 z-0 opacity-60 brightness-75 contrast-125 hue-rotate-180 sepia-[.3]">
                <MapContainer center={[37.7749, -122.4194]} zoom={18} zoomControl={false} style={{ width: '100%', height: '100%' }}>
                    <ChangeView center={data.targets.length > 0 ? [data.targets[0].lat, data.targets[0].lng] : [37.7749, -122.4194]} zoom={18} />
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />

                    {data.targets.map(t => (
                        t.lat && t.lng ? <Marker key={t.id} position={[t.lat, t.lng]}><Popup>Target ID: {t.id}</Popup></Marker> : null
                    ))}

                    {Object.values(data.players || {}).map(p => (
                        p.lat && p.lng ? <Marker key={p.id} position={[p.lat, p.lng]}><Popup>Player: {p.name}</Popup></Marker> : null
                    ))}
                </MapContainer>
            </div>

            <div className="w-80 h-full relative z-20 flex flex-col p-6 pointer-events-auto">
                <div className="glass-panel w-full h-full rounded-xl flex flex-col border-l-4 border-neonBlue overflow-hidden">
                    <div className="bg-neonBlue/10 p-4 border-b border-neonBlue/20 flex items-center gap-3">
                        <Target className="text-neonBlue" />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">Operation Control</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
                        <div className="space-y-2">
                            <label className="text-neonBlue/70 text-xs font-bold uppercase tracking-wider">Deploy Target (Lat / Lng)</label>
                            <div className="flex gap-2">
                                <input value={lat} onChange={e => setLat(e.target.value)} placeholder="LAT..." className="w-1/2 bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm font-mono focus:border-neonBlue outline-none" />
                                <input value={lng} onChange={e => setLng(e.target.value)} placeholder="LNG..." className="w-1/2 bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm font-mono focus:border-neonBlue outline-none" />
                            </div>
                            <button onClick={deployFox} className="w-full py-2 mt-2 bg-neonBlue/20 border border-neonBlue/50 text-neonBlue font-bold rounded text-sm hover:bg-neonBlue/40 uppercase tracking-widest">Deploy Fox</button>
                        </div>
                        <div className="w-full h-px bg-white/10 my-2"></div>
                        <div className="space-y-2">
                            <label className="text-neonBlue/70 text-xs font-bold uppercase tracking-wider">Active Targets</label>
                            {data.targets.map(t => (
                                <div key={t.id} className="flex justify-between items-center text-xs text-white border border-white/10 p-2 rounded bg-black/30">
                                    <span className="font-mono truncate mr-2">{t.name || t.id}</span>
                                    <button onClick={() => deleteFox(t.id)} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="w-full h-px bg-white/10 my-2"></div>
                        <div className="space-y-4">
                            <button onClick={logout} className="w-full py-3 flex items-center justify-between px-4 bg-red-500/10 border border-red-500/50 rounded text-red-500 hover:bg-red-500/30 transition-colors">
                                <span className="text-sm font-bold tracking-widest">Terminate Session</span>
                                <Power size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-96 h-full relative z-20 flex flex-col p-6 ml-auto pointer-events-auto">
                <div className="glass-panel w-full h-full rounded-xl flex flex-col border-r-4 border-neonGreen overflow-hidden">
                    <div className="bg-neonGreen/10 p-4 border-b border-neonGreen/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="text-neonGreen" />
                            <h2 className="text-white font-bold uppercase tracking-widest text-sm">Mission Log</h2>
                        </div>
                        <span className="bg-neonGreen/20 text-neonGreen text-xs px-2 py-1 rounded font-mono font-bold">{data.discoveries.length} REC</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {data.discoveries.length === 0 && <p className="text-white/40 text-xs text-center font-mono">No discoveries yet.</p>}
                        {data.discoveries.map((d) => (
                            <div key={d.id} className="bg-black/40 border border-white/10 rounded p-3 hover:border-neonGreen/50 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-white font-bold flex items-center gap-2 text-sm">
                                        <MapPin size={14} className="text-neonGreen" /> {d.playerName}
                                    </span>
                                    <span className="text-[10px] font-mono text-neonGreen border border-neonGreen/30 px-1 rounded bg-neonGreen/10">SECURED</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] text-white/50 font-mono">TGT: {d.foxName}</span>
                                    <span className="text-[10px] text-white/40 font-mono">{new Date(d.timestamp).toLocaleTimeString()}</span>
                                </div>
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
                    });

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

    return (
        <>
            <div className="absolute inset-0 z-0 opacity-60 brightness-75 contrast-125 hue-rotate-180 sepia-[.3]">
                <MapContainer center={loc.lat ? [loc.lat, loc.lng] : [37.7749, -122.4194]} zoom={18} zoomControl={false} style={{ width: '100%', height: '100%' }}>
                    <ChangeView center={loc.lat ? [loc.lat, loc.lng] : [37.7749, -122.4194]} zoom={18} />
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />

                    {loc.lat && <Marker position={[loc.lat, loc.lng]}><Popup>You are here</Popup></Marker>}
                </MapContainer>
            </div>

            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-11/12 max-w-md">
                <div className="glass-panel p-4 rounded-xl border border-neonBlue flex flex-col items-center justify-center">
                    <h3 className="text-neonBlue text-sm font-bold tracking-widest uppercase mb-1">Awaiting Mission Briefing</h3>
                    <p className="text-white/60 text-xs font-mono">
                        {closestDist === null ? "Locating nearest target..." : `Distance to closest target: ${closestDist} meters`}
                    </p>
                    {loc.lat && <p className="text-white/40 text-[10px] font-mono mt-2 flex gap-4"><span>LAT: {loc.lat.toFixed(5)}</span> <span>LNG: {loc.lng.toFixed(5)}</span></p>}
                </div>
                <button onClick={logout} className="mt-4 w-full py-2 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold rounded hover:bg-red-500/30 tracking-widest shadow-[0_0_10px_#ef44444d]">
                    ABORT MISSION
                </button>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                <button onClick={() => alert('Scanner opening... (Please implement QR library)')} className="glass-panel px-12 py-4 rounded-full border border-neonGreen shadow-[0_0_20px_#39ff144d] bg-neonGreen/10 hover:bg-neonGreen/20 hover:scale-105 transition-all text-neonGreen font-bold tracking-widest text-lg flex items-center gap-3 group">
                    <Crosshair className="group-hover:animate-spin" /> SCAN FOX
                </button>
            </div>
        </>
    );
};

export default function App() {
    const [auth, setAuth] = useState(null);

    const isAdminRoute = window.location.pathname.startsWith('/admin');

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black flex">
            {/* Universal HUD Top Borders (Stays on top of map) */}
            <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-6">
                <div className="w-full flex justify-between">
                    <div className="glass-panel px-6 py-2 rounded border-t-2 border-neonBlue">
                        <span className="text-neonBlue font-mono font-bold tracking-widest text-xs">SYS.STATUS // ONLINE</span>
                    </div>
                    <div className="glass-panel px-6 py-2 rounded border-t-2 border-red-500">
                        <span className="text-red-500 font-mono font-bold tracking-widest flex items-center gap-2 text-xs">
                            <Activity size={12} className="animate-pulse" /> LIVE
                        </span>
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
