/**
 * Ticket 07 (008) — La carte Réseaux sociaux : ce que la réponse HTTP ne
 * peut pas prouver (l'îlot ne s'exécute pas dans `workerd`, aucun DOM —
 * docs/test.md). Lecture du texte des sources par `?raw`, sans exécution.
 */
import { it, expect } from "vitest";

const MOTS_DEVELOPPEUR =
  /\b(commit|branche|build|déploiement|deploy|json|http|api|serveur|requête|code d'erreur)\b/i;

async function ilot(): Promise<string> {
  return (
    await import("../../src/admin/ilots-svelte-5/CarteReseaux.svelte?raw")
  ).default;
}

it("SC-07a — l'îlot offre ajouter, corriger, retirer, monter et descendre, avec des libellés nommant le lien", async () => {
  // Arrange
  const source = await ilot();

  // Act / Assert
  expect(source).toContain("TEXTE_RESEAUX_AJOUTER");
  expect(source).toContain("onclick={ajouter}");
  expect(source).toContain("onclick={() => retirer(i)}");
  expect(source).toContain("onclick={() => deplacer(i, -1)}");
  expect(source).toContain("onclick={() => deplacer(i, 1)}");
  expect(source).toContain("bind:value={ligne.nom}");
  expect(source).toContain("bind:value={ligne.lien}");
  expect(source).toContain(
    "aria-label={`${TEXTE_RESEAUX_MONTER} ${nomDe(ligne)}`}",
  );
  expect(source).toContain(
    "aria-label={`${TEXTE_RESEAUX_RETIRER} ${nomDe(ligne)}`}",
  );
  // Monter/Descendre inactifs en bout de liste.
  expect(source).toContain("disabled={i === 0}");
  expect(source).toContain("disabled={i === lignes.length - 1}");
  // La liste entière part dans l'ordre affiché.
  expect(source).toContain("lignes.map((l) => ({ nom: l.nom, lien: l.lien }))");
});

it("SC-07a — au succès seulement, l'îlot appelle le rappel qui fait apparaître la marque ; le montage la place dans la zone de la carte", async () => {
  // Arrange
  const source = await ilot();
  const monter = (await import("../../src/admin/ilots-svelte-5/monter.ts?raw"))
    .default;

  // Act / Assert
  expect(source).toMatch(/if \(resultat\.ok\) \{\s*apresEnregistrement\(\);/);
  expect(monter).toContain("monterCarteReseaux");
  expect(monter).toMatch(/afficherPastilleDansLaZone\(zoneMarque\)/);
});

it("SC-07a — nom et adresse sont rendus par interpolation échappée seulement, sans directive client:*", async () => {
  // Arrange
  const source = await ilot();
  const ecran = (await import("../../src/pages/admin/reglages.astro?raw"))
    .default;

  // Act / Assert
  expect(source).not.toMatch(/\{@html/);
  expect(source).not.toMatch(/innerHTML/);
  expect(ecran).not.toMatch(/<[A-Za-z][^>]*\sclient:/);
  expect(ecran).not.toMatch(/\sset:html[=\s{]|\{@html/);
});

it("SC-07f — à 12 liens, l'ajout disparaît au profit du message « La liste est complète »", async () => {
  // Arrange
  const source = await ilot();
  const textes = await import("../../src/admin/textes.ts");

  // Act / Assert
  expect(source).toContain("const LIENS_MAX = 12;");
  expect(source).toMatch(
    /\{#if lignes\.length >= LIENS_MAX\}\s*<p[^>]*>\{TEXTE_RESEAUX_LISTE_COMPLETE\}<\/p>\s*\{:else\}\s*<Button[^>]*onclick=\{ajouter\}/,
  );
  expect(textes.TEXTE_RESEAUX_LISTE_COMPLETE).toBe(
    "La liste est complète (12 liens au plus).",
  );
  // Et le noyau refuse un 13e lien, même forgé.
  expect(source).toMatch(/if \(lignes\.length >= LIENS_MAX\) return;/);
});

it("SC-07a — chaque code de refus des réseaux a un message français sans terme de développeur", async () => {
  // Arrange
  const { TEXTES_REFUS_RESEAUX, TEXTE_REFUS_RESEAU_INCONNU } =
    await import("../../src/admin/textes.ts");
  const noyau = (await import("../../src/core/reglages/reseaux.ts?raw"))
    .default;
  const codes = [
    ...noyau.matchAll(/'((?:nom|adresse)-[a-z-]+|trop-de-liens)'/g),
  ].map((m) => m[1]);

  // Act / Assert
  expect(codes.length).toBeGreaterThan(0);
  for (const code of new Set(codes)) {
    expect(TEXTES_REFUS_RESEAUX[code], code).toBeDefined();
  }
  for (const message of [
    ...Object.values(TEXTES_REFUS_RESEAUX),
    TEXTE_REFUS_RESEAU_INCONNU,
  ]) {
    expect(message).not.toMatch(MOTS_DEVELOPPEUR);
  }
  expect(TEXTES_REFUS_RESEAUX["adresse-pas-https"]).toBe(
    "Une adresse qui commence par https://",
  );
});
