import { Injectable, computed, inject } from '@angular/core';
import { Automation, AutomationTrigger } from '../models';
import { DemoStore } from '../state/demo.store';
import { uid } from '../bot/conversation-logic';

export const TRIGGERS: { id: AutomationTrigger; label: string; hint: string }[] = [
  { id: 'inicio', label: 'Inicio de conversación', hint: 'El cliente escribe por primera vez' },
  { id: 'catalogo', label: 'Consulta de catálogo o precios', hint: 'Menú, productos, servicios, cuánto cuesta' },
  { id: 'compra', label: 'Intención de compra o reserva', hint: 'Quiero pedir, reservar, agendar, lo quiero' },
  { id: 'humano', label: 'Solicitud de una persona', hint: 'Asesor, encargado, hablar con alguien' },
  { id: 'horario', label: 'Pregunta por el horario', hint: '¿A qué hora abren?, ¿atienden el domingo?' },
  { id: 'ubicacion', label: 'Pregunta por la ubicación', hint: '¿Dónde quedan?, dirección' },
  { id: 'sin_respuesta', label: 'Mensaje no entendido', hint: 'Dos mensajes seguidos sin intención reconocida' },
];

export const triggerLabel = (t: AutomationTrigger) => TRIGGERS.find((x) => x.id === t)?.label ?? t;

export type AutomationDraft = Omit<Automation, 'id' | 'runs'>;

/** Reglas de automatización conectadas al motor del asistente. */
@Injectable({ providedIn: 'root' })
export class AutomationsService {
  private store = inject(DemoStore);

  readonly automations = computed(() => this.store.workspace().automations);
  readonly activeCount = computed(() => this.automations().filter((a) => a.active).length);

  toggle(id: string): void {
    this.store.mutate((ws) => {
      const a = ws.automations.find((x) => x.id === id);
      if (a) a.active = !a.active;
    });
  }

  create(draft: AutomationDraft): void {
    this.store.mutate((ws) => { ws.automations.push({ ...draft, id: uid('auto'), runs: 0 }); });
  }

  update(id: string, draft: AutomationDraft): void {
    this.store.mutate((ws) => {
      const a = ws.automations.find((x) => x.id === id);
      if (a) Object.assign(a, draft);
    });
  }

  remove(id: string): void {
    this.store.mutate((ws) => { ws.automations = ws.automations.filter((a) => a.id !== id); });
  }
}
