import pglRegistry from './veklom-agents/pgl_registry.json';

export interface PGLAgent {
  agent: string;
  pgl_id: string;
  run_id: string;
  status: string;
}

export const loadPGLRegistry = (): PGLAgent[] => {
  return pglRegistry as PGLAgent[];
};
