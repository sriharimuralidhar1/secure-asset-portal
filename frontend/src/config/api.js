/**
 * API Configuration
 * Handles different environments automatically:
 * - Development: Uses localhost URLs for separate backend/frontend servers
 * - Production/Deployment: Uses relative URLs (same domain/port)
 */

const getAPIBaseURL = () => {
  // Check if we have an explicit API URL from environment
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // For production or deployment platforms (Render, Netlify, etc.)
  // Use relative URL so it works on any domain/port
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // Development fallback
  return 'http://localhost:3000/api';
};

export const API_CONFIG = {
  BASE_URL: getAPIBaseURL(),
  TIMEOUT: 10000, // 10 seconds
  HEADERS: {
    'Content-Type': 'application/json',
  }
};

// Export for backward compatibility
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    baseURL: API_CONFIG.BASE_URL,
    environment: process.env.NODE_ENV,
    explicitURL: process.env.REACT_APP_API_URL || 'not set'
  });
}
