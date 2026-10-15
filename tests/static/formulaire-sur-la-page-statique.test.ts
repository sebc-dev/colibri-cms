/**
 * Ticket 03 du change 012 — le formulaire dans le document publié
 * (openspec/changes/012-envoi-des-demandes-de-devis/tickets/03-*.md).
 *
 * Le site jetable (`tests/static/fixtures/site-jetable/content/`), bâti par
 * `scripts/batir-site-jetable.mjs`, pose sur « Contact » le formulaire
 * `devis-piege` : son nom, un libellé de champ et un libellé d'option portent
 * <, >, & et guillemets, et sa seule option vaut 10,50 €. Le document est lu
 * tel qu'il est publié, dans `.wrangler/site-jetable/client/contact/`.
 */
import { describe, it, expect } from 'vitest';

/**
 * `HTMLRewriter` est une globale de workerd, où ces tests s'exécutent ; le
 * projet ne dépend pas de `@cloudflare/workers-types`. Seule la part lue
 * ici est déclarée.
 */
interface MorceauDeTexte {
  readonly text: string;
}
interface Reecrivain {
  on(selecteur: string, gestionnaires: { element?(): void; text?(texte: MorceauDeTexte): void }): Reecrivain;
  transform(reponse: Response): Response;
}
declare const HTMLRewriter: new () => Reecrivain;

const CONTACT_JETABLE = '/.wrangler/site-jetable/client/contact/index.html';
const SITE_JETABLE = import.meta.glob<string>('/.wrangler/site-jetable/client/contact/index.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** La section du formulaire de « Contact » : de `<section class="formulaire">` à `</section>`. */
function sectionDuFormulaire(): string {
  const entree = Object.entries(SITE_JETABLE).find(([chemin]) => chemin === CONTACT_JETABLE);
  expect(entree, 'site jetable absent : lancer `node scripts/batir-site-jetable.mjs`').toBeDefined();
  const corps = entree?.[1] ?? '';
  const debut = corps.indexOf('<section class="formulaire">');
  const fin = corps.indexOf('</section>', debut);
  expect(debut, 'aucun formulaire sur la page Contact du site jetable').toBeGreaterThanOrEqual(0);
  expect(fin).toBeGreaterThan(debut);
  return corps.slice(debut, fin + '</section>'.length);
}

/**
 * Le texte tel que le visiteur le lit. HTMLRewriter le rend tel qu'écrit dans
 * le document, entités comprises : le décodage se fait ici, sur les seules
 * entités qu'Astro écrit, puis les blancs sont ramenés à un seul.
 */
function decoder(brut: string): string {
  const entites: Readonly<Record<string, string>> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
  };
  return brut
    .replace(/&(?:lt|gt|amp|quot|#39);/g, (entite) => entites[entite] ?? entite)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Passe le document dans le vrai analyseur HTML de workerd et relève, par
 * sélecteur, le texte de chaque élément rencontré. Un balisage issu du
 * contenu qui serait interprété paraîtrait ici comme un élément.
 */
async function relever(html: string, selecteurs: readonly string[]): Promise<Map<string, string[]>> {
  const releve = new Map<string, string[]>();
  let reecrivain = new HTMLRewriter();
  for (const selecteur of selecteurs) {
    const lus: string[] = [];
    releve.set(selecteur, lus);
    reecrivain = reecrivain.on(selecteur, {
      element() {
        lus.push('');
      },
      text(morceau) {
        const dernier = lus.length - 1;
        if (dernier >= 0) lus[dernier] += morceau.text;
      },
    });
  }
  await reecrivain.transform(new Response(html)).text();
  return releve;
}

describe('le formulaire publié, depuis le contenu jetable', () => {
  it('SC-03h — un libellé de champ et un libellé d’option contenant <, >, & ou guillemets s’affichent comme du texte dans le document publié', async () => {
    const section = sectionDuFormulaire();

    // (a) Aucun élément b, i ni script : le composant n'en écrit aucun
    // lui-même, et le formulaire jetable en porte de chaque sorte.
    const balises = await relever(section, ['b', 'i', 'script']);
    expect([...balises.values()].flat()).toEqual([]);
    expect(section).not.toMatch(/<(?:b|i|script)[\s>/]/i);

    // (b) Le texte de chaque élément, décodé, est la chaîne d'origine.
    const textes = await relever(section, ['h2', 'legend', 'label[for]', 'label.option']);
    expect(textes.get('h2')?.map(decoder)).toEqual(['<i>Devis</i> & "piège"']);
    expect(textes.get('legend')?.map(decoder)).toEqual(['<b>Parfum</b> & "x"']);
    expect(textes.get('label[for]')?.map(decoder)[0]).toBe('<i>Votre nom</i> > "n"');
    expect(textes.get('label.option')?.map(decoder)[0]).toContain('<script>alert(1)</script> & "o"');

    // (c) Le document porte ces libellés sous leur forme échappée.
    expect(section).toContain('&lt;i&gt;Devis&lt;/i&gt; &amp; &quot;piège&quot;');
    expect(section).toContain('&lt;b&gt;Parfum&lt;/b&gt; &amp; &quot;x&quot;');
    expect(section).toContain('&lt;i&gt;Votre nom&lt;/i&gt; &gt; &quot;n&quot;');
    expect(section).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;o&quot;');
  });

  it('SC-03b — une option publiée à 10,50 € est suivie de « — 10,50 € » dans le document publié', async () => {
    const options = (await relever(sectionDuFormulaire(), ['label.option'])).get('label.option') ?? [];

    expect(options).toHaveLength(1);
    expect(decoder(options[0] ?? '')).toMatch(/& "o" — 10,50 €$/);
  });
});
