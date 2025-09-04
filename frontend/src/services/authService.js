import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const authAPI = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
authAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  async register(userData) {
    const response = await authAPI.post('/register', userData);
    return response.data;
  },

  async login(email, password, twoFactorToken = null) {
    const response = await authAPI.post('/login', {
      email,
      password,
      twoFactorToken
    });
    return response.data;
  },

  async logout() {
    try {
      await authAPI.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async validateToken(token) {
    // This would typically be a separate endpoint to validate the token
    // For now, we'll simulate it
    return Promise.resolve({ valid: true });
  },

  async enableTwoFactor(email, token) {
    const response = await authAPI.post('/enable-2fa', {
      email,
      token
    });
    return response.data;
  }
};
