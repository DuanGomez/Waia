import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DemoStore } from '../../core/state/demo.store';
import { ProfileId } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';

interface ChatLine { from: 'in' | 'out'; text: string }

const HERO_CHAT: ChatLine[] = [
  { from: 'in', text: 'Hola, ¿a qué hora abren hoy?' },
  { from: 'out', text: 'Hoy atendemos de 12:00 p. m. a 11:00 p. m. ¿Te ayudo con algo del menú?' },
  { from: 'in', text: '¿Cuánto vale la picada para dos?' },
  { from: 'out', text: 'Picada para dos: $ 68.000. Res, cerdo, chorizo y papa criolla. ¿Te la aparto?' },
  { from: 'in', text: 'Sí, la quiero' },
  { from: 'out', text: '¡Listo! ¿A nombre de quién la registramos?' },
];

const SECTORS: { id: ProfileId; label: string; icon: string; img: string; title: string; text: string; chat: ChatLine[] }[] = [
  { id: 'restaurante', label: 'Restaurantes', icon: 'utensils', img: 'photos/restaurante/portada.webp', title: 'Pedidos y reservas sin dejar a nadie esperando', text: 'Comparte el menú con precios, responde por domicilios y horarios, y toma los datos del pedido mientras la cocina trabaja.',
    chat: [{ from: 'in', text: '¿Hacen domicilios a Envigado?' }, { from: 'out', text: 'Sí, de 12:00 m. a 9:30 p. m. El costo va de $5.000 a $9.000 según la zona.' }] },
  { id: 'ropa', label: 'Tiendas de ropa', icon: 'shirt', img: 'photos/ropa/portada.webp', title: 'Tallas, envíos y apartados a cualquier hora', text: 'Responde por tallas, cambios y medios de pago, muestra las prendas disponibles y separa las que el cliente quiere.',
    chat: [{ from: 'in', text: '¿El vestido floral está disponible?' }, { from: 'out', text: '¡Sí! Vestido floral midi está disponible. Cuesta $ 129.900. ¿Te lo separo?' }] },
  { id: 'barberia', label: 'Barberías', icon: 'scissors', img: 'photos/barberia/portada.webp', title: 'Turnos organizados sin contestar el celular', text: 'Informa precios de cortes y barba, la duración de cada servicio y registra la solicitud de turno con nombre y teléfono.',
    chat: [{ from: 'in', text: '¿Cuánto cuesta el corte fade?' }, { from: 'out', text: 'Corte fade degradado: $ 35.000. ¿Desea que le separemos el servicio?' }] },
];

const FAQS = [
  { q: '¿Tengo que cambiar mi número de WhatsApp?', a: 'Para la versión conectada se recomienda un número dedicado al asistente, registrado en WhatsApp Business Platform de Meta. Tu equipo sigue viendo y respondiendo las conversaciones desde el panel de Waia.' },
  { q: '¿Waia usa inteligencia artificial?', a: 'Waia funciona con reglas y respuestas que configura el negocio: detecta qué pide el cliente y responde con tu información. Así nunca inventa precios ni promete cosas que no ofreces.' },
  { q: '¿Qué pasa si el asistente no sabe responder?', a: 'Ofrece opciones al cliente y, si no logra ayudar o el cliente pide una persona, transfiere la conversación a tu equipo y se pausa en ese chat.' },
  { q: '¿Puedo responder yo en cualquier momento?', a: 'Sí. Puedes pausar el asistente en una conversación, escribir como equipo y volver a activarlo cuando quieras.' },
  { q: '¿La demo está conectada a WhatsApp?', a: 'No. La demo es una simulación completa que corre en tu navegador con datos ficticios. La conexión real requiere la aprobación de Meta y un servidor, y se configura cuando el negocio contrata el servicio.' },
  { q: '¿Sirve para mi tipo de negocio?', a: 'Waia se adapta a negocios que reciben consultas por WhatsApp: restaurantes, tiendas, joyerías, barberías, estudios de tatuajes y servicios en general. Cada negocio configura su catálogo, horarios y mensajes.' },
];

