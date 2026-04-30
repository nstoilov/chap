// API configuration for different platforms
export const API_CONFIG = {
  // Stable project alias - doesn't change between deployments
  PRODUCTION_API_URL: 'https://chap-nstoilovs-projects.vercel.app',
  
  // Check if we're running in a browser (web) or mobile
  getBaseUrl: () => {
    // Web environment: use relative URLs or current domain
    if (typeof window !== 'undefined' && window.location) {
      // If we're on localhost, use production API
      if (window.location.hostname === 'localhost') {
        return API_CONFIG.PRODUCTION_API_URL;
      }
      // Otherwise use relative URL (for production web)
      return '';
    }
    
    // Mobile environment: use full production URL
    return API_CONFIG.PRODUCTION_API_URL;
  }
};

export const ENDPOINTS = {
  TRANSLATE: '/api/translate'
};
