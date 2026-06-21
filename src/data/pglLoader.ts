export interface PGLAgent {
  agent: string;
  pgl_id: string;
  run_id: string;
  status: string;
}

// Fallback registry for safety/dev if network fails
import fallbackRegistry from './veklom-agents/pgl_registry.json';

// Toggles between live API vs Local Dev Backend based on VITE_ env vars
// If you want to force local, set VITE_USE_LOCAL_BACKEND=true in .env
const API_BASE_URL = import.meta.env.VITE_USE_LOCAL_BACKEND === 'true' 
  ? 'http://localhost:8000' 
  : 'https://api.veklom.com';

export const establishBackendHandshake = async (): Promise<PGLAgent[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/pgl/registry`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Handshake failed with status ${response.status}`);
    }

    const data = await response.json();
    return data as PGLAgent[];
  } catch (error) {
    console.error('[HANDSHAKE ERROR] Failed to connect to backend PGL Registry. Falling back to local offline registry.', error);
    return fallbackRegistry as PGLAgent[];
  }
};
