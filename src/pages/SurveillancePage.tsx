/**
 * SurveillancePage.tsx
 * Production-level real-time surveillance page.
 *
 * Flow:
 *  Camera / uploaded video  →  canvas frame capture  →  POST /detect
 *  →  YOLOv8 results  →  draw bounding boxes  →  if alert_triggered:
 *      show AlertToast + play audio + update admin dispatch log
 *
 * Features:
 *  - Live camera or uploaded-video feed
 *  - YOLOv8 bounding boxes drawn on a canvas overlay
 *  - Real confidence values from the backend
 *  - 60-second per-class email cooldown enforced server-side
 *  - Alert toast popup with captured frame thumbnail
 *  - Thermal mode (CSS filter)
 *  - FPS counter
 *  - Session stats
 *  - Offline preview overlay when backend is down; alert creation stays disabled
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell, Camera, Gauge, Pause, Play, Settings,
  Shield, Square, Thermometer, Upload, Video,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import AlertToast, { AlertToastData } from '../components/dashboard/AlertToast';
import { useAlerts } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import { BorderIncident, DetectionLabel, DetectionType } from '../types';
import { backendUrl } from '../lib/backend';

// ── Object-type mapping ────────────────────────────────────────────────────────
const mapDetection = (label: string): {
  objectType: DetectionLabel;
  type: DetectionType;
  severity: BorderIncident['severity'];
} => {
  if (label === 'person')                              return { objectType: 'Person',         type: 'person',  severity: 'high' };
  if (['car', 'truck', 'bus'].includes(label))         return { objectType: 'Car',            type: 'vehicle', severity: 'high' };
  if (['motorcycle', 'bicycle'].includes(label))       return { objectType: 'Bike',           type: 'vehicle', severity: 'medium' };
  if (label === 'drone')                               return { objectType: 'Drone',          type: 'drone',   severity: 'critical' };
  if (['cat','dog','horse','cow','bird'].includes(label)) return { objectType: 'Animal',      type: 'unknown', severity: 'low' };
  return { objectType: 'Unknown Object', type: 'unknown', severity: 'medium' };
};

// ── Colour map matching the backend ───────────────────────────────────────────
const BOX_COLORS: Record<string, string> = {
  person:     '#10b981',
  car:        '#3b82f6',
  truck:      '#3b82f6',
  bus:        '#3b82f6',
  motorcycle: '#f59e0b',
  bicycle:    '#f59e0b',
  bird:       '#fde047',
  _default:   '#a78bfa',
};

// ── Main component ─────────────────────────────────────────────────────────────
const SurveillancePage: React.FC = () => {
  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef        = useRef<HTMLVideoElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const deviceLocation  = useRef<{ lat: number; lng: number } | null>(null);
  const isProcessingRef = useRef(false);   // prevents concurrent fetch calls
  const lastEmailTime   = useRef(0);
  const lastFrameTime   = useRef(performance.now());
  const avgConfRef      = useRef(0);

  // ── State ──────────────────────────────────────────────────────────────────
  const [isBackendReady,  setIsBackendReady]  = useState(false);
  const [isDetecting,     setIsDetecting]     = useState(false);
  const [stream,          setStream]          = useState<MediaStream | null>(null);
  const [videoSourceUrl,  setVideoSourceUrl]  = useState<string | null>(null);
  const [isLive,          setIsLive]          = useState(true);
  const [thermalMode,     setThermalMode]     = useState(false);
  const [fps,             setFps]             = useState(0);
  const [objectCounts,    setObjectCounts]    = useState<Record<string, number>>({});
  const [sessionStats,    setSessionStats]    = useState({ total_people: 0, total_vehicles: 0, total_alerts: 0 });
  const [dispatchLog,     setDispatchLog]     = useState<any[]>([]);
  const [toastAlerts,     setToastAlerts]     = useState<AlertToastData[]>([]);

  // ── AI Dynamic Configuration State ──────────────────────────────────────────
  const [modelName,          setModelName]          = useState<string>('yolov8n.pt');
  const [minConfidence,      setMinConfidence]      = useState<number>(40);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState<boolean>(false);
  const [settingsError,      setSettingsError]      = useState<string | null>(null);

  const { createIncident } = useAlerts();
  const { user }           = useAuth();

  // ── GPS tracking ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        deviceLocation.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => { deviceLocation.current = null; },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // ── Backend health probe (polls every 10 s) ────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(backendUrl('/health'));
        setIsBackendReady(r.ok);
      } catch {
        setIsBackendReady(false);
      }
    };
    check();
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (videoSourceUrl) URL.revokeObjectURL(videoSourceUrl);
    };
  }, [stream, videoSourceUrl]);

  // ── Fetch AI Configuration from backend ───────────────────────────────────
  useEffect(() => {
    if (!isBackendReady) return;
    const fetchSettings = async () => {
      try {
        const r = await fetch(backendUrl('/settings'));
        if (r.ok) {
          const d = await r.json();
          setModelName(d.model_name);
          setMinConfidence(Math.round(d.min_confidence * 100));
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, [isBackendReady]);

  // ── Send updated AI Settings to backend ───────────────────────────────────
  const updateAISettings = async (model: string, confPercent: number) => {
    if (!isBackendReady) return;
    setIsUpdatingSettings(true);
    setSettingsError(null);
    try {
      const resp = await fetch(backendUrl('/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: model,
          min_confidence: Number((confPercent / 100).toFixed(2))
        })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.detail || 'Failed to update settings');
      }
    } catch (err: any) {
      setSettingsError(err.message || 'Error updating settings');
      console.error(err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // ── Session stats polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isDetecting || !isBackendReady) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(backendUrl('/stats'));
        if (r.ok) setSessionStats(await r.json());
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(id);
  }, [isDetecting, isBackendReady]);

  // ── Camera controls ────────────────────────────────────────────────────────
  const stopEverything = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (videoSourceUrl) {
      URL.revokeObjectURL(videoSourceUrl);
      setVideoSourceUrl(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src       = '';
    }
    setIsDetecting(false);
    setObjectCounts({});
    isProcessingRef.current = false;
  }, [stream, videoSourceUrl]);

  const startCamera = async () => {
    stopEverything();
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(ms);
      setIsLive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = ms;
        videoRef.current.src       = '';
      }
      // Signal session start to backend
      fetch(backendUrl('/start-detection'), { method: 'POST' }).catch(() => {});
      setIsDetecting(true);
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopEverything();
    const url = URL.createObjectURL(file);
    setVideoSourceUrl(url);
    setIsLive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src       = url;
      videoRef.current.onloadedmetadata = () => setIsDetecting(true);
    }
    fetch(backendUrl('/start-detection'), { method: 'POST' }).catch(() => {});
  };

  // ── Alert toast helpers ────────────────────────────────────────────────────
  const pushToast = useCallback((cls: string, confidence: number, frameUrl: string | null) => {
    const toast: AlertToastData = {
      id:         `${cls}-${Date.now()}`,
      cls,
      confidence,
      frameUrl,
      timestamp:  new Date().toLocaleTimeString(),
    };
    setToastAlerts((prev) => [toast, ...prev].slice(0, 5));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToastAlerts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Core detection loop ────────────────────────────────────────────────────
  const detectFrame = useCallback(() => {
    if (isProcessingRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isDetecting) return;
    if (video.paused || video.ended || video.videoWidth === 0) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture frame to an off-screen canvas → Blob
    const offscreen = document.createElement('canvas');
    offscreen.width  = video.videoWidth;
    offscreen.height = video.videoHeight;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    offCtx.drawImage(video, 0, 0);

    offscreen.toBlob(async (blob) => {
      if (!blob) return;
      isProcessingRef.current = true;

      const loc = deviceLocation.current;
      const url = new URL(backendUrl('/detect'));
      if (loc) { url.searchParams.set('lat', String(loc.lat)); url.searchParams.set('lng', String(loc.lng)); }

      const form = new FormData();
      form.append('file', blob, 'frame.jpg');

      try {
        const resp = await fetch(url.toString(), { method: 'POST', body: form });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();
        const predictions: any[] = data.predictions || [];
        const counts: Record<string, number> = data.counts || {};

        setObjectCounts(counts);

        // Compute rolling average confidence
        if (predictions.length > 0) {
          avgConfRef.current = Math.round(
            (predictions.reduce((s: number, p: any) => s + p.score, 0) / predictions.length) * 100
          );
        }

        // Draw bounding boxes
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        predictions.forEach((p: any) => {
          const [x, y, w, h] = p.bbox;
          const color        = BOX_COLORS[p.class] ?? BOX_COLORS._default;
          const label        = `${p.class.toUpperCase()}  ${Math.round(p.score * 100)}%`;

          ctx.strokeStyle = color;
          ctx.lineWidth   = 2.5;
          ctx.strokeRect(x, y, w, h);

          const tw = ctx.measureText(label).width + 8;
          ctx.fillStyle = `${color}cc`;
          ctx.fillRect(x, y > 18 ? y - 18 : 0, tw, 18);
          ctx.fillStyle = '#ffffff';
          ctx.font      = 'bold 11px monospace';
          ctx.fillText(label, x + 4, y > 18 ? y - 5 : 13);
        });

        // FPS
        const now = performance.now();
        setFps(Math.round(1000 / Math.max(1, now - lastFrameTime.current)));
        lastFrameTime.current = now;

        // Handle alert
        if (data.alert_triggered) {
          const alertPreds = predictions.filter((p: any) => p.is_alert);
          const topPred    = alertPreds[0];

          if (topPred && Date.now() - lastEmailTime.current > 30_000) {
            lastEmailTime.current = Date.now();

            pushToast(topPred.class, topPred.score, data.frame_url ?? null);

            // Update dispatch log
            setDispatchLog((prev) => [{
              id:        Date.now(),
              timestamp: new Date().toLocaleTimeString(),
              cls:       topPred.class,
              conf:      Math.round(topPred.score * 100),
              frameUrl:  data.frame_url ?? null,
              location:  loc ? `${loc.lat.toFixed(4)}° N, ${loc.lng.toFixed(4)}° E` : 'Sector 7G',
            }, ...prev].slice(0, 20));

            // Create incident in AlertContext
            const det = mapDetection(topPred.class);
            createIncident({
              title:        `${det.objectType} detected by YOLO camera`,
              description:  `${det.objectType} detected with ${Math.round(topPred.score * 100)}% confidence. Email alert dispatched.`,
              location:     loc ?? { lat: 32.9486, lng: 75.1042 },
              coordinates:  loc ?? { lat: 32.9486, lng: 75.1042 },
              severity:     det.severity,
              priority:     det.severity,
              status:       'reported',
              type:         det.type,
              objectType:   det.objectType,
              zone:         'Sector 7G',
              aiConfidence: Math.round(topPred.score * 100),
              severityScore: Math.min(100, Math.round(topPred.score * 100)),
              source:       'yolo',
              reportedBy:   user?.id ?? 'yolo-engine',
            }).catch(() => {});
          }
        }

      } catch (err) {
        console.error('Detection error:', err);
      } finally {
        isProcessingRef.current = false;
        if (isDetecting) requestAnimationFrame(detectFrame);
      }
    }, 'image/jpeg', 0.65);
  }, [isDetecting, createIncident, user, pushToast]);

  // Start detection loop when isDetecting+backend flip on
  useEffect(() => {
    if (isDetecting && isBackendReady) {
      requestAnimationFrame(detectFrame);
    }
  }, [isDetecting, isBackendReady, detectFrame]);

  // Offline preview overlay (when backend is down). This never creates alerts.
  useEffect(() => {
    if (!isDetecting || isBackendReady) return;
    const labels = ['Person', 'Car', 'Bike', 'Bird'];
    const id = setInterval(() => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      const ctx    = canvas?.getContext('2d');
      if (!video || !canvas || !ctx || video.paused || video.ended) return;

      canvas.width  = video.videoWidth  || canvas.clientWidth  || 1280;
      canvas.height = video.videoHeight || canvas.clientHeight ||  720;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const label = labels[Math.floor(Math.random() * labels.length)];
      const conf  = Math.round(72 + Math.random() * 25);
      const w     = 130 + Math.random() * 130;
      const h     = 80  + Math.random() * 100;
      const x     = Math.random() * Math.max(1, canvas.width  - w);
      const y     = Math.random() * Math.max(1, canvas.height - h);
      const color = label === 'Person' ? '#10b981' : label === 'Car' ? '#3b82f6' : '#f59e0b';

      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = `${color}cc`;
      ctx.fillRect(x, Math.max(0, y - 20), 180, 20);
      ctx.fillStyle = '#fff';
      ctx.font      = 'bold 12px monospace';
      ctx.fillText(`${label.toUpperCase()}  ${conf}%`, x + 5, Math.max(15, y - 5));

      setObjectCounts({ [label.toLowerCase()]: 1 });
      setFps(22 + Math.floor(Math.random() * 8));
    }, 1200);
    return () => clearInterval(id);
  }, [isDetecting, isBackendReady]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const hasSource = !!(stream || videoSourceUrl);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Alert toasts */}
      <AlertToast alerts={toastAlerts} onDismiss={dismissToast} />

      <Header />

      <main className="flex-grow bg-army-khaki-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Left: Video feed ────────────────────────────────────────── */}
            <div className="lg:w-2/3">
              <div className="bg-army-green-800 rounded-lg shadow-army overflow-hidden relative border-2 border-army-gold/30">

                {/* Feed header */}
                <div className="flex items-center justify-between p-4 bg-army-green-900 border-b border-army-gold/20">
                  <div className="flex items-center space-x-2">
                    <Video className="h-5 w-5 text-army-gold" />
                    <h2 className="text-white font-headline font-bold">
                      {isLive ? 'Surveillance Feed – Sector 7G' : 'Video Analysis Mode'}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isDetecting && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                    <span className={`${isLive ? 'text-red-500' : 'text-army-gold'} text-xs font-bold tracking-widest`}>
                      {isLive ? 'LIVE' : 'ANALYSIS'}
                    </span>
                    {!isBackendReady && (
                      <span className="text-[10px] bg-yellow-900/50 text-yellow-400 border border-yellow-700 px-2 py-0.5 rounded font-mono">
                        AI OFFLINE
                      </span>
                    )}
                  </div>
                </div>

                {/* Video area */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  {!hasSource && (
                    <div className="text-center p-8 z-10">
                      <Camera className="h-16 w-16 text-army-khaki-400 mx-auto mb-4 opacity-50" />
                      <p className="text-army-khaki-200 mb-6 font-medium">
                        Select a surveillance source to begin monitoring
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={startCamera} className="btn btn-primary flex items-center justify-center space-x-2 px-6">
                          <Camera className="h-4 w-4" /><span>Use Live Camera</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary flex items-center justify-center space-x-2 px-6">
                          <Upload className="h-4 w-4" /><span>Upload Video</span>
                        </button>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleVideoUpload} accept="video/*" className="hidden" />
                      {!isBackendReady && (
                        <div className="mt-6 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-400 font-mono text-center">
                          YOLO backend offline — real surveillance alerts disabled<br />
                          <span className="opacity-70">Run: cd backend &amp;&amp; python main.py</span>
                        </div>
                      )}
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay loop={!isLive} playsInline muted
                    onPlay={() => { if (isDetecting && isBackendReady) requestAnimationFrame(detectFrame); }}
                    className={`w-full h-full object-contain ${thermalMode ? 'sepia contrast-150 hue-rotate-90 saturate-200' : ''} ${!hasSource ? 'hidden' : 'block'}`}
                  />
                  <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" />

                  {hasSource && (
                    <div className="absolute left-4 top-4 flex items-center gap-3 text-xs font-mono">
                      <span className="px-2 py-1 rounded bg-red-600 text-white font-bold flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />REC
                      </span>
                      <span className="px-2 py-1 rounded bg-black/60 text-army-gold">{fps} FPS</span>
                      <span className="px-2 py-1 rounded bg-black/60 text-army-khaki-100">
                        {isBackendReady ? 'YOLOv8' : 'SIM'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Controls bar */}
                {hasSource && (
                  <div className="p-4 bg-army-green-900 border-t border-army-gold/20 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex space-x-3">
                      <button onClick={stopEverything} className="btn bg-army-red-600 hover:bg-army-red-700 text-white text-xs py-2 flex items-center">
                        <Square className="h-3 w-3 mr-1.5 fill-current" />Stop
                      </button>
                      {!isLive && videoRef.current && (
                        <button
                          onClick={() => {
                            if (videoRef.current?.paused) videoRef.current.play();
                            else videoRef.current?.pause();
                          }}
                          className="btn bg-army-gold hover:bg-army-gold/80 text-army-green-900 text-xs py-2 flex items-center font-bold"
                        >
                          {videoRef.current?.paused
                            ? <><Play className="h-3 w-3 mr-1.5 fill-current" />Play</>
                            : <><Pause className="h-3 w-3 mr-1.5 fill-current" />Pause</>}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setThermalMode((v) => !v)}
                        className={`btn text-xs py-2 flex items-center ${thermalMode ? 'bg-army-gold text-army-green-950' : 'btn-secondary'}`}
                      >
                        <Thermometer className="h-3 w-3 mr-1.5" />Thermal
                      </button>
                      <span className="hidden md:inline-flex items-center text-army-khaki-300 text-[10px] font-mono">
                        <Gauge className="h-3 w-3 mr-1" />
                        CONF AVG: {avgConfRef.current > 0 ? `${avgConfRef.current}%` : '--'}
                      </span>
                    </div>
                    <div className="text-army-khaki-300 text-[10px] font-mono text-right">
                      <div>COORD: {deviceLocation.current ? `${deviceLocation.current.lat.toFixed(4)}° N, ${deviceLocation.current.lng.toFixed(4)}° E` : 'GPS Acquiring...'}</div>
                      <div className="text-army-gold">SYS_TIME: {new Date().toLocaleTimeString()} IST</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Detection control + Dispatch log ──────────────────── */}
            <div className="lg:w-1/3 space-y-6">

              {/* Detection stats */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-army-gold">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <h3 className="font-headline font-bold text-lg flex items-center text-army-green-800">
                    <Settings className="h-5 w-5 mr-2" />Detection Control
                  </h3>
                  {isBackendReady
                    ? <span className="text-[10px] text-green-600 font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded">YOLOv8 ONLINE</span>
                    : <span className="text-[10px] text-yellow-600 font-bold bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded">AI OFFLINE</span>}
                </div>
                <div className="p-5 space-y-4">
                  {isDetecting && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-army-green-700 uppercase tracking-widest border-b border-army-green-100 pb-1 flex justify-between">
                        <span>Live Detections</span>
                        <span className="animate-pulse text-red-600">● LIVE</span>
                      </h4>
                      {Object.entries(objectCounts).length > 0 ? (
                        Object.entries(objectCounts).map(([label, count]) => (
                          <div key={label} className="flex items-center justify-between p-2 bg-gray-50 rounded border uppercase font-mono">
                            <span className="text-[10px] font-bold text-gray-600">{label}</span>
                            <span className="text-xs font-black text-army-green-800 bg-army-gold/20 px-2 py-0.5 rounded">
                              {String(count).padStart(2, '0')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-gray-400 italic">Scanning sector for signatures…</p>
                      )}
                    </div>
                  )}

                  {/* Session totals */}
                  <div className="p-3 bg-army-khaki-100 rounded border border-army-gold/30">
                    <h5 className="text-[10px] font-black text-army-green-800 uppercase mb-2 border-b border-army-gold/20 pb-1">
                      Mission Session
                    </h5>
                    {[
                      ['PEOPLE',   sessionStats.total_people],
                      ['VEHICLES', sessionStats.total_vehicles],
                      ['ALERTS',   sessionStats.total_alerts],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-army-green-700">{label}</span>
                        <span className="text-sm font-black text-army-green-900">
                          {String(val).padStart(3, '0')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* AI Config & Tuning */}
                  <div className="border-t border-army-green-100 pt-4 mt-2 space-y-4">
                    <h4 className="text-xs font-bold text-army-green-700 uppercase tracking-widest border-b border-army-green-100 pb-1 flex justify-between items-center font-headline">
                      <span>AI Model &amp; Tuning</span>
                      {isUpdatingSettings && (
                        <span className="flex items-center space-x-1 text-[10px] text-army-gold font-bold animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-army-gold" />
                          <span>CONFIGURING...</span>
                        </span>
                      )}
                    </h4>

                    {/* Model Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex justify-between">
                        <span>YOLOv8 Model Engine</span>
                        {isBackendReady && (
                          <span className="text-army-green-700 font-mono font-bold lowercase">
                            {modelName}
                          </span>
                        )}
                      </label>
                      <select
                        value={modelName}
                        onChange={async (e) => {
                          const nextModel = e.target.value;
                          setModelName(nextModel);
                          await updateAISettings(nextModel, minConfidence);
                        }}
                        disabled={isUpdatingSettings || !isBackendReady}
                        className="w-full text-xs font-medium bg-gray-50 border border-gray-300 rounded p-2 text-army-green-900 focus:ring-1 focus:ring-army-gold focus:border-army-gold focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed transition font-sans"
                      >
                        <option value="yolov8n.pt">Nano Model (yolov8n.pt) - Fast</option>
                        <option value="yolov8s.pt">Small Model (yolov8s.pt) - Recommended</option>
                        <option value="yolov8m.pt">Medium Model (yolov8m.pt) - High Accuracy</option>
                        <option value="yolov8l.pt">Large Model (yolov8l.pt) - Maximum Precision</option>
                      </select>
                      <p className="text-[9px] text-gray-400 leading-tight">
                        * Larger models increase precision for small or distant objects, but require more CPU processing time.
                      </p>
                    </div>

                    {/* Confidence Threshold Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">
                          Sensitivity Threshold
                        </label>
                        <span className="text-xs font-black text-army-green-800 bg-army-gold/30 px-2 py-0.5 rounded font-mono">
                          {minConfidence}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="90"
                        step="5"
                        value={minConfidence}
                        onChange={(e) => setMinConfidence(Number(e.target.value))}
                        onMouseUp={() => updateAISettings(modelName, minConfidence)}
                        onTouchEnd={() => updateAISettings(modelName, minConfidence)}
                        disabled={isUpdatingSettings || !isBackendReady}
                        className="w-full accent-army-green-700 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                      />
                      <p className="text-[9px] text-gray-400 leading-tight">
                        * Lower threshold to detect more subtle/distant objects (more alerts); raise it to eliminate false alarms.
                      </p>
                    </div>

                    {/* Settings error, if any */}
                    {settingsError && (
                      <div className="p-2 text-[10px] bg-red-50 border border-red-200 text-red-700 rounded leading-normal">
                        ⚠️ <strong>Error:</strong> {settingsError}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Rapid-response info */}
              <div className="bg-army-red-50 rounded-lg border-2 border-army-red-200 p-5 flex items-start space-x-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-10">
                  <Shield className="h-16 w-16 text-army-red-800" />
                </div>
                <div className="bg-army-red-600 p-2.5 rounded-full text-white z-10">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="z-10">
                  <h4 className="font-bold text-army-red-800 text-sm uppercase tracking-tight">
                    Rapid Response Protocol
                  </h4>
                  <p className="text-xs text-army-red-700 mt-1 leading-normal">
                    AI-confirmed breaches trigger automatic email alerts to{' '}
                    <span className="font-bold">sidd902003@gmail.com</span> with a captured frame.
                    60-second cooldown per object class.
                  </p>
                </div>
              </div>

              {/* Dispatch log */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-army-green-700">
                <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                  <h3 className="font-headline font-bold text-sm flex items-center text-army-green-800 uppercase">
                    <Bell className="h-4 w-4 mr-2" />Alert Dispatch Log
                  </h3>
                  <span className="text-[10px] font-mono text-army-green-600 bg-army-khaki-100 px-2 py-0.5 rounded">
                    {dispatchLog.length} records
                  </span>
                </div>
                <div className="p-3 max-h-72 overflow-y-auto space-y-3 custom-scrollbar">
                  {dispatchLog.length > 0 ? dispatchLog.map((entry) => (
                    <div key={entry.id} className="flex gap-3 items-start p-2 border-l-2 border-army-green-600 bg-army-khaki-50/50 rounded-r">
                      {entry.frameUrl && (
                        <img
                          src={backendUrl(entry.frameUrl)}
                          alt="frame"
                          className="w-16 h-12 object-cover rounded border border-gray-200 flex-shrink-0"
                        />
                      )}
                      <div className="text-[10px] font-mono flex-1 min-w-0">
                        <div className="flex justify-between text-army-green-800 font-bold mb-0.5">
                          <span className="uppercase truncate">{entry.cls}</span>
                          <span className="ml-2 flex-shrink-0">{entry.timestamp}</span>
                        </div>
                        <div className="text-gray-500">Conf: <span className="text-army-green-700 font-bold">{entry.conf}%</span></div>
                        <div className="text-gray-400 truncate">{entry.location}</div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[10px] text-center text-gray-400 italic py-4">
                      Awaiting first tactical detection…
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SurveillancePage;
