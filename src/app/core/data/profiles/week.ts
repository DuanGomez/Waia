import { OpeningHours } from '../../models';

const DAYS: [key: string, label: string][] = [
  ['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'], ['jueves', 'Jueves'],
  ['viernes', 'Viernes'], ['sabado', 'Sábado'], ['domingo', 'Domingo'],
];

/** week({ lunes: ['09:00', '18:00'], domingo: null }) → horario de 7 días. */
export function week(map: Record<string, [string, string] | null>): OpeningHours[] {
  return DAYS.map(([key, day]) => {
    const h = map[key];
    return h ? { day, open: true, from: h[0], to: h[1] } : { day, open: false, from: '09:00', to: '18:00' };
  });
}
