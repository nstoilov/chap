// API configuration for different platforms
// APP_SECRET must match the APP_SECRET environment variable set in Vercel
export const APP_SECRET = process.env.EXPO_PUBLIC_APP_SECRET;

export const API_CONFIG = {
  // Stable project alias - doesn't change between deployments
  PRODUCTION_API_URL: 'https://chap-nstoilovs-projects.vercel.app',
  
  // Check if we're running in a browser (web) or mobile
  getBaseUrl: () => {
    // Web environment: use relative URLs or current domain
    if (typeof window !== 'undefined' && window.location) {
      const { hostname, protocol } = window.location;
      // Electron (file://) or localhost: use full production URL
      if (protocol === 'file:' || hostname === 'localhost') {
        return API_CONFIG.PRODUCTION_API_URL;
      }
      // Production web: use relative URL
      return '';
    }
    
    // Mobile environment: use full production URL
    return API_CONFIG.PRODUCTION_API_URL;
  }
};

export const ENDPOINTS = {
  TRANSLATE: '/api/translate'
};
