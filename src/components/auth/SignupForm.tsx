import React, { useState } from 'react';
import { Mail, Lock, User, UserPlus, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const SignupForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rank: '',
    unit: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const { signup, loading, error } = useAuth();
  const navigate = useNavigate();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when field is changed
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.rank.trim()) {
      errors.rank = 'Rank is required';
    }
    
    if (!formData.unit.trim()) {
      errors.unit = 'Unit is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const userData = {
      name: formData.name,
      email: formData.email,
      rank: formData.rank,
      unit: formData.unit,
      location: { lat: 32.7177, lng: 74.8573 }, // Default location
    };
    
    const success = await signup(userData, formData.password);
    if (success) {
      navigate('/dashboard');
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-army overflow-hidden max-w-md w-full border border-army-khaki-200">
      <div className="stripe-tricolour" aria-hidden="true" />
      <div className="bg-army-green-800 p-6 flex flex-col items-center border-b-2 border-army-green-700">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png"
          alt="State Emblem of India"
          className="h-12 w-12 mb-2 object-contain"
        />
        <h2 className="text-white text-xl font-bold font-headline tracking-tight">BHARTIYA SEEMA</h2>
        <p className="text-army-khaki-200 text-xs mt-1 uppercase tracking-wider">Officer Registration Portal</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        <h3 className="text-xl font-semibold mb-4 text-center">Create Your Account</h3>
        
        {error && (
          <div className="alert alert-danger flex items-start mb-4">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="form-label flex items-center">
              <User className="h-4 w-4 mr-1" />
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={`form-input ${formErrors.name ? 'border-army-red-500' : ''}`}
              placeholder="Maj. Vikram Singh"
              value={formData.name}
              onChange={handleChange}
            />
            {formErrors.name && <p className="text-army-red-500 text-xs mt-1">{formErrors.name}</p>}
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
              className={`form-input ${formErrors.email ? 'border-army-red-500' : ''}`}
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleChange}
            />
            {formErrors.email && <p className="text-army-red-500 text-xs mt-1">{formErrors.email}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rank" className="form-label">Rank</label>
              <select
                id="rank"
                name="rank"
                className={`form-input ${formErrors.rank ? 'border-army-red-500' : ''}`}
                value={formData.rank}
                onChange={handleChange}
              >
                <option value="">Select Rank</option>
                <option value="Lieutenant">Lieutenant</option>
                <option value="Captain">Captain</option>
                <option value="Major">Major</option>
                <option value="Lieutenant Colonel">Lieutenant Colonel</option>
                <option value="Colonel">Colonel</option>
                <option value="Brigadier">Brigadier</option>
                <option value="Major General">Major General</option>
                <option value="Lieutenant General">Lieutenant General</option>
              </select>
              {formErrors.rank && <p className="text-army-red-500 text-xs mt-1">{formErrors.rank}</p>}
            </div>
            <div>
              <label htmlFor="unit" className="form-label">Unit</label>
              <input
                type="text"
                id="unit"
                name="unit"
                className={`form-input ${formErrors.unit ? 'border-army-red-500' : ''}`}
                placeholder="7th Infantry Division"
                value={formData.unit}
                onChange={handleChange}
              />
              {formErrors.unit && <p className="text-army-red-500 text-xs mt-1">{formErrors.unit}</p>}
            </div>
          </div>
          
          <div>
            <label htmlFor="password" className="form-label flex items-center">
              <Lock className="h-4 w-4 mr-1" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                className={`form-input pr-10 ${formErrors.password ? 'border-army-red-500' : ''}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-2.796 0-5.487-1.029-7.534-2.895-2.039-1.85-3.2-4.367-3.2-7.03 0-2.663 1.16-5.18 3.2-7.03C6.513 0.029 9.204-1 12-1c2.796 0 5.487 1.029 7.534 2.895 2.039 1.85 3.2 4.367 3.2 7.03 0 2.663-1.16 5.18-3.2 7.03-1.173 1.064-2.504 1.873-3.934 2.364" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.9 4.24A9.12 9.12 0 0112 4c7.2 0 9.6 6 9.6 8.67 0 .65-.13 1.26-.36 1.83m-6.97 7.18c-.92.28-1.88.43-2.85.43-7.2 0-9.6-6-9.6-8.67 0-.65.13-1.26.36-1.83m10.8 0V8c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2v-6l-5.4 5.4z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {formErrors.password && <p className="text-army-red-500 text-xs mt-1">{formErrors.password}</p>}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="form-label flex items-center">
              <Lock className="h-4 w-4 mr-1" />
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className={`form-input ${formErrors.confirmPassword ? 'border-army-red-500' : ''}`}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {formErrors.confirmPassword && <p className="text-army-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
          </div>
          
          <p className="text-xs text-gray-500">
            <MapPin className="h-3 w-3 inline mr-1" />
            Your current location will be used as your initial position.
          </p>
          
          <button
            type="submit"
            className="btn w-full flex items-center justify-center bg-saffron hover:bg-saffron-dark text-white font-semibold rounded-md shadow-army"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <UserPlus className="h-4 w-4 mr-1" />
            )}
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-army-green-600 hover:text-army-green-500 font-medium">
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default SignupForm;
