/**
 * La sérialisation d'un emplacement de texte riche — ticket 06
 * (openspec/changes/003-remplir-emplacements/tickets/06-corriger-texte-riche.md),
 * ADR-0012.
 *
 * Zone `core` (docs/architecture.md, I1/I2) : fonction pure, zéro dépendance,
 * ni framework ni plateforme — instanciable sans D1 ni Worker (ARCH-5). Même
 * patron de tête de fichier que `src/core/pages/lien-video.ts`.
 *
 * `NoeudDocument` reprend, volontairement, le vocabulaire du document JSON que
 * l'éditeur TipTap produit (`editor.getJSON()`) et consomme (`content: …` à
 * la construction) — TipTap vit dans l'îlot `admin/ilots-svelte-5/
 * TexteRiche.svelte`, jamais ici : ce module ne connaît TipTap d'aucune
 * façon, seule la FORME de son JSON (déjà un simple arbre de nœuds et de
 * marques) est reprise, pour que l'îlot n'ait besoin d'aucune traduction
 * supplémentaire entre ce qu'il obtient de l'éditeur et ce qu'il poste.
 *
 * SC-06a/b — seules cinq marques survivent à la sérialisation en Markdown
 * restreint : gras (`bold`), italique (`italic`), lien (`link`), liste
 * (`bulletList`) et titre (`heading`). Toute marque ou tout nœud hors de
 * cette liste est écarté à la sérialisation — jamais rendu par une
 * exception : le texte qu'il portait survit, seule sa mise en forme
 * disparaît (même principe défensif que `core/pages/declaration.ts` face à
 * une forme invalide).
 *
 * SC-06c — un lien dont le schéma n'appartient pas à la liste blanche
 * (`https`, `mailto`, `tel`, chemin relatif) est rejeté à la sérialisation :
 * le texte du lien survit, seule la marque `lien` disparaît. Même logique de
 * liste blanche que `core/pages/lien-video.ts` (ticket 05) — jamais une
 * heuristique.
 *
 * `analyserMarkdownRestreint` fait le chemin inverse (Markdown restreint →
 * document), pour que l'îlot initialise l'éditeur avec le brouillon ou le
 * contenu déclaré déjà en place (ADR-0012) — c'est elle qui rend l'aller-
 * retour de SC-06a vérifiable : sérialiser un document, l'analyser, le
 * resérialiser doit rendre le même Markdown pour une marque retenue.
 */

/** Une marque inline portée par un nœud de texte (gras, italique, lien…). */
export interface Marque {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
}

/** Un nœud du document (bloc ou texte), à la forme du JSON TipTap/ProseMirror. */
export interface NoeudDocument {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly NoeudDocument[];
  readonly marks?: readonly Marque[];
  readonly text?: string;
}

/** Les seules marques inline retenues (SC-06a/b) — tout le reste est écarté. */
const MARQUES_INLINE_RETENUES: ReadonlySet<string> = new Set(['bold', 'italic', 'link']);

/** Les seuls nœuds de bloc retenus (SC-06a/b) — tout le reste est traité comme un paragraphe. */
const NOEUDS_BLOC_RETENUS: ReadonlySet<string> = new Set(['paragraph', 'heading', 'bulletList']);

const SCHEMAS_LIEN_AUTORISES: ReadonlySet<string> = new Set(['https:', 'mailto:', 'tel:']);

/**
 * SC-06c — un lien est autorisé s'il est un chemin relatif (commence par
 * `/`) ou si son schéma appartient à la liste blanche (`https`, `mailto`,
 * `tel`) — même geste que `destinationBoutonAutorisee`
 * (`core/pages/brouillon.ts`, ticket 04), repris ici pour que la validation
 * du lien de texte riche vive en un seul lieu, ce module.
 */
export function lienDeTexteRicheAutorise(lien: string): boolean {
  if (lien.startsWith('/')) return true;
  try {
    return SCHEMAS_LIEN_AUTORISES.has(new URL(lien).protocol);
  } catch {
    return false;
  }
}

function echapperTexte(texte: string): string {
  return texte.replace(/[\\*_[\]]/g, (caractere) => `\\${caractere}`);
}

