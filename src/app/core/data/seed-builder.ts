import {
  AssistantConfig, Automation, Business, Conversation, Faq, LeadStatus, Product, ProfileId, Workspace, WhatsappSetup,
} from '../models';
import { addAgentMessage, addClientMessage, runBot, uid } from '../bot/conversation-logic';

/** Paso de un guion: mensaje del cliente o respuesta de una persona del equipo. */
export type ScriptStep = { c: string } | { a: string };

export interface ConversationScript {
  name: string;
  phone: string;
  daysAgo: number;
  time: string;          // "14:20"
  steps: ScriptStep[];
  unread?: number;
  resolve?: boolean;
  tags?: string[];
  /** Estado comercial del lead que salga de esta conversación. */
  leadStatus?: LeadStatus;
  leadNote?: string;
}

export interface ManualLead {
  name: string; phone: string; interest: string; productName?: string;
  status: LeadStatus; daysAgo: number; source: string; notes: string; history: string[];
}

export interface ProfileSeed {
  profileId: ProfileId;
  business: Business;
  assistant: AssistantConfig;
  faqs: Omit<Faq, 'id' | 'enabled'>[];
  products: Omit<Product, 'id' | 'active'>[];
  scripts: ConversationScript[];
  manualLeads: ManualLead[];
  agentName: string;
}

const STATUS_TEXT: Record<LeadStatus, string> = {
  nuevo: 'Nuevo', contactado: 'Se contactó al cliente', interesado: 'El cliente confirmó interés',
  convertido: 'Venta cerrada', descartado: 'Se descartó la oportunidad',
};

function defaultAutomations(): Automation[] {
  const a = (trigger: Automation['trigger'], name: string, description: string, condition: string, action: string, expected: string): Automation =>
    ({ id: uid('auto'), trigger, name, description, condition, action, expected, active: true, runs: 0 });
  return [
    a('inicio', 'Bienvenida automática', 'Saluda en cuanto un cliente escribe por primera vez.', 'Primer mensaje de la conversación', 'Enviar el mensaje de bienvenida configurado', 'El cliente sabe con quién habla y qué puede preguntar.'),
    a('catalogo', 'Catálogo y precios', 'Responde con productos y precios cuando el cliente pregunta qué hay o cuánto cuesta.', 'El mensaje menciona menú, catálogo, servicios o precios', 'Enviar la lista de productos activos con su precio', 'El cliente recibe precios reales sin esperar a un asesor.'),
    a('humano', 'Derivar a una persona', 'Transfiere la conversación cuando el cliente pide hablar con alguien.', 'El cliente pide un asesor, una persona o el encargado', 'Pausar el asistente y marcar el chat como pendiente', 'Una persona del equipo continúa la conversación.'),
    a('compra', 'Registrar cliente potencial', 'Pide nombre y teléfono cuando el cliente quiere comprar o reservar.', 'El cliente expresa intención de compra o reserva', 'Solicitar los datos y crear un lead en el panel', 'La oportunidad queda registrada para hacerle seguimiento.'),
    a('horario', 'Responder horario', 'Comparte el horario de atención configurado.', 'El cliente pregunta cuándo abren o cierran', 'Enviar el horario por días', 'El cliente sabe cuándo puede visitar o pedir.'),
    a('ubicacion', 'Responder ubicación', 'Envía la dirección del negocio.', 'El cliente pregunta dónde quedan', 'Enviar la dirección y el teléfono', 'El cliente sabe cómo llegar.'),
    a('sin_respuesta', 'Derivar si no entiende', 'Si el asistente no entiende dos mensajes seguidos, pasa el chat a una persona.', 'Dos mensajes seguidos sin una intención reconocida', 'Transferir a una persona', 'Ningún cliente se queda sin respuesta.'),
  ];
}

