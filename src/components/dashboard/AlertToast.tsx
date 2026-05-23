/**
 * AlertToast.tsx
 * Animated popup notification that appears whenever a new YOLO alert fires.
 * Displays the detected class, confidence, and a thumbnail of the captured frame.
 * Auto-dismisses after 8 seconds; also dismissable by the user.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export interface AlertToastData {
  id:          string;
  cls:         string;
  confidence:  number;   // 0-1
  frameUrl:    string | null;
  timestamp:   string;
}

interface Props {
  alerts: AlertToastData[];
  onDismiss: (id: string) => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  person:     'from-red-900/95 border-red-500',
  car:        'from-orange-900/95 border-orange-500',
  truck:      'from-orange-900/95 border-orange-500',
  bus:        'from-orange-900/95 border-orange-500',
  motorcycle: 'from-yellow-900/95 border-yellow-500',
  _default:   'from-slate-900/95 border-slate-500',
};

const BACKEND = 'http://localhost:8000';

const AlertToast: React.FC<Props> = ({ alerts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => (
        <SingleToast
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

const SingleToast: React.FC<{ alert: AlertToastData; onDismiss: (id: string) => void }> = ({
  alert, onDismiss,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 50);
    // Auto-dismiss after 8 s
    const t2 = setTimeout(() => onDismiss(alert.id), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [alert.id, onDismiss]);

  const colorClass = SEVERITY_COLOR[alert.cls] ?? SEVERITY_COLOR._default;
  const frameUrl   = alert.frameUrl ? `${BACKEND}${alert.frameUrl}` : null;

  return (
    <div
      className={`pointer-events-auto bg-gradient-to-br ${colorClass} border rounded-xl shadow-2xl
        overflow-hidden transition-all duration-500 ease-out
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400 animate-pulse" />
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
            Border Alert
          </span>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="captured frame"
            className="w-20 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-14 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/10">
            <AlertTriangle className="h-6 w-6 text-slate-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white uppercase tracking-wide truncate">
            {alert.cls} detected
          </p>
          <p className="text-xs text-slate-300 mt-0.5">
            Confidence: <span className="text-red-300 font-bold">{Math.round(alert.confidence * 100)}%</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">{alert.timestamp}</p>
        </div>
      </div>

      {/* Progress bar auto-dismiss indicator */}
      <div className="h-0.5 bg-black/20">
        <div
          className="h-full bg-red-500 animate-[shrink_8s_linear_forwards]"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default AlertToast;
