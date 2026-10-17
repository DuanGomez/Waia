import { ProfileId } from '../../models';
import { ProfileSeed } from '../seed-builder';
import { BARBERIA } from './barberia';
import { RESTAURANTE } from './restaurante';
import { ROPA } from './ropa';

export const PROFILE_SEEDS: Record<ProfileId, ProfileSeed> = {
  restaurante: RESTAURANTE,
  ropa: ROPA,
  barberia: BARBERIA,
};

export const PROFILE_ORDER: ProfileId[] = ['restaurante', 'ropa', 'barberia'];

export const PROFILE_META: Record<ProfileId, { label: string; hint: string; cover: string }> = {
  restaurante: { label: 'Restaurante', hint: 'Brasa Roja · Medellín', cover: 'photos/restaurante/portada.webp' },
  ropa: { label: 'Tienda de ropa', hint: 'Nómada Studio · Bogotá', cover: 'photos/ropa/portada.webp' },
  barberia: { label: 'Barbería', hint: 'Barbería El Clásico · Envigado', cover: 'photos/barberia/portada.webp' },
};
