import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3,
    Users,
    Truck,
    FileText,
    Download,
    LogOut,
    ChevronRight,
    ShieldCheck,
    Clock,
    MapPin,
    Trash2,
    MessageSquare,
    CheckCircle2,
    AlertOctagon
} from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAlerts } from '../contexts/AlertContext';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { alerts, clearAlerts } = useAlerts();

    const stats = useMemo(() => {
        let people = 0;
        let vehicles = 0;
        alerts.forEach(alert => {
            const cls   = (alert.detected_class || '').toLowerCase();
            const count = alert.detected_count || 1;
            if (cls === 'person') people += count;
            else if (['car', 'truck', 'motorcycle', 'bus', 'bicycle', 'vehicle'].includes(cls)) vehicles += count;
        });
        return { total_people: people, total_vehicles: vehicles };
    }, [alerts]);

    // ── Export Intel as CSV ──────────────────────────────────────────────────
    const exportToCSV = () => {
        if (reports.length === 0) return;
        const header = ['Timestamp', 'Location', 'Class', 'Count'];
        const rows = reports.flatMap(r =>
            Object.entries(r.counts as Record<string, number>).map(([cls, count]) =>
                [r.timestamp, r.location, cls, count].join(',')
            )
        );
        const csv  = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `bhartiya_seema_intel_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const [locationNames, setLocationNames] = useState<Record<string, string>>({});

    const reports = useMemo(() => {
        return alerts.map(alert => ({
            id: alert.id,
            timestamp: alert.timestamp || new Date().toLocaleTimeString(),
            lat: alert.location?.lat,
            lng: alert.location?.lng,
            location: locationNames[alert.id] || (alert.location ? `${alert.location.lat.toFixed(2)}, ${alert.location.lng.toFixed(2)}` : 'Unknown'),
            counts: {
                [alert.detected_class || 'unknown']: alert.detected_count || 1
            }
        }));
    }, [alerts, locationNames]);

    // Reverse-geocode each alert's GPS coordinates — rate-limited to 1 req/sec (Nominatim policy)
    useEffect(() => {
        const pending = alerts.filter(
            a => a.location?.lat && a.location?.lng && !locationNames[a.id]
        );
        if (pending.length === 0) return;

        let i = 0;
        const timer = setInterval(() => {
            if (i >= pending.length) { clearInterval(timer); return; }
            const alert = pending[i++];
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${alert.location!.lat}&lon=${alert.location!.lng}`)
                .then(res => res.json())
                .then(data => {
                    if (data?.address) {
                        const place = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
                        const state = data.address.state || data.address.country || '';
                        setLocationNames(prev => ({ ...prev, [alert.id]: `${place}, ${state}` }));
                    }
                })
                .catch(() => {});
        }, 1100);  // 1.1 s gap satisfies Nominatim's 1 req/s limit

        return () => clearInterval(timer);
    }, [alerts]);  // eslint-disable-line react-hooks/exhaustive-deps

    const timelineUpdates = useMemo(() => {
        let allUpdates: { id: string; content: string; timestamp: string; status?: string; alertTitle: string }[] = [];
        alerts.forEach(alert => {
            if (alert.updates && alert.updates.length > 0) {
                alert.updates.forEach((u: any) => {
                    allUpdates.push({
                        ...u,
                        alertTitle: alert.title
                    });
                });
            }
        });
        return allUpdates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [alerts]);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#0B1120] text-slate-300 font-sans selection:bg-army-gold/30">
            <Header />

            {/* Tactical Status Bar */}
            <div className="bg-slate-950 border-b border-slate-800/80 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10 relative">
                <div className="container mx-auto px-4 flex justify-between items-center py-2 text-[10px] font-mono tracking-widest uppercase text-emerald-500/80">
                    <div className="flex items-center space-x-6">
                        <span className="flex items-center"><ShieldCheck className="h-3 w-3 mr-1.5 text-emerald-400" /> CLASSIFIED ACCESS: TOP SECRET</span>
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1.5 text-army-gold" /> SESSION: ACTIVE // SECTOR 7G</span>
                        <span className="hidden md:flex items-center"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> SECURE LINK ESTABLISHED</span>
                    </div>
                    <button onClick={handleLogout} className="hover:text-red-400 text-slate-500 flex items-center px-3 py-1 rounded bg-slate-900/50 border border-slate-800 hover:border-red-900/50 hover:bg-red-950/30 transition-all duration-300">
                        <LogOut className="h-3 w-3 mr-1.5" /> Terminate
                    </button>
                </div>
            </div>

            <main className="flex-grow py-8 overflow-hidden relative">
                {/* Background Pattern / Glows */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-5 mix-blend-screen"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-army-gold/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="container mx-auto px-4 max-w-7xl h-full flex flex-col relative z-10">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 animate-fade-in">
                        <div>
                            <div className="flex items-center mb-1 drop-shadow-sm">
                                <div className="h-0.5 w-8 bg-army-gold mr-3 rounded-full opacity-70"></div>
                                <span className="text-[10px] font-mono text-army-gold uppercase tracking-[0.2em] font-bold">Battalion Command Network</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-headline font-black text-white uppercase tracking-tight drop-shadow-lg">Mission <span className="text-emerald-500">Dashboard</span></h1>
                            <p className="text-slate-400 font-medium text-sm mt-1">Global AI Surveillance Analysis & Tactical Intelligence</p>
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={clearAlerts} className="bg-red-600/20 text-red-500 backdrop-blur-md px-5 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-600/30 hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] border border-red-500/50 transition-all duration-300 uppercase tracking-widest group">
                                <Trash2 className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" /> Clear Feed
                            </button>
                            <button onClick={exportToCSV} className="bg-emerald-600/90 text-white backdrop-blur-md px-5 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-[0_0_20px_rgba(5,150,105,0.4)] hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] border border-emerald-400/30 transition-all duration-300 uppercase tracking-widest group">
                                <Download className="h-4 w-4 mr-2 group-hover:-translate-y-1 transition-transform" /> Export Intel
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        {[ 
                            { title: 'Total Persons', val: stats.total_people, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                            { title: 'Total Vehicles', val: stats.total_vehicles, icon: Truck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                            { title: 'Total Signatures', val: stats.total_people + stats.total_vehicles, icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                            { title: 'Reports Authored', val: reports.length, icon: FileText, color: 'text-army-gold', bg: 'bg-army-gold/10' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-slate-700/50 relative overflow-hidden group hover:border-slate-500/50 transition-all duration-500 hover:-translate-y-1">
                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${stat.bg} blur-3xl -mr-10 -mt-10 group-hover:opacity-100 opacity-50 transition-opacity`}></div>
                                <div className="absolute right-4 bottom-4 opacity-5 group-hover:opacity-10 transition-opacity group-hover:scale-110 duration-500">
                                    <stat.icon className="h-24 w-24 text-white" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{stat.title}</p>
                                <h3 className={`text-5xl font-headline font-black ${stat.color} drop-shadow-md`}>{stat.val.toString().padStart(3, '0')}</h3>
                                <div className="mt-4 flex items-center text-[10px] uppercase font-bold tracking-wider text-slate-500 border border-slate-700/50 rounded-full px-3 py-1 inline-flex bg-slate-950/50 relative z-10 shadow-inner">
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-500 mr-2"></div>
                                    Mission Cumulative
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
                        
                        {/* Dispatch Stream */}
                        <div className="lg:col-span-2 flex flex-col min-h-[400px]">
                            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 flex flex-col h-full overflow-hidden relative">
                                {/* Header */}
                                <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-950/40 relative z-10 shadow-sm">
                                    <h3 className="font-headline font-bold text-white flex items-center tracking-wide">
                                        <BarChart3 className="h-5 w-5 mr-3 text-emerald-400" />
                                        TACTICAL DISPATCH STREAM
                                    </h3>
                                    <span className="text-[10px] font-mono text-emerald-500/70 py-1 px-2 border border-emerald-500/20 rounded bg-emerald-950/30 flex items-center">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-2 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                                        AUTO-REFRESH: 5S
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-grow overflow-y-auto p-5 custom-scrollbar relative z-10">
                                    {reports.length > 0 ? (
                                        <div className="space-y-4">
                                            {reports.map((report, idx) => (
                                                <div key={idx} className="group flex flex-col sm:flex-row sm:items-center p-4 bg-slate-800/40 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:bg-slate-800/80 hover:-translate-y-0.5">
                                                    
                                                    <div className="flex-shrink-0 mb-3 sm:mb-0 sm:mr-6 flex items-center justify-center bg-slate-950 text-emerald-400 text-[10px] px-3 py-1.5 rounded-lg font-mono border border-emerald-900 group-hover:border-emerald-500/50 transition-colors shadow-inner whitespace-nowrap">
                                                        {report.timestamp}
                                                    </div>
                                                    
                                                    <div className="flex-grow grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                                                        <div className="col-span-2 lg:col-span-2">
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assigned Vector</p>
                                                            <p className="text-sm font-medium text-white flex items-center bg-slate-900/50 px-2 py-1 rounded inline-block">
                                                                <MapPin className="h-3 w-3 mr-1.5 text-army-gold" />
                                                                {report.location || 'Sector 7G'}
                                                            </p>
                                                        </div>
                                                        {Object.entries(report.counts as Record<string, any>).map(([cls, count]) => (
                                                            <div key={cls} className="bg-slate-900/30 p-2 rounded-lg border border-slate-700/50">
                                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{cls}</p>
                                                                <p className="text-xl font-headline font-black text-white group-hover:text-emerald-400 transition-colors drop-shadow">{count as React.ReactNode}</p>
                                                            </div>
                                                        ))}
                                                        {Object.entries(report.counts).length === 0 && (
                                                            <div className="col-span-2 flex items-center justify-start h-full">
                                                                <p className="text-[11px] font-medium text-slate-500 italic flex items-center bg-slate-900/30 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                                    <div className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2"></div>
                                                                    No designated contacts
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="hidden sm:flex ml-4 flex-shrink-0 items-center justify-center h-8 w-8 rounded-full bg-slate-700/30 group-hover:bg-emerald-500/20 text-slate-500 group-hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
                                                        <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                            <div className="relative mb-4">
                                                <FileText className="h-16 w-16 opacity-20" />
                                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl mix-blend-screen animate-pulse"></div>
                                            </div>
                                            <p className="font-mono uppercase text-xs tracking-widest text-slate-400 text-center">Awaiting Feed Integration<br/><span className="text-[10px] text-slate-600">Model initialization pending...</span></p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Officer Comms Column */}
                        <div className="lg:col-span-1 flex flex-col min-h-[400px]">
                            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 flex flex-col h-full overflow-hidden relative group hover:border-slate-500/50 transition-colors duration-500">
                                <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-950/40 relative z-10">
                                    <h3 className="font-headline font-bold text-white flex items-center tracking-wide text-sm">
                                        <MessageSquare className="h-4 w-4 mr-2 text-blue-400" />
                                        FIELD OFFICER COMMS
                                    </h3>
                                </div>
                                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                                    {timelineUpdates.length > 0 ? (
                                        <div className="space-y-4">
                                            {timelineUpdates.map(update => (
                                                <div key={update.id} className={`p-3 rounded-xl border ${update.status === 'resolved' ? 'bg-emerald-900/10 border-emerald-500/30' : update.status === 'investigating' ? 'bg-orange-900/10 border-orange-500/30' : 'bg-slate-800/40 border-slate-700/50'} relative`}> 
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(update.timestamp).toLocaleTimeString()}</span>
                                                        {update.status === 'resolved' ? (
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                        ) : update.status === 'investigating' ? (
                                                            <AlertOctagon className="h-3.5 w-3.5 text-orange-500" />
                                                        ) : null}
                                                    </div>
                                                    <p className="text-xs text-white leading-relaxed font-medium">{update.content}</p>
                                                    <p className="text-[10px] text-slate-500 mt-2 italic flex items-center">
                                                        Ref: {update.alertTitle}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                            <MessageSquare className="h-8 w-8 opacity-20 mb-3" />
                                            <p className="font-mono uppercase text-xs tracking-widest text-slate-400 text-center">No Active Memos</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="lg:col-span-1 space-y-6 flex flex-col">
                            
                            {/* Command Directives */}
                            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-xl p-6 relative overflow-hidden border border-slate-700/50 flex-shrink-0 group hover:border-army-gold/30 transition-colors duration-500">
                                <div className="absolute -top-10 -right-10 p-2 transform rotate-12 opacity-[0.02] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-700 pointer-events-none">
                                    <ShieldCheck className="h-48 w-48 text-army-gold" />
                                </div>
                                <h4 className="font-headline font-bold text-white text-sm uppercase tracking-wider mb-5 flex items-center relative z-10 drop-shadow-sm">
                                    <div className="h-4 w-1 bg-army-gold rounded-full mr-3 border border-army-gold/50 shadow-[0_0_8px_rgba(202,138,4,0.6)]"></div>
                                    Command Directives
                                </h4>
                                <ul className="space-y-3 text-xs font-medium text-slate-300 relative z-10">
                                    <li className="flex items-start bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:border-slate-500/50 transition-colors group/item cursor-default shadow-sm hover:shadow-md">
                                        <div className="h-1.5 w-1.5 bg-army-gold rounded-full mr-3 mt-1.5 shadow-[0_0_8px_rgba(202,138,4,0.8)] flex-shrink-0 group-hover/item:scale-125 transition-transform"></div>
                                        <span className="leading-relaxed group-hover/item:text-white transition-colors">Ensure all boundary lines are calibrated to <span className="text-emerald-400 font-bold">70% depth</span> for optimal AI coverage.</span>
                                    </li>
                                    <li className="flex items-start bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:border-slate-500/50 transition-colors group/item cursor-default shadow-sm hover:shadow-md">
                                        <div className="h-1.5 w-1.5 bg-army-gold rounded-full mr-3 mt-1.5 shadow-[0_0_8px_rgba(202,138,4,0.8)] flex-shrink-0 group-hover/item:scale-125 transition-transform"></div>
                                        <span className="leading-relaxed group-hover/item:text-white transition-colors">Person contact at Sector 7G requires <span className="text-red-400 font-bold">immediate visual confirmation</span> by ground operators.</span>
                                    </li>
                                    <li className="flex items-start bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:border-slate-500/50 transition-colors group/item cursor-default shadow-sm hover:shadow-md mb-0">
                                        <div className="h-1.5 w-1.5 bg-army-gold rounded-full mr-3 mt-1.5 shadow-[0_0_8px_rgba(202,138,4,0.8)] flex-shrink-0 group-hover/item:scale-125 transition-transform"></div>
                                        <span className="leading-relaxed group-hover/item:text-white transition-colors">Log heavy vehicle contacts specifically for tactical cross-referencing.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Map Overlays */}
                            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-6 flex-grow overflow-hidden relative group hover:-translate-y-0.5 transition-transform duration-500">
                                <h4 className="font-headline font-bold text-white text-sm uppercase tracking-wider mb-5 flex items-center drop-shadow-sm">
                                    <div className="h-4 w-1 bg-emerald-500 rounded-full mr-3 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                    Sector Map Overlays
                                </h4>
                                <div className="h-48 bg-slate-950 rounded-xl border border-slate-700 flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/40 transition-colors duration-500 shadow-inner">
                                    {/* Scanline effect / Tactical Map */}
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 filter sepia-[0.3] hue-rotate-[130deg] saturate-[1.5] contrast-[1.2]"></div>
                                    
                                    {/* Animated Scan Line */}
                                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none"></div>
                                    <div className="absolute top-0 w-full h-[2px] bg-emerald-400 opacity-50 shadow-[0_0_15px_rgba(52,211,153,1)] animate-[pulse-height_4s_ease-in-out_infinite] blur-[1px]"></div>
                                    
                                    <div className="relative z-10 p-3 bg-slate-950/80 backdrop-blur-md border border-emerald-900/70 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center border-t-emerald-500/50">
                                        <span className="font-mono font-bold text-emerald-400 text-[10px] tracking-[0.2em] uppercase flex items-center drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]">
                                            <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                                            Tactical Map Restricted
                                        </span>
                                    </div>
                                    
                                    {/* Radar pings */}
                                    <div className="absolute top-[30%] left-[40%] text-red-500">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping absolute"></div>
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                    </div>
                                    <div className="absolute bottom-[40%] right-[30%] text-emerald-400">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping absolute" style={{ animationDuration: '2s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="mt-4 bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                                    <p className="text-[9.5px] text-slate-400 leading-relaxed font-mono px-1">
                                        <span className="text-army-gold font-bold">*</span> <span className="uppercase text-slate-500 tracking-wider">Note:</span> Session totals are dynamically evaluated based on peak simultaneous classified signatures per boundary sector.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default AdminDashboard;
