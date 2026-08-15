/**
 * Zone `platform/` — les adaptateurs : D1, envoi d'e-mail, GitHub, session
 * (docs/archi.md § Vue d'ensemble). N'importe que `core/`, conformément au
 * sens descendant fixé par I1.
 */
import type { Zone } from '../core/zone.ts';

export const ZONE: Zone = 'platform';
