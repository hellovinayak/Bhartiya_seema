import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import NewIncidentForm from '../components/incidents/NewIncidentForm';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';
import { BorderIncident, GeoLocation } from '../types';

interface NewIncidentFormData {
  title: string;
  description: string;
  location: GeoLocation;
  severity: BorderIncident['severity'];
  media?: { type: 'image' | 'video'; url: string; caption?: string }[];
}

const NewIncidentPage: React.FC = () => {
  const { user } = useAuth();
  const { createIncident } = useAlerts();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  
  const handleBack = () => {
    navigate('/incidents');
  };
  
  const handleSubmit = async (formData: NewIncidentFormData) => {
    if (!user) return;
    
    setSubmitting(true);
    
    // Simulate API call to create a new incident
    try {
      await createIncident({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        coordinates: formData.location,
        severity: formData.severity,
        priority: formData.severity,
        status: 'reported',
        reportedBy: user.id,
        objectType: 'Unknown Object',
        type: 'unknown',
        zone: 'Manual Report',
        source: 'manual',
        aiConfidence: 0,
        severityScore: formData.severity === 'critical' ? 95 : formData.severity === 'high' ? 78 : formData.severity === 'medium' ? 52 : 24,
        media: formData.media?.map((media, index) => ({
          id: `m${Date.now() + index}`,
          type: media.type,
          url: media.url,
          caption: media.caption || undefined,
          timestamp: new Date().toISOString()
        })),
        updates: []
      });
      
      navigate('/incidents', { state: { success: true, message: 'Incident reported successfully' } });
    } catch (error) {
      console.error('Error creating incident:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
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
            <h1 className="text-2xl font-headline font-bold text-army-green-800">Report New Incident</h1>
          </div>
          
          <NewIncidentForm 
            onSubmit={handleSubmit} 
            initialLocation={user?.location}
          />
          
          {submitting && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-army-green-600 mb-4"></div>
                <p className="text-gray-700">Submitting incident report...</p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default NewIncidentPage;
