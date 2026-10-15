/**
 * Ticket 01 du change 012 — l'intégrateur pose un formulaire sur une page, l'éditrice l'y voit sans
 * pouvoir le modifier (ADR-0027).
 *
 * Couture : requêtes HTTP réelles (`exports.default.fetch`) dans `workerd`, vraie D1 locale ; le
 * seul double est le dépôt simulé en mémoire pour la publication. Le contenu de départ pose
 * « Devis gâteau » sur Tarifs (rang 3) et Contact (rang 4), emplacement `formulaire-devis`.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, beforeEach, afterEach } from 'vitest';
import { ForgeEnMemoire } from '../unit/publication/forge-en-memoire.ts';
import {
  calculerEtatPublication,
  confirmerPublication,
  poursuivrePublication,
} from '../../src/platform/publication/publier.ts';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  exigerPresent,
  lecteurDesOriginales,
  nettoyer,
  semerBrouillonEmplacement,
  semerBrouillonFormulaire,
  semerSession,
  type DBLike,
} from './outils-publication.ts';

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

async function editeur(db: DBLike, slug: string): Promise<string> {
  const session = await semerSession(db);
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/pages/${slug}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${session}` } }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function blocs(corps: string): { id: string; html: string }[] {
  return [...corps.matchAll(/<li>[\s\S]*?<\/li>/g)].flatMap((m) => {
    const id = /data-id-emplacement="([^"]+)"/.exec(m[0])?.[1];
    return id === undefined ? [] : [{ id, html: m[0] }];
  });
}

function titreDeCarte(html: string): string {
  const brut = /<div data-slot="card-title"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
  return brut.replace(/<!--.*?-->/g, '').trim();
}

function texteVisible(html: string): string {
  return html.replace(/<[^<>]*>/g, ' ').replace(/\s+/g, ' ');
}

async function publier(db: DBLike, forge: ForgeEnMemoire): Promise<void> {
  const etat = await calculerEtatPublication(db, Date.now());
  const confirmation = await confirmerPublication(db, etat.empreinte, Date.now());
  const jeton = exigerPresent(confirmation.ok ? confirmation.jeton : null, 'la confirmation doit aboutir');
  const issue = await poursuivrePublication(db, jeton, Date.now(), forge, lecteurDesOriginales());
  expect(issue.ok).toBe(true);
}

it('SC-01a — l’éditeur de Tarifs présente les emplacements dans l’ordre posé, le formulaire à son rang', async () => {
  // Arrange
  const db = await assurerSchema();

  // Act
  const liste = blocs(await editeur(db, 'tarifs'));

  // Assert
  expect(liste.map((b) => b.id)).toEqual(['presentation', 'bouton-devis', 'bandeau-tarifs', 'formulaire-devis']);
  expect(titreDeCarte(liste[1]?.html ?? '')).toBe('Bouton d’action');
});

it('SC-01b — l’éditeur de Contact présente « Formulaire — Devis gâteau », à son rang, avec la phrase qui renvoie à Formulaires', async () => {
  // Arrange
  const db = await assurerSchema();

  // Act
  const liste = blocs(await editeur(db, 'contact'));
  const carte = liste.find((b) => b.id === 'formulaire-devis');

  // Assert
  expect(carte, 'la carte du formulaire devrait être présente').toBeDefined();
  expect(liste.at(-1)?.id).toBe('formulaire-devis');
  expect(titreDeCarte(carte?.html ?? '')).toBe('Formulaire — Devis gâteau');
  expect(texteVisible(carte?.html ?? '')).toContain('Ses options et ses prix se règlent dans Formulaires.');
});

it('SC-01c — le lien de la carte ouvre l’écran du formulaire « Devis gâteau »', async () => {
  // Arrange
  const db = await assurerSchema();
  const carte = blocs(await editeur(db, 'contact')).find((b) => b.id === 'formulaire-devis');
  const lien = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(carte?.html ?? '');
  expect(lien, 'la carte devrait porter un lien').not.toBeNull();
  expect(texteVisible(lien?.[2] ?? '')).toContain('Régler ce formulaire');
  const session = await semerSession(db);

  // Act
  const reponse = await exports.default.fetch(
    new Request(`${BASE}${lien?.[1] ?? ''}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${session}` } }),
  );

  // Assert
  expect(lien?.[1]).toBe('/admin/formulaires/devis-gateau');
  expect(reponse.status).toBe(200);
  expect(await reponse.text()).toContain('Devis gâteau');
});

it('SC-01d — la carte du formulaire n’offre ni champ ni geste qui modifie son contenu ou le formulaire désigné', async () => {
  // Arrange
  const db = await assurerSchema();

  // Act
  const carte = blocs(await editeur(db, 'contact')).find((b) => b.id === 'formulaire-devis');

  // Assert
  expect(carte, 'la carte du formulaire devrait être présente').toBeDefined();
  expect(carte?.html).not.toMatch(/<(input|textarea|select|button|form)\b/i);
  expect(carte?.html).not.toContain('contenteditable');
});

it('SC-01e — une correction visant un emplacement de formulaire est refusée, aucun brouillon écrit', async () => {
  // Arrange
  const db = await assurerSchema();
  const session = await semerSession(db);

  // Act
  const reponse = await exports.default.fetch(
    new Request(`${BASE}/admin/pages/contact/emplacements/formulaire-devis`, {
      method: 'POST',
      headers: { cookie: `${NOM_COOKIE_SESSION}=${session}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nature: 'formulaire', formulaire: 'devis-atelier' }),
    }),
  );

  // Assert
  expect(reponse.status).toBe(400);
  expect(await compter(db, 'brouillons_emplacements')).toBe(0);
});

it('SC-01g — publier le texte de Contact redépose un page.json qui garde l’emplacement « Devis gâteau », à son rang', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerBrouillonEmplacement(db, 'contact', 'presentation', { nature: 'texte-riche', markdown: 'Bienvenue.' });
  const forge = await ForgeEnMemoire.creer({});

  // Act
  await publier(db, forge);

  // Assert
  const octets = exigerPresent(forge.octets('content/pages/contact/page.json'), 'page.json de Contact');
  const page = JSON.parse(new TextDecoder().decode(octets)) as { emplacements: Record<string, unknown>[] };
  const ordre = [...page.emplacements].sort((a, b) => Number(a.rang) - Number(b.rang));
  expect(page.emplacements).toContainEqual({
    id: 'formulaire-devis',
    nature: 'formulaire',
    rang: 4,
    formulaire: 'devis-gateau',
  });
  expect(ordre.at(-1)?.id).toBe('formulaire-devis');
});

it('SC-01h — publier le seul formulaire réécrit son formulaire.json et aucun page.json', async () => {
  // Arrange
  const db = await assurerSchema();
  await semerBrouillonFormulaire(db, 'devis-gateau', {
    champs: { parfum: [{ id: 'pistache', libelle: 'Pistache', prix: 1200 }] },
    derniersNumeros: {},
  });
  const forge = await ForgeEnMemoire.creer({});

  // Act
  await publier(db, forge);

  // Assert
  const chemins = forge.chemins();
  expect(chemins).toContain('content/formulaires/devis-gateau/formulaire.json');
  expect(chemins.filter((c) => /^content\/pages\/[^/]+\/page\.json$/.test(c))).toEqual([]);
});
