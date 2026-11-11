## Context

Voir `proposal.md` — Why pour le constat de recette et ses mesures.

État du code au change 017 :

- `src/pages/admin/adresse-e-mail.astro`, étape `verifier` : `etatAdresse()` rend `verifiee`,
  `ecrireCodeDeRemplacement()` écrit le code et compte un message au plafond dans la même requête
  groupée, puis l'envoi part dans `waitUntil`. L'écran passe à l'étape du code sans connaître l'issue ;
  un refus ne laisse qu'une ligne de journal (`[adresse] envoi du code échoué`).
- `src/platform/adresses-cloudflare/index.ts` : `etatAdresse()` lit le champ `verified` de l'adresse,
  qui est un horodatage (constaté en recette : `2026-11-11T08:37:23.130447Z`), et n'en garde qu'un
  booléen.
- `src/platform/auth/remplacement-adresse.ts` : `libererMessageRemplacement()` rend déjà une place du
  plafond, pour le cas d'une adresse déjà inscrite.

Contraintes : l'ADR-0033 (deux preuves, plafond, API des adresses confinée à son adaptateur, `I18`) ;
l'ADR-0002 (messages en texte seul) ; `I6` (route gardée) ; `I4` (aucune directive `client:*` dans un
gabarit de `src/admin/`) ; FR-117.

Un fait de plateforme borne les options : le travail confié à `waitUntil` ne survit qu'une trentaine
de secondes après la réponse. La fenêtre de refus observée dépasse trente secondes ; un réessai en
tâche de fond ne peut donc pas la couvrir.

## Goals / Non-Goals

**Goals :**

- L'écran ne dit « Un code vient de partir » que si l'envoi a été accepté.
- Le geste naturel (cliquer, revenir, presser le bouton) aboutit sans consommer le plafond en essais
  perdus.
- Aucune table, aucune colonne, aucun secret, aucun script de navigateur nouveau.

**Non-Goals :**

- Garantir l'arrivée du message dans la boîte (indésirables, filtres) : le produit ne connaît que
  l'acceptation de l'envoi par la plateforme.
- Rafraîchir l'écran tout seul pendant l'attente : cela demanderait un script de navigateur.
- Changer le plafond de cinq messages ou la durée de vie du code.

## Decisions

### D1 — Attendre une minute après l'instant de vérification, sans rien écrire

`etatAdresse()` rend, avec l'état `verifiee`, l'instant de vérification lu dans `verified`. L'étape
`verifier` compare cet instant à l'heure courante : en dessous de `DELAI_APRES_CONFIRMATION_MS`
(60 000), elle ne réserve aucune place, n'écrit aucun code, n'envoie rien, et l'écran affiche le texte
d'attente (`ux.md`). La constante vit dans `src/core/auth/`, à côté des constantes du plafond.

La même épreuve vaut pour « Recevoir un nouveau code » : les deux gestes passent par l'étape
`verifier`.

Un instant de vérification illisible (champ non daté) est traité comme ancien : le code part, et D2
reste le filet.

*Pourquoi une minute.* Les refus observés vont jusqu'à 30 s après le clic, les succès commencent à
45 s. Soixante secondes laissent une marge sans rendre l'attente pénible ; le délai réel n'est pas
documenté par Cloudflare, d'où D2.

*Écarté.* Faire attendre la requête jusqu'à la fin de la minute : une page qui charge cinquante
secondes ressemble à une panne. Réessayer en tâche de fond pendant une minute : `waitUntil` ne tient
pas ce délai, et l'écran aurait déjà menti.

### D2 — Attendre l'issue de l'envoi, réessayer brièvement, puis dire le refus

L'envoi du code sort de `waitUntil` : la route l'attend. Trois tentatives au plus, séparées de 1 s
puis 2 s (soit au pire trois secondes d'attente ajoutées). Si l'une est acceptée, l'écran passe à
l'étape du code. Si toutes sont refusées :

1. le code écrit pour cette demande est annulé (`annule_le`) ;
2. sa place au plafond est rendue (`libererMessageRemplacement`, même instant) ;
3. l'écran reste à l'étape précédente et affiche le texte de l'envoi refusé (`ux.md`) ;
4. la ligne de journal existante est gardée, sans adresse ni code.

L'avis à l'ancienne adresse (ticket 07 du 017) reste dans `waitUntil` : la spec dit qu'un avis qui
échoue ne défait rien, et il part vers une adresse vérifiée de longue date.

*Écarté.* Envoyer d'abord, écrire le code ensuite : l'épreuve du plafond est indivisible de
l'écriture (spec du 017), et deux demandes simultanées pourraient envoyer deux messages pour une
place.

### D3 — Le refus du plafond garde l'étape du code

Quand `ecrireCodeDeRemplacement()` rend `null` pour cause de plafond, la route regarde si la session
tient un code encore bon (non servi, non annulé, non expiré). Si oui, l'écran rend l'étape du code
avec le texte du plafond ; sinon, l'étape de la confirmation, comme aujourd'hui. La lecture est une
fonction de `src/platform/auth/remplacement-adresse.ts`.

### D4 — L'adresse revient à la ligne

Les paragraphes de la carte qui portent une adresse reçoivent la classe utilitaire de césure
(`break-words`, avec `overflow-wrap: anywhere` si la classe seule ne coupe pas avant l'arobase). Aucune
couleur, aucune feuille nouvelle (`I14`).

### Conformité

- `I6` : la route garde son import du garde de session, rien ne change.
- `I18` : l'instant de vérification est lu dans l'adaptateur, seul fichier à connaître l'API.
- `I2` : la constante du délai est une valeur pure dans `src/core/`.
- `I4`, `I12` : aucun script de navigateur, aucune directive `client:*`.
- ADR-0033 : les deux preuves, le plafond et l'atomicité de la bascule sont inchangés. Aucune décision
  structurante nouvelle ; pas d'ADR.

## Architecture

**Éléments touchés (FQN) :** `colibri-cms.worker.routes` (la route de l'écran),
`colibri-cms.worker.platform` (adaptateur des adresses, code de remplacement, envoi),
`colibri-cms.worker.core` (constante du délai), `colibri-cms.worker.admin` (textes, carte).

**Relations ajoutées / retirées :** aucune. Les imports existent déjà depuis le change 017.

## Risks / Trade-offs

- [Le délai réel de Cloudflare dépasse une minute certains jours] → D2 : l'écran dit le refus, la
  place est rendue, l'éditrice redemande.
- [Une demande de nouveau code dont l'envoi reste refusé annule aussi le code précédent] → accepté :
  c'est la règle « un nouveau code annule le précédent », et le cas ne se présente qu'avec un envoi
  refusé après une minute, ce que la recette n'a jamais observé.
- [Trois secondes d'attente de plus sur un envoi refusé] → accepté, et borné.
- [L'horloge du Worker et celle de Cloudflare diffèrent] → l'écart est de l'ordre de la seconde, la
  marge est de quinze.
- [Le double de test de l'API ne rendait qu'un `verified` non daté] → le double rend désormais un
  horodatage, et le temps du test est injecté.

## Migration Plan

Aucune migration de base. Déploiement ordinaire. Retour arrière : revenir à la version précédente ;
aucun état nouveau n'est laissé en base.

Recette : rejouer CT-47.2 sur `colibri.sebc.dev` avec une adresse neuve, et ajouter au cahier un cas
pour la confirmation de moins d'une minute.
