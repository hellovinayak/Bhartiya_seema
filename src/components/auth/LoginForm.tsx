import React, { useState } from 'react';
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-army overflow-hidden max-w-md w-full border border-army-khaki-200">
      <div className="stripe-tricolour" aria-hidden="true" />
      <div className="bg-army-green-800 p-6 flex flex-col items-center border-b-2 border-army-green-700">
        <div className="flex items-center justify-center h-14 w-14 rounded-full bg-army-green-900 border-2 border-army-gold/60 mb-3">
          <Shield className="h-7 w-7 text-army-gold" />
        </div>
        <h2 className="text-white text-xl font-bold font-headline tracking-tight">BHARTIYA SEEMA</h2>
        <p className="text-army-khaki-200 text-xs mt-1 uppercase tracking-wider">Secure Authentication</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <h3 className="text-xl font-semibold mb-4 text-center">Login to Your Account</h3>

        {error && (
          <div className="alert alert-danger flex items-start mb-4">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="form-label flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              Email
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label flex items-center">
              <Lock className="h-4 w-4 mr-1" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="form-input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-2.796 0-5.487-1.029-7.534-2.895-2.039-1.85-3.2-4.367-3.2-7.03 0-2.663 1.16-5.18 3.2-7.03C6.513 0.029 9.204-1 12-1c2.796 0 5.487 1.029 7.534 2.895 2.039 1.85 3.2 4.367 3.2 7.03 0 2.663-1.16 5.18-3.2 7.03-1.173 1.064-2.504 1.873-3.934 2.364"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.9 4.24A9.12 9.12 0 0112 4c7.2 0 9.6 6 9.6 8.67 0 .65-.13 1.26-.36 1.83m-6.97 7.18c-.92.28-1.88.43-2.85.43-7.2 0-9.6-6-9.6-8.67 0-.65.13-1.26.36-1.83m10.8 0V8c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2v-6l-5.4 5.4z"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="text-sm">
              <a href="#" className="text-army-green-600 hover:text-army-green-500">
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            className="btn w-full flex items-center justify-center bg-saffron hover:bg-saffron-dark text-white font-semibold rounded-md shadow-army"
            disabled={loading}
          >
            {loading ? (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              'Login'
            )}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-army-green-600 hover:text-army-green-500 font-medium">
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-4 text-xs text-center text-gray-500">
          <p>
            For demonstration purposes, you can use:
            <br />
            Email: <span className="font-mono">Vinayak.rathod@gmail.com</span>
            <br />
            Password: <span className="font-mono">vinayak</span>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
