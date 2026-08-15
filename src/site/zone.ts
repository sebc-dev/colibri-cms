/**
 * Zone `site/` — les gabarits et composants propres au site publié
 * (docs/archi.md § Vue d'ensemble). N'importe que `core/` : ce lot ne pose
 * pas `src/render/index.ts` (frontière de la spec), donc `site/` n'importe
 * pas encore `render/` — l'arête reste légale, elle n'a rien à atteindre.
 */
import type { Zone } from '../core/zone.ts';

export const ZONE: Zone = 'site';
