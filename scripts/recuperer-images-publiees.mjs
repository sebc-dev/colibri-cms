#!/usr/bin/env node
/**
 * Récupère les octets des images publiées — ticket 02 du change
 * 011-apercu-et-publication (ADR-0020, ADR-0022). Appelé par `prebuild`
 * avant `preparer-worker-de-test.mjs`.
 *
 * Extrait le dossier `medias/` de la branche `media` du dépôt vers un
 * dossier `./medias` à la racine (ignoré par git), que la construction
 * empaquette (`src/platform/contenu/medias.ts`).
 *
 * - Une référence locale `media` déjà présente suffit hors réseau.
 * - Branche absente du dépôt (instance qui n'a jamais publié) : dossier vide.
 * - Dépôt injoignable et aucune référence locale : échec explicite.
 * - Clé de lecture FACULTATIVE, en variable d'environnement
 *   `COLIBRI_CLE_LECTURE_DEPOT` : jamais requise (dépôt public, lecture
 *   anonyme).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DOSSIER_SORTIE = 'medias';
const REFERENCE_DISTANTE = 'refs/remotes/origin/media';
const REFERENCE_LOCALE = 'refs/heads/media';

const env = globalThis.process.env;

// Les messages de git sont forcés en locale C pour que le repérage de « branche absente » ne dépende pas de la langue de la machine.
function git(args, options = {}) {
  return execFileSync('git', args, {
    env: { ...globalThis.process.env, LC_ALL: 'C', LANGUAGE: '' },
    encoding: options.binaire ? 'buffer' : 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function referenceExiste(reference) {
  try {
    git(['rev-parse', '--verify', '--quiet', reference]);
    return true;
  } catch {
    return false;
  }
}

/** Le commit récupéré, ou 'absente' (la branche n'existe pas sur le dépôt) | 'injoignable'. */
function rafraichirDepuisLeDepot() {
  const cle = env.COLIBRI_CLE_LECTURE_DEPOT;
  const entete = cle
    ? ['-c', `http.extraheader=Authorization: Basic ${globalThis.btoa(`x-access-token:${cle}`)}`]
    : [];
  try {
    // Sans référence de suivi : le commit se lit dans FETCH_HEAD, propre à
    // ce répertoire de travail (une référence partagée peut être élaguée par
    // un autre répertoire de travail du même dépôt entre le fetch et la lecture).
    git([...entete, 'fetch', '--no-tags', '--depth=1', 'origin', 'media']);
    return git(['rev-parse', '--verify', 'FETCH_HEAD']).trim();
  } catch (erreur) {
    const message = String(erreur.stderr ?? erreur.message ?? '');
    return /couldn't find remote ref/i.test(message) ? 'absente' : 'injoignable';
  }
}

function extraire(reference) {
  rmSync(DOSSIER_SORTIE, { recursive: true, force: true });
  mkdirSync(DOSSIER_SORTIE, { recursive: true });
  const chemins = git(['ls-tree', '-r', '--name-only', reference, '--', 'medias/'])
    .split('\n')
    .filter(Boolean);
  for (const chemin of chemins) {
    const cible = join('.', chemin);
    mkdirSync(dirname(cible), { recursive: true });
    writeFileSync(cible, git(['show', `${reference}:${chemin}`], { binaire: true }));
  }
  return chemins.length;
}

const etat = rafraichirDepuisLeDepot();
let reference = null;
if (etat !== 'absente' && etat !== 'injoignable') {
  reference = etat;
} else if (etat === 'injoignable') {
  reference = [REFERENCE_DISTANTE, REFERENCE_LOCALE].find(referenceExiste) ?? null;
  if (reference === null) {
    throw new Error(
      'Impossible de récupérer les images publiées : le dépôt est injoignable et aucune copie locale de la branche `media` n’existe.',
    );
  }
}

if (reference === null) {
  rmSync(DOSSIER_SORTIE, { recursive: true, force: true });
  mkdirSync(DOSSIER_SORTIE, { recursive: true });
  globalThis.console.log('Aucune image publiée : la branche `media` n’existe pas encore sur le dépôt.');
} else {
  const nombre = extraire(reference);
  globalThis.console.log(`${String(nombre)} image(s) publiée(s) récupérée(s) depuis ${reference}.`);
}
