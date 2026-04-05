import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PlusCircle, Filter, Search, X } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import IncidentCard from '../components/dashboard/IncidentCard';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';
import { BorderIncident, Alert } from '../types';

const mapAlertToIncident = (alert: Alert): BorderIncident => ({
  id: alert.id,
  title: alert.title,
  description: alert.message,
  severity: alert.severity,
  status: 'reported',
  reportedAt: alert.timestamp,
  reportedBy: 'YOLO System',
  updates: []
});

const IncidentsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  
  const incidents = alerts.map(mapAlertToIncident);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorderIncident['status'] | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<BorderIncident['severity'] | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const handleCreateIncident = () => {
    navigate('/incidents/new');
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSeverityFilter('all');
  };
  
  const filteredIncidents = incidents.filter(incident => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    
    // Filter by severity
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });
  
  const sortedIncidents = [...filteredIncidents].sort((a, b) => 
    new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-2xl font-headline font-bold text-army-green-800 mb-4 md:mb-0">Border Incidents</h1>
            <button
              className="btn btn-primary flex items-center"
              onClick={handleCreateIncident}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Report New Incident
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-4 border-b">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="form-input pl-10"
                    placeholder="Search incidents..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>
                <button
                  className="btn btn-secondary flex items-center justify-center"
                  onClick={toggleFilters}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>
              
              {showFilters && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="statusFilter" className="form-label">Status</label>
                    <select
                      id="statusFilter"
                      className="form-input"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="reported">Reported</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="false-alarm">False Alarm</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="severityFilter" className="form-label">Severity</label>
                    <select
                      id="severityFilter"
                      className="form-input"
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as any)}
                    >
                      <option value="all">All Severities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      className="btn btn-secondary flex items-center"
                      onClick={resetFilters}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6">
              {sortedIncidents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedIncidents.map(incident => (
                    <IncidentCard key={incident.id} incident={incident} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto h-16 w-16 text-gray-400">
                    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-700">No incidents found</h3>
                  <p className="mt-1 text-gray-500">Try adjusting your search or filter criteria.</p>
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