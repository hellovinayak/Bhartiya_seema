import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Download, Edit3, Eye, Filter, PlusCircle, Search, Trash2, 
  UserCheck, X, ShieldAlert, ShieldCheck, Siren, Activity, 
  ChevronRight, RefreshCw, BarChart2, Radio, Bell
} from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import IncidentCard from '../components/dashboard/IncidentCard';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';
import { BorderIncident, DetectionLabel, DetectionType } from '../types';

const PAGE_SIZE = 9;

const IncidentsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { 
    incidents, 
    officers, 
    sectors, 
    updateIncident, 
    deleteIncident, 
    loading 
  } = useAlerts();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorderIncident['status'] | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<BorderIncident['severity'] | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [objectFilter, setObjectFilter] = useState<DetectionLabel | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'newest' | 'priority'>('newest');
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);

  // Compute live command statistics
  const stats = useMemo(() => {
    const total = incidents.length;
    const active = incidents.filter(i => ['reported', 'under-review', 'officer-assigned', 'patrol-dispatched'].includes(i.status)).length;
    const dispatched = incidents.filter(i => i.status === 'patrol-dispatched').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    const falseAlarms = incidents.filter(i => i.status === 'false-alarm').length;
    const falseAlarmRate = total > 0 ? Math.round((falseAlarms / total) * 100) : 0;
    
    return {
      active,
      dispatched,
      resolved,
      reliability: Math.max(0, 100 - falseAlarmRate)
    };
  }, [incidents]);

  // Compute a vertical tactical chronological event ticker log dynamically
  const tacticalEvents = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      content: string;
      timestamp: string;
      severity: BorderIncident['severity'];
      status: BorderIncident['status'];
    }> = [];

    incidents.forEach(inc => {
      // Add the initial report trigger
      events.push({
        id: `report_${inc.id}_${inc.reportedAt}`,
        title: inc.title,
        content: `AI Sensor Trigger: Detected ${inc.objectType || inc.type} near ${inc.zone || 'Border Fence'} (Confidence: ${inc.aiConfidence || 75}%).`,
        timestamp: inc.reportedAt,
        severity: inc.severity,
        status: 'reported'
      });

      // Add each manual/automated update
      inc.updates.forEach(up => {
        events.push({
          id: `up_${up.id}_${up.timestamp}`,
          title: inc.title,
          content: up.content,
          timestamp: up.timestamp,
          severity: inc.severity,
          status: up.status || inc.status
        });
      });
    });

    // Sort newest first
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12);
  }, [incidents]);

  const objectTypes = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.objectType).filter(Boolean))) as DetectionLabel[],
    [incidents],
  );

  const filteredIncidents = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    return incidents.filter((incident) => {
      const searchable = `${incident.title} ${incident.description} ${incident.zone || ''} ${incident.objectType || ''} ${incident.assignedOfficer || ''}`.toLowerCase();
      const age = Date.now() - new Date(incident.reportedAt).getTime();
      return (
        (!searchTerm || searchable.includes(searchTerm.toLowerCase())) &&
        (statusFilter === 'all' || incident.status === statusFilter) &&
        (severityFilter === 'all' || incident.severity === severityFilter) &&
        (zoneFilter === 'all' || incident.zone === zoneFilter) &&
        (objectFilter === 'all' || incident.objectType === objectFilter) &&
        (dateFilter === 'all' || (dateFilter === '24h' && age <= oneDay) || (dateFilter === '7d' && age <= sevenDays))
      );
    });
  }, [dateFilter, incidents, objectFilter, searchTerm, severityFilter, statusFilter, zoneFilter]);

  const sortedIncidents = useMemo(() => {
    const severityRank: Record<BorderIncident['severity'], number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return [...filteredIncidents].sort((a, b) => {
      if (sortMode === 'priority') return severityRank[b.severity] - severityRank[a.severity];
      return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
    });
  }, [filteredIncidents, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sortedIncidents.length / PAGE_SIZE));
  const pagedIncidents = sortedIncidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setZoneFilter('all');
    setObjectFilter('all');
    setDateFilter('all');
    setPage(1);
  };

  const exportReport = () => {
    const rows = sortedIncidents.map((incident) => ({
      incidentId: incident.id,
      title: incident.title,
      description: incident.description,
      objectType: incident.objectType || incident.type,
      priority: incident.severity,
      status: incident.status,
      coordinates: incident.location ? `${incident.location.lat}, ${incident.location.lng}` : 'N/A',
      zone: incident.zone,
      assignedOfficer: incident.assignedOfficer || 'Unassigned',
      aiConfidence: `${incident.aiConfidence || 0}%`,
      severityScore: `${incident.severityScore || 0}/100`,
      reportedAt: incident.reportedAt,
      updatesCount: incident.updates.length
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bhartiya-seema-tactical-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const assignOfficer = async (incident: BorderIncident, officerId: string) => {
    const officer = officers.find((item) => item.id === officerId);
    await updateIncident(incident.id, {
      assignedTo: officerId,
      assignedOfficer: officer?.name || officerId,
      status: incident.status === 'reported' ? 'officer-assigned' : incident.status,
      updates: [
        ...incident.updates,
        {
          id: `assign_${Date.now()}`,
          content: `Assigned to ${officer?.name || officerId} (${officer?.rank || 'Field Officer'}) by Command Center. Status updated to OFFICER ASSIGNED.`,
          timestamp: new Date().toISOString(),
          updatedBy: user?.id || 'command',
          status: incident.status === 'reported' ? 'officer-assigned' : incident.status,
        },
      ],
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          
          {/* Page Title & Controls Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-headline font-bold text-army-green-800 uppercase tracking-tight flex items-center gap-2">
                <Siren className="h-6 w-6 text-army-red-600 animate-pulse" />
                AI Border Incident Command
              </h1>
              <p className="text-xs text-gray-600 font-mono">
                OPERATIONAL TELEMETRY &bull; FIELD TACTICAL DISPATCH CENTER &bull; PERIMETER ZERO LINE
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn bg-army-green-800 hover:bg-army-green-950 text-white flex items-center text-xs py-2" onClick={exportReport}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export Tactical Report
              </button>
              <button className="btn bg-army-gold hover:bg-army-gold/80 text-army-green-950 flex items-center font-bold text-xs py-2" onClick={() => navigate('/surveillance')}>
                <Radio className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                Open Surveillance Feed
              </button>
              <button className="btn btn-primary flex items-center text-xs py-2" onClick={() => navigate('/incidents/new')}>
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                Manual Incident Report
              </button>
            </div>
          </div>

          {/* 1. Military Tactical Statistics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-army-red-600 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Threats</p>
                <h3 className="text-2xl font-black text-army-red-700 font-mono">{String(stats.active).padStart(2, '0')}</h3>
              </div>
              <div className="p-2 bg-red-50 rounded-full text-army-red-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-amber-500 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patrols Dispatched</p>
                <h3 className="text-2xl font-black text-amber-700 font-mono">{String(stats.dispatched).padStart(2, '0')}</h3>
              </div>
              <div className="p-2 bg-amber-50 rounded-full text-amber-600">
                <Siren className="h-6 w-6 animate-pulse" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-600 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secured Sectors</p>
                <h3 className="text-2xl font-black text-green-700 font-mono">{String(stats.resolved).padStart(2, '0')}</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-full text-green-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-army-green-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Target Precision</p>
                <h3 className="text-2xl font-black text-army-green-800 font-mono">{stats.reliability}%</h3>
              </div>
              <div className="p-2 bg-army-khaki-100 rounded-full text-army-green-700">
                <BarChart2 className="h-6 w-6" />
              </div>
            </div>

          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left: Search, Filters, Incidents Grid */}
            <div className="lg:w-3/4 space-y-6">
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                
                {/* Search & Basic Sorting controls */}
                <div className="p-4 border-b bg-gray-50/50">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                      <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        className="form-input pl-10 text-sm font-sans"
                        placeholder="Search incidents by keyword, sector, code, or officer..."
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <select className="form-input md:w-48 text-xs font-bold" value={sortMode} onChange={(event) => setSortMode(event.target.value as 'newest' | 'priority')}>
                      <option value="newest">Sort: Newest First</option>
                      <option value="priority">Sort: Threat Level</option>
                    </select>
                    <button className="btn btn-secondary flex items-center justify-center text-xs py-2" onClick={() => setShowFilters((visible) => !visible)}>
                      <Filter className="h-3.5 w-3.5 mr-1.5" />
                      {showFilters ? 'Collapse Filters' : 'Expand Filters'}
                    </button>
                  </div>

                  {/* Expanded Tactical Filters */}
                  {showFilters && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                      
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Workflow Status</label>
                        <select className="form-input text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BorderIncident['status'] | 'all')}>
                          <option value="all">All States</option>
                          <option value="reported">Reported (NEW)</option>
                          <option value="under-review">Under Review</option>
                          <option value="officer-assigned">Officer Assigned</option>
                          <option value="patrol-dispatched">Patrol Dispatched</option>
                          <option value="resolved">Resolved</option>
                          <option value="false-alarm">False Alarm</option>
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Threat Priority</label>
                        <select className="form-input text-xs" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as BorderIncident['severity'] | 'all')}>
                          <option value="all">All Severities</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sector Zone</label>
                        <select className="form-input text-xs" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
                          <option value="all">All Sectors</option>
                          {sectors.map((sector) => <option key={sector.id} value={sector.name}>{sector.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Target Signature</label>
                        <select className="form-input text-xs" value={objectFilter} onChange={(event) => setObjectFilter(event.target.value as DetectionLabel | 'all')}>
                          <option value="all">All Targets</option>
                          {objectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Temporal Frame</label>
                        <select className="form-input text-xs" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                          <option value="all">All Timeline</option>
                          <option value="24h">Last 24 Hours</option>
                          <option value="7d">Last 7 Days</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button className="btn btn-secondary flex items-center justify-center w-full text-xs py-2 bg-gray-100 hover:bg-gray-200 border-none" onClick={resetFilters}>
                          <X className="h-3.5 w-3.5 mr-1" />
                          Reset Filters
                        </button>
                      </div>

                    </div>
                  )}
                </div>

                {/* Incidents Grid */}
                <div className="p-6">
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div key={item} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : pagedIncidents.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {pagedIncidents.map((incident) => (
                          <div key={incident.id} className="space-y-2 group">
                            <IncidentCard incident={incident} />
                            
                            {/* Command Bar underneath the Incident Card */}
                            <div className="bg-gray-50 border rounded-lg p-2.5 flex flex-wrap gap-1.5 items-center justify-between shadow-sm">
                              <Link to={`/incidents/${incident.id}`} className="btn bg-army-green-800 hover:bg-army-green-950 text-white text-[10px] py-1.5 px-3.5 font-bold uppercase tracking-wider flex items-center">
                                <Eye className="h-3 w-3 mr-1" />
                                Inspect
                              </Link>
                              
                              <button 
                                className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] py-1.5 px-3.5 font-bold uppercase tracking-wider flex items-center" 
                                onClick={() => updateIncident(incident.id, { 
                                  status: 'resolved',
                                  updates: [
                                    ...incident.updates,
                                    {
                                      id: `resolve_${Date.now()}`,
                                      content: 'Operator marked the incident status as SECURED / RESOLVED.',
                                      timestamp: new Date().toISOString(),
                                      updatedBy: user?.id || 'command',
                                      status: 'resolved'
                                    }
                                  ]
                                })}
                              >
                                <UserCheck className="h-3 w-3 mr-1" />
                                Secure
                              </button>

                              {hasRole('admin', 'commander') && (
                                <button className="btn bg-rose-600 hover:bg-rose-700 text-white text-[10px] py-1.5 px-2 flex items-center" onClick={() => deleteIncident(incident.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}

                              <select
                                className="form-input text-[10px] py-1 px-1.5 max-w-[130px] font-sans font-semibold text-army-green-900 focus:ring-0 focus:border-army-gold"
                                value={incident.assignedTo || ''}
                                onChange={(event) => assignOfficer(incident, event.target.value)}
                              >
                                <option value="">Assign Officer...</option>
                                {officers.filter((officer) => officer.role !== 'admin').map((officer) => (
                                  <option key={officer.id} value={officer.id}>{officer.name}</option>
                                ))}
                              </select>

                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 border-t pt-4 text-xs font-mono">
                        <p className="text-gray-500">
                          Active telemetry reporting <span className="font-bold text-army-green-800">{pagedIncidents.length}</span> of <span className="font-bold">{sortedIncidents.length}</span> recorded cases
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="btn btn-secondary text-[11px] py-1" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                            Previous
                          </button>
                          <span className="font-bold text-army-green-800">
                            Sector Frame {page} / {totalPages}
                          </span>
                          <button className="btn btn-secondary text-[11px] py-1" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Edit3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-army-green-800 uppercase tracking-wide">No Sensor Matches Identified</h3>
                      <p className="text-xs text-gray-500 font-mono">All operational sector parameters currently report CLEAR status.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Side: Event Ticker Column */}
            <div className="lg:w-1/4 space-y-6">
              
              {/* Tactical Operations Feed */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-army-gold">
                
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-army-green-800 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-army-gold animate-pulse" />
                    Tactical Operations Log
                  </h3>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                </div>

                <div className="p-4 max-h-[640px] overflow-y-auto space-y-4 custom-scrollbar">
                  {tacticalEvents.length > 0 ? (
                    tacticalEvents.map((evt) => (
                      <div key={evt.id} className="text-[10px] font-mono border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] tracking-wide uppercase ${
                            evt.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            evt.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            evt.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {evt.severity}
                          </span>
                          <span className="text-gray-400 text-[9px]">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-army-green-900 uppercase truncate mb-0.5">{evt.title}</h4>
                        <p className="text-gray-600 text-[10px] leading-normal">{evt.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic text-center py-6">
                      Awaiting live optical-radar sensor triggers…
                    </p>
                  )}
                </div>

              </div>

              {/* Guard Station Info */}
              <div className="bg-army-green-900 text-white rounded-lg shadow-md p-5 border border-army-gold/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-10">
                  <Radio className="h-32 w-32 text-army-gold" />
                </div>
                <div className="relative z-10 space-y-3">
                  <h4 className="font-headline font-bold text-xs uppercase text-army-gold tracking-widest flex items-center gap-1">
                    <Radio className="h-4 w-4 animate-ping" />
                    Zero Line Protocol
                  </h4>
                  <p className="text-[10px] text-army-khaki-200 leading-normal font-mono">
                    Any person signature identified by the YOLOv8 sensors inside Sector 7G Zone Alpha is automatically escalated to high priority and dispatches SMTP critical alerts.
                  </p>
                  <div className="border-t border-army-gold/25 pt-2.5 flex justify-between items-center text-[9px] text-army-gold font-mono">
                    <span>SECURITY DIVISION 4</span>
                    <span>ONLINE</span>
                  </div>
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

export default IncidentsPage;
