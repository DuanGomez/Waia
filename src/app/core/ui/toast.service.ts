import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';
export interface Toast { id: number; kind: ToastKind; title: string; text?: string }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private next = 1;

  show(kind: ToastKind, title: string, text?: string, ms = 3800): void {
    const id = this.next++;
    this.toasts.update((t) => [...t.slice(-3), { id, kind, title, text }]);
    setTimeout(() => this.dismiss(id), ms);
  }

  success(title: string, text?: string) { this.show('success', title, text); }
  error(title: string, text?: string) { this.show('error', title, text, 5000); }
  info(title: string, text?: string) { this.show('info', title, text); }
  warning(title: string, text?: string) { this.show('warning', title, text, 5000); }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
