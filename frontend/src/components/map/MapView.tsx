import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Polygon, Popup, useMap } from 'react-leaflet';
import { divIcon, Icon } from 'leaflet';
import { useAlerts } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { BorderIncident, BorderZone } from '../../types';

// Fixing default icon issues in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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
  liveGpsEnabled?: boolean;
  followGps?: boolean;
  onGpsUpdate?: (gps: LiveGpsState) => void;
}

export interface LiveGpsPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: string;
}

export interface LiveGpsState {
  status: 'idle' | 'locating' | 'active' | 'blocked' | 'unavailable';
  position: LiveGpsPosition | null;
  error: string | null;
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

// ── Custom Leaflet divIcons as Premium SVG Indicators ─────────────────────────
const createCameraIcon = (status: string) => divIcon({
  className: '',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${status === 'online' ? '#065F46' : '#1E293B'}" stroke="${status === 'online' ? '#10B981' : '#94A3B8'}" stroke-width="2" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
      <circle cx="12" cy="12" r="4" fill="${status === 'online' ? '#34D399' : '#64748B'}" />
    </svg>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const createIncidentIcon = (incident: BorderIncident) => divIcon({
  className: '',
  html: `
    <div style="position:relative; width:34px; height:34px;">
      <span style="position:absolute; inset:0; border-radius:9999px; background:${severityColor(incident.severity)}44; border: 1px dashed ${severityColor(incident.severity)}; animation: bsPulse 1.5s infinite;"></span>
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="${severityColor(incident.severity)}22" stroke="${severityColor(incident.severity)}" stroke-width="2.5" style="position:absolute; left:6px; top:6px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" stroke-width="2.5" stroke-linecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="3" stroke-linecap="round" />
      </svg>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const createOfficerIcon = (online?: boolean) => divIcon({
  className: '',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="${online ? '#1E3A8A' : '#1E293B'}" stroke="${online ? '#3B82F6' : '#64748B'}" stroke-width="2" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      <circle cx="12" cy="12" r="3" fill="${online ? '#60A5FA' : '#94A3B8'}" />
    </svg>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const createLivePingIcon = () => divIcon({
  className: '',
  html: `
    <div style="position:relative; width:44px; height:44px;">
      <span style="position:absolute; inset:0; border-radius:9999px; background:#FF005533; border: 2px dashed #FF0055; animation: bsPulse 2s infinite;"></span>
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF0055" stroke-width="2.5" style="position:absolute; left:9px; top:9px; filter: drop-shadow(0 0 8px #FF0055);">
        <circle cx="12" cy="12" r="10" stroke-dasharray="3 3" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" fill="#FF0055" />
      </svg>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const createGpsIcon = () => divIcon({
  className: '',
  html: `
    <div style="position:relative; width:42px; height:42px;">
      <span style="position:absolute; inset:0; border-radius:9999px; background:#2563eb33; border:2px solid #60a5fa; animation: bsPulse 1.7s infinite;"></span>
      <span style="position:absolute; left:10px; top:10px; width:22px; height:22px; border-radius:9999px; background:#1d4ed8; border:4px solid #bfdbfe; box-shadow:0 0 0 2px #1e3a8a, 0 0 18px rgba(37,99,235,0.75);"></span>
      <span style="position:absolute; left:17px; top:17px; width:8px; height:8px; border-radius:9999px; background:#eff6ff;"></span>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

const latestPosition = (incidents: BorderIncident[]): [number, number] | null => {
  const incident = incidents.find((item) => item.coordinates || item.location);
  const location = incident?.coordinates || incident?.location;
  return location ? [location.lat, location.lng] : null;
};

// ── Leaflet Controllers for WebSocket and FlyTo ──────────────────────────────
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

const WebSocketMapController: React.FC<{ latestPing: { lat: number; lng: number } | null }> = ({ latestPing }) => {
  const map = useMap();
  useEffect(() => {
    if (latestPing) {
      map.setView([latestPing.lat, latestPing.lng], 13, { animate: true });
    }
  }, [latestPing, map]);
  return null;
};

const GpsMapController: React.FC<{ gps: LiveGpsPosition | null; enabled: boolean }> = ({ gps, enabled }) => {
  const map = useMap();
  useEffect(() => {
    if (enabled && gps) {
      map.flyTo([gps.lat, gps.lng], Math.max(map.getZoom(), 15), { duration: 0.9 });
    }
  }, [enabled, gps, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ 
  darkMode = false, 
  heatmapMode = false, 
  showPatrols = true, 
  followLatest = false,
  liveGpsEnabled = false,
  followGps = false,
  onGpsUpdate,
}) => {
  const navigate = useNavigate();
  const { incidents, sectors, cameras, officers, updateUserLocation } = useAlerts();
  const { user } = useAuth();

  const [mapSatellite, setMapSatellite] = useState<boolean>(true); // ESRI Satellite as default
  const [gpsState, setGpsState] = useState<LiveGpsState>({
    status: liveGpsEnabled ? 'locating' : 'idle',
    position: null,
    error: null,
  });
  const lastGpsPublishAt = useRef(0);
  
  // Real-time YOLOv8 active websocket detection pings
  const [livePings, setLivePings] = useState<Array<{
    id: string;
    lat: number;
    lng: number;
    predictions: any[];
    timestamp: string;
  }>>([]);

  const latestPing = useMemo(() => (livePings.length > 0 ? livePings[0] : null), [livePings]);

  // 1. Geolocation Watch
  useEffect(() => {
    if (!liveGpsEnabled) {
      setGpsState((prev) => ({ ...prev, status: 'idle', error: null }));
      return undefined;
    }

    if (!navigator.geolocation) {
      setGpsState({ status: 'unavailable', position: null, error: 'GPS is not available in this browser.' });
      return undefined;
    }

    setGpsState((prev) => ({ ...prev, status: 'locating', error: null }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsState({
          status: 'active',
          error: null,
          position: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
            altitude: position.coords.altitude ?? null,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
            timestamp: new Date(position.timestamp).toISOString(),
          },
        });
      },
      (error) => {
        const blocked = error.code === error.PERMISSION_DENIED;
        setGpsState((prev) => ({
          status: blocked ? 'blocked' : 'unavailable',
          position: prev.position,
          error: blocked ? 'GPS permission blocked.' : error.message,
        }));
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [liveGpsEnabled]);

  useEffect(() => {
    onGpsUpdate?.(gpsState);
  }, [gpsState, onGpsUpdate]);

  useEffect(() => {
    if (!liveGpsEnabled || gpsState.status !== 'active' || !gpsState.position || !user) return;

    const now = Date.now();
    if (now - lastGpsPublishAt.current < 5000) return;
    lastGpsPublishAt.current = now;

    updateUserLocation(user, {
      lat: gpsState.position.lat,
      lng: gpsState.position.lng,
    }).catch((err) => {
      console.error('Failed to publish GPS location:', err);
    });
  }, [gpsState.position, gpsState.status, liveGpsEnabled, updateUserLocation, user]);

  // 2. WebSockets Real-time YOLOv8 Listener
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    let ws: WebSocket;

    const connectWS = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'detection' && data.location?.lat && data.location?.lng) {
            const newPing = {
              id: `ping-${Date.now()}-${Math.random()}`,
              lat: data.location.lat,
              lng: data.location.lng,
              predictions: data.predictions,
              timestamp: data.timestamp,
            };

            setLivePings((prev) => [newPing, ...prev.slice(0, 10)]);
          }
        } catch (err) {
          console.error("Failed to parse websocket detection package:", err);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.status !== 'resolved' && (incident.coordinates || incident.location)),
    [incidents],
  );

  const defaultPosition: [number, number] = useMemo(() => {
    const pos = latestPosition(activeIncidents) || [32.9486, 75.1042];
    return pos;
  }, [activeIncidents]);

  const gpsStatusLabel = useMemo(() => {
    if (gpsState.status === 'active') return 'GPS LIVE';
    if (gpsState.status === 'locating') return 'LOCATING GPS';
    if (gpsState.status === 'blocked') return 'GPS BLOCKED';
    if (gpsState.status === 'unavailable') return 'GPS UNAVAILABLE';
    return 'GPS STANDBY';
  }, [gpsState.status]);

  return (
    <div className="h-[68vh] min-h-[460px] border rounded-lg overflow-hidden shadow-md bg-slate-900 border-slate-800 relative">
      
      {/* Visual Mode Overlay Control */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-950/80 backdrop-blur border border-slate-800 p-1.5 rounded-lg flex gap-1 shadow-lg">
        <button
          onClick={() => setMapSatellite(false)}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${!mapSatellite ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          Vector Map
        </button>
        <button
          onClick={() => setMapSatellite(true)}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${mapSatellite ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          Satellite Feed
        </button>
      </div>

      {/* Live GPS telemetry overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] w-[min(20rem,calc(100%-2rem))] rounded-lg border border-slate-700 bg-slate-950/85 p-3 text-white shadow-xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${
              gpsState.status === 'active' ? 'bg-blue-400 shadow-[0_0_12px_#60a5fa]' :
              gpsState.status === 'locating' ? 'bg-amber-400 animate-pulse' :
              gpsState.status === 'idle' ? 'bg-slate-500' : 'bg-rose-500'
            }`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">{gpsStatusLabel}</span>
          </div>
          {gpsState.position && (
            <span className="text-[10px] font-mono text-slate-300">
              {new Date(gpsState.position.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        {gpsState.position ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-200">
            <div>
              <span className="block text-slate-400">LAT</span>
              <strong>{gpsState.position.lat.toFixed(6)}</strong>
            </div>
            <div>
              <span className="block text-slate-400">LNG</span>
              <strong>{gpsState.position.lng.toFixed(6)}</strong>
            </div>
            <div>
              <span className="block text-slate-400">ACCURACY</span>
              <strong>{gpsState.position.accuracy ? `${Math.round(gpsState.position.accuracy)} m` : 'N/A'}</strong>
            </div>
            <div>
              <span className="block text-slate-400">SPEED</span>
              <strong>{gpsState.position.speed ? `${(gpsState.position.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}</strong>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[10px] font-mono text-slate-300">{gpsState.error || 'Waiting for live coordinate lock.'}</p>
        )}
      </div>

      <MapContainer 
        center={defaultPosition} 
        zoom={11} 
        className={`h-full w-full ${darkMode ? 'map-dark' : ''}`}
      >
        {mapSatellite ? (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        <FlyToLatest incidents={activeIncidents} enabled={followLatest} />
        <WebSocketMapController latestPing={latestPing} />
        <GpsMapController gps={gpsState.position} enabled={followGps} />

        {/* Sectors and zero-tolerance restricted perimeter polygons */}
        {sectors.map((zone) => {
          const center = zone.boundaries[0];
          const path = zone.boundaries.map((point) => [point.lat, point.lng] as [number, number]);
          const color = threatLevelColor(zone.threatLevel);

          return (
            <React.Fragment key={zone.id}>
              {/* Perimeter Circle representing active surveillance coverages */}
              <Circle
                center={[center.lat, center.lng]}
                radius={2600}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.08,
                  weight: 1.5,
                }}
              />
              {/* Restricted perimeter polygon lines */}
              {showPatrols && path.length > 1 && (
                <Polygon
                  positions={path}
                  pathOptions={{
                    color: '#C5A028',
                    fillColor: '#C5A028',
                    fillOpacity: 0.02,
                    weight: 2,
                    dashArray: '6 8',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Tactical Heatmaps Layer */}
        {heatmapMode && activeIncidents.map((incident) => {
          const location = incident.coordinates || incident.location!;
          return (
            <Circle
              key={`heat-${incident.id}`}
              center={[location.lat, location.lng]}
              radius={incident.severity === 'critical' ? 2400 : incident.severity === 'high' ? 1600 : 800}
              pathOptions={{
                color: severityColor(incident.severity),
                fillColor: severityColor(incident.severity),
                fillOpacity: 0.18,
                weight: 0
              }}
            />
          );
        })}

        {/* Camera markers */}
        {cameras.map((camera) => (
          <Marker 
            key={camera.id} 
            position={[camera.location.lat, camera.location.lng]} 
            icon={createCameraIcon(camera.status)}
          >
            <Popup>
              <div className="text-slate-800 text-xs p-1 font-sans min-w-[180px]">
                <p className="font-bold text-sm text-emerald-700 uppercase tracking-wide border-b pb-1 mb-1">{camera.name}</p>
                <p className="font-mono mt-1 flex justify-between"><span>Status:</span> <span className="font-bold uppercase text-emerald-600">{camera.status}</span></p>
                <p className="font-mono flex justify-between"><span>Mode:</span> <span className="font-bold">{camera.streamType}</span></p>
                <p className="font-mono flex justify-between"><span>Sectors:</span> <span className="font-bold">{camera.sectorId}</span></p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Incident markers */}
        {activeIncidents.map((incident) => {
          const location = incident.coordinates || incident.location!;
          return (
            <Marker 
              key={incident.id} 
              position={[location.lat, location.lng]} 
              icon={createIncidentIcon(incident)}
            >
              <Popup>
                <div className="text-slate-800 text-xs p-1 font-sans min-w-[200px]">
                  <p className="font-bold text-sm text-rose-700 uppercase tracking-wide border-b pb-1 mb-1">{incident.title}</p>
                  <dl className="space-y-1 font-mono text-[10px] mt-1">
                    <div className="flex justify-between"><dt className="text-slate-500">Object</dt><dd className="font-bold text-slate-800">{incident.objectType || incident.type}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Threat Level</dt><dd className="font-bold text-rose-600 capitalize">{incident.severity}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Confidence</dt><dd className="font-bold">{incident.aiConfidence || 0}%</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-bold capitalize">{incident.status}</dd></div>
                  </dl>
                  <button
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="mt-2.5 w-full text-[9px] font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-3 rounded shadow transition-colors duration-200"
                  >
                    Manage Threat Console
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active field patrol officer markers */}
        {officers.map((officer) => (
          <Marker 
            key={officer.id} 
            position={[officer.location.lat, officer.location.lng]} 
            icon={createOfficerIcon(officer.online)}
          >
            <Popup>
              <div className="text-slate-800 text-xs p-1 font-sans min-w-[180px]">
                <p className="font-bold text-sm text-blue-700 uppercase tracking-wide border-b pb-1 mb-1">{officer.name}</p>
                <p className="font-mono mt-1">Rank: <strong>{officer.rank}</strong></p>
                <p className="font-mono">Unit: <strong>{officer.unit}</strong></p>
                <p className="font-mono flex justify-between"><span>Status:</span> <span className={`font-bold ${officer.online ? 'text-blue-600' : 'text-slate-500'}`}>{officer.online ? 'ON TACTICAL FIELD' : 'OFF DUTY'}</span></p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Current device GPS marker */}
        {gpsState.position && (
          <>
          {gpsState.position.accuracy && (
            <Circle
              center={[gpsState.position.lat, gpsState.position.lng]}
              radius={gpsState.position.accuracy}
              pathOptions={{
                color: '#60a5fa',
                fillColor: '#2563eb',
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
          )}
          <Marker position={[gpsState.position.lat, gpsState.position.lng]} icon={createGpsIcon()}>
            <Popup>
              <div className="text-slate-800 text-xs font-mono p-1 min-w-[190px]">
                <strong className="text-blue-700 uppercase">Live GPS Coordinate</strong><br/>
                Lat: {gpsState.position.lat.toFixed(6)}<br/>
                Lng: {gpsState.position.lng.toFixed(6)}<br/>
                Accuracy: {gpsState.position.accuracy ? `${Math.round(gpsState.position.accuracy)} m` : 'N/A'}<br/>
                Updated: {new Date(gpsState.position.timestamp).toLocaleTimeString()}
              </div>
            </Popup>
          </Marker>
          </>
        )}

        {/* Live real-time YOLOv8 active WebSocket target detection pings */}
        {livePings.map((ping) => (
          <Marker 
            key={ping.id} 
            position={[ping.lat, ping.lng]} 
            icon={createLivePingIcon()}
          >
            <Popup>
              <div className="text-slate-800 text-xs p-1 font-sans min-w-[200px]">
                <p className="font-bold text-sm text-rose-600 uppercase tracking-wide border-b pb-1 mb-1">🔴 REAL-TIME YOLOv8 DETECTION</p>
                <p className="font-mono mt-1 text-[10px] text-slate-500">Target Signature Detected at Coordinate:</p>
                <p className="font-mono bg-slate-100 p-1 rounded font-bold text-[9px] mt-1 text-slate-800">LAT: {ping.lat.toFixed(6)}, LNG: {ping.lng.toFixed(6)}</p>
                <div className="mt-2 space-y-1 font-mono text-[9px]">
                  <p>Objects: <strong>{ping.predictions?.map((p: any) => `${p.class} (${Math.round(p.score * 100)}%)`).join(', ')}</strong></p>
                  <p>Timestamp: <strong>{new Date(ping.timestamp).toLocaleTimeString()}</strong></p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
