# 05 — Une correction des options s'enregistre au brouillon du formulaire

**Bloqué par :** 03
**Vérif :** test
**Fichiers :** `migrations/0008_brouillons_formulaires.sql`, `src/platform/formulaires/magasin.ts`, `src/pages/admin/formulaires/[id]/options.ts`, `tests/unit/formulaires/magasin-schema.test.ts`, `tests/integration/enregistrer-options.test.ts`

## Ce que ça livre

L'éditrice peut désormais enregistrer, en un geste, toutes les options d'un formulaire — libellés,
prix, options ajoutées, retirées ou déplacées : le formulaire porte alors **son propre brouillon**, sans
que la déclaration (`content/formulaires/`) ni le site public soient touchés, et sans marquer aucun
autre formulaire ni aucun réglage (FR-051). Une option conservée garde son identifiant ; une option
ajoutée en reçoit un neuf, stable ensuite. Si une seule valeur est refusée, **rien** n'est enregistré
et la réponse désigne le champ et l'option fautifs. Une écriture sans session, pour un formulaire non
déclaré, illisible, démesurée ou forgée depuis un autre site n'aboutit pas. Ce ticket livre le
comportement par une requête HTTP ; l'écran qui l'appelle arrive au ticket 07.

**Décisions à respecter :**
- Migration **additive** `migrations/0008_brouillons_formulaires.sql` (numéro à reconfirmer par
  `ls migrations/` : `0007_brouillons_reglages.sql` est la dernière à ce jour) : table
  `brouillons_formulaires(formulaire TEXT PRIMARY KEY, contenu TEXT NOT NULL, maj_le INTEGER NOT NULL)`,
  **sans** contrainte `CHECK` sur l'identifiant (les formulaires sont déclarés site par site). Aucune
  table existante touchée. **Une ligne par formulaire**, remplacée entière à chaque enregistrement ;
  `contenu` est le JSON `{ champs: { <idChamp>: [{ id, libelle, prix? }] } }` rendu par le noyau, prix
  en centimes. « Porte un brouillon » se **dérive** de la présence de la ligne, jamais stocké.
- Magasin `src/platform/formulaires/magasin.ts`, sur le patron de `src/platform/reglages/magasin.ts` :
  table recréée défensivement au premier accès (même définition que la migration) ; lire le brouillon
  courant du formulaire → `appliquerOptions` en `core/` (ticket 03) → écrire (*upsert* de la ligne
  entière) **si et seulement si** acceptée. Requêtes D1 **préparées** exclusivement. Il expose aussi la
  lecture de **tous** les brouillons de formulaires et de **celui d'un formulaire** (consommées au
  ticket 06). Aucun journal ne recopie les valeurs saisies.
- Route `POST /admin/formulaires/<id>/options` (`src/pages/admin/formulaires/[id]/options.ts`), sur le
  patron exact de `src/pages/admin/reglages/reseaux.ts` :
  - `verifierSession` importé (`I6`, ADR-0007) → `401` sans session ;
  - `<id>` cherché dans la liste déjà chargée par `src/platform/contenu/formulaires.ts` (ticket 01),
    **jamais** utilisé pour lire un fichier → `404` `{ ok: false, raison: 'introuvable' }` s'il n'est
    pas déclaré ;
  - corps lu par `lireCorpsJsonBorne` de `src/platform/reglages/corps.ts` (64 Kio, `413` au-delà) ;
    JSON invalide ou forme inattendue → `400` `{ ok: false, raison: 'forme-invalide' }` — jamais de
    `5xx` sur une entrée de l'éditrice ;
  - corps attendu `{ champs: [{ id, options: [{ id?, libelle, prix? }] }] }`, `prix` étant le texte
    saisi (« 12,50 »), lu en `core/` ;
  - refus de `core/` → `400 { ok: false, refus: [{ champ, raison }] }` (raisons en **codes**) ;
  - succès → `200 { ok: true, champs }`, `champs` portant les options enregistrées **avec leurs
    identifiants**, pour que l'écran reprenne les identifiants neufs et qu'un second enregistrement ne
    duplique pas les options ajoutées.
- Anti-forgerie : la session `SameSite=Strict` seule (ADR-0011, `I13`), **aucun** jeton dédié — le test
  d'une écriture forgée est celui d'une requête qui n'emporte pas le cookie (patron de
  `tests/integration/corriger-bouton-action.test.ts`).

**Hors périmètre :** l'affichage du brouillon et des marques (ticket 06) ; l'écran qui enregistre
(ticket 07) ; l'abandon d'un brouillon ; l'aperçu et la publication.

## Critères
- [ ] Par la couture HTTP, en session, soumettre « Devis gâteau » avec « Vanille » à « 10 » au lieu de 8 €, toutes les autres options inchangées, fait porter au brouillon de « Devis gâteau » « Vanille » à 10 €, les autres options inchangées   (SC-05a)
- [ ] Par la couture HTTP, en session, soumettre « Devis gâteau » avec l'option « Fraise » renommée « Fraise des bois » fait porter au brouillon « Fraise des bois », au même rang et avec le même identifiant que « Fraise »   (SC-05b)
- [ ] Par la couture HTTP, en session, soumettre « Devis gâteau » avec une option nouvelle « Pistache » à « 12 » ajoutée en fin du champ « Parfum » fait porter au brouillon quatre parfums, « Pistache » en dernier à 12 €, avec un identifiant neuf distinct de ceux des trois autres   (SC-05c)
- [ ] Par la couture HTTP, en session, soumettre « Devis gâteau » sans l'option « Chocolat » fait porter au brouillon « Vanille » puis « Fraise », et aucune option « Chocolat »   (SC-05d)
- [ ] Par la couture HTTP, en session, enregistrer une correction de « Devis gâteau » lui fait porter un brouillon ; « Devis atelier » et les réglages n'en portent pas de nouveau, et la déclaration des formulaires est inchangée   (SC-05e)
- [ ] La table D1 des brouillons de formulaires est créée par une migration versionnée additive, sans toucher aucune table existante   (SC-05f)
- [ ] Par la couture HTTP, une correction d'un formulaire soumise sans session ouverte est refusée et aucun brouillon n'est écrit   (SC-05g)
- [ ] Par la couture HTTP, en session, une correction soumise pour un identifiant qu'aucun formulaire déclaré ne porte reçoit la réponse « introuvable », et aucun brouillon n'est écrit   (SC-05h)
- [ ] Par la couture HTTP, en session, une correction soumise avec un corps qui n'est pas du JSON, dont la forme n'est pas celle attendue, ou de plus de 64 Kio est refusée sans erreur du serveur, et aucun brouillon n'est écrit   (SC-05i)
- [ ] Une écriture d'un formulaire forgée depuis une autre origine n'aboutit pas, la session `SameSite=Strict` n'étant pas attachée à une requête cross-site (ADR-0011)   (SC-05j)
