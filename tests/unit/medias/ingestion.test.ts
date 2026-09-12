/**
 * Ticket 01 — Reconnaître et mesurer une image à téléverser
 * (openspec/changes/004-bibliotheque-de-medias/tickets/01-reconnaitre-mesurer-image.md),
 * candidat ADR `ingestion-des-medias-liste-blanche-sur-octets`.
 *
 * Cible : `src/core/medias/ingestion.ts` — zone `core` (docs/architecture.md,
 * I1/I2) : fonction pure, zéro dépendance, ni framework ni plateforme,
 * instanciable sans D1 ni Worker (ARCH-5). Ce test n'utilise donc ni
 * `cloudflare:workers` ni `exports.default.fetch` — seule la fonction est exercée, en
 * mémoire, avec des en-têtes construits ici même (octets magiques minimaux :
 * JPEG `FF D8 FF` + segment SOF0 — collé au SOI ou précédé d'un APP0/JFIF —,
 * PNG `89 50 4E 47…` + chunk `IHDR`, WebP `RIFF…WEBP` + chunk `VP8X`, `VP8 `
 * (lossy simple, dimensions dans le bitstream, 14 bits LE) ou `VP8L`
 * (lossless, dimensions packées sur 4 octets) — les trois variantes de
 * dimensions WebP et les deux positions de SOF JPEG nommément exigées par
 * `test-plan.md` (l.51, EP par format) —, plutôt que des fichiers binaires
 * versionnés : seul l'en-tête est lu par ce ticket (aucun décodage de
 * pixels), et ces octets-là sont un jeu de fichiers réels au sens de la
 * reconnaissance de format (test-plan.md « Ingestion — format/dimensions »).
 *
 * Contrat attendu de `src/core/medias/ingestion.ts` (encore inexistant —
 * c'est ce module que ce test met en rouge) :
 * - `FichierPropose { octets: Uint8Array; nomFichier?: string; typeDeclare?: string }`
 *   — le nom et le type déclarés sont acceptés en entrée (un vrai
 *   téléversement les porte) mais SC-01c exige qu'ils ne pèsent jamais sur
 *   la décision : seuls `octets` comptent.
 * - `POIDS_MAX_OCTETS_IMAGE` — la borne de poids en octets (2 Mo), exportée
 *   pour que ce test construise ses bornes sans dupliquer la valeur.
 * - `analyserImage(fichier: FichierPropose): ResultatIngestionImage`, union
 *   `{ admise: true; format: 'jpeg' | 'png' | 'webp'; dimensions: { largeur;
 *   hauteur } }` ou `{ admise: false; motif: 'format' | 'poids' }` — totale,
 *   jamais d'exception (même principe défensif que `core/pages/declaration.ts`
 *   et `core/pages/texte-riche.ts`).
 *
 * Arbitrages tranchés par ce ticket (le ticket délègue explicitement ces deux
 * points à l'implémentation — c'est ce test qui les fixe, avant le code) :
 * - Borne de poids **inclusive** : exactement `POIDS_MAX_OCTETS_IMAGE` octets
 *   est ADMIS (seul le premier octet en trop, `+ 1`, est refusé au titre du
 *   poids). La valeur elle-même est assertée en dur (2 * 1024 * 1024) et non
 *   seulement relativement à la constante importée, pour que ce test échoue
 *   si l'implémentation choisissait une autre borne (10 Mo, 1 Ko…).
 * - Un en-tête illisible — fichier vide (0 octet) ou octets magiques présents
 *   mais segment de dimensions (SOF JPEG / IHDR PNG / VP8X WebP) tronqué —
 *   est un refus au titre du **format** (aucun motif dédié dans l'union), et
 *   jamais une exception : la fonction reste totale même sur une entrée
 *   mal formée ou coupée en cours de transfert.
 */
import { describe, it, expect } from 'vitest';
import {
  analyserImage,
  POIDS_MAX_OCTETS_IMAGE,
  type FichierPropose,
} from '../../../src/core/medias/ingestion.ts';

/** SOI + segment SOF0 minimal — assez pour lire précision/hauteur/largeur. */
function construireEnTeteJpeg(largeur: number, hauteur: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x11, // longueur du segment (17, elle-même incluse)
    0x08, // précision (8 bits)
    (hauteur >> 8) & 0xff, hauteur & 0xff,
    (largeur >> 8) & 0xff, largeur & 0xff,
    0x03, // 3 composantes
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x01,
    0x03, 0x11, 0x01,
  ]);
}

/**
 * SOI + segment APP0/JFIF + segment SOF0 — le SOF n'est plus collé au SOI :
 * test-plan.md exige explicitement un JPEG « à plusieurs segments avant le
 * SOF » (un APP0/JFIF ou EXIF réel précède quasi toujours le SOF0).
 */
function construireEnTeteJpegAvecApp0(largeur: number, hauteur: number): Uint8Array {
  const app0 = [
    0xff, 0xe0, // APP0
    0x00, 0x10, // longueur du segment (16, elle-même incluse)
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x02, // version 1.2
    0x00, // unités : aucune
    0x00, 0x01, 0x00, 0x01, // densités X/Y = 1
    0x00, 0x00, // pas de vignette
  ];
  const sof0 = [
    0xff, 0xc0, // SOF0
    0x00, 0x11, // longueur du segment (17, elle-même incluse)
    0x08, // précision (8 bits)
    (hauteur >> 8) & 0xff, hauteur & 0xff,
    (largeur >> 8) & 0xff, largeur & 0xff,
    0x03, // 3 composantes
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x01,
    0x03, 0x11, 0x01,
  ];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof0]);
}

/** Signature PNG + chunk IHDR minimal (CRC laissé à zéro : non vérifié ici). */
function construireEnTetePng(largeur: number, hauteur: number): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature PNG
    0x00, 0x00, 0x00, 0x0d, // longueur du chunk IHDR (13)
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    (largeur >>> 24) & 0xff, (largeur >>> 16) & 0xff, (largeur >>> 8) & 0xff, largeur & 0xff,
    (hauteur >>> 24) & 0xff, (hauteur >>> 16) & 0xff, (hauteur >>> 8) & 0xff, hauteur & 0xff,
    0x08, // profondeur de bits
    0x06, // type de couleur (RGBA)
    0x00, // méthode de compression
    0x00, // méthode de filtre
    0x00, // entrelacement
    0x00, 0x00, 0x00, 0x00, // CRC (non vérifié par ce module)
  ]);
}

/** RIFF…WEBP + chunk VP8X — dimensions stockées en clair (largeur/hauteur − 1, LE, 24 bits). */
function construireEnTeteWebp(largeur: number, hauteur: number): Uint8Array {
  const largeurMoins1 = largeur - 1;
  const hauteurMoins1 = hauteur - 1;
  const payloadVp8x = [
    0x00, // drapeaux (aucune fonctionnalité étendue)
    0x00, 0x00, 0x00, // réservé
    largeurMoins1 & 0xff, (largeurMoins1 >> 8) & 0xff, (largeurMoins1 >> 16) & 0xff,
    hauteurMoins1 & 0xff, (hauteurMoins1 >> 8) & 0xff, (hauteurMoins1 >> 16) & 0xff,
  ];
  const taillePayload = payloadVp8x.length; // 10
  const taillePayloadRiff = 4 + 4 + 4 + taillePayload; // "WEBP" + "VP8X" + taille chunk + payload
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    taillePayloadRiff & 0xff, (taillePayloadRiff >> 8) & 0xff, (taillePayloadRiff >> 16) & 0xff, (taillePayloadRiff >> 24) & 0xff,
    0x57, 0x45, 0x42, 0x50, // "WEBP"
    0x56, 0x50, 0x38, 0x58, // "VP8X"
    taillePayload & 0xff, (taillePayload >> 8) & 0xff, (taillePayload >> 16) & 0xff, (taillePayload >> 24) & 0xff,
    ...payloadVp8x,
  ]);
}

/**
 * RIFF…WEBP + chunk `VP8 ` (lossy simple) — dimensions dans le bitstream :
 * étiquette de frame (3 octets) + code de synchronisation `9d 01 2a` + deux
 * champs de 14 bits (largeur/hauteur) sur 2 octets little-endian chacun.
 */
function construireEnTeteWebpVp8(largeur: number, hauteur: number): Uint8Array {
  const largeurCode = largeur & 0x3fff; // 14 bits, 2 bits d'échelle à 0
  const hauteurCode = hauteur & 0x3fff;
  const payloadVp8 = [
    0x30, 0x00, 0x00, // étiquette de frame (frame clé, taille de partition non vérifiée ici)
    0x9d, 0x01, 0x2a, // code de synchronisation VP8
    largeurCode & 0xff, (largeurCode >> 8) & 0xff,
    hauteurCode & 0xff, (hauteurCode >> 8) & 0xff,
  ];
  const taillePayloadRiff = 4 + 4 + 4 + payloadVp8.length; // "WEBP" + "VP8 " + taille chunk + payload
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    taillePayloadRiff & 0xff, (taillePayloadRiff >> 8) & 0xff, (taillePayloadRiff >> 16) & 0xff, (taillePayloadRiff >> 24) & 0xff,
    0x57, 0x45, 0x42, 0x50, // "WEBP"
    0x56, 0x50, 0x38, 0x20, // "VP8 "
    payloadVp8.length & 0xff, (payloadVp8.length >> 8) & 0xff, (payloadVp8.length >> 16) & 0xff, (payloadVp8.length >> 24) & 0xff,
    ...payloadVp8,
  ]);
}

/**
 * RIFF…WEBP + chunk `VP8L` (lossless) — signature `2F` puis 4 octets
 * contenant, en little-endian 32 bits : largeur−1 (14 bits), hauteur−1
 * (14 bits), alpha (1 bit), version (3 bits). Le payload étant de taille
 * impaire (5 octets), un octet de bourrage RIFF est ajouté après.
 */
function construireEnTeteWebpVp8L(largeur: number, hauteur: number): Uint8Array {
  const largeurMoins1 = largeur - 1;
  const hauteurMoins1 = hauteur - 1;
  const bits = (largeurMoins1 & 0x3fff) | ((hauteurMoins1 & 0x3fff) << 14);
  const payloadVp8l = [
    0x2f, // signature VP8L
    bits & 0xff, (bits >>> 8) & 0xff, (bits >>> 16) & 0xff, (bits >>> 24) & 0xff,
  ];
  const bourrage = payloadVp8l.length % 2 === 0 ? [] : [0x00];
  const taillePayloadRiff = 4 + 4 + 4 + payloadVp8l.length + bourrage.length; // "WEBP" + "VP8L" + taille chunk + payload (+ bourrage)
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    taillePayloadRiff & 0xff, (taillePayloadRiff >> 8) & 0xff, (taillePayloadRiff >> 16) & 0xff, (taillePayloadRiff >> 24) & 0xff,
    0x57, 0x45, 0x42, 0x50, // "WEBP"
    0x56, 0x50, 0x38, 0x4c, // "VP8L"
    payloadVp8l.length & 0xff, (payloadVp8l.length >> 8) & 0xff, (payloadVp8l.length >> 16) & 0xff, (payloadVp8l.length >> 24) & 0xff,
    ...payloadVp8l,
    ...bourrage,
  ]);
}

/** Complète `octets` par des zéros jusqu'à `tailleTotale` (simule le poids d'un fichier réel). */
function completerJusquA(octets: Uint8Array, tailleTotale: number): Uint8Array {
  const resultat = new Uint8Array(tailleTotale);
  resultat.set(octets, 0);
  return resultat;
}

/** Coupe `octets` à `longueur` — simule un transfert interrompu (en-tête tronqué). */
function tronquer(octets: Uint8Array, longueur: number): Uint8Array {
  return octets.slice(0, longueur);
}

const OCTETS_SVG = new TextEncoder().encode(
  '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
);
const OCTETS_GIF = new TextEncoder().encode('GIF89a');

describe('SC-01a — un JPEG, un PNG ou un WebP est reconnu, admis, typé et mesuré', () => {
  it('SC-01a — un JPEG est admis, typé "jpeg", dimensions lues à l’en-tête', () => {
    const fichier: FichierPropose = { octets: construireEnTeteJpeg(100, 50) };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'jpeg',
      dimensions: { largeur: 100, hauteur: 50 },
    });
  });

  it('SC-01a — un PNG est admis, typé "png", dimensions lues à l’en-tête', () => {
    const fichier: FichierPropose = { octets: construireEnTetePng(200, 80) };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'png',
      dimensions: { largeur: 200, hauteur: 80 },
    });
  });

  it('SC-01a — un WebP (chunk VP8X) est admis, typé "webp", dimensions lues à l’en-tête', () => {
    const fichier: FichierPropose = { octets: construireEnTeteWebp(64, 32) };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'webp',
      dimensions: { largeur: 64, hauteur: 32 },
    });
  });

  it('SC-01a — un JPEG avec un segment APP0/JFIF avant le SOF0 (plusieurs segments avant le SOF) est admis, typé "jpeg", dimensions lues à l’en-tête', () => {
    const fichier: FichierPropose = { octets: construireEnTeteJpegAvecApp0(120, 60) };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'jpeg',
      dimensions: { largeur: 120, hauteur: 60 },
    });
  });

  it('SC-01a — un WebP lossy simple (chunk `VP8 `, dimensions dans le bitstream) est admis, typé "webp", dimensions lues à l’en-tête', () => {
    const fichier: FichierPropose = { octets: construireEnTeteWebpVp8(64, 32) };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'webp',
      dimensions: { largeur: 64, hauteur: 32 },
    });
  });

  it('SC-01a — un WebP lossless (chunk VP8L, dimensions packées) est admis, typé "webp", dimensions lues à l’en-tête', () => {
    const fichier: FichierPropose = { octets: construireEnTeteWebpVp8L(64, 32) };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'webp',
      dimensions: { largeur: 64, hauteur: 32 },
    });
  });
});

describe('SC-01b — un SVG ou tout format hors liste est refusé au titre du format', () => {
  it('SC-01b — un SVG est refusé au titre du format', () => {
    const fichier: FichierPropose = { octets: OCTETS_SVG };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({ admise: false, motif: 'format' });
  });

  it('SC-01b — un format hors liste (GIF) est refusé au titre du format', () => {
    const fichier: FichierPropose = { octets: OCTETS_GIF };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({ admise: false, motif: 'format' });
  });

  it('SC-01b — un fichier vide (0 octet) est refusé au titre du format, sans jamais lever d’exception', () => {
    const fichier: FichierPropose = { octets: new Uint8Array(0) };

    expect(() => analyserImage(fichier)).not.toThrow();
    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({ admise: false, motif: 'format' });
  });

  it('SC-01b — un en-tête JPEG tronqué (SOF présent, dimensions coupées) est refusé au titre du format, sans exception', () => {
    // SOI + marqueur SOF0 présents, mais longueur/précision/dimensions absentes.
    const octets = tronquer(construireEnTeteJpeg(100, 50), 4);
    const fichier: FichierPropose = { octets };

    expect(() => analyserImage(fichier)).not.toThrow();
    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({ admise: false, motif: 'format' });
  });

  it('SC-01b — un en-tête PNG tronqué (chunk IHDR annoncé, dimensions coupées) est refusé au titre du format, sans exception', () => {
    // Signature PNG (8) + longueur de chunk (4) + "IHDR" (4) présents, largeur/hauteur absentes.
    const octets = tronquer(construireEnTetePng(200, 80), 16);
    const fichier: FichierPropose = { octets };

    expect(() => analyserImage(fichier)).not.toThrow();
    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({ admise: false, motif: 'format' });
  });

  it('SC-01b — un en-tête WebP tronqué (chunk VP8X annoncé, dimensions coupées) est refusé au titre du format, sans exception', () => {
    // "RIFF" + taille (4) + "WEBP" (4) + "VP8X" (4) présents, taille de chunk et payload absents.
    const octets = tronquer(construireEnTeteWebp(64, 32), 16);
    const fichier: FichierPropose = { octets };

    expect(() => analyserImage(fichier)).not.toThrow();
    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({ admise: false, motif: 'format' });
  });
});

describe('SC-01c — seuls les octets décident, jamais l’extension ni le type déclaré', () => {
  it('SC-01c — un SVG déclaré comme JPEG (nom et type) reste refusé au titre du format', () => {
    const fichier: FichierPropose = {
      octets: OCTETS_SVG,
      nomFichier: 'photo.jpg',
      typeDeclare: 'image/jpeg',
    };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({ admise: false, motif: 'format' });
  });

  it('SC-01c — un PNG déclaré comme SVG (nom et type) reste admis et typé "png"', () => {
    const fichier: FichierPropose = {
      octets: construireEnTetePng(10, 10),
      nomFichier: 'notice.svg',
      typeDeclare: 'image/svg+xml',
    };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'png',
      dimensions: { largeur: 10, hauteur: 10 },
    });
  });
});

describe('SC-01d — un fichier de plus de 2 Mo est refusé au titre du poids', () => {
  it('SC-01d — la borne de poids vaut exactement 2 Mo (2 * 1024 * 1024 octets, valeur littérale)', () => {
    // Assertion sur la valeur littérale, pas seulement relative à elle-même :
    // une implémentation qui fixerait la borne à 10 Mo ou 1 Ko doit faire
    // échouer CE test précis, indépendamment des tests de bornes ci-dessous.
    expect(POIDS_MAX_OCTETS_IMAGE).toBe(2 * 1024 * 1024);
  });

  it('SC-01d — un en-tête valide porté par un fichier d’exactement 2 Mo est admis (borne inclusive, arbitrage tranché par ce ticket)', () => {
    const octets = completerJusquA(construireEnTeteJpeg(100, 50), POIDS_MAX_OCTETS_IMAGE);
    const fichier: FichierPropose = { octets };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'jpeg',
      dimensions: { largeur: 100, hauteur: 50 },
    });
  });

  it('SC-01d — un en-tête valide porté par un fichier de 2 Mo + 1 octet est refusé au titre du poids', () => {
    const octets = completerJusquA(construireEnTeteJpeg(100, 50), POIDS_MAX_OCTETS_IMAGE + 1);
    const fichier: FichierPropose = { octets };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({ admise: false, motif: 'poids' });
  });

  it('SC-01d — un en-tête valide porté par un fichier de 2 Mo − 1 octet n’est pas refusé au titre du poids', () => {
    const octets = completerJusquA(construireEnTeteJpeg(100, 50), POIDS_MAX_OCTETS_IMAGE - 1);
    const fichier: FichierPropose = { octets };

    const resultat = analyserImage(fichier);

    expect(resultat).toEqual({
      admise: true,
      format: 'jpeg',
      dimensions: { largeur: 100, hauteur: 50 },
    });
  });
});
