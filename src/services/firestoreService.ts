import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebase';
import {
  ActivityLog,
  Alert,
  BorderIncident,
  BorderZone,
  Camera,
  DetectionLabel,
  DetectionType,
  GeoLocation,
  OfficerResponse,
  User,
} from '../types';
import { mockBorderZones, mockIncidents, mockUsers } from '../data/mockData';

type CollectionName =
  | 'users'
  | 'incidents'
  | 'alerts'
  | 'sectors'
  | 'cameras'
  | 'activityLogs'
  | 'officerResponses';

interface OperationsState {
  users: User[];
  incidents: BorderIncident[];
  alerts: Alert[];
  sectors: BorderZone[];
  cameras: Camera[];
  activityLogs: ActivityLog[];
  officerResponses: OfficerResponse[];
}

const LOCAL_KEY = 'bs_firebase_fallback_state_v2';

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeLocation = (incident: BorderIncident): GeoLocation | undefined =>
  incident.coordinates || incident.location;

const isSurveillanceAlert = (alert: Alert) => {
  if (alert.source === 'yolo' || alert.source === 'camera') return true;
  const signature = `${alert.title} ${alert.message}`.toLowerCase();
  return signature.includes('yolo') || signature.includes('surveillance') || signature.includes('email alert dispatched');
};

const sanitizeOperationsState = (state: OperationsState): OperationsState => ({
  ...state,
  alerts: state.alerts.filter(isSurveillanceAlert),
});

const actorNameForSource = (source?: BorderIncident['source']) => {
  if (source === 'yolo') return 'YOLO Detection Engine';
  if (source === 'camera') return 'Surveillance Camera';
  if (source === 'manual') return 'Command Center';
  return 'System';
};

const seedCameras = (): Camera[] => [
  {
    id: 'cam_alpha_tower',
    name: 'Alpha Tower EO/IR',
    sectorId: 'z1',
    location: { lat: 32.9486, lng: 75.1042 },
    status: 'online',
    streamType: 'tower',
    lastPing: nowIso(),
  },
  {
    id: 'cam_beta_thermal',
    name: 'Beta Ridge Thermal',
    sectorId: 'z2',
    location: { lat: 33.0855, lng: 74.7756 },
    status: 'online',
    streamType: 'thermal',
    lastPing: nowIso(),
  },
  {
    id: 'cam_gamma_checkpoint',
    name: 'Gamma Checkpoint Gate',
    sectorId: 'z3',
    location: { lat: 32.8486, lng: 74.8942 },
    status: 'maintenance',
    streamType: 'webcam',
    lastPing: nowIso(),
  },
];

const seedState = (): OperationsState => {
  const incidents = mockIncidents.map((incident) => ({
    ...incident,
    coordinates: incident.location,
    priority: incident.severity,
    type: incident.title.toLowerCase().includes('drone') ? 'drone' as DetectionType : 'person' as DetectionType,
    objectType: incident.title.toLowerCase().includes('drone') ? 'Drone' as DetectionLabel : 'Person' as DetectionLabel,
    zone: incident.location?.lat && incident.location.lat > 33 ? 'Eastern Corridor Beta' : 'Northern Sector Alpha',
    aiConfidence: 82,
    severityScore: incident.severity === 'critical' ? 96 : incident.severity === 'high' ? 82 : 54,
    source: 'simulation' as const,
    createdAt: incident.reportedAt,
    updatedAt: incident.reportedAt,
  }));

  return {
    users: mockUsers.map((user, index) => ({
      ...user,
      online: index < 3,
      lastSeen: nowIso(),
    })),
    incidents,
    alerts: [],
    sectors: mockBorderZones,
    cameras: seedCameras(),
    activityLogs: [
      {
        id: 'log_boot',
        actorId: 'system',
        actorName: 'Simulation Engine',
        action: 'Command data initialized',
        targetType: 'system',
        timestamp: nowIso(),
      },
    ],
    officerResponses: [],
  };
};

const readLocalState = (): OperationsState => {
  if (typeof window === 'undefined') return seedState();

  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      const seeded = seedState();
      localStorage.setItem(LOCAL_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = { ...seedState(), ...JSON.parse(raw) };
    const sanitized = sanitizeOperationsState(parsed);
    if (sanitized.alerts.length !== parsed.alerts.length) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return seedState();
  }
};

let localState = readLocalState();
const subscribers: Record<CollectionName, Set<() => void>> = {
  users: new Set(),
  incidents: new Set(),
  alerts: new Set(),
  sectors: new Set(),
  cameras: new Set(),
  activityLogs: new Set(),
  officerResponses: new Set(),
};

const persist = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localState));
  }
};

const emit = (collectionName: CollectionName) => {
  subscribers[collectionName].forEach((callback) => callback());
};

const subscribeLocal = <T,>(
  collectionName: CollectionName,
  selector: () => T[],
  callback: (items: T[]) => void,
) => {
  callback(selector());
  const listener = () => callback(selector());
  subscribers[collectionName].add(listener);
  return () => subscribers[collectionName].delete(listener);
};

