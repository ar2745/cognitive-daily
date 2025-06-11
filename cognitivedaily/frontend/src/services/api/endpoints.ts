export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://smartdailyplanner-production.up.railway.app/api/v1';

export const ENDPOINTS = {
  tasks: `${API_BASE_URL}/tasks`,
  energy: `${API_BASE_URL}/energy`,
  plans: `${API_BASE_URL}/plans`,
  user: `${API_BASE_URL}/user`,
} as const;

export default ENDPOINTS; 