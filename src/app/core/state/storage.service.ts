import { Injectable, signal } from '@angular/core';

/**
 * Único punto de acceso a localStorage. Si el navegador lo bloquea (modo privado, cuota llena)
 * la demo sigue funcionando en memoria y se avisa en la interfaz.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  /** Último error de persistencia (null si todo va bien). */
  readonly error = signal<string | null>(null);

  read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      this.error.set('No se pudieron leer los datos guardados. Se cargó la demo inicial.');
      return null;
    }
  }

  write(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (this.error()) this.error.set(null);
      return true;
    } catch {
      this.error.set('El navegador no permite guardar datos. Los cambios se perderán al recargar.');
      return false;
    }
  }

  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* sin acceso: no hay nada que borrar */ }
  }
}
