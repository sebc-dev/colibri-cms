/**
 * Les cinq zones du monolithe modulaire (docs/archi.md § Vue d'ensemble).
 *
 * `core/` ne dépend de rien — c'est la racine de la matrice descendante que
 * l'invariant I1 impose (docs/archi.md) : `site → render, core` ·
 * `admin → render, core, platform` · `render → core` · `platform → core` ·
 * `core → (rien)`.
 *
 * Les cinq noms ci-dessous sont des **identifiants nus** (`'render'`), jamais
 * des chemins écrits en dur (`'src/render/'`) : c'est l'application, à cette
 * source, de la contrainte générale d'I3 — aucun fichier versionné hors de
 * `src/render/` ne doit porter la chaîne littérale `src/render/` suivie d'un
 * caractère (FR-026).
 */
export type Zone = 'site' | 'admin' | 'render' | 'core' | 'platform';

export const ZONES: readonly Zone[] = ['site', 'admin', 'render', 'core', 'platform'];

/** Le nom de cette zone. */
export const ZONE: Zone = 'core';