const mapDoc = <T extends { id: string }>(document: DocumentData): T => ({
  id: document.id,
  ...document.data(),
}) as T;

const withoutUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;

const omitId = <T extends { id: string }>(value: T) => {
  const copy = { ...value } as Record<string, unknown>;
  delete copy.id;
  return copy;
};

const subscribeFirestore = <T extends { id: string }>(
  collectionName: CollectionName,
  callback: (items: T[]) => void,
  onError?: (error: Error) => void,
  orderField = 'timestamp',
  maxItems = 100,
): Unsubscribe => {
  if (!db) return () => undefined;
  const ref = query(collection(db, collectionName), orderBy(orderField, 'desc'), limit(maxItems));
  return onSnapshot(ref, (snapshot) => callback(snapshot.docs.map((item) => mapDoc<T>(item))), onError);
};

const addActivityLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
  const payload: ActivityLog = {
    ...log,
    id: createId('log'),
    timestamp: nowIso(),
  };

  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'activityLogs'), withoutUndefined({
      actorId: payload.actorId,
      actorName: payload.actorName,
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
      timestamp: payload.timestamp,
      metadata: payload.metadata || {},
    }));
    return payload;
  }

  localState = {
    ...localState,
    activityLogs: [payload, ...localState.activityLogs].slice(0, 100),
  };
  persist();
  emit('activityLogs');
  return payload;
};

export const onUsers = (callback: (users: User[]) => void, onError?: (error: Error) => void) => {
  if (isFirebaseConfigured) return subscribeFirestore<User>('users', callback, onError, 'lastSeen');
  return subscribeLocal('users', () => localState.users, callback);
};

export const updateUserLocation = async (user: User, location: GeoLocation) => {
  const patch = {
    location,
    online: true,
    lastSeen: nowIso(),
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'users', user.id), withoutUndefined({
      ...omitId(user),
      ...patch,
    }), { merge: true });
    return;
  }

  const existing = localState.users.some((item) => item.id === user.id);
  localState = {
    ...localState,
    users: existing
      ? localState.users.map((item) => item.id === user.id ? { ...item, ...patch } : item)
      : [{ ...user, ...patch }, ...localState.users],
  };
  persist();
  emit('users');
};

export const onIncidents = (callback: (incidents: BorderIncident[]) => void, onError?: (error: Error) => void) => {
  if (isFirebaseConfigured) return subscribeFirestore<BorderIncident>('incidents', callback, onError, 'reportedAt');
  return subscribeLocal('incidents', () => [...localState.incidents].sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()), callback);
};

export const onAlerts = (callback: (alerts: Alert[]) => void, onError?: (error: Error) => void) => {
  if (isFirebaseConfigured) return subscribeFirestore<Alert>('alerts', callback, onError, 'timestamp');
  return subscribeLocal('alerts', () => [...localState.alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), callback);
};

export const onSectors = (callback: (sectors: BorderZone[]) => void, onError?: (error: Error) => void) => {
  if (isFirebaseConfigured) return subscribeFirestore<BorderZone>('sectors', callback, onError, 'name');
  return subscribeLocal('sectors', () => localState.sectors, callback);
};

export const onCameras = (callback: (cameras: Camera[]) => void, onError?: (error: Error) => void) => {
  if (isFirebaseConfigured) return subscribeFirestore<Camera>('cameras', callback, onError, 'lastPing');
  return subscribeLocal('cameras', () => localState.cameras, callback);
};

export const onActivityLogs = (callback: (logs: ActivityLog[]) => void, onError?: (error: Error) => void) => {
  if (isFirebaseConfigured) return subscribeFirestore<ActivityLog>('activityLogs', callback, onError, 'timestamp');
  return subscribeLocal('activityLogs', () => localState.activityLogs, callback);
};

export const createAlert = async (alertData: Omit<Alert, 'id' | 'timestamp' | 'read'> & Partial<Pick<Alert, 'timestamp' | 'read'>>) => {
  const payload: Alert = {
    ...alertData,
    id: createId('alert'),
    timestamp: alertData.timestamp || nowIso(),
    read: alertData.read ?? false,
  };

  if (isFirebaseConfigured && db) {
    const ref = await addDoc(collection(db, 'alerts'), withoutUndefined(omitId(payload)));
    return { ...payload, id: ref.id };
  }

  localState = {
    ...localState,
    alerts: [payload, ...localState.alerts],
  };
  persist();
  emit('alerts');
  return payload;
};

