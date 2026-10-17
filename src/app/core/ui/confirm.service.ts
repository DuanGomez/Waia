import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  text: string;
  confirmLabel?: string;
  danger?: boolean;
}

/** Diálogo de confirmación con promesa: `if (await confirm.ask({...})) { ... }` */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);
  private resolver: ((ok: boolean) => void) | null = null;

  ask(req: ConfirmRequest): Promise<boolean> {
    this.resolver?.(false);
    this.current.set(req);
    return new Promise((resolve) => (this.resolver = resolve));
  }

  answer(ok: boolean): void {
    this.resolver?.(ok);
    this.resolver = null;
    this.current.set(null);
  }
}
