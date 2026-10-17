import { ProfileSeed } from '../seed-builder';
import { week } from './week';

/** Barbería ficticia de Envigado. Todos los contactos y teléfonos son inventados. */
export const BARBERIA: ProfileSeed = {
  profileId: 'barberia',
  agentName: 'Mauricio',
  business: {
    name: 'Barbería El Clásico',
    type: 'Barbería',
    description: 'Cortes clásicos y modernos, arreglo de barba y afeitado con toalla caliente.',
    logoUrl: '',
    brandColor: '#0f766e',
    phone: '3155550177',
    email: 'citas@elclasico.demo',
    address: 'Cl. 38 Sur #43-15, Zona Centro',
    city: 'Envigado',
    hours: week({ lunes: ['09:00', '20:00'], martes: ['09:00', '20:00'], miercoles: ['09:00', '20:00'], jueves: ['09:00', '20:00'], viernes: ['09:00', '20:00'], sabado: ['09:00', '20:00'], domingo: ['10:00', '14:00'] }),
  },
  assistant: {
    assistantName: 'Leo',
    tone: 'profesional',
    welcomeMessage: 'Buen día, le saluda {asistente}, asistente virtual de {negocio}. Puedo informarle sobre servicios, precios y horarios, y ayudarle a separar su turno.',
    farewellMessage: 'Gracias por comunicarse con {negocio}. Que tenga un excelente día.',
    fallbackMessage: 'Disculpe, no logré entender su mensaje. Puedo ayudarle con:',
    handoffMessage: 'Con gusto. Un barbero de {negocio} continuará la conversación por este medio. Si lo prefiere, puede llamarnos al {telefono}.',
    leadConfirmationMessage: 'Perfecto, {nombre}. Registramos su solicitud de {producto}. Le escribiremos al {telefono_cliente} para confirmar el día y la hora del turno.',
    botEnabled: true,
  },
  faqs: [
    { question: '¿Necesito cita o puedo llegar sin cita?', keywords: ['sin cita', 'necesito cita', 'cita previa', 'llegar sin', 'orden de llegada', 'hay que esperar', 'toca esperar', 'hay fila'], answer: 'Atendemos por orden de llegada, pero con turno separado no tiene que esperar. Le recomendamos separar el turno los viernes y sábados, que son los días de más movimiento.' },
    { question: '¿Cuánto dura cada servicio?', keywords: ['cuanto dura', 'cuanto se demora', 'demora', 'demoran', 'duracion', 'minutos', 'tiempo'], answer: 'El corte toma unos 40 minutos, el arreglo de barba 25 y el combo de corte con barba alrededor de una hora.' },
    { question: '¿Qué medios de pago reciben?', keywords: ['pago', 'pagos', 'pagar', 'tarjeta', 'nequi', 'daviplata', 'efectivo', 'transferencia'], answer: 'Recibimos efectivo, tarjeta, Nequi y Daviplata.' },
    { question: '¿Hacen servicio a domicilio o para eventos?', keywords: ['domicilio', 'a domicilio', 'casa', 'evento', 'eventos', 'novio', 'novios', 'boda', 'matrimonio'], answer: 'Sí, atendemos novios y eventos con servicio a domicilio en el Valle de Aburrá. Un barbero le confirma disponibilidad y tarifa según el número de personas.' },
    { question: '¿Tienen parqueadero?', keywords: ['parqueadero', 'parqueo', 'parquear', 'carro', 'moto', 'estacionamiento'], answer: 'Hay parqueadero público a una cuadra, en la Cl. 38 Sur con Cra. 43. Para motos tenemos espacio frente al local.' },
  ],
  products: [
    { name: 'Corte clásico', description: 'Corte a tijera o máquina con lavado y peinado.', price: 30000, category: 'Cortes', imageUrl: 'photos/barberia/clasico.webp', available: true },
    { name: 'Corte fade degradado', description: 'Degradado a máquina con acabado a navaja.', price: 35000, category: 'Cortes', imageUrl: 'photos/barberia/fade.webp', available: true },
    { name: 'Corte + barba', description: 'Combo de corte y arreglo de barba con toalla caliente.', price: 45000, category: 'Combos', imageUrl: 'photos/barberia/corte-barba.webp', available: true },
    { name: 'Perfilado de barba', description: 'Arreglo y perfilado de barba con navaja.', price: 20000, category: 'Barba', imageUrl: 'photos/barberia/perfilado.webp', available: true },
    { name: 'Afeitado clásico', description: 'Afeitado con navaja, toalla caliente y bálsamo.', price: 32000, category: 'Barba', imageUrl: 'photos/barberia/afeitado.webp', available: true },
    { name: 'Corte infantil', description: 'Corte para niños hasta los 12 años.', price: 25000, category: 'Cortes', imageUrl: 'photos/barberia/infantil.webp', available: true },
    { name: 'Cera para peinar', description: 'Cera de fijación media y acabado mate, 100 g.', price: 38000, category: 'Productos', imageUrl: 'photos/barberia/cera.webp', available: true },
  ],
  scripts: [
    { name: 'Carlos Muñoz', phone: '3155550301', daysAgo: 6, time: '09:15', steps: [{ c: 'Buenos días' }, { c: '¿Cuánto cuesta el corte fade?' }, { c: 'Quiero agendar un corte fade para el sábado' }, { c: 'sí' }, { c: '3158884422' }], resolve: true, leadStatus: 'convertido', leadNote: 'Atendido el sábado a las 10:00 a. m.' },
    { name: 'Diego Salazar', phone: '3155550302', daysAgo: 5, time: '10:40', steps: [{ c: '¿Necesito cita o puedo llegar sin cita?' }, { c: 'Gracias' }], resolve: true },
    { name: 'Ricardo Gaviria', phone: '3155550303', daysAgo: 5, time: '17:00', steps: [{ c: '¿Dónde están ubicados?' }, { c: '¿Tienen parqueadero?' }], resolve: true },
    { name: 'Ana María Duque', phone: '3155550304', daysAgo: 4, time: '14:25', steps: [{ c: 'Hola, ¿cuánto vale el corte infantil?' }, { c: 'Quiero agendar el corte infantil para mi hijo' }, { c: 'Ana María Duque' }, { c: '3012223344' }], leadStatus: 'interesado', leadNote: 'Prefiere el sábado en la mañana.' },
    { name: 'Esteban Cano', phone: '3155550305', daysAgo: 3, time: '18:30', steps: [{ c: 'Precios de la barba' }, { c: '¿Y el afeitado clásico cuánto dura?' }], resolve: true },
    { name: 'Jorge Patiño', phone: '3155550306', daysAgo: 2, time: '11:00', steps: [{ c: 'Quiero hablar con el encargado, es para el día de mi boda' }, { a: 'Buen día, Jorge. Le habla {agente}, de El Clásico. Felicitaciones por la boda. ¿Para cuántas personas sería el servicio y en qué fecha?' }, { c: 'Somos 5, el 14 de diciembre en Sabaneta' }, { a: 'Perfecto, tenemos disponibilidad. Le envío la cotización por este medio.' }], resolve: true, tags: ['Evento'] },
    { name: 'Sebastián Ríos', phone: '3155550307', daysAgo: 1, time: '16:45', steps: [{ c: '¿Venden productos para el cabello?' }, { c: 'La cera cuánto vale' }] },
    { name: 'Andrés Felipe Mora', phone: '3155550308', daysAgo: 1, time: '19:20', steps: [{ c: 'Hola' }, { c: '¿Hay promo de martes?' }, { c: '¿Y descuentos para estudiantes?' }], unread: 2 },
    { name: 'Miguel Ángel Rivera', phone: '3155550309', daysAgo: 0, time: '08:30', steps: [{ c: 'Buenas, ¿a qué hora abren hoy?' }, { c: 'Quiero un corte + barba' }] },
    { name: 'Pablo Restrepo', phone: '3155550310', daysAgo: 0, time: '09:10', steps: [{ c: 'Hola, quiero agendar un turno' }], unread: 1 },
  ],
  manualLeads: [
    { name: 'Felipe Arango', phone: '3155550311', interest: 'Corte + barba', productName: 'Corte + barba', status: 'contactado', daysAgo: 2, source: 'Registro manual', notes: 'Cliente frecuente, viene cada 15 días.', history: ['Registrado manualmente por el equipo.', 'Se contactó al cliente'] },
    { name: 'Hernán Vélez', phone: '3155550312', interest: 'Afeitado clásico', productName: 'Afeitado clásico', status: 'descartado', daysAgo: 6, source: 'Registro manual', notes: 'Buscaba servicio un lunes festivo.', history: ['Registrado manualmente por el equipo.', 'Se descartó la oportunidad'] },
  ],
};
