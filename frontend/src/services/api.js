import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  resetPassword: (email, newPassword) => api.post('/auth/reset-password', { email, newPassword }),
};

export const shiftsAPI = {
  getShifts: (params = {}) => api.get('/shifts', { params }),
  updateShift: (id, data) => api.put(`/shifts/${id}`, data),
  createShift: (shiftData) => api.post('/shifts', shiftData),
  deleteShift: (id) => api.delete(`/shifts/${id}`),
};

export const assignmentsAPI = {
  assignShift: (shiftId, hoursVolunteered = null) =>
    api.post('/assignments', { shift_id: shiftId, hours_volunteered: hoursVolunteered }),
  cancelAssignment: (id) => api.delete(`/assignments/${id}`),
  getUserAssignments: () => api.get('/assignments'),
};

export const locationsAPI = {
  getLocations: () => api.get('/locations'),
  createLocation: (data) => api.post('/locations', data),
  updateLocation: (id, data) => api.put(`/locations/${id}`, data),
};

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  resetUserPassword: (id, new_password) => api.put(`/admin/users/${id}/password`, { new_password }),
  getStats: (params = {}) => api.get('/admin/stats', { params }),
  fixFutureShifts: () => api.post('/admin/fix-shifts'),
};

export default api;
