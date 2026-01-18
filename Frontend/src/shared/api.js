// Centralized backend API base URL for both local dev and production (Vercel).
// Set `VITE_API_BASE_URL` in your environment (e.g., https://hiitsurvey.onrender.com).
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(
  /\/+$/,
  ''
);

