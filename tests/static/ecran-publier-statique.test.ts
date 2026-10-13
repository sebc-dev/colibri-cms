/**
 * Change 011, ticket 10 — contrôles de source de l'écran Publier et du cadre.
 */
import { it, expect } from "vitest";
import publier from "../../src/pages/admin/publier.astro?raw";
import cadre from "../../src/admin/GabaritCadre.astro?raw";
import textes from "../../src/admin/textes.ts?raw";

const TERMES_DEVELOPPEUR = [
  "commit",
  "branche",
  "build",
  "déploiement",
  "déployer",
  "repository",
  "endpoint",
  "webhook",
  "backend",
  "framework",
];

function textesPublier(): string {
  return textes
    .split("\n")
    .filter((l) => /(^export const TEXTE_\w*PUBLIER\w* =)|TEXTE_LIEN_VOIR_APERCU|TEXTE_REVENIR_A_MES_PAGES|TEXTE_RIEN_A_PUBLIER/.test(l))
    .join("\n");
}

it("SC-10a — le geste « Publier » du cadre est un lien rendu serveur, sans directive client", () => {
  expect(cadre).toMatch(/id="bouton-publier"/);
  expect(cadre).toContain("/admin/publier?retour=");
  expect(cadre).not.toMatch(/client:(load|idle|visible|only|media)/);
});

it("SC-10c — la barre haute (bouton de menu, « Publier ») n'est pas masquée sous md ; le bouton de menu n'apparaît que sous md", () => {
  const entete = /<header[\s\S]*?<\/header>/.exec(cadre)?.[0] ?? "";
  expect(entete).toContain("ID_BOUTON_OUVRIR_TIROIR");
  expect(entete).toContain("bouton-publier");
  expect(entete).not.toMatch(/<header[^>]*class="[^"]*\bhidden\b/);
  expect(entete).toMatch(/id=\{ID_BOUTON_OUVRIR_TIROIR\}[\s\S]*?md:hidden/);
});

it("SC-10g — l'écran Publier importe la garde de session et renvoie à la connexion", () => {
  expect(publier).toContain("verifierSession");
  expect(publier).toContain("/admin/connexion");
});

it("SC-10b — l'écran Publier n'a ni script, ni directive client, ni formulaire de mise en ligne", () => {
  expect(publier).not.toMatch(/<script/);
  expect(publier).not.toMatch(/client:(load|idle|visible|only|media)/);
  expect(publier).not.toMatch(/<form|<button/);
});

it("SC-10h — l'adresse de retour de « Annuler » passe par la revérification retourSur", () => {
  expect(publier).toContain("retourSur(");
  expect(publier).toContain('id="annuler-publier"');
});

it("SC-10d — l'écran Publier nomme les réglages par LIBELLES_REGLAGES_PUBLIER, tiré des textes de l'écran Réglages", () => {
  expect(publier).toMatch(/LIBELLES_REGLAGES_PUBLIER\[/);
  const table =
    /export const LIBELLES_REGLAGES_PUBLIER\b[\s\S]*?\};/.exec(textes)?.[0] ??
    "";
  expect(table).toMatch(/coordonnees:\s*TEXTE_CARTE_COORDONNEES\b/);
  expect(table).toMatch(/reseaux:\s*TEXTE_CARTE_RESEAUX\b/);
  expect(table).toMatch(/mention:\s*TEXTE_CARTE_MENTION\b/);
});

it("SC-10f — les textes de l'écran Publier n'emploient aucun terme de développeur", () => {
  const visibles = textesPublier().toLowerCase();
  expect(visibles.length).toBeGreaterThan(0);
  for (const terme of TERMES_DEVELOPPEUR) {
    expect(visibles, terme).not.toContain(terme);
  }
  expect(textes).toContain("Il n’y a rien à publier");
});

it("SC-15f — l'îlot affiche TEXTE_PUBLICATION_DEJA_EN_COURS sur un refus 'en-cours', avant la branche générique du 409", async () => {
  // Arrange
  const source = (
    await import("../../src/admin/ilots-svelte-5/EcranPublier.svelte?raw")
  ).default;

  // Act
  const dejaEnCours = source.search(
    /raison === 'en-cours'\) \{\s*message = TEXTE_PUBLICATION_DEJA_EN_COURS;/,
  );
  const generique = source.search(/statut === 409\) \{\s*apresChangement\(\);/);

  // Assert
  expect(dejaEnCours, "branche « déjà en cours »").toBeGreaterThan(-1);
  expect(generique, "branche générique du 409, après").toBeGreaterThan(dejaEnCours);
  expect([...source.matchAll(/apresChangement\(\)/g)]).toHaveLength(1);
});