function desechapperTexte(texte: string): string {
  return texte.replace(/\\([\\*_[\]])/g, '$1');
}

/**
 * Sérialise un nœud de texte selon ses marques retenues (SC-06a/b/c) — les
 * marques hors liste sont ignorées ; un lien dont le schéma n'est pas
 * autorisé est ignoré (le texte survit, jamais rendu par une exception).
 */
function serialiserNoeudTexte(noeud: NoeudDocument): string {
  const texte = echapperTexte(noeud.text ?? '');
  const marques = noeud.marks?.filter((marque) => MARQUES_INLINE_RETENUES.has(marque.type)) ?? [];

  let rendu = texte;
  if (marques.some((marque) => marque.type === 'italic')) {
    rendu = `_${rendu}_`;
  }
  if (marques.some((marque) => marque.type === 'bold')) {
    rendu = `**${rendu}**`;
  }
  const lien = marques.find((marque) => marque.type === 'link');
  const href = lien?.attrs?.href;
  if (lien && typeof href === 'string' && lienDeTexteRicheAutorise(href)) {
    rendu = `[${rendu}](${href})`;
  }
  return rendu;
}

function serialiserInline(noeuds: readonly NoeudDocument[] | undefined): string {
  if (!noeuds) return '';
  return noeuds.map((noeud) => (noeud.type === 'text' ? serialiserNoeudTexte(noeud) : '')).join('');
}

/**
 * Récupère, récursivement, l'ensemble du texte inline porté par un nœud
 * (utilisé pour un nœud de bloc hors liste, SC-06b : sa mise en forme de
 * structure disparaît, son texte survit dans un simple paragraphe).
 */
function aplatirEnInline(noeud: NoeudDocument): NoeudDocument[] {
  if (noeud.type === 'text') return [noeud];
  return (noeud.content ?? []).flatMap((enfant) => aplatirEnInline(enfant));
}

function serialiserBloc(noeud: NoeudDocument): string {
  if (!NOEUDS_BLOC_RETENUS.has(noeud.type)) {
    return serialiserInline(aplatirEnInline(noeud));
  }

  if (noeud.type === 'heading') {
    const niveauBrut = noeud.attrs?.level;
    const niveau = typeof niveauBrut === 'number' ? Math.min(Math.max(Math.trunc(niveauBrut), 1), 6) : 1;
    return `${'#'.repeat(niveau)} ${serialiserInline(noeud.content)}`;
  }

  if (noeud.type === 'bulletList') {
    return (noeud.content ?? [])
      .map((item) => `- ${serialiserInline(aplatirEnInline(item))}`)
      .join('\n');
  }

  return serialiserInline(noeud.content);
}

/**
 * SC-06a/b/c — sérialise un document en Markdown restreint : seules les
 * marques gras/italique/lien et les blocs titre/liste survivent, un lien
 * hors liste blanche de schémas est rejeté (marque disparue, texte
 * conservé). Fonction pure et totale : jamais d'exception, un document mal
 * formé rend au pire une chaîne vide (même principe défensif que
 * `core/pages/declaration.ts`).
 */
export function serialiserMarkdownRestreint(document: NoeudDocument): string {
  const blocs = document.content ?? [];
  return blocs
    .map((bloc) => serialiserBloc(bloc))
    .filter((bloc) => bloc.length > 0)
    .join('\n\n');
}

interface JetonInline {
  readonly debut: number;
  readonly fin: number;
  readonly type: 'lien' | 'gras' | 'italique';
  readonly correspondance: RegExpExecArray;
}

// Le libellé accepte tout sauf un crochet nu, mais bien une séquence échappée
// (`\[`, `\]`) : c'est ce que `echapperTexte` produit. Les deux branches de
// l'alternance sont disjointes — l'une exclut l'antislash, l'autre commence par
// lui —, donc le parcours reste LINÉAIRE. La forme gloutonne `[^\]]*` mesurait
// 5,2 s sur 80 000 crochets ouvrants (quadratique) contre 0,5 ms ici.
const MOTIF_LIEN = /\[((?:[^[\]\\]|\\.)*)\]\(([^()]*)\)/g;
const MOTIF_GRAS = /\*\*([^*]+)\*\*/g;
const MOTIF_ITALIQUE = /_([^_]+)_/g;

function prochainJeton(texte: string, depuis: number): JetonInline | null {
  const candidats: JetonInline[] = [];
  for (const [motif, type] of [
    [MOTIF_LIEN, 'lien'],
    [MOTIF_GRAS, 'gras'],
    [MOTIF_ITALIQUE, 'italique'],
  ] as const) {
    motif.lastIndex = depuis;
    const correspondance = motif.exec(texte);
    if (correspondance) {
      candidats.push({ debut: correspondance.index, fin: motif.lastIndex, type, correspondance });
    }
  }
  if (candidats.length === 0) return null;
  return candidats.reduce((meilleur, candidat) => (candidat.debut < meilleur.debut ? candidat : meilleur));
}

function ajouterMarque(noeuds: readonly NoeudDocument[], marque: Marque): NoeudDocument[] {
  return noeuds.map((noeud) => ({ ...noeud, marks: [...(noeud.marks ?? []), marque] }));
}

/**
 * Analyse une portion de texte inline en une suite de nœuds `text`, chacun
 * portant les marques retenues qui s'y appliquent (chemin inverse de
 * `serialiserInline`) — utilisée pour reconstruire le document initial de
 * l'éditeur depuis le Markdown restreint déjà persisté (ou déclaré).
 */
function analyserInline(texte: string): NoeudDocument[] {
  const jeton = prochainJeton(texte, 0);
  if (!jeton) {
    return texte.length > 0 ? [{ type: 'text', text: desechapperTexte(texte) }] : [];
  }

  const avant = texte.slice(0, jeton.debut);
  const apres = texte.slice(jeton.fin);
  const noeudsAvant = avant.length > 0 ? [{ type: 'text', text: desechapperTexte(avant) }] : [];

  let noeudsJeton: NoeudDocument[];
  if (jeton.type === 'lien') {
    const [, libelle, href] = jeton.correspondance;
    const noeudsLibelle = analyserInline(libelle ?? '');
    noeudsJeton =
      href !== undefined && lienDeTexteRicheAutorise(href)
        ? ajouterMarque(noeudsLibelle, { type: 'link', attrs: { href } })
        : noeudsLibelle;
  } else if (jeton.type === 'gras') {
    noeudsJeton = ajouterMarque(analyserInline(jeton.correspondance[1] ?? ''), { type: 'bold' });
  } else {
    noeudsJeton = ajouterMarque(analyserInline(jeton.correspondance[1] ?? ''), { type: 'italic' });
  }

  return [...noeudsAvant, ...noeudsJeton, ...analyserInline(apres)];
}

const MOTIF_TITRE = /^(#{1,6}) (.*)$/;

function analyserBloc(bloc: string): NoeudDocument {
  const lignes = bloc.split('\n');

  if (lignes.length === 1) {
    const correspondanceTitre = MOTIF_TITRE.exec(lignes[0] ?? '');
    if (correspondanceTitre) {
      return {
        type: 'heading',
        attrs: { level: correspondanceTitre[1]!.length },
        content: analyserInline(correspondanceTitre[2] ?? ''),
      };
    }
  }

  if (lignes.every((ligne) => ligne.startsWith('- '))) {
    return {
      type: 'bulletList',
      content: lignes.map((ligne) => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: analyserInline(ligne.slice(2)) }],
      })),
    };
  }

  return { type: 'paragraph', content: analyserInline(lignes.join(' ')) };
}

/**
 * SC-06a — chemin inverse de `serialiserMarkdownRestreint` : reconstruit un
 * document depuis du Markdown restreint. Un texte vide rend un document
 * portant un unique paragraphe vide (la forme minimale que TipTap accepte en
 * `content`), jamais `undefined` ni une exception.
 */
export function analyserMarkdownRestreint(markdown: string): NoeudDocument {
  const blocs = markdown
    .split(/\n{2,}/)
    .map((bloc) => bloc.trim())
    .filter((bloc) => bloc.length > 0);

  if (blocs.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
  }

  return { type: 'doc', content: blocs.map((bloc) => analyserBloc(bloc)) };
}
