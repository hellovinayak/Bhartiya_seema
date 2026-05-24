import {
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase/firebase';
import { User } from '../types';
import { mockUsers } from '../data/mockData';

const LS_SESSION_KEY = 'bs_auth_session';
const LS_REGISTERED_KEY = 'bs_registered_users';
const DEMO_PASSWORD = 'vinayak';

interface StoredUser {
  user: User;
  password: string;
}

const fallbackUser = mockUsers.find((user) => user.email.toLowerCase() === 'vinayak.rathod@gmail.com') || mockUsers[1];
const fallbackAdmin: User = {
  id: 'admin-command',
  name: 'Battalion Admin',
  email: 'admin@bhartiyaseema.local',
  rank: 'Commandant',
  unit: 'Battalion Command',
  role: 'admin',
  location: { lat: 32.7177, lng: 74.8573 },
  online: true,
  lastSeen: new Date().toISOString(),
};

const readStoredUsers = (): StoredUser[] => {
  try {
    const raw = localStorage.getItem(LS_REGISTERED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeStoredUsers = (users: StoredUser[]) => {
  localStorage.setItem(LS_REGISTERED_KEY, JSON.stringify(users));
};

const clearLegacySession = () => {
  sessionStorage.removeItem(LS_SESSION_KEY);
  localStorage.removeItem(LS_SESSION_KEY);
};

const firebaseProfileToUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  if (!db) {
    return {
      ...fallbackUser,
      id: firebaseUser.uid,
      email: firebaseUser.email || fallbackUser.email,
      name: firebaseUser.displayName || fallbackUser.name,
    };
  }

  const profileRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(profileRef);
  if (snapshot.exists()) {
    return { id: firebaseUser.uid, ...snapshot.data() } as User;
  }

  const user: User = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Officer',
    email: firebaseUser.email || '',
    rank: 'Captain',
    unit: 'Border Security Force',
    role: 'officer',
    location: { lat: 32.9686, lng: 75.1142 },
    online: true,
    lastSeen: new Date().toISOString(),
  };
  await setDoc(profileRef, user);
  return user;
};

export const watchAuthSession = (callback: (user: User | null) => void) => {
  clearLegacySession();

  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => undefined;
  }

  let unsubscribe = () => undefined;
  let cancelled = false;

  setPersistence(auth, inMemoryPersistence)
    .then(() => signOut(auth))
    .catch(() => undefined)
    .finally(() => {
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        callback(firebaseUser ? await firebaseProfileToUser(firebaseUser) : null);
      });
    });

  return () => {
    cancelled = true;
    unsubscribe();
  };
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  const normalizedEmail = email.trim().toLowerCase();

  if ((normalizedEmail === 'admin' || normalizedEmail === fallbackAdmin.email) && password === 'admin7G') {
    return fallbackAdmin;
  }

  if (isFirebaseConfigured && auth) {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return firebaseProfileToUser(credential.user);
  }

  const storedMatch = readStoredUsers().find(
    (entry) => entry.user.email.toLowerCase() === normalizedEmail && entry.password === password,
  );
  if (storedMatch) {
    return storedMatch.user;
  }

  const mockMatch = mockUsers.find((user) => user.email.toLowerCase() === normalizedEmail);
  if (mockMatch && password === DEMO_PASSWORD) {
    return mockMatch;
  }

  throw new Error('Invalid email or password');
};

export const signupUser = async (userData: Partial<User>, password: string): Promise<User> => {
  if (!userData.email) throw new Error('Email is required');

  if (isFirebaseConfigured && auth && db) {
    const credential = await createUserWithEmailAndPassword(auth, userData.email, password);
    const profile: User = {
      id: credential.user.uid,
      name: userData.name || userData.email.split('@')[0],
      email: userData.email,
      rank: userData.rank || 'Lieutenant',
      unit: userData.unit || 'Unassigned',
      role: userData.role || 'officer',
      location: userData.location || { lat: 32.7177, lng: 74.8573 },
      online: true,
      lastSeen: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', credential.user.uid), profile);
    return profile;
  }

  const storedUsers = readStoredUsers();
  const emailExists =
    mockUsers.some((user) => user.email.toLowerCase() === userData.email?.toLowerCase()) ||
    storedUsers.some((entry) => entry.user.email.toLowerCase() === userData.email?.toLowerCase());

  if (emailExists) throw new Error('Email already in use');

  const user: User = {
    id: `u${Date.now()}`,
    name: userData.name || 'New Officer',
    email: userData.email,
    rank: userData.rank || 'Lieutenant',
    unit: userData.unit || 'Unassigned',
    role: userData.role || 'officer',
    location: userData.location || { lat: 32.7177, lng: 74.8573 },
    online: true,
    lastSeen: new Date().toISOString(),
  };
  storedUsers.push({ user, password });
  writeStoredUsers(storedUsers);
  return user;
};

export const logoutUser = async () => {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
  clearLegacySession();
};
