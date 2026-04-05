import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import NewIncidentForm from '../components/incidents/NewIncidentForm';
import { useAuth } from '../contexts/AuthContext';
import { BorderIncident, GeoLocation } from '../types';
import { mockIncidents } from '../data/mockData';

interface NewIncidentFormData {
  title: string;
  description: string;
  location: GeoLocation;
  severity: BorderIncident['severity'];
  media?: { type: 'image' | 'video'; url: string; caption?: string }[];
}

const NewIncidentPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const handleBack = () => {
    navigate('/incidents');
  };
  
  const handleSubmit = async (formData: NewIncidentFormData) => {
    if (!user) return;
    
    setSubmitting(true);
    
    // Simulate API call to create a new incident
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, we would make an API call to create the incident in the database
      const newIncident: BorderIncident = {
        id: `i${mockIncidents.length + 1}`,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        severity: formData.severity,
        status: 'reported',
        reportedAt: new Date().toISOString(),
        reportedBy: user.id,
        media: formData.media?.map((media, index) => ({
          id: `m${Date.now() + index}`,
          type: media.type,
          url: media.url,
          caption: media.caption || undefined,
          timestamp: new Date().toISOString()
        })),
        updates: []
      };
      
      // Navigate to the incidents page with a success message
      navigate('/incidents', { state: { success: true, message: 'Incident reported successfully' } });
    } catch (error) {
      console.error('Error creating incident:', error);
      // In a real app, we would handle the error and show a message to the user
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