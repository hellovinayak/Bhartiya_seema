export interface User {
  id: string;
  name: string;
  email: string;
  rank: string;
  unit: string;
  role: 'officer' | 'commander' | 'admin';
  location: GeoLocation;
  avatar?: string;
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
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'false-alarm';
  reportedAt: string;
  reportedBy: string;
  assignedTo?: string;
  media?: IncidentMedia[];
  updates: IncidentUpdate[];
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
}