# Waia · Asistente de atención por WhatsApp para negocios

> Waia atiende las conversaciones de tu negocio, responde las preguntas frecuentes y te ayuda a convertir más consultas en oportunidades de venta.

Demo comercial completa y funcional, pensada para mostrársela a negocios potenciales. Corre 100 % en el navegador, sin base de datos, sin backend y sin servicios de pago: **costo de operación $0 COP**.

## Cómo iniciar

Requisitos: Node.js 20 o superior (probado con Node 24).

```bash
npm install        # solo la primera vez
npm start          # abre http://localhost:4200
```

Para generar la versión estática (por ejemplo, para GitHub Pages): `npm run build` → carpeta `dist/waia/browser`.

## Qué incluye

| Sección | Qué hace |
|---|---|
| **Página comercial** (`/`) | Hero con chat animado, beneficios, cómo funciona, ejemplos por sector, funciones, preguntas frecuentes y llamada a la acción. Sin testimonios ni cifras inventadas. |
| **Resumen** | Indicadores calculados de los datos (conversaciones, atendidas, leads, respuestas automáticas, pendientes, tasa de automatización), actividad por día, actividad reciente y estado de WhatsApp: *Simulación activa*. |
| **Conversaciones** | Bandeja con búsqueda y filtros, chat con tarjetas de producto, indicador de «escribiendo», modo *Cliente* (prueba el bot) y modo *Equipo* (responde una persona), pausar el bot por chat, transferir, resolver y ficha del contacto. |
| **Configuración del asistente** | Nombre, tono (cercano, profesional, entusiasta), mensajes con variables, preguntas frecuentes (crear, editar, activar, eliminar), reglas y una *prueba rápida* con el motor real. |
| **Catálogo** | Productos o servicios con precio en COP, categoría, foto (URL o archivo), disponibilidad y estado. El bot solo responde con estos precios. |
| **Clientes potenciales** | Embudo por estado, búsqueda, cambio de estado, notas e historial. El bot los registra al pedir nombre y teléfono. |
| **Automatizaciones** | Reglas Cuando → Condición → Acción → Resultado, conectadas al motor; se pueden activar, editar, crear y eliminar. |
| **Analíticas** | Conversaciones y mensajes por día, resolución, leads, FAQ y productos más consultados, intenciones detectadas. |
| **Personalización** | Tres perfiles (restaurante, tienda de ropa, barbería) con datos aislados; nombre, tipo, logo, color de marca, contacto, horario y mensajes. |
| **WhatsApp** | Estado *No conectado*, requisitos de Meta, número comercial como referencia y la arquitectura futura. Nunca pide ni guarda tokens. |

Además: recorrido guiado opcional (se puede saltar y repetir), restablecer un negocio o toda la demo, validaciones en todos los formularios, estados vacíos, avisos y diseño adaptable a escritorio, tablet y móvil.

## Cómo funciona el asistente

El motor (`src/app/core/bot/engine.ts`) es un **motor de reglas determinista**, sin inteligencia artificial ni API externa:

1. Normaliza el mensaje (minúsculas, sin tildes).
2. Detecta la intención por palabras clave: persona, compra, preguntas frecuentes, horario, ubicación, precio, catálogo, cortesías.
3. Responde con los datos configurados del negocio; recuerda el último producto mencionado («¿y cuánto vale?», «lo quiero»).
4. Si el cliente quiere comprar, inicia el flujo producto → nombre → teléfono (validado) y crea el cliente potencial.
5. Si el cliente pide una persona, o el bot no entiende dos veces seguidas, transfiere el chat y se pausa.
6. Cada comportamiento depende de su automatización: si se desactiva, el bot deja de hacerlo.

Los datos de ejemplo se generan pasando conversaciones guionizadas por ese mismo motor, por eso las cifras de la demo siempre son coherentes con lo que el bot realmente responde.

## Arquitectura

```
src/app/
├── core/
│   ├── models.ts                 Contratos de dominio (los mismos que usaría una API)
│   ├── bot/                      Motor de reglas y lógica de conversación (funciones puras)
│   ├── data/                     Perfiles de demostración y generador de datos iniciales
│   ├── state/                    StorageService, WorkspaceRepository (contrato) y DemoStore
│   ├── services/                 Un servicio por dominio: conversaciones, catálogo, leads, asistente,
│   │                             automatizaciones, negocio, analíticas
│   └── ui/                       Avisos y diálogos de confirmación
├── layout/                       Barra lateral, barra superior y recorrido guiado
├── shared/                       Íconos, logo, modal, gráficos SVG, avatar, formatos
└── pages/                        Una carpeta por sección
```

- **Angular 21** con componentes standalone y signals. Sin librerías extra: gráficos e íconos propios en SVG.
- **Persistencia**: todo pasa por `WorkspaceRepository`. La implementación actual (`LocalWorkspaceRepository`) guarda en `localStorage` y valida lo que lee; si los datos están dañados, recrea la demo.
- **Aislamiento**: cada perfil de negocio es un `Workspace` independiente (catálogo, conversaciones, leads, configuración).
- **Cambio a producción**: se reemplaza el proveedor de `WorkspaceRepository` en `app.config.ts` (o los servicios por dominio) por una implementación HTTP. Los componentes no cambian.

## Limitaciones de esta demo

- **No hay conexión real con WhatsApp.** Las conversaciones se simulan en el navegador; ningún mensaje se envía ni se recibe.
- Los datos viven en el `localStorage` de cada navegador: no se comparten entre equipos ni usuarios.
- No hay inicio de sesión, usuarios, roles ni facturación.
- El motor entiende palabras clave en español; frases muy distintas a las configuradas pueden no reconocerse (en ese caso ofrece opciones o deriva a una persona).
- Las imágenes subidas se guardan comprimidas en el navegador, con el límite de espacio de `localStorage` (unos 5 MB).
- Las tipografías se cargan de Google Fonts (gratis); sin internet se usan las fuentes del sistema.

## Para convertirlo en producto comercial

1. **Backend** (por ejemplo, NestJS o Spring Boot) con base de datos y API REST para los mismos modelos.
2. **WhatsApp Business Platform**: cuenta de Meta verificada, número dedicado, webhook HTTPS que reciba los mensajes y ejecute el motor en el servidor, y plantillas aprobadas.
3. **Credenciales seguras**: tokens de Meta cifrados en el servidor, nunca en el navegador.
4. **Multiempresa real**: autenticación, roles (dueño, agente) y aislamiento de datos en el servidor.
5. **Notificaciones** al equipo cuando un chat se transfiere y **tiempo real** (WebSockets) en la bandeja.
6. **Cumplimiento**: política de tratamiento de datos (Ley 1581 de 2012) y aviso de privacidad.
7. **Facturación de suscripciones** y planes.

Waia es un producto independiente y no está afiliado, patrocinado ni respaldado por Meta Platforms ni WhatsApp. Créditos de las imágenes en [CREDITS.md](CREDITS.md).

Hecho por [Dcodea](https://www.instagram.com/dcod.ea/).
