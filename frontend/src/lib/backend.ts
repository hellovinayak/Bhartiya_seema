const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL?.trim();

const localBackendUrl =
  typeof window === 'undefined'
    ? 'http://localhost:8000'
    : `${window.location.protocol}//${window.location.hostname}:8000`;

export const BACKEND_URL = (configuredBackendUrl || localBackendUrl).replace(/\/$/, '');

export const backendUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath}`;
};
