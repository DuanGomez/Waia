import {
  AssistantConfig, Automation, AutomationTrigger, Business, Conversation, Faq, Intent, LeadFlow, Product, Tone,
} from '../models';
import {
  countMatches, extractName, extractPhone, fillTemplate, formatCOP, formatHours, formatPhone, hasPhrase, normalize, to12h,
} from './text';

/**
 * Motor de respuestas de Waia: reglas deterministas, sin IA ni servicios externos.
 * Recibe la configuración del negocio y el mensaje del cliente y devuelve qué responder
 * y qué acciones aplicar (derivar, iniciar o completar la captura de un lead).
 * Es una función pura: la misma entrada siempre produce la misma respuesta.
 */

export interface BotContext {
  business: Business;
  assistant: AssistantConfig;
  faqs: Faq[];
  products: Product[];
  automations: Automation[];
  /** Fecha de referencia para «hoy» (por defecto, ahora). */
  now?: Date;
}

export interface BotReply { text: string; productIds?: string[] }

export interface BotResult {
  intent: Intent;
  replies: BotReply[];
  /** El cliente pidió una persona (o el bot se rindió): pausar el bot y marcar pendiente. */
  handoff: boolean;
  /** Estado nuevo del flujo de captura (null = terminado o cancelado). */
  leadFlow: LeadFlow | null;
  /** Datos completos para registrar un cliente potencial. */
  lead?: { name: string; phone: string; productId?: string; interest: string };
  /** Productos mencionados por el cliente (para analíticas). */
  mentionedProductIds: string[];
  faqId?: string;
  /** Respuesta útil con una intención reconocida (cuenta como resuelta automáticamente). */
  automated: boolean;
  firedTriggers: AutomationTrigger[];
}

const KEYWORDS: Record<Exclude<Intent, 'faq' | 'desconocido' | 'dato_lead'>, string[]> = {
  humano: ['asesor', 'asesora', 'persona', 'humano', 'agente', 'alguien', 'hablar con', 'operador', 'encargado', 'encargada', 'administrador', 'llamar', 'llamada'],
  compra: ['quiero comprar', 'quiero pedir', 'quisiera pedir', 'quisiera comprar', 'hacer un pedido', 'hacer pedido', 'pedido', 'reservar', 'reserva', 'agendar', 'agenda', 'cita', 'separar', 'apartar', 'me interesa', 'lo quiero', 'la quiero', 'comprar', 'ordenar', 'pedir', 'me lo llevo', 'quiero uno', 'quiero una', 'quiero un', 'quiero el', 'quiero la', 'quiero los', 'quiero las', 'quisiera', 'deme', 'me da', 'regalame', 'me regala', 'me vende', 'para llevar', 'turno'],
  horario: ['horario', 'horarios', 'hora', 'abren', 'cierran', 'abierto', 'abiertos', 'atienden', 'domingo', 'domingos', 'festivo', 'festivos', 'sabado', 'sabados', 'a que horas'],
  ubicacion: ['donde', 'ubicacion', 'direccion', 'ubicados', 'quedan', 'llegar', 'sede', 'mapa', 'local', 'barrio'],
  precio: ['precio', 'precios', 'cuanto', 'vale', 'valen', 'cuesta', 'cuestan', 'valor', 'costo', 'tarifa', 'tarifas'],
  catalogo: ['menu', 'carta', 'catalogo', 'productos', 'servicios', 'que tienen', 'que venden', 'que ofrecen', 'opciones', 'platos', 'referencias', 'colecciones', 'coleccion', 'lista'],
  agradecimiento: ['gracias', 'muchas gracias', 'muy amable', 'mil gracias', 'te agradezco'],
  despedida: ['chao', 'adios', 'hasta luego', 'nos vemos', 'bye', 'hasta pronto', 'feliz dia', 'feliz noche'],
  saludo: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'que tal', 'saludos', 'ola'],
};

const AVAILABILITY = ['disponible', 'disponibles', 'hay', 'tienen', 'tienes', 'manejan', 'queda', 'quedan', 'stock', 'agotado', 'agotada'];

