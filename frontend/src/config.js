// ─────────────────────────────────────────────────────────
//  BACKEND URL — auto-detects local dev vs production.
//  Update PROD_URL after deploying to a new Render instance.
// ─────────────────────────────────────────────────────────
const PROD_URL = 'https://automation-project-vch4.onrender.com/api';
const LOCAL_URL = 'http://localhost:5000/api';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE = isLocal ? LOCAL_URL : PROD_URL;
