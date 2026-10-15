/**
 * Ticket 03 du change 012 — la page publique présente le formulaire qu'elle pose.
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd` contre le site de démo
 * bâti (`content/`), tel qu'il est servi. « Devis gâteau » est posé sur Tarifs (après le bandeau)
 * et sur Contact. Le comportement de sélection (SC-03c, SC-03d) se joue au navigateur, dans
 * `tests/parcours/formulaire-dessine.parcours.ts` ; ici, la structure qui le garantit.
 */
import { exports } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';

async function lire(chemin: string): Promise<string> {
  const reponse = await exports.default.fetch(new Request(`https://example.com${chemin}`));
  expect(reponse.status).toBe(200);
  return reponse.text();
}

/** Le formulaire de la page : de `<form` à `</form>`. */
function formulaireDe(corps: string): string {
  const debut = corps.indexOf('<form');
  const fin = corps.indexOf('</form>');
  expect(debut, 'aucun <form> dans la page').toBeGreaterThanOrEqual(0);
  expect(fin).toBeGreaterThan(debut);
  return corps.slice(debut, fin + '</form>'.length);
}

function texteVisible(html: string): string {
  return html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^<>]*>/g, ' ')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
}

/** Le `<fieldset>` dont la légende porte ce libellé. */
function groupe(formulaire: string, libelle: string): string {
  const trouve = [...formulaire.matchAll(/<fieldset\b[\s\S]*?<\/fieldset>/g)]
    .map((m) => m[0])
    .find((f) => /<legend\b[\s\S]*?<\/legend>/.exec(f)?.[0].includes(libelle) === true);
  expect(trouve, `aucun groupe titré « ${libelle} »`).toBeDefined();
  return trouve ?? '';
}

