import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Edit3, Eye, Filter, PlusCircle, Search, Trash2, UserCheck, X } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import IncidentCard from '../components/dashboard/IncidentCard';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';
import { BorderIncident, DetectionLabel } from '../types';

const PAGE_SIZE = 9;

const IncidentsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { incidents, officers, sectors, updateIncident, deleteIncident, createSimulatedDetection, loading } = useAlerts();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorderIncident['status'] | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<BorderIncident['severity'] | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [objectFilter, setObjectFilter] = useState<DetectionLabel | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'newest' | 'priority'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const objectTypes = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.objectType).filter(Boolean))) as DetectionLabel[],
    [incidents],
  );

  const filteredIncidents = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    return incidents.filter((incident) => {
      const searchable = `${incident.title} ${incident.description} ${incident.zone || ''} ${incident.objectType || ''}`.toLowerCase();
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
      title: incident.title,
      objectType: incident.objectType,
      priority: incident.severity,
      status: incident.status,
      zone: incident.zone,
      assignedOfficer: incident.assignedOfficer || incident.assignedTo || 'Unassigned',
      confidence: incident.aiConfidence,
      timestamp: incident.reportedAt,
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bhartiya-seema-incident-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const assignOfficer = async (incident: BorderIncident, officerId: string) => {
    const officer = officers.find((item) => item.id === officerId);
    await updateIncident(incident.id, {
      assignedTo: officerId,
      assignedOfficer: officer?.name || officerId,
      status: incident.status === 'reported' ? 'investigating' : incident.status,
      updates: [
        ...incident.updates,
        {
          id: `assign_${Date.now()}`,
          content: `Assigned to ${officer?.name || officerId} by ${user?.name || 'Command'}.`,
          timestamp: new Date().toISOString(),
          updatedBy: user?.id || 'command',
          status: incident.status === 'reported' ? 'investigating' : incident.status,
        },
      ],
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-headline font-bold text-army-green-800">Border Incidents</h1>
              <p className="text-sm text-gray-600">Firestore-ready incident command, assignment, response, and export workflow.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-secondary flex items-center" onClick={exportReport}>
                <Download className="h-4 w-4 mr-1" />
                Export Report
              </button>
              <button className="btn btn-secondary flex items-center" onClick={() => createSimulatedDetection()}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Simulate Detection
              </button>
              <button className="btn btn-primary flex items-center" onClick={() => navigate('/incidents/new')}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Report New Incident
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-4 border-b">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    className="form-input pl-10"
                    placeholder="Search by title, zone, object type, officer..."
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <select className="form-input lg:w-48" value={sortMode} onChange={(event) => setSortMode(event.target.value as 'newest' | 'priority')}>
                  <option value="newest">Newest First</option>
                  <option value="priority">Priority First</option>
                </select>
                <button className="btn btn-secondary flex items-center justify-center" onClick={() => setShowFilters((visible) => !visible)}>
                  <Filter className="h-4 w-4 mr-1" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>

              {showFilters && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                  <select className="form-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BorderIncident['status'] | 'all')}>
                    <option value="all">All Statuses</option>
                    <option value="reported">Reported</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="false-alarm">False Alarm</option>
                  </select>
                  <select className="form-input" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as BorderIncident['severity'] | 'all')}>
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select className="form-input" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
                    <option value="all">All Zones</option>
                    {sectors.map((sector) => <option key={sector.id} value={sector.name}>{sector.name}</option>)}
                  </select>
                  <select className="form-input" value={objectFilter} onChange={(event) => setObjectFilter(event.target.value as DetectionLabel | 'all')}>
                    <option value="all">All Objects</option>
                    {objectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <select className="form-input" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                    <option value="all">All Dates</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                  </select>
                  <button className="btn btn-secondary flex items-center justify-center" onClick={resetFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Reset
                  </button>
                </div>
              )}
            </div>

            <div className="p-6">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-56 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : pagedIncidents.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {pagedIncidents.map((incident) => (
                      <div key={incident.id} className="space-y-3">
                        <IncidentCard incident={incident} />
                        <div className="bg-white border rounded-lg p-3 flex flex-wrap gap-2 items-center justify-between">
                          <Link to={`/incidents/${incident.id}`} className="btn btn-secondary py-1.5 flex items-center">
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Open
                          </Link>
                          <button className="btn btn-secondary py-1.5 flex items-center" onClick={() => updateIncident(incident.id, { status: 'resolved' })}>
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            Resolve
                          </button>
                          {hasRole('admin', 'commander') && (
                            <button className="btn btn-danger py-1.5 flex items-center" onClick={() => deleteIncident(incident.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </button>
                          )}
                          <select
                            className="form-input text-xs py-1.5 flex-1 min-w-[150px]"
                            value={incident.assignedTo || ''}
                            onChange={(event) => assignOfficer(incident, event.target.value)}
                          >
                            <option value="">Assign officer</option>
                            {officers.filter((officer) => officer.role !== 'admin').map((officer) => (
                              <option key={officer.id} value={officer.id}>{officer.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 border-t pt-4 text-sm">
                    <p className="text-gray-500">Showing {pagedIncidents.length} of {sortedIncidents.length} incidents</p>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                      <span className="font-bold text-army-green-800">Page {page} / {totalPages}</span>
                      <button className="btn btn-secondary" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <Edit3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700">No incidents found</h3>
                  <p className="text-gray-500">Adjust filters or generate a live detection.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default IncidentsPage;
