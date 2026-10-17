import { ProfileSeed } from '../seed-builder';
import { week } from './week';

/** Tienda de ropa ficticia de Bogotá. Todos los contactos y teléfonos son inventados. */
export const ROPA: ProfileSeed = {
  profileId: 'ropa',
  agentName: 'Mónica',
  business: {
    name: 'Nómada Studio',
    type: 'Tienda de ropa',
    description: 'Ropa urbana y básicos de calidad para hombre y mujer, con envíos a toda Colombia.',
    logoUrl: '',
    brandColor: '#4f46e5',
    phone: '3105550188',
    email: 'hola@nomadastudio.demo',
    address: 'Cl. 57 #9-30, Chapinero',
    city: 'Bogotá',
    hours: week({ lunes: ['10:00', '20:00'], martes: ['10:00', '20:00'], miercoles: ['10:00', '20:00'], jueves: ['10:00', '20:00'], viernes: ['10:00', '20:00'], sabado: ['10:00', '20:00'], domingo: ['11:00', '18:00'] }),
  },
  assistant: {
    assistantName: 'Nico',
    tone: 'entusiasta',
    welcomeMessage: '¡Hola! Soy {asistente}, el asistente de {negocio}. Te ayudo con precios, tallas, envíos y a separar tus prendas favoritas.',
    farewellMessage: '¡Gracias por escribirnos! Que disfrutes tu outfit nuevo.',
    fallbackMessage: 'Uy, eso no lo entendí. Te puedo ayudar con:',
    handoffMessage: '¡Claro! Le aviso a una asesora de {negocio} para que te atienda por aquí mismo. Si prefieres, llámanos al {telefono}.',
    leadConfirmationMessage: '¡Hecho, {nombre}! Separé tu interés en {producto}. Una asesora te escribirá al {telefono_cliente} para confirmar talla, color y envío.',
    botEnabled: true,
  },
  faqs: [
    { question: '¿Hacen envíos a otras ciudades?', keywords: ['envio', 'envios', 'envian', 'enviar', 'nacional', 'ciudad', 'ciudades', 'llega', 'llegan', 'transportadora', 'domicilio'], answer: 'Hacemos envíos a toda Colombia. En Bogotá llegan en 1 o 2 días hábiles y al resto del país en 2 a 5 días. El envío es gratis en compras desde $250.000.' },
    { question: '¿Puedo cambiar una prenda?', keywords: ['cambio', 'cambios', 'cambiar', 'devolucion', 'devoluciones', 'devolver', 'garantia', 'no me queda'], answer: 'Sí, tienes 30 días para cambiar cualquier prenda sin uso, con etiquetas y factura. El primer cambio por talla es gratis.' },
    { question: '¿Qué tallas manejan?', keywords: ['talla', 'tallas', 'medidas', 'horma', 'tallaje', 'guia de tallas'], answer: 'Manejamos tallas XS a XXL en camisetas y buzos, y de la 6 a la 16 en jeans y vestidos. Si me dices tu estatura y la talla que usas normalmente, una asesora te recomienda la ideal.' },
    { question: '¿Qué medios de pago reciben?', keywords: ['pago', 'pagos', 'pagar', 'tarjeta', 'nequi', 'pse', 'addi', 'cuotas', 'contraentrega', 'contra entrega', 'efectivo'], answer: 'Puedes pagar con tarjeta, PSE, Nequi, Addi a cuotas o contraentrega en las principales ciudades.' },
    { question: '¿Tienen tienda física?', keywords: ['tienda fisica', 'probar', 'probador', 'medirme', 'ir a la tienda', 'visitarlos'], answer: 'Sí, nuestra tienda queda en {direccion}. Puedes ir a probarte las prendas en el horario de atención.' },
  ],
  products: [
    { name: 'Camiseta oversize negra', description: 'Algodón peinado de 220 g, corte amplio. Tallas XS a XXL.', price: 59900, category: 'Camisetas', imageUrl: 'photos/ropa/camiseta.webp', available: true },
    { name: 'Jean recto azul', description: 'Denim rígido con bota recta y tiro medio.', price: 139900, category: 'Jeans', imageUrl: 'photos/ropa/jean.webp', available: true },
    { name: 'Chaqueta de jean clásica', description: 'Chaqueta en denim prelavado con botones metálicos.', price: 189900, category: 'Chaquetas', imageUrl: 'photos/ropa/chaqueta.webp', available: true },
    { name: 'Vestido floral midi', description: 'Vestido fresco con estampado floral y lazo en la cintura.', price: 129900, category: 'Vestidos', imageUrl: 'photos/ropa/vestido.webp', available: true },
    { name: 'Tenis blancos urbanos', description: 'Tenis de cuero sintético con suela de caucho.', price: 219900, category: 'Calzado', imageUrl: 'photos/ropa/tenis.webp', available: true },
    { name: 'Gorra roja bordada', description: 'Gorra de seis paneles con logo bordado y cierre ajustable.', price: 49900, category: 'Accesorios', imageUrl: 'photos/ropa/gorra.webp', available: false },
    { name: 'Buzo con capota azul', description: 'Buzo perchado por dentro, ideal para el frío bogotano.', price: 149900, category: 'Buzos', imageUrl: 'photos/ropa/hoodie.webp', available: true },
    { name: 'Camisa de lino a rayas', description: 'Camisa manga larga en lino, fresca y liviana.', price: 119900, category: 'Camisas', imageUrl: 'photos/ropa/camisa.webp', available: true },
  ],
  scripts: [
    { name: 'Sara Montoya', phone: '3105550201', daysAgo: 6, time: '10:30', steps: [{ c: '¡Hola!' }, { c: '¿Hacen envíos a Medellín?' }, { c: '¿Cuánto vale la chaqueta de jean?' }, { c: 'La quiero' }, { c: 'sí' }, { c: '3105558821' }], resolve: true, leadStatus: 'convertido', leadNote: 'Talla M. Envío a Medellín pagado con PSE.' },
    { name: 'Kevin Rojas', phone: '3105550202', daysAgo: 6, time: '15:45', steps: [{ c: '¿Qué tallas manejan en los jeans?' }, { c: 'Gracias' }], resolve: true },
    { name: 'Natalia Pérez', phone: '3105550203', daysAgo: 5, time: '11:10', steps: [{ c: '¿Puedo cambiar una prenda si no me queda?' }, { c: 'Listo, muchas gracias' }], resolve: true },
    { name: 'Juan Pablo Díaz', phone: '3105550204', daysAgo: 4, time: '17:20', steps: [{ c: '¿Tienen gorras?' }, { c: 'Qué pena, entonces quiero el buzo con capota' }, { c: 'Juan Pablo Díaz' }, { c: '3006667788' }], leadStatus: 'interesado', leadNote: 'Pregunta si llega en color gris.' },
    { name: 'Isabella Castro', phone: '3105550205', daysAgo: 3, time: '12:00', steps: [{ c: 'Hola, ¿tienen tienda física para probarme la ropa?' }, { c: '¿Abren los domingos?' }], resolve: true },
    { name: 'Mateo Vargas', phone: '3105550206', daysAgo: 2, time: '09:50', steps: [{ c: 'Quiero hablar con una asesora para un pedido al por mayor' }, { a: 'Hola Mateo, soy {agente} de Nómada Studio. Con gusto, ¿cuántas unidades y de qué referencias necesitas?' }, { c: 'Unas 40 camisetas negras para un evento de la empresa' }], tags: ['Mayorista'] },
    { name: 'Luisa Fernanda Gil', phone: '3105550207', daysAgo: 2, time: '19:30', steps: [{ c: '¿Qué hay de nuevo esta semana?' }, { c: 'Muéstrame el catálogo' }] },
    { name: 'Daniel Torres', phone: '3105550208', daysAgo: 1, time: '20:10', steps: [{ c: '¿Puedo pagar con Addi a cuotas?' }, { c: 'Quiero los tenis blancos' }] },
    { name: 'Manuela Ortiz', phone: '3105550209', daysAgo: 0, time: '08:45', steps: [{ c: 'Buenas, ¿el vestido floral está disponible?' }, { c: '¿Y cuánto vale?' }], unread: 1 },
    { name: 'Simón Duque', phone: '3105550210', daysAgo: 0, time: '09:30', steps: [{ c: 'Necesito hablar con alguien, me llegó mal el pedido' }], unread: 1, tags: ['Reclamo'] },
  ],
  manualLeads: [
    { name: 'Carolina Mesa', phone: '3105550211', interest: 'Vestido floral midi', productName: 'Vestido floral midi', status: 'contactado', daysAgo: 3, source: 'Registro manual', notes: 'Preguntó en la tienda física por la talla 8.', history: ['Registrado manualmente por el equipo.', 'Se contactó al cliente'] },
    { name: 'Alejandro Bernal', phone: '3105550212', interest: 'Camisetas para uniforme de empresa', productName: 'Camiseta oversize negra', status: 'interesado', daysAgo: 4, source: 'Registro manual', notes: 'Cotización de 25 camisetas con logo.', history: ['Registrado manualmente por el equipo.', 'El cliente confirmó interés'] },
  ],
};
