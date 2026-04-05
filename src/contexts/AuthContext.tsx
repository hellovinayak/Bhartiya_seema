import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User } from '../types';
import { mockUsers } from '../data/mockData';

// --- localStorage helpers ---
const LS_KEY = 'bs_registered_users';

interface StoredUser {
  user: User;
  password: string;
}

function loadStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(users));
}

// --- Context types ---
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: Partial<User>, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // 1. Check users registered via signup (stored in localStorage)
      const storedUsers = loadStoredUsers();
      const storedMatch = storedUsers.find(
        su => su.user.email === email && su.password === password
      );
      if (storedMatch) {
        setUser(storedMatch.user);
        setLoading(false);
        return true;
      }

      // 2. Fallback: check static mock users (any non-empty password accepted)
      const mockMatch = mockUsers.find(u => u.email === email);
      if (mockMatch && password.length > 0) {
        setUser(mockMatch);
        setLoading(false);
        return true;
      }

      setError('Invalid email or password');
      setLoading(false);
      return false;
    } catch {
      setError('An error occurred during login');
      setLoading(false);
      return false;
    }
  };

  const signup = async (userData: Partial<User>, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const storedUsers = loadStoredUsers();

      // Check duplicates in both mock users and stored users
      const emailExists =
        mockUsers.some(u => u.email === userData.email) ||
        storedUsers.some(su => su.user.email === userData.email);

      if (emailExists) {
        setError('Email already in use');
        setLoading(false);
        return false;
      }

      const newUser: User = {
        id: `u${Date.now()}`,
        name: userData.name || 'New User',
        email: userData.email || '',
        rank: userData.rank || 'Lieutenant',
        unit: userData.unit || 'Unassigned',
        role: 'officer',
        location: userData.location || { lat: 32.7177, lng: 74.8573 },
      };

      // Persist new user + password to localStorage
      storedUsers.push({ user: newUser, password });
      saveStoredUsers(storedUsers);

      // Log them in immediately after signup
      setUser(newUser);
      setLoading(false);
      return true;
    } catch {
      setError('An error occurred during signup');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      signup,
      logout,
      error,
    }}>
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