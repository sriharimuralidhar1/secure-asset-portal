/**
 * Port Detection Utility
 * Helps detect available ports and configure API URLs dynamically
 */

/**
 * Get the API base URL based on current environment and port configuration
 */
export const getAPIBaseURL = () => {
  // Check if we have an explicit API URL from environment
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // For production or deployment platforms
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // Development: Smart port detection
  const currentPort = parseInt(window.location.port) || 3000;
  const hostname = window.location.hostname;
  
  // Smart backend port detection based on frontend port
  let backendPort;
  
  if (currentPort === 3001) {
    // Standard setup: frontend 3001, backend 3000
    backendPort = 3000;
  } else if (currentPort === 3000) {
    // Reversed setup: frontend 3000, backend 3001 or 5000
    backendPort = 5000;
  } else if (currentPort >= 3000 && currentPort < 4000) {
    // In 3000s range, use one port lower
    backendPort = Math.max(3000, currentPort - 1);
  } else if (currentPort >= 4000 && currentPort < 5000) {
    // In 4000s range, use 3000
    backendPort = 3000;
  } else {
    // Default to 3000
    backendPort = 3000;
  }
  
  return `http://${hostname}:${backendPort}/api`;
};

/**
 * Test if a backend URL is reachable
 */
export const testBackendConnection = async (baseURL) => {
  try {
    const response = await fetch(`${baseURL.replace('/api', '')}/health`, {
      method: 'GET',
      timeout: 3000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Find the correct backend URL by testing common configurations
 */
export const findBackendURL = async () => {
  const hostname = window.location.hostname;
  const commonPorts = [3000, 5000, 8000, 4000, 3001];
  
  for (const port of commonPorts) {
    const testURL = `http://${hostname}:${port}`;
    if (await testBackendConnection(testURL)) {
      return `${testURL}/api`;
    }
  }
  
  // Fallback to default
  return getAPIBaseURL();
};

/**
 * Get current environment info for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    currentURL: window.location.href,
    hostname: window.location.hostname,
    port: window.location.port || 'default',
    protocol: window.location.protocol,
    nodeEnv: process.env.NODE_ENV,
    explicitAPIURL: process.env.REACT_APP_API_URL || 'not set',
    detectedAPIURL: getAPIBaseURL()
  };
};
