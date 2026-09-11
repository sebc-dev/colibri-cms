/**
 * Ticket 06 — Corriger un emplacement de texte riche
 * (openspec/changes/003-remplir-emplacements/tickets/06-corriger-texte-riche.md).
 *
 * Couture retenue, même patron que `regler-lien-video.test.ts` (ticket 05) :
 * - SC-06a/b/c sont purement `core/` (`serialiserMarkdownRestreint`/
 *   `analyserMarkdownRestreint`, `src/core/pages/texte-riche.ts`) :
 *   instanciables sans D1 ni Worker (ARCH-5), exercées ici directement, sans
 *   requête.
 * - SC-06e passe par la couture HTTP réelle (`SELF.fetch` contre le worker
 *   compilé, dans `workerd`, contre la vraie D1 locale, ADR-0003) — les
 *   migrations `0003_sessions.sql` et `0004_brouillons_emplacements.sql` sont
 *   rejouées ici même, une session valide est semée directement.
 *   `content/pages/accueil/page.json` porte déjà, à l'emplacement
 *   `presentation`, l'unique fixture de texte riche du dépôt (contenu initial
 *   dans `content/pages/accueil/presentation.md`).
 * - SC-06d/f portent sur un état qui ne s'observe qu'en exécutant TipTap au
 *   navigateur — aucune infrastructure de test de composant Svelte ni
 *   Playwright n'existe encore dans ce dépôt (docs/test.md), et le ticket lui
 *   même l'annonce (« se vérifient sur le HTML servi… pas à l'écran »). Ils
 *   se vérifient donc, comme `regler-lien-video.test.ts` le fait déjà pour
 *   SC-05d/e, en inspectant la SOURCE de l'îlot (`?raw`, Vite) — la présence
 *   des commandes de mise en forme et l'absence de toute saisie de balise
 *   (SC-06d), combinées à la preuve HTTP que l'`Écran : Éditeur de page`
 *   monte bien ce champ sur l'emplacement de texte riche — et l'absence de
 *   tout terme de développeur dans le texte réellement visible (SC-06f).
 */
/// <reference types="@cloudflare/vitest-plugin/types" />
import { SELF, env } from 'cloudflare:test';
import { it, expect, afterEach, describe } from 'vitest';
import {
  serialiserMarkdownRestreint,
  analyserMarkdownRestreint,
  type NoeudDocument,
} from '../../src/core/pages/texte-riche.ts';

const NOM_COOKIE_SESSION = '__Host-session';
const TABLE_SESSIONS = 'sessions';
const TABLE_BROUILLONS = 'brouillons_emplacements';
const ROUTE_ACCUEIL_TEXTE_RICHE = 'https://example.com/admin/pages/accueil/emplacements/presentation';
const ROUTE_MES_PAGES = 'https://example.com/admin/mes-pages';
const ROUTE_EDITEUR_ACCUEIL = 'https://example.com/admin/pages/accueil';

interface InstructionLike {
  bind(...valeurs: unknown[]): { run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> };
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
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
  if (!schemaPret) {
    schemaPret = (async () => {
      const sessions = await import('../../migrations/0003_sessions.sql?raw');
      for (const requete of separerRequetes(sessions.default)) {
        await db.prepare(requete).run();
      }
      try {
        await db.prepare(`alter table ${TABLE_SESSIONS} add column dernier_usage_le integer`).run();
      } catch {
        // déjà ajoutée (rejeu au sein du même run de fichier) : sans effet.
      }
      const brouillons = await import('../../migrations/0004_brouillons_emplacements.sql?raw');
      for (const requete of separerRequetes(brouillons.default)) {
        await db.prepare(requete).run();
      }
    })();
  }
  await schemaPret;
  return db;
}

afterEach(async () => {
  const db = obtenirDB();
  for (const table of [TABLE_SESSIONS, TABLE_BROUILLONS]) {
    try {
      await db.prepare(`delete from ${table}`).run();
    } catch (erreur) {
      console.warn(`nettoyage D1 ignoré pour ${table} (schéma absent) :`, erreur);
    }
  }
});

