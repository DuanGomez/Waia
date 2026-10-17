import { Component, input } from '@angular/core';

/**
 * Marca de Waia: globo de conversación con un destello (la "inteligencia") dentro de un
 * cuadrado de tinta. Identidad propia: no usa el logotipo ni los colores de marca de Meta.
 */
@Component({
  selector: 'w-logo',
  template: `
    <span class="logo" [class.inverse]="inverse()">
      <svg class="mark" [style.width.px]="size()" [style.height.px]="size()" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="17" [attr.fill]="inverse() ? '#ffffff' : '#131316'" />
        <path d="M18 17h28a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H30l-9 7v-7h-3a7 7 0 0 1-7-7V24a7 7 0 0 1 7-7Z" fill="#17b26a" />
        <path d="M32 22.5c.9 4.4 2.6 6.1 7 7-4.4.9-6.1 2.6-7 7-.9-4.4-2.6-6.1-7-7 4.4-.9 6.1-2.6 7-7Z" fill="#ffffff" />
      </svg>
      @if (wordmark()) { <span class="word" [style.font-size.px]="size() * 0.62">waia</span> }
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .logo { display: inline-flex; align-items: center; gap: 0.55rem; color: var(--ink); }
    .logo.inverse { color: #fff; }
    .mark { display: block; flex-shrink: 0; }
    .word { font-family: var(--display); font-weight: 700; letter-spacing: -0.05em; line-height: 1; }
  `],
})
export class LogoComponent {
  size = input(32);
  wordmark = input(true);
  inverse = input(false);
}
