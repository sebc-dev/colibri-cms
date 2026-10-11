/**
 * Change 011, ticket 11 — le récapitulatif de l'écran Publier est exact sur ses
 * cinq listes, images comprises.
 *
 * Couture : requête HTTP réelle via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale ; session, brouillons, état publié et images
 * semés directement.
 */
import { env, exports } from 'cloudflare:workers';
import { it, expect, afterEach } from 'vitest';

const NOM_COOKIE_SESSION = '__Host-session';
const PUBLIER = 'https://example.com/admin/publier';
const TABLES = [
  'sessions',
  'brouillons_emplacements',
  'brouillons_reglages',
  'brouillons_formulaires',
  'publies_emplacements',
  'medias',
];

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown> };
  run(): Promise<unknown>;
}
interface DBLike {
  prepare(query: string): InstructionLike;
}

function obtenirDB(): DBLike {
  return (env as unknown as { DB: DBLike }).DB;
}

function separerRequetes(sql: string): string[] {
  return sql
    .split('\n')
    .map((ligne) => ligne.replace(/--.*/, ''))
    .join('\n')
    .split(';')
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let schemaPret: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  const db = obtenirDB();
  schemaPret ??= (async () => {
    const modules = [
      await import('../../migrations/0003_sessions.sql?raw'),
      await import('../../migrations/0004_brouillons_emplacements.sql?raw'),
      await import('../../migrations/0005_medias_brouillon.sql?raw'),
      await import('../../migrations/0006_medias_brouillon_affichage.sql?raw'),
      await import('../../migrations/0007_brouillons_reglages.sql?raw'),
      await import('../../migrations/0008_brouillons_formulaires.sql?raw'),
      await import('../../migrations/0009_medias.sql?raw'),
      await import('../../migrations/0010_etat_publie.sql?raw'),
    ];
    for (const module of modules) {
      for (const requete of separerRequetes(module.default)) {
        try {
          await db.prepare(requete).run();
        } catch {
          // déjà appliqué : sans effet.
        }
      }
    }
    try {
      await db.prepare('alter table sessions add column dernier_usage_le integer').run();
    } catch {
      // déjà ajoutée : sans effet.
    }
  })();
  await schemaPret;
  return db;
}

afterEach(async () => {
  for (const table of TABLES) {
    try {
      await obtenirDB().prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} :`, erreur);
    }
  }
});

async function semerSession(db: DBLike): Promise<string> {
  const id = `session-recap-${crypto.randomUUID()}`;
  const maintenant = Date.now();
  await db
    .prepare('insert into sessions (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)')
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

interface OptionsImage {
  readonly nom: string;
  readonly description?: string;
  readonly publiee?: { readonly description: string | null };
}

async function semerImage(db: DBLike, id: string, options: OptionsImage): Promise<void> {
  const octets = new Uint8Array([1, 2, 3, 4]);
  await db
    .prepare(
      `insert into medias (id, nom_origine, nom_affichage, description, format, largeur, hauteur, poids_octets, octets, creee_le, publiee_le, description_publiee)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    )
    .bind(
      id,
      `${id}.png`,
      options.nom,
      options.description ?? null,
      'png',
      10,
      10,
      octets.length,
      octets,
      Date.now(),
      options.publiee ? Date.now() : null,
      options.publiee?.description ?? null,
    )
    .run();
}

async function semerBrouillonPage(db: DBLike, slug: string): Promise<void> {
  await db
    .prepare(
      "insert into brouillons_emplacements (page_slug, id_emplacement, nature, contenu, maj_le) values (?1, 'presentation', 'texte-riche', '{}', ?2)",
    )
    .bind(slug, Date.now())
    .run();
}

async function semerBrouillonFormulaire(db: DBLike, formulaire: string): Promise<void> {
  await db
    .prepare('insert into brouillons_formulaires (formulaire, contenu, maj_le) values (?1, ?2, ?3)')
    .bind(formulaire, JSON.stringify({ champs: {}, derniersNumeros: {} }), Date.now())
    .run();
}

async function semerPublieImage(db: DBLike, mediaId: string): Promise<void> {
  await db
    .prepare(
      "insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values ('accueil', 'image-hero', 'image', ?1, ?2)",
    )
    .bind(JSON.stringify({ nature: 'image', mediaId }), Date.now())
    .run();
}

async function semerBrouillonImage(db: DBLike, mediaId: string): Promise<void> {
  await db
    .prepare(
      "insert into brouillons_emplacements (page_slug, id_emplacement, nature, contenu, maj_le) values ('accueil', 'image-hero', 'image', ?1, ?2)",
    )
    .bind(JSON.stringify({ nature: 'image', mediaId }), Date.now())
    .run();
}

async function ouvrir(db: DBLike): Promise<string> {
  const cookie = await semerSession(db);
  const reponse = await exports.default.fetch(
    new Request(PUBLIER, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(reponse.status).toBe(200);
  const corps = await reponse.text();
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(corps)?.[1];
  expect(main, 'le contenu (<main>) devrait être présent').toBeDefined();
  return main ?? '';
}

function section(main: string, marque: string): string | null {
  const debut = main.indexOf(marque);
  if (debut === -1) return null;
  const fin = main.indexOf('</section>', debut);
  return fin === -1 ? main.slice(debut) : main.slice(debut, fin);
}

function sansBalises(fragment: string): string {
  let texte = '';
  let dansBalise = false;
  for (const caractere of fragment) {
    if (caractere === '<') dansBalise = true;
    else if (caractere === '>') dansBalise = false;
    else if (!dansBalise) texte += caractere;
  }
  return texte.trim();
}

function elements(contenu: string | null): string[] {
  return (contenu ?? '')
    .split('<li')
    .slice(1)
    .map((li) => li.slice(li.indexOf('>') + 1, li.indexOf('</li>')))
    .map((interieur) => sansBalises(interieur.split('<a ')[0] ?? ''));
}

it('SC-11a — pages Contact et Tarifs, formulaire Devis gâteau en brouillon, une image non posée : cinq listes exactes, rien d’autre', async () => {
  const db = await assurerSchema();
  await semerBrouillonPage(db, 'tarifs');
  await semerBrouillonPage(db, 'contact');
  await semerBrouillonFormulaire(db, 'devis-gateau');
  await semerImage(db, 'img-libre', { nom: 'Gâteau oublié' });

  const main = await ouvrir(db);

  expect(elements(section(main, 'data-recap-pages')).sort((a, b) => a.localeCompare(b))).toEqual(['Contact', 'Tarifs']);
  expect(elements(section(main, 'data-recap-formulaires'))).toEqual(['Devis gâteau']);
  expect(elements(section(main, 'data-recap-images-effacees'))).toEqual(['Gâteau oublié']);
  expect(section(main, 'data-recap-images-effacees')).toMatch(/<img[^>]*src="[^"]+"/);
  expect(section(main, 'data-recap-images-effacees')).toContain(
    'Ces images ne sont plus utilisées sur votre site. Elles seront effacées et ne pourront pas être récupérées.',
  );
  expect(main).toContain('Images qui seront définitivement effacées');
  expect(section(main, 'data-recap-reglages')).toBeNull();
  expect(section(main, 'data-recap-images-redecrites')).toBeNull();
  expect(main).not.toContain('Accueil');
  expect(main).not.toContain('Devis atelier');
});

it('SC-11b — la description modifiée d’une image publiée, sans toucher aucune page, la fait figurer parmi les redécrites', async () => {
  const db = await assurerSchema();
  await semerImage(db, 'img-redecrite', {
    nom: 'Mariage',
    description: 'Nouvelle description',
    publiee: { description: 'Ancienne description' },
  });
  await semerImage(db, 'img-inchangee', {
    nom: 'Inchangée',
    description: 'Pareil',
    publiee: { description: 'Pareil' },
  });
  await semerPublieImage(db, 'img-redecrite');
  await db
    .prepare(
      "insert into publies_emplacements (page_slug, id_emplacement, nature, contenu, publie_le) values ('accueil', 'galerie-realisations', 'galerie', ?1, ?2)",
    )
    .bind(JSON.stringify({ nature: 'galerie', mediaIds: ['img-inchangee'] }), Date.now())
    .run();

  const main = await ouvrir(db);

  expect(main).toContain('Images dont la description change');
  expect(elements(section(main, 'data-recap-images-redecrites'))).toEqual(['Mariage']);
  expect(section(main, 'data-recap-images-effacees')).toBeNull();
  expect(section(main, 'data-recap-pages')).toBeNull();
  expect(main).not.toContain('rien à publier');
});

it('SC-11c — une image publiée que le brouillon de son seul emplacement remplace figure parmi les effacées', async () => {
  const db = await assurerSchema();
  await semerImage(db, 'img-remplacee', { nom: 'Ancienne', publiee: { description: null } });
  await semerImage(db, 'img-remplacante', { nom: 'Nouvelle' });
  await semerPublieImage(db, 'img-remplacee');
  await semerBrouillonImage(db, 'img-remplacante');

  const main = await ouvrir(db);

  expect(elements(section(main, 'data-recap-images-effacees'))).toEqual(['Ancienne']);
});

it('SC-11d — une image posée seulement par la dernière version publiée d’un emplacement sans brouillon n’est pas présentée comme effacée', async () => {
  const db = await assurerSchema();
  await semerImage(db, 'img-en-ligne', { nom: 'En ligne', publiee: { description: null } });
  await semerPublieImage(db, 'img-en-ligne');

  const main = await ouvrir(db);

  expect(section(main, 'data-recap-images-effacees')).toBeNull();
  expect(main).not.toContain('En ligne');
  expect(main).toContain('rien à publier');
});

it('SC-11e — un nom d’image contenant <, >, & ou guillemets est affiché comme texte, aucun balisage interprété', async () => {
  const db = await assurerSchema();
  const nom = `<script>alert(1)</script> & "x" <b>gras</b>`;
  await semerImage(db, 'img-piege', { nom });
  await semerImage(db, 'img-piege-redecrite', {
    nom: `<i>"redécrite"</i> & co`,
    description: 'a',
    publiee: { description: 'b' },
  });
  await semerPublieImage(db, 'img-piege-redecrite');

  const main = await ouvrir(db);

  expect(main).not.toContain('<script>');
  expect(main).not.toContain('<b>gras</b>');
  expect(main).not.toContain('<i>');
  expect(main).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot; &lt;b&gt;gras&lt;/b&gt;');
  expect(main).toContain('&lt;i&gt;&quot;redécrite&quot;&lt;/i&gt; &amp; co');
});
