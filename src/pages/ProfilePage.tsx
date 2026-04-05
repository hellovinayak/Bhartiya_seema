import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Mail, Shield, MapPin, Save, Camera } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: '555-123-4567', // Mock data
    unit: user.unit,
    rank: user.rank,
    location: {
      lat: user.location.lat,
      lng: user.location.lng
    }
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleLocationChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [field]: numValue
        }
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API call to update profile
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-headline font-bold text-army-green-800 mb-6">My Profile</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3">
                  <h2 className="text-lg font-headline font-semibold">Profile Information</h2>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="form-label flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="form-input"
                        value={formData.name}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="form-label flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-input"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className="form-input"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="rank" className="form-label flex items-center">
                        <Shield className="h-4 w-4 mr-1" />
                        Rank
                      </label>
                      <select
                        id="rank"
                        name="rank"
                        className="form-input"
                        value={formData.rank}
                        onChange={handleChange}
                      >
                        <option value="Lieutenant">Lieutenant</option>
                        <option value="Captain">Captain</option>
                        <option value="Major">Major</option>
                        <option value="Lieutenant Colonel">Lieutenant Colonel</option>
                        <option value="Colonel">Colonel</option>
                        <option value="Brigadier">Brigadier</option>
                        <option value="Major General">Major General</option>
                        <option value="Lieutenant General">Lieutenant General</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="unit" className="form-label">Unit/Division</label>
                    <input
                      type="text"
                      id="unit"
                      name="unit"
                      className="form-input"
                      value={formData.unit}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Current Location
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="latitude" className="form-label text-xs">Latitude</label>
                        <input
                          type="number"
                          id="latitude"
                          step="0.0001"
                          className="form-input"
                          value={formData.location.lat}
                          onChange={(e) => handleLocationChange('lat', e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="longitude" className="form-label text-xs">Longitude</label>
                        <input
                          type="number"
                          id="longitude"
                          step="0.0001"
                          className="form-input"
                          value={formData.location.lng}
                          onChange={(e) => handleLocationChange('lng', e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      These coordinates will be used to determine which alerts you receive based on proximity.
                    </p>
                  </div>
                  
                  {success && (
                    <div className="alert-success">
                      Profile updated successfully!
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="btn btn-primary w-full flex items-center justify-center"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            
            <div>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-3">
                  <h2 className="text-lg font-headline font-semibold">Profile Picture</h2>
                </div>
                <div className="p-6 flex flex-col items-center">
                  <div className="relative mb-4">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=random`}
                      alt={user.name}
                      className="rounded-full h-40 w-40 object-cover"
                    />
                    <button className="absolute bottom-0 right-0 bg-army-green-600 text-white p-2 rounded-full shadow-md hover:bg-army-green-700 transition-colors">
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-gray-600 mb-4">{user.rank}, {user.unit}</p>
                  
                  <div className="w-full border-t pt-4 mt-2">
                    <h3 className="text-sm font-semibold mb-3">Account Security</h3>
                    <button className="w-full btn btn-secondary mb-2">
                      Change Password
                    </button>
                    <button className="w-full btn btn-secondary">
                      Enable Two-Factor Auth
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
                <div className="border-b px-6 py-3">
                  <h2 className="text-lg font-headline font-semibold">Account Status</h2>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Account Type:</span>
                      <span className="font-medium">Military Personnel</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Access Level:</span>
                      <span className="font-medium capitalize">{user.role}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-green-600">Active</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Last Login:</span>
                      <span className="font-medium">Today, 08:45 AM</span>
                    </li>
                  </ul>
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

export default ProfilePage;