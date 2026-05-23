import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAlerts } from '../../contexts/AlertContext';

const RealtimeToast: React.FC = () => {
  const { alerts, markAsRead } = useAlerts();
  const [visibleAlertId, setVisibleAlertId] = useState<string | null>(null);
  const alert = alerts.find((item) => item.id === visibleAlertId);

  useEffect(() => {
    const newest = alerts[0];
    if (newest && !newest.read) {
      setVisibleAlertId(newest.id);
      const timer = window.setTimeout(() => setVisibleAlertId(null), 7000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [alerts]);

  if (!alert) return null;

  return (
    <div className="fixed right-4 top-24 z-[9999] w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-army-gold/50 bg-army-green-900 text-white shadow-army-lg overflow-hidden">
      <div className="stripe-tricolour" />
      <div className="p-4 flex gap-3">
        <div className="mt-1 text-army-gold">
          <AlertTriangle className="h-5 w-5 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-army-gold font-bold">Live Detection Alert</p>
          <h3 className="font-headline font-bold text-lg leading-tight truncate">{alert.title}</h3>
          <p className="text-xs text-army-khaki-200 line-clamp-2">{alert.message}</p>
          <p className="text-[10px] text-army-khaki-300 mt-2">{alert.zone || 'Unassigned sector'} · {alert.confidence || 0}% confidence</p>
        </div>
        <button
          className="text-army-khaki-300 hover:text-white"
          onClick={() => {
            markAsRead(alert.id);
            setVisibleAlertId(null);
          }}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default RealtimeToast;
