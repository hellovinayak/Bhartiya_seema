export interface User {
  id: string;
  name: string;
  email: string;
  rank: string;
  unit: string;
  role: 'officer' | 'commander' | 'admin';
  location: GeoLocation;
  avatar?: string;
  online?: boolean;
  lastSeen?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface BorderIncident {
  id: string;
  title: string;
  description: string;
  location?: GeoLocation;
  coordinates?: GeoLocation;
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'false-alarm';
  type?: DetectionType;
  objectType?: DetectionLabel;
  zone?: string;
  aiConfidence?: number;
  severityScore?: number;
  source?: 'manual' | 'simulation' | 'yolo' | 'camera';
  reportedAt: string;
  reportedBy: string;
  assignedTo?: string;
  assignedOfficer?: string;
  media?: IncidentMedia[];
  updates: IncidentUpdate[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  timestamp: string;
}

export interface IncidentUpdate {
  id: string;
  content: string;
  status?: BorderIncident['status'];
  timestamp: string;
  updatedBy: string;
}

export interface BorderZone {
  id: string;
  name: string;
  threatLevel: 'normal' | 'elevated' | 'high';
  boundaries: GeoLocation[];
  responsibleUnit: string;
}

export interface Alert {
  id: string;
  incidentId?: string;
  title: string;
  message: string;
  severity: BorderIncident['severity'];
  timestamp: string;
  read: boolean;
  location?: GeoLocation;
  detected_class?: string;
  detected_count?: number;
  status?: string;
  updates?: IncidentUpdate[];
  objectType?: DetectionLabel;
  zone?: string;
  confidence?: number;
}

export type DetectionType =
  | 'person'
  | 'vehicle'
  | 'drone'
  | 'thermal'
  | 'unknown'
  | 'breach';

export type DetectionLabel =
  | 'Person'
  | 'Vehicle'
  | 'Car'
  | 'Bike'
  | 'Drone'
  | 'Animal'
  | 'Thermal Movement'
  | 'Unknown Object'
  | 'Border Breach';

export interface Camera {
  id: string;
  name: string;
  sectorId: string;
  location: GeoLocation;
  status: 'online' | 'offline' | 'maintenance';
  streamType: 'webcam' | 'tower' | 'thermal' | 'drone';
  lastPing: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: 'incident' | 'alert' | 'sector' | 'camera' | 'auth' | 'system';
  targetId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface OfficerResponse {
  id: string;
  incidentId: string;
  officerId: string;
  officerName: string;
  status: 'assigned' | 'en-route' | 'on-site' | 'resolved';
  message: string;
  timestamp: string;
}

export interface DetectionLog {
  id: string;
  label: DetectionLabel;
  confidence: number;
  timestamp: string;
  cameraId?: string;
  location?: GeoLocation;
  bbox?: [number, number, number, number];
}