function typesDeControles(formulaire: string): string[] {
  return [...formulaire.matchAll(/<(input|textarea)\b[^>]*>/g)]
    .map((m) => (m[1] === 'textarea' ? 'textarea' : (/\btype="([^"]+)"/.exec(m[0])?.[1] ?? 'text')))
    .filter((type) => type !== 'hidden');
}

describe('la page publique présente le formulaire posé', () => {
  it('SC-03a — Contact présente les sept champs dans l’ordre, Parfum et e-mail marqués obligatoires', async () => {
    const formulaire = formulaireDe(await lire('/contact'));
    const texte = texteVisible(formulaire);
    const libelles = [
      'Parfum',
      'Nombre de parts',
      'Occasion',
      'Votre nom',
      'Votre adresse e-mail',
      'Votre numéro de téléphone',
      'Votre message',
    ];

    const positions = libelles.map((l) => texte.indexOf(l));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(typesDeControles(formulaire)).toEqual([
      ...Array<string>(3).fill('radio'),
      ...Array<string>(3).fill('radio'),
      ...Array<string>(3).fill('checkbox'),
      'text',
      'email',
      'tel',
      'textarea',
    ]);
    expect(texte).toMatch(/Parfum\W{0,3}obligatoire/);
    expect(texte).toMatch(/Votre adresse e-mail\W{0,3}obligatoire/);
    for (const facultatif of ['Nombre de parts', 'Occasion', 'Votre nom', 'Votre numéro de téléphone', 'Votre message']) {
      expect(texte).not.toMatch(new RegExp(`${facultatif}\\W{0,3}obligatoire`));
    }
    expect(formulaire).toMatch(/<form\b[^>]*\bnovalidate\b/);
  });

  it('SC-03b — les options de Parfum sont suivies de leur prix en euros ; celles d’Occasion n’en portent aucun', async () => {
    const formulaire = formulaireDe(await lire('/contact'));
    const parfum = texteVisible(groupe(formulaire, 'Parfum'));
    const occasion = texteVisible(groupe(formulaire, 'Occasion'));

    expect(parfum).toMatch(/Vanille\W{0,6}8 €/);
    expect(parfum).toMatch(/Chocolat\W{0,6}9 €/);
    expect(parfum).toMatch(/Fraise\W{0,6}10 €/);
    for (const option of ['Anniversaire', 'Mariage', 'Baptême & communion']) expect(occasion).toContain(option);
    expect(occasion).not.toContain('€');
  });

  it('SC-03c — Parfum est un groupe de boutons d’option de même nom, chaque ligne entièrement touchable', async () => {
    const formulaire = formulaireDe(await lire('/contact'));
    const parfum = groupe(formulaire, 'Parfum');
    const radios = [...parfum.matchAll(/<input\b[^>]*\btype="radio"[^>]*>/g)].map((m) => m[0]);
    const noms = new Set(radios.map((r) => /\bname="([^"]+)"/.exec(r)?.[1]));

    expect(radios).toHaveLength(3);
    expect(noms.size).toBe(1);
    expect(noms.has(undefined)).toBe(false);
    for (const option of ['Vanille', 'Chocolat', 'Fraise']) {
      const ligne = [...parfum.matchAll(/<label\b[\s\S]*?<\/label>/g)].map((m) => m[0]).find((l) => l.includes(option));
      expect(ligne, `ligne « ${option} » sans <label>`).toBeDefined();
      expect(ligne).toContain('type="radio"');
    }
  });

  it('SC-03d — Occasion est un groupe de cases à cocher, aucune n’étant un bouton d’option', async () => {
    const formulaire = formulaireDe(await lire('/contact'));
    const occasion = groupe(formulaire, 'Occasion');

    expect([...occasion.matchAll(/<input\b[^>]*\btype="checkbox"[^>]*>/g)]).toHaveLength(3);
    expect(occasion).not.toContain('type="radio"');
    for (const option of ['Anniversaire', 'Mariage']) {
      const ligne = [...occasion.matchAll(/<label\b[\s\S]*?<\/label>/g)].map((m) => m[0]).find((l) => l.includes(option));
      expect(ligne, `ligne « ${option} » sans <label>`).toBeDefined();
      expect(ligne).toContain('type="checkbox"');
    }
  });

  it('SC-03e — « Estimation indicative, non engageante. » paraît avec le total, puis la mention d’information, puis le bouton', async () => {
    const texte = texteVisible(formulaireDe(await lire('/contact')));
    const total = texte.indexOf('Total estimé : 0 €');
    const estimation = texte.indexOf('Estimation indicative, non engageante.');
    const information = texte.indexOf('Les informations saisies dans le formulaire servent uniquement à répondre à votre demande.');
    const bouton = texte.indexOf('Envoyer ma demande');

    expect(total).toBeGreaterThanOrEqual(0);
    expect(estimation).toBeGreaterThan(total);
    expect(information).toBeGreaterThan(estimation);
    expect(bouton).toBeGreaterThan(information);
  });

  it('SC-03e — le bouton d’envoi est inactif dans le document', async () => {
    const formulaire = formulaireDe(await lire('/contact'));
    const bouton = /<button\b[^>]*>[\s\S]*?Envoyer ma demande[\s\S]*?<\/button>/.exec(formulaire)?.[0] ?? '';

    expect(bouton).toMatch(/<button\b[^>]*\bdisabled\b/);
  });

  it('SC-03f — champs, options, prix, deux mentions, textes d’états et message sans script figurent dans la réponse, sans script', async () => {
    const corps = await lire('/tarifs');
    const formulaire = formulaireDe(corps);
    const texte = texteVisible(formulaire);

    for (const attendu of ['Parfum', 'Vanille', 'Chocolat', 'Fraise', '10 €', 'Estimation indicative, non engageante.']) {
      expect(texte).toContain(attendu);
    }
    expect(texte).toContain('Les informations saisies dans le formulaire servent uniquement à répondre à votre demande.');
    for (const etat of [
      'Envoi en cours…',
      'Merci, votre demande a été envoyée.',
      'Votre demande n\'a pas pu être envoyée. Votre saisie est conservée : réessayez dans quelques instants.',
      'Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure.',
      'Ce formulaire vient d\'être mis à jour. Rechargez la page pour voir les prix à jour, puis refaites votre demande.',
    ]) {
      expect(formulaire.replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ')).toContain(etat);
    }
    expect(formulaire).toMatch(
      /<noscript>[\s\S]*Le total et l(?:'|&#39;)envoi de ce formulaire ont besoin de JavaScript, désactivé dans votre navigateur\. Vous pouvez nous écrire avec les coordonnées en bas de page\.[\s\S]*<\/noscript>/,
    );
    expect(corps).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
  });

  it('SC-03g — aucun champ n’offre de joindre un fichier', async () => {
    const formulaire = formulaireDe(await lire('/contact'));

    expect(formulaire).not.toMatch(/type="file"/i);
    expect(formulaire).not.toMatch(/enctype=/i);
  });

  it('SC-03h — un libellé d’option contenant & s’affiche comme du texte : le document l’écrit échappé', async () => {
    const formulaire = formulaireDe(await lire('/contact'));

    expect(formulaire).toContain('Baptême &amp; communion');
    expect(formulaire).not.toContain('Baptême & communion');
  });

  it('SC-03i — sur Tarifs, le formulaire suit l’image de bandeau, sans autre emplacement entre les deux', async () => {
    const corps = await lire('/tarifs');
    const debutFormulaire = corps.indexOf('<form');
    const image = [...corps.matchAll(/<img\b[^>]*>/g)].map((m) => ({ fin: m.index + m[0].length })).at(-1);

    expect(image, 'aucune image de bandeau').toBeDefined();
    const finImage = image?.fin ?? Number.POSITIVE_INFINITY;
    expect(debutFormulaire).toBeGreaterThan(finImage);
    const entre = corps.slice(finImage, debutFormulaire);
    expect(entre).not.toMatch(/<(img|picture|a|button|iframe|ul|ol|p|figure)\b/);
    expect(texteVisible(entre).trim().replace('Devis gâteau', '')).toBe('');
  });

  it('SC-03j — Tarifs et Contact présentent le même formulaire, mêmes options et mêmes prix', async () => {
    const tarifs = texteVisible(formulaireDe(await lire('/tarifs')));
    const contact = texteVisible(formulaireDe(await lire('/contact')));

    expect(tarifs).toContain('Vanille');
    expect(tarifs).toBe(contact);
  });
});
