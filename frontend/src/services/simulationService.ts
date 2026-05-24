import { BorderIncident, DetectionLabel, DetectionType, GeoLocation } from '../types';

const detectionProfiles: Array<{
  label: DetectionLabel;
  type: DetectionType;
  title: string;
  severity: BorderIncident['severity'];
  zone: string;
}> = [
  { label: 'Person', type: 'person', title: 'Person detected near fence line', severity: 'high', zone: 'Northern Sector Alpha' },
  { label: 'Vehicle', type: 'vehicle', title: 'Vehicle detected on restricted track', severity: 'high', zone: 'Eastern Corridor Beta' },
  { label: 'Drone', type: 'drone', title: 'Drone detected in restricted airspace', severity: 'critical', zone: 'Western Checkpoint Gamma' },
  { label: 'Thermal Movement', type: 'thermal', title: 'Thermal movement detected after dark', severity: 'medium', zone: 'Northern Sector Alpha' },
  { label: 'Unknown Object', type: 'unknown', title: 'Unknown object detected by tower camera', severity: 'medium', zone: 'Eastern Corridor Beta' },
  { label: 'Border Breach', type: 'breach', title: 'Border breach pattern detected', severity: 'critical', zone: 'Western Checkpoint Gamma' },
];

const sectorAnchors: Record<string, GeoLocation> = {
  'Northern Sector Alpha': { lat: 32.9486, lng: 75.1042 },
  'Eastern Corridor Beta': { lat: 33.0855, lng: 74.7756 },
  'Western Checkpoint Gamma': { lat: 32.8486, lng: 74.8942 },
};

const jitter = (value: number, spread = 0.035) => value + (Math.random() - 0.5) * spread;

const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export const createSimulatedIncidentPayload = (source: BorderIncident['source'] = 'simulation'): Partial<BorderIncident> => {
  const profile = randomItem(detectionProfiles);
  const anchor = sectorAnchors[profile.zone];
  const confidence = Math.floor(68 + Math.random() * 30);
  const location = { lat: jitter(anchor.lat), lng: jitter(anchor.lng) };

  return {
    title: profile.title,
    description: `${profile.label} signature confirmed by ${source === 'yolo' ? 'YOLO camera analysis' : 'simulation engine'} with ${confidence}% confidence. Command review and patrol dispatch recommended.`,
    location,
    coordinates: location,
    severity: profile.severity,
    priority: profile.severity,
    status: 'reported',
    type: profile.type,
    objectType: profile.label,
    zone: profile.zone,
    aiConfidence: confidence,
    severityScore: Math.min(100, confidence + (profile.severity === 'critical' ? 10 : profile.severity === 'high' ? 5 : 0)),
    source,
    reportedBy: source === 'yolo' ? 'yolo-engine' : 'simulation-engine',
  };
};

export const playAlertTone = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, audio.currentTime);
    oscillator.frequency.setValueAtTime(520, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.36);
  } catch {
    // Browsers can block audio until user interaction; the visual alert still updates.
  }
};