const STOPWORDS = new Set(['para', 'con', 'sin', 'del', 'los', 'las', 'una', 'uno', 'por', 'que', 'mas', 'muy', 'dos', 'tres', 'tipo', 'estilo']);
const CANCEL = ['cancelar', 'cancela', 'ya no', 'dejalo asi', 'mejor no', 'olvidalo', 'no gracias'];
const YES = ['si', 'sii', 'claro', 'correcto', 'el mismo', 'la misma', 'a mi nombre', 'ese', 'si señor', 'dale', 'listo'];

/** Frases que cambian según el tono configurado. */
const TONE: Record<Tone, { ok: string; askName: (c: string) => string; askPhone: string; badPhone: string; listIntro: string; thanks: string; pick: string; unavailable: string; cta: string; locationTail: (phone: string) => string; help: string; available: (name: string) => string; cancel: string }> = {
  cercano: {
    ok: '¡Claro!',
    askName: (c) => `¡Perfecto! ¿A nombre de quién lo registramos? Si es a nombre de ${c}, responde «sí».`,
    askPhone: '¿A qué número te podemos contactar para confirmar?',
    badPhone: 'Ese número no parece válido. Escríbelo con 10 dígitos, por ejemplo 300 123 4567.',
    listIntro: 'Esto es lo que tenemos disponible:',
    thanks: '¡Con mucho gusto! Aquí estoy si necesitas algo más.',
    pick: '¿Cuál te interesa? Escríbeme el nombre y lo dejo listo.',
    unavailable: 'por ahora está agotado',
    cta: '¿Quieres que te lo deje apartado? Responde «lo quiero».',
    locationTail: (p) => `Si necesitas indicaciones, llámanos al ${p}.`,
    help: '¿En qué te puedo ayudar? Puedo contarte sobre horarios, ubicación, precios o ayudarte con un pedido.',
    available: (n) => `¡Sí! ${n} está disponible.`,
    cancel: 'Listo, cancelé la solicitud.',
  },
  profesional: {
    ok: 'Con gusto.',
    askName: (c) => `Perfecto. ¿A nombre de quién registramos la solicitud? Si es a nombre de ${c}, responda «sí».`,
    askPhone: '¿A qué número podemos contactarle para confirmar?',
    badPhone: 'El número no parece válido. Por favor escríbalo con 10 dígitos, por ejemplo 300 123 4567.',
    listIntro: 'Estas son nuestras opciones disponibles:',
    thanks: 'Con gusto. Quedamos atentos si necesita algo más.',
    pick: '¿Cuál le interesa? Escriba el nombre y registramos su solicitud.',
    unavailable: 'en este momento no está disponible',
    cta: '¿Desea que le separemos este servicio? Responda «lo quiero».',
    locationTail: (p) => `Si necesita indicaciones, puede llamarnos al ${p}.`,
    help: '¿En qué podemos ayudarle? Puedo informarle sobre horarios, ubicación, precios o registrar su solicitud.',
    available: (n) => `Sí, ${n} está disponible.`,
    cancel: 'Entendido, cancelamos la solicitud.',
  },
  entusiasta: {
    ok: '¡Genial!',
    askName: (c) => `¡Excelente elección! ¿A nombre de quién lo dejamos? Si es para ${c}, solo responde «sí».`,
    askPhone: '¡Ya casi! ¿A qué número te escribimos para confirmar?',
    badPhone: 'Uy, ese número no se ve bien. Escríbelo con 10 dígitos, por ejemplo 300 123 4567.',
    listIntro: '¡Mira todo lo que tenemos para ti!',
    thanks: '¡A ti! Fue un placer ayudarte. Escríbeme cuando quieras.',
    pick: '¿Cuál te antoja más? Dime el nombre y lo dejamos listo.',
    unavailable: 'se nos agotó por ahora',
    cta: '¿Te lo separo? Responde «lo quiero» y lo dejamos listo.',
    locationTail: (p) => `¿Te pierdes? Llámanos al ${p} y te guiamos.`,
    help: '¿En qué te ayudo? Te cuento de horarios, ubicación, precios o te ayudo con tu pedido.',
    available: (n) => `¡Sí! ${n} está disponible.`,
    cancel: '¡Listo! Cancelé la solicitud.',
  },
};

function isActive(ctx: BotContext, trigger: AutomationTrigger): boolean {
  return ctx.automations.some((a) => a.trigger === trigger && a.active);
}

/** Productos mencionados: coincide si aparece alguna palabra distintiva del nombre. */
export function findProducts(text: string, products: Product[]): Product[] {
  const n = normalize(text);
  const scored = products
    .filter((p) => p.active)
    .map((p) => {
      const tokens = normalize(p.name).split(' ').filter((t) => t.length >= 4 && !STOPWORDS.has(t));
      const full = hasPhrase(n, p.name) ? 3 : 0;
      const partial = tokens.filter((t) => hasPhrase(n, t) || hasPhrase(n, t.replace(/s$/, '')) || hasPhrase(n, t + 's') || hasPhrase(n, t + 'es')).length;
      return { p, score: full + partial };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return [];
  const best = scored[0].score;
  return scored.filter((x) => x.score === best).map((x) => x.p);
}

function categoryMatch(text: string, products: Product[]): Product[] {
  const n = normalize(text);
  const cats = [...new Set(products.filter((p) => p.active).map((p) => p.category))];
  const cat = cats.find((c) => normalize(c).split(' ').some((t) => t.length >= 4 && (hasPhrase(n, t) || hasPhrase(n, t.replace(/s$/, '')))));
  return cat ? products.filter((p) => p.active && p.category === cat) : [];
}

function matchFaq(text: string, faqs: Faq[]): Faq | null {
  const n = normalize(text);
  let best: Faq | null = null;
  let bestScore = 0;
  for (const f of faqs.filter((f) => f.enabled)) {
    const score = countMatches(n, f.keywords);
    if (score > bestScore) { best = f; bestScore = score; }
  }
  return best;
}

function detect(n: string): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [intent, words] of Object.entries(KEYWORDS)) scores[intent] = countMatches(n, words);
  return scores;
}

function productLine(p: Product, tone: Tone): string {
  return `• ${p.name} — ${formatCOP(p.price)}${p.available ? '' : ` (${TONE[tone].unavailable})`}`;
}

function catalogText(ctx: BotContext, list: Product[], intro: string): BotReply {
  const tone = ctx.assistant.tone;
  const visible = list.filter((p) => p.active).slice(0, 8);
  const more = list.filter((p) => p.active).length - visible.length;
  const lines = visible.map((p) => productLine(p, tone));
  if (more > 0) lines.push(`…y ${more} opciones más.`);
  return { text: `${intro}\n${lines.join('\n')}`, productIds: visible.map((p) => p.id) };
}

function vars(ctx: BotContext, extra: Record<string, string> = {}): Record<string, string> {
  return {
    negocio: ctx.business.name,
    asistente: ctx.assistant.assistantName,
    direccion: `${ctx.business.address}, ${ctx.business.city}`,
    telefono: formatPhone(ctx.business.phone),
    horario: formatHours(ctx.business.hours).join('\n'),
    ...extra,
  };
}

function hoursReply(ctx: BotContext, n: string): string {
  const all = `Nuestro horario de atención es:\n${formatHours(ctx.business.hours).map((l) => `• ${l}`).join('\n')}`;
  if (!hasPhrase(n, 'hoy')) return `${TONE[ctx.assistant.tone].ok} ${all}`;
  const today = ctx.business.hours[((ctx.now ?? new Date()).getDay() + 6) % 7];
  const line = today.open ? `Hoy ${today.day.toLowerCase()} atendemos de ${to12h(today.from)} a ${to12h(today.to)}` : `Hoy ${today.day.toLowerCase()} no abrimos.`;
  return `${TONE[ctx.assistant.tone].ok} ${line}\n${all}`;
}

function locationReply(ctx: BotContext): string {
  return `Estamos en ${ctx.business.address}, ${ctx.business.city}. ${TONE[ctx.assistant.tone].locationTail(formatPhone(ctx.business.phone))}`;
}

function fallbackReply(ctx: BotContext): string {
  const base = fillTemplate(ctx.assistant.fallbackMessage, vars(ctx));
  return `${base}\n• Horarios\n• Ubicación\n• ${ctx.business.type === 'Barbería' ? 'Servicios y precios' : 'Catálogo y precios'}\n• Hablar con una persona`;
}

function result(partial: Partial<BotResult> & Pick<BotResult, 'intent' | 'replies'>): BotResult {
  return { handoff: false, leadFlow: null, mentionedProductIds: [], automated: false, firedTriggers: [], ...partial };
}

/** ¿Las dos últimas respuestas del bot fueron "no entendí"? */
function previousUnknowns(conv: Pick<Conversation, 'messages'>): number {
  let n = 0;
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    const m = conv.messages[i];
    if (m.author === 'cliente') { if (m.intent === 'desconocido') n++; else break; }
    if (m.author === 'agente') break;
  }
  return n;
}

function lastProduct(conv: Pick<Conversation, 'messages'>, products: Product[]): Product | null {
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    const ids = conv.messages[i].productIds;
    if (conv.messages[i].author === 'cliente' && ids?.length === 1) return products.find((p) => p.id === ids[0] && p.active) ?? null;
  }
  return null;
}

export function respond(ctx: BotContext, conv: Pick<Conversation, 'messages' | 'leadFlow' | 'contactName'>, text: string): BotResult {
  const res = decide(ctx, conv, text);
  if (!res.mentionedProductIds.length) {
    const direct = findProducts(text, ctx.products).map((p) => p.id);
    if (direct.length) res.mentionedProductIds = direct;
  }
  return res;
}

