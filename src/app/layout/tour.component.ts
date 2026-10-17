import { Component, HostListener, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../shared/icon.component';

interface Step { icon: string; title: string; text: string; route: string; tip?: string }

const STEPS: Step[] = [
  { icon: 'spark', route: '/app/resumen', title: 'Esto es Waia', text: 'Un asistente que atiende el WhatsApp de tu negocio: responde preguntas frecuentes, comparte precios y horarios, y registra a los clientes interesados para que tu equipo cierre la venta.', tip: 'Todo lo que ves es una demostración con datos ficticios. No hay conexión real con WhatsApp.' },
  { icon: 'bot', route: '/app/conversaciones', title: 'Cómo responde el asistente', text: 'Waia lee cada mensaje, identifica qué necesita el cliente (horario, ubicación, precios, un pedido) y responde con la información que configuró el negocio. Si no entiende o el cliente pide una persona, pasa el chat al equipo.' },
  { icon: 'chat', route: '/app/conversaciones', title: 'Simula una conversación', text: 'Elige un chat y escribe como si fueras el cliente: prueba «¿a qué hora abren?», «¿cuánto vale…?» o «quiero pedir…». El asistente responde en segundos. También puedes responder como agente o pausar el bot.' },
  { icon: 'sliders', route: '/app/asistente', title: 'Configura las respuestas', text: 'Aquí cambias el nombre del asistente, el tono, los mensajes y las preguntas frecuentes. Los cambios se aplican de inmediato en el simulador.' },
  { icon: 'target', route: '/app/clientes', title: 'Convierte consultas en ventas', text: 'Cuando alguien quiere comprar, el asistente le pide nombre y teléfono y lo registra como cliente potencial. Tu equipo le hace seguimiento desde esta lista.' },
  { icon: 'store', route: '/app/resumen', title: 'Un producto, muchos negocios', text: 'Con el selector «Perfil de demo» de la barra superior puedes mostrar Waia como restaurante, tienda de ropa o barbería, cada uno con su propio catálogo, conversaciones y clientes.' },
];

@Component({
  selector: 'w-tour',
  imports: [IconComponent],
  template: `
    <div class="tour" role="dialog" aria-modal="false" aria-label="Recorrido guiado">
      <div class="head">
        <span class="icon"><w-icon [name]="step().icon" [size]="20" /></span>
        <span class="count">Paso {{ i() + 1 }} de {{ steps.length }}</span>
        <button class="skip" type="button" (click)="finished.emit()">Saltar recorrido</button>
      </div>
      <h3>{{ step().title }}</h3>
      <p>{{ step().text }}</p>
      @if (step().tip) { <p class="tip"><w-icon name="info" [size]="15" /> {{ step().tip }}</p> }
      <div class="foot">
        <div class="dots">
          @for (s of steps; track s.title; let k = $index) { <button type="button" [class.on]="k === i()" (click)="go(k)" [attr.aria-label]="'Ir al paso ' + (k + 1)"></button> }
        </div>
        <div class="nav">
          @if (i() > 0) { <button class="btn btn-ghost btn-sm" type="button" (click)="go(i() - 1)">Atrás</button> }
          @if (i() < steps.length - 1) {
            <button class="btn btn-primary btn-sm" type="button" (click)="go(i() + 1)">Siguiente <w-icon name="arrow-right" [size]="15" /></button>
          } @else {
            <button class="btn btn-green btn-sm" type="button" (click)="finished.emit()">Empezar a probar</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tour { position: fixed; z-index: 950; right: 1.5rem; bottom: 1.5rem; width: min(420px, calc(100vw - 2rem)); padding: 1.3rem 1.4rem 1.2rem; border-radius: 24px; background: var(--surface); border: 1px solid var(--line); box-shadow: 0 30px 70px -20px rgba(19, 19, 22, 0.45); animation: rise 0.4s var(--ease-out); }
    .head { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.9rem; }
    .icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--green-soft); color: var(--green-dark); }
    .count { font-size: 0.78rem; font-weight: 600; color: var(--text-3); }
    .skip { margin-left: auto; font-size: 0.8rem; color: var(--text-3); font-weight: 500; }
    .skip:hover { color: var(--text); text-decoration: underline; }
    h3 { font-size: 1.2rem; margin-bottom: 0.45rem; }
    p { color: var(--text-2); font-size: 0.9rem; line-height: 1.55; }
    .tip { display: flex; gap: 0.45rem; margin-top: 0.8rem; padding: 0.65rem 0.75rem; border-radius: 12px; background: var(--amber-soft); color: var(--amber); font-size: 0.8rem; font-weight: 500; }
    .tip w-icon { margin-top: 2px; }
    .foot { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1.2rem; }
    .dots { display: flex; gap: 6px; }
    .dots button { width: 7px; height: 7px; border-radius: 99px; background: var(--line-strong); transition: all 0.3s var(--ease-out); }
    .dots button.on { width: 20px; background: var(--ink); }
    .nav { display: flex; gap: 0.5rem; }
    @keyframes rise { from { opacity: 0; transform: translateY(16px); } }
    @media (max-width: 560px) { .tour { right: 1rem; bottom: 1rem; } }
  `],
})
export class TourComponent {
  private router = inject(Router);
  finished = output<void>();
  steps = STEPS;
  i = signal(0);
  step = () => STEPS[this.i()];

  constructor() {
    this.router.navigateByUrl(STEPS[0].route);
  }

  go(k: number): void {
    this.i.set(k);
    this.router.navigateByUrl(STEPS[k].route);
  }

  @HostListener('document:keydown.escape')
  esc() { this.finished.emit(); }
}
