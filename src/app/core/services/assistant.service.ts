import { Injectable, computed, inject } from '@angular/core';
import { AssistantConfig, Faq } from '../models';
import { DemoStore } from '../state/demo.store';
import { uid } from '../bot/conversation-logic';

export type FaqDraft = Omit<Faq, 'id'>;

/** Configuración del asistente y preguntas frecuentes. */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private store = inject(DemoStore);

  readonly config = computed(() => this.store.workspace().assistant);
  readonly faqs = computed(() => this.store.workspace().faqs);

  save(config: AssistantConfig): void {
    this.store.mutate((ws) => { ws.assistant = { ...config }; });
  }

  setBotEnabled(enabled: boolean): void {
    this.store.mutate((ws) => { ws.assistant.botEnabled = enabled; });
  }

  createFaq(draft: FaqDraft): void {
    this.store.mutate((ws) => { ws.faqs.push({ ...draft, id: uid('faq') }); });
  }

  updateFaq(id: string, draft: FaqDraft): void {
    this.store.mutate((ws) => {
      const i = ws.faqs.findIndex((f) => f.id === id);
      if (i >= 0) ws.faqs[i] = { ...draft, id };
    });
  }

  toggleFaq(id: string): void {
    this.store.mutate((ws) => {
      const f = ws.faqs.find((x) => x.id === id);
      if (f) f.enabled = !f.enabled;
    });
  }

  removeFaq(id: string): void {
    this.store.mutate((ws) => { ws.faqs = ws.faqs.filter((f) => f.id !== id); });
  }
}
