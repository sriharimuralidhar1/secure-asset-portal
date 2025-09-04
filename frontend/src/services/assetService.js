import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const assetAPI = axios.create({
  baseURL: `${API_BASE_URL}/assets`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
assetAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const assetService = {
  async getAssets() {
    const response = await assetAPI.get('/');
    return response.data;
  },

  async getAsset(id) {
    const response = await assetAPI.get(`/${id}`);
    return response.data;
  },

  async createAsset(assetData) {
    const response = await assetAPI.post('/', assetData);
    return response.data;
  },

  async updateAsset(id, assetData) {
    const response = await assetAPI.put(`/${id}`, assetData);
    return response.data;
  },

  async deleteAsset(id) {
    const response = await assetAPI.delete(`/${id}`);
    return response.data;
  },

  async getAssetsByType(type) {
    const response = await assetAPI.get(`/type/${type}`);
    return response.data;
  }
};
