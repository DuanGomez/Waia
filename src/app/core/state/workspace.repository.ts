import { Injectable, inject } from '@angular/core';
import { DemoState, ProfileId, Workspace } from '../models';
import { StorageService } from './storage.service';

/**
 * Contrato de persistencia. La demo usa localStorage; en producción se reemplaza por una
 * implementación HTTP (p. ej. GET/PUT /api/workspaces/:id) sin tocar componentes ni servicios.
 */
export abstract class WorkspaceRepository {
  abstract load(): DemoState | null;
  abstract save(state: DemoState): void;
  abstract clear(): void;
}

export const DEMO_STATE_VERSION = 1;
const KEY = 'waia.demo.v1';
const PROFILES: ProfileId[] = ['restaurante', 'ropa', 'barberia'];

/** Valida la forma de lo guardado: si algo no cuadra, se descarta y se recrea la demo. */
function isWorkspace(w: unknown): w is Workspace {
  const ws = w as Workspace;
  return !!ws && typeof ws === 'object'
    && !!ws.business && typeof ws.business.name === 'string' && Array.isArray(ws.business.hours)
    && !!ws.assistant && typeof ws.assistant.assistantName === 'string'
    && [ws.faqs, ws.products, ws.conversations, ws.leads, ws.automations].every(Array.isArray)
    && !!ws.whatsapp && Array.isArray(ws.whatsapp.requirements);
}

export function isDemoState(value: unknown): value is DemoState {
  const s = value as DemoState;
  return !!s && s.version === DEMO_STATE_VERSION && PROFILES.includes(s.activeProfile)
    && !!s.workspaces && PROFILES.every((p) => isWorkspace(s.workspaces[p]));
}

@Injectable()
export class LocalWorkspaceRepository extends WorkspaceRepository {
  private storage = inject(StorageService);

  load(): DemoState | null {
    const data = this.storage.read<unknown>(KEY);
    return isDemoState(data) ? data : null;
  }

  save(state: DemoState): void {
    this.storage.write(KEY, state);
  }

  clear(): void {
    this.storage.remove(KEY);
  }
}