it("SC-15b — sur un récapitulatif changé, l'écran se recharge avec message=changement", async () => {
  // Arrange
  const monter = (await import("../../src/admin/ilots-svelte-5/monter.ts?raw"))
    .default;
  const zone = /export function monterEcranPublier[\s\S]*?\n\}/.exec(monter)?.[0] ?? "";

  // Act
  const marque = zone.indexOf("searchParams.set('message', 'changement')");
  const rechargement = zone.indexOf("location.assign(");

  // Assert
  expect(marque, "la marque du changement").toBeGreaterThan(-1);
  expect(rechargement, "le rechargement, après la marque").toBeGreaterThan(marque);
});

it("SC-17a — la suite relaie l'avancement tant que la publication n'est pas finie", async () => {
  // Arrange
  const source = (await import("../../src/pages/admin/publication/suite.ts?raw")).default;

  // Act
  const appel = source.search(/poursuivreUnePasse\(/);
  const reponse = source.search(
    /issue\.fini\s*\?\s*\{\s*ok:\s*true,\s*fini:\s*true\s*\}\s*:\s*\{\s*ok:\s*true,\s*fini:\s*false,\s*parties:\s*issue\.parties,\s*total:\s*issue\.total\s*\}/,
  );

  // Assert
  expect(appel, "une passe par requête").toBeGreaterThan(-1);
  expect(reponse, "l'avancement dans la réponse, après la passe").toBeGreaterThan(appel);
});

it("SC-17a — l'îlot enchaîne les passes sans geste et affiche l'avancement", async () => {
  // Arrange
  const source = (
    await import("../../src/admin/ilots-svelte-5/EcranPublier.svelte?raw")
  ).default;
  const debut = source.search(/for \(;;\) \{\s*const suite = await poster\('\/admin\/publication\/suite'/);
  const termine = source.indexOf("termine = true", debut);
  const boucle = source.slice(debut, termine);

  // Act
  const sortie = boucle.search(/if \(suite\.json\.fini === true\) break;/);
  const libelle = boucle.search(/avancement = libelleAvancement\(suite\.json\.parties, suite\.json\.total\)/);
  const affichage = /\{#if enCours && avancement !== null\}\s*<p[^>]*role="status"[^>]*>\{avancement\}<\/p>/;

  // Assert
  expect(debut, "la boucle qui poste la suite").toBeGreaterThan(-1);
  expect(termine, "« terminé », posé après la boucle").toBeGreaterThan(debut);
  expect(sortie, "la sortie sur « fini »").toBeGreaterThan(-1);
  expect(libelle, "l'avancement, après la sortie").toBeGreaterThan(sortie);
  expect(source).toMatch(affichage);
});

it("ticket 15 — les messages de la mise en ligne n'emploient aucun terme de développeur (FR-117)", async () => {
  // Arrange
  const {
    TEXTE_BOUTON_PUBLIER_MAINTENANT,
    TEXTE_PUBLICATION_EN_COURS,
    TEXTE_PUBLICATION_TERMINEE,
    TEXTE_PUBLICATION_CHANGEMENT,
    TEXTE_PUBLICATION_DEJA_EN_COURS,
    TEXTE_PUBLICATION_ECHEC,
    TEXTE_PUBLICATION_INACHEVEE,
  } = await import("../../src/admin/textes.ts");
  const messages = [
    TEXTE_BOUTON_PUBLIER_MAINTENANT,
    TEXTE_PUBLICATION_EN_COURS,
    TEXTE_PUBLICATION_TERMINEE,
    TEXTE_PUBLICATION_CHANGEMENT,
    TEXTE_PUBLICATION_DEJA_EN_COURS,
    TEXTE_PUBLICATION_ECHEC,
    TEXTE_PUBLICATION_INACHEVEE,
  ];
  const termes = [...TERMES_DEVELOPPEUR, "dépôt", "github", "push", "serveur", "404", "409", "422", "502", "503"];

  // Act
  const enMinuscules = messages.map((texte) => texte.toLowerCase());

  // Assert
  expect(enMinuscules.every((texte) => texte.length > 0)).toBe(true);
  for (const texte of enMinuscules) {
    for (const terme of termes) {
      expect(texte, terme).not.toContain(terme);
    }
  }
});