function defaultWhatsapp(business: Business): WhatsappSetup {
  return {
    businessNumber: '',
    displayName: business.name,
    requirements: [
      { id: 'meta', label: 'Cuenta de Meta Business verificada', detail: 'El negocio verifica su identidad en el administrador comercial de Meta.', done: false },
      { id: 'app', label: 'Acceso a WhatsApp Business Platform', detail: 'Se crea la app y se habilita la API de WhatsApp Cloud para el negocio.', done: false },
      { id: 'numero', label: 'Número dedicado al asistente', detail: 'Un número que no esté en uso en la app de WhatsApp del celular.', done: false },
      { id: 'backend', label: 'Servidor con webhooks HTTPS', detail: 'Recibe y envía los mensajes; aquí viviría el motor de Waia en producción.', done: false },
      { id: 'secretos', label: 'Credenciales guardadas en el servidor', detail: 'Los tokens de Meta se guardan cifrados en el backend, nunca en el navegador.', done: false },
      { id: 'plantillas', label: 'Plantillas de mensaje aprobadas', detail: 'Necesarias para escribirle primero a un cliente después de 24 horas.', done: false },
      { id: 'privacidad', label: 'Política de tratamiento de datos', detail: 'Exigida por Meta y por la Ley 1581 de 2012 de protección de datos.', done: false },
    ],
  };
}

function at(now: Date, daysAgo: number, time: string, plusMinutes = 0): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m + plusMinutes, 0, 0);
  // Las conversaciones de hoy nunca quedan en el futuro.
  if (d.getTime() > now.getTime()) return new Date(now.getTime() - (60 - plusMinutes) * 60000);
  return d;
}

export function buildWorkspace(seed: ProfileSeed, now = new Date()): Workspace {
  const ws: Workspace = {
    profileId: seed.profileId,
    business: structuredClone(seed.business),
    assistant: structuredClone(seed.assistant),
    faqs: seed.faqs.map((f) => ({ ...f, id: uid('faq'), enabled: true })),
    products: seed.products.map((p) => ({ ...p, id: uid('prod'), active: true })),
    conversations: [],
    leads: [],
    automations: defaultAutomations(),
    whatsapp: defaultWhatsapp(seed.business),
    seededAt: now.toISOString(),
  };

  // Conversaciones: cada mensaje del cliente pasa por el motor real.
  for (const script of [...seed.scripts].sort((a, b) => b.daysAgo - a.daysAgo)) {
    const start = at(now, script.daysAgo, script.time);
    const conv: Conversation = {
      id: uid('conv'), contactName: script.name, contactPhone: script.phone, channel: 'WhatsApp (simulado)',
      status: 'bot', automationEnabled: true, unread: 0, tags: [...(script.tags ?? [])], createdAt: start.toISOString(), messages: [],
    };
    let minute = 0;
    for (const step of script.steps) {
      const when = at(now, script.daysAgo, script.time, minute);
      if ('c' in step) {
        const msg = addClientMessage(conv, step.c, when);
        const out = runBot(ws, conv, msg, when);
        if (out.lead && script.leadStatus && script.leadStatus !== 'nuevo') {
          out.lead.status = script.leadStatus;
          out.lead.notes = script.leadNote ?? '';
          out.lead.history.push({ at: at(now, Math.max(script.daysAgo - 1, 0), '10:30').toISOString(), text: STATUS_TEXT[script.leadStatus] });
        }
      } else {
        addAgentMessage(conv, step.a.replace('{agente}', seed.agentName), when);
      }
      minute += 2;
    }
    if (script.resolve) conv.status = 'resuelta';
    conv.unread = script.unread ?? 0;
    ws.conversations.push(conv);
  }
  ws.conversations.reverse(); // más recientes primero

  for (const m of seed.manualLeads) {
    const product = ws.products.find((p) => p.name === m.productName);
    const created = at(now, m.daysAgo, '11:00');
    ws.leads.push({
      id: uid('lead'), name: m.name, phone: m.phone, interest: m.interest, productId: product?.id, source: m.source,
      status: m.status, createdAt: created.toISOString(), notes: m.notes,
      history: m.history.map((text, i) => ({ at: at(now, Math.max(m.daysAgo - i, 0), '11:00', i * 30).toISOString(), text })),
    });
  }
  ws.leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ws;
}
