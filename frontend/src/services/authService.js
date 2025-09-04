import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

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
    // For now, we'll decode the JWT to get user info
    try {
      // Simple JWT decode (not secure validation, just for demo)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        return {
          id: payload.userId,
          email: payload.email,
          firstName: payload.firstName || 'User'
        };
      }
      throw new Error('Token expired');
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  async enableTwoFactor(email, token) {
    const response = await authAPI.post('/enable-2fa', {
      email,
      token
    });
    return response.data;
  },

  // Passkey methods
  async beginPasskeyRegistration(email) {
    const response = await authAPI.post('/passkey/register/begin', {
      email
    });
    return response.data;
  },

  async finishPasskeyRegistration(email, credential) {
    const response = await authAPI.post('/passkey/register/finish', {
      email,
      credential
    });
    return response.data;
  },

  async beginPasskeyAuthentication(email = null) {
    const response = await authAPI.post('/passkey/authenticate/begin', {
      email
    });
    return response.data;
  },

  async finishPasskeyAuthentication(email, credential) {
    const response = await authAPI.post('/passkey/authenticate/finish', {
      email,
      credential
    });
    return response.data;
  },

  async getUserPasskeys(email) {
    const response = await authAPI.get(`/passkeys/${encodeURIComponent(email)}`);
    return response.data;
  }
};
