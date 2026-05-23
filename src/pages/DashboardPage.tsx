import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Camera,
  Map,
  PlayCircle,
  Radio,
  Shield,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';
import AlertNotification from '../components/dashboard/AlertNotification';
import IncidentCard from '../components/dashboard/IncidentCard';
import { BorderIncident } from '../types';

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  subtext: string;
}> = ({ label, value, icon, accent, subtext }) => (
  <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${accent}`}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{label}</p>
        <p className="text-3xl font-headline font-black text-army-green-900 tabular-nums">{value}</p>
        <p className="text-[11px] text-gray-500">{subtext}</p>
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
    error,
    simulationEnabled,
    soundEnabled,
    markAllAsRead,
    createSimulatedDetection,
    toggleSimulation,
    toggleSound,
  } = useAlerts();

  const activeIncidents = incidents.filter((incident) => incident.status !== 'resolved' && incident.status !== 'false-alarm');
  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .slice(0, 6);
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
      .map((severity) => ({ severity, count: counts[severity], width: `${Math.max(8, (counts[severity] / max) * 100)}%` }));
  }, [incidents]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          <div className="bg-army-green-800 text-white rounded-lg shadow-army p-6 mb-6 border-l-4 border-saffron overflow-hidden relative">
            <div className="absolute right-4 top-4 opacity-10">
              <Shield className="h-28 w-28" />
            </div>
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <span className="text-army-gold text-xs font-semibold uppercase tracking-wider">Realtime Command Dashboard</span>
                <h1 className="text-3xl font-headline font-bold mt-1">Welcome, {user?.name.split(' ')[0]}</h1>
                <p className="text-army-khaki-200">{user?.rank}, {user?.unit} · Role: {user?.role.toUpperCase()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => createSimulatedDetection()} className="btn bg-army-gold text-army-green-950 hover:bg-saffron flex items-center">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Generate Detection
                </button>
                <button onClick={toggleSimulation} className="btn btn-secondary flex items-center">
                  <Radio className={`h-4 w-4 mr-2 ${simulationEnabled ? 'text-red-600 animate-pulse' : ''}`} />
                  {simulationEnabled ? 'Simulation Live' : 'Simulation Paused'}
                </button>
                <button onClick={toggleSound} className="btn btn-secondary flex items-center">
                  {soundEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                  Sound
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-warning">
              Firebase connection notice: {error}. Local realtime fallback remains active.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Live Mission Threats" value={activeIncidents.length} icon={<AlertTriangle className="h-6 w-6" />} accent="border-red-500" subtext="Active unresolved incidents" />
            <StatCard label="Active Sectors" value={sectors.length} icon={<Map className="h-6 w-6" />} accent="border-green-500" subtext={`${cameras.filter((camera) => camera.status === 'online').length}/${cameras.length} cameras online`} />
            <StatCard label="New Alerts" value={unreadCount} icon={<Bell className="h-6 w-6" />} accent="border-amber-500" subtext="Unread realtime notifications" />
            <StatCard label="Active Officers" value={activeOfficers} icon={<UserPlus className="h-6 w-6" />} accent="border-blue-500" subtext={`${officers.length} officers registered`} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3 flex justify-between items-center">
                  <h2 className="text-lg font-headline font-semibold flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-army-green-700" />
                    Recent Incidents
                  </h2>
                  <Link to="/incidents" className="text-army-green-600 text-sm hover:underline">View All</Link>
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
                    <div className="text-center py-10 text-gray-500">No incidents recorded. Start simulation or run YOLO detection.</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-5">
                  <h2 className="text-lg font-headline font-semibold flex items-center mb-4">
                    <BarChart3 className="h-5 w-5 mr-2 text-army-green-700" />
                    Priority Distribution
                  </h2>
                  <div className="space-y-3">
                    {severityBars.map((item) => (
                      <div key={item.severity}>
                        <div className="flex justify-between text-xs uppercase font-bold text-gray-500 mb-1">
                          <span>{item.severity}</span>
                          <span>{item.count}</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${
                            item.severity === 'critical' ? 'bg-army-red-600' :
                            item.severity === 'high' ? 'bg-orange-500' :
                            item.severity === 'medium' ? 'bg-amber-500' : 'bg-green-600'
                          }`} style={{ width: item.width }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-army-green-900 rounded-lg shadow-md p-5 text-army-khaki-100">
                  <h2 className="text-lg font-headline font-semibold flex items-center mb-4 text-white">
                    <Camera className="h-5 w-5 mr-2 text-army-gold" />
                    Live Detection Feed
                  </h2>
                  <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                    {recentAlerts.map((alert) => (
                      <div key={alert.id} className="border-l-2 border-army-gold bg-white/5 p-3 rounded-r">
                        <div className="flex justify-between gap-3">
                          <p className="font-bold text-sm text-white">{alert.objectType || alert.title}</p>
                          <span className="text-[10px] text-army-gold">{alert.confidence || 0}%</span>
                        </div>
                        <p className="text-xs text-army-khaki-200 line-clamp-2">{alert.message}</p>
                        <p className="text-[10px] text-army-khaki-300 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3 flex justify-between items-center">
                  <h2 className="text-lg font-headline font-semibold">Notification Center</h2>
                  {unreadCount > 0 && (
                    <button className="text-army-green-600 text-sm hover:underline" onClick={markAllAsRead}>
                      Mark All Read
                    </button>
                  )}
                </div>
                <div className="p-4 max-h-[430px] overflow-y-auto custom-scrollbar">
                  {recentAlerts.length > 0 ? recentAlerts.map((alert) => <AlertNotification key={alert.id} alert={alert} />) : (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      No live alerts
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3">
                  <h2 className="text-lg font-headline font-semibold">Activity History</h2>
                </div>
                <div className="p-4 space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                  {activityLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="text-xs border-l-2 border-army-green-600 pl-3">
                      <p className="font-bold text-army-green-900">{log.action}</p>
                      <p className="text-gray-500">{log.actorName} · {new Date(log.timestamp).toLocaleTimeString()}</p>
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
