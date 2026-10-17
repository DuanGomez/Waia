import { Injectable, computed, inject } from '@angular/core';
import { Intent, LeadStatus, Message } from '../models';
import { DemoStore } from '../state/demo.store';
import { LEAD_STATUSES } from './leads.service';

export interface DayPoint { key: string; label: string; value: number; secondary?: number }
export interface RankItem { label: string; value: number }
export interface ActivityItem { at: string; kind: 'mensaje' | 'lead' | 'humano' | 'resuelta'; title: string; text: string; conversationId?: string; leadId?: string }

const INTENT_LABELS: Record<Intent, string> = {
  saludo: 'Saludos', horario: 'Horarios', ubicacion: 'Ubicación', catalogo: 'Catálogo', precio: 'Precios',
  compra: 'Compras y reservas', humano: 'Pidió una persona', despedida: 'Despedidas', agradecimiento: 'Agradecimientos',
  faq: 'Preguntas frecuentes', desconocido: 'No entendidos', dato_lead: 'Datos para pedidos',
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Indicadores calculados a partir de los datos de la demo. No hay números aleatorios:
 * todo sale de las conversaciones, mensajes y leads guardados, y se recalcula al cambiar.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private store = inject(DemoStore);
  private ws = this.store.workspace;

  private clientMessages = computed(() => this.ws().conversations.flatMap((c) => c.messages.filter((m) => m.author === 'cliente')));
  private transferredIds = computed(() => new Set(this.ws().conversations.filter((c) => c.messages.some((m) => m.author === 'sistema' && /transferida/i.test(m.text))).map((c) => c.id)));

  readonly kpis = computed(() => {
    const convs = this.ws().conversations;
    const msgs = this.clientMessages();
    const automated = msgs.filter((m) => m.automated).length;
    const transferred = this.transferredIds();
    return {
      received: convs.length,
      attended: convs.filter((c) => c.messages.some((m) => m.author === 'bot' || m.author === 'agente')).length,
      leads: this.ws().leads.length,
      leadsFromBot: this.ws().leads.filter((l) => l.conversationId).length,
      autoAnswered: automated,
      pending: convs.filter((c) => c.status === 'humano').length,
      transferred: transferred.size,
      resolvedByBot: convs.filter((c) => !transferred.has(c.id) && !c.messages.some((m) => m.author === 'agente') && c.messages.some((m) => m.author === 'bot')).length,
      clientMessages: msgs.length,
      automationRate: msgs.length ? Math.round((automated / msgs.length) * 100) : 0,
      converted: this.ws().leads.filter((l) => l.status === 'convertido').length,
    };
  });

  /** Últimos 7 días terminando hoy. */
  private days = computed(() => {
    const out: { key: string; label: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = i === 0 ? 'Hoy' : d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
      out.push({ key: dayKey(d.toISOString()), label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return out;
  });

  /** Conversaciones con actividad del cliente por día (y cuántas respondió el asistente). */
  readonly conversationsPerDay = computed<DayPoint[]>(() => {
    const convs = this.ws().conversations;
    return this.days().map((d) => {
      const active = convs.filter((c) => c.messages.some((m) => m.author === 'cliente' && dayKey(m.at) === d.key));
      const byBot = active.filter((c) => c.messages.some((m) => m.author === 'bot' && dayKey(m.at) === d.key));
      return { ...d, value: active.length, secondary: byBot.length };
    });
  });

  readonly messagesPerDay = computed<DayPoint[]>(() => {
    const msgs = this.clientMessages();
    return this.days().map((d) => {
      const day = msgs.filter((m) => dayKey(m.at) === d.key);
      return { ...d, value: day.length, secondary: day.filter((m) => m.automated).length };
    });
  });

  readonly leadsPerDay = computed<DayPoint[]>(() => {
    const leads = this.ws().leads;
    return this.days().map((d) => ({ ...d, value: leads.filter((l) => dayKey(l.createdAt) === d.key).length }));
  });

  readonly topFaqs = computed<RankItem[]>(() => {
    const counts = new Map<string, number>();
    this.clientMessages().forEach((m) => m.faqId && counts.set(m.faqId, (counts.get(m.faqId) ?? 0) + 1));
    return this.ws().faqs
      .map((f) => ({ label: f.question, value: counts.get(f.id) ?? 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  });

  readonly topProducts = computed<RankItem[]>(() => {
    const counts = new Map<string, number>();
    this.clientMessages().forEach((m) => m.productIds?.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
    this.ws().leads.forEach((l) => l.productId && counts.set(l.productId, (counts.get(l.productId) ?? 0) + 1));
    return this.ws().products
      .map((p) => ({ label: p.name, value: counts.get(p.id) ?? 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  });

  readonly intents = computed<RankItem[]>(() => {
    const counts = new Map<Intent, number>();
    this.clientMessages().forEach((m) => m.intent && counts.set(m.intent, (counts.get(m.intent) ?? 0) + 1));
    return [...counts.entries()].map(([k, v]) => ({ label: INTENT_LABELS[k], value: v })).sort((a, b) => b.value - a.value);
  });

  readonly leadsByStatus = computed(() => {
    const leads = this.ws().leads;
    return LEAD_STATUSES.map((s) => ({ id: s.id as LeadStatus, label: s.label, value: leads.filter((l) => l.status === s.id).length }));
  });

  /** Resolución de las conversaciones: solo asistente, con persona o pendientes. */
  readonly resolution = computed(() => {
    const k = this.kpis();
    return [
      { label: 'Resueltas por el asistente', value: k.resolvedByBot, color: 'var(--green)' },
      { label: 'Transferidas a una persona', value: k.transferred, color: 'var(--violet)' },
      { label: 'Otras', value: Math.max(k.received - k.resolvedByBot - k.transferred, 0), color: 'var(--surface-3)' },
    ];
  });

  readonly recentActivity = computed<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const c of this.ws().conversations) {
      const lastClient = [...c.messages].reverse().find((m: Message) => m.author === 'cliente');
      if (lastClient) items.push({ at: lastClient.at, kind: 'mensaje', title: c.contactName, text: lastClient.text, conversationId: c.id });
      const transfer = c.messages.find((m) => m.author === 'sistema' && /transferida/i.test(m.text));
      if (transfer) items.push({ at: transfer.at, kind: 'humano', title: c.contactName, text: 'Pidió hablar con una persona', conversationId: c.id });
    }
    for (const l of this.ws().leads) {
      items.push({ at: l.createdAt, kind: 'lead', title: l.name, text: `Interesado en ${l.interest}`, leadId: l.id });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);
  });
}
