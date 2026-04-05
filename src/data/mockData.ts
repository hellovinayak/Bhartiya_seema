import { User, BorderIncident, BorderZone, Alert } from '../types';
import { format, subHours, subDays } from 'date-fns';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Colonel manish Kumar',
    email: 'manish.kumar@example.com',
    rank: 'Colonel',
    unit: '7th Infantry Division',
    role: 'commander',
    location: { lat: 32.7177, lng: 74.8573 }, // Near Jammu
    avatar: 'https://images.pexels.com/photos/7148384/pexels-photo-7148384.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
  },
  {
    id: 'u2',
    name: 'vinayak rathod',
    email: 'vinayk.rathod@example.com',
    rank: 'Captain',
    unit: 'Border Security Force',
    role: 'officer',
    location: { lat: 32.9686, lng: 75.1142 }, // Near border
   // avatar: 'https://images.pexels.com/photos/5905445/pexels-photo-5905445.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
  },
  {
    id: 'u3',
    name: 'Major Vikram Batra',
    email: 'vikram.batra@example.com',
    rank: 'Major',
    unit: 'Special Forces',
    role: 'officer',
    location: { lat: 33.1055, lng: 74.6556 }, // Another border point
    avatar: 'https://images.pexels.com/photos/4823233/pexels-photo-4823233.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
  },
  {
    id: 'u4',
    name: 'Lt. General Sunita Devi',
    email: 'sunita.devi@example.com',
    rank: 'Lieutenant General',
    unit: 'Northern Command',
    role: 'admin',
    location: { lat: 28.6139, lng: 77.2090 }, // Delhi HQ
    avatar: 'https://images.pexels.com/photos/6499022/pexels-photo-6499022.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
  }
];

// Mock Border Incidents
export const mockIncidents: BorderIncident[] = [
  {
    id: 'i1',
    title: 'Suspicious Movement',
    description: 'Multiple individuals spotted moving near the border fence with unknown equipment.',
    location: { lat: 32.9686, lng: 75.1242 },
    severity: 'medium',
    status: 'investigating',
    reportedAt: format(subHours(new Date(), 2), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    reportedBy: 'u2',
    assignedTo: 'u2',
    media: [
      {
        id: 'm1',
        type: 'image',
        url: 'https://images.pexels.com/photos/7045418/pexels-photo-7045418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
        caption: 'Footprints near fence',
        timestamp: format(subHours(new Date(), 2), 'yyyy-MM-dd\'T\'HH:mm:ss')
      }
    ],
    updates: [
      {
        id: 'up1',
        content: 'Investigating the area with a team of 4 officers.',
        timestamp: format(subHours(new Date(), 1), 'yyyy-MM-dd\'T\'HH:mm:ss'),
        updatedBy: 'u2'
      }
    ]
  },
  {
    id: 'i2',
    title: 'Border Fence Damage',
    description: 'Section of border fence found damaged, possibly cut with tools.',
    location: { lat: 33.0055, lng: 74.7556 },
    severity: 'high',
    status: 'reported',
    reportedAt: format(subHours(new Date(), 12), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    reportedBy: 'u3',
    media: [
      {
        id: 'm2',
        type: 'image',
        url: 'https://images.pexels.com/photos/113338/pexels-photo-113338.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
        caption: 'Damaged fence section',
        timestamp: format(subHours(new Date(), 12), 'yyyy-MM-dd\'T\'HH:mm:ss')
      }
    ],
    updates: []
  },
  {
    id: 'i3',
    title: 'Unauthorized Drone Activity',
    description: 'Unidentified drone spotted flying over border area at low altitude.',
    location: { lat: 32.8686, lng: 74.9142 },
    severity: 'critical',
    status: 'resolved',
    reportedAt: format(subDays(new Date(), 1), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    reportedBy: 'u2',
    assignedTo: 'u3',
    media: [
      {
        id: 'm3',
        type: 'video',
        url: 'https://player.vimeo.com/video/517069942',
        caption: 'Drone footage',
        timestamp: format(subDays(new Date(), 1), 'yyyy-MM-dd\'T\'HH:mm:ss')
      }
    ],
    updates: [
      {
        id: 'up2',
        content: 'Drone was intercepted and brought down. Found to be a civilian drone that drifted from nearby village.',
        status: 'resolved',
        timestamp: format(subHours(new Date(), 18), 'yyyy-MM-dd\'T\'HH:mm:ss'),
        updatedBy: 'u3'
      }
    ]
  }
];

// Mock Border Zones
export const mockBorderZones: BorderZone[] = [
  {
    id: 'z1',
    name: 'Northern Sector Alpha',
    threatLevel: 'elevated',
    boundaries: [
      { lat: 32.9186, lng: 75.0742 },
      { lat: 32.9486, lng: 75.1542 },
      { lat: 32.9786, lng: 75.1342 },
      { lat: 32.9486, lng: 75.0542 }
    ],
    responsibleUnit: '7th Infantry Division'
  },
  {
    id: 'z2',
    name: 'Eastern Corridor Beta',
    threatLevel: 'high',
    boundaries: [
      { lat: 33.0555, lng: 74.7056 },
      { lat: 33.0855, lng: 74.8056 },
      { lat: 33.1155, lng: 74.7856 },
      { lat: 33.0855, lng: 74.7056 }
    ],
    responsibleUnit: 'Special Forces'
  },
  {
    id: 'z3',
    name: 'Western Checkpoint Gamma',
    threatLevel: 'normal',
    boundaries: [
      { lat: 32.8186, lng: 74.8642 },
      { lat: 32.8486, lng: 74.9442 },
      { lat: 32.8786, lng: 74.9242 },
      { lat: 32.8486, lng: 74.8442 }
    ],
    responsibleUnit: 'Border Security Force'
  }
];

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: 'a1',
    incidentId: 'i1',
    title: 'New Incident: Suspicious Movement',
    message: 'Suspicious activity reported near Northern Sector Alpha. Please investigate immediately.',
    severity: 'medium',
    timestamp: format(subHours(new Date(), 2), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    read: false,
    location: { lat: 32.9686, lng: 75.1242 }
  },
  {
    id: 'a2',
    incidentId: 'i2',
    title: 'High Priority: Border Fence Damage',
    message: 'Border fence damage detected. Potential security breach. Immediate action required.',
    severity: 'high',
    timestamp: format(subHours(new Date(), 12), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    read: true,
    location: { lat: 33.0055, lng: 74.7556 }
  },
  {
    id: 'a3',
    incidentId: 'i3',
    title: 'Critical Alert: Unauthorized Drone',
    message: 'Unidentified drone in restricted airspace. All units respond.',
    severity: 'critical',
    timestamp: format(subDays(new Date(), 1), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    read: true,
    location: { lat: 32.8686, lng: 74.9142 }
  }
];

// Current logged in user for demo purposes
export const currentUser = mockUsers[1]; // Captain Arjun Singh
