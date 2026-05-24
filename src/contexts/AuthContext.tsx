import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { loginUser, logoutUser, signupUser, watchAuthSession } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: Partial<User>, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
  hasRole: (...roles: User['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = watchAuthSession((sessionUser) => {
      setUser(sessionUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await loginUser(email, password);
      setUser(loggedInUser);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: Partial<User>, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const signedUpUser = await signupUser(userData, password);
      setUser(signedUpUser);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create officer account');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    logoutUser().finally(() => setUser(null));
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    loading,
    login,
    signup,
    logout,
    error,
    hasRole: (...roles) => !!user && roles.includes(user.role),
  }), [error, loading, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
