import { Injectable, computed, inject } from '@angular/core';
import { Lead, LeadStatus } from '../models';
import { DemoStore } from '../state/demo.store';
import { uid } from '../bot/conversation-logic';

export const LEAD_STATUSES: { id: LeadStatus; label: string; badge: string }[] = [
  { id: 'nuevo', label: 'Nuevo', badge: 'badge-blue' },
  { id: 'contactado', label: 'Contactado', badge: 'badge-violet' },
  { id: 'interesado', label: 'Interesado', badge: 'badge-amber' },
  { id: 'convertido', label: 'Convertido', badge: 'badge-green' },
  { id: 'descartado', label: 'Descartado', badge: '' },
];

export const leadStatusLabel = (s: LeadStatus) => LEAD_STATUSES.find((x) => x.id === s)?.label ?? s;

/** Clientes potenciales del negocio activo. */
@Injectable({ providedIn: 'root' })
export class LeadsService {
  private store = inject(DemoStore);

  readonly leads = computed(() => [...this.store.workspace().leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  byId(id: string): Lead | undefined {
    return this.store.workspace().leads.find((l) => l.id === id);
  }

  create(data: { name: string; phone: string; interest: string; productId?: string; notes: string }): string {
    const id = uid('lead');
    const now = new Date().toISOString();
    this.store.mutate((ws) => {
      ws.leads.unshift({ ...data, id, source: 'Registro manual', status: 'nuevo', createdAt: now, history: [{ at: now, text: 'Registrado manualmente desde el panel.' }] });
    });
    return id;
  }

  setStatus(id: string, status: LeadStatus): void {
    this.store.mutate((ws) => {
      const lead = ws.leads.find((l) => l.id === id);
      if (!lead || lead.status === status) return;
      lead.history.push({ at: new Date().toISOString(), text: `Estado cambiado de «${leadStatusLabel(lead.status)}» a «${leadStatusLabel(status)}».` });
      lead.status = status;
    });
  }

  addNote(id: string, note: string): void {
    if (!note.trim()) return;
    this.store.mutate((ws) => {
      const lead = ws.leads.find((l) => l.id === id);
      if (!lead) return;
      lead.notes = note.trim();
      lead.history.push({ at: new Date().toISOString(), text: `Nota: ${note.trim()}` });
    });
  }

  remove(id: string): void {
    this.store.mutate((ws) => {
      ws.leads = ws.leads.filter((l) => l.id !== id);
      ws.conversations.forEach((c) => { if (c.leadId === id) c.leadId = undefined; });
    });
  }
}
