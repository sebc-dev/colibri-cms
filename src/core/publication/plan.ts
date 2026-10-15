/**
 * Le plan de dépôt, pur (change 011, ticket 12) : depuis un instantané, les
 * fichiers à écrire et à supprimer sur la branche principale. Aucun dépôt ici.
 */
import type { FicheMedia } from '../medias/fiche.ts';
import type { FormatImageAdmis } from '../medias/ingestion.ts';
import { appliquerBrouillonSurEmplacement, pagePorteUnBrouillon, type Brouillon } from '../pages/brouillon.ts';
import type { Emplacement, EmplacementJson } from '../pages/declaration.ts';
import { coordonneesCourantes } from '../reglages/coordonnees.ts';
import type { ReglagesDeclares, ReseauDeclare } from '../reglages/declaration.ts';
import { optionsCourantes } from '../formulaires/brouillon.ts';
import type { ChampDeclare, FormulaireDeclare } from '../formulaires/declaration.ts';
import type { ContenuOptions } from '../formulaires/options.ts';
import type { ImagePubliee } from './depot.ts';
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
  readonly formulaires?: readonly FormulaireInstantane[];
}

export interface FormulaireInstantane {
  readonly declare: FormulaireDeclare;
  readonly publie?: ContenuOptions;
  readonly brouillon: ContenuOptions;
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
    case 'formulaire':
      return { ...base, formulaire: emplacement.formulaire };
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

/** Le formulaire.json au format d'ADR-0018 (`{ nom, champs }`), la liste des options d'un champ à choix venant de l'état courant (ADR-0026). */
function ecritureDeFormulaire(formulaire: FormulaireInstantane): EcritureDepot {
  const { declare, publie, brouillon } = formulaire;
  const courantes = optionsCourantes(declare, brouillon, publie);
  const versChamp = (champ: ChampDeclare): Record<string, unknown> => {
    const base = {
      id: champ.id,
      nature: champ.nature,
      libelle: champ.libelle,
      obligatoire: champ.obligatoire,
    };
    const options = courantes.get(champ.id);
    return options === undefined ? base : { ...base, avecPrix: champ.avecPrix, options };
  };
  return {
    chemin: `content/formulaires/${exigerIdentifiant(declare.id)}/formulaire.json`,
    contenu: json({ nom: declare.nom, champs: declare.champs.map(versChamp) }),
  };
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
  for (const formulaire of instantane.formulaires ?? []) {
    ecritures.push(ecritureDeFormulaire(formulaire));
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

export interface ImageEnBase {
  readonly id: string;
  readonly format: FormatImageAdmis;
  readonly publiee: boolean; // publiee_le non nul en D1
  readonly empreinteDepot: string | null;
}

export interface SelectionImages {
  readonly aDeposer: readonly { readonly id: string; readonly extension: string }[];
  readonly deposees: readonly ImagePubliee[];
}

/**
 * Sélection des images à déposer (D6) : les posées sans empreinte sont à déposer ; les porteuses
 * d'empreinte restent si publiées ou posées. Une image que cette publication efface reste jusqu'à
 * la finalisation (D5).
 */
export function selectionnerImages(
  images: readonly ImageEnBase[],
  poseesParLeContenu: ReadonlySet<string>,
): SelectionImages {
  const aDeposer: { readonly id: string; readonly extension: string }[] = [];
  const deposees: ImagePubliee[] = [];
  for (const image of images) {
    const posee = poseesParLeContenu.has(image.id);
    if (image.empreinteDepot === null) {
      if (posee) aDeposer.push({ id: exigerIdentifiant(image.id), extension: image.format });
    } else if (image.publiee || posee) {
      deposees.push({
        id: exigerIdentifiant(image.id),
        extension: image.format,
        empreinte: image.empreinteDepot,
      });
    }
  }
  return { aDeposer, deposees };
}
