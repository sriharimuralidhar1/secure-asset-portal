/**
 * API Configuration
 * Handles different environments automatically:
 * - Development: Smart port detection for flexible development setup
 * - Production/Deployment: Uses relative URLs (same domain/port)
 */

import { getAPIBaseURL as getSmartAPIBaseURL, getEnvironmentInfo } from '../utils/portDetection';

const getAPIBaseURL = () => {
  return getSmartAPIBaseURL();
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
    portDetection: getEnvironmentInfo()
  });
}