@Component({
  selector: 'w-landing',
  imports: [RouterLink, IconComponent, LogoComponent],
  template: `
    <header class="nav" [class.scrolled]="scrolled()">
      <div class="container nav-in">
        <a routerLink="/" aria-label="Waia, inicio"><w-logo [size]="30" /></a>
        <nav class="links" [class.open]="menu()">
          <a href="#beneficios" (click)="menu.set(false)">Beneficios</a>
          <a href="#como-funciona" (click)="menu.set(false)">Cómo funciona</a>
          <a href="#sectores" (click)="menu.set(false)">Sectores</a>
          <a href="#funciones" (click)="menu.set(false)">Funciones</a>
          <a href="#preguntas" (click)="menu.set(false)">Preguntas</a>
        </nav>
        <div class="nav-cta">
          <a class="btn btn-primary btn-sm" routerLink="/app">Probar la demo</a>
          <button class="btn btn-quiet btn-icon burger" type="button" (click)="menu.set(!menu())" aria-label="Menú"><w-icon [name]="menu() ? 'close' : 'menu'" /></button>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <div class="container hero-in">
        <div class="hero-copy">
          <span class="kicker"><w-icon name="spark" [size]="14" /> Asistente de atención para WhatsApp</span>
          <h1>Tu WhatsApp responde solo.<br /><span>Tú cierras las ventas.</span></h1>
          <p class="lead">Waia atiende las conversaciones de tu negocio, responde las preguntas frecuentes y te ayuda a convertir más consultas en oportunidades de venta.</p>
          <div class="hero-ctas">
            <a class="btn btn-green btn-lg" routerLink="/app"><w-icon name="play" [size]="17" /> Probar la demo</a>
            <a class="btn btn-ghost btn-lg" [href]="contactHref">Solicitar información</a>
          </div>
          <p class="hero-note"><w-icon name="check" [size]="15" /> Demo interactiva, sin registro · Datos ficticios</p>
        </div>

        <div class="hero-visual" aria-label="Ejemplo de conversación de la demo">
          <div class="device">
            <div class="d-head">
              <span class="d-avatar">BR</span>
              <div><strong>Brasa Roja</strong><small>Asistente Rosa · ejemplo de la demo</small></div>
            </div>
            <div class="d-body">
              @for (m of shown(); track $index) { <div class="bubble" [class]="'bubble ' + m.from">{{ m.text }}</div> }
              @if (typing()) { <div class="bubble out typing"><i></i><i></i><i></i></div> }
            </div>
          </div>
          <div class="float f1"><span class="f-icon"><w-icon name="target" [size]="16" /></span><div><strong>Cliente potencial registrado</strong><small>Picada para dos · ejemplo</small></div></div>
          <div class="float f2"><span class="f-icon amber"><w-icon name="headset" [size]="16" /></span><div><strong>Pidió una persona</strong><small>Transferido al equipo</small></div></div>
        </div>
      </div>
    </section>

    <section class="strip">
      <div class="container strip-in">
        <span>Pensado para negocios que venden por WhatsApp</span>
        <div class="chips">
          @for (c of chips; track c.label) { <span class="chip"><w-icon [name]="c.icon" [size]="16" /> {{ c.label }}</span> }
        </div>
      </div>
    </section>

    <!-- Beneficios -->
    <section class="section" id="beneficios">
      <div class="container">
        <div class="sec-head"><span class="eyebrow">Beneficios</span><h2>Menos mensajes repetidos.<br />Más tiempo para vender.</h2></div>
        <div class="benefits">
          @for (b of benefits; track b.title) {
            <article class="benefit"><span class="b-icon"><w-icon [name]="b.icon" [size]="22" /></span><h3>{{ b.title }}</h3><p>{{ b.text }}</p></article>
          }
        </div>
      </div>
    </section>

    <!-- Cómo funciona -->
    <section class="section alt" id="como-funciona">
      <div class="container">
        <div class="sec-head"><span class="eyebrow">Cómo funciona</span><h2>Listo en tres pasos</h2></div>
        <ol class="steps">
          @for (s of steps; track s.title; let i = $index) {
            <li><span class="n">{{ i + 1 }}</span><h3>{{ s.title }}</h3><p>{{ s.text }}</p></li>
          }
        </ol>
      </div>
    </section>

    <!-- Sectores -->
    <section class="section" id="sectores">
      <div class="container">
        <div class="sec-head"><span class="eyebrow">Ejemplos de uso</span><h2>Un mismo asistente, configurado para cada negocio</h2><p>Estos ejemplos son demostraciones del producto con negocios ficticios.</p></div>
        <div class="seg sector-tabs" role="tablist">
          @for (s of sectors; track s.id) { <button type="button" role="tab" [class.active]="sector().id === s.id" (click)="sector.set(s)"><w-icon [name]="s.icon" [size]="16" /> {{ s.label }}</button> }
        </div>
        <article class="sector">
          <img [src]="sector().img" [alt]="sector().label" />
          <div class="sector-copy">
            <h3>{{ sector().title }}</h3>
            <p>{{ sector().text }}</p>
            <div class="mini-chat">
              @for (m of sector().chat; track m.text) { <div class="bubble" [class]="'bubble ' + m.from">{{ m.text }}</div> }
            </div>
            <button class="btn btn-primary" type="button" (click)="openDemo(sector().id)">Ver la demo de {{ sector().label.toLowerCase() }} <w-icon name="arrow-right" [size]="16" /></button>
          </div>
        </article>
      </div>
    </section>

    <!-- Funciones -->
    <section class="section alt" id="funciones">
      <div class="container">
        <div class="sec-head"><span class="eyebrow">Funciones</span><h2>Todo lo que tu equipo necesita en un panel</h2></div>
        <div class="features">
          @for (f of features; track f.title) {
            <article class="feature"><w-icon [name]="f.icon" [size]="22" /><div><h3>{{ f.title }}</h3><p>{{ f.text }}</p></div></article>
          }
        </div>
      </div>
    </section>

    <!-- Preguntas -->
    <section class="section" id="preguntas">
      <div class="container narrow">
        <div class="sec-head"><span class="eyebrow">Preguntas frecuentes</span><h2>Lo que suelen preguntarnos</h2></div>
        <div class="faq">
          @for (f of faqs; track f.q; let i = $index) {
            <div class="faq-item" [class.open]="openFaq() === i">
              <button type="button" (click)="openFaq.set(openFaq() === i ? -1 : i)" [attr.aria-expanded]="openFaq() === i">{{ f.q }}<w-icon name="chevron-down" [size]="18" /></button>
              <div class="faq-a"><p>{{ f.a }}</p></div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- CTA final -->
    <section class="final">
      <div class="container final-in">
        <h2>Mira cómo atendería Waia a tus clientes</h2>
        <p>Prueba la demo con un restaurante, una tienda de ropa o una barbería. Escribe como si fueras un cliente y observa la respuesta.</p>
        <div class="hero-ctas center">
          <a class="btn btn-green btn-lg" routerLink="/app"><w-icon name="play" [size]="17" /> Probar la demo</a>
          <a class="btn btn-lg ghost-dark" [href]="contactHref">Hablar con nosotros</a>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="container foot-in">
        <div class="f-brand">
          <w-logo [size]="28" [inverse]="true" />
          <p>Asistente de atención y ventas por WhatsApp para pequeños y medianos negocios en Colombia.</p>
        </div>
        <div class="f-cols">
          <div><h4>Producto</h4><a href="#beneficios">Beneficios</a><a href="#funciones">Funciones</a><a routerLink="/app">Demo</a></div>
          <div><h4>Sectores</h4><a href="#sectores">Restaurantes</a><a href="#sectores">Tiendas de ropa</a><a href="#sectores">Barberías</a></div>
          <div><h4>Contacto</h4><a [href]="contactHref">dcodea.correo&#64;gmail.com</a><a href="https://www.instagram.com/dcod.ea/" target="_blank" rel="noopener">Instagram de Dcodea</a></div>
        </div>
      </div>
      <div class="container legal">
        <span>© {{ year }} Waia · Un producto de Dcodea</span>
        <span>Waia es un producto independiente y no está afiliado, patrocinado ni respaldado por Meta Platforms ni WhatsApp.</span>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; background: var(--bg); }
    .container { width: min(1180px, 100% - 2.5rem); margin: 0 auto; }
    .container.narrow { width: min(780px, 100% - 2.5rem); }
    .nav { position: sticky; top: 0; z-index: 50; transition: background-color 0.3s ease, box-shadow 0.3s ease; }
    .nav.scrolled { background: rgba(250, 250, 247, 0.86); backdrop-filter: blur(14px) saturate(160%); -webkit-backdrop-filter: blur(14px) saturate(160%); box-shadow: 0 1px 0 var(--line); }
    .nav-in { height: 68px; display: flex; align-items: center; gap: 2rem; }
    .links { display: flex; gap: 1.6rem; margin-left: auto; }
    .links a { font-size: 0.9rem; color: var(--text-2); font-weight: 500; }
    .links a:hover { color: var(--text); }
    .nav-cta { display: flex; align-items: center; gap: 0.4rem; }
    .burger { display: none; }

    .hero { padding: 3.5rem 0 4rem; }
    .hero-in { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 3rem; align-items: center; }
    .kicker { display: inline-flex; align-items: center; gap: 0.4rem; height: 32px; padding: 0 0.85rem; border-radius: 999px; background: var(--green-soft); color: var(--green-dark); font-size: 0.82rem; font-weight: 600; }
    .hero h1 { margin-top: 1.2rem; font-size: clamp(2.5rem, 5.2vw, 4.2rem); line-height: 1.02; letter-spacing: -0.055em; }
    .hero h1 span { color: var(--green-dark); }
    .lead { margin-top: 1.3rem; font-size: 1.15rem; line-height: 1.55; color: var(--text-2); max-width: 540px; }
    .hero-ctas { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-top: 2rem; }
    .hero-ctas.center { justify-content: center; }
    .hero-note { display: flex; align-items: center; gap: 0.4rem; margin-top: 1.2rem; font-size: 0.85rem; color: var(--text-3); }
    .hero-note w-icon { color: var(--green); }

    .hero-visual { position: relative; display: flex; justify-content: center; padding: 1.5rem 0; }
    .device { width: min(360px, 100%); border-radius: 34px; background: var(--surface); border: 1px solid var(--line); box-shadow: 0 40px 80px -30px rgba(19, 19, 22, 0.35); overflow: hidden; }
    .d-head { display: flex; align-items: center; gap: 0.7rem; padding: 1rem 1.1rem; background: var(--ink); color: #fff; }
    .d-avatar { width: 38px; height: 38px; border-radius: 50%; background: #c2410c; display: grid; place-items: center; font-weight: 700; font-size: 0.8rem; }
    .d-head strong { display: block; font-size: 0.92rem; }
    .d-head small { font-size: 0.74rem; color: rgba(255, 255, 255, 0.65); }
    .d-body { height: 400px; display: flex; flex-direction: column; justify-content: flex-end; gap: 0.5rem; padding: 1rem; background: #f3f1ec; background-image: radial-gradient(rgba(19, 19, 22, 0.04) 1px, transparent 1px); background-size: 16px 16px; overflow: hidden; }
    .bubble { max-width: 82%; padding: 0.6rem 0.8rem; border-radius: 16px; font-size: 0.86rem; line-height: 1.4; animation: pop 0.35s var(--ease-out); }
    .bubble.in { align-self: flex-start; background: #fff; border-top-left-radius: 5px; }
    .bubble.out { align-self: flex-end; background: #dff3e8; border-top-right-radius: 5px; }
    .typing { display: flex; gap: 4px; padding: 0.75rem 0.9rem; }
    .typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--green-dark); animation: dot 1.2s infinite; opacity: 0.4; }
    .typing i:nth-child(2) { animation-delay: 0.15s; } .typing i:nth-child(3) { animation-delay: 0.3s; }
    @keyframes dot { 0%, 60%, 100% { opacity: 0.35; transform: none; } 30% { opacity: 1; transform: translateY(-3px); } }
    @keyframes pop { from { opacity: 0; transform: translateY(8px) scale(0.97); } }
    .float { position: absolute; display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 0.9rem; border-radius: 16px; background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow-lg); animation: floaty 6s ease-in-out infinite; }
    .float strong { display: block; font-size: 0.82rem; }
    .float small { font-size: 0.74rem; color: var(--text-3); }
    .f-icon { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; background: var(--green-soft); color: var(--green-dark); }
    .f-icon.amber { background: var(--amber-soft); color: var(--amber); }
    .f1 { left: -1rem; top: 22%; }
    .f2 { right: -1rem; bottom: 16%; animation-delay: -3s; }
    @keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

    .strip { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: var(--surface); }
    .strip-in { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; padding: 1.2rem 0; flex-wrap: wrap; }
    .strip-in > span { font-size: 0.9rem; color: var(--text-3); font-weight: 500; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip { display: inline-flex; align-items: center; gap: 0.4rem; height: 34px; padding: 0 0.9rem; border-radius: 999px; background: var(--bg); border: 1px solid var(--line); font-size: 0.84rem; color: var(--text-2); }

    .section { padding: 5.5rem 0; }
    .section.alt { background: var(--surface); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .sec-head { text-align: center; max-width: 720px; margin: 0 auto 3rem; }
    .eyebrow { font-size: 0.82rem; font-weight: 700; color: var(--green-dark); text-transform: uppercase; letter-spacing: 0.08em; }
    .sec-head h2 { margin-top: 0.7rem; font-size: clamp(1.9rem, 3.8vw, 2.8rem); line-height: 1.08; letter-spacing: -0.045em; }
    .sec-head p { margin-top: 0.9rem; color: var(--text-2); }

    .benefits { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
    .benefit { padding: 1.6rem 1.4rem; border-radius: 24px; background: var(--surface); border: 1px solid var(--line); transition: transform 0.3s var(--ease), box-shadow 0.3s ease; }
    .benefit:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
    .b-icon { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: var(--ink); color: #4ade80; margin-bottom: 1.2rem; }
    .benefit h3 { font-size: 1.12rem; }
    .benefit p { margin-top: 0.5rem; color: var(--text-2); font-size: 0.92rem; line-height: 1.55; }

    .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.4rem; counter-reset: s; }
    .steps li { position: relative; padding: 1.8rem 1.6rem; border-radius: 24px; background: var(--bg); border: 1px solid var(--line); }
    .n { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--green); color: #fff; font-family: var(--display); font-weight: 700; margin-bottom: 1.1rem; }
    .steps h3 { font-size: 1.15rem; }
    .steps p { margin-top: 0.5rem; color: var(--text-2); font-size: 0.93rem; line-height: 1.55; }

    .sector-tabs { display: flex; width: fit-content; margin: 0 auto 1.6rem; max-width: 100%; overflow-x: auto; }
    .sector-tabs button { display: inline-flex; align-items: center; gap: 0.4rem; height: 38px; padding: 0 1.1rem; }
    .sector { display: grid; grid-template-columns: 1fr 1fr; border-radius: 30px; overflow: hidden; background: var(--surface); border: 1px solid var(--line); }
    .sector img { width: 100%; height: 100%; min-height: 380px; object-fit: cover; }
    .sector-copy { padding: 2.6rem; display: flex; flex-direction: column; gap: 1rem; justify-content: center; }
    .sector-copy h3 { font-size: 1.7rem; letter-spacing: -0.04em; line-height: 1.12; }
    .sector-copy p { color: var(--text-2); line-height: 1.6; }
    .mini-chat { display: flex; flex-direction: column; gap: 0.45rem; padding: 1rem; border-radius: 18px; background: #f3f1ec; }
    .sector-copy .btn { align-self: flex-start; }

    .features { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem 2.5rem; }
    .feature { display: flex; gap: 1rem; padding: 1.2rem 0; border-top: 1px solid var(--line); }
    .feature w-icon { color: var(--green-dark); margin-top: 2px; }
    .feature h3 { font-size: 1.02rem; }
    .feature p { margin-top: 0.3rem; color: var(--text-2); font-size: 0.92rem; line-height: 1.55; }

    .faq { display: flex; flex-direction: column; gap: 0.6rem; }
    .faq-item { border-radius: 18px; background: var(--surface); border: 1px solid var(--line); overflow: hidden; }
    .faq-item button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.15rem 1.3rem; text-align: left; font-weight: 600; font-size: 0.98rem; }
    .faq-item button w-icon { transition: transform 0.3s var(--ease-out); color: var(--text-3); }
    .faq-item.open button w-icon { transform: rotate(180deg); }
    .faq-a { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.35s var(--ease-out); }
    .faq-a p { overflow: hidden; padding: 0 1.3rem; color: var(--text-2); line-height: 1.6; font-size: 0.93rem; }
    .faq-item.open .faq-a { grid-template-rows: 1fr; }
    .faq-item.open .faq-a p { padding-bottom: 1.2rem; }

    .final { padding: 5rem 0; background: var(--ink); color: #fff; text-align: center; }
    .final-in { max-width: 720px; }
    .final h2 { font-size: clamp(1.9rem, 4vw, 2.8rem); letter-spacing: -0.045em; line-height: 1.1; color: #fff; }
    .final p { margin-top: 1rem; color: rgba(255, 255, 255, 0.72); font-size: 1.05rem; }
    .ghost-dark { color: #fff; border: 1px solid rgba(255, 255, 255, 0.28); }
    .ghost-dark:hover { background: rgba(255, 255, 255, 0.08); }

    .footer { background: #0d0d0f; color: rgba(255, 255, 255, 0.7); padding: 3.5rem 0 1.6rem; }
    .foot-in { display: flex; justify-content: space-between; gap: 3rem; flex-wrap: wrap; }
    .f-brand { max-width: 320px; display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem; }
    .f-cols { display: flex; gap: 3.5rem; flex-wrap: wrap; }
    .f-cols div { display: flex; flex-direction: column; gap: 0.55rem; font-size: 0.88rem; }
    .f-cols h4 { color: #fff; font-size: 0.88rem; margin-bottom: 0.2rem; }
    .f-cols a:hover { color: #fff; }
    .legal { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 2.5rem; padding-top: 1.4rem; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.78rem; color: rgba(255, 255, 255, 0.45); }

    @media (max-width: 1000px) {
      .hero-in { grid-template-columns: 1fr; gap: 2rem; }
      .benefits { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .sector { grid-template-columns: 1fr; }
      .sector img { min-height: 240px; max-height: 300px; }
    }
    @media (max-width: 820px) {
      .links { position: absolute; top: 68px; left: 0; right: 0; flex-direction: column; gap: 0; padding: 0.5rem 1.25rem 1rem; background: var(--bg); border-bottom: 1px solid var(--line); display: none; }
      .links.open { display: flex; }
      .links a { padding: 0.8rem 0; border-bottom: 1px solid var(--surface-2); }
      .burger { display: inline-flex; }
      .steps, .features { grid-template-columns: 1fr; }
      .section { padding: 4rem 0; }
    }
    @media (max-width: 560px) {
      .hero { padding-top: 2rem; }
      .benefits { grid-template-columns: 1fr; }
      .float { display: none; }
      .sector-copy { padding: 1.6rem; }
      .hero-ctas .btn { flex: 1; }
      .d-body { height: 340px; }
    }
  `],
})
export class LandingPage implements OnDestroy {
  private store = inject(DemoStore);
  private router = inject(Router);

