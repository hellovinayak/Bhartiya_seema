import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: User['role'][];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-army-green-900 flex items-center justify-center text-army-khaki-100">
        <div className="text-center">
          <Shield className="h-10 w-10 mx-auto mb-3 text-army-gold animate-pulse" />
          <p className="font-headline uppercase tracking-widest">Validating command session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
