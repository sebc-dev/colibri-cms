/**
 * Le plan de dépôt, pur (change 011, ticket 12) : depuis un instantané, les
 * fichiers à écrire et à supprimer sur la branche principale. Aucun dépôt ici.
 */
import type { FicheMedia } from '../medias/fiche.ts';
import { appliquerBrouillonSurEmplacement, pagePorteUnBrouillon, type Brouillon } from '../pages/brouillon.ts';
import type { Emplacement, EmplacementJson } from '../pages/declaration.ts';
import { coordonneesCourantes } from '../reglages/coordonnees.ts';
import type { ReglagesDeclares, ReseauDeclare } from '../reglages/declaration.ts';
import { cheminAutorise, identifiantValide } from './prefixes.ts';

export interface PageInstantane {
  readonly slug: string;
  readonly titre: string;
  readonly rang: number;
  readonly emplacements: readonly Emplacement[];
  readonly publie: Brouillon;
  readonly brouillon: Brouillon;
}

interface EtatReglages {
  readonly coordonnees?: Readonly<Record<string, string>>; // identifiant -> valeur
  readonly reseaux?: readonly ReseauDeclare[];
  readonly mention?: string;
}

export interface ReglagesInstantane {
  readonly declares: ReglagesDeclares;
  readonly publies: EtatReglages;
  readonly brouillons: EtatReglages;
}

export interface InstantanePublication {
  readonly pages: readonly PageInstantane[];
  readonly images: readonly FicheMedia[];
  readonly imagesEffacees: readonly string[];
  readonly reglages?: ReglagesInstantane;
}

export interface EcritureDepot {
  readonly chemin: string;
  readonly contenu: string;
}

export interface PlanDepot {
  readonly ecritures: readonly EcritureDepot[];
  readonly suppressions: readonly string[];
  readonly marque: string;
}

function json(valeur: unknown): string {
  return `${JSON.stringify(valeur, null, 2)}\n`;
}

function exigerIdentifiant(identifiant: string): string {
  if (!identifiantValide(identifiant)) throw new Error(`identifiant refusé : ${identifiant}`);
  return identifiant;
}

function versJson(emplacement: Emplacement): EmplacementJson {
  const base = {
    id: emplacement.id,
    nature: emplacement.nature,
    rang: emplacement.rang,
    ...(emplacement.nom === undefined ? {} : { nom: emplacement.nom }),
  };
  switch (emplacement.nature) {
    case 'texte-riche':
      return base;
    case 'lien-video':
      return { ...base, lien: emplacement.lien };
    case 'bouton-action':
      return { ...base, libelle: emplacement.libelle, destination: emplacement.destination };
    case 'image':
      return { ...base, mediaId: emplacement.mediaId };
    case 'galerie':
    case 'carrousel':
      return { ...base, mediaIds: emplacement.mediaIds };
  }
}

function avecSautFinal(texte: string): string {
  return texte.endsWith('\n') ? texte : `${texte}\n`;
}

/** Les fichiers de réglages : déclaration < publié < brouillon ; sans brouillon, rien n'est réécrit. */
function ecrituresDeReglages(reglages: ReglagesInstantane): EcritureDepot[] {
  const { declares, publies, brouillons } = reglages;
  if (
    brouillons.coordonnees === undefined &&
    brouillons.reseaux === undefined &&
    brouillons.mention === undefined
  ) {
    return [];
  }
  const coordonnees = coordonneesCourantes(
    coordonneesCourantes(declares.coordonnees, publies.coordonnees ?? {}),
    brouillons.coordonnees ?? {},
  );
  const reseaux = brouillons.reseaux ?? publies.reseaux ?? declares.reseaux;
  const mention = brouillons.mention ?? publies.mention ?? declares.mention;
  return [
    {
      chemin: 'content/reglages/reglages.json',
      contenu: json({
        coordonnees: coordonnees.map((c) => ({
          id: c.id,
          nature: c.nature,
          ...(c.nom === undefined ? {} : { nom: c.nom }),
          valeur: c.valeur,
        })),
        reseaux: reseaux.map((r) => ({ nom: r.nom, lien: r.lien })),
      }),
    },
    { chemin: 'content/reglages/mention.md', contenu: avecSautFinal(mention) },
  ];
}

function ecrituresDePage(page: PageInstantane): EcritureDepot[] {
  const dossier = `content/pages/${exigerIdentifiant(page.slug)}`;
  const effectifs = page.emplacements.map((emplacement) =>
    appliquerBrouillonSurEmplacement(
      appliquerBrouillonSurEmplacement(emplacement, page.publie),
      page.brouillon,
    ),
  );
  for (const emplacement of effectifs) exigerIdentifiant(emplacement.id);
  const ecritures: EcritureDepot[] = [
    {
      chemin: `${dossier}/page.json`,
      contenu: json({ titre: page.titre, rang: page.rang, emplacements: effectifs.map(versJson) }),
    },
  ];
  for (const emplacement of effectifs) {
    if (emplacement.nature !== 'texte-riche') continue;
    const texte = emplacement.contenu;
    ecritures.push({
      chemin: `${dossier}/${emplacement.id}.md`,
      contenu: avecSautFinal(texte),
    });
  }
  return ecritures;
}

function hexadecimal(octets: Uint8Array): string {
  return [...octets].map((octet) => octet.toString(16).padStart(2, '0')).join('');
}

/** Construit le plan de dépôt ; refuse (exception) tout identifiant hors forme ou chemin hors préfixes. */
export function construirePlan(
  instantane: InstantanePublication,
  aleatoire: (octets: number) => Uint8Array,
): PlanDepot {
  const ecritures: EcritureDepot[] = [];
  for (const page of instantane.pages) {
    if (pagePorteUnBrouillon(page.brouillon)) ecritures.push(...ecrituresDePage(page));
  }
  if (instantane.reglages !== undefined) {
    ecritures.push(...ecrituresDeReglages(instantane.reglages));
  }
  for (const fiche of instantane.images) {
    ecritures.push({
      chemin: `content/medias/${exigerIdentifiant(fiche.id)}.json`,
      contenu: json({
        id: fiche.id,
        nomOrigine: fiche.nomOrigine,
        format: fiche.format,
        largeur: fiche.largeur,
        hauteur: fiche.hauteur,
        description: fiche.description,
      }),
    });
  }
  const suppressions = instantane.imagesEffacees.map(
    (id) => `content/medias/${exigerIdentifiant(id)}.json`,
  );
  const marque = hexadecimal(aleatoire(16));
  ecritures.push({ chemin: 'content/publication.json', contenu: json({ publication: marque }) });
  for (const chemin of [...ecritures.map((e) => e.chemin), ...suppressions]) {
    if (!cheminAutorise(chemin)) throw new Error(`chemin refusé : ${chemin}`);
  }
  return { ecritures, suppressions, marque };
}