  contactHref = 'mailto:dcodea.correo@gmail.com?subject=Quiero%20saber%20m%C3%A1s%20de%20Waia';
  year = new Date().getFullYear();
  menu = signal(false);
  scrolled = signal(false);
  openFaq = signal(0);
  sectors = SECTORS;
  sector = signal(SECTORS[0]);
  faqs = FAQS;
  shown = signal<ChatLine[]>(HERO_CHAT.slice(0, 2));
  typing = signal(false);

  chips = [
    { label: 'Restaurantes', icon: 'utensils' }, { label: 'Tiendas de ropa', icon: 'shirt' }, { label: 'Joyerías', icon: 'crown' },
    { label: 'Barberías', icon: 'scissors' }, { label: 'Estudios de tatuajes', icon: 'edit' }, { label: 'Servicios', icon: 'calendar' },
  ];
  benefits = [
    { icon: 'clock', title: 'Responde al instante', text: 'Horarios, ubicación, domicilios y medios de pago contestados en segundos, también de noche y los fines de semana.' },
    { icon: 'tag', title: 'Precios reales de tu catálogo', text: 'Comparte productos y servicios con el precio que tú configuraste. Si algo está agotado, lo dice.' },
    { icon: 'target', title: 'Captura clientes interesados', text: 'Cuando alguien quiere comprar o reservar, pide nombre y teléfono y lo deja listo para tu equipo.' },
    { icon: 'headset', title: 'Una persona cuando hace falta', text: 'Si el cliente pide hablar con alguien o la pregunta es especial, transfiere el chat y se hace a un lado.' },
  ];
  steps = [
    { title: 'Configura tu negocio', text: 'Carga tu catálogo, horarios, dirección y las preguntas que más te hacen. Elige el tono del asistente.' },
    { title: 'Waia atiende los mensajes', text: 'Identifica qué necesita cada cliente y responde con tu información, sin inventar datos.' },
    { title: 'Tu equipo cierra la venta', text: 'Revisa los clientes potenciales, retoma las conversaciones transferidas y mide los resultados.' },
  ];
  features = [
    { icon: 'chats', title: 'Bandeja de conversaciones', text: 'Todos los chats en un solo lugar, con filtros por estado y quién está respondiendo.' },
    { icon: 'sliders', title: 'Respuestas configurables', text: 'Mensajes de bienvenida, despedida y preguntas frecuentes editables sin programar.' },
    { icon: 'tag', title: 'Catálogo de productos y servicios', text: 'Precios en pesos, categorías, fotos y disponibilidad que el asistente consulta.' },
    { icon: 'target', title: 'Clientes potenciales', text: 'Registro automático con nombre, teléfono e interés, y seguimiento por estado.' },
    { icon: 'bolt', title: 'Automatizaciones', text: 'Reglas de bienvenida, catálogo, horarios, derivación y registro de pedidos.' },
    { icon: 'chart', title: 'Analíticas', text: 'Preguntas más frecuentes, productos más consultados y cuánto resuelve el asistente.' },
    { icon: 'store', title: 'Marca de cada negocio', text: 'Nombre, logo, color y datos propios: el mismo producto se adapta a cada cliente.' },
    { icon: 'shield', title: 'Credenciales seguras', text: 'En producción, la conexión con Meta se gestiona desde el servidor, nunca en el navegador.' },
  ];

  private timer: ReturnType<typeof setTimeout> | null = null;
  private onScroll = () => this.scrolled.set(window.scrollY > 8);

  constructor() {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.timer = setTimeout(() => this.play(2), 1200);
  }

  /** Reproduce en bucle la conversación de ejemplo del hero. */
  private play(i: number): void {
    if (i >= HERO_CHAT.length) {
      this.timer = setTimeout(() => { this.shown.set([]); this.play(0); }, 3200);
      return;
    }
    const line = HERO_CHAT[i];
    if (line.from === 'out') {
      this.typing.set(true);
      this.timer = setTimeout(() => { this.typing.set(false); this.shown.update((s) => [...s, line]); this.timer = setTimeout(() => this.play(i + 1), 900); }, 1100);
    } else {
      this.timer = setTimeout(() => { this.shown.update((s) => [...s, line]); this.play(i + 1); }, i === 0 ? 500 : 1000);
    }
  }

  openDemo(id: ProfileId): void {
    this.store.switchProfile(id);
    this.router.navigateByUrl('/app/resumen');
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    window.removeEventListener('scroll', this.onScroll);
  }
}
