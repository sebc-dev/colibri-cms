/**
 * L'orchestration de la publication (change 011-apercu-et-publication, ticket 15 ; ADR-0021,
 * ADR-0023) : l'état que le récapitulatif présente et son empreinte, la confirmation (empreinte
 * vérifiée, verrou pris, instantané gardé), puis la suite (images, contenu, finalisation).
 *
 * Zone `platform` : lit les magasins, délègue les décisions à `core/`.
 */
import { referencesDuContenuCourant, type PageContenuCourant } from '../../core/medias/references.ts';
import type { FicheMedia } from '../../core/medias/fiche.ts';
import type { Brouillon, ContenuCorrige } from '../../core/pages/brouillon.ts';
import type { ContenuOptions } from '../../core/formulaires/options.ts';
import { BAIL, deposerContenu, deposerImages, type ImagePubliee } from '../../core/publication/depot.ts';
import type { Forge } from '../../core/publication/forge.ts';
import { deposerUnePasse } from '../../core/publication/passes.ts';
import { creerForgeGithub, depotValide, type Fetch } from './forge-github.ts';
import {
  construirePlan,
  selectionnerImages,
  type FormulaireInstantane,
  type InstantanePublication,
  type PageInstantane,
  type ReglagesInstantane,
} from '../../core/publication/plan.ts';
import {
  composerRecapitulatif,
  empreinteDuRecapitulatif,
  recapitulatifEstVide,
  type ObjetEngage,
  type Recapitulatif,
} from '../../core/publication/recapitulatif.ts';
import { deriverEtat, type EtatDeLaPublication } from '../../core/publication/etat.ts';
import { lireMarqueDuSite } from '../contenu/publication.ts';
import { lireFormulaireDeLaDeclaration, lireFormulairesDeLaDeclaration } from '../contenu/formulaires.ts';
import { adressesOriginalesEmpaquetees, listerFichesMedias } from '../contenu/medias.ts';
import { listerPagesDeclarees, obtenirPageAvecEmplacements } from '../contenu/pages.ts';
import { lireReglagesDeLaDeclaration } from '../contenu/reglages.ts';
import {
  inscrireImagesDeDepart,
  listerImagesPourDepot,
  listerImagesPourRecapitulatif,
  obtenirMediaBrouillon,
  viderOctetsDesPubliees,
} from '../medias/magasin.ts';
import { obtenirPubliesReglages, obtenirPublieEmplacements, obtenirPublieFormulaire } from './magasin-publie.ts';
import {
  avancerPasse,
  enregistrerRelance,
  finaliser,
  lireDerniereDepose,
  libererVerrou,
  lireObjetsABrouillon,
  lireVerrou,
  prendreVerrou,
  reprendreVerrou,
  type DB,
  type ObjetsABrouillon,
} from './magasin.ts';

// Stryker disable all
const MODULES_PAGE_JSON: ReadonlyMap<string, { default?: { rang?: unknown } }> = new Map(
  Object.entries(import.meta.glob<{ default?: { rang?: unknown } }>('/content/pages/*/page.json', { eager: true })),
);
// Stryker restore all

/** Ce que la confirmation engage, gardé dans le verrou jusqu'à la finalisation. */
export interface InstantaneGarde {
  readonly objets: ObjetsABrouillon;
  /** Les fiches à écrire : images redécrites ou tout juste publiées. */
  readonly fiches: readonly FicheMedia[];
  /** Les images que cette publication efface de la bibliothèque. */
  readonly imagesEffacees: readonly string[];
  /** Parmi elles, celles dont la fiche est déjà dans le contenu déposé. */
  readonly fichesASupprimer: readonly string[];
  readonly aDeposer: readonly { readonly id: string; readonly extension: string }[];
  readonly deposees: readonly ImagePubliee[];
  /** Le nombre d'images à déposer au départ de la publication, pour l'avancement affiché. */
  readonly totalADeposer: number;
}

export interface EtatPublication {
  readonly recapitulatif: Recapitulatif;
  readonly empreinte: string;
  readonly instantane: InstantaneGarde;
}

function lireJson(texte: string): unknown {
  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return undefined;
  }
}

function brouillonDesLignes(objets: ObjetsABrouillon, slug: string): Brouillon {
  const brouillon = new Map<string, ContenuCorrige>();
  for (const ligne of objets.pages) {
    if (ligne.slug !== slug) continue;
    const lu = lireJson(ligne.contenu);
    if (lu !== undefined) brouillon.set(ligne.idEmplacement, lu as ContenuCorrige);
  }
  return brouillon;
}

/**
 * L'état de la publication tel qu'il est maintenant : le récapitulatif, son empreinte, et tout ce
 * qu'il faut pour déposer exactement cela. Une seule lecture des brouillons nourrit les trois.
 */
export async function calculerEtatPublication(db: DB, maintenant: number): Promise<EtatPublication> {
  await inscrireImagesDeDepart(db, listerFichesMedias(), maintenant);
  const lus = await lireObjetsABrouillon(db);

  const pagesDeclarees = listerPagesDeclarees();
  const slugsDeclares = new Set(pagesDeclarees.map((p) => p.slug));
  const formulairesDeclares = lireFormulairesDeLaDeclaration();
  const idsFormulaires = new Set(formulairesDeclares.map((f) => f.id));
  const nomsReglages = new Set(['coordonnees', 'reseaux', 'mention']);

  const pagesCourantes: PageContenuCourant[] = [];
  for (const { slug } of pagesDeclarees) {
    const page = obtenirPageAvecEmplacements(slug);
    if (!page) continue;
    pagesCourantes.push({
      slug,
      declares: page.emplacements,
      publie: await obtenirPublieEmplacements(db, slug),
      brouillon: brouillonDesLignes(lus, slug),
    });
  }
  const references = referencesDuContenuCourant(pagesCourantes);

  const recapitulatif = composerRecapitulatif({
    images: await listerImagesPourRecapitulatif(db, adressesOriginalesEmpaquetees()),
    referencesPubliees: references.publiees,
    referencesBrouillon: references.brouillon,
    pagesDeclarees,
    slugsAvecBrouillon: new Set(lus.pages.map((l) => l.slug)),
    reglagesAvecBrouillon: new Set(lus.reglages.map((l) => l.id)),
    formulairesDeclares,
    formulairesAvecBrouillon: new Set(lus.formulaires.map((l) => l.id)),
  });

  const slugsRecapitules = new Set(recapitulatif.pages.map((p) => p.slug));
  const nomsRecapitules = new Set(recapitulatif.reglages.map((r) => r.nom));
  const idsRecapitules = new Set(recapitulatif.formulaires.map((f) => f.id));
  const objets: ObjetsABrouillon = {
    pages: lus.pages.filter((l) => slugsDeclares.has(l.slug) && slugsRecapitules.has(l.slug)),
    reglages: lus.reglages.filter((l) => nomsReglages.has(l.id) && nomsRecapitules.has(l.id)),
    formulaires: lus.formulaires.filter((l) => idsFormulaires.has(l.id) && idsRecapitules.has(l.id)),
  };

  const enBase = await listerImagesPourDepot(db);
  const effacees = new Set(recapitulatif.imagesEffacees.map((i) => i.id));
  const redecrites = new Set(recapitulatif.imagesRedecrites.map((i) => i.id));
  const posees = new Set([...references.publiees, ...references.brouillon]);
  const selection = selectionnerImages(
    enBase.map((i) => ({ id: i.id, format: i.format, publiee: i.publiee, empreinteDepot: i.empreinteDepot })),
    posees,
  );
  const aDeposer = new Set(selection.aDeposer.map((i) => i.id));
  const fiches: FicheMedia[] = enBase
    .filter((i) => redecrites.has(i.id) || aDeposer.has(i.id))
    .map((i) => ({
      id: i.id,
      nomOrigine: i.nomOrigine,
      format: i.format,
      largeur: i.largeur,
      hauteur: i.hauteur,
      description: i.description,
    }));

  const engages: ObjetEngage[] = [
    ...objets.pages.map((l) => ({ genre: 'page' as const, id: `${l.slug}/${l.idEmplacement}`, version: String(l.majLe) })),
    ...objets.reglages.map((l) => ({ genre: 'reglage' as const, id: l.id, version: String(l.majLe) })),
    ...objets.formulaires.map((l) => ({ genre: 'formulaire' as const, id: l.id, version: String(l.majLe) })),
    ...enBase
      .filter((i) => redecrites.has(i.id))
      .map((i) => ({ genre: 'image-redecrite' as const, id: i.id, version: i.description })),
    ...[...effacees].map((id) => ({ genre: 'image-effacee' as const, id, version: '' })),
  ];

  return {
    recapitulatif,
    empreinte: await empreinteDuRecapitulatif(engages),
    instantane: {
      objets,
      fiches,
      imagesEffacees: [...effacees],
      fichesASupprimer: enBase.filter((i) => effacees.has(i.id) && i.publiee).map((i) => i.id),
      aDeposer: selection.aDeposer,
      deposees: selection.deposees,
      totalADeposer: selection.aDeposer.length,
    },
  };
}

