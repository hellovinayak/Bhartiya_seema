import React, { useState, useEffect, useRef } from 'react';
import { BorderIncident, User, IncidentUpdate } from '../../types';
import { format } from 'date-fns';
import { 
  User as UserIcon, Clock, MapPin, Target, CheckCircle2, 
  AlertOctagon, ShieldAlert, Siren, ShieldCheck, Printer, 
  Map, Activity, Play, Pause, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { mockUsers } from '../../data/mockData';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../../contexts/AuthContext';
import { useAlerts } from '../../contexts/AlertContext';

Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface IncidentDetailProps {
  incident: BorderIncident;
  onAddUpdate: (content: string, status?: BorderIncident['status']) => void;
}

const IncidentDetail: React.FC<IncidentDetailProps> = ({ incident, onAddUpdate }) => {
  const { user } = useAuth();
  const { officers, updateIncident } = useAlerts();

  const [locationName, setLocationName] = useState<string>('Detecting coordinate signature...');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackTime, setPlaybackTime] = useState<number>(12); // seconds
  const [thermalMode, setThermalMode] = useState<boolean>(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [customComment, setCustomComment] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Reverse geocoding for sector coordinates using OpenStreetMap Nominatim
  useEffect(() => {
    if (incident.location?.lat && incident.location?.lng) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${incident.location.lat}&lon=${incident.location.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const place = data.address.city || data.address.town || data.address.village || data.address.county || "Restricted Terrain";
            const state = data.address.state || data.address.country || "";
            setLocationName(`${place}${state ? `, ${state}` : ''}`);
          } else {
            setLocationName('Remote Border Sector (Unmapped)');
          }
        })
        .catch(() => setLocationName(`Sector: ${incident.location.lat.toFixed(4)}°N, ${incident.location.lng.toFixed(4)}°E`));
    }
  }, [incident.location]);

  // 2. Interactive ByteTrack Optical-Thermal Playback Simulation (Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let targetX = canvas.width / 2;
    let targetY = canvas.height / 2;
    let angle = 0;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = thermalMode ? '#001a00' : '#0a0a0c'; // Night vision green or Dark military radar black
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radar sweep lines
      ctx.strokeStyle = thermalMode ? 'rgba(0, 230, 118, 0.08)' : 'rgba(100, 116, 139, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      // Static crosshair
      ctx.strokeStyle = thermalMode ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 215, 0, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke();

      // target pathing movement based on timeline playback
      if (isPlaying) {
        setPlaybackTime(t => (t >= 30 ? 0 : t + 0.04));
      }
      
      angle = (playbackTime / 30) * Math.PI * 2;
      targetX = canvas.width / 2 + Math.sin(angle * 1.5) * 80;
      targetY = canvas.height / 2 + Math.cos(angle) * 50;

      // Draw historical path dots
      ctx.fillStyle = thermalMode ? '#00e676' : '#ffd700';
      for (let i = 0; i < 15; i++) {
        const historyAngle = ((playbackTime - i * 0.4) / 30) * Math.PI * 2;
        const hx = canvas.width / 2 + Math.sin(historyAngle * 1.5) * 80;
        const hy = canvas.height / 2 + Math.cos(historyAngle) * 50;
        ctx.beginPath();
        ctx.arc(hx, hy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw green target bounding box (ByteTrack simulation)
      const boxSize = 65;
      ctx.strokeStyle = thermalMode ? '#00e676' : '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(targetX - boxSize / 2, targetY - boxSize / 2, boxSize, boxSize);

      // Target Corner lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      const cLen = 12;
      // top-left
      ctx.beginPath(); ctx.moveTo(targetX - boxSize/2 - 2, targetY - boxSize/2 + cLen); ctx.lineTo(targetX - boxSize/2 - 2, targetY - boxSize/2 - 2); ctx.lineTo(targetX - boxSize/2 + cLen, targetY - boxSize/2 - 2); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(targetX + boxSize/2 + 2, targetY - boxSize/2 + cLen); ctx.lineTo(targetX + boxSize/2 + 2, targetY - boxSize/2 - 2); ctx.lineTo(targetX + boxSize/2 - cLen, targetY - boxSize/2 - 2); ctx.stroke();
      // bot-left
      ctx.beginPath(); ctx.moveTo(targetX - boxSize/2 - 2, targetY + boxSize/2 - cLen); ctx.lineTo(targetX - boxSize/2 - 2, targetY + boxSize/2 + 2); ctx.lineTo(targetX - boxSize/2 + cLen, targetY + boxSize/2 + 2); ctx.stroke();
      // bot-right
      ctx.beginPath(); ctx.moveTo(targetX + boxSize/2 + 2, targetY + boxSize/2 - cLen); ctx.lineTo(targetX + boxSize/2 + 2, targetY + boxSize/2 + 2); ctx.lineTo(targetX + boxSize/2 - cLen, targetY + boxSize/2 + 2); ctx.stroke();

      // Bounding box telemetry texts
      ctx.fillStyle = '#00e676';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`ID: #BS-${incident.id.slice(-4).toUpperCase()}`, targetX - boxSize/2, targetY - boxSize/2 - 24);
      ctx.fillText(`SIG: ${incident.objectType?.toUpperCase() || 'UNKNOWN'}`, targetX - boxSize/2, targetY - boxSize/2 - 14);
      ctx.fillText(`CONF: ${incident.aiConfidence || 75}%`, targetX - boxSize/2, targetY - boxSize/2 - 4);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`V: 4.2m/s  A: 182°`, targetX - boxSize/2, targetY + boxSize/2 + 10);
      ctx.fillText(`TRACK: ByteTrack v2.1`, targetX - boxSize/2, targetY + boxSize/2 + 20);

      // Draw thermal gradient filter if active
      if (thermalMode) {
        ctx.fillStyle = 'rgba(0, 230, 118, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Heat signature inside the target box
        ctx.fillStyle = 'rgba(255, 87, 34, 0.65)'; // red heat core
        ctx.beginPath(); ctx.arc(targetX, targetY, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 193, 7, 0.45)'; // yellow aura
        ctx.beginPath(); ctx.arc(targetX, targetY, 25, 0, Math.PI * 2); ctx.fill();
      }

      // HUD Overlay texts
      ctx.fillStyle = thermalMode ? '#00e676' : '#22c55e';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`CAMERA: CAM_${incident.source?.toUpperCase() || 'TOWER_A'}_EOIR`, 15, 20);
      ctx.fillText(`FPS: 28.4`, 15, 32);
      ctx.fillText(`HUD MODE: ${thermalMode ? 'INFRARED THERMAL' : 'OPTICAL COLOR'}`, 15, 44);

      ctx.fillStyle = '#ffd700';
      ctx.fillText(`COORD: ${incident.location?.lat.toFixed(4) || '32.9486'}° N, ${incident.location?.lng.toFixed(4) || '75.1042'}° E`, canvas.width - 210, 20);
      ctx.fillText(`BREACH PROTOCOL: ACTIVE`, canvas.width - 210, 32);
      ctx.fillText(`SECTOR: ${incident.zone?.toUpperCase() || 'NORTH ALPHA'}`, canvas.width - 210, 44);

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, playbackTime, thermalMode, incident]);

  // 3. Zero-Tolerance perimeter assessment (Zone Alpha checks)
  const isZeroToleranceBreach = useMemo(() => {
    if (!incident.location) return false;
    const lat = incident.location.lat;
    // Zone Alpha restricted range is typically 32.9400 to 32.9550
    return lat >= 32.9400 && lat <= 32.9550;
  }, [incident.location]);

  // 4. GPS Patrol Dispatcher & Distances calculation
  const nearbyOfficers = useMemo(() => {
    if (!incident.location) return [];

    return officers
      .filter(o => o.role === 'officer' && o.location)
      .map(o => {
        // Calculate Euclidean distance approximation in km
        const dLat = o.location.lat - incident.location!.lat;
        const dLng = o.location.lng - incident.location!.lng;
        const distance = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32; // ~111.32 km per degree
        
        // Patrol speed approx 15 km/h for rugged terrain, ETA in minutes
        const etaMin = (distance / 15) * 60;
        
        return {
          ...o,
          distance: Number(distance.toFixed(2)),
          eta: Math.round(etaMin),
          status: o.online ? 'STANDBY' : 'OFF_DUTY'
        };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [officers, incident.location]);

  const handleManualDispatch = async () => {
    if (!selectedOfficerId) return;
    const officer = mockUsers.find(o => o.id === selectedOfficerId);
    
    // Custom operational logs dispatch content
    const details = nearbyOfficers.find(o => o.id === selectedOfficerId);
    const content = `Patrol team dispatched! Assigned Officer: ${officer?.name || selectedOfficerId} (${officer?.rank || 'Subedar'}). Tactical unit is en-route to coordinates (${incident.location?.lat.toFixed(4)}, ${incident.location?.lng.toFixed(4)}). Estimated Response Time: ${details?.eta || 5} minutes (Distance: ${details?.distance || 1.2} km).`;

    // Dispatch update
    await updateIncident(incident.id, {
      assignedTo: selectedOfficerId,
      assignedOfficer: officer?.name || selectedOfficerId,
      status: 'patrol-dispatched',
      updates: [
        ...incident.updates,
        {
          id: `dispatch_${Date.now()}`,
          content,
          timestamp: new Date().toISOString(),
          updatedBy: user?.id || 'command',
          status: 'patrol-dispatched'
        }
      ]
    });
    
    setSelectedOfficerId('');
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customComment.trim()) return;
    onAddUpdate(customComment.trim());
    setCustomComment('');
  };

  // Official military brief printer utility
  const triggerPrintBrief = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Sleek operational progress status bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 print:hidden">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Operational Command Workflow</h4>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          
          {[
            { id: 'reported', label: 'NEW / REPORTED' },
            { id: 'under-review', label: 'UNDER REVIEW' },
            { id: 'officer-assigned', label: 'OFFICER ASSIGNED' },
            { id: 'patrol-dispatched', label: 'PATROL DISPATCHED' },
            { id: 'resolved', label: 'RESOLVED / SECURED' }
          ].map((step, idx) => {
            const activeIdx = ['reported', 'under-review', 'officer-assigned', 'patrol-dispatched', 'resolved'].indexOf(incident.status);
            const isCompleted = idx < activeIdx;
            const isActive = step.id === incident.status;
            
            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className={`hidden sm:block h-0.5 w-8 ${isCompleted ? 'bg-army-green-700' : 'bg-gray-250'}`} />
                )}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono font-bold tracking-wider ${
                  isActive ? 'bg-army-gold/20 border-army-gold text-army-green-900 shadow-[0_0_10px_rgba(218,165,32,0.3)] animate-pulse' :
                  isCompleted ? 'bg-army-green-800 border-army-green-900 text-white' :
                  'bg-gray-50 border-gray-250 text-gray-400'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    isActive ? 'bg-army-gold' :
                    isCompleted ? 'bg-white' :
                    'bg-gray-300'
                  }`} />
                  {step.label}
                </div>
              </React.Fragment>
            );
          })}

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Playback & Map controls (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 2. Interactive ByteTrack Optical-Thermal Playback player */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-army-green-800 flex items-center gap-2">
                <Activity className="h-4 w-4 text-army-gold animate-pulse" />
                Live Optical-Radar Tracker (DeepSORT/ByteTrack)
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setThermalMode(!thermalMode)}
                  className={`btn text-[10px] py-1 px-2.5 flex items-center font-bold tracking-wider uppercase ${
                    thermalMode ? 'bg-army-gold text-army-green-950 shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {thermalMode ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                  {thermalMode ? 'Optical NV' : 'Thermal NV'}
                </button>
                <button onClick={triggerPrintBrief} className="btn bg-army-green-700 hover:bg-army-green-800 text-white text-[10px] py-1 px-2.5 flex items-center font-bold uppercase tracking-wider">
                  <Printer className="h-3 w-3 mr-1" />Print report
                </button>
              </div>
            </div>

            {/* Simulated HUD Optical view screen */}
            <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden border-b">
              
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={450} 
                className="w-full h-full object-contain pointer-events-none" 
              />
              
              {/* Alert telemetry overlays for restricted perimeter */}
              {isZeroToleranceBreach && (
                <div className="absolute top-16 left-4 right-4 bg-red-950/75 border border-red-700 p-2.5 rounded flex items-center gap-2.5 animate-pulse z-10 text-xs font-mono text-red-200">
                  <ShieldAlert className="h-5 w-5 text-red-500 animate-ping flex-shrink-0" />
                  <div>
                    <span className="font-black text-red-400">PERIMETER ALERT: </span>
                    Object identified inside Zone Alpha restricted zero line perimeter fence. Immediate dispatch required.
                  </div>
                </div>
              )}

            </div>

            {/* Playback controller timeline */}
            <div className="p-4 bg-gray-50 flex items-center justify-between gap-4 font-mono text-[10px]">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="btn bg-army-green-800 hover:bg-army-green-950 text-white p-2 rounded-full flex-shrink-0 shadow-sm"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              </button>
              
              <div className="flex-grow flex items-center gap-3">
                <span>0.00s</span>
                <input 
                  type="range" 
                  min="0" 
                  max="30" 
                  step="0.1"
                  value={playbackTime}
                  onChange={(e) => {
                    setPlaybackTime(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full accent-army-green-700 cursor-pointer h-1 roundedbg-gray-300"
                />
                <span>30.0s</span>
              </div>

              <div className="text-right font-black text-army-green-800 bg-army-khaki-100 px-2 py-0.5 rounded flex-shrink-0">
                FRAME: {Math.round(playbackTime * 28.4)} / 852
              </div>
            </div>

          </div>

          {/* 3. Restricted Zone & Assessment Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* AI Threat Assessment Profiler */}
            <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 space-y-4">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-army-green-800 border-b pb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-army-gold" />
                AI Threat Assessment &amp; Profiler
              </h3>
              
              <div className="space-y-3 font-mono text-[10px]">
                
                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-gray-400 uppercase">Intrusion Probability</span>
                  <span className="text-army-red-700 font-bold">
                    {incident.severity === 'critical' ? '98.5%' : incident.severity === 'high' ? '92.4%' : '76.8%'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-gray-400 uppercase">Suspicious Pattern</span>
                  <span className="text-army-green-800 font-bold uppercase">
                    {incident.objectType === 'Person' ? 'Low-Profile Crouching Path' :
                     incident.objectType === 'Vehicle' ? 'High-Velocity Unregistered Patrol' :
                     incident.objectType === 'Drone' ? 'Low-Altitude Flight Hover' : 'Erratic Movement Signature'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-gray-400 uppercase">Crossing Prediction</span>
                  <span className="text-blue-700 font-bold">
                    {isZeroToleranceBreach ? 'BREACH ACTIVE' : 'Calculated intercept in 120s based on vector'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-gray-400 uppercase">Telemetry linking</span>
                  <span className="text-gray-600 font-bold">
                    Camera Tower-Alpha EO/IR &bull; Ridge-Beta Radar
                  </span>
                </div>

                {isZeroToleranceBreach && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded leading-relaxed text-[9px]">
                    🚨 <strong>COMMAND TELEMETRY WARNING:</strong> Bounding coordinates overlap with Zone Alpha (Zero Line Perimeter). Sector threat classified as <strong>CRITICAL INTENSITY BREACH</strong>.
                  </div>
                )}

              </div>
            </div>

            {/* Tactical Mapping Coordinates */}
            <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 space-y-4">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-army-green-800 border-b pb-2 flex items-center gap-1.5">
                <Map className="h-4 w-4 text-army-gold" />
                GPS Tactical Sector Map
              </h3>
              {incident.location ? (
                <div className="h-44 rounded overflow-hidden border">
                  <MapContainer
                    center={[incident.location.lat, incident.location.lng]}
                    zoom={13}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Circle
                      center={[incident.location.lat, incident.location.lng]}
                      radius={600}
                      pathOptions={{
                        color: '#dc2626',
                        fillColor: '#dc2626',
                        fillOpacity: 0.16,
                        weight: 2
                      }}
                    />
                    <Marker position={[incident.location.lat, incident.location.lng]} />
                  </MapContainer>
                </div>
              ) : (
                <p className="text-xs font-mono text-gray-400 italic">GPS coordinate tracking secure signal offline.</p>
              )}
            </div>

          </div>

          {/* Chronological Incident Timeline logs */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-army-green-800 border-b pb-2 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-army-gold" />
              Chronological Incident Response Timeline
            </h3>

            <div className="border-l-2 border-army-green-150 pl-5 space-y-5 font-mono text-[10px]">
              
              {/* 1st event: yolo camera trigger */}
              <div className="relative">
                <div className="absolute -left-7 mt-0.5 h-3.5 w-3.5 rounded-full bg-army-green-700 border-2 border-white" />
                <div className="mb-0.5 flex justify-between items-center">
                  <span className="font-black text-army-green-800">1. AI CAMERA TRIGGER SPOOTTED</span>
                  <span className="text-gray-400 text-[9px]">{format(new Date(incident.reportedAt), 'PPp')}</span>
                </div>
                <p className="text-gray-600">YOLOv8 Object Detection System confirmed target classification: <strong>{incident.objectType || 'Suspicious Target'}</strong> (Confidence: {incident.aiConfidence || 75}%) inside sector grid.</p>
              </div>

              {/* 2nd event: email notification */}
              <div className="relative">
                <div className="absolute -left-7 mt-0.5 h-3.5 w-3.5 rounded-full bg-blue-700 border-2 border-white" />
                <div className="mb-0.5 flex justify-between items-center">
                  <span className="font-black text-blue-800">2. SECURE EMAIL ALERT DISPATCHED</span>
                  <span className="text-gray-400 text-[9px]">{format(new Date(incident.reportedAt), 'PPp')}</span>
                </div>
                <p className="text-gray-600">Automated secure SMTP payload dispatched to <strong>sidd902003@gmail.com</strong> with camera coordinate frames attached.</p>
              </div>

              {/* 3rd event: updates or commander logs */}
              {incident.updates.map((update, idx) => (
                <div key={update.id} className="relative">
                  <div className={`absolute -left-7 mt-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                    update.status === 'resolved' ? 'bg-emerald-600' :
                    update.status === 'patrol-dispatched' ? 'bg-rose-600' :
                    'bg-amber-600'
                  }`} />
                  <div className="mb-0.5 flex justify-between items-center">
                    <span className={`font-black uppercase ${
                      update.status === 'resolved' ? 'text-emerald-700' :
                      update.status === 'patrol-dispatched' ? 'text-rose-700' :
                      'text-amber-700'
                    }`}>
                      {idx + 3}. {update.status ? update.status.replace('-', ' ') : 'OPERATIONAL LOG BRIEF'}
                    </span>
                    <span className="text-gray-400 text-[9px]">{format(new Date(update.timestamp), 'PPp')}</span>
                  </div>
                  <p className="text-gray-600">{update.content}</p>
                </div>
              ))}

            </div>
          </div>

        </div>

        {/* Right Column: Dispatch Panel & Command actions (1/3 width) */}
        <div className="space-y-6 print:hidden">
          
          {/* 4. GPS Patrol Dispatcher & Available Officers list */}
          <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-army-green-800 border-b pb-2 flex items-center gap-1.5">
              <Siren className="h-4 w-4 text-army-gold" />
              Perimeter Patrol Dispatcher
            </h3>
            
            {nearbyOfficers.length > 0 ? (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Select Available Officer Unit</label>
                
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {nearbyOfficers.map(off => (
                    <div 
                      key={off.id}
                      onClick={() => setSelectedOfficerId(off.id)}
                      className={`p-2.5 border rounded-lg cursor-pointer transition font-mono text-[10px] flex justify-between items-start ${
                        selectedOfficerId === off.id ? 'border-army-gold bg-army-gold/10' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-army-green-900 uppercase">{off.name}</div>
                        <div className="text-gray-400 text-[9px]">{off.rank} &bull; {off.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-blue-700">{off.distance} KM</div>
                        <div className="font-bold text-amber-700 uppercase">ETA: {off.eta} MINS</div>
                      </div>
                    </div>
                  ))}
                </div>

                <select 
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded p-2 focus:ring-1 focus:ring-army-gold focus:border-army-gold text-army-green-900"
                >
                  <option value="">Choose officer unit...</option>
                  {nearbyOfficers.map(off => (
                    <option key={off.id} value={off.id}>
                      {off.name} ({off.rank}) - {off.distance} km away (ETA: {off.eta}m)
                    </option>
                  ))}
                </select>

                <button 
                  onClick={handleManualDispatch}
                  disabled={!selectedOfficerId}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(225,29,72,0.3)] border border-rose-400/20"
                >
                  <Siren className="h-4 w-4 mr-2 animate-bounce" />
                  Dispatch Patrol Unit
                </button>

              </div>
            ) : (
              <p className="text-xs font-mono text-gray-400 italic">No standby field patrols identified inside telemetry bounds.</p>
            )}
          </div>

          {/* 5. Manual command workflow override actions */}
          <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-army-green-800 border-b pb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-army-gold" />
              Operational Commander Action Panel
            </h3>
            
            <div className="flex flex-col gap-2.5">
              
              <button 
                onClick={() => onAddUpdate("Operator flagged coordinate frames as UNDER ACTIVE REVIEW.", "under-review")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded text-[10px] uppercase font-mono tracking-wider transition shadow-sm"
              >
                1. Flag Under Review
              </button>

              <button 
                onClick={() => onAddUpdate("RESOLVED: Patrol units securing the coordinates confirmed sector is clear. No hostile presence remaining.", "resolved")}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded text-[10px] uppercase font-mono tracking-wider transition shadow-sm"
              >
                2. Declare Sector Secured
              </button>

              <button 
                onClick={() => onAddUpdate("FALSE ALARM: Sensors confirmed wildlife signatures near fence perimeter. Closed.", "false-alarm")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded text-[10px] uppercase font-mono tracking-wider transition shadow-sm"
              >
                3. Dismiss False Alarm
              </button>

            </div>
          </div>

          {/* 6. Form action for adding manual updates/logs */}
          <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-army-green-800 border-b pb-2 flex items-center gap-1.5">
              <Edit3 className="h-4 w-4 text-army-gold" />
              Operational Commentary Brief
            </h3>
            
            <form onSubmit={handleCommentSubmit} className="space-y-3 font-sans text-xs">
              <textarea 
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                placeholder="Type tactical log comment here..."
                rows={3}
                className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:ring-1 focus:ring-army-gold focus:border-army-gold focus:outline-none"
              />
              <button 
                type="submit"
                disabled={!customComment.trim()}
                className="w-full bg-army-green-800 hover:bg-army-green-950 text-white font-bold py-2 rounded shadow transition disabled:opacity-50"
              >
                Submit Comment
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* 7. Official Printable Brief layout (Hidden in screen view, visible in printing) */}
      <div className="hidden print:block bg-white p-8 font-mono text-xs border border-black space-y-6">
        
        {/* Printable header */}
        <div className="text-center border-b-2 border-black pb-4">
          <h2 className="text-lg font-black uppercase">BHARTIYA SEEMA AI SURVEILLANCE SYSTEM</h2>
          <h3 className="text-sm font-bold uppercase mt-1">OFFICIAL BREACH INTEL REPORT &bull; FOR COMMAND USE ONLY</h3>
          <p className="text-[10px] mt-1">REPORT GENERATED: {new Date().toLocaleString()} IST &bull; SECURITY DIVISION 4</p>
        </div>

        {/* Printable fields grid */}
        <div className="grid grid-cols-2 gap-4 border-b pb-4">
          <div>
            <div><strong>INCIDENT CODE:</strong> #BS-{incident.id.toUpperCase()}</div>
            <div><strong>TARGET SIGNATURE:</strong> {incident.objectType || incident.type || 'Unknown'}</div>
            <div><strong>AI CONFIDENCE:</strong> {incident.aiConfidence || 75}%</div>
            <div><strong>SECTOR ZONE:</strong> {incident.zone || 'Northern Sector Alpha'}</div>
          </div>
          <div>
            <div><strong>COORDINATES:</strong> {incident.location?.lat.toFixed(6)}° N, {incident.location?.lng.toFixed(6)}° E</div>
            <div><strong>REPORTED TIME:</strong> {format(new Date(incident.reportedAt), 'PPp')}</div>
            <div><strong>SEVERITY LEVEL:</strong> {incident.severity.toUpperCase()} ({incident.severityScore || 50}/100)</div>
            <div><strong>CURRENT STATUS:</strong> {incident.status.toUpperCase()}</div>
          </div>
        </div>

        {/* Description brief */}
        <div>
          <h4 className="font-bold underline uppercase mb-1">I. Incident Brief &amp; Description</h4>
          <p className="text-gray-800">{incident.description}</p>
        </div>

        {/* Officer info */}
        <div>
          <h4 className="font-bold underline uppercase mb-1">II. Command Assignments</h4>
          <div><strong>REPORTED BY SENSOR SOURCE:</strong> {incident.reportedBy === 'yolo-engine' ? 'YOLOv8 AI Engine' : 'Field Operations Simulation'}</div>
          <div><strong>ASSIGNED FIELD OFFICER:</strong> {incident.assignedOfficer || 'UNASSIGNED'}</div>
        </div>

        {/* Chronology log updates */}
        <div>
          <h4 className="font-bold underline uppercase mb-2">III. Chronological Operational Log Timeline</h4>
          <div className="space-y-2 border-l border-black pl-4">
            <div>
              <strong>[{format(new Date(incident.reportedAt), 'HH:mm:ss')}] &bull; AI SENSOR ACTIVE</strong>
              <div>Target identified by camera telemetry stream. Confidence score flagged at {incident.aiConfidence || 75}%.</div>
            </div>
            <div>
              <strong>[{format(new Date(incident.reportedAt), 'HH:mm:ss')}] &bull; SMTP ALERT</strong>
              <div>Breach notification dispatched automatically to sidd902003@gmail.com with target vector captures.</div>
            </div>
            {incident.updates.map(up => (
              <div key={up.id}>
                <strong>[{format(new Date(up.timestamp), 'HH:mm:ss')}] &bull; {up.status ? up.status.toUpperCase() : 'FIELD LOG'}</strong>
                <div>{up.content}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Signature stamp */}
        <div className="pt-8 flex justify-between items-end">
          <div className="border-t border-black w-48 text-center pt-1.5">
            Command Center Dispatcher
          </div>
          <div className="border-t border-black w-48 text-center pt-1.5">
            Commanding Officer Signature
          </div>
        </div>

      </div>

    </div>
  );
};

export default IncidentDetail;
