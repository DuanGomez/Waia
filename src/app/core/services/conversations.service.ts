import { Injectable, computed, inject, signal } from '@angular/core';
import { Conversation } from '../models';
import { DemoStore } from '../state/demo.store';
import { addAgentMessage, addClientMessage, addSystemMessage, runBot, uid } from '../bot/conversation-logic';
import { ToastService } from '../ui/toast.service';

/** Operaciones del simulador de conversaciones. En producción hablaría con el backend de mensajería. */
@Injectable({ providedIn: 'root' })
export class ConversationsService {
  private store = inject(DemoStore);
  private toast = inject(ToastService);

  /** Conversaciones donde el asistente está "escribiendo". */
  readonly typing = signal<ReadonlySet<string>>(new Set());

  readonly conversations = computed(() =>
    [...this.store.workspace().conversations].sort((a, b) => lastAt(b).localeCompare(lastAt(a))),
  );
  readonly pendingCount = computed(() => this.store.workspace().conversations.filter((c) => c.status === 'humano').length);
  readonly unreadCount = computed(() => this.store.workspace().conversations.reduce((n, c) => n + c.unread, 0));

  byId(id: string): Conversation | undefined {
    return this.store.workspace().conversations.find((c) => c.id === id);
  }

  /** Mensaje escrito como si fuera el cliente: el asistente responde tras una breve pausa. */
  sendAsClient(convId: string, text: string): void {
    if (!text.trim()) return;
    const profile = this.store.activeProfile();
    let msgId = '';
    this.store.mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === convId);
      if (conv) msgId = addClientMessage(conv, text, new Date()).id;
    });
    const ws = this.store.workspace();
    const conv = ws.conversations.find((c) => c.id === convId);
    if (!conv) return;
    if (!ws.assistant.botEnabled || !conv.automationEnabled) {
      // Sin asistente: el chat queda esperando a una persona.
      this.store.mutate((w) => runBotOn(w, convId, msgId), profile);
      return;
    }

    this.setTyping(convId, true);
    const delay = 650 + Math.min(text.length * 12, 700);
    setTimeout(() => {
      let leadName = '';
      let handoff = false;
      this.store.mutate((w) => {
        const out = runBotOn(w, convId, msgId);
        leadName = out?.lead?.name ?? '';
        handoff = !!out?.handoff;
      }, profile);
      this.setTyping(convId, false);
      if (leadName) this.toast.success('Nuevo cliente potencial', `${leadName} quedó registrado en Clientes potenciales.`);
      if (handoff) this.toast.warning('Conversación transferida', 'El asistente se pausó y el chat quedó pendiente de una persona.');
    }, delay);
  }

  /** Respuesta de una persona del equipo (no la escribe el asistente). */
  sendAsAgent(convId: string, text: string): void {
    if (!text.trim()) return;
    this.store.mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === convId);
      if (!conv) return;
      addAgentMessage(conv, text, new Date());
      if (conv.status === 'resuelta') conv.status = 'humano';
      conv.unread = 0;
    });
  }

  setAutomation(convId: string, enabled: boolean): void {
    this.store.mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === convId);
      if (!conv || conv.automationEnabled === enabled) return;
      conv.automationEnabled = enabled;
      if (enabled) {
        if (conv.status === 'humano') conv.status = 'bot';
        addSystemMessage(conv, `${ws.assistant.assistantName} se reactivó en esta conversación.`, new Date());
      } else {
        conv.leadFlow = undefined;
        addSystemMessage(conv, `${ws.assistant.assistantName} se pausó en esta conversación.`, new Date());
      }
    });
  }

  transferToHuman(convId: string): void {
    this.store.mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === convId);
      if (!conv || conv.status === 'humano') return;
      conv.status = 'humano';
      conv.automationEnabled = false;
      conv.leadFlow = undefined;
      addSystemMessage(conv, 'Conversación transferida manualmente a una persona (simulación).', new Date());
    });
    this.toast.info('Transferida a una persona', 'El asistente quedó en pausa en este chat.');
  }

  resolve(convId: string): void {
    this.store.mutate((ws) => {
      const conv = ws.conversations.find((c) => c.id === convId);
      if (!conv) return;
      conv.status = 'resuelta';
      conv.unread = 0;
      conv.leadFlow = undefined;
      addSystemMessage(conv, 'Conversación marcada como resuelta.', new Date());
    });
  }

  markRead(convId: string): void {
    const conv = this.byId(convId);
    if (!conv || conv.unread === 0) return;
    this.store.mutate((ws) => {
      const c = ws.conversations.find((x) => x.id === convId);
      if (c) c.unread = 0;
    });
  }

  /** Crea un chat de prueba con un contacto ficticio. */
  start(name: string, phone: string): string {
    const id = uid('conv');
    this.store.mutate((ws) => {
      ws.conversations.unshift({
        id, contactName: name.trim(), contactPhone: phone, channel: 'WhatsApp (simulado)', status: 'bot',
        automationEnabled: true, unread: 0, tags: ['Prueba'], createdAt: new Date().toISOString(), messages: [],
      });
    });
    return id;
  }

  remove(convId: string): void {
    this.store.mutate((ws) => {
      ws.conversations = ws.conversations.filter((c) => c.id !== convId);
    });
  }

  private setTyping(id: string, on: boolean): void {
    this.typing.update((s) => {
      const next = new Set(s);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }
}

function lastAt(c: Conversation): string {
  return c.messages[c.messages.length - 1]?.at ?? c.createdAt;
}

function runBotOn(ws: Parameters<typeof runBot>[0], convId: string, msgId: string) {
  const conv = ws.conversations.find((c) => c.id === convId);
  const msg = conv?.messages.find((m) => m.id === msgId);
  return conv && msg ? runBot(ws, conv, msg, new Date()) : null;
}