function enHexadecimal(octets: Uint8Array): string {
  return [...octets].map((octet) => octet.toString(16).padStart(2, '0')).join('');
}

function depuisHexadecimal(texte: string): Uint8Array {
  const octets = new Uint8Array(texte.length / 2);
  for (let i = 0; i < octets.length; i += 1) octets[i] = Number.parseInt(texte.slice(2 * i, 2 * i + 2), 16);
  return octets;
}

export type IssueConfirmation =
  | { readonly ok: true; readonly jeton: string }
  | { readonly ok: false; readonly raison: 'changement' | 'en-cours' };

/**
 * La confirmation : rien ne part si l'empreinte reçue n'est plus celle de l'état courant (SC-016) ;
 * le verrou est pris par un seul `UPDATE`, l'instantané confirmé est gardé avec lui. Une confirmation
 * qui trouve une publication en suspens au bail expiré la reprend et rejoue son instantané et sa marque.
 */
export async function confirmerPublication(
  db: DB,
  empreinteRecue: unknown,
  maintenant: number,
  aleatoire: (octets: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): Promise<IssueConfirmation> {
  const etat = await calculerEtatPublication(db, maintenant);
  if (recapitulatifEstVide(etat.recapitulatif) || empreinteRecue !== etat.empreinte) {
    return { ok: false, raison: 'changement' };
  }
  const jeton = enHexadecimal(aleatoire(16));
  const marque = enHexadecimal(aleatoire(16));
  if (await reprendreVerrou(db, jeton, maintenant, BAIL)) return { ok: true, jeton };
  const pris = await prendreVerrou(db, jeton, JSON.stringify(etat.instantane), marque, maintenant, BAIL);
  return pris ? { ok: true, jeton } : { ok: false, raison: 'en-cours' };
}

/**
 * La fabrique du dépôt distant : l'adaptateur GitHub si le dépôt de publication et la clé
 * d'écriture sont tous deux présents, sinon `null` — la publication échoue alors avant tout appel,
 * sans rien changer (FR-091).
 */
export function obtenirForge(
  depot: unknown,
  jeton: unknown,
  appeler: Fetch = (requete) => fetch(requete),
): Forge | null {
  if (!depotValide(depot) || typeof jeton !== 'string' || jeton === '') return null;
  return creerForgeGithub({ depot, jeton, fetch: appeler });
}

export type IssueSuite =
  | { readonly ok: true; readonly fini: true; readonly marque: string }
  | { readonly ok: true; readonly fini: false; readonly parties: number; readonly total: number }
  | { readonly ok: false; readonly raison: 'verrou-perdu' | 'echec' | 'a-finaliser' };

type EtatReglagesLu = ReglagesInstantane['publies'];

async function instantanePourLePlan(db: DB, garde: InstantaneGarde): Promise<InstantanePublication> {
  const pages: PageInstantane[] = [];
  const slugs = [...new Set(garde.objets.pages.map((l) => l.slug))];
  for (const { slug } of listerPagesDeclarees()) {
    if (!slugs.includes(slug)) continue;
    const page = obtenirPageAvecEmplacements(slug);
    if (!page) continue;
    const rang = MODULES_PAGE_JSON.get(`/content/pages/${slug}/page.json`)?.default?.rang;
    pages.push({
      slug,
      titre: page.titre,
      rang: typeof rang === 'number' ? rang : pages.length,
      emplacements: page.emplacements,
      publie: await obtenirPublieEmplacements(db, slug),
      brouillon: brouillonDesLignes(garde.objets, slug),
    });
  }

  const brouillonsReglages: Record<string, unknown> = {};
  for (const ligne of garde.objets.reglages) brouillonsReglages[ligne.id] = lireJson(ligne.contenu);
  const reglages: ReglagesInstantane = {
    declares: lireReglagesDeLaDeclaration(),
    publies: (await obtenirPubliesReglages(db)) as EtatReglagesLu,
    brouillons: brouillonsReglages,
  };

  const formulaires: FormulaireInstantane[] = [];
  for (const ligne of garde.objets.formulaires) {
    const declare = lireFormulaireDeLaDeclaration(ligne.id);
    const brouillon = lireJson(ligne.contenu) as ContenuOptions | undefined;
    if (declare === undefined || brouillon === undefined) continue;
    const publie = await obtenirPublieFormulaire(db, ligne.id);
    formulaires.push(publie === undefined ? { declare, brouillon } : { declare, publie, brouillon });
  }

  return { pages, images: garde.fiches, imagesEffacees: garde.fichesASupprimer, reglages, formulaires };
}

const MESSAGE_DEPOT = 'Mise en ligne';

/**
 * Lit l'originale empaquetée d'une image posée au départ, par la liaison `ASSETS`.
 * Rend `null` si l'image n'a pas d'originale empaquetée ou si la lecture échoue.
 */
export function lecteurDesOriginalesEmpaquetees(assets: {
  fetch(requete: Request): Promise<Response>;
}): (id: string) => Promise<Uint8Array | null> {
  return async (id) => {
    const adresse = adressesOriginalesEmpaquetees().get(id);
    if (adresse === undefined) return null;
    const reponse = await assets.fetch(new Request(new URL(adresse, 'https://assets.local')));
    return reponse.ok ? new Uint8Array(await reponse.arrayBuffer()) : null;
  };
}

type LireOriginale = (id: string) => Promise<Uint8Array | null>;

/** Les octets d'une image à déposer : ceux de la bibliothèque, sinon l'originale empaquetée. */
function lecteurDesOctets(db: DB, lireOriginale: LireOriginale): LireOriginale {
  return async (id) => {
    const media = await obtenirMediaBrouillon(db, id);
    // Une image posée au départ est relue depuis son originale empaquetée : l'arbre des images
    // se calcule sans lire la branche.
    return media !== null && media.octets.length > 0 ? media.octets : lireOriginale(id);
  };
}

/**
 * La suite, une passe à la fois (ADR-0023). Tant qu'il reste des images à déposer, une passe en
 * dépose une part bornée, garde la progression dans l'instantané et renouvelle le bail. La passe
 * finale bâtit la branche des images, puis la branche principale, puis finalise en un seul lot D1.
 * Un échec avant le dépôt de la branche principale libère le verrou sans rien écrire d'autre ; un
 * échec de la finalisation, après ce dépôt, garde le verrou et l'instantané pour que la même
 * publication, rejouée, aboutisse.
 */
export async function poursuivreUnePasse(
  db: DB,
  jeton: string,
  maintenant: number,
  forge: Forge | null,
  lireOriginale: LireOriginale,
): Promise<IssueSuite> {
  const verrou = await lireVerrou(db, jeton);
  if (verrou === null) return { ok: false, raison: 'verrou-perdu' };
  if (forge === null) {
    await libererVerrou(db, jeton);
    return { ok: false, raison: 'echec' };
  }
  const garde = lireJson(verrou.instantane) as InstantaneGarde;
  try {
    if (garde.aDeposer.length > 0) return await passeDeBlobs(db, jeton, maintenant, forge, garde, lireOriginale);
    return await passeFinale(db, jeton, maintenant, forge, garde, verrou.marque);
  } catch (erreur) {
    console.error('[publication] échec avant le dépôt principal', erreur);
    await libererVerrou(db, jeton);
    return { ok: false, raison: 'echec' };
  }
}

/** Toutes les passes d'affilée, jusqu'à la fin ou au premier échec (hors route : un seul appel). */
export async function poursuivrePublication(
  db: DB,
  jeton: string,
  maintenant: number,
  forge: Forge | null,
  lireOriginale: LireOriginale,
): Promise<Extract<IssueSuite, { ok: false } | { fini: true }>> {
  for (;;) {
    const issue = await poursuivreUnePasse(db, jeton, maintenant, forge, lireOriginale);
    if (!issue.ok || issue.fini) return issue;
  }
}

async function passeDeBlobs(
  db: DB,
  jeton: string,
  maintenant: number,
  forge: Forge,
  garde: InstantaneGarde,
  lireOriginale: LireOriginale,
): Promise<IssueSuite> {
  const passe = await deposerUnePasse(forge, garde.aDeposer, lecteurDesOctets(db, lireOriginale));
  if (!passe.aboutie) {
    if (passe.raison === 'octets-manquants') console.error('[publication] image à déposer sans octets');
    await libererVerrou(db, jeton);
    return { ok: false, raison: 'echec' };
  }
  const suivant: InstantaneGarde = {
    ...garde,
    aDeposer: passe.restantes,
    deposees: [...garde.deposees, ...passe.deposees],
  };
  if (!(await avancerPasse(db, jeton, JSON.stringify(suivant), maintenant, BAIL))) {
    return { ok: false, raison: 'verrou-perdu' };
  }
  return { ok: true, fini: false, parties: garde.totalADeposer - passe.restantes.length, total: garde.totalADeposer };
}

async function passeFinale(
  db: DB,
  jeton: string,
  maintenant: number,
  forge: Forge,
  garde: InstantaneGarde,
  marqueGardee: string,
): Promise<IssueSuite> {
  const effacees = new Set(garde.imagesEffacees);
  await viderOctetsDesPubliees(
    db,
    [...adressesOriginalesEmpaquetees().keys()].filter((id) => !effacees.has(id)),
  );

  const images = await deposerImages(forge, { publiees: garde.deposees, nouvelles: [] }, MESSAGE_DEPOT);
  if (!images.aboutie) {
    await libererVerrou(db, jeton);
    return { ok: false, raison: 'echec' };
  }

  const instantane = await instantanePourLePlan(db, garde);
  const plan = construirePlan(instantane, () => depuisHexadecimal(marqueGardee));
  const depot = await deposerContenu(forge, plan, MESSAGE_DEPOT);
  if (!depot.aboutie) {
    await libererVerrou(db, jeton);
    return { ok: false, raison: 'echec' };
  }

  try {
    await finaliser(db, {
      jeton,
      marque: plan.marque,
      maintenant,
      objets: garde.objets,
      imagesPubliees: garde.fiches.map((fiche) => ({
        id: fiche.id,
        description: fiche.description,
        empreinte: images.inventaire.find((i) => i.id === fiche.id)?.empreinte ?? null,
      })),
      imagesEffacees: garde.imagesEffacees,
    });
    return { ok: true, fini: true, marque: plan.marque };
  } catch (erreur) {
    // Le verrou et l'instantané restent : la même publication, rejouée, est reconnue.
    console.error('[publication] finalisation non écrite après le dépôt', erreur);
    return { ok: false, raison: 'a-finaliser' };
  }
}

/**
 * L'état de la dernière publication, dérivé à chaque lecture (ADR-0023). `marqueDuSite` vaut par
 * défaut la marque empaquetée par ce site. Quand elle est en ligne, les octets des images publiées
 * empaquetées par le Worker sont vidés en base (ADR-0020).
 */
export async function lireEtatDeLaPublication(
  db: DB,
  maintenant: number,
  marqueDuSite: string | null = lireMarqueDuSite(),
): Promise<EtatDeLaPublication> {
  const depose = await lireDerniereDepose(db, maintenant);
  const etat = deriverEtat({ ...depose, marqueDuSite, maintenant });
  if (etat === 'en-ligne') await viderOctetsDesPubliees(db, adressesOriginalesEmpaquetees().keys());
  return etat;
}

export type IssueRelance = { readonly ok: true } | { readonly ok: false; readonly raison: 'en-cours' | 'echec' };

/**
 * La relance d'une mise en ligne qui n'a pas abouti : une marque neuve, seule, déposée sur la
 * branche principale sans changer le contenu. Le verrou est pris, puis libéré quoi qu'il arrive.
 */
export async function relancerLaMiseEnLigne(
  db: DB,
  forge: Forge | null,
  maintenant: number,
  aleatoire: (octets: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): Promise<IssueRelance> {
  const jeton = enHexadecimal(aleatoire(16));
  const marque = enHexadecimal(aleatoire(16));
  if (!(await prendreVerrou(db, jeton, null, marque, maintenant, BAIL))) return { ok: false, raison: 'en-cours' };
  if (forge === null) {
    await libererVerrou(db, jeton);
    return { ok: false, raison: 'echec' };
  }
  try {
    const depot = await deposerContenu(
      forge,
      {
        ecritures: [{ chemin: 'content/publication.json', contenu: `${JSON.stringify({ publication: marque }, null, 2)}\n` }],
        suppressions: [],
        marque,
      },
      MESSAGE_DEPOT,
    );
    if (!depot.aboutie) {
      await libererVerrou(db, jeton);
      return { ok: false, raison: 'echec' };
    }
    await enregistrerRelance(db, jeton, marque, maintenant);
    return { ok: true };
  } catch (erreur) {
    console.error('[publication] échec de la relance', erreur);
    await libererVerrou(db, jeton);
    return { ok: false, raison: 'echec' };
  }
}
