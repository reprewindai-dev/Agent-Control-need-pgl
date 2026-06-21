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

export interface ExecutionReceipt {
  status: string;
  intent_hash: string;
  verdict: string;
  evidence_chain_id: string;
  result?: any;
}

export const triggerCAPIExecution = async (
  agent_id: string,
  pgl_id: string,
  target_protocol: string,
  action: string,
  payload: any
): Promise<ExecutionReceipt> => {
  const intent = {
    agent_id,
    pgl_id,
    target_protocol,
    action,
    payload
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/capi/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(intent)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || `cAPI execution failed with status ${response.status}`);
  }

  const data = await response.json();
  return data as ExecutionReceipt;
};
