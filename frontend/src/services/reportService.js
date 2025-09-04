import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const reportAPI = axios.create({
  baseURL: `${API_BASE_URL}/reports`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
reportAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const reportService = {
  async getPortfolioSummary() {
    const response = await reportAPI.get('/portfolio-summary');
    return response.data;
  },

  async getAssetPerformance() {
    const response = await reportAPI.get('/asset-performance');
    return response.data;
  },

  async getMonthlyGrowth() {
    const response = await reportAPI.get('/monthly-growth');
    return response.data;
  },

  async exportAssets(format = 'json') {
    const response = await reportAPI.get(`/export?format=${format}`);
    return response.data;
  },

  async getTaxReport(year) {
    const response = await reportAPI.get(`/tax-report?year=${year}`);
    return response.data;
  }
};
