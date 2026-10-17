import { Injectable, computed, inject } from '@angular/core';
import { Business, WhatsappSetup } from '../models';
import { DemoStore } from '../state/demo.store';

/** Datos del negocio y preparación de la futura integración con WhatsApp. */
@Injectable({ providedIn: 'root' })
export class BusinessService {
  private store = inject(DemoStore);

  readonly business = computed(() => this.store.workspace().business);
  readonly whatsapp = computed(() => this.store.workspace().whatsapp);
  readonly initials = computed(() => initials(this.business().name));

  save(business: Business): void {
    this.store.mutate((ws) => { ws.business = structuredClone(business); });
  }

  /** Solo guarda datos visibles (número y nombre). Nunca tokens ni credenciales. */
  saveWhatsapp(setup: Pick<WhatsappSetup, 'businessNumber' | 'displayName'>): void {
    this.store.mutate((ws) => {
      ws.whatsapp.businessNumber = setup.businessNumber;
      ws.whatsapp.displayName = setup.displayName;
    });
  }

  toggleRequirement(id: string): void {
    this.store.mutate((ws) => {
      const r = ws.whatsapp.requirements.find((x) => x.id === id);
      if (r) r.done = !r.done;
    });
  }
}

export function initials(name: string): string {
  return name.split(/\s+/).filter((w) => /^\p{L}/u.test(w) && w.length > 2).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || name.slice(0, 2).toUpperCase();
}
