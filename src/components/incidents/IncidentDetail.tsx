import React, { useState, useEffect } from 'react';
import { BorderIncident } from '../../types';
import { format } from 'date-fns';
import { User, Clock, MapPin, Target, CheckCircle2, AlertOctagon } from 'lucide-react';
import { mockUsers } from '../../data/mockData';
import { MapContainer, Marker, TileLayer, Circle } from 'react-leaflet';

interface IncidentDetailProps {
  incident: BorderIncident;
  onAddUpdate: (content: string, status?: BorderIncident['status']) => void;
}

const IncidentDetail: React.FC<IncidentDetailProps> = ({ incident, onAddUpdate }) => {
  const [locationName, setLocationName] = useState<string>('Detecting coordinate signature...');

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
                setLocationName('Remote Sector (Unmapped)');
            }
        })
        .catch(() => setLocationName('GPS Signal Blocked'));
    }
  }, [incident.location]);
  const getSeverityBadge = (severity: BorderIncident['severity']) => {
    switch (severity) {
      case 'critical':
        return <span className="bg-army-red-100 text-army-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">Critical</span>;
      case 'high':
        return <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded">High</span>;
      case 'medium':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded">Medium</span>;
      case 'low':
        return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">Low</span>;
      default:
        return null;
    }
  };
  
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
  
  const getReporterName = (reportedBy: string) => {
    const reporter = mockUsers.find(user => user.id === reportedBy);
    return reporter ? reporter.name : 'Unknown Officer';
  };
  
  const getAssigneeName = (assignedTo?: string) => {
    if (!assignedTo) return 'Unassigned';
    const assignee = mockUsers.find(user => user.id === assignedTo);
    return assignee ? assignee.name : 'Unknown Officer';
  };
  
  // streamlined tactical actions remove need for manual form submission
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className={`p-2 text-center text-white ${
        incident.severity === 'critical' ? 'bg-army-red-600' :
        incident.severity === 'high' ? 'bg-orange-500' :
        incident.severity === 'medium' ? 'bg-amber-500' : 'bg-green-600'
      }`}>
        <h2 className="text-lg font-bold">{incident.title}</h2>
      </div>
      
      <div className="p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {getSeverityBadge(incident.severity)}
          {getStatusBadge(incident.status)}
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-gray-700">{incident.description}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">Incident Details</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 text-army-green-700 flex-shrink-0" />
                <div>
                  <p className="text-gray-800 font-bold">📍 Coordinates: <span className="text-blue-700">{incident.location?.lat.toFixed(4) || 'N/A'}, {incident.location?.lng.toFixed(4) || 'N/A'}</span></p>
                  <p className="text-emerald-700 font-bold mt-1">🗺️ Location: <span className="uppercase tracking-wide">{locationName}</span></p>
                </div>
              </li>
              <li className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-army-green-700" />
                <span className="text-gray-700">Reported: {format(new Date(incident.reportedAt), 'PPp')}</span>
              </li>
              <li className="flex items-center">
                <User className="h-4 w-4 mr-2 text-army-green-700" />
                <span className="text-gray-700">Reported by: {getReporterName(incident.reportedBy)}</span>
              </li>
              <li className="flex items-center">
                <User className="h-4 w-4 mr-2 text-army-green-700" />
                <span className="text-gray-700">Assigned to: {getAssigneeName(incident.assignedTo)}</span>
              </li>
              <li className="flex items-center">
                <Target className="h-4 w-4 mr-2 text-army-green-700" />
                <span className="text-gray-700">Object: {incident.objectType || incident.type || 'Unknown'} · Confidence: {incident.aiConfidence || 0}%</span>
              </li>
              <li className="flex items-center">
                <AlertOctagon className="h-4 w-4 mr-2 text-army-green-700" />
                <span className="text-gray-700">Severity Score: {incident.severityScore || 0}/100 · Zone: {incident.zone || 'Unassigned'}</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">Map Location</h3>
            {incident.location ? (
              <div className="h-64 rounded overflow-hidden border">
                <MapContainer center={[incident.location.lat, incident.location.lng]} zoom={13} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Circle
                    center={[incident.location.lat, incident.location.lng]}
                    radius={600}
                    pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.16 }}
                  />
                  <Marker position={[incident.location.lat, incident.location.lng]} />
                </MapContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No coordinates attached.</p>
            )}
          </div>
        </div>

        {incident.media && incident.media.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Uploaded Evidence</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incident.media.map((media) => (
                <div key={media.id} className="border rounded-lg overflow-hidden bg-gray-50">
                  {media.type === 'image' ? (
                    <img src={media.url} alt={media.caption || 'Incident evidence'} className="w-full h-48 object-cover" />
                  ) : (
                    <video src={media.url} controls className="w-full h-48 object-cover" />
                  )}
                  <div className="p-3 text-xs text-gray-600">{media.caption || 'Uploaded media'} · {format(new Date(media.timestamp), 'PPp')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <button 
            onClick={() => onAddUpdate("Dispatched nearest field officer to investigate the sector coordinates.", "investigating")}
            className="flex-1 bg-blue-600/90 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30 uppercase tracking-wide text-sm"
          >
            <Target className="mr-2 h-5 w-5" />
            Dispatch Officer
          </button>
          
          <button 
            onClick={() => onAddUpdate("Sector declared ALL CLEAR. No hostile presence found.", "resolved")}
            className="flex-1 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(5,150,105,0.4)] border border-emerald-400/30 uppercase tracking-wide text-sm"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Area CLEAR
          </button>

          <button 
            onClick={() => onAddUpdate("Sector is NOT CLEAR. Hostile contact confirmed.", "investigating")}
            className="flex-1 bg-red-600/90 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-400/30 uppercase tracking-wide text-sm"
          >
            <AlertOctagon className="mr-2 h-5 w-5" />
            Area NOT CLEAR
          </button>
        </div>
        
        {incident.updates.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Updates</h3>
            <div className="border-l-2 border-gray-200 pl-4 space-y-4">
              {incident.updates.map(update => {
                const updater = mockUsers.find(user => user.id === update.updatedBy);
                return (
                  <div key={update.id} className="relative">
                    <div className="absolute -left-6 mt-1 h-3 w-3 rounded-full bg-army-green-500"></div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        {updater?.name || 'Unknown'} ({updater?.rank})
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(update.timestamp), 'PPp')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{update.content}</p>
                    {update.status && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">Status changed to: </span>
                        {getStatusBadge(update.status)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default IncidentDetail;
