import { Pipe, PipeTransform } from '@angular/core';
import { formatCOP, formatPhone } from '../core/bot/text';

@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(value: number | null | undefined): string { return value == null ? '' : formatCOP(value); }
}

@Pipe({ name: 'phone' })
export class PhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string { return value ? formatPhone(value) : ''; }
}

const time = (d: Date) => d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

/** "10:42 a. m." hoy, "Ayer", "lun 14" la última semana, fecha corta antes. */
export function shortWhen(iso: string, withTime = false): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days <= 0) return time(d);
  if (days === 1) return withTime ? `Ayer, ${time(d)}` : 'Ayer';
  if (days < 7) return d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '') + (withTime ? `, ${time(d)}` : '');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** "hace 5 min", "hace 3 h", "hace 2 días". */
export function relative(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

@Pipe({ name: 'when' })
export class WhenPipe implements PipeTransform {
  transform(iso: string | null | undefined, withTime = false): string { return iso ? shortWhen(iso, withTime) : ''; }
}

@Pipe({ name: 'ago' })
export class AgoPipe implements PipeTransform {
  transform(iso: string | null | undefined): string { return iso ? relative(iso) : ''; }
}

@Pipe({ name: 'longDate' })
export class LongDatePipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}, ${time(d)}`;
  }
}
