import { OpeningHours } from '../models';

/** Minúsculas, sin tildes ni signos: "¿Dónde QUEDAN?" → "donde quedan". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ¿El texto normalizado contiene la palabra o frase completa? */
export function hasPhrase(normalized: string, phrase: string): boolean {
  return ` ${normalized} `.includes(` ${normalize(phrase)} `);
}

export function countMatches(normalized: string, phrases: string[]): number {
  return phrases.reduce((n, p) => n + (p.trim() && hasPhrase(normalized, p) ? 1 : 0), 0);
}

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const formatCOP = (value: number) => COP.format(value).replace(/ /g, ' ');

/** "14:30" → "2:30 p. m." */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Agrupa días consecutivos con el mismo horario: "Lunes a viernes: 11:00 a. m. – 10:00 p. m." */
export function formatHours(hours: OpeningHours[]): string[] {
  const lines: string[] = [];
  let i = 0;
  while (i < hours.length) {
    const start = hours[i];
    let j = i;
    const same = (a: OpeningHours, b: OpeningHours) => a.open === b.open && (!a.open || (a.from === b.from && a.to === b.to));
    while (j + 1 < hours.length && same(hours[j + 1], start)) j++;
    const days = i === j ? start.day : `${start.day} ${j === i + 1 ? 'y' : 'a'} ${hours[j].day.toLowerCase()}`;
    lines.push(start.open ? `${days}: ${to12h(start.from)} – ${to12h(start.to)}` : `${days}: cerrado`);
    i = j + 1;
  }
  return lines;
}

/** Reemplaza {negocio}, {asistente}, etc. en los mensajes configurables. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}

/** Extrae un celular colombiano o fijo: 10 dígitos (3xx…) o 7 dígitos. */
export function extractPhone(text: string): string | null {
  const digits = text.replace(/[^\d]/g, '');
  const local = digits.startsWith('57') && digits.length === 12 ? digits.slice(2) : digits;
  if (/^3\d{9}$/.test(local) || /^60\d{8}$/.test(local)) return local;
  return null;
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : phone;
}

/** Nombre plausible: "me llamo Ana María" → "Ana María". */
export function extractName(text: string): string | null {
  const cleaned = text.replace(/^(me llamo|mi nombre es|soy|a nombre de|es|para)\s+/i, '').replace(/[.,!¡?¿]/g, '').trim();
  if (cleaned.length < 2 || cleaned.length > 40 || /\d/.test(cleaned)) return null;
  const words = cleaned.split(/\s+/);
  if (words.length > 4) return null;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
