import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Alert, BorderIncident, User } from '../types';
import { mockIncidents } from '../data/mockData';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface AlertContextType {
  alerts: Alert[];
  unreadCount: number;
  markAsRead: (alertId: string) => void;
  markAllAsRead: () => void;
  getProximityAlerts: (user: User) => Alert[];
  getIncidentDetails: (incidentId: string) => BorderIncident | undefined;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  clearAlerts: () => Promise<void>;
  updateAlert: (id: string, updates: any[], status: string) => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  // Auth might not be present in admin dashboard, but context works

  // Fetch initial alerts from Supabase
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) {
        console.error('Error fetching alerts:', error);
      } else if (data) {
        const mappedAlerts: Alert[] = data.map((row: any) => ({
          id: row.id,
          incidentId: row.id,
          title: row.title,
          message: row.description,
          severity: row.priority as any || 'medium',
          timestamp: row.created_at,
          read: false,
          detected_class: row.detected_class,
          detected_count: row.detected_count,
          location: (row.lat && row.lng) ? { lat: row.lat, lng: row.lng } : undefined,
          status: row.status,
          updates: row.updates || []
        }));
        setAlerts(mappedAlerts);
      }
    };
    
    fetchAlerts();

    // Subscribe to realtime inserts
    const subscription = supabase
      .channel('public:alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, payload => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new;
          const newAlert: Alert = {
            id: row.id,
            incidentId: row.id,
            title: row.title,
            message: row.description,
            severity: row.priority as any || 'medium',
            timestamp: row.created_at,
            read: false,
            detected_class: row.detected_class,
            detected_count: row.detected_count,
            location: (row.lat && row.lng) ? { lat: row.lat, lng: row.lng } : undefined,
            status: row.status,
            updates: row.updates || []
          };
          // Overwrite or append
          setAlerts(prev => {
            const exists = prev.find(p => p.id === newAlert.id);
            if (exists) {
                return prev.map(p => p.id === newAlert.id ? newAlert : p);
            }
            return [newAlert, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new;
          setAlerts(prev => prev.map(alert => {
            if (alert.id === row.id) {
              return {
                ...alert,
                status: row.status,
                updates: row.updates || []
              };
            }
            return alert;
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const getProximityAlerts = (): Alert[] => {
    // Return all alerts since we removed geofencing requirements
    return alerts;
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;

  const markAsRead = (alertId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert => ({ ...alert, read: true }))
    );
  };

  const getIncidentDetails = (incidentId: string): BorderIncident | undefined => {
    return mockIncidents.find(incident => incident.id === incidentId);
  };

  const addAlert = async (alertData: Omit<Alert, 'id' | 'timestamp' | 'read'>) => {
    const { error } = await supabase.from('alerts').insert({
      title: alertData.title,
      description: alertData.message,
      priority: alertData.severity
    });
    if (error) {
      console.error('Error adding alert to supabase:', error);
    }
  };

  const clearAlerts = async () => {
    const { error } = await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) {
      setAlerts([]);
    } else {
      console.error('Error clearing alerts:', error);
    }
  };

  const updateAlert = async (id: string, updates: any[], status: string) => {
    const { error } = await supabase.from('alerts').update({
        updates: updates,
        status: status
    }).eq('id', id);
    
    if (error) {
        console.error('Failed to update alert:', error);
    }
  };

  return (
    <AlertContext.Provider value={{
      alerts,
      unreadCount,
      markAsRead,
      markAllAsRead,
      getProximityAlerts,
      getIncidentDetails,
      addAlert,
      clearAlerts,
      updateAlert
    }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};