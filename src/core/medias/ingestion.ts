/**
 * Reconnaître et mesurer une image à téléverser — ticket 01
 * (openspec/changes/004-bibliotheque-de-medias/tickets/01-reconnaitre-mesurer-image.md),
 * candidat ADR `ingestion-des-medias-liste-blanche-sur-octets`.
 *
 * Zone `core` (docs/architecture.md, I1/I2) : fonction pure, zéro dépendance,
 * ni framework ni plateforme — instanciable sans D1 ni Worker (ARCH-5). Même
 * patron défensif que `core/pages/declaration.ts` et `core/pages/
 * texte-riche.ts` : une entrée mal formée se traduit en valeur de retour,
 * jamais en exception.
 *
 * Reconnaissance du format sur les seuls octets magiques d'en-tête — JPEG
 * `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF…WEBP` — jamais
 * l'extension du nom ni le type déclaré au téléversement (SC-01c) : ces deux
 * champs sont acceptés dans `FichierPropose` (un vrai téléversement les
 * porte) mais ne pèsent jamais sur la décision. Tout autre format — SVG
 * compris — est refusé au titre du format (SC-01b), au même titre qu'un
 * en-tête reconnu mais tronqué (segment de dimensions absent ou coupé) :
 * aucun motif dédié, la fonction reste totale sur une entrée mal formée. Un
 * en-tête qui annonce des dimensions impossibles (nulles ou hors borne du
 * format) est illisible au même titre qu'un en-tête coupé, et se refuse
 * lui aussi au titre du format.
 *
 * Bornes tranchées par les tests de ce ticket (le ticket lui-même délègue
 * l'arbitrage à l'implémentation) : poids maximal 2 Mo **inclusif** (exactement
 * `POIDS_MAX_OCTETS_IMAGE` octets est admis, seul le premier octet en trop est
 * refusé au titre du poids, SC-01d).
 */

/** Un fichier proposé au téléversement, avant toute décision d'admission. */
export interface FichierPropose {
  readonly octets: Uint8Array;
  readonly nomFichier?: string;
  readonly typeDeclare?: string;
}

/** Les seuls formats d'image admis, déduits des octets d'en-tête (jamais recopiés). */
export type FormatImageAdmis = 'jpeg' | 'png' | 'webp';

/** Les dimensions lues à l'en-tête, en pixels. */
export interface DimensionsImage {
  readonly largeur: number;
  readonly hauteur: number;
}

/** Le résultat, total, de l'analyse d'un fichier proposé. */
export type ResultatIngestionImage =
  | { readonly admise: true; readonly format: FormatImageAdmis; readonly dimensions: DimensionsImage }
  | { readonly admise: false; readonly motif: 'format' | 'poids' };

/** Le poids maximal admis pour une image, en octets (2 Mo, borne inclusive). */
export const POIDS_MAX_OCTETS_IMAGE = 2 * 1024 * 1024;

/** Une détection de format réussie : le format déduit et ses dimensions. */
interface DetectionFormat {
  readonly format: FormatImageAdmis;
  readonly dimensions: DimensionsImage;
}

/**
 * Analyse un fichier proposé et décide de son admission, sans jamais lever
 * d'exception (même sur une entrée vide, tronquée ou mal formée).
 */
export function analyserImage(fichier: FichierPropose): ResultatIngestionImage {
  const detection = detecterFormatEtDimensions(fichier.octets);
  if (detection === null) {
    return { admise: false, motif: 'format' };
  }
  if (fichier.octets.length > POIDS_MAX_OCTETS_IMAGE) {
    return { admise: false, motif: 'poids' };
  }
  return { admise: true, format: detection.format, dimensions: detection.dimensions };
}

/** Borne de dimension plausible par format, déduite de la largeur du champ d'en-tête qui la porte. */
const DIMENSION_MAX_PNG = 2 ** 31 - 1;
const DIMENSION_MAX_JPEG = 65535;
const DIMENSION_MAX_WEBP = 16777216;

/**
 * Une dimension lue à l'en-tête n'est plausible que si elle est un entier
 * positif tenant dans la borne du champ qui la porte pour ce format — sinon
 * l'en-tête est illisible au même titre qu'un en-tête tronqué.
 */
function dimensionsPlausibles(dimensions: DimensionsImage, maximum: number): boolean {
  const { largeur, hauteur } = dimensions;
  return (
    Number.isInteger(largeur) &&
    Number.isInteger(hauteur) &&
    largeur >= 1 &&
    hauteur >= 1 &&
    largeur <= maximum &&
    hauteur <= maximum
  );
}

/**
 * Reconnaît le format sur les octets magiques d'en-tête puis lit les
 * dimensions dans le même en-tête. Renvoie `null` aussi bien pour un format
 * hors liste que pour un en-tête reconnu mais illisible (tronqué, ou portant
 * des dimensions impossibles) — les deux cas se traduisent, côté appelant,
 * par le même motif `'format'`.
 */
function detecterFormatEtDimensions(octets: Uint8Array): DetectionFormat | null {
  if (aLaSignatureJpeg(octets)) {
    const dimensions = lireDimensionsJpeg(octets);
    if (dimensions === null || !dimensionsPlausibles(dimensions, DIMENSION_MAX_JPEG)) {
      return null;
    }
    return { format: 'jpeg', dimensions };
  }
  if (aLaSignaturePng(octets)) {
    const dimensions = lireDimensionsPng(octets);
    if (dimensions === null || !dimensionsPlausibles(dimensions, DIMENSION_MAX_PNG)) {
      return null;
    }
    return { format: 'png', dimensions };
  }
  if (aLaSignatureWebp(octets)) {
    const dimensions = lireDimensionsWebp(octets);
    if (dimensions === null || !dimensionsPlausibles(dimensions, DIMENSION_MAX_WEBP)) {
      return null;
    }
    return { format: 'webp', dimensions };
  }
  return null;
}

// --- JPEG ---------------------------------------------------------------

function aLaSignatureJpeg(octets: Uint8Array): boolean {
  return octets.length >= 3 && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff;
}

/** Les marqueurs SOF (Start Of Frame) porteurs de dimensions — hors DHT/JPG/DAC. */
function estMarqueurSof(marqueur: number): boolean {
  return marqueur >= 0xc0 && marqueur <= 0xcf && marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc;
}

/**
 * Parcourt les segments JPEG à la recherche d'un marqueur SOF, en sautant
 * les segments (APP0/JFIF, EXIF…) qui peuvent le précéder (test-plan.md :
 * SOF non collé au SOI). Un en-tête tronqué, à quelque étape que ce soit,
 * rend `null` — jamais d'exception.
 */
function lireDimensionsJpeg(octets: Uint8Array): DimensionsImage | null {
  let pos = 2; // après le SOI (FF D8)
  while (true) {
    if (pos + 1 >= octets.length) {
      return null;
    }
    if (octets[pos] !== 0xff) {
      return null;
    }
    const marqueur = octets[pos + 1];
    pos += 2;

    // Marqueurs sans segment de longueur : standalone (RST0-RST7, TEM).
    if ((marqueur >= 0xd0 && marqueur <= 0xd7) || marqueur === 0x01) {
      continue;
    }
    if (marqueur === 0xd9) {
      // EOI atteint sans SOF trouvé.
      return null;
    }

    if (pos + 1 >= octets.length) {
      return null;
    }
    const longueur = ((octets[pos] << 8) | octets[pos + 1]) >>> 0;

    if (estMarqueurSof(marqueur)) {
      if (longueur < 7 || pos + longueur > octets.length) {
        return null;
      }
      const hauteur = (octets[pos + 3] << 8) | octets[pos + 4];
      const largeur = (octets[pos + 5] << 8) | octets[pos + 6];
      return { largeur, hauteur };
    }

    pos += longueur;
    if (pos > octets.length) {
      return null;
    }
  }
}

// --- PNG ------------------------------------------------------------------

const SIGNATURE_PNG: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function aLaSignaturePng(octets: Uint8Array): boolean {
  if (octets.length < SIGNATURE_PNG.length) {
    return false;
  }
  return SIGNATURE_PNG.every((valeur, index) => octets[index] === valeur);
}

/** Signature (8) + longueur de chunk (4) + type "IHDR" (4) + largeur/hauteur (4+4). */
function lireDimensionsPng(octets: Uint8Array): DimensionsImage | null {
  if (octets.length < 16) {
    return null;
  }
  const typeChunk = [octets[12], octets[13], octets[14], octets[15]];
  const estIhdr = typeChunk[0] === 0x49 && typeChunk[1] === 0x48 && typeChunk[2] === 0x44 && typeChunk[3] === 0x52;
  if (!estIhdr) {
    return null;
  }
  if (octets.length < 24) {
    return null;
  }
  const largeur = lireUint32BE(octets, 16);
  const hauteur = lireUint32BE(octets, 20);
  return { largeur, hauteur };
}

function lireUint32BE(octets: Uint8Array, decalage: number): number {
  return (
    ((octets[decalage] << 24) |
      (octets[decalage + 1] << 16) |
      (octets[decalage + 2] << 8) |
      octets[decalage + 3]) >>>
    0
  );
}

// --- WebP -------------------------------------------------------------

function aLaSignatureWebp(octets: Uint8Array): boolean {
  if (octets.length < 12) {
    return false;
  }
  const estRiff = octets[0] === 0x52 && octets[1] === 0x49 && octets[2] === 0x46 && octets[3] === 0x46;
  const estWebp = octets[8] === 0x57 && octets[9] === 0x45 && octets[10] === 0x42 && octets[11] === 0x50;
  return estRiff && estWebp;
}

/**
 * RIFF (4) + taille (4) + "WEBP" (4) + fourCC de chunk (4) + taille de chunk
 * (4) + payload — trois variantes : `VP8X` (dimensions en clair), `VP8L`
 * (lossless, dimensions packées) et `VP8 ` (lossy simple, dimensions dans
 * le bitstream). Toute autre valeur de fourCC, ou un payload tronqué, rend
 * `null`.
 */
function lireDimensionsWebp(octets: Uint8Array): DimensionsImage | null {
  if (octets.length < 16) {
    return null;
  }
  const fourCc = String.fromCharCode(octets[12], octets[13], octets[14], octets[15]);
  const debutPayload = 20;

  if (fourCc === 'VP8X') {
    if (octets.length < debutPayload + 10) {
      return null;
    }
    const largeurMoins1 = octets[debutPayload + 4] | (octets[debutPayload + 5] << 8) | (octets[debutPayload + 6] << 16);
    const hauteurMoins1 = octets[debutPayload + 7] | (octets[debutPayload + 8] << 8) | (octets[debutPayload + 9] << 16);
    return { largeur: largeurMoins1 + 1, hauteur: hauteurMoins1 + 1 };
  }

  if (fourCc === 'VP8L') {
    if (octets.length < debutPayload + 5) {
      return null;
    }
    // Octet 0 du payload : signature (0x2F, non vérifiée ici). Les 4 octets
    // suivants portent, en little-endian : largeur−1 (14 bits), hauteur−1
    // (14 bits), alpha (1 bit), version (3 bits).
    const bits =
      (octets[debutPayload + 1] |
        (octets[debutPayload + 2] << 8) |
        (octets[debutPayload + 3] << 16) |
        (octets[debutPayload + 4] << 24)) >>>
      0;
    const largeurMoins1 = bits & 0x3fff;
    const hauteurMoins1 = (bits >>> 14) & 0x3fff;
    return { largeur: largeurMoins1 + 1, hauteur: hauteurMoins1 + 1 };
  }

  if (fourCc === 'VP8 ') {
    if (octets.length < debutPayload + 10) {
      return null;
    }
    // Payload : étiquette de frame (3) + code de synchronisation (3) + deux
    // champs 14 bits (largeur/hauteur), chacun sur 2 octets little-endian.
    const largeur = (octets[debutPayload + 6] | (octets[debutPayload + 7] << 8)) & 0x3fff;
    const hauteur = (octets[debutPayload + 8] | (octets[debutPayload + 9] << 8)) & 0x3fff;
    return { largeur, hauteur };
  }

  return null;
}
