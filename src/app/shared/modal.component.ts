import { Component, HostListener, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Ventana modal accesible: cierra con Escape, clic afuera o el botón ×. */
@Component({
  selector: 'w-modal',
  imports: [IconComponent],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="modal" [class.wide]="wide()" role="dialog" aria-modal="true" [attr.aria-label]="title()" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <div>
            <h2>{{ title() }}</h2>
            @if (subtitle()) { <p>{{ subtitle() }}</p> }
          </div>
          <button class="btn btn-quiet btn-icon" type="button" (click)="closed.emit()" aria-label="Cerrar"><w-icon name="close" [size]="18" /></button>
        </header>
        <div class="modal-body"><ng-content /></div>
        <footer class="modal-foot"><ng-content select="[footer]" /></footer>
      </div>
    </div>
  `,
  styles: [`
    .backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; background: rgba(19, 19, 22, 0.34); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: fade 0.2s ease; }
    .modal { width: min(560px, 100%); max-height: calc(100dvh - 2rem); display: flex; flex-direction: column; background: var(--surface); border-radius: 24px; box-shadow: var(--shadow-lg); animation: rise 0.32s var(--ease-out); }
    .modal.wide { width: min(760px, 100%); }
    .modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.4rem 1.5rem 0.6rem; }
    .modal-head h2 { font-size: 1.3rem; }
    .modal-head p { color: var(--text-3); font-size: 0.86rem; margin-top: 0.25rem; }
    .modal-body { padding: 0.8rem 1.5rem 1rem; overflow-y: auto; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 0.6rem; padding: 1rem 1.5rem 1.4rem; border-top: 1px solid var(--surface-2); }
    .modal-foot:empty { display: none; }
    @keyframes fade { from { opacity: 0; } }
    @keyframes rise { from { opacity: 0; transform: translateY(14px) scale(0.98); } }
    @media (max-width: 560px) {
      .backdrop { place-items: end center; padding: 0; }
      .modal, .modal.wide { width: 100%; border-radius: 24px 24px 0 0; max-height: 92dvh; }
    }
  `],
})
export class ModalComponent {
  title = input.required<string>();
  subtitle = input('');
  wide = input(false);
  closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape() { this.closed.emit(); }
}
