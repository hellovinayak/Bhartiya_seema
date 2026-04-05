import React from 'react';
import { Navigate } from 'react-router-dom';
import { Layers, MapPin } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import MapView from '../components/map/MapView';
import { useAuth } from '../contexts/AuthContext';
import { mockBorderZones } from '../data/mockData';

const MapPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-headline font-bold text-army-green-800">Border Map</h1>
            <div className="flex space-x-2">
              <button className="btn btn-secondary flex items-center">
                <Layers className="h-4 w-4 mr-1" />
                <span>Layers</span>
              </button>
              <button className="btn btn-primary flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Current Location</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <MapView />
            </div>
            
            <div>
              <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-20">
                <div className="border-b px-4 py-3">
                  <h2 className="text-lg font-headline font-semibold">Border Zones</h2>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    {mockBorderZones.map(zone => (
                      <li key={zone.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <p className="font-medium text-army-green-800 flex items-center">
                          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                            zone.threatLevel === 'normal' ? 'bg-green-500' : 
                            zone.threatLevel === 'elevated' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></span>
                          {zone.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Threat Level: <span className="font-medium capitalize">{zone.threatLevel}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Unit: <span className="font-medium">{zone.responsibleUnit}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-50 px-4 py-3 text-xs text-gray-600">
                  <p className="mb-1">Map Legend:</p>
                  <ul className="space-y-1">
                    <li className="flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      Normal Threat Level
                    </li>
                    <li className="flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                      Elevated Threat Level
                    </li>
                    <li className="flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                      High Threat Level
                    </li>
                  </ul>
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

export default MapPage;