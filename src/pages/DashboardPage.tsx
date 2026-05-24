import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, Bell, Camera, Map as MapIcon,
  PlayCircle, Radio, Shield, UserPlus, Volume2, VolumeX,
  Cpu, Globe, Server, CheckCircle2, ChevronRight
} from 'lucide-react';
import MapView from '../components/map/MapView';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';
import AlertNotification from '../components/dashboard/AlertNotification';
import IncidentCard from '../components/dashboard/IncidentCard';
import { BorderIncident } from '../types';
import { backendUrl } from '../lib/backend';

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  subtext: string;
}> = ({ label, value, icon, accent, subtext }) => (
  <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${accent} transition hover:shadow-lg duration-200`}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{label}</p>
        <p className="text-3xl font-headline font-black text-army-green-900 tabular-nums">{value}</p>
        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{subtext}</p>
      </div>
      <div className="p-3 rounded-full bg-army-khaki-100 text-army-green-800">
        {icon}
      </div>
    </div>
  </div>
);

const severityRank: Record<BorderIncident['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const {
    alerts,
    incidents,
    sectors,
    cameras,
    officers,
    activityLogs,
    unreadCount,
    loading,
    error: firebaseError,
    soundEnabled,
    markAllAsRead,
    toggleSound,
  } = useAlerts();

  const navigate = useNavigate();

  // 1. Dynamic states for real FastAPI backend integration
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [backendStats, setBackendStats] = useState({
    total_people: 0,
    total_vehicles: 0,
    total_alerts: 0,
    start_time: ''
  });
  const [latestObject, setLatestObject] = useState<string>('N/A');
  const [latestConf, setLatestConf] = useState<number>(0);

  // Poll backend health and statistics dynamically
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const healthRes = await fetch(backendUrl('/health'));
        const statsRes = await fetch(backendUrl('/stats'));
        
        if (healthRes.ok) setIsBackendOnline(true);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setBackendStats(statsData);
        }

        // Fetch latest alert for object name + confidence
        const alertsRes = await fetch(backendUrl('/alerts?limit=1'));
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          const latest = alertsData.alerts?.[0];
          if (latest) {
            setLatestObject(latest.detected_class || 'N/A');
            setLatestConf(Math.round(latest.confidence * 100));
          }
        }
      } catch {
        setIsBackendOnline(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeIncidents = incidents.filter(
    (incident) => incident.status !== 'resolved' && incident.status !== 'false-alarm'
  );
  
  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .slice(0, 4);

  const recentAlerts = alerts.slice(0, 6);
  const activeOfficers = officers.filter((officer) => officer.online).length;

  const severityBars = useMemo(() => {
    const counts = incidents.reduce<Record<BorderIncident['severity'], number>>((acc, incident) => {
      acc[incident.severity] += 1;
      return acc;
    }, { low: 0, medium: 0, high: 0, critical: 0 });
    const max = Math.max(1, ...Object.values(counts));
    return (Object.keys(counts) as BorderIncident['severity'][])
      .sort((a, b) => severityRank[b] - severityRank[a])
      .map((severity) => ({ 
        severity, 
        count: counts[severity], 
        width: `${Math.max(8, (counts[severity] / max) * 100)}%` 
      }));
  }, [incidents]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          
          {/* Main Welcome & Control Header */}
          <div className="bg-army-green-800 text-white rounded-lg shadow-army p-6 mb-6 border-l-4 border-army-gold overflow-hidden relative">
            <div className="absolute right-4 top-4 opacity-10">
              <Shield className="h-28 w-28 text-army-gold" />
            </div>
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <span className="text-army-gold text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-army-gold animate-ping" />
                  REAL-TIME TACTICAL OPERATIONS HUB
                </span>
                <h1 className="text-3xl font-headline font-bold mt-1">Welcome, {user?.name}</h1>
                <p className="text-army-khaki-200 text-xs font-mono">{user?.rank} &bull; {user?.unit} &bull; COMMAND DISPATCHER ID: #{user?.id || 'DISP-7G'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigate('/surveillance')} className="btn bg-army-gold text-army-green-950 hover:bg-army-gold/80 flex items-center font-bold text-xs py-2">
                  <PlayCircle className="h-4 w-4 mr-2 animate-bounce" />
                  Start Surveillance
                </button>
                <div className={`px-4 py-2 rounded-md border flex items-center text-xs font-bold uppercase tracking-wider font-mono ${
                  isBackendOnline 
                    ? 'bg-green-950/60 border-green-500 text-green-400' 
                    : 'bg-rose-950/60 border-rose-500 text-rose-400 animate-pulse'
                }`}>
                  <Radio className={`h-4 w-4 mr-2 ${isBackendOnline ? 'text-green-400 animate-pulse' : 'text-rose-400'}`} />
                  {isBackendOnline ? 'Live Detection Active' : 'YOLO Backend Offline'}
                </div>
                <button onClick={toggleSound} className="btn btn-secondary flex items-center text-xs py-2">
                  {soundEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                  Sound Feedback
                </button>
              </div>
            </div>
          </div>

          {/* Backend Connection Warnings, if offline */}
          {!isBackendOnline && (
            <div className="mb-6 p-3 bg-rose-50 border-l-4 border-rose-600 rounded text-xs text-rose-800 font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>ALERT:</strong> YOLOv8 dynamic backend is currently offline. Simulating passive radar backups. Run <code>cd backend &amp;&amp; python3 main.py</code> to restore the real-time AI feeds.
              </span>
            </div>
          )}

          {/* 2. Real YOLOv8 and Incident Statistics Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard 
              label="Live Command Threats" 
              value={activeIncidents.length} 
              icon={<AlertTriangle className="h-6 w-6" />} 
              accent="border-red-500" 
              subtext="Unresolved active breaches" 
            />
            <StatCard 
              label="Active AI Sectors" 
              value={`${cameras.filter(c => c.status === 'online').length}/${cameras.length}`} 
              icon={<MapIcon className="h-6 w-6" />} 
              accent="border-green-500" 
              subtext="YOLOv8 scanning active" 
            />
            <StatCard 
              label="Total AI Detections Today" 
              value={isBackendOnline ? (backendStats.total_people + backendStats.total_vehicles) : 32} 
              icon={<Cpu className="h-6 w-6" />} 
              accent="border-blue-500" 
              subtext={`YOLO counts: ${isBackendOnline ? backendStats.total_people : 14} P &bull; ${isBackendOnline ? backendStats.total_vehicles : 18} V`} 
            />
            <StatCard 
              label="Latest Confirmed Signature" 
              value={latestObject !== 'N/A' ? latestObject.toUpperCase() : 'NONE'} 
              icon={<Activity className="h-6 w-6" />} 
              accent="border-amber-500" 
              subtext={`AI Conf: ${latestConf > 0 ? `${latestConf}%` : 'N/A'}`} 
            />
          </div>

          {/* Main Command Post Layout Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Live Video, Map and Incidents */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* Tactical GIS Map & Connected Live Camera Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 3. GIS Tactical Sector Map */}
                <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 flex flex-col h-[400px]">
                  <h2 className="text-sm font-headline font-bold flex items-center mb-3 uppercase tracking-wider text-army-green-800">
                    <Globe className="h-4 w-4 mr-2 text-army-gold" />
                    GIS Tactical Sector Map
                  </h2>
                  <div className="flex-grow rounded overflow-hidden border relative">
                    <MapView darkMode={false} showPatrols={true} />
                  </div>
                </div>

                {/* 4. Connected Live Camera Grid */}
                <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 flex flex-col h-[400px]">
                  <h2 className="text-sm font-headline font-bold flex items-center mb-3 uppercase tracking-wider text-army-green-800">
                    <Camera className="h-4 w-4 mr-2 text-army-gold" />
                    Connected Live Camera Grid
                  </h2>
                  <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {cameras.map(cam => (
                      <div key={cam.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center text-[10px] font-mono">
                        <div>
                          <div className="font-bold text-army-green-900 uppercase">{cam.name}</div>
                          <div className="text-gray-400 mt-0.5">ID: {cam.id} &bull; SECTOR: {cam.sectorId.toUpperCase()}</div>
                          <div className="text-gray-400">Stream: {cam.streamType.toUpperCase()}</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                            cam.status === 'online' ? 'bg-green-100 text-green-800' :
                            cam.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {cam.status.toUpperCase()}
                          </span>
                          <div className="text-gray-400 mt-1">YOLOv8: Active</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Recent Incidents and Bounding Box details */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="border-b px-6 py-4 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-sm font-headline font-bold flex items-center uppercase tracking-wider text-army-green-800">
                    <Activity className="h-4 w-4 mr-2 text-army-gold" />
                    Active Command Incidents
                  </h2>
                  <Link to="/incidents" className="text-army-green-700 text-xs hover:underline font-bold flex items-center gap-1">
                    <span>Manage Dispatch Center</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                
                <div className="p-6">
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((item) => <div key={item} className="h-44 rounded-lg bg-gray-100 animate-pulse" />)}
                    </div>
                  ) : recentIncidents.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recentIncidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs font-mono text-gray-500">
                      No active incidents. Direct live feeds to standard zero lines are secure.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Side: Notification Center & Live Bounding HUD */}
            <div className="space-y-6">
              
              {/* 5. Live Optical HUD Surveillance Window */}
              <div className="bg-army-green-950 text-army-khaki-100 rounded-lg shadow-md p-5 border border-army-gold/30 flex flex-col h-[320px] relative overflow-hidden">
                
                {/* Blinking REC Overlay HUD */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-[9px] font-mono font-bold text-red-500 bg-black/60 px-2 py-0.5 rounded">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  LIVE TACTICAL STREAM
                </div>

                <div className="absolute top-4 right-4 z-10 text-[9px] font-mono text-army-gold bg-black/60 px-2 py-0.5 rounded">
                  {isBackendOnline ? 'YOLOv8 ONLINE' : 'SIM HYBRID'}
                </div>

                {/* Radar Grid Graphic preview */}
                <div className="flex-grow rounded border border-army-gold/20 relative bg-black flex items-center justify-center overflow-hidden">
                  
                  {/* Scope sweeping lines */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-army-green-900/10 via-black to-black" />
                  
                  {/* Bounding box mock indicator */}
                  <div className="absolute top-1/3 left-1/3 border-2 border-green-500 w-24 h-20 flex flex-col justify-between p-1 text-[8px] font-mono text-green-400 bg-green-500/5">
                    <span>ID: #BS-408</span>
                    <span>TARGET Conf: 85%</span>
                  </div>

                  {/* Laser Scanning line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-green-500/50 shadow-[0_0_10px_#22c55e] animate-[pulse-height_4s_infinite]" />

                  {/* HUD scope texts */}
                  <div className="absolute bottom-2 left-2 text-[8px] font-mono text-army-gold uppercase">
                    Tower-Alpha EO/IR Sector 7G
                  </div>
                  
                  <div className="absolute bottom-2 right-2 text-[8px] font-mono text-white">
                    FPS: 30.0 &bull; COORD LOCK
                  </div>

                </div>

                <div className="mt-3 text-[10px] font-mono text-center text-army-gold uppercase tracking-wider">
                  Real-time perimeter monitoring zero line stream
                </div>

              </div>

              {/* Notification Center */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="border-b px-6 py-4 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-sm font-headline font-bold uppercase tracking-wider text-army-green-800 flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-army-gold animate-pulse" />
                    Operational Alarms Center
                  </h2>
                  {unreadCount > 0 && (
                    <button className="text-army-green-700 text-xs font-bold hover:underline" onClick={markAllAsRead}>
                      Clear Telemetries
                    </button>
                  )}
                </div>
                <div className="p-4 max-h-[380px] overflow-y-auto custom-scrollbar">
                  {recentAlerts.length > 0 ? (
                    recentAlerts.map((alert) => <AlertNotification key={alert.id} alert={alert} />)
                  ) : (
                    <div className="text-center py-8 text-xs font-mono text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      Awaiting live optical-radar sensor triggers…
                    </div>
                  )}
                </div>
              </div>

              {/* Activity History logs */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="border-b px-6 py-4 bg-gray-50/50">
                  <h2 className="text-sm font-headline font-bold uppercase tracking-wider text-army-green-800">Command Activity Brief</h2>
                </div>
                <div className="p-4 space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {activityLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="text-[10px] font-mono border-l-2 border-army-green-700 pl-3">
                      <p className="font-bold text-army-green-900">{log.action}</p>
                      <p className="text-gray-400">{log.actorName} &bull; {new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))}
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

export default DashboardPage;
