/**
 * Zone `admin/` — l'application d'administration (docs/archi.md § Vue
 * d'ensemble). Importe `core/` et `platform/`, conformément au sens
 * descendant fixé par I1. `.ts` et non `.astro` : ce lot ne pose aucun
 * gabarit d'administration, et le contrôle d'I4 ne balaie que
 * `src/admin/*.astro`.
 */
import type { Zone } from '../core/zone.ts';
import { ZONE as PLATFORM_ZONE } from '../platform/zone.ts';

export const ZONE: Zone = 'admin';
export const DEPENDS_ON: readonly Zone[] = [PLATFORM_ZONE];