async function semerSessionValide(db: DBLike): Promise<string> {
  const id = `session-texte-riche-${Math.random().toString(36).slice(2)}`;
  const maintenant = Date.now();
  await db
    .prepare(
      `insert into ${TABLE_SESSIONS} (id, identifiant_appareil, creee_le, dernier_usage_le) values (?1, ?2, ?3, ?4)`,
    )
    .bind(id, 'appareil-de-test', maintenant, maintenant)
    .run();
  return id;
}

async function corrigerLeTexte(cookieSession: string | null, document: NoeudDocument): Promise<Response> {
  return SELF.fetch(ROUTE_ACCUEIL_TEXTE_RICHE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookieSession ? { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` } : {}),
    },
    body: JSON.stringify({ document }),
  });
}

function texte(contenu: string, marks?: readonly { readonly type: string; readonly attrs?: Record<string, unknown> }[]): NoeudDocument {
  return marks ? { type: 'text', text: contenu, marks } : { type: 'text', text: contenu };
}

// --- SC-06a — l'aller-retour de sérialisation d'une marque retenue (gras,
// italique, lien, liste, titre) préserve la marque ---

describe('SC-06a — l’aller-retour de sérialisation d’une marque retenue préserve la marque', () => {
  it('SC-06a — le gras survit à un aller (sérialisation) puis un retour (analyse, resérialisation)', () => {
    // Arrange
    const document: NoeudDocument = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [texte('Bonjour', [{ type: 'bold' }])] }],
    };

    // Act
    const markdown = serialiserMarkdownRestreint(document);
    const reanalyse = analyserMarkdownRestreint(markdown);
    const reserialise = serialiserMarkdownRestreint(reanalyse);

    // Assert
    expect(markdown).toBe('**Bonjour**');
    expect(reserialise).toBe(markdown);
  });

  it('SC-06a — l’italique survit à un aller (sérialisation) puis un retour (analyse, resérialisation)', () => {
    // Arrange
    const document: NoeudDocument = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [texte('Bonjour', [{ type: 'italic' }])] }],
    };

    // Act
    const markdown = serialiserMarkdownRestreint(document);
    const reserialise = serialiserMarkdownRestreint(analyserMarkdownRestreint(markdown));

    // Assert
    expect(markdown).toBe('_Bonjour_');
    expect(reserialise).toBe(markdown);
  });

  it('SC-06a — un lien vers un schéma autorisé survit à un aller (sérialisation) puis un retour', () => {
    // Arrange
    const document: NoeudDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [texte('la page de contact', [{ type: 'link', attrs: { href: 'https://exemple.test/contact' } }])],
        },
      ],
    };

    // Act
    const markdown = serialiserMarkdownRestreint(document);
    const reserialise = serialiserMarkdownRestreint(analyserMarkdownRestreint(markdown));

    // Assert
    expect(markdown).toBe('[la page de contact](https://exemple.test/contact)');
    expect(reserialise).toBe(markdown);
  });

  it('SC-06a — un lien dont le libellé porte un crochet survit à un aller puis un retour', () => {
    // Arrange — `echapperTexte` rend tout crochet du libellé sous forme échappée
    // (`\[`, `\]`) ; le motif d'analyse doit savoir les relire, sinon le lien
    // se perd au retour alors qu'il s'est sérialisé sans erreur.
    const document: NoeudDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [texte('nos tarifs [2026]', [{ type: 'link', attrs: { href: 'https://exemple.test/tarifs' } }])],
        },
      ],
    };

    // Act
    const markdown = serialiserMarkdownRestreint(document);
    const reserialise = serialiserMarkdownRestreint(analyserMarkdownRestreint(markdown));

    // Assert
    expect(markdown).toBe('[nos tarifs \\[2026\\]](https://exemple.test/tarifs)');
    expect(reserialise).toBe(markdown);
  });

  it('SC-06a — une liste survit à un aller (sérialisation) puis un retour', () => {
    // Arrange
    const document: NoeudDocument = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [texte('Un gâteau')] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [texte('Deux gâteaux')] }] },
          ],
        },
      ],
    };

    // Act
    const markdown = serialiserMarkdownRestreint(document);
    const reserialise = serialiserMarkdownRestreint(analyserMarkdownRestreint(markdown));

    // Assert
    expect(markdown).toBe('- Un gâteau\n- Deux gâteaux');
    expect(reserialise).toBe(markdown);
  });

  it('SC-06a — un titre survit à un aller (sérialisation) puis un retour', () => {
    // Arrange
    const document: NoeudDocument = {
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 2 }, content: [texte('Nos gâteaux')] }],
    };

    // Act
    const markdown = serialiserMarkdownRestreint(document);
    const reserialise = serialiserMarkdownRestreint(analyserMarkdownRestreint(markdown));

    // Assert
    expect(markdown).toBe('## Nos gâteaux');
    expect(reserialise).toBe(markdown);
  });
});

// --- SC-06b — une marque hors de la liste retenue est écartée à la
// sérialisation ---

it('SC-06b — une marque hors de la liste retenue (barré) est écartée à la sérialisation, le texte survit', () => {
  // Arrange : « barré » (`strike`) n'appartient pas à la liste des marques
  // retenues (gras, italique, lien) — voir `MARQUES_INLINE_RETENUES`.
  const document: NoeudDocument = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [texte('Ancien prix', [{ type: 'strike' }])] }],
  };

  // Act
  const markdown = serialiserMarkdownRestreint(document);

  // Assert : le texte survit, sans aucune marque (ni `~~`, ni tout autre
  // gabarit qui rendrait la marque écartée).
  expect(markdown).toBe('Ancien prix');
});

it('SC-06b — un nœud de bloc hors de la liste retenue (citation) est écarté à la sérialisation, son texte survit dans un simple paragraphe', () => {
  // Arrange : `blockquote` n'appartient pas à la liste des nœuds de bloc
  // retenus (paragraphe, titre, liste) — voir `NOEUDS_BLOC_RETENUS`.
  const document: NoeudDocument = {
    type: 'doc',
    content: [{ type: 'blockquote', content: [{ type: 'paragraph', content: [texte('Une citation')] }] }],
  };

  // Act
  const markdown = serialiserMarkdownRestreint(document);

  // Assert : le texte survit tel quel, sans aucun marqueur de citation (`>`).
  expect(markdown).toBe('Une citation');
});

// --- SC-06c — un lien vers un schéma d'URL non autorisé est rejeté ---

describe('SC-06c — un lien vers un schéma d’URL non autorisé est rejeté', () => {
  it('SC-06c — un lien `javascript:` est rejeté à la sérialisation, le texte du lien survit sans la marque', () => {
    // Arrange
    const document: NoeudDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [texte('cliquez ici', [{ type: 'link', attrs: { href: "javascript:alert('x')" } }])],
        },
      ],
    };

    // Act
    const markdown = serialiserMarkdownRestreint(document);

    // Assert : ni crochets, ni parenthèses — seul le texte du lien survit.
    expect(markdown).toBe('cliquez ici');
  });

  it('SC-06c — un lien `ftp:` est rejeté à la sérialisation, le texte du lien survit sans la marque', () => {
    // Arrange
    const document: NoeudDocument = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [texte('le fichier', [{ type: 'link', attrs: { href: 'ftp://exemple.test/fichier' } }])] },
      ],
    };

    // Act
    const markdown = serialiserMarkdownRestreint(document);

    // Assert
    expect(markdown).toBe('le fichier');
  });

  it('SC-06c — un chemin relatif et les schémas `https`, `mailto`, `tel` restent, eux, autorisés', () => {
    // Arrange / Act / Assert : contre-exemple positif, pour que le test
    // ci-dessus ne passe pas simplement parce que TOUT lien serait rejeté.
    const cas: readonly [string, string][] = [
      ['/contact', '[texte](/contact)'],
      ['https://exemple.test', '[texte](https://exemple.test)'],
      ['mailto:contact@exemple.test', '[texte](mailto:contact@exemple.test)'],
      ['tel:+33100000000', '[texte](tel:+33100000000)'],
    ];
    for (const [href, attendu] of cas) {
      const document: NoeudDocument = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [texte('texte', [{ type: 'link', attrs: { href } }])] }],
      };
      expect(serialiserMarkdownRestreint(document)).toBe(attendu);
    }
  });
});

// --- SC-06d — la barre de mise en forme pose gras, italique, lien, liste et
// titre sans que l'éditrice écrive de balise ---

describe('SC-06d — la barre de mise en forme pose gras, italique, lien, liste et titre sans écrire de balise', () => {
  it('SC-06d — l’`Écran : Éditeur de page` monte le point d’édition sur l’emplacement de texte riche « presentation »', async () => {
    // Arrange
    const db = await assurerSchema();
    const cookieSession = await semerSessionValide(db);

    // Act
    const reponse = await SELF.fetch(ROUTE_EDITEUR_ACCUEIL, {
      headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
    });
    const corps = await reponse.text();

    // Assert : le point de montage existe pour l'emplacement « presentation »
    // — c'est ce nœud que `monterCorrectionsTexteRiche` (src/admin/
    // ilots-svelte-5/monter.ts) remplace par l'îlot `TexteRiche`, seul
    // porteur de la barre de mise en forme.
    expect(corps).toMatch(/data-emplacement-texte-riche[\s\S]*?data-id-emplacement="presentation"/);
  });

  it('SC-06d — l’îlot `TexteRiche` porte une barre avec les cinq commandes (gras, italique, lien, liste, titre), et n’offre aucune saisie de balise', async () => {
    // Arrange / Act : la source du composant qui porte le seul moyen de
    // mettre en forme ce champ (aucune infrastructure de test de composant
    // Svelte n'existe dans ce dépôt, docs/test.md — la source est donc
    // l'oracle, même geste que `ReglageLienVideo.svelte` pour SC-05d).
    const source = (await import('../../src/admin/ilots-svelte-5/TexteRiche.svelte?raw')).default as string;

    // Assert : une barre de mise en forme, avec un bouton par commande —
    // jamais un champ texte libre où écrire du Markdown ou du HTML.
    expect(source).toMatch(/role="toolbar"/);
    expect(source).toMatch(/>Gras</);
    expect(source).toMatch(/>Italique</);
    expect(source).toMatch(/>Lien</);
    expect(source).toMatch(/>Liste</);
    expect(source).toMatch(/>Titre</);

    // …et aucune zone de saisie libre de balise (pas de `<textarea>`, ni
    // d'attribut `contenteditable` posé à la main) — seule TipTap (`Editor`
    // de `@tiptap/core`) porte la zone d'édition, jamais un champ texte brut.
    expect(source).not.toMatch(/<textarea/);
    expect(source).not.toMatch(/contenteditable/);
  });
});

// --- SC-06e — enregistrer une correction de texte riche persiste le
// brouillon en Markdown restreint et fait basculer la page à « brouillon » ---

it('SC-06e — corriger le texte riche persiste le Markdown restreint, bascule la page à « brouillon », et laisse l’état publié intact', async () => {
  // Arrange
  const db = await assurerSchema();
  const cookieSession = await semerSessionValide(db);
  const listeAvant = await SELF.fetch(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  });
  const ligneAccueilAvant = (await listeAvant.text()).match(/<li>Accueil[\s\S]*?<\/li>/)?.[0] ?? '';
  expect(ligneAccueilAvant).not.toMatch(/data-pastille-brouillon/);

  // Act : un document TipTap portant un gras et un lien (les deux marques
  // couvertes par SC-06a), différent du contenu initial déclaré.
  const document: NoeudDocument = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          texte('Nouveaux ', [{ type: 'bold' }]),
          texte('gâteaux du mois', [{ type: 'link', attrs: { href: 'https://exemple.test/nouveautes' } }]),
        ],
      },
    ],
  };
  const reponse = await corrigerLeTexte(cookieSession, document);

  // Assert : la réponse confirme l'enregistrement et le basculement au brouillon…
  expect(reponse.status).toBe(200);
  const corpsReponse = (await reponse.json()) as { ok: boolean; porteUnBrouillon: boolean };
  expect(corpsReponse.ok).toBe(true);
  expect(corpsReponse.porteUnBrouillon).toBe(true);

  // …la ligne existe bien en D1, sous l'identité stable (page, emplacement),
  // et son contenu est le Markdown restreint (jamais le document JSON brut)…
  const resultat = await db
    .prepare(`select nature, contenu from ${TABLE_BROUILLONS} where page_slug = ?1 and id_emplacement = ?2`)
    .bind('accueil', 'presentation')
    .all();
  const lignes = resultat.results as { nature: string; contenu: string }[];
  expect(lignes).toHaveLength(1);
  expect(JSON.parse(lignes[0].contenu)).toEqual({
    nature: 'texte-riche',
    markdown: '**Nouveaux **[gâteaux du mois](https://exemple.test/nouveautes)',
  });

  // …la page « Accueil » porte désormais la pastille de brouillon, à la fois
  // sur la liste des pages et dans le fil de retour de l'éditeur…
  const listeApres = await SELF.fetch(ROUTE_MES_PAGES, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  });
  const ligneAccueilApres = (await listeApres.text()).match(/<li>Accueil[\s\S]*?<\/li>/)?.[0] ?? '';
  expect(ligneAccueilApres).toMatch(/data-pastille-brouillon/);

  const editeurApres = await SELF.fetch(ROUTE_EDITEUR_ACCUEIL, {
    headers: { cookie: `${NOM_COOKIE_SESSION}=${cookieSession}` },
  });
  const zonePastilleEditeur =
    (await editeurApres.text()).match(/<span id="zone-pastille-brouillon">[\s\S]*?<\/span>\s*<\/h1>/)?.[0] ?? '';
  expect(zonePastilleEditeur).toMatch(/data-pastille-brouillon/);

  // …et la déclaration versionnée (l'état publié) n'a pas bougé : lue depuis
  // `content/pages/accueil/presentation.md` (jamais depuis le brouillon),
  // elle porte toujours le texte d'origine de l'intégrateur.
  const { obtenirPageAvecEmplacements } = await import('../../src/platform/contenu/pages.ts');
  const pageDeclaree = obtenirPageAvecEmplacements('accueil');
  const texteDeclare = pageDeclaree?.emplacements.find((emplacement) => emplacement.id === 'presentation');
  expect(texteDeclare).toMatchObject({
    // Le `.md` est lu en texte brut (`?raw`, Vite) : la ligne finale du
    // fichier porte le saut de ligne final habituel d'un fichier texte.
    contenu: 'Bienvenue à la pâtisserie : des gâteaux faits maison pour tous vos événements.\n',
  });
});

// --- SC-06f — aucun terme de développeur ne paraît dans l'éditeur de texte
// riche ni dans sa barre de mise en forme ---

it('SC-06f — l’éditeur de texte riche et sa barre de mise en forme ne portent aucun terme de développeur', async () => {
  // Arrange
  const source = (await import('../../src/admin/ilots-svelte-5/TexteRiche.svelte?raw')).default as string;

  const TERMES_DEVELOPPEUR = [
    'commit',
    'branche',
    'build',
    'déploiement',
    'déployer',
    'repository',
    'dépôt git',
    'endpoint',
    'webhook',
    'backend',
    'front-end',
    'framework',
    'markdown',
    'json',
    'tiptap',
    'sérialis',
  ];

  // Act : seul le texte réellement à l'écran — le gabarit HTML (après
  // `</script>`) et les messages de refus (`TEXTES_REFUS`), jamais les
  // commentaires du fichier source ni les noms d'identifiants du code, qui ne
  // paraissent jamais à l'écran.
  const zoneMarkup = source.split('</script>')[1] ?? '';
  const zoneTextesRefus = source.match(/const TEXTES_REFUS[\s\S]*?\};/)?.[0] ?? '';
  expect(zoneMarkup.length, 'le gabarit HTML est introuvable dans la source').toBeGreaterThan(0);
  expect(zoneTextesRefus.length, 'TEXTES_REFUS introuvable dans la source').toBeGreaterThan(0);

  const zoneVisible = `${zoneMarkup}\n${zoneTextesRefus}`.toLowerCase();

  // Assert
  for (const terme of TERMES_DEVELOPPEUR) {
    expect(zoneVisible, `le texte visible ne devrait pas contenir « ${terme} »`).not.toContain(terme);
  }
});
