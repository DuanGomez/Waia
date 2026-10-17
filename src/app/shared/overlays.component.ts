import { Component, inject } from '@angular/core';
import { ToastService } from '../core/ui/toast.service';
import { ConfirmService } from '../core/ui/confirm.service';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

const ICONS = { success: 'check', error: 'close', warning: 'alert', info: 'info' } as const;

/** Avisos flotantes y diálogo de confirmación globales. */
@Component({
  selector: 'w-overlays',
  imports: [IconComponent, ModalComponent],
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast-' + t.kind">
          <span class="dot"><w-icon [name]="icons[t.kind]" [size]="13" [stroke]="2.4" /></span>
          <div class="body"><strong>{{ t.title }}</strong>@if (t.text) { <span>{{ t.text }}</span> }</div>
          <button type="button" (click)="toast.dismiss(t.id)" aria-label="Cerrar aviso"><w-icon name="close" [size]="14" /></button>
        </div>
      }
    </div>

    @if (confirm.current(); as c) {
      <w-modal [title]="c.title" (closed)="confirm.answer(false)">
        <p class="muted">{{ c.text }}</p>
        <ng-container footer>
          <button class="btn btn-ghost" type="button" (click)="confirm.answer(false)">Cancelar</button>
          <button class="btn" [class.btn-danger]="c.danger" [class.btn-primary]="!c.danger" type="button" (click)="confirm.answer(true)">{{ c.confirmLabel ?? 'Confirmar' }}</button>
        </ng-container>
      </w-modal>
    }
  `,
  styles: [`
    .toasts { position: fixed; z-index: 1100; right: 1.25rem; bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; width: min(380px, calc(100vw - 2rem)); }
    .toast { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.85rem 0.9rem; border-radius: 16px; background: var(--ink); color: #fff; box-shadow: var(--shadow-lg); animation: slide 0.35s var(--ease-out); }
    .dot { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; }
    .toast-success .dot { background: var(--green); }
    .toast-error .dot { background: var(--red); }
    .toast-warning .dot { background: #e0a020; }
    .toast-info .dot { background: var(--blue); }
    .body { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; font-size: 0.86rem; }
    .body span { color: rgba(255, 255, 255, 0.72); font-size: 0.8rem; }
    .toast button { color: rgba(255, 255, 255, 0.6); padding: 2px; }
    .toast button:hover { color: #fff; }
    @keyframes slide { from { opacity: 0; transform: translateY(12px); } }
    @media (max-width: 560px) { .toasts { right: 1rem; left: 1rem; width: auto; bottom: 1rem; } }
  `],
})
export class OverlaysComponent {
  toast = inject(ToastService);
  confirm = inject(ConfirmService);
  icons = ICONS;
}
