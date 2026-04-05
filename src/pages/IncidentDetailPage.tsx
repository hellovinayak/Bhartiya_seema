import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import IncidentDetail from '../components/incidents/IncidentDetail';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';
import { BorderIncident, IncidentUpdate } from '../types';

const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { alerts, updateAlert } = useAlerts();
  const navigate = useNavigate();
  
  const [incident, setIncident] = useState<BorderIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    setLoading(true);
    const alert = alerts.find(a => a.id === id);
    
    if (alert) {
      const mappedIncident: BorderIncident = {
        id: alert.id,
        title: alert.title,
        description: alert.message,
        severity: alert.severity,
        status: (alert.status as BorderIncident['status']) || 'reported',
        reportedAt: alert.timestamp,
        reportedBy: 'YOLO System',
        location: alert.location || { lat: 34.0479, lng: 74.8103 },
        updates: alert.updates || []
      };
      setIncident(mappedIncident);
      setError(null);
    } else {
      if (alerts.length > 0) setError('Incident not found');
    }
    setLoading(false);
  }, [id, alerts]);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const handleBack = () => {
    navigate('/incidents');
  };
  
  const handleAddUpdate = async (content: string, status?: BorderIncident['status']) => {
    if (!incident || !user) return;
    
    // Create a new update
    const newUpdate: IncidentUpdate = {
      id: `up_${Date.now()}`,
      content,
      timestamp: new Date().toISOString(),
      updatedBy: user.id || "Dispatcher",
      status
    };
    
    const newStatus = status || incident.status;
    const newUpdates = [...incident.updates, newUpdate];
    
    // Optimistic update
    setIncident({
      ...incident,
      updates: newUpdates,
      status: newStatus
    });
    
    // Call Supabase API
    if (updateAlert) {
      await updateAlert(incident.id, newUpdates, newStatus);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-army-khaki-50 py-6 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-army-green-600"></div>
            <p className="mt-2 text-army-green-700">Loading incident details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (error || !incident) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-army-khaki-50 py-6">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-army-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-army-red-700 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error || 'Incident not found'}</p>
              <button 
                onClick={handleBack}
                className="btn btn-primary"
              >
                Return to Incidents
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-6">
            <button
              className="flex items-center text-army-green-700 hover:text-army-green-900 mr-4"
              onClick={handleBack}
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back to Incidents</span>
            </button>
            <h1 className="text-2xl font-headline font-bold text-army-green-800">Incident Details</h1>
          </div>
          
          <IncidentDetail incident={incident} onAddUpdate={handleAddUpdate} />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default IncidentDetailPage;