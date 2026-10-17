/**
 * Modelos de dominio de Waia. Son los mismos contratos que usaría una API real:
 * hoy los llena el repositorio local (localStorage), mañana un backend.
 */

export type ProfileId = 'restaurante' | 'ropa' | 'barberia';
export type BusinessType = 'Restaurante' | 'Tienda de ropa' | 'Barbería' | 'Joyería' | 'Estudio de tatuajes' | 'Servicios';
export type Tone = 'cercano' | 'profesional' | 'entusiasta';

export interface OpeningHours {
  day: string;          // "Lunes"
  open: boolean;
  from: string;         // "11:00"
  to: string;           // "22:00"
}

export interface Business {
  name: string;
  type: BusinessType;
  description: string;
  logoUrl: string;      // opcional ('' = usar iniciales)
  brandColor: string;   // hex
  phone: string;
  email: string;
  address: string;
  city: string;
  hours: OpeningHours[];
}

export interface Faq {
  id: string;
  question: string;
  keywords: string[];   // palabras que activan la respuesta
  answer: string;
  enabled: boolean;
}

export interface AssistantConfig {
  assistantName: string;
  tone: Tone;
  welcomeMessage: string;
  farewellMessage: string;
  fallbackMessage: string;
  handoffMessage: string;
  leadConfirmationMessage: string;
  botEnabled: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;        // COP
  category: string;
  imageUrl: string;
  available: boolean;   // disponibilidad / stock
  active: boolean;      // visible para el asistente
}

export type ConversationStatus = 'bot' | 'humano' | 'resuelta';
export type MessageAuthor = 'cliente' | 'bot' | 'agente' | 'sistema';

export interface Message {
  id: string;
  author: MessageAuthor;
  text: string;
  at: string;           // ISO
  intent?: Intent;      // intención detectada (solo mensajes del cliente)
  productIds?: string[]; // productos mencionados o recomendados
  faqId?: string;       // pregunta frecuente que resolvió el mensaje
  automated?: boolean;  // el bot respondió con una intención reconocida
}

/** Paso del flujo de captura de un cliente potencial dentro de una conversación. */
export interface LeadFlow {
  step: 'producto' | 'nombre' | 'telefono';
  productId?: string;
  name?: string;
}

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string; // ficticio
  channel: 'WhatsApp (simulado)';
  status: ConversationStatus;
  automationEnabled: boolean;
  unread: number;
  tags: string[];
  createdAt: string;
  messages: Message[];
  leadFlow?: LeadFlow;
  leadId?: string;
}

export type LeadStatus = 'nuevo' | 'contactado' | 'interesado' | 'convertido' | 'descartado';

export interface LeadEvent {
  at: string;
  text: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  interest: string;     // producto o servicio
  productId?: string;
  source: string;       // "Conversación simulada", "Registro manual"…
  conversationId?: string;
  status: LeadStatus;
  createdAt: string;
  notes: string;
  history: LeadEvent[];
}

/** Disparadores que entiende el motor de reglas. */
export type AutomationTrigger = 'inicio' | 'catalogo' | 'humano' | 'compra' | 'horario' | 'ubicacion' | 'sin_respuesta';

export interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  condition: string;    // texto libre opcional
  action: string;
  expected: string;
  active: boolean;
  runs: number;         // ejecuciones en la simulación
}

export type Intent =
  | 'saludo' | 'horario' | 'ubicacion' | 'catalogo' | 'precio' | 'compra' | 'humano'
  | 'despedida' | 'agradecimiento' | 'faq' | 'desconocido' | 'dato_lead';

/** Todo lo que pertenece a un negocio. Cada perfil de demo tiene el suyo, aislado. */
export interface Workspace {
  profileId: ProfileId;
  business: Business;
  assistant: AssistantConfig;
  faqs: Faq[];
  products: Product[];
  conversations: Conversation[];
  leads: Lead[];
  automations: Automation[];
  whatsapp: WhatsappSetup;
  seededAt: string;
}

/** Datos de la futura integración. Nunca guarda tokens ni secretos. */
export interface WhatsappSetup {
  businessNumber: string;   // solo referencia visual
  displayName: string;
  requirements: { id: string; label: string; detail: string; done: boolean }[];
}

export interface DemoState {
  version: number;
  activeProfile: ProfileId;
  workspaces: Record<ProfileId, Workspace>;
  tourSeen: boolean;
}
