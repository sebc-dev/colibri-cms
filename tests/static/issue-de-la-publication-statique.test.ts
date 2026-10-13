/**
 * Change 011, ticket 18 — ce qui ne se lit que dans les sources : les textes de l'état d'une
 * publication (FR-117), la marque empaquetée par le site (ADR-0023), la pastille du cadre.
 * Oracle partiel : la relecture reste humaine.
 */
import { it, expect } from 'vitest';
import * as textes from '../../src/admin/textes.ts';
import cadre from '../../src/admin/GabaritCadre.astro?raw';

const TERMES_DEVELOPPEUR = [
  'commit',
  'branche',
  'build',
  'déploiement',
  'déployer',
  'repository',
  'endpoint',
  'webhook',
  'backend',
  'framework',
  'json',
  'sha',
  'blob',
  'octets',
  'base de données',
  'token',
  'api',
  'dépôt',
  'github',
  'push',
  'serveur',
  'worker',
  'cloudflare',
];

function contientLeMot(texte: string, mot: string): boolean {
  return texte.split(/[^\p{L}\p{N}]+/u).includes(mot) || (mot.includes(' ') && texte.includes(mot));
}

const exportsTexte: [string, string][] = Object.entries(textes).filter(
  (entree): entree is [string, string] => typeof entree[1] === 'string',
);

function normaliser(texte: string): string {
  return texte.replaceAll('’', "'");
}

function textesContenant(extrait: string): [string, string][] {
  return exportsTexte.filter(([, valeur]) => normaliser(valeur).includes(extrait));
}

const PHRASES_DE_L_ETAT = [
  'Mise en ligne en cours…',
  'Site à jour',
  "La dernière mise en ligne n'a pas abouti",
  'Publication en cours…',
  'Votre site est à jour.',
  'Voir mon site',
  "La mise en ligne n'a pas abouti. Votre site est resté tel qu'il était, et vos modifications sont gardées.",
  'Relancer la mise en ligne',
];

it("SC-18g — les quatre états de la pastille du cadre et les états de l'écran Publier sont centralisés dans textes.ts", () => {
  for (const phrase of PHRASES_DE_L_ETAT) {
    expect(textesContenant(phrase).length, phrase).toBeGreaterThan(0);
  }
});

it("SC-18g — le cadre rend la pastille de la publication, au serveur, à côté de « Publier »", async () => {
  const pastille = (await import('../../src/admin/PastillePublication.astro?raw')).default;
  expect(cadre).toContain('PastillePublication');
  expect(pastille).not.toMatch(/client:(load|idle|visible|media|only)/);
});

it("SC-18f — aucun terme de développeur dans les textes de l'état d'une publication (en cours, en ligne, sans aboutissement, refusée)", () => {
  const etat = exportsTexte.filter(
    ([nom, valeur]) =>
      nom.startsWith('TEXTE_PUBLICATION') ||
      PHRASES_DE_L_ETAT.some((phrase) => normaliser(valeur).includes(phrase)),
  );
  expect(etat.length).toBeGreaterThanOrEqual(PHRASES_DE_L_ETAT.length);
  for (const [nom, valeur] of etat) {
    for (const terme of TERMES_DEVELOPPEUR) {
      expect(contientLeMot(valeur.toLowerCase(), terme), `${nom} — ${terme}`).toBe(false);
    }
  }
});

it('SC-18h — aucun terme de développeur dans le menu, le geste « Publier » et les libellés du cadre', () => {
  const libelles = exportsTexte.filter(
    ([nom]) => nom === 'TEXTE_BOUTON_PUBLIER' || nom.includes('RUBRIQUE') || nom.includes('CADRE') || nom.includes('MENU'),
  );
  expect(libelles.some(([nom]) => nom === 'TEXTE_BOUTON_PUBLIER')).toBe(true);
  for (const [nom, valeur] of libelles) {
    for (const terme of TERMES_DEVELOPPEUR) {
      expect(contientLeMot(valeur.toLowerCase(), terme), `${nom} — ${terme}`).toBe(false);
    }
  }
});

it("SC-18b — le site empaquette la marque de publication par import.meta.glob ; absente, il n'est né d'aucune publication", async () => {
  const marquePublication = (await import('../../src/platform/contenu/publication.ts?raw')).default;
  expect(marquePublication).toContain('import.meta.glob');
  expect(marquePublication).toContain('content/publication.json');
});

// --- Tests retenus par la review du ticket 18 ---

/** Le texte de `source` entre `debut` (inclus) et la première occurrence suivante de `fin` (exclue). */
function entre(source: string, debut: string, fin: string): string {
  const depart = source.indexOf(debut);
  expect(depart, debut).toBeGreaterThan(-1);
  const arrivee = source.indexOf(fin, depart + debut.length);
  expect(arrivee, fin).toBeGreaterThan(depart);
  return source.slice(depart, arrivee);
}

it("ticket 18 — la relecture de l'état ne recharge pas l'écran pendant une publication ou une relance en cours", async () => {
  // Arrange
  const source = (await import('../../src/admin/ilots-svelte-5/EcranPublier.svelte?raw')).default;

  // Act : le corps de la relecture périodique, jusqu'au rechargement
  const relecture = entre(source, 'setInterval(', 'window.location.reload');
  const garde = relecture.search(/if \(enCours \|\| relanceEnCours\) return;/);
  const lecture = relecture.indexOf("fetch('/admin/publication/etat'");

  // Assert : la garde précède la lecture de l'état
  expect(garde, 'garde « publication ou relance en cours »').toBeGreaterThan(-1);
  expect(lecture, "lecture de l'état").toBeGreaterThan(garde);
});

it("ticket 18 — « n'a pas abouti » est présenté en danger, dans le cadre comme sur l'écran Publier", async () => {
  // Arrange
  const pastille = (await import('../../src/admin/PastillePublication.astro?raw')).default;
  const publier = (await import('../../src/pages/admin/publier.astro?raw')).default;

  // Act
  const pastillePasAbouti = entre(pastille, "etat === 'pas-abouti' ? (", ') : (');
  const pastilleAutres = entre(pastille, ') : (', '))');
  const ecranPasAbouti = entre(publier, "etat === 'pas-abouti' && (", '</p>');

  // Assert
  expect(pastillePasAbouti).toContain('text-danger');
  expect(pastilleAutres).not.toContain('text-danger');
  expect(ecranPasAbouti).toContain('data-etat-publication="pas-abouti"');
  expect(ecranPasAbouti).toContain('text-danger');
});
