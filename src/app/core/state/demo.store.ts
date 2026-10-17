import { Injectable, computed, inject, signal } from '@angular/core';
import { DemoState, ProfileId, Workspace } from '../models';
import { buildWorkspace } from '../data/seed-builder';
import { PROFILE_ORDER, PROFILE_SEEDS } from '../data/profiles';
import { DEMO_STATE_VERSION, WorkspaceRepository } from './workspace.repository';

/**
 * Estado central de la demo. Cada perfil de negocio tiene su propio workspace aislado:
 * cambiar de perfil nunca mezcla conversaciones, catálogos ni leads.
 * Todas las escrituras pasan por `mutate`, que trabaja sobre una copia y persiste el resultado.
 */
@Injectable({ providedIn: 'root' })
export class DemoStore {
  private repo = inject(WorkspaceRepository);
  private state = signal<DemoState>(this.repo.load() ?? DemoStore.fresh());

  readonly activeProfile = computed(() => this.state().activeProfile);
  readonly workspace = computed(() => this.state().workspaces[this.state().activeProfile]);
  readonly tourSeen = computed(() => this.state().tourSeen);
  readonly profiles = computed(() => PROFILE_ORDER.map((id) => ({ id, business: this.state().workspaces[id].business })));

  constructor() {
    this.repo.save(this.state());
  }

  static fresh(active: ProfileId = 'restaurante', tourSeen = false): DemoState {
    const now = new Date();
    const workspaces = Object.fromEntries(PROFILE_ORDER.map((id) => [id, buildWorkspace(PROFILE_SEEDS[id], now)])) as Record<ProfileId, Workspace>;
    return { version: DEMO_STATE_VERSION, activeProfile: active, workspaces, tourSeen };
  }

  /** Aplica cambios a un workspace (por defecto, el activo). */
  mutate(fn: (ws: Workspace) => void, profile: ProfileId = this.state().activeProfile): void {
    this.state.update((s) => {
      const ws = structuredClone(s.workspaces[profile]);
      fn(ws);
      return { ...s, workspaces: { ...s.workspaces, [profile]: ws } };
    });
    this.repo.save(this.state());
  }

  switchProfile(id: ProfileId): void {
    if (id === this.state().activeProfile) return;
    this.state.update((s) => ({ ...s, activeProfile: id }));
    this.repo.save(this.state());
  }

  markTourSeen(): void {
    this.state.update((s) => ({ ...s, tourSeen: true }));
    this.repo.save(this.state());
  }

  /** Restablece un solo perfil a sus datos iniciales. */
  resetProfile(id: ProfileId = this.state().activeProfile): void {
    this.state.update((s) => ({ ...s, workspaces: { ...s.workspaces, [id]: buildWorkspace(PROFILE_SEEDS[id]) } }));
    this.repo.save(this.state());
  }

  /** Restablece toda la demo (los tres perfiles) conservando el perfil activo. */
  resetAll(): void {
    this.repo.clear();
    this.state.set(DemoStore.fresh(this.state().activeProfile, true));
    this.repo.save(this.state());
  }
}
