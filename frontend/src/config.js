// ─────────────────────────────────────────────────────────
//  BACKEND URL — auto-detects local dev vs production.
//  Dynamically uses hostname for local area network access.
// ─────────────────────────────────────────────────────────
const PROD_URL = 'https://automation-project-1xzx.onrender.com/api';
const LOCAL_URL = `http://${window.location.hostname}:5000/api`;

// If we are on the Render domain, use PROD, otherwise we use local (localhost or LAN IP)
export const API_BASE = window.location.hostname.includes('onrender.com') ? PROD_URL : LOCAL_URL;
