import React from 'react';
import { Navigate } from 'react-router-dom';
import { Bell, CheckCircle } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import AlertNotification from '../components/dashboard/AlertNotification';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';

const AlertsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { alerts, markAllAsRead } = useAlerts();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  // Sort alerts by timestamp (newest first)
  const sortedAlerts = [...alerts].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  const unreadAlerts = sortedAlerts.filter(alert => !alert.read);
  const readAlerts = sortedAlerts.filter(alert => alert.read);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-headline font-bold text-army-green-800">
              <Bell className="h-6 w-6 inline-block mr-2" />
              Alerts & Notifications
            </h1>
            {unreadAlerts.length > 0 && (
              <button
                className="btn btn-secondary flex items-center"
                onClick={handleMarkAllAsRead}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark All as Read
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3">
                  <h2 className="text-lg font-headline font-semibold">
                    Unread Alerts
                    {unreadAlerts.length > 0 && (
                      <span className="ml-2 bg-army-red-100 text-army-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {unreadAlerts.length}
                      </span>
                    )}
                  </h2>
                </div>
                <div className="p-4">
                  {unreadAlerts.length > 0 ? (
                    unreadAlerts.map(alert => (
                      <AlertNotification key={alert.id} alert={alert} />
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
                      <p className="text-gray-500">You have no unread alerts at this time.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {readAlerts.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
                  <div className="border-b px-6 py-3">
                    <h2 className="text-lg font-headline font-semibold">Previously Read Alerts</h2>
                  </div>
                  <div className="p-4">
                    {readAlerts.map(alert => (
                      <AlertNotification key={alert.id} alert={alert} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3">
                  <h2 className="text-lg font-headline font-semibold">Alert Settings</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-gray-700">Push Notifications</span>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" defaultChecked />
                        <div className="block bg-gray-300 w-10 h-6 rounded-full"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-gray-700">Email Alerts</span>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" defaultChecked />
                        <div className="block bg-gray-300 w-10 h-6 rounded-full"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-gray-700">SMS Notifications</span>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" />
                        <div className="block bg-gray-300 w-10 h-6 rounded-full"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                      </div>
                    </label>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-3">Alert Radius</h3>
                    <p className="text-xs text-gray-500 mb-2">Distance from your location to receive alerts (kilometers)</p>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      defaultValue="50" 
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10km</span>
                      <span>50km</span>
                      <span>100km</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-3">Alert Types</h3>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox h-4 w-4 text-army-green-600" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Border Breaches</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox h-4 w-4 text-army-green-600" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Suspicious Activity</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox h-4 w-4 text-army-green-600" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Drone Sightings</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox h-4 w-4 text-army-green-600" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Infrastructure Damage</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox h-4 w-4 text-army-green-600" />
                        <span className="ml-2 text-sm text-gray-700">Weather Alerts</span>
                      </label>
                    </div>
                  </div>
                  
                  <button className="w-full btn btn-primary mt-4">
                    Save Preferences
                  </button>
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

export default AlertsPage;