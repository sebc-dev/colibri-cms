/**
 * Lecture et mise en forme d'un prix saisi (ticket 03, ADR-0018).
 * Fonctions pures (I2) : des centimes entiers, jamais de flottant.
 */
import { PRIX_CENTIMES_MAX } from './declaration.ts';

export type LecturePrix =
  | { readonly ok: true; readonly centimes: number }
  | { readonly ok: false; readonly raison: 'prix-invalide' | 'prix-hors-borne' };

const FORME_PRIX = /^(\d{1,7})(?:[,.](\d{1,2}))?$/;

/** Lit « 12 », « 12,5 », « 12,50 » ou « 12.50 » en centimes, ou refuse. */
export function lirePrixSaisi(texte: string): LecturePrix {
  const trouve = FORME_PRIX.exec(texte.trim());
  if (trouve === null) return { ok: false, raison: 'prix-invalide' };
  const euros = Number(trouve[1]);
  const decimales = (trouve.at(2) ?? '').padEnd(2, '0');
  const centimes = euros * 100 + Number(decimales);
  if (centimes > PRIX_CENTIMES_MAX) return { ok: false, raison: 'prix-hors-borne' };
  return { ok: true, centimes };
}

/** La forme française d'un prix en centimes, relue par `lirePrixSaisi`. */
export function formaterPrix(centimes: number): string {
  const euros = Math.floor(centimes / 100);
  const reste = centimes % 100;
  if (reste === 0) return String(euros);
  return `${String(euros)},${String(reste).padStart(2, '0')}`;
}
