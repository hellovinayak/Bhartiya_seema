import React, { useState } from 'react';
import { MapPin, Camera, Video, AlertTriangle, Send } from 'lucide-react';
import { GeoLocation } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface NewIncidentFormProps {
  onSubmit: (formData: {
    title: string;
    description: string;
    location: GeoLocation;
    severity: 'low' | 'medium' | 'high' | 'critical';
    media?: { type: 'image' | 'video'; url: string; caption?: string }[];
  }) => void;
  initialLocation?: GeoLocation;
}

const NewIncidentForm: React.FC<NewIncidentFormProps> = ({ onSubmit, initialLocation }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [location, setLocation] = useState<GeoLocation>(initialLocation || (user ? user.location : { lat: 32.7177, lng: 74.8573 }));
  const [mediaItems, setMediaItems] = useState<{ type: 'image' | 'video'; url: string; caption: string }[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  
  const handleAddMedia = () => {
    if (mediaUrl) {
      setMediaItems([...mediaItems, { type: mediaType, url: mediaUrl, caption: mediaCaption }]);
      setMediaUrl('');
      setMediaCaption('');
    }
  };
  
  const handleRemoveMedia = (index: number) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      location,
      severity,
      media: mediaItems.length > 0 ? mediaItems : undefined,
    });
  };
  
  const handleLocationChange = (fieldName: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setLocation({ ...location, [fieldName]: numValue });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-army-green-700 p-3">
        <h2 className="text-white text-lg font-bold flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Report New Incident
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="title" className="form-label">Incident Title *</label>
            <input
              type="text"
              id="title"
              className="form-input"
              placeholder="Brief title describing the incident"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="form-label">Description *</label>
            <textarea
              id="description"
              rows={4}
              className="form-input"
              placeholder="Detailed description of the incident..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label htmlFor="severity" className="form-label">Severity *</label>
            <select
              id="severity"
              className="form-input"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          <div>
            <label className="form-label flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              Location *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="form-label text-xs">Latitude</label>
                <input
                  type="number"
                  id="latitude"
                  step="0.0001"
                  className="form-input"
                  value={location.lat}
                  onChange={(e) => handleLocationChange('lat', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="longitude" className="form-label text-xs">Longitude</label>
                <input
                  type="number"
                  id="longitude"
                  step="0.0001"
                  className="form-input"
                  value={location.lng}
                  onChange={(e) => handleLocationChange('lng', e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current coordinates from your device. Modify if the incident is at a different location.
            </p>
          </div>
          
          <div>
            <label className="form-label flex items-center">
              {mediaType === 'image' ? (
                <Camera className="h-4 w-4 mr-1" />
              ) : (
                <Video className="h-4 w-4 mr-1" />
              )}
              Add Media (Optional)
            </label>
            <div className="grid grid-cols-1 gap-3 p-3 border rounded-md bg-gray-50">
              <div className="flex space-x-2">
                <button
                  type="button"
                  className={`btn text-xs ${mediaType === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMediaType('image')}
                >
                  <Camera className="h-3 w-3 mr-1" /> Image
                </button>
                <button
                  type="button"
                  className={`btn text-xs ${mediaType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMediaType('video')}
                >
                  <Video className="h-3 w-3 mr-1" /> Video
                </button>
              </div>
              
              <div>
                <label htmlFor="mediaUrl" className="form-label text-xs">URL</label>
                <input
                  type="text"
                  id="mediaUrl"
                  className="form-input"
                  placeholder={mediaType === 'image' ? "Image URL" : "Video URL (YouTube, Vimeo)"}
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="mediaCaption" className="form-label text-xs">Caption</label>
                <input
                  type="text"
                  id="mediaCaption"
                  className="form-input"
                  placeholder="Brief description of the media"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                />
              </div>
              
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={handleAddMedia}
                disabled={!mediaUrl}
              >
                Add
              </button>
            </div>
          </div>
          
          {mediaItems.length > 0 && (
            <div>
              <label className="form-label">Added Media</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mediaItems.map((item, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded-md border">
                    <div className="flex-1">
                      <p className="text-xs font-medium truncate">{item.type}: {item.url}</p>
                      {item.caption && <p className="text-xs text-gray-500">{item.caption}</p>}
                    </div>
                    <button
                      type="button"
                      className="text-army-red-600 hover:text-army-red-800"
                      onClick={() => handleRemoveMedia(index)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <button type="submit" className="btn btn-primary w-full flex items-center justify-center">
              <Send className="h-4 w-4 mr-1" />
              Submit Incident Report
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewIncidentForm;