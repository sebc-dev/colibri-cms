/**
 * La production des variantes réduites des images publiées — change
 * 014-site-public-rapide, ticket 02 (ADR-0031). `sharp` et le disque : importé
 * par `astro.config.ts` seul (comme `forge-github.ts`), jamais par le Worker.
 *
 * Lit `<racine>/medias/*.{png,jpg,jpeg,webp}` (les octets récupérés avant la
 * construction) et écrit `<racine>/medias/variantes/<id>-<largeur>.webp`.
 * Sécurité (security-review, mitigations 1, 3, 4) : le nom est validé et
 * l'en-tête relu par le lecteur d'ingestion AVANT tout décodage ; la limite de
 * pixels de `sharp` n'est jamais relevée ; les chemins sont formés par
 * `path.join` sur le nom validé ; une variante réemployée est d'abord relue par
 * le lecteur d'ingestion (WebP admis, largeur au plus égale à celle attendue),
 * sinon refaite ; au plus availableParallelism() photos traitées à la fois, leurs
 * largeurs l'une après l'autre (chaque largeur relit l'original : clone partage
 * l'entrée, pas le décodage).
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { extname, join } from 'node:path';
import sharp from 'sharp';
import { analyserImage } from '../../core/medias/ingestion.ts';
import { largeursDeVariantes, nomDeRepli, nomDeVariante } from '../../core/medias/variantes.ts';

const NOM_ADMIS = /^([A-Za-z0-9-]+)\.(png|jpe?g|webp)$/;
const EXTENSION_DEPOSEE = /\.(png|jpe?g|webp)$/i;
const QUALITE_WEBP = 80;

interface Entree {
  nom: string;
  id: string;
}

interface Admise {
  nom: string;
  id: string;
  octets: Uint8Array;
  largeur: number;
  modifieeLe: number;
}

/** Produit les variantes de chaque image de `<racine>/medias` ; renvoie le nombre de fichiers de variantes présents. Échoue en nommant le fichier refusé. */
export async function produireLesVariantes(racine: string): Promise<number> {
  const debut = Date.now();
  const dossier = join(racine, 'medias');
  const sortie = join(dossier, 'variantes');

  let entrees: string[];
  try {
    entrees = readdirSync(dossier);
  } catch {
    rmSync(sortie, { recursive: true, force: true });
    return 0;
  }
  const originaux = entrees.filter((nom) => EXTENSION_DEPOSEE.test(nom) && statSync(join(dossier, nom)).isFile()).sort((a, b) => a.localeCompare(b, 'fr'));
  if (originaux.length === 0) {
    rmSync(sortie, { recursive: true, force: true });
    return 0;
  }
  mkdirSync(sortie, { recursive: true });

  // Noms validés d'emblée pour toutes les images ; l'en-tête de chaque image est relu
  // juste avant son décodage, sur les mêmes octets.
  const vus = new Set<string>();
  const admises: Entree[] = [];
  for (const nom of originaux) {
    const trouve = NOM_ADMIS.exec(nom);
    if (trouve === null) throw new Error(`Image refusée « ${nom} » : nom de fichier non admis (lettres, chiffres et tirets seuls).`);
    const id = trouve[1];
    if (vus.has(id)) throw new Error(`Image refusée « ${nom} » : une autre image porte déjà l'identité « ${id} ».`);
    vus.add(id);
    admises.push({ nom, id });
  }

  // Traitement en parallèle entre photos, borné au nombre de cœurs ; les largeurs d'une photo se suivent.
  const gardes = new Set<string>();
  let fichiers = 0;
  let suivante = 0;
  const ouvrier = async (): Promise<void> => {
    while (suivante < admises.length) {
      const entree = admises[suivante++];
      const faits = await ecrireOuRepli(lireAdmise(dossier, entree.nom, entree.id), sortie);
      for (const fichier of faits) gardes.add(fichier);
      fichiers += faits.length;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(availableParallelism(), admises.length)) }, ouvrier));

  // Rien ne subsiste d'une image retirée ou d'un ancien repli.
  for (const present of readdirSync(sortie)) if (!gardes.has(present)) rmSync(join(sortie, present), { recursive: true, force: true });

  const secondes = ((Date.now() - debut) / 1000).toFixed(1);
  globalThis.console.log(`[variantes] ${String(admises.length)} photos, ${String(fichiers)} fichiers, ${secondes} s`);
  return fichiers;
}

/** Lit l'original et relit son en-tête ; les octets décodés sont ceux qui ont été analysés. */
function lireAdmise(dossier: string, nom: string, id: string): Admise {
  const octets = new Uint8Array(readFileSync(join(dossier, nom)));
  const analyse = analyserImage({ octets });
  if (!analyse.admise) throw new Error(`Image refusée « ${nom} » : ni JPEG, ni PNG, ni WebP lisible (${analyse.motif}).`);
  return { nom, id, octets, largeur: analyse.dimensions.largeur, modifieeLe: statSync(join(dossier, nom)).mtimeMs };
}

/** Une variante déjà présente n'est réemployée que si elle est un fichier WebP lisible, récent et pas plus large qu'attendu. */
function varianteReutilisable(chemin: string, largeurAttendue: number, modifieeLe: number): boolean {
  if (!existsSync(chemin)) return false;
  const stat = lstatSync(chemin);
  if (!stat.isFile() || stat.mtimeMs < modifieeLe) return false;
  const analyse = analyserImage({ octets: new Uint8Array(readFileSync(chemin)) });
  return analyse.admise && analyse.format === 'webp' && analyse.dimensions.largeur <= largeurAttendue;
}

/**
 * Écrit les variantes d'une image admise (sauf celles déjà présentes et plus
 * récentes que l'original) ; si `sharp` ne sait pas la réduire (décodage
 * impossible, image animée, écriture en échec), l'image est copiée telle que
 * déposée sous `<id>-<largeur>.<extension d'origine>` et la raison est
 * consignée en sortie. Ne lève jamais pour une image admise (design D6 du
 * change 014-site-public-rapide). Renvoie les noms des fichiers conservés.
 */
async function ecrireOuRepli(image: Admise, sortie: string): Promise<string[]> {
  const { octets, id, nom } = image;
  const largeurs = largeursDeVariantes(image.largeur);
  const noms = largeurs.map((largeur) => nomDeVariante(id, largeur));
  const aFaire = noms.filter((fichier, i) => !varianteReutilisable(join(sortie, fichier), largeurs[i], image.modifieeLe));
  if (aFaire.length === 0) return noms;

  const ecrits: string[] = [];
  let raison: string;
  try {
    const metadonnees = await sharp(octets).metadata();
    if ((metadonnees.pages ?? 1) > 1) {
      raison = 'image animée';
    } else {
      const decodee = sharp(octets).rotate();
      for (const [i, largeur] of largeurs.entries()) {
        if (!aFaire.includes(noms[i])) continue;
        const rendu = await decodee.clone().resize({ width: largeur, withoutEnlargement: true }).webp({ quality: QUALITE_WEBP }).toBuffer();
        const chemin = join(sortie, noms[i]);
        ecrits.push(chemin);
        writeFileSync(chemin, rendu);
      }
      return noms;
    }
  } catch (erreur) {
    raison = (erreur instanceof Error ? erreur.message : String(erreur)).replace(/\s+/g, ' ');
  }
  for (const fichier of ecrits) rmSync(fichier, { force: true });
  const repli = nomDeRepli(id, image.largeur, extname(nom).toLowerCase().slice(1));
  writeFileSync(join(sortie, repli), octets);
  globalThis.console.log(`[variantes] ${id} servie telle que déposée : ${raison}`);
  return [repli];
}