export const createIncident = async (incidentData: Partial<BorderIncident>) => {
  const timestamp = incidentData.reportedAt || nowIso();
  const location = incidentData.coordinates || incidentData.location || { lat: 32.9686, lng: 75.1142 };
  const severity = incidentData.severity || incidentData.priority || 'medium';
  const payload: BorderIncident = {
    id: createId('incident'),
    title: incidentData.title || 'Unverified Border Detection',
    description: incidentData.description || 'AI detection generated an incident requiring command review.',
    location,
    coordinates: location,
    severity,
    priority: severity,
    status: incidentData.status || 'reported',
    type: incidentData.type || 'unknown',
    objectType: incidentData.objectType || 'Unknown Object',
    zone: incidentData.zone || 'Northern Sector Alpha',
    aiConfidence: incidentData.aiConfidence ?? 78,
    severityScore: incidentData.severityScore ?? (severity === 'critical' ? 94 : severity === 'high' ? 78 : 46),
    source: incidentData.source || 'manual',
    reportedAt: timestamp,
    reportedBy: incidentData.reportedBy || 'command',
    assignedTo: incidentData.assignedTo,
    assignedOfficer: incidentData.assignedOfficer || incidentData.assignedTo,
    media: incidentData.media || [],
    updates: incidentData.updates || [],
    createdAt: incidentData.createdAt || timestamp,
    updatedAt: nowIso(),
  };

  if (isFirebaseConfigured && db) {
    const ref = await addDoc(collection(db, 'incidents'), withoutUndefined(omitId(payload)));
    const incident = { ...payload, id: ref.id };
    if (incident.source === 'yolo' || incident.source === 'camera') {
      await createAlert({
        incidentId: ref.id,
        title: incident.title,
        message: incident.description,
        severity: incident.severity,
        source: incident.source,
        location: incident.coordinates,
        objectType: incident.objectType,
        zone: incident.zone,
        confidence: incident.aiConfidence,
        status: incident.status,
      });
    }
    await addActivityLog({
      actorId: payload.reportedBy,
      actorName: actorNameForSource(payload.source),
      action: `Created ${payload.objectType} incident`,
      targetType: 'incident',
      targetId: ref.id,
      metadata: { severity: payload.severity, confidence: payload.aiConfidence },
    });
    return incident;
  }

  localState = {
    ...localState,
    incidents: [payload, ...localState.incidents],
  };
  persist();
  emit('incidents');
  if (payload.source === 'yolo' || payload.source === 'camera') {
    await createAlert({
      incidentId: payload.id,
      title: payload.title,
      message: payload.description,
      severity: payload.severity,
      source: payload.source,
      location: payload.coordinates,
      objectType: payload.objectType,
      zone: payload.zone,
      confidence: payload.aiConfidence,
      status: payload.status,
    });
  }
  await addActivityLog({
    actorId: payload.reportedBy,
    actorName: actorNameForSource(payload.source),
    action: `Created ${payload.objectType} incident`,
    targetType: 'incident',
    targetId: payload.id,
    metadata: { severity: payload.severity, confidence: payload.aiConfidence },
  });
  return payload;
};

export const updateIncident = async (id: string, updates: Partial<BorderIncident>) => {
  const patch = { ...updates, updatedAt: nowIso() };

  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'incidents', id), withoutUndefined(patch as unknown as Record<string, unknown>));
    await addActivityLog({
      actorId: patch.reportedBy || 'command',
      actorName: 'Command Center',
      action: `Updated incident status to ${patch.status || 'active'}`,
      targetType: 'incident',
      targetId: id,
      metadata: patch,
    });
    return;
  }

  localState = {
    ...localState,
    incidents: localState.incidents.map((incident) => incident.id === id ? { ...incident, ...patch } : incident),
    alerts: localState.alerts.map((alert) => alert.incidentId === id || alert.id === id ? { ...alert, status: patch.status || alert.status, updates: patch.updates || alert.updates } : alert),
  };
  persist();
  emit('incidents');
  emit('alerts');
  await addActivityLog({
    actorId: patch.reportedBy || 'command',
    actorName: 'Command Center',
    action: `Updated incident status to ${patch.status || 'active'}`,
    targetType: 'incident',
    targetId: id,
    metadata: patch,
  });
};

export const deleteIncident = async (id: string) => {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, 'incidents', id));
    await addActivityLog({
      actorId: 'command',
      actorName: 'Command Center',
      action: 'Deleted incident',
      targetType: 'incident',
      targetId: id,
    });
    return;
  }

  localState = {
    ...localState,
    incidents: localState.incidents.filter((incident) => incident.id !== id),
  };
  persist();
  emit('incidents');
};

export const markAlertRead = async (id: string, read = true) => {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'alerts', id), { read });
    return;
  }

  localState = {
    ...localState,
    alerts: localState.alerts.map((alert) => alert.id === id ? { ...alert, read } : alert),
  };
  persist();
  emit('alerts');
};

export const clearAllAlerts = async () => {
  if (isFirebaseConfigured && db) {
    const snapshot = await getDocs(collection(db, 'alerts'));
    await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
    return;
  }

  localState = {
    ...localState,
    alerts: [],
  };
  persist();
  emit('alerts');
};

export const addOfficerResponse = async (response: Omit<OfficerResponse, 'id' | 'timestamp'>) => {
  const payload: OfficerResponse = {
    ...response,
    id: createId('response'),
    timestamp: nowIso(),
  };

  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'officerResponses'), withoutUndefined(omitId(payload)));
    return payload;
  }

  localState = {
    ...localState,
    officerResponses: [payload, ...localState.officerResponses],
  };
  persist();
  emit('officerResponses');
  return payload;
};

export const getIncidentLocation = normalizeLocation;
