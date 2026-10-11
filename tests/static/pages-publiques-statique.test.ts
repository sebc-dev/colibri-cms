/**
 * Ticket 04 — Les pages publiques bâties à la construction
 * (openspec/changes/011-apercu-et-publication/tickets/04-*.md).
 *
 * Deux sites bâtis, lus tels qu'ils sont publiés :
 * - le site de démo (`content/`, intouché) : bâti par `npm run build` et servi
 *   par le worker de test, ses fichiers statiques par la liaison ASSETS ;
 * - le site jetable (`tests/static/fixtures/site-jetable/content/`) : bâti
 *   par `scripts/batir-site-jetable.mjs` — lancé par `pretest`,
 *   `precoverage` et la commande de construction de la mutation — et lu
 *   dans `.wrangler/site-jetable/client/`. Il apporte ce que la démo n'a
 *   pas : aucun réseau social (SC-04i), une adresse sur deux lignes (SC-04g),
 *   des titres, un libellé de bouton et des coordonnées porteurs de <, >, &
 *   et guillemets (SC-04d).
 */
import { exports } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';

/**
 * `HTMLRewriter` est une globale de workerd, où ces tests s'exécutent ; le
 * projet ne dépend pas de `@cloudflare/workers-types`. Seule la part lue
 * ici est déclarée.
 */
interface ElementRencontre {
  readonly tagName: string;
  readonly attributes: Iterable<[string, string]>;
}
interface MorceauDeTexte {
  readonly text: string;
}
interface Reecrivain {
  on(
    selecteur: string,
    gestionnaires: { element?(element: ElementRencontre): void; text?(texte: MorceauDeTexte): void },
  ): Reecrivain;
  transform(reponse: Response): Response;
}
declare const HTMLRewriter: new () => Reecrivain;

async function lire(chemin: string): Promise<{ status: number; corps: string }> {
  const reponse = await exports.default.fetch(new Request(`https://example.com${chemin}`));
  return { status: reponse.status, corps: await reponse.text() };
}

