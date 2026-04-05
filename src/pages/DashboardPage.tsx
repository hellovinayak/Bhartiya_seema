import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, AlertTriangle, Map, Bell, UserPlus } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../contexts/AlertContext';
import AlertNotification from '../components/dashboard/AlertNotification';
import IncidentCard from '../components/dashboard/IncidentCard';
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

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { alerts, unreadCount, markAllAsRead } = useAlerts();
  const [nearbyAlerts, setNearbyAlerts] = useState<Alert[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<BorderIncident[]>([]);
  
  useEffect(() => {
    if (user) {
      // Show all recent live alerts
      setNearbyAlerts(alerts);
      
      // Map live alerts to incidents mapping for the rich card view
      setRecentIncidents(
        alerts.map(mapAlertToIncident)
      );
    }
  }, [user, alerts]);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          {/* Welcome Banner — base style */}
          <div className="bg-army-green-800 text-white rounded-lg shadow-army p-6 mb-6 border-l-4 border-saffron">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-army-gold text-xs font-semibold uppercase tracking-wider">Command Dashboard</span>
                <h1 className="text-2xl font-headline font-bold mt-1">Welcome, {user?.name.split(' ')[0]}</h1>
                <p className="text-army-khaki-200">{user?.rank}, {user?.unit}</p>
              </div>
              <div className="hidden sm:flex items-center justify-center h-14 w-14 rounded-full bg-army-green-900 border-2 border-army-gold/50">
                <Shield className="h-7 w-7 text-army-gold" />
              </div>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Live Mission Threats</p>
                  <p className="text-xl font-semibold">{alerts.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500 hidden md:block">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Map className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Active Sectors</p>
                  <p className="text-xl font-semibold">1</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <Bell className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">New Alerts</p>
                  <p className="text-xl font-semibold">{unreadCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Active Officers</p>
                  <p className="text-xl font-semibold">18</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Incidents */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3 flex justify-between items-center">
                  <h2 className="text-lg font-headline font-semibold">Recent Incidents</h2>
                  <a href="/incidents" className="text-army-green-600 text-sm hover:underline">View All</a>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentIncidents.map(incident => (
                    <IncidentCard key={incident.id} incident={incident} />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Alerts & Zones */}
            <div className="space-y-6">
              {/* Alerts */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3 flex justify-between items-center">
                  <h2 className="text-lg font-headline font-semibold">Live Detections Feed</h2>
                  {unreadCount > 0 && (
                    <button 
                      className="text-army-green-600 text-sm hover:underline"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark All Read
                    </button>
                  )}
                </div>
                <div className="p-4 max-h-[400px] overflow-y-auto">
                  {nearbyAlerts.length > 0 ? (
                    nearbyAlerts.map(alert => (
                      <AlertNotification key={alert.id} alert={alert} />
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No nearby alerts at this time</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Border Zones widget removed since map coords are no longer tracked for YOLO */}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DashboardPage;