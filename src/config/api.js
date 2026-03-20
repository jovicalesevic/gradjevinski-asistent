/**
 * API origin for backend (Render in prod, localhost in dev).
 * Set VITE_API_URL in Vercel to your Render URL, e.g. https://your-app.onrender.com
 * (no trailing slash)
 */
const trimSlash = (s) => (typeof s === 'string' ? s.replace(/\/$/, '') : '')

const origin =
  trimSlash(import.meta.env.VITE_API_URL) || 'http://localhost:5000'

export const API_ORIGIN = origin
export const API_AUTH_BASE = `${origin}/api/auth`
export const API_USER_BASE = `${origin}/api/user`
