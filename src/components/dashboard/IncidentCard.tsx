import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle, MapPin, User, Clock } from 'lucide-react';
import { BorderIncident } from '../../types';
import { Link } from 'react-router-dom';
import { mockUsers } from '../../data/mockData';

interface IncidentCardProps {
  incident: BorderIncident;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ incident }) => {
  const getStatusBadge = (status: BorderIncident['status']) => {
    switch (status) {
      case 'reported':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">Reported</span>;
      case 'investigating':
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">Investigating</span>;
      case 'resolved':
        return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">Resolved</span>;
      case 'false-alarm':
        return <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded">False Alarm</span>;
      default:
        return null;
    }
  };
  
  const getSeverityIcon = (severity: BorderIncident['severity']) => {
    switch (severity) {
      case 'critical':
        return <span className="flex items-center text-army-red-600"><AlertTriangle className="h-4 w-4 mr-1" /> Critical</span>;
      case 'high':
        return <span className="flex items-center text-orange-600"><AlertTriangle className="h-4 w-4 mr-1" /> High</span>;
      case 'medium':
        return <span className="flex items-center text-amber-600"><AlertTriangle className="h-4 w-4 mr-1" /> Medium</span>;
      case 'low':
        return <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Low</span>;
      default:
        return null;
    }
  };
  
  const getReporterName = (reportedBy: string) => {
    const reporter = mockUsers.find(user => user.id === reportedBy);
    return reporter ? reporter.name : 'Unknown Officer';
  };

  const hasUpdates = incident.updates.length > 0;
  const latestUpdate = hasUpdates ? incident.updates[incident.updates.length - 1] : null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className={`p-1 text-center text-xs font-semibold text-white ${
        incident.severity === 'critical' ? 'bg-army-red-600' :
        incident.severity === 'high' ? 'bg-orange-500' :
        incident.severity === 'medium' ? 'bg-amber-500' : 'bg-green-600'
      }`}>
        {incident.severity.toUpperCase()} PRIORITY
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{incident.title}</h3>
          {getStatusBadge(incident.status)}
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{incident.description}</p>
        
        <div className="flex flex-col space-y-2 text-xs text-gray-500 mb-3">
          {incident.location && (
            <div className="flex items-center">
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              <span>Coordinates: {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}</span>
            </div>
          )}
          <div className="flex items-center">
            <User className="h-3.5 w-3.5 mr-1.5" />
            <span>Reported by: {getReporterName(incident.reportedBy)}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            <span>Reported: {formatDistanceToNow(new Date(incident.reportedAt), { addSuffix: true })}</span>
          </div>
        </div>
        
        {latestUpdate && (
          <div className="bg-gray-50 p-2 rounded-md mb-3 text-xs">
            <p className="font-medium">Latest Update:</p>
            <p className="text-gray-700">{latestUpdate.content.substring(0, 100)}{latestUpdate.content.length > 100 ? '...' : ''}</p>
          </div>
        )}
        
        <div className="flex justify-between items-center border-t pt-3">
          <div>{getSeverityIcon(incident.severity)}</div>
          <Link 
            to={`/incidents/${incident.id}`}
            className="text-xs bg-army-green-600 hover:bg-army-green-700 text-white py-1 px-3 rounded transition-colors duration-200"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default IncidentCard;