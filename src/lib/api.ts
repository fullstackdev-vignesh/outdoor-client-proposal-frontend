import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const fileBaseURL = API_URL.replace(/\/api\/?$/, '');

// Turns a stored image value into a loadable src. Relative paths are served by the backend;
// plain-http images (the media image server has no https) go through the backend's
// /image-proxy, since browsers block http images on an https page (mixed content).
export function resolveImageUrl(image?: string | null) {
  if (!image) return '';
  if (/^(data:|blob:|https:)/.test(image)) return image;
  if (image.startsWith('http:')) {
    // Only an https page blocks http images — on http (e.g. localhost) load them directly.
    const pageIsHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    return pageIsHttps ? `${API_URL}/image-proxy?url=${encodeURIComponent(image)}` : image;
  }
  return `${fileBaseURL}${image}`;
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('outdoor_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && err.response?.status === 401) {
      localStorage.removeItem('outdoor_token');
      localStorage.removeItem('outdoor_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
