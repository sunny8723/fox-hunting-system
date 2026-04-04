import React, { useState } from 'react';
import { Shield, Activity, Power, Map as MapIcon, Target, Users, MapPin, Trash2 } from 'lucide-react';

const AuthPanel = ({ onAuth }) => {
    const [key, setKey] = useState('');

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-panel p-10 rounded-2xl w-[400px] flex flex-col items-center animate-fade-in">
                <div className="relative">
                    <Shield className="text-neonBlue w-16 h-16 mb-4 relative z-10" />
                    <div className="absolute top-0 left-0 w-16 h-16 bg-neonBlue/30 blur-xl rounded-full"></div>
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-1">Command Center</h2>
                <p className="text-neonBlue/80 text-xs mb-8 uppercase tracking-widest font-semibold flex items-center gap-2">
                    <Activity size={14} className="text-red-500 animate-pulse" /> Authorized Access Only
                </p>

                <input
                    type="password"
                    placeholder="ENTER ACCESS KEY"
                    className="w-full bg-black/50 border border-neonBlue/30 rounded px-4 py-3 text-center text-white placeholder-neonBlue/30 focus:outline-none focus:border-neonBlue focus:shadow-[0_0_10px_#00f3ff] transition-all mb-6 font-mono text-lg tracking-widest"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                />

                <button
                    onClick={() => onAuth(key)}
                    className="w-full py-4 bg-neonBlue/10 border border-neonBlue text-neonBlue uppercase tracking-widest font-bold rounded hover:bg-neonBlue/30 hover:shadow-[0_0_20px_#00f3ff] transition-all duration-300"
                >
                    Authenticate
                </button>
            </div>
        </div>
    );
};

const Dashboard = () => {
    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black flex">
            {/* Background Map Placeholder (Using dark CSS grid for military feel) */}
            <div
                className="absolute inset-0 z-0 bg-[#050B14] opacity-80"
                style={{
                    backgroundImage: 'radial-gradient(circle at center, transparent 0%, #000 100%), linear-gradient(rgba(0,243,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '100% 100%, 40px 40px, 40px 40px',
                    backgroundPosition: 'center center'
                }}
            ></div>

            {/* Main HUD overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
                <div className="w-full flex justify-between">
                    <div className="glass-panel px-6 py-2 rounded border-t-2 border-neonBlue">
                        <span className="text-neonBlue font-mono font-bold tracking-widest">SYS.STATUS // ONLINE</span>
                    </div>
                    <div className="glass-panel px-6 py-2 rounded border-t-2 border-red-500">
                        <span className="text-red-500 font-mono font-bold tracking-widest flex items-center gap-2">
                            <Activity size={16} className="animate-pulse" /> LIVE TRACKING
                        </span>
                    </div>
                </div>
            </div>

            {/* Left Sidebar - Operation Control */}
            <div className="w-80 h-full relative z-20 flex flex-col p-6 pointer-events-auto">
                <div className="glass-panel w-full h-full rounded-xl flex flex-col border-l-4 border-neonBlue overflow-hidden">
                    <div className="bg-neonBlue/10 p-4 border-b border-neonBlue/20 flex items-center gap-3">
                        <Target className="text-neonBlue" />
                        <h2 className="text-white font-bold uppercase tracking-widest">Operation Control</h2>
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
                        <div className="space-y-2">
                            <label className="text-neonBlue/70 text-xs font-bold uppercase tracking-wider">Deploy Target (Lat / Lng)</label>
                            <div className="flex gap-2">
                                <input type="text" placeholder="LAT..." className="w-1/2 bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm font-mono focus:border-neonBlue outline-none" />
                                <input type="text" placeholder="LNG..." className="w-1/2 bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm font-mono focus:border-neonBlue outline-none" />
                            </div>
                            <button className="w-full py-2 mt-2 bg-neonBlue/20 border border-neonBlue/50 text-neonBlue font-bold rounded text-sm hover:bg-neonBlue/40 transition-colors uppercase tracking-widest">Deploy Fox</button>
                        </div>

                        <div className="w-full h-px bg-white/10 my-2"></div>

                        <div className="space-y-4">
                            <button className="w-full py-3 flex items-center justify-between px-4 bg-white/5 border border-white/10 rounded text-white hover:bg-white/10 transition-colors">
                                <span className="text-sm font-bold tracking-widest">Toggle Map Theme</span>
                                <MapIcon size={16} className="text-neonBlue" />
                            </button>

                            <button className="w-full py-3 flex items-center justify-between px-4 bg-red-500/10 border border-red-500/50 rounded text-red-500 hover:bg-red-500/30 transition-colors">
                                <span className="text-sm font-bold tracking-widest">Terminate Session</span>
                                <Power size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Mission Milestones */}
            <div className="w-96 h-full relative z-20 flex flex-col p-6 ml-auto pointer-events-auto">
                <div className="glass-panel w-full h-full rounded-xl flex flex-col border-r-4 border-neonGreen overflow-hidden">
                    <div className="bg-neonGreen/10 p-4 border-b border-neonGreen/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="text-neonGreen" />
                            <h2 className="text-white font-bold uppercase tracking-widest">Mission Log</h2>
                        </div>
                        <span className="bg-neonGreen/20 text-neonGreen text-xs px-2 py-1 rounded font-mono font-bold">12 RECORDS</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {/* Example Log Item */}
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-black/40 border border-white/10 rounded p-3 hover:border-neonGreen/50 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-white font-bold flex items-center gap-2">
                                        <MapPin size={14} className="text-neonGreen" /> Team Alpha
                                    </span>
                                    <span className="text-xs font-mono text-neonGreen border border-neonGreen/30 px-1 rounded bg-neonGreen/10">SECURED</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-white/50 font-mono">TGT: FOX-0{i}</span>
                                    <div className="flex gap-2">
                                        <span className="text-xs text-white/40 font-mono">14:0{i}:22z</span>
                                        <button className="text-red-500/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Center - Student Scan Trigger Placeholder */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                <button className="glass-panel px-12 py-4 rounded-full border border-neonGreen shadow-[0_0_20px_rgba(57,255,20,0.3)] bg-neonGreen/10 hover:bg-neonGreen/20 hover:scale-105 transition-all text-neonGreen font-bold tracking-widest text-lg flex items-center gap-3 group">
                    <Target className="group-hover:animate-spin" /> SCAN FOX
                </button>
            </div>

        </div>
    );
};

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    return (
        <>
            {!isAuthenticated && <AuthPanel onAuth={(key) => setIsAuthenticated(true)} />}
            <Dashboard />
        </>
    );
}