function decide(ctx: BotContext, conv: Pick<Conversation, 'messages' | 'leadFlow' | 'contactName'>, text: string): BotResult {
  const n = normalize(text);
  const tone = TONE[ctx.assistant.tone];
  const scores = detect(n);
  const direct = findProducts(text, ctx.products);
  // «¿Cuánto vale?» o «lo quiero» se refieren al último producto del que se habló.
  const last = direct.length ? null : lastProduct(conv, ctx.products);
  const refersBack = !!last && (countMatches(n, KEYWORDS.precio) > 0 || countMatches(n, ['lo quiero', 'la quiero', 'me lo llevo', 'me la llevo', 'ese', 'esa', 'ese mismo', 'esa misma', 'apartalo', 'apartala']) > 0);
  const mentioned = refersBack && last ? [last] : direct;
  const mentionedIds = mentioned.map((p) => p.id);
  const isFirst = !conv.messages.some((m) => m.author === 'bot' || m.author === 'agente');
  const welcome: BotReply[] = isFirst && isActive(ctx, 'inicio') ? [{ text: fillTemplate(ctx.assistant.welcomeMessage, vars(ctx)) }] : [];
  const welcomeTrigger: AutomationTrigger[] = welcome.length ? ['inicio'] : [];

  // 1. Pedir una persona siempre tiene prioridad, incluso en medio de un flujo.
  if (scores['humano'] > 0 && isActive(ctx, 'humano')) {
    return result({
      intent: 'humano', handoff: true, automated: false, mentionedProductIds: mentionedIds,
      replies: [...welcome, { text: fillTemplate(ctx.assistant.handoffMessage, vars(ctx)) }],
      firedTriggers: [...welcomeTrigger, 'humano'],
    });
  }

  // 2. Flujo de captura de un cliente potencial en curso.
  const flow = conv.leadFlow;
  if (flow) {
    if (countMatches(n, CANCEL) > 0) {
      return result({ intent: 'dato_lead', automated: true, replies: [{ text: `${tone.cancel} ${tone.thanks}` }] });
    }
    if (flow.step === 'producto') {
      const pick = mentioned[0];
      if (!pick) {
        return result({ intent: 'dato_lead', leadFlow: flow, automated: true, replies: [catalogText(ctx, ctx.products.filter((p) => p.available), `No identifiqué cuál. ${tone.pick}`)] });
      }
      if (!pick.available) {
        return result({ intent: 'dato_lead', leadFlow: flow, automated: true, mentionedProductIds: [pick.id], replies: [{ text: `${pick.name} ${tone.unavailable}. ¿Te gustaría otra opción?` }] });
      }
      return result({ intent: 'dato_lead', automated: true, mentionedProductIds: [pick.id], leadFlow: { step: 'nombre', productId: pick.id }, replies: [{ text: `${pick.name} — ${formatCOP(pick.price)}. ${tone.askName(conv.contactName)}`, productIds: [pick.id] }] });
    }
    if (flow.step === 'nombre') {
      const name = countMatches(n, YES) > 0 && n.split(' ').length <= 3 ? conv.contactName : extractName(text);
      if (!name) {
        return result({ intent: 'dato_lead', leadFlow: flow, automated: true, replies: [{ text: 'No logré tomar el nombre. ¿Me lo escribes de nuevo, por favor?' }] });
      }
      return result({ intent: 'dato_lead', automated: true, leadFlow: { ...flow, step: 'telefono', name }, replies: [{ text: tone.askPhone }] });
    }
    // flow.step === 'telefono'
    const phone = extractPhone(text);
    if (!phone) {
      return result({ intent: 'dato_lead', leadFlow: flow, automated: true, replies: [{ text: tone.badPhone }] });
    }
    const product = ctx.products.find((p) => p.id === flow.productId);
    const interest = product?.name ?? 'Información general';
    const name = flow.name ?? conv.contactName;
    return result({
      intent: 'dato_lead', automated: true,
      lead: { name, phone, productId: product?.id, interest },
      replies: [{ text: fillTemplate(ctx.assistant.leadConfirmationMessage, vars(ctx, { nombre: name.split(' ')[0], producto: interest, telefono_cliente: formatPhone(phone) })) }],
      firedTriggers: ['compra'],
    });
  }

  const faq = matchFaq(text, ctx.faqs);
  const faqScore = faq ? countMatches(n, faq.keywords) : 0;

  // 3. Intención de compra o reserva (salvo que una pregunta frecuente encaje mejor).
  if (scores['compra'] > 0 && !(faq && faqScore >= scores['compra'])) {
    if (isActive(ctx, 'compra')) {
      const pick = mentioned.length === 1 ? mentioned[0] : null;
      if (pick && pick.available) {
        return result({
          intent: 'compra', automated: true, mentionedProductIds: mentionedIds, leadFlow: { step: 'nombre', productId: pick.id },
          replies: [...welcome, { text: `${tone.ok} ${pick.name}: ${formatCOP(pick.price)}. ${tone.askName(conv.contactName)}`, productIds: [pick.id] }],
          firedTriggers: welcomeTrigger,
        });
      }
      const options = (mentioned.length > 1 ? mentioned : categoryMatch(text, ctx.products).length ? categoryMatch(text, ctx.products) : ctx.products).filter((p) => p.available);
      return result({
        intent: 'compra', automated: true, mentionedProductIds: mentionedIds, leadFlow: { step: 'producto' },
        replies: [...welcome, catalogText(ctx, options, `${pick && !pick.available ? `${pick.name} ${tone.unavailable}. ` : ''}${tone.pick}`)],
        firedTriggers: welcomeTrigger,
      });
    }
    // Sin captura de leads: al menos mostrar opciones.
    if (isActive(ctx, 'catalogo')) {
      return result({ intent: 'compra', automated: true, mentionedProductIds: mentionedIds, replies: [...welcome, catalogText(ctx, mentioned.length ? mentioned : ctx.products, tone.listIntro), { text: `Para hacer tu pedido puedes llamarnos al ${formatPhone(ctx.business.phone)}.` }], firedTriggers: [...welcomeTrigger, 'catalogo'] });
    }
  }

  // 4. Preguntas frecuentes configuradas por el negocio.
  const strongIntent = Math.max(scores['horario'], scores['ubicacion'], scores['precio'], scores['catalogo']);
  if (faq && faqScore >= strongIntent) {
    return result({ intent: 'faq', faqId: faq.id, automated: true, mentionedProductIds: mentionedIds, replies: [...welcome, { text: fillTemplate(faq.answer, vars(ctx)) }], firedTriggers: welcomeTrigger });
  }

  // 5. Horario y ubicación.
  if (scores['horario'] > 0 && scores['horario'] >= scores['ubicacion'] && isActive(ctx, 'horario')) {
    return result({ intent: 'horario', automated: true, replies: [...welcome, { text: hoursReply(ctx, n) }], firedTriggers: [...welcomeTrigger, 'horario'] });
  }
  if (scores['ubicacion'] > 0 && isActive(ctx, 'ubicacion')) {
    return result({ intent: 'ubicacion', automated: true, replies: [...welcome, { text: locationReply(ctx) }], firedTriggers: [...welcomeTrigger, 'ubicacion'] });
  }

  // 6. Disponibilidad o precio de un producto concreto.
  if (mentioned.length === 1 && countMatches(n, AVAILABILITY) > 0 && scores['precio'] === 0) {
    const p = mentioned[0];
    const text = p.available ? `${tone.available(p.name)} Cuesta ${formatCOP(p.price)}. ${p.description}${isActive(ctx, 'compra') ? `\n${tone.cta}` : ''}` : `${p.name} ${tone.unavailable}. ¿Te muestro otras opciones similares?`;
    return result({ intent: 'precio', automated: true, mentionedProductIds: mentionedIds, replies: [...welcome, { text, productIds: [p.id] }], firedTriggers: welcomeTrigger });
  }
  if (mentioned.length && (scores['precio'] > 0 || scores['catalogo'] > 0 || countMatches(n, AVAILABILITY) > 0 || n.split(' ').length <= 4)) {
    const lines = mentioned.slice(0, 4).map((p) => `${p.name}: ${formatCOP(p.price)}${p.available ? '' : ` (${tone.unavailable})`}. ${p.description}`);
    const cta = isActive(ctx, 'compra') ? `\n${tone.cta}` : '';
    return result({ intent: 'precio', automated: true, mentionedProductIds: mentionedIds, replies: [...welcome, { text: `${tone.ok} ${lines.join('\n')}${cta}`, productIds: mentionedIds }], firedTriggers: welcomeTrigger });
  }

  // 7. Catálogo completo o por categoría.
  if ((scores['catalogo'] > 0 || scores['precio'] > 0) && isActive(ctx, 'catalogo')) {
    const byCat = categoryMatch(text, ctx.products);
    const list = byCat.length ? byCat : ctx.products;
    if (!list.some((p) => p.active)) {
      return result({ intent: 'catalogo', automated: false, replies: [...welcome, { text: `En este momento no tenemos productos publicados. ${fillTemplate(ctx.assistant.handoffMessage, vars(ctx))}` }], handoff: true, firedTriggers: [...welcomeTrigger, 'catalogo'] });
    }
    return result({ intent: scores['precio'] > 0 ? 'precio' : 'catalogo', automated: true, replies: [...welcome, catalogText(ctx, list, tone.listIntro)], firedTriggers: [...welcomeTrigger, 'catalogo'] });
  }

  // 8. Cortesías.
  if (scores['despedida'] > 0) {
    return result({ intent: 'despedida', automated: true, replies: [{ text: fillTemplate(ctx.assistant.farewellMessage, vars(ctx)) }] });
  }
  if (scores['agradecimiento'] > 0) {
    return result({ intent: 'agradecimiento', automated: true, replies: [{ text: tone.thanks }] });
  }
  if (scores['saludo'] > 0) {
    return result({
      intent: 'saludo', automated: true,
      replies: welcome.length ? welcome : [{ text: `${tone.ok} ${tone.help}` }],
      firedTriggers: welcomeTrigger,
    });
  }

  // 9. No entendió: ofrecer opciones y, si se repite, derivar a una persona.
  const unknowns = previousUnknowns(conv) + 1;
  if (unknowns >= 2 && isActive(ctx, 'sin_respuesta')) {
    return result({ intent: 'desconocido', handoff: true, replies: [{ text: fillTemplate(ctx.assistant.handoffMessage, vars(ctx)) }], firedTriggers: ['sin_respuesta'] });
  }
  return result({ intent: 'desconocido', replies: [...welcome, { text: fallbackReply(ctx) }], firedTriggers: welcomeTrigger });
}
