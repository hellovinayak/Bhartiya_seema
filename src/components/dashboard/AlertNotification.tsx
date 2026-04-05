import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import { Alert } from '../../types';
import { useAlerts } from '../../contexts/AlertContext';
import { Link } from 'react-router-dom';

interface AlertNotificationProps {
  alert: Alert;
}

const AlertNotification: React.FC<AlertNotificationProps> = ({ alert }) => {
  const { markAsRead } = useAlerts();
  
  const handleMarkAsRead = () => {
    markAsRead(alert.id);
  };
  
  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-army-red-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium':
        return <Info className="h-5 w-5 text-amber-500" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getSeverityClass = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-army-red-600 bg-army-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-amber-500 bg-amber-50';
      case 'low':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  return (
    <div 
      className={`p-4 border-l-4 rounded-md shadow-sm mb-3 transition-all duration-200 ${
        alert.read ? 'opacity-70' : 'opacity-100'
      } ${getSeverityClass(alert.severity)}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {getSeverityIcon(alert.severity)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className="text-gray-900 font-medium text-sm">{alert.title}</h4>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
          <div className="mt-2 flex justify-between items-center">
            <Link 
              to={`/incidents/${alert.incidentId}`}
              className="text-xs font-medium text-army-green-700 hover:text-army-green-900"
              onClick={handleMarkAsRead}
            >
              View Details
            </Link>
            {!alert.read && (
              <button 
                onClick={handleMarkAsRead}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertNotification;