/**
 * Zone `admin/` — l'application d'administration (docs/archi.md § Vue
 * d'ensemble). Importe `core/` et `platform/`, conformément au sens
 * descendant fixé par I1. Ce fichier-ci reste `.ts` et non `.astro` : c'est
 * `src/admin/Gabarit.astro` (ticket 01 — la porte close) qui pose le premier
 * gabarit d'administration, et le contrôle d'I4 balaie `src/admin/*.astro`
 * (ADR-0006 — aucune directive `client:*`).
 */
import type { Zone } from '../core/zone.ts';
import { ZONE as PLATFORM_ZONE } from '../platform/zone.ts';

export const ZONE: Zone = 'admin';
export const DEPENDS_ON: readonly Zone[] = [PLATFORM_ZONE];