function liensDe(corps: string, bloc: string): { href: string; texte: string }[] {
  const debut = corps.indexOf(bloc);
  if (debut < 0) return [];
  const fin = corps.indexOf('</ul>', debut);
  return [...corps.slice(debut, fin).matchAll(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((m) => ({
    href: m[1],
    texte: m[2],
  }));
}

describe('pages publiques bâties', () => {
  it('SC-04a — /tarifs puis /contact renvoient chacune sa page, avec son titre et son contenu', async () => {
    const tarifs = await lire('/tarifs');
    const contact = await lire('/contact');

    expect(tarifs.status).toBe(200);
    expect(tarifs.corps).toContain('<title>Tarifs</title>');
    expect(tarifs.corps).toContain('<h1>Tarifs</h1>');
    expect(tarifs.corps).toContain('Demander un devis');
    expect(contact.status).toBe(200);
    expect(contact.corps).toContain('<title>Contact</title>');
    expect(contact.corps).toContain('<h1>Contact</h1>');
    expect(contact.corps).toContain('Voir la vidéo');
    expect(contact.corps).not.toContain('<h1>Tarifs</h1>');
  });

  it('SC-04b — sur toute page, la navigation liste les pages dans l’ordre posé et marque la courante', async () => {
    for (const [chemin, courante] of [['/', 'Accueil'], ['/tarifs', 'Tarifs'], ['/contact', 'Contact']] as const) {
      const { corps } = await lire(chemin);
      const nav = corps.slice(corps.indexOf('<nav'), corps.indexOf('</nav>'));

      const entrees = [...nav.matchAll(/<a href="([^"]*)"([^>]*)>([^<]*)<\/a>/g)].map((m) => ({
        adresse: m[1],
        titre: m[3],
        courante: m[2].includes('aria-current="page"'),
      }));
      expect(entrees).toEqual([
        { adresse: '/', titre: 'Accueil', courante: courante === 'Accueil' },
        { adresse: '/tarifs', titre: 'Tarifs', courante: courante === 'Tarifs' },
        { adresse: '/contact', titre: 'Contact', courante: courante === 'Contact' },
      ]);
    }
  });

  it('SC-04c — une adresse inconnue reçoit la page « introuvable » du site, sans le contenu d’une autre page', async () => {
    const { corps } = await lire('/page-qui-n-existe-pas');

    expect(corps).toContain('Cette page n\'existe pas.');
    expect(corps).toContain('<a href="/">');
    expect(corps).not.toContain('Demander un devis');
    expect(corps).not.toContain('Voir la vidéo');
    expect(corps).not.toContain('<h1>Tarifs</h1>');
  });

  it('SC-04d — le texte est écrit échappé dans le document publié', async () => {
    const { corps } = await lire('/tarifs');

    expect(corps).toContain('Téléphone de l&#39;atelier');
    expect(corps).not.toContain('Téléphone de l\'atelier');
  });

  it('SC-04d — aucun gabarit du site n’écrit du balisage brut (ni set:html ni @html)', async () => {
    const sources = await Promise.all([
      import('../../src/site/page.astro?raw'),
      import('../../src/site/PiedDePage.astro?raw'),
      import('../../src/render/BoutonAction.astro?raw'),
      import('../../src/render/LienVideo.astro?raw'),
      import('../../src/pages/[...slug].astro?raw'),
      import('../../src/pages/404.astro?raw'),
    ]);

    for (const source of sources) {
      expect(source.default).not.toMatch(/set:html|set:text|\{@html|innerHTML/);
    }
  });

  it('SC-04e — le bouton « Demander un devis » paraît comme un lien menant à /contact', async () => {
    const { corps } = await lire('/tarifs');

    expect(corps).toMatch(/<a class="bouton-action" href="\/contact" rel="noopener noreferrer">Demander un devis<\/a>/);
  });

  it('SC-04f — le lien de vidéo paraît comme « Voir la vidéo » vers la vidéo, sans rien charger de l’hébergeur', async () => {
    const { corps } = await lire('/contact');

    expect(corps).toContain('<a href="https://vimeo.com/76979871" rel="noopener noreferrer">Voir la vidéo</a>');
    expect(corps).not.toMatch(/<(iframe|script|embed|object|video)\b/i);
    expect(corps).not.toMatch(/<link[^>]+href="https?:\/\//i);
  });

  it('SC-04g — le pied de page présente les coordonnées dans l’ordre déclaré, avec liens d’appel et de message', async () => {
    const { corps } = await lire('/contact');
    const pied = corps.slice(corps.indexOf('<footer'));

    const tel = pied.indexOf('href="tel:0123456789"');
    const mail = pied.indexOf('href="mailto:atelier@example.org"');
    const adresse = pied.indexOf('12 rue des Tilleuls, 75000 Paris');
    expect(tel).toBeGreaterThan(-1);
    expect(mail).toBeGreaterThan(tel);
    expect(adresse).toBeGreaterThan(mail);
    expect(pied).toContain('>01 23 45 67 89</a>');
    expect(pied).toContain('>atelier@example.org</a>');
  });

  it('SC-04h — avec trois réseaux publiés, le pied de chaque page présente les trois liens dans leur ordre', async () => {
    for (const chemin of ['/', '/tarifs', '/contact']) {
      const { corps } = await lire(chemin);

      expect(liensDe(corps, '<ul class="reseaux">')).toEqual([
        { href: 'https://www.instagram.com/atelier-exemple', texte: 'Instagram' },
        { href: 'https://www.facebook.com/atelier-exemple', texte: 'Facebook' },
        { href: 'https://www.pinterest.com/atelier-exemple', texte: 'Pinterest' },
      ]);
    }
  });

  it('SC-04i (complément, source) — le gabarit du pied n’écrit la section des réseaux que s’il y en a', async () => {
    const source = (await import('../../src/site/PiedDePage.astro?raw')).default;

    expect(source).toMatch(/pied\.reseaux\.length > 0 &&/);
  });
});

/**
 * Le site jetable, lu à la transformation de ce fichier. Une sortie absente
 * donne une table vide : `pagesJetables` l'exige non vide, aucun test ne la
 * tolère.
 */
const SITE_JETABLE = import.meta.glob<string>('/.wrangler/site-jetable/client/**/index.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const RACINE_JETABLE = '/.wrangler/site-jetable/client';

function pagesJetables(): { adresse: string; corps: string }[] {
  const pages = Object.entries(SITE_JETABLE).map(([chemin, corps]) => ({
    adresse: chemin.slice(RACINE_JETABLE.length).replace(/index\.html$/, '').replace(/(.)\/$/, '$1'),
    corps,
  }));
  expect(
    pages.length,
    'site jetable absent ou incomplet : lancer `node scripts/batir-site-jetable.mjs`',
  ).toBeGreaterThanOrEqual(2);
  return pages;
}

function pageJetable(adresse: string): string {
  const page = pagesJetables().find((p) => p.adresse === adresse);
  expect(page, `page ${adresse} absente du site jetable`).toBeDefined();
  return page?.corps ?? '';
}

function piedDe(corps: string): string {
  const debut = corps.indexOf('<footer');
  const fin = corps.indexOf('</footer>', debut);
  expect(debut, 'aucun <footer>').toBeGreaterThan(-1);
  expect(fin, 'aucun </footer>').toBeGreaterThan(debut);
  return corps.slice(debut, fin + '</footer>'.length);
}

/**
 * Le texte ou la valeur d'attribut tels que le visiteur les lit. HTMLRewriter
 * les rend tels qu'écrits dans le document, entités comprises (mesuré) : le
 * décodage se fait ici, en une passe, sur les seules entités qu'Astro écrit.
 * Une autre entité resterait telle quelle et ferait échouer la comparaison.
 */
function decoder(brut: string): string {
  const entites: Readonly<Record<string, string>> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
  };
  return brut.replace(/&(?:lt|gt|amp|quot|#39);/g, (entite) => entites[entite] ?? entite);
}

interface ElementReleve {
  readonly balise: string;
  readonly attributs: [string, string][];
  texte: string;
}

/**
 * Passe le document dans le vrai analyseur HTML de workerd et relève, par
 * sélecteur, chaque élément rencontré : sa balise, ses attributs, son texte.
 * Un balisage issu du contenu qui serait interprété paraîtrait ici comme un
 * élément, pas comme du texte.
 */
async function relever(corps: string, selecteurs: readonly string[]): Promise<Map<string, ElementReleve[]>> {
  const releve = new Map<string, ElementReleve[]>();
  let reecrivain = new HTMLRewriter();
  for (const selecteur of selecteurs) {
    const lus: ElementReleve[] = [];
    releve.set(selecteur, lus);
    reecrivain = reecrivain.on(selecteur, {
      element(element) {
        lus.push({ balise: element.tagName, attributs: [...element.attributes], texte: '' });
      },
      text(morceau) {
        const courant = lus.at(-1);
        if (courant !== undefined) courant.texte += morceau.text;
      },
    });
  }
  await reecrivain.transform(new Response(corps)).text();
  return releve;
}

describe('pages publiques bâties depuis le contenu jetable', () => {
  it('SC-04i — sans réseau social publié, le pied de page ne porte pas de section des réseaux', () => {
    for (const { adresse, corps } of pagesJetables()) {
      const pied = piedDe(corps);

      expect(pied, adresse).not.toContain('class="reseaux"');
      expect(pied, adresse).not.toMatch(/<ul[^>]*>\s*<\/ul>/);
      expect(pied, adresse).toContain('<ul class="coordonnees">');
      expect(pied.match(/<li>/g), adresse).toHaveLength(5);
      expect(pied, adresse).toContain('<a href="tel:0123456789">01 23 45 67 89</a>');
      expect(pied, adresse).toContain('Ouvert le samedi');
    }
  });

  it('SC-04g — l’adresse paraît sur ses lignes', () => {
    for (const { adresse, corps } of pagesJetables()) {
      const pied = piedDe(corps);

      expect(pied, adresse).toMatch(/12 rue des Tilleuls\s*<br\s*\/?>\s*75000 Paris/);
      // D'un bloc, la valeur tiendrait sur une seule ligne affichée : aucun
      // élément entre ses deux lignes.
      expect(pied, adresse).not.toMatch(/12 rue des Tilleuls[^<]*75000 Paris/);
    }
  });

  it('SC-04d — titre, libellé de bouton et coordonnée contenant <, >, & ou guillemets s’affichent comme texte', async () => {
    const pages = pagesJetables();

    // (a) Aucun élément i, b, script ni img : le gabarit n'en écrit aucun
    // lui-même, et le contenu jetable en porte de chaque sorte.
    for (const { adresse, corps } of pages) {
      const releve = await relever(corps, ['i', 'b', 'script', 'img']);
      expect([...releve.values()].flat(), adresse).toEqual([]);
      expect(corps, adresse).not.toMatch(/<(?:i|b|script|img)[\s>/]/i);
    }

    // (b) Le texte de chaque élément, décodé, est la chaîne d'origine ; le
    // document la porte échappée.
    const titrePiege = '<i>Tarifs</i> & "plus"';
    const titrePiegeEchappe = '&lt;i&gt;Tarifs&lt;/i&gt; &amp; &quot;plus&quot;';
    const tarifs = pageJetable('/tarifs');
    const releveTarifs = await relever(tarifs, ['title', 'h1']);
    expect(releveTarifs.get('title')?.map((e) => decoder(e.texte))).toEqual([titrePiege]);
    expect(releveTarifs.get('h1')?.map((e) => decoder(e.texte))).toEqual([titrePiege]);
    expect(tarifs).toContain(`<title>${titrePiegeEchappe}</title>`);
    expect(tarifs).toContain(`<h1>${titrePiegeEchappe}</h1>`);

    const contact = pageJetable('/contact');
    const releveContact = await relever(contact, ['title', 'h1']);
    expect(releveContact.get('title')?.map((e) => decoder(e.texte))).toEqual(['"><b>x</b>']);
    expect(releveContact.get('h1')?.map((e) => decoder(e.texte))).toEqual(['"><b>x</b>']);
    expect(contact).toContain('<h1>&quot;&gt;&lt;b&gt;x&lt;/b&gt;</h1>');

    for (const { adresse, corps } of pages) {
      const nav = (await relever(corps, ['nav a'])).get('nav a') ?? [];
      expect(
        nav.map((e) => ({ href: new Map(e.attributs).get('href'), texte: decoder(e.texte) })),
        adresse,
      ).toEqual([
        { href: '/', texte: 'Accueil' },
        { href: '/tarifs', texte: titrePiege },
        { href: '/contact', texte: '"><b>x</b>' },
      ]);
      for (const entree of nav) {
        expect(entree.attributs.map(([nom]) => nom).filter((nom) => nom !== 'aria-current'), adresse).toEqual(['href']);
      }
      expect(corps, adresse).toMatch(new RegExp(`<a href="/tarifs"[^>]*>${titrePiegeEchappe}</a>`));
    }

    const accueil = pageJetable('/');
    const bouton = (await relever(accueil, ['a.bouton-action'])).get('a.bouton-action') ?? [];
    expect(bouton.map((e) => ({ attributs: e.attributs, texte: decoder(e.texte) }))).toEqual([
      {
        attributs: [
          ['class', 'bouton-action'],
          ['href', '/contact'],
          ['rel', 'noopener noreferrer'],
        ],
        texte: '<b>Devis</b> & "co"',
      },
    ]);
    expect(accueil).toContain(
      '<a class="bouton-action" href="/contact" rel="noopener noreferrer">&lt;b&gt;Devis&lt;/b&gt; &amp; &quot;co&quot;</a>',
    );

    for (const { adresse, corps } of pages) {
      const pied = piedDe(corps);
      const releve = await relever(pied, ['li', 'a']);
      expect(releve.get('li')?.map((e) => decoder(e.texte)), adresse).toEqual([
        'Téléphone : 01 23 45 67 89',
        'Courriel : atelier&co"x@example.org',
        'Adresse : 12 rue des Tilleuls75000 Paris',
        'Horaires : <script>alert(1)</script> & "q"',
        '<img src=x onerror=alert(1)> : Ouvert le samedi',
      ]);
      expect(pied, adresse).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;');
      expect(pied, adresse).toContain('<span class="nom">&lt;img src=x onerror=alert(1)&gt; : </span>');

      // (c) Dans un attribut, le guillemet de la valeur est écrit &quot; et
      // ne ferme pas l'attribut : le lien de message ne porte que son href,
      // entier. lireReglagesDeclares ne valide pas la forme d'un e-mail.
      const message = releve.get('a')?.find((e) => e.attributs.some(([, v]) => v.startsWith('mailto:')));
      expect(message?.attributs.map(([nom, valeur]) => [nom, decoder(valeur)]), adresse).toEqual([
        ['href', 'mailto:atelier&co"x@example.org'],
      ]);
      expect(decoder(message?.texte ?? ''), adresse).toBe('atelier&co"x@example.org');
      expect(pied, adresse).toContain('<a href="mailto:atelier&amp;co&quot;x@example.org">');
    }
  });
});
