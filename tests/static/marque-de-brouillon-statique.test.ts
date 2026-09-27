/**
 * Ticket 05 — La marque de brouillon, la même partout
 * (openspec/changes/005-mise-en-page-administration/tickets/05-marque-de-brouillon.md).
 *
 * Couvre ce que la réponse HTTP ne peut pas prouver (`tests/integration/
 * marque-de-brouillon.test.ts` couvre SC-05a/b côté rendu serveur) : le
 * geste qui clone le modèle sans recharger l'écran n'exécute jamais dans
 * `workerd` (aucun DOM, aucun navigateur, docs/test.md), et l'absence de la
 * couleur `gorge` sur un bouton ou un lien est une propriété de TOUTE la
 * source admin, pas d'une seule réponse HTTP.
 *
 * `?raw` (Vite) charge le texte des fichiers au moment du bundle, sans
 * exécuter ni requêter quoi que ce soit — même geste que
 * `tests/static/gabarits-admin.test.ts`.
 */
import { it, expect } from 'vitest';

// Utilitaire Tailwind qui applique la couleur `gorge`/`gorge-soft` à une
// propriété visuelle (texte, fond, bordure, anneau…) — jamais le simple mot
// « gorge » qui peut apparaître dans un commentaire en français (« en
// `gorge` », « le rubis (gorge) »).
const CLASSE_UTILITAIRE_GORGE = /\b(?:text|bg|border|ring|fill|stroke|from|via|to|outline|decoration|caret|accent|shadow)-gorge(?:-soft)?\b/;

/**
 * Isole le CODE de la fonction exportée, sans le commentaire de tête du
 * fichier (qui parle en prose de « createElement », de « textContent » et
 * de « data-pastille-brouillon » pour raconter la migration — un match sur
 * le fichier entier prendrait cette prose pour du code).
 */
function extraireFonction(source: string): string {
  return /export function afficherPastilleDeBrouillon\(\)[\s\S]*?\n}/.exec(source)?.[0] ?? '';
}

it('SC-05b — pastille-brouillon.ts clone le modèle du gabarit, jamais un balisage fabriqué à la main', async () => {
  // Arrange
  const source = (await import('../../src/admin/pastille-brouillon.ts?raw')).default;
  const fonction = extraireFonction(source);
  expect(fonction, 'la fonction afficherPastilleDeBrouillon devrait être présente').not.toBe('');

  // Act / Assert — le clonage du `<template>`…
  expect(fonction).toMatch(/\.content\.cloneNode\(true\)/);
  // …jamais un `<span>`/élément fabriqué à la main pour porter le libellé.
  expect(fonction).not.toMatch(/createElement/);
  expect(fonction).not.toMatch(/textContent\s*=/);
});

it('SC-05b — pastille-brouillon.ts garde son garde-fou anti-doublon : la marque clonée ne peut jamais s’ajouter deux fois', async () => {
  // Arrange
  const source = (await import('../../src/admin/pastille-brouillon.ts?raw')).default;
  const fonction = extraireFonction(source);
  expect(fonction, 'la fonction afficherPastilleDeBrouillon devrait être présente').not.toBe('');

  // Le nom de la constante importe peu (convention UPPER_SNAKE du projet) :
  // ce qui compte est qu'une même valeur littérale — l'attribut partagé qui
  // marque la marque déjà posée — serve à la fois de garde ET de valeur
  // portée par le clone (cohérence avec `MarqueBrouillon.astro`, qui pose
  // ce même attribut littéral sur le `<span>` cloné).
  const nomConstante = /const\s+(\w+)\s*=\s*'data-pastille-brouillon'/.exec(source)?.[1];
  expect(nomConstante, 'une constante devrait porter la valeur littérale « data-pastille-brouillon »').toBeDefined();

  // Assert : la garde interroge la zone AVANT tout clonage, et sort (return)
  // sans jamais atteindre l'ajout si la marque y est déjà — ce qui exclut
  // tout doublon lors d'un second appel sur une zone déjà pourvue.
  const regexGarde = new RegExp(`if\\s*\\([^)]*querySelector\\([^)]*\\$\\{${nomConstante}\\}[^)]*\\)[^)]*\\)\\s*return;`);
  const correspondanceGarde = regexGarde.exec(fonction);
  expect(correspondanceGarde, 'un garde-fou devrait interroger la zone via querySelector avant tout ajout').not.toBeNull();

  const indexGarde = correspondanceGarde?.index ?? -1;
  const indexClone = fonction.indexOf('cloneNode');
  expect(indexClone).toBeGreaterThan(indexGarde);
});

it('SC-05c — aucun fichier admin autre que MarqueBrouillon.astro ne porte la couleur gorge', async () => {
  // Arrange : toute la source servie sous l'administration (gabarits Astro,
  // scripts de module et îlots Svelte, qui portent boutons et liens) — le composant `MarqueBrouillon.astro` lui-même
  // est l'unique exception attendue (SOURCE UNIQUE du badge, voir son en-tête).
  const fichiersAstro = import.meta.glob('/src/{admin,pages/admin}/**/*.astro', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const fichiersScripts = import.meta.glob('/src/{admin,pages/admin}/**/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const fichiersSvelte = import.meta.glob('/src/{admin,pages/admin}/**/*.svelte', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  expect(Object.keys(fichiersSvelte).length, 'aucun îlot Svelte admin trouvé').toBeGreaterThan(0);
  const fichiers = { ...fichiersAstro, ...fichiersScripts, ...fichiersSvelte };

  expect(Object.keys(fichiers).length, 'aucune source admin trouvée').toBeGreaterThan(0);

  const fichiersHorsMarque = Object.entries(fichiers).filter(
    ([chemin]) => !chemin.endsWith('/MarqueBrouillon.astro'),
  );
  expect(fichiersHorsMarque.length).toBeGreaterThan(0);

  for (const [chemin, source] of fichiersHorsMarque) {
    expect(source, `${chemin} ne devrait porter aucune classe en gorge`).not.toMatch(CLASSE_UTILITAIRE_GORGE);
  }

  // …et le composant, lui, porte bien la couleur : c'est l'unique endroit
  // où elle sert (sinon ce test ne prouverait rien).
  const marque = (await import('../../src/admin/MarqueBrouillon.astro?raw')).default;
  expect(marque).toMatch(CLASSE_UTILITAIRE_GORGE);
});
