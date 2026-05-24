import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityLog, Alert, BorderIncident, BorderZone, Camera, User } from '../types';
import {
  addOfficerResponse,
  clearAllAlerts,
  createAlert,
  createIncident,
  deleteIncident,
  markAlertRead,
  onActivityLogs,
  onAlerts,
  onCameras,
  onIncidents,
  onSectors,
  onUsers,
  updateIncident,
  updateUserLocation,
} from '../services/firestoreService';
import { playAlertTone } from '../services/simulationService';

interface AlertContextType {
  alerts: Alert[];
  incidents: BorderIncident[];
  sectors: BorderZone[];
  cameras: Camera[];
  officers: User[];
  activityLogs: ActivityLog[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  soundEnabled: boolean;
  markAsRead: (alertId: string) => void;
  markAllAsRead: () => void;
  getProximityAlerts: (user: User) => Alert[];
  getIncidentDetails: (incidentId: string) => BorderIncident | undefined;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  clearAlerts: () => Promise<void>;
  updateAlert: (id: string, updates: any[], status: string) => Promise<void>;
  createIncident: (incident: Partial<BorderIncident>) => Promise<BorderIncident>;
  updateIncident: (id: string, updates: Partial<BorderIncident>) => Promise<void>;
  updateUserLocation: typeof updateUserLocation;
  deleteIncident: (id: string) => Promise<void>;
  addOfficerResponse: typeof addOfficerResponse;
  retry: () => void;
  toggleSound: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<BorderIncident[]>([]);
  const [sectors, setSectors] = useState<BorderZone[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastAlertId = useRef<string | null>(null);

  const isSurveillanceAlert = (alert: Alert) =>
    alert.source === 'yolo' ||
    alert.source === 'camera' ||
    `${alert.title} ${alert.message}`.toLowerCase().includes('yolo');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const handleError = (err: Error) => {
      setError(err.message);
      setLoading(false);
    };

    const unsubscribers = [
      onAlerts((items) => {
        setAlerts(items.filter(isSurveillanceAlert));
        setLoading(false);
      }, handleError),
      onIncidents(setIncidents, handleError),
      onSectors(setSectors, handleError),
      onCameras(setCameras, handleError),
      onUsers(setOfficers, handleError),
      onActivityLogs(setActivityLogs, handleError),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [reloadToken]);

  useEffect(() => {
    const newest = alerts[0];
    if (!newest || newest.id === lastAlertId.current) return;
    lastAlertId.current = newest.id;
    if (soundEnabled && !newest.read) playAlertTone();
  }, [alerts, soundEnabled]);

  const unreadCount = alerts.filter((alert) => !alert.read).length;

  const markAsRead = (alertId: string) => {
    markAlertRead(alertId).catch((err) => setError(err.message));
  };

  const markAllAsRead = () => {
    Promise.all(alerts.map((alert) => markAlertRead(alert.id))).catch((err) => setError(err.message));
  };

  const getProximityAlerts = (_user: User) => alerts;

  const getIncidentDetails = (incidentId: string) =>
    incidents.find((incident) => incident.id === incidentId || incident.id === alerts.find((alert) => alert.id === incidentId)?.incidentId);

  const value = useMemo<AlertContextType>(() => ({
    alerts,
    incidents,
    sectors,
    cameras,
    officers,
    activityLogs,
    unreadCount,
    loading,
    error,
    soundEnabled,
    markAsRead,
    markAllAsRead,
    getProximityAlerts,
    getIncidentDetails,
    addAlert: async (alert) => {
      await createAlert(alert);
    },
    clearAlerts: clearAllAlerts,
    updateAlert: async (id, updates, status) => {
      await updateIncident(id, { updates, status: status as BorderIncident['status'] });
    },
    createIncident,
    updateIncident,
    updateUserLocation,
    deleteIncident,
    addOfficerResponse,
    retry: () => setReloadToken((token) => token + 1),
    toggleSound: () => setSoundEnabled((enabled) => !enabled),
  }), [activityLogs, alerts, cameras, error, incidents, loading, officers, sectors, soundEnabled, unreadCount]);

  return (
    <AlertContext.Provider value={value}>
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
