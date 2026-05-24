import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertOctagon,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  LogOut,
  MapPin,
  MessageSquare,
  Radio,
  ShieldCheck,
  Trash2,
  Truck,
  Users,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAlerts } from '../contexts/AlertContext';
import type { IncidentUpdate } from '../types';

type AdminReport = {
  id: string;
  timestamp: string;
  location: string;
  counts: Record<string, number>;
};

type TimelineUpdate = {
  id: string;
  content: string;
  timestamp: string;
  status?: IncidentUpdate['status'];
  alertTitle: string;
};

const AdminStatCard: React.FC<{
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

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { alerts, clearAlerts } = useAlerts();
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});

  const stats = useMemo(() => {
    let people = 0;
    let vehicles = 0;

    alerts.forEach((alert) => {
      const cls = (alert.detected_class || '').toLowerCase();
      const count = alert.detected_count || 1;

      if (cls === 'person') {
        people += count;
      } else if (['car', 'truck', 'motorcycle', 'bus', 'bicycle', 'vehicle'].includes(cls)) {
        vehicles += count;
      }
    });

    return { total_people: people, total_vehicles: vehicles };
  }, [alerts]);

  const reports = useMemo<AdminReport[]>(() => {
    return alerts.map((alert) => ({
      id: alert.id,
      timestamp: alert.timestamp || new Date().toISOString(),
      location: locationNames[alert.id]
        || (alert.location ? `${alert.location.lat.toFixed(2)}, ${alert.location.lng.toFixed(2)}` : 'Unknown sector'),
      counts: {
        [alert.detected_class || 'unknown']: alert.detected_count || 1,
      },
    }));
  }, [alerts, locationNames]);

  const timelineUpdates = useMemo<TimelineUpdate[]>(() => {
    const allUpdates: TimelineUpdate[] = [];

    alerts.forEach((alert) => {
      if (!alert.updates?.length) return;

      alert.updates.forEach((update) => {
        allUpdates.push({
          ...update,
          alertTitle: alert.title,
        });
      });
    });

    return allUpdates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [alerts]);

  useEffect(() => {
    const pending = alerts.filter(
      (alert) => alert.location?.lat && alert.location?.lng && !locationNames[alert.id]
    );

    if (pending.length === 0) return;

    let i = 0;
    const timer = setInterval(() => {
      if (i >= pending.length) {
        clearInterval(timer);
        return;
      }

      const alert = pending[i++];
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${alert.location!.lat}&lon=${alert.location!.lng}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data?.address) return;

          const place = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
          const state = data.address.state || data.address.country || '';
          setLocationNames((prev) => ({ ...prev, [alert.id]: `${place}, ${state}` }));
        })
        .catch(() => {});
    }, 1100);

    return () => clearInterval(timer);
  }, [alerts]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const exportToCSV = () => {
    if (reports.length === 0) return;

    const header = ['Timestamp', 'Location', 'Class', 'Count'];
    const rows = reports.flatMap((report) =>
      Object.entries(report.counts).map(([cls, count]) =>
        [report.timestamp, report.location, cls, count].map(csvCell).join(',')
      )
    );
    const csv = [header.map(csvCell).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bhartiya_seema_intel_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const totalSignatures = stats.total_people + stats.total_vehicles;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          <section className="bg-army-green-800 text-white rounded-lg shadow-army p-6 mb-6 border-l-4 border-army-gold overflow-hidden relative">
            <div className="absolute right-4 top-4 opacity-10">
              <ShieldCheck className="h-28 w-28 text-army-gold" />
            </div>
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <span className="text-army-gold text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-army-gold animate-ping" />
                  ADMIN COMMAND CENTER
                </span>
                <h1 className="text-3xl font-headline font-bold mt-1">Mission Control Dashboard</h1>
                <p className="text-army-khaki-200 text-xs font-mono">
                  Classified access active &bull; Sector 7G &bull; Live surveillance intelligence
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={clearAlerts}
                  className="btn bg-army-red-600 text-white hover:bg-army-red-700 flex items-center font-bold text-xs py-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Feed
                </button>
                <button
                  onClick={exportToCSV}
                  className="btn bg-army-gold text-army-green-950 hover:bg-army-gold/80 flex items-center font-bold text-xs py-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Intel
                </button>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary flex items-center font-bold text-xs py-2"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AdminStatCard
              label="Total Persons"
              value={stats.total_people.toString().padStart(3, '0')}
              icon={<Users className="h-6 w-6" />}
              accent="border-green-500"
              subtext="Confirmed person signatures"
            />
            <AdminStatCard
              label="Total Vehicles"
              value={stats.total_vehicles.toString().padStart(3, '0')}
              icon={<Truck className="h-6 w-6" />}
              accent="border-blue-500"
              subtext="Confirmed vehicle signatures"
            />
            <AdminStatCard
              label="Total Signatures"
              value={totalSignatures.toString().padStart(3, '0')}
              icon={<ShieldCheck className="h-6 w-6" />}
              accent="border-amber-500"
              subtext="YOLO/camera intelligence total"
            />
            <AdminStatCard
              label="Reports Authored"
              value={reports.length.toString().padStart(3, '0')}
              icon={<FileText className="h-6 w-6" />}
              accent="border-saffron"
              subtext="Exportable admin records"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-sm font-headline font-bold uppercase tracking-wider text-army-green-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-army-green-700" />
                  Tactical Dispatch Stream
                </h2>
                <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-green-700 border border-green-200">
                  <Radio className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                  Live feed
                </span>
              </div>

              <div className="p-5">
                {reports.length > 0 ? (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="rounded-lg border border-gray-200 bg-army-khaki-50 p-4 transition hover:shadow-md hover:border-army-green-300"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="min-w-0">
                            <div className="inline-flex items-center rounded-md bg-army-green-900 px-3 py-1 text-[10px] font-mono font-bold text-army-gold">
                              <Clock className="h-3.5 w-3.5 mr-1.5" />
                              {formatTimestamp(report.timestamp)}
                            </div>
                            <p className="mt-3 text-sm font-bold text-army-green-900 flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-army-gold flex-shrink-0" />
                              <span className="truncate">{report.location}</span>
                            </p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:min-w-[220px]">
                            {Object.entries(report.counts).map(([cls, count]) => (
                              <div key={cls} className="rounded-md bg-white border border-gray-200 p-3">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{cls}</p>
                                <p className="text-2xl font-headline font-black text-army-green-900">{count}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="min-h-[280px] flex flex-col items-center justify-center text-center text-gray-500">
                    <FileText className="h-12 w-12 text-army-green-200 mb-3" />
                    <p className="text-sm font-bold text-army-green-900">No live surveillance records yet</p>
                    <p className="text-xs mt-1 max-w-md">
                      Admin reports appear here only after YOLO/camera detections create real alerts.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200">
                  <h2 className="text-sm font-headline font-bold uppercase tracking-wider text-army-green-800 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-army-green-700" />
                    Field Officer Comms
                  </h2>
                </div>

                <div className="p-5">
                  {timelineUpdates.length > 0 ? (
                    <div className="space-y-3">
                      {timelineUpdates.map((update) => (
                        <div
                          key={update.id}
                          className={`rounded-lg border-l-4 p-3 ${
                            update.status === 'resolved'
                              ? 'bg-green-50 border-green-500'
                              : update.status === 'investigating'
                                ? 'bg-amber-50 border-amber-500'
                                : 'bg-army-khaki-50 border-army-gold'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[10px] font-mono text-gray-500">
                              {formatTimestamp(update.timestamp)}
                            </span>
                            {update.status === 'resolved' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : update.status === 'investigating' ? (
                              <AlertOctagon className="h-4 w-4 text-amber-600" />
                            ) : (
                              <Activity className="h-4 w-4 text-army-green-700" />
                            )}
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed font-semibold">{update.content}</p>
                          <p className="text-[10px] text-gray-500 mt-2 font-mono">Ref: {update.alertTitle}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="min-h-[180px] flex flex-col items-center justify-center text-center text-gray-500">
                      <MessageSquare className="h-10 w-10 text-army-green-200 mb-3" />
                      <p className="text-sm font-bold text-army-green-900">No active memos</p>
                      <p className="text-xs mt-1">Officer updates will appear after field review.</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
                <h2 className="text-sm font-headline font-bold uppercase tracking-wider text-army-green-800 flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-army-gold" />
                  Command Directives
                </h2>
                <div className="space-y-3">
                  {[
                    'Confirm all boundary calibration before night surveillance begins.',
                    'Dispatch patrol review only after camera or YOLO confidence is recorded.',
                    'Export intel at shift handover for command archive review.',
                  ].map((directive) => (
                    <div key={directive} className="flex gap-3 rounded-md bg-army-khaki-50 border border-army-khaki-200 p-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-army-gold flex-shrink-0" />
                      <p className="text-xs text-gray-700 leading-relaxed font-semibold">{directive}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-army-green-950 text-army-khaki-100 rounded-lg shadow-md p-5 border border-army-gold/30 overflow-hidden relative">
                <div className="absolute right-0 top-0 opacity-10">
                  <ShieldCheck className="h-28 w-28 text-army-gold" />
                </div>
                <div className="relative">
                  <h2 className="text-sm font-headline font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-army-gold" />
                    Sector Map Overlays
                  </h2>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-md border border-army-gold/20 bg-army-green-900/80 p-3">
                      <p className="text-army-gold font-headline font-black text-2xl">{reports.length}</p>
                      <p className="text-army-khaki-200 font-mono">active reports</p>
                    </div>
                    <div className="rounded-md border border-army-gold/20 bg-army-green-900/80 p-3">
                      <p className="text-army-gold font-headline font-black text-2xl">{totalSignatures}</p>
                      <p className="text-army-khaki-200 font-mono">signatures</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] leading-relaxed text-army-khaki-200 font-mono">
                    Session totals are evaluated from live surveillance alerts and officer-confirmed incident updates.
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
