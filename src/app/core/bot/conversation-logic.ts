import { Conversation, Lead, Message, Workspace } from '../models';
import { respond } from './engine';

/**
 * Aplica el motor de respuestas sobre un workspace. Lo usan tanto el simulador en vivo
 * como la generación de los datos de ejemplo, así la demo siempre se comporta igual.
 * Las funciones modifican el workspace recibido (el store trabaja sobre una copia).
 */

let seq = 0;
export function uid(prefix: string): string {
  seq = (seq + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const plus = (at: Date, seconds: number) => new Date(at.getTime() + seconds * 1000).toISOString();

export function addClientMessage(conv: Conversation, text: string, at: Date): Message {
  const msg: Message = { id: uid('m'), author: 'cliente', text: text.trim(), at: at.toISOString() };
  conv.messages.push(msg);
  if (conv.status === 'resuelta') conv.status = conv.automationEnabled ? 'bot' : 'humano';
  return msg;
}

export function addAgentMessage(conv: Conversation, text: string, at: Date): Message {
  const msg: Message = { id: uid('m'), author: 'agente', text: text.trim(), at: at.toISOString() };
  conv.messages.push(msg);
  return msg;
}

export function addSystemMessage(conv: Conversation, text: string, at: Date): void {
  conv.messages.push({ id: uid('m'), author: 'sistema', text, at: at.toISOString() });
}

export interface BotOutcome { replied: boolean; lead?: Lead; handoff: boolean }

/** Ejecuta el asistente sobre el último mensaje del cliente. */
export function runBot(ws: Workspace, conv: Conversation, clientMsg: Message, at: Date): BotOutcome {
  if (!ws.assistant.botEnabled || !conv.automationEnabled) {
    if (conv.status === 'bot') conv.status = 'humano';
    return { replied: false, handoff: false };
  }

  const history = { ...conv, messages: conv.messages.filter((m) => m.id !== clientMsg.id) };
  const res = respond(
    { business: ws.business, assistant: ws.assistant, faqs: ws.faqs, products: ws.products, automations: ws.automations },
    history,
    clientMsg.text,
  );

  clientMsg.intent = res.intent;
  clientMsg.automated = res.automated;
  if (res.mentionedProductIds.length) clientMsg.productIds = res.mentionedProductIds;
  if (res.faqId) clientMsg.faqId = res.faqId;

  res.replies.forEach((r, i) => {
    conv.messages.push({ id: uid('m'), author: 'bot', text: r.text, at: plus(at, 2 + i), productIds: r.productIds });
  });

  conv.leadFlow = res.leadFlow ?? undefined;

  for (const trigger of res.firedTriggers) {
    ws.automations.filter((a) => a.trigger === trigger && a.active).forEach((a) => a.runs++);
  }

  let lead: Lead | undefined;
  if (res.lead) {
    lead = {
      id: uid('lead'),
      name: res.lead.name,
      phone: res.lead.phone,
      interest: res.lead.interest,
      productId: res.lead.productId,
      source: 'Conversación simulada',
      conversationId: conv.id,
      status: 'nuevo',
      createdAt: plus(at, 2),
      notes: '',
      history: [{ at: plus(at, 2), text: `Registrado por ${ws.assistant.assistantName} durante la conversación.` }],
    };
    ws.leads.unshift(lead);
    conv.leadId = lead.id;
    if (!conv.tags.includes('Cliente potencial')) conv.tags.push('Cliente potencial');
  }

  if (res.handoff) {
    conv.status = 'humano';
    conv.automationEnabled = false;
    addSystemMessage(conv, 'Conversación transferida a una persona. El asistente se pausó en este chat.', new Date(plus(at, 3)));
  } else if (conv.status !== 'humano') {
    conv.status = 'bot';
  }

  return { replied: res.replies.length > 0, lead, handoff: res.handoff };
}

export function lastMessage(conv: Conversation): Message | undefined {
  return conv.messages[conv.messages.length - 1];
}
