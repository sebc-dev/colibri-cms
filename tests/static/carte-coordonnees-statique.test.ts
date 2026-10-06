/**
 * Ticket 06 (008) — La carte Coordonnées : ce que la réponse HTTP ne peut
 * pas prouver (l'îlot ne s'exécute pas dans `workerd`, aucun DOM —
 * docs/test.md). Lecture du texte des sources par `?raw`, sans exécution.
 */
import { it, expect } from "vitest";

const MOTS_DEVELOPPEUR =
  /\b(commit|branche|build|déploiement|deploy|json|http|api|serveur|requête|code d'erreur)\b/i;

it("SC-06a — l'îlot n'offre aucun geste d'ajout, de retrait, de renommage ni de déplacement", async () => {
  // Arrange
  const source = (
    await import("../../src/admin/ilots-svelte-5/CarteCoordonnees.svelte?raw")
  ).default;
  const balisage = source.replace(/<script[\s\S]*?<\/script>/, "");

  // Act / Assert : un seul bouton, de type submit ; aucun geste de structure.
  expect([...balisage.matchAll(/<Button\b/g)]).toHaveLength(1);
  expect(balisage).not.toMatch(
    /draggable|ondrag|ajouter|supprimer|retirer|renommer|déplacer/i,
  );
  expect(balisage).toMatch(/\{#each coordonnees as c/);
});

it("SC-06b — chaque code de refus des coordonnées a un message français sans terme de développeur", async () => {
  // Arrange
  const { TEXTES_REFUS_COORDONNEES, TEXTE_REFUS_COORDONNEE_INCONNU } =
    await import("../../src/admin/textes.ts");
  const source = (await import("../../src/core/reglages/coordonnees.ts?raw"))
    .default;
  const codes = [
    ...source.matchAll(/'((?:texte|telephone|email|adresse)-[a-z-]+)'/g),
  ].map((m) => m[1]);

  // Act / Assert : tout code émis par le noyau est traduit.
  expect(codes.length).toBeGreaterThan(0);
  for (const code of new Set(codes)) {
    expect(TEXTES_REFUS_COORDONNEES[code], code).toBeDefined();
  }
  for (const message of [
    ...Object.values(TEXTES_REFUS_COORDONNEES),
    TEXTE_REFUS_COORDONNEE_INCONNU,
  ]) {
    expect(message).not.toMatch(MOTS_DEVELOPPEUR);
  }
  for (const code of Object.keys(TEXTES_REFUS_COORDONNEES)) {
    for (const message of Object.values(TEXTES_REFUS_COORDONNEES)) {
      expect(message).not.toContain(code);
    }
  }
  expect(TEXTES_REFUS_COORDONNEES["telephone-caracteres"]).toMatch(/téléphone/);
});

it("SC-06b — l'îlot marque le champ en erreur, traduit la raison et garde la saisie", async () => {
  // Arrange
  const source = (
    await import("../../src/admin/ilots-svelte-5/CarteCoordonnees.svelte?raw")
  ).default;

  // Act / Assert
  expect(source).toContain("aria-invalid={erreurs[c.id] !== undefined}");
  expect(source).toContain("TEXTES_REFUS_COORDONNEES[raison]");
  expect(source).not.toMatch(/\{@html/);
  expect(source).not.toMatch(/\{raison\}/);
  // En cas de refus ou d'échec, `valeurs` n'est jamais réinitialisée.
  expect(source).not.toMatch(/^[ \t]*valeurs =/m);
  expect(source).toContain("MESSAGE_RESEAU");
  expect(source).toContain("TEXTE_ENREGISTREMENT_EN_COURS");
  expect(source).toContain("disabled={enCours}");
});

it("SC-06c — au succès, le montage fait apparaître la marque de la carte en clonant le modèle commun", async () => {
  // Arrange
  const monter = (await import("../../src/admin/ilots-svelte-5/monter.ts?raw"))
    .default;
  const pastille = (await import("../../src/admin/pastille-brouillon.ts?raw"))
    .default;
  const ilot = (
    await import("../../src/admin/ilots-svelte-5/CarteCoordonnees.svelte?raw")
  ).default;

  // Act / Assert : l'îlot n'appelle le rappel qu'au succès (`resultat.ok`).
  expect(ilot).toMatch(/if \(resultat\.ok\) \{\s*apresEnregistrement\(\);/);
  expect(monter).toMatch(/afficherPastilleDansLaZone\(zoneMarque\)/);
  expect(monter).toMatch(
    /closest\('section'\)\?\.querySelector\('\[data-zone-marque-brouillon\]'\)/,
  );
  // Le geste clone le même modèle, sans balisage fabriqué à la main.
  const fonction =
    /export function afficherPastilleDansLaZone[\s\S]*?\n}/.exec(
      pastille,
    )?.[0] ?? "";
  expect(fonction).toContain("cloneNode(true)");
  expect(fonction).toContain("ID_MODELE_MARQUE_BROUILLON");
  expect(fonction).not.toMatch(/createElement|innerHTML/);
  // Le geste par défaut de l'éditeur de page reste présent.
  expect(pastille).toContain("export function afficherPastilleDeBrouillon()");
});

it("SC-06a — l'îlot est monté sans directive client:* ni {@html}", async () => {
  // Arrange
  const ecran = (await import("../../src/pages/admin/reglages.astro?raw"))
    .default;

  // Act / Assert
  expect(ecran).not.toMatch(/<[A-Za-z][^>]*\sclient:/);
  expect(ecran).not.toMatch(/\sset:html[=\s{]|\{@html/);
});
