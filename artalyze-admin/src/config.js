// Automatically detect environment and use appropriate backend URL
const isStaging = window.location.hostname.includes('staging') || process.env.NODE_ENV === 'development';

export const BASE_URL = isStaging 
  ? "https://artalyze-backend-staging.up.railway.app/api"
  : "https://artalyze-backend-production.up.railway.app/api";

// Keep staging URL for reference (can be removed later)
export const STAGING_BASE_URL = "https://artalyze-backend-staging.up.railway.app/api";