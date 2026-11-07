/**
 * Change 015, ticket 04 — Les garde-fous communs aux trois routes de retour
 * (page, réglage, formulaire) : présence du geste selon le brouillon, objet
 * inconnu refusé sans erreur du serveur, textes sans terme de développeur.
 *
 * Couture : requêtes HTTP réelles via `exports.default.fetch` dans `workerd`,
 * contre la vraie D1 locale ; relecture des textes de `src/admin/textes.ts`.
 */
import { exports } from 'cloudflare:workers';
import { it, expect, afterEach, beforeEach } from 'vitest';
import {
  BASE,
  NOM_COOKIE_SESSION,
  assurerSchema,
  compter,
  nettoyer,
  obtenirDB,
  semerBrouillonEmplacement,
  semerBrouillonFormulaire,
  semerBrouillonReglage,
  semerSession,
} from './outils-publication.ts';
import * as textes from '../../src/admin/textes.ts';
import {
  MESSAGE_ECHEC,
  MESSAGE_RESEAU,
  messageErreurCorrection,
} from '../../src/admin/ilots-svelte-5/message-erreur-correction.ts';

const ORIGINE = 'https://example.com';
const OFFRE = textes.TEXTE_BOUTON_REVENIR_VERSION_PUBLIEE;

beforeEach(async () => {
  await assurerSchema();
  await nettoyer();
});
afterEach(nettoyer);

async function lire(route: string, cookie: string): Promise<string> {
  const reponse = await exports.default.fetch(
    new Request(`${BASE}${route}`, { headers: { cookie: `${NOM_COOKIE_SESSION}=${cookie}` } }),
  );
  expect(reponse.status).toBe(200);
  return reponse.text();
}

function poster(route: string, cookie: string): Promise<Response> {
  return exports.default.fetch(
    new Request(`${BASE}${route}`, {
      method: 'POST',
      headers: { origin: ORIGINE, cookie: `${NOM_COOKIE_SESSION}=${cookie}` },
    }),
  );
}

it('SC-04b — Accueil en brouillon offre le geste ; Contact, la carte Réseaux sociaux et Devis atelier ne l’offrent pas', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'accueil', 'presentation', { nature: 'texte-riche', markdown: 'Accueil corrigé.' });

  // Act
  const accueil = await lire('/admin/pages/accueil', cookie);
  const contact = await lire('/admin/pages/contact', cookie);
  const reglages = await lire('/admin/reglages', cookie);
  const atelier = await lire('/admin/formulaires/devis-atelier', cookie);

  // Assert
  expect(accueil).toContain(OFFRE);
  expect(contact).not.toContain(OFFRE);
  const carteReseaux = /<section[^>]*aria-labelledby="carte-reseaux"[\s\S]*?<\/section>/.exec(reglages)?.[0];
  expect(carteReseaux, 'la carte Réseaux sociaux').toBeDefined();
  expect(carteReseaux).not.toContain(OFFRE);
  expect(atelier).not.toContain(OFFRE);
});

it('SC-04b — un formulaire qui porte un brouillon offre le geste, son voisin sans brouillon non', async () => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonFormulaire(db, 'devis-gateau', { champs: {}, derniersNumeros: {} });

  // Act
  const gateau = await lire('/admin/formulaires/devis-gateau', cookie);
  const atelier = await lire('/admin/formulaires/devis-atelier', cookie);

  // Assert
  expect(gateau).toContain(OFFRE);
  expect(atelier).not.toContain(OFFRE);
});

function messagesDuGeste(): string[] {
  const messages: string[] = [];
  for (const [nom, valeur] of Object.entries(textes)) {
    if (!/revenir/i.test(nom)) continue;
    if (typeof valeur === 'string') messages.push(valeur);
    if (typeof valeur === 'function') {
      const appel = valeur as (...arguments_: unknown[]) => unknown;
      for (const jamaisPubliee of [false, true]) {
        const texte = appel('Devis gâteau', 'Le formulaire', jamaisPubliee);
        if (typeof texte === 'string') messages.push(texte);
      }
    }
  }
  // Ce que l'îlot affiche aussi, sans « revenir » dans le nom de l'export.
  messages.push(textes.TEXTE_BOUTON_GARDER_MODIFICATIONS, textes.TEXTE_NATURE_PAGE, MESSAGE_RESEAU);
  messages.push(...[401, 404, 409, 500].map((statut) => messageErreurCorrection(statut)));
  return messages;
}

it('SC-04c — le geste, la confirmation et leurs messages, pour une page, un réglage et un formulaire, ne portent aucun terme de développeur', () => {
  // Arrange : tout texte du geste de retour exporté, constante ou fonction du nom.
  const TERMES = [
    'commit',
    'branche',
    'build',
    'déploiement',
    'deploiement',
    'serveur',
    'requête',
    'http',
    'json',
    'erreur',
    'api',
    'base de données',
    'cache',
    'dépôt',
    'github',
    'cloudflare',
    'identifiant',
    'undefined',
  ];
  const messages = messagesDuGeste();

  // Act / Assert
  expect(messages.length).toBeGreaterThanOrEqual(8);
  // La confirmation d'un formulaire est celle du ticket, nom en texte.
  expect(messages).toContain('Les modifications du formulaire « Devis gâteau » seront perdues.');
  expect(messages).toContain(textes.TEXTE_BOUTON_GARDER_MODIFICATIONS);
  expect(messages).toContain(MESSAGE_ECHEC);
  for (const message of messages) {
    for (const terme of TERMES) {
      expect(message.toLowerCase(), `« ${terme} » est un terme de développeur (FR-117) dans « ${message} »`).not.toMatch(
        new RegExp(`(^|[^\\p{L}])${terme}([^\\p{L}]|$)`, 'u'),
      );
    }
  }
});

it.each([
  ['une page', '/admin/pages/page-inconnue/revenir'],
  ['un réglage', '/admin/reglages/reglage-inconnu/revenir'],
  ['un formulaire', '/admin/formulaires/formulaire-inconnu/revenir'],
])('SC-04e — en session, le geste qui désigne %s que la déclaration ne porte pas est refusé (404), sans erreur du serveur, aucun brouillon supprimé', async (_nature, route) => {
  // Arrange
  const db = obtenirDB();
  const cookie = await semerSession(db);
  await semerBrouillonEmplacement(db, 'page-inconnue', 'presentation', { nature: 'texte-riche', markdown: 'Orphelin.' });
  await semerBrouillonEmplacement(db, 'tarifs', 'presentation', { nature: 'texte-riche', markdown: 'Tarifs.' });
  await semerBrouillonReglage(db, 'mention', 'Mention.');
  await semerBrouillonFormulaire(db, 'formulaire-inconnu', { champs: {}, derniersNumeros: {} });
  await semerBrouillonFormulaire(db, 'devis-gateau', { champs: {}, derniersNumeros: {} });

  // Act
  const reponse = await poster(route, cookie);

  // Assert
  expect(reponse.status).toBe(404);
  expect(await reponse.json()).toEqual({ ok: false, raison: 'introuvable' });
  expect(await compter(db, 'brouillons_emplacements')).toBe(2);
  expect(await compter(db, 'brouillons_reglages')).toBe(1);
  expect(await compter(db, 'brouillons_formulaires')).toBe(2);
});
