/**
 * Change 010, ticket 07 — l'écran d'un formulaire : ce que la réponse HTTP
 * ne peut pas prouver (l'îlot ne s'exécute pas dans `workerd`). Lecture du
 * texte des sources par `?raw`, sans exécution.
 */
import { it, expect } from "vitest";

const MOTS_DEVELOPPEUR =
  /\b(commit|branche|build|déploiement|deploy|json|http|api|serveur|requête|code d'erreur)\b/i;

async function ilot(): Promise<string> {
  return (
    await import("../../src/admin/ilots-svelte-5/EcranFormulaire.svelte?raw")
  ).default;
}

it("SC-07a — l'îlot envoie tout le formulaire d'un seul bouton, vers la route des options", async () => {
  // Arrange
  const source = await ilot();

  // Act / Assert
  expect([...source.matchAll(/type="submit"/g)]).toHaveLength(1);
  expect(source).toContain("/options`");
  expect(source).toContain("corpsDEnregistrement(");
  expect(source).toMatch(
    /aria-label=\{`\$\{TEXTE_FORMULAIRE_MONTER\} \$\{nomDe\(ligne\)\} dans \$\{champ\.libelle\}`\}/,
  );
});

it("SC-07b — l'îlot marque la ligne fautive, traduit la raison, garde la saisie et n'affiche jamais le code brut", async () => {
  // Arrange
  const source = await ilot();

  // Act / Assert
  expect(source).toContain("TEXTES_REFUS_FORMULAIRE[raison]");
  expect(source).toContain("TEXTE_REFUS_FORMULAIRE_INCONNU");
  expect(source).toContain("aria-invalid={erreurPrix !== undefined}");
  expect(source).not.toMatch(/\{raison\}/);
  expect(source).not.toMatch(/\{@html/);
  // La saisie n'est jamais réinitialisée en cas de refus ou d'échec.
  expect(source).not.toMatch(/^[ \t]+lignesParChamp = /m);
  expect(source).toContain("MESSAGE_RESEAU");
  expect(source).toContain("disabled={enCours}");
  expect(source).toContain("TEXTE_ENREGISTREMENT_EN_COURS");
});

it("SC-07c — au succès, l'îlot appelle le rappel de la marque sans changer d'écran, et pas au refus", async () => {
  // Arrange
  const source = await ilot();
  const monter = (await import("../../src/admin/ilots-svelte-5/monter.ts?raw"))
    .default;
  const zone =
    /export function monterEcranFormulaire[\s\S]*$/.exec(monter)?.[0] ?? "";

  // Act / Assert
  expect(source).toMatch(
    /if \(resultat\.ok\) \{[\s\S]*?apresEnregistrement\(\);[\s\S]*?return;/,
  );
  expect([...source.matchAll(/apresEnregistrement\(\)/g)]).toHaveLength(1);
  expect(source).not.toMatch(/location|reload|history\./);
  expect(zone).toMatch(/afficherPastilleDansLaZone\(zoneMarque\)/);
  expect(zone).toContain("[data-zone-marque-brouillon]");
});

it("SC-07c — l'îlot est monté sans directive client:*, sans {@html} ni script en ligne", async () => {
  // Arrange
  const page = (
    await import("../../src/pages/admin/formulaires/[id].astro?raw")
  ).default;
  const montage = (
    await import("../../src/admin/MontageEcranFormulaire.astro?raw")
  ).default;

  // Act / Assert
  expect(page).not.toMatch(/<[A-Za-z][^>]*\sclient:/);
  expect(page).not.toMatch(/\sset:html[=\s{]|\{@html/);
  expect(montage).toMatch(/<script>\s*import \{ monterEcranFormulaire \}/);
  expect(montage).not.toMatch(/is:inline|set:html/);
});

it("SC-07d — les messages de l'écran d'un formulaire ne portent ni terme de développeur ni identifiant", async () => {
  // Arrange
  const t = await import("../../src/admin/textes.ts");
  const messages = [
    t.TEXTE_FORMULAIRE_AJOUTER,
    t.TEXTE_FORMULAIRE_LISTE_COMPLETE,
    t.TEXTE_FORMULAIRE_GARDER_UN,
    t.TEXTE_FORMULAIRE_RETIRER,
    t.TEXTE_FORMULAIRE_MONTER,
    t.TEXTE_FORMULAIRE_DESCENDRE,
    t.TEXTE_FORMULAIRE_ENREGISTRE,
    t.TEXTE_FORMULAIRE_A_CORRIGER,
    t.TEXTE_REFUS_FORMULAIRE_INCONNU,
    ...Object.values(t.TEXTES_REFUS_FORMULAIRE),
  ];

  // Act / Assert
  for (const message of messages) {
    expect(message).not.toMatch(MOTS_DEVELOPPEUR);
  }
  for (const code of Object.keys(t.TEXTES_REFUS_FORMULAIRE)) {
    for (const message of messages) expect(message).not.toContain(code);
  }
  expect(t.TEXTES_REFUS_FORMULAIRE["prix-invalide"]).toBe(
    "Un montant en euros, par exemple 12 ou 12,50.",
  );
  expect(t.TEXTE_FORMULAIRE_ENREGISTRE).toBe(
    "Modifications enregistrées. Elles seront visibles sur le site après publication.",
  );
});

it("SC-07d — chaque code de refus du noyau pour les options a un message français", async () => {
  // Arrange
  const { TEXTES_REFUS_FORMULAIRE } = await import("../../src/admin/textes.ts");
  // La liste fermée du noyau : le typage y astreint chaque refus qu'il rend.
  const { RAISONS_REFUS_OPTION } =
    await import("../../src/core/formulaires/options.ts");

  // Act / Assert
  for (const code of RAISONS_REFUS_OPTION) {
    expect(TEXTES_REFUS_FORMULAIRE[code], code).toBeDefined();
    expect(TEXTES_REFUS_FORMULAIRE[code], code).not.toContain(code);
  }
});
