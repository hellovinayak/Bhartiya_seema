import React, { useRef, useEffect, useState } from 'react';
import { Shield, Video, Camera, Settings, Bell, Upload, Play, Pause, Square } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAlerts } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

const SurveillancePage: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const deviceLocation = useRef<{lat: number, lng: number} | null>(null);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.watchPosition((pos) => {
                deviceLocation.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                console.log("📍 GPS Lock:", pos.coords.latitude, pos.coords.longitude);
            }, (err) => {
                console.warn("Geolocation denied or error", err);
                // Do NOT use a fake fallback — leave as null so it shows "Location Unavailable"
                deviceLocation.current = null;
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }
    }, []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isBackendReady, setIsBackendReady] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [videoSourceUrl, setVideoSourceUrl] = useState<string | null>(null);
    const [objectCounts, setObjectCounts] = useState<Record<string, number>>({});
    const [isLive, setIsLive] = useState(true);
    const [adminReports, setAdminReports] = useState<any[]>([]);
    const [sessionStats, setSessionStats] = useState({ total_people: 0, total_vehicles: 0 });
    const lastEmailTime = useRef(0);
    const { addAlert } = useAlerts();
    const { user } = useAuth();

    // Check if backend is alive
    useEffect(() => {
        const checkBackend = async () => {
            try {
                const response = await fetch('http://localhost:8000/docs'); // Simple health check
                if (response.ok) setIsBackendReady(true);
            } catch (err) {
                console.warn('Backend not detected. Make sure to run the Python server.');
                setIsBackendReady(false);
            }
        };
        checkBackend();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
            if (videoSourceUrl) {
                URL.revokeObjectURL(videoSourceUrl);
            }
        };
    }, [stream, videoSourceUrl]);

    const startCamera = async () => {
        try {
            stopVideo();
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(mediaStream);
            setIsLive(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.src = '';
            }
            setIsDetecting(true);
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            setStream(null);
        }
        setIsDetecting(false);
    };

    const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            stopCamera();
            if (videoSourceUrl) {
                URL.revokeObjectURL(videoSourceUrl);
            }
            const url = URL.createObjectURL(file);
            setVideoSourceUrl(url);
            setIsLive(false);

            if (videoRef.current) {
                videoRef.current.srcObject = null;
                videoRef.current.src = url;
                videoRef.current.onloadedmetadata = () => {
                    setIsDetecting(true);
                };
            }
        }
    };

    const stopVideo = () => {
        if (videoSourceUrl) {
            setVideoSourceUrl(null);
            if (videoRef.current) {
                videoRef.current.src = '';
            }
        }
        setIsDetecting(false);
    };

    const detectObjects = async () => {
        if (videoRef.current && canvasRef.current && isDetecting) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (!ctx || video.paused || video.ended) {
                return;
            }

            // Ensure canvas matches video dimensions
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            // Capture current frame from video
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = video.videoWidth;
            offscreenCanvas.height = video.videoHeight;
            const offscreenCtx = offscreenCanvas.getContext('2d');
            if (!offscreenCtx) return;
            offscreenCtx.drawImage(video, 0, 0);

            // Convert frame to Blob
            offscreenCanvas.toBlob(async (blob) => {
                if (!blob) return;

                const formData = new FormData();
                formData.append('file', blob, 'frame.jpg');

                try {
                    // Send frame to Backend
                    const response = await fetch('http://localhost:8000/detect', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) throw new Error('Backend error');

                    const data = await response.json();

                    if (data.counts) {
                        setObjectCounts(data.counts);

                        // Auto-send report to admin when detections occur (with cooldown)
                        const hasDetections = Object.values(data.counts).some((count: any) => count > 0);
                        if (hasDetections && Date.now() - lastEmailTime.current > 30000) { // 30 second cooldown
                            lastEmailTime.current = Date.now();
                            sendReportToAdmin();
                            // Realtime UI updates are automatically handled by AlertContext mapping
                        }
                    } else {
                        setObjectCounts({});
                    }

                    // Clear canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    const predictions = data.predictions || [];
                    
                    predictions.forEach((prediction: any) => {
                        const [x, y, width, height] = prediction.bbox;
                        
                        // Pick color based on entity type
                        let color = '#3b82f6'; // default blue
                        if (prediction.class === 'person') color = '#10b981'; // green person
                        else if (['car', 'truck', 'motorcycle', 'bus'].includes(prediction.class)) color = '#ef4444'; // red vehicle
                        else if (prediction.class === 'bicycle') color = '#f59e0b'; // orange bike
                        
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x, y, width, height);
                        
                        // Draw Label Base
                        ctx.fillStyle = `${color}33`; // Add 20% opacity background
                        ctx.fillRect(x, y > 15 ? y - 15 : 0, ctx.measureText(`${prediction.class.toUpperCase()}: ${Math.round(prediction.score * 100)}%`).width + 4, 15);
                        
                        // Draw Text
                        ctx.fillStyle = color;
                        ctx.font = 'bold 10px monospace';
                        ctx.fillText(`${prediction.class.toUpperCase()}: ${Math.round(prediction.score * 100)}%`, x + 2, y > 15 ? y - 4 : 11);
                    });

                } catch (err) {
                    console.error('Detection error:', err);
                }

                // Schedule next frame
                if (isDetecting) {
                    requestAnimationFrame(detectObjects);
                }
            }, 'image/jpeg', 0.6); // Lower quality for faster transport
        }
    };

    useEffect(() => {
        if (isDetecting && isBackendReady) {
            detectObjects();

            // Poll for session stats
            const statsInterval = setInterval(async () => {
                try {
                    const res = await fetch('http://localhost:8000/stats');
                    if (res.ok) {
                        const data = await res.json();
                        setSessionStats(data);
                    }
                } catch (e) { }
            }, 2000);
            return () => clearInterval(statsInterval);
        }
    }, [isDetecting, isBackendReady]);

    // Report sending - manual button only
    // Removed automatic 5-second reporting

    const sendReportToAdmin = async () => {
        // Get latest stats from backend
        let currentStats = { total_people: 0, total_vehicles: 0 };
        try {
            const res = await fetch('http://localhost:8000/stats');
            if (res.ok) {
                currentStats = await res.json();
            }
        } catch (e) { console.error('Failed to fetch stats', e); }

        const report = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            counts: { ...objectCounts },
            location: 'Sector 7G',
            lat: deviceLocation.current?.lat,
            lng: deviceLocation.current?.lng,
            total_people: currentStats.total_people,
            total_vehicles: currentStats.total_vehicles
        };

        try {
            await fetch('http://localhost:8000/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report)
            });
            setAdminReports(prev => [report, ...prev].slice(0, 10));
        } catch (err) {
            console.error('Failed to send report to backend:', err);
        }

        console.log("TACTICAL REPORT DISPATCHED:", report);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow bg-army-khaki-50 py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-8">

                        <div className="lg:w-2/3">
                            <div className="bg-army-green-800 rounded-lg shadow-army overflow-hidden relative border-2 border-army-gold/30">
                                <div className="flex items-center justify-between p-4 bg-army-green-900 border-b border-army-gold/20">
                                    <div className="flex items-center space-x-2">
                                        <Video className="h-5 w-5 text-army-gold" />
                                        <h2 className="text-white font-headline font-bold">
                                            {isLive ? 'Surveillance Feed - Sector 7G' : 'Video Analysis Mode'}
                                        </h2>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {isDetecting && (
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        )}
                                        <span className={`${isLive ? 'text-red-500' : 'text-army-gold'} text-xs font-bold tracking-widest`}>
                                            {isLive ? 'LIVE' : 'ANALYSIS'}
                                        </span>
                                    </div>
                                </div>

                                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                                    {(!stream && !videoSourceUrl) && (
                                        <div className="text-center p-8 z-10">
                                            <Camera className="h-16 w-16 text-army-khaki-400 mx-auto mb-4 opacity-50" />
                                            <p className="text-army-khaki-200 mb-6 font-medium">Select a surveillance source to begin monitoring</p>

                                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                                <button
                                                    onClick={startCamera}
                                                    disabled={!isBackendReady}
                                                    className="btn btn-primary flex items-center justify-center space-x-2 px-6"
                                                >
                                                    <Camera className="h-4 w-4" />
                                                    <span>Use Live Camera</span>
                                                </button>

                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={!isBackendReady}
                                                    className="btn btn-secondary flex items-center justify-center space-x-2 px-6"
                                                >
                                                    <Upload className="h-4 w-4" />
                                                    <span>Upload Video File</span>
                                                </button>
                                            </div>

                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleVideoUpload}
                                                accept="video/*"
                                                className="hidden"
                                            />

                                            {!isBackendReady && (
                                                <div className="mt-8 flex flex-col items-center">
                                                    <div className="p-4 bg-army-red-900/40 rounded border border-army-red-500/50">
                                                        <p className="text-xs text-red-400 font-mono text-center">
                                                            OFFLINE: BACKEND AI SERVER NOT DETECTED<br />
                                                            <span className="text-[10px] opacity-70">Run `python backend/main.py` to start the YOLO engine</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        loop={!isLive}
                                        playsInline
                                        muted
                                        onPlay={() => {
                                            if (isDetecting && isBackendReady) {
                                                detectObjects();
                                            }
                                        }}
                                        className={`w-full h-full object-contain ${(!stream && !videoSourceUrl) ? 'hidden' : 'block'}`}
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
                                    />
                                </div>

                                {(stream || videoSourceUrl) && (
                                    <div className="p-4 bg-army-green-900 border-t border-army-gold/20 flex items-center justify-between">
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={isLive ? stopCamera : stopVideo}
                                                className="btn bg-army-red-600 hover:bg-army-red-700 text-white text-xs py-2 flex items-center"
                                            >
                                                <Square className="h-3 w-3 mr-1.5 fill-current" />
                                                Stop Monitoring
                                            </button>

                                            {!isLive && videoRef.current && (
                                                <button
                                                    onClick={() => {
                                                        if (videoRef.current?.paused) {
                                                            videoRef.current.play();
                                                        } else {
                                                            videoRef.current?.pause();
                                                        }
                                                    }}
                                                    className="btn bg-army-gold hover:bg-army-gold/80 text-army-green-900 text-xs py-2 flex items-center font-bold"
                                                >
                                                    {videoRef.current?.paused ? (
                                                        <><Play className="h-3 w-3 mr-1.5 fill-current" /> Play</>
                                                    ) : (
                                                        <><Pause className="h-3 w-3 mr-1.5 fill-current" /> Pause</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-army-khaki-300 text-[10px] font-mono flex flex-col items-end">
                                            <span>COORD: 34.0479° N, 74.8103° E</span>
                                            <span className="text-army-gold">SYS_TIME: {new Date().toLocaleTimeString()} IST</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="lg:w-1/3 space-y-6">
                            <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-army-gold">
                                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-headline font-bold text-lg flex items-center text-army-green-800">
                                        <Settings className="h-5 w-5 mr-2" />
                                        Detection Control
                                    </h3>
                                    {!isLive && videoSourceUrl && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-xs text-army-green-600 hover:underline font-bold"
                                        >
                                            Change Video
                                        </button>
                                    )}
                                </div>
                                <div className="p-6 space-y-6">

                                    {isDetecting && (
                                        <div className="space-y-3 pt-2">
                                            <h4 className="text-xs font-bold text-army-green-700 uppercase tracking-widest border-b border-army-green-100 pb-1 flex justify-between">
                                                <span>Live Detection Stats</span>
                                                <span className="animate-pulse text-red-600">● LIVE</span>
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {Object.entries(objectCounts).length > 0 ? (
                                                    Object.entries(objectCounts).map(([label, count]) => (
                                                        <div key={label} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 uppercase font-mono">
                                                            <span className="text-[10px] font-bold text-gray-600">{label}</span>
                                                            <span className="text-xs font-black text-army-green-800 bg-army-gold/20 px-2 py-0.5 rounded">
                                                                {count.toString().padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 italic">Scanning sector for signatures...</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Telemetry Status</h4>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase">Engine</span>
                                                <span className={`text-xs font-bold ${isBackendReady ? 'text-army-green-700' : 'text-army-red-600'}`}>
                                                    {isBackendReady ? 'YOLOv8 BACKEND' : 'OFFLINE'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase">Alerts</span>
                                                <span className="text-xs text-green-600 font-bold uppercase">Linked</span>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-army-khaki-100 rounded border border-army-gold/30">
                                            <h5 className="text-[10px] font-black text-army-green-800 uppercase mb-2 border-b border-army-gold/20 pb-1">Mission Session Totals</h5>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-army-green-700">TOTAL PEOPLE</span>
                                                <span className="text-sm font-black text-army-green-900">{sessionStats.total_people.toString().padStart(3, '0')}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-army-green-700">TOTAL VEHICLES</span>
                                                <span className="text-sm font-black text-army-green-900">{sessionStats.total_vehicles.toString().padStart(3, '0')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-army-red-50 rounded-lg border-2 border-army-red-200 p-5 flex items-start space-x-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 opacity-10">
                                    <Shield className="h-16 w-16 text-army-red-800" />
                                </div>
                                <div className="bg-army-red-600 p-2.5 rounded-full text-white z-10">
                                    <Bell className="h-5 w-5" />
                                </div>
                                <div className="z-10">
                                    <h4 className="font-bold text-army-red-800 text-sm uppercase tracking-tight">Rapid Response Protocol</h4>
                                    <p className="text-xs text-army-red-700 mt-1 leading-normal">
                                        AI-confirmed breaches are serialized and transmitted via secure link to Battalion Command (Sector 7G).
                                    </p>
                                </div>
                            </div>

                            {/* Admin Dispatch Log */}
                            <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-army-green-700">
                                <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-headline font-bold text-sm flex items-center text-army-green-800 uppercase">
                                        <Bell className="h-4 w-4 mr-2" />
                                        Admin Report
                                    </h3>
                                    <span className="text-[10px] font-mono text-army-green-600 bg-army-khaki-100 px-2 py-0.5 rounded">
                                        Auto-sending
                                    </span>
                                </div>
                                <div className="p-4 max-h-60 overflow-y-auto space-y-3 custom-scrollbar">
                                    {adminReports.length > 0 ? (
                                        adminReports.map((report) => (
                                            <div key={report.id} className="p-2 border-l-2 border-army-green-600 bg-army-khaki-50/50 rounded-r text-[10px] font-mono">
                                                <div className="flex justify-between text-army-green-800 font-bold mb-1">
                                                    <span>DISPATCH #{report.id.toString().slice(-4)}</span>
                                                    <span>{report.timestamp}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-gray-600">
                                                    {Object.entries(report.counts).length > 0 ? (
                                                        Object.entries(report.counts as Record<string, number>).map(([cls, count]) => (
                                                            <span key={cls}>{cls.toUpperCase()}: {count}</span>
                                                        ))
                                                    ) : (
                                                        <span className="italic">NO TARGETS DETECTED</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-center text-gray-400 italic py-4">Awaiting first tactical report...</p>
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
