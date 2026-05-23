import React, { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { divIcon, Icon } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '../../contexts/AlertContext';
import { BorderIncident, BorderZone } from '../../types';

Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  darkMode?: boolean;
  heatmapMode?: boolean;
  showPatrols?: boolean;
  followLatest?: boolean;
}

const severityColor = (severity: BorderIncident['severity']) => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#d97706';
    case 'low': return '#16a34a';
    default: return '#16a34a';
  }
};

const threatLevelColor = (threatLevel: BorderZone['threatLevel']) => {
  switch (threatLevel) {
    case 'normal': return '#16a34a';
    case 'elevated': return '#d97706';
    case 'high': return '#dc2626';
    default: return '#16a34a';
  }
};

const createIncidentIcon = (incident: BorderIncident) => divIcon({
  className: '',
  html: `
    <div style="position:relative;width:22px;height:22px;">
      <span style="position:absolute;inset:0;border-radius:9999px;background:${severityColor(incident.severity)}55;animation:bsPulse 1.5s infinite;"></span>
      <span style="position:absolute;left:5px;top:5px;width:12px;height:12px;border-radius:9999px;background:${severityColor(incident.severity)};border:2px solid white;box-shadow:0 0 12px ${severityColor(incident.severity)};"></span>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const createCameraIcon = (status: string) => divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:4px;background:${status === 'online' ? '#4d672a' : '#6b7280'};border:2px solid #C5A028;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const createOfficerIcon = (online?: boolean) => divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:${online ? '#2563eb' : '#64748b'};border:2px solid white;box-shadow:0 0 0 3px ${online ? '#93c5fd' : '#cbd5e1'};"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const latestPosition = (incidents: BorderIncident[]): [number, number] | null => {
  const incident = incidents.find((item) => item.coordinates || item.location);
  const location = incident?.coordinates || incident?.location;
  return location ? [location.lat, location.lng] : null;
};

const FlyToLatest: React.FC<{ incidents: BorderIncident[]; enabled: boolean }> = ({ incidents, enabled }) => {
  const map = useMap();
  useEffect(() => {
    const position = latestPosition(incidents);
    if (enabled && position) {
      map.flyTo(position, Math.max(map.getZoom(), 12), { duration: 0.9 });
    }
  }, [enabled, incidents, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ darkMode = false, heatmapMode = false, showPatrols = true, followLatest = false }) => {
  const navigate = useNavigate();
  const { incidents, sectors, cameras, officers } = useAlerts();
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (position) => setCurrentLocation([position.coords.latitude, position.coords.longitude]),
      () => setCurrentLocation(null),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.status !== 'resolved' && (incident.coordinates || incident.location)),
    [incidents],
  );

  const defaultPosition: [number, number] = latestPosition(activeIncidents) || [32.9486, 75.1042];

  return (
    <div className={`h-[68vh] min-h-[460px] border rounded-lg overflow-hidden shadow-md bg-army-green-900 ${darkMode ? 'map-dark' : ''}`}>
      <MapContainer center={defaultPosition} zoom={11} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToLatest incidents={activeIncidents} enabled={followLatest} />

        {sectors.map((zone) => {
          const center = zone.boundaries[0];
          const patrolPath = zone.boundaries.map((point) => [point.lat, point.lng] as [number, number]);
          return (
            <React.Fragment key={zone.id}>
              <Circle
                center={[center.lat, center.lng]}
                radius={2600}
                pathOptions={{ color: threatLevelColor(zone.threatLevel), fillColor: threatLevelColor(zone.threatLevel), fillOpacity: 0.16, weight: 2 }}
              >
                <Tooltip direction="top" opacity={0.9} permanent>
                  {zone.name} · {zone.threatLevel.toUpperCase()}
                </Tooltip>
              </Circle>
              {showPatrols && (
                <Polyline positions={[...patrolPath, patrolPath[0]]} pathOptions={{ color: '#C5A028', weight: 2, dashArray: '6 8' }} />
              )}
            </React.Fragment>
          );
        })}

        {heatmapMode && activeIncidents.map((incident) => {
          const location = incident.coordinates || incident.location!;
          return (
            <Circle
              key={`heat-${incident.id}`}
              center={[location.lat, location.lng]}
              radius={incident.severity === 'critical' ? 1800 : incident.severity === 'high' ? 1300 : 900}
              pathOptions={{ color: severityColor(incident.severity), fillColor: severityColor(incident.severity), fillOpacity: 0.18, weight: 0 }}
            />
          );
        })}

        {activeIncidents.map((incident) => {
          const location = incident.coordinates || incident.location!;
          return (
            <Marker key={incident.id} position={[location.lat, location.lng]} icon={createIncidentIcon(incident)}>
              <Popup>
                <div className="text-sm min-w-[220px] border-l-2 pl-3" style={{ borderColor: severityColor(incident.severity) }}>
                  <h3 className="font-semibold text-slate-900 mb-1">{incident.title}</h3>
                  <dl className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between"><dt>Object</dt><dd className="font-bold">{incident.objectType || incident.type}</dd></div>
                    <div className="flex justify-between"><dt>Priority</dt><dd className="font-bold capitalize">{incident.severity}</dd></div>
                    <div className="flex justify-between"><dt>Status</dt><dd className="font-bold capitalize">{incident.status}</dd></div>
                    <div className="flex justify-between"><dt>Zone</dt><dd className="font-bold">{incident.zone || 'Unassigned'}</dd></div>
                    <div className="flex justify-between"><dt>Confidence</dt><dd className="font-bold">{incident.aiConfidence || 0}%</dd></div>
                  </dl>
                  <p className="text-[10px] text-gray-500 mt-2">{new Date(incident.reportedAt).toLocaleString()}</p>
                  <button
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="mt-3 w-full text-[10px] font-bold uppercase tracking-wider bg-army-green-700 hover:bg-army-green-800 text-white py-1.5 px-3 rounded shadow"
                  >
                    Open Incident
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {cameras.map((camera) => (
          <Marker key={camera.id} position={[camera.location.lat, camera.location.lng]} icon={createCameraIcon(camera.status)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-army-green-800">{camera.name}</p>
                <p>Status: {camera.status}</p>
                <p>Mode: {camera.streamType}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {officers.map((officer) => (
          <Marker key={officer.id} position={[officer.location.lat, officer.location.lng]} icon={createOfficerIcon(officer.online)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{officer.name}</p>
                <p>{officer.rank}, {officer.unit}</p>
                <p>{officer.online ? 'Online' : 'Offline'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {currentLocation && (
          <Marker position={currentLocation}>
            <Popup>Your current location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
