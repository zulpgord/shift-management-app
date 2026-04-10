import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (email, password, name) =>
    api.post('/auth/register', { email, password, name }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
};

// Shifts endpoints
export const shiftsAPI = {
  getShifts: (params = {}) =>
    api.get('/shifts', { params }),
  createShift: (shiftData) =>
    api.post('/shifts', shiftData),
  deleteShift: (id) =>
    api.delete(`/shifts/${id}`),
};

// Assignments endpoints
export const assignmentsAPI = {
  assignShift: (shiftId, hoursVolunteered = null) =>
    api.post('/assignments', { shift_id: shiftId, hours_volunteered: hoursVolunteered }),
  cancelAssignment: (id) =>
    api.delete(`/assignments/${id}`),
  getUserAssignments: () =>
    api.get('/assignments'),
};

export default api;
