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
 * `path.join` sur le nom validé ; les photos passent une à une.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { analyserImage } from '../../core/medias/ingestion.ts';
import { largeursDeVariantes, nomDeVariante } from '../../core/medias/variantes.ts';

const NOM_ADMIS = /^([A-Za-z0-9-]+)\.(png|jpe?g|webp)$/;
const EXTENSION_DEPOSEE = /\.(png|jpe?g|webp)$/i;
const QUALITE_WEBP = 80;

/** Produit les variantes de chaque image de `<racine>/medias` ; renvoie le nombre de fichiers écrits. Échoue en nommant le fichier refusé. */
export async function produireLesVariantes(racine: string): Promise<number> {
  const dossier = join(racine, 'medias');
  const sortie = join(dossier, 'variantes');
  rmSync(sortie, { recursive: true, force: true });

  let entrees: string[];
  try {
    entrees = readdirSync(dossier);
  } catch {
    return 0;
  }
  const originaux = entrees.filter((nom) => EXTENSION_DEPOSEE.test(nom) && statSync(join(dossier, nom)).isFile()).sort((a, b) => a.localeCompare(b, 'fr'));
  if (originaux.length === 0) return 0;
  mkdirSync(sortie, { recursive: true });

  const vus = new Set<string>();
  let ecrits = 0;
  for (const nom of originaux) {
    const trouve = NOM_ADMIS.exec(nom);
    if (trouve === null) throw new Error(`Image refusée « ${nom} » : nom de fichier non admis (lettres, chiffres et tirets seuls).`);
    const id = trouve[1];
    if (vus.has(id)) throw new Error(`Image refusée « ${nom} » : une autre image porte déjà l'identité « ${id} ».`);
    vus.add(id);

    const octets = new Uint8Array(readFileSync(join(dossier, nom)));
    const analyse = analyserImage({ octets });
    if (!analyse.admise) throw new Error(`Image refusée « ${nom} » : ni JPEG, ni PNG, ni WebP lisible (${analyse.motif}).`);

    ecrits += await ecrireLesVariantes(octets, analyse.dimensions.largeur, id, nom, sortie);
  }
  return ecrits;
}

/** Écrit, une à une, les variantes d'une image admise ; renvoie leur nombre. Échoue en nommant le fichier que `sharp` ne sait pas réduire. */
async function ecrireLesVariantes(
  octets: Uint8Array,
  largeurOrigine: number,
  id: string,
  nom: string,
  sortie: string,
): Promise<number> {
  let ecrits = 0;
  try {
    for (const largeur of largeursDeVariantes(largeurOrigine)) {
      const variante = await sharp(octets)
        .rotate()
        .resize({ width: largeur, withoutEnlargement: true })
        .webp({ quality: QUALITE_WEBP })
        .toBuffer();
      writeFileSync(join(sortie, nomDeVariante(id, largeur)), variante);
      ecrits += 1;
    }
  } catch (erreur) {
    const cause = erreur instanceof Error ? erreur.message : String(erreur);
    throw new Error(`Image « ${nom} » impossible à réduire : ${cause}`, { cause: erreur });
  }
  return ecrits;
}
