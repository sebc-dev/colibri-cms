# 08 — Retirer une demande depuis son détail

**Bloqué par :** 06, 07
**Vérif :** tdd
**Fichiers :** `src/pages/admin/demandes/retrait.ts`, `src/core/demandes/retrait.ts`, `src/platform/demandes/magasin.ts`, `src/admin/ilots-svelte-5/EcranDemande.svelte`, `src/admin/ilots-svelte-5/DialogueRetrait.svelte`, `src/admin/ilots-svelte-5/monter.ts`, `src/admin/MontageEcranDemande.astro`, `src/pages/admin/demandes/[id].astro`, `src/admin/textes.ts`, `docs/architecture/flows.c4`, `docs/cahier-de-test.md`, `tests/unit/demandes/retrait.test.ts`, `tests/integration/retrait-d-une-demande.test.ts`, `tests/parcours/demande-retrait.parcours.ts`

## Ce que ça livre

Sur l'`Écran : Demande`, l'éditrice retire une demande (FR-073). Le bouton « Retirer cette demande » ouvre
un dialogue qui dit, avant que rien ne soit retiré, ce qui va se passer :
- titre : « Retirer cette demande ? » ;
- corps : « Tout ce que les visiteurs ont envoyé — choix, coordonnées, message — sera effacé
  définitivement. Ce retrait ne peut pas être annulé. Chaque demande reste dans votre boîte e-mail si elle
  y est arrivée. » ;
- le motif, choix obligatoire, aucun coché d'office :
  - « Retrait ordinaire — la demande reste comptée parmi les retirées, et parmi les commandes si c'en
    était une. » ;
  - « Demande indésirable — elle ne sera plus comptée nulle part. » ;
- les boutons « Retirer », inactif tant qu'aucun motif n'est choisi, et « Annuler ».

Le dialogue s'ouvre le focus sur « Annuler » et retient le focus tant qu'il est ouvert. Échap ou « Annuler »
le referment sans rien changer et rendent le focus au bouton qui l'a ouvert. Pendant le retrait, il dit
« Retrait en cours… », boutons inactifs. En échec, il dit « Le retrait n'a pas pu se faire : aucune demande
n'a été retirée. Réessayez dans quelques instants. » Après un retrait, l'écran mène à la liste, où la
demande ne paraît plus et où les nombres sont à jour.

**Ce que le retrait efface.**
- Un **retrait ordinaire** efface aussitôt tout ce que le visiteur a envoyé — sélections, coordonnées,
  textes, total, page d'origine, date de réception, mention d'e-mail — et ne garde de la demande que son
  formulaire d'origine et sa suite, pour la compter (FR-078). Une commande retirée reste comptée parmi les
  commandes.
- Un **retrait indésirable** efface la demande entière : elle ne compte nulle part.
- Un retrait est **définitif** : aucune corbeille, aucune annulation ne fait reparaître la demande.

Dans ce ticket, un retrait porte sur **une seule** demande. Retirer plusieurs demandes en un geste, depuis
la liste, est le ticket 09. Pour SC-08c, l'éditrice retire donc les deux demandes l'une après l'autre.

**Décisions à respecter (ADR-0030, D5 et D8 de l'approche ; ADR-0007, ADR-0009, ADR-0011, I2, I4, I6, I17) :**
- **La route.** `POST /admin/demandes/retrait` (`src/pages/admin/demandes/retrait.ts`), corps
  `{ ids, motif }` :
  - `verifierSession` en tête ; sans session → 401, rien ne change ;
  - corps borné par `lireCorpsJsonBorne` ;
  - `ids` est un tableau d'**un seul** identifiant textuel dans ce ticket — le ticket 09 porte la borne à
    50 ; `motif` vaut `ordinaire` ou `indesirable` ; ces règles vivent dans `src/core/demandes/retrait.ts`
    (pur, I2) ; toute autre forme → 400 ;
  - réponse `{ ok: true }`.
- **L'écriture** passe par une `db.batch` (transaction D1), en requêtes préparées aux marqueurs `?`
  comptés, jamais par concaténation :
  - `ordinaire` : `update demandes set etat = 'retiree'`, et `recue_le`, `page_titre`, `total`, `contact`,
    `detail`, `courriel` à `null`, `where id in (…) and etat = 'presente'` ;
  - `indesirable` : `delete from demandes where id in (…) and etat = 'presente'`.
- **La base tient la règle.** La contrainte `check` posée au ticket 01 refuse un retrait ordinaire qui
  oublierait une colonne du visiteur. Rien ne coupe la vérification des contraintes (I17).
- **Une demande déjà retirée, ou inconnue,** est laissée telle quelle : jamais comptée deux fois.
- **Le dialogue.** `DialogueRetrait.svelte`, sur le composant `dialog` déjà copié du registre (ADR-0009),
  avec un choix natif du motif ; le ticket 09 le réemploie sur la liste. Il est porté par l'îlot du
  détail, ci-dessous.
- **L'îlot du détail.** `EcranDemande.svelte` est créé par ce ticket. Il emboîte `ChoixSuite.svelte`, la
  liste déroulante de la suite posée au ticket 07, sans la modifier, et porte le bouton « Retirer cette
  demande » et `DialogueRetrait.svelte`. Il est monté par `src/admin/ilots-svelte-5/monter.ts` depuis
  `MontageEcranDemande.astro`, sans directive `client:*` (I4), sur le nœud que
  `src/pages/admin/demandes/[id].astro` lui prépare. Le détail n'affiche aucun nombre : rien n'est à remettre
  à jour après une suite enregistrée. Le détail ne monte plus `MontageChoixSuite.astro`, que la liste garde
  jusqu'au ticket 09. La suite se choisit sur le détail comme avant : les tests du ticket 07
  (`tests/parcours/demandes-suite.parcours.ts`, `tests/integration/suite-d-une-demande.test.ts`) restent
  verts sans retouche.
- **Les textes** vivent dans `src/admin/textes.ts` : bouton, titre, corps, motifs, « Retrait en cours… »,
  échec. Ni « supprimer », ni « base », ni « statut » (FR-117).
- **Le modèle d'architecture.** `docs/architecture/flows.c4` gagne la vue dynamique
  `flow-suivi-demandes` :
  - `editrice -> colibri-cms.worker.routes 'GET /admin/demandes'` ;
  - `colibri-cms.worker.platform -> colibri-cms.d1 'lit les demandes et leurs nombres'` ;
  - `editrice -> colibri-cms.worker.admin 'choisit une suite, retire'` ;
  - `colibri-cms.worker.admin -> colibri-cms.worker.routes 'POST /admin/demandes/…'` ;
  - `colibri-cms.worker.platform -> colibri-cms.d1 'enregistre la suite, efface au retrait'`.
  Puis `likec4 validate --no-layout --json --project colibri-cms docs/architecture`. Aucune relation
  nouvelle.
- **Le cahier de recette.** `docs/cahier-de-test.md` gagne une section pour ce ticket : le dialogue au
  clavier et au lecteur d'écran ; le retour à la liste après un retrait.
- **Parcours.** `tests/parcours/garde-politique.ts` fait échouer tout parcours qui heurte la politique de
  l'administration.
- **Cas limites à couvrir :** motif inconnu ou absent ; `ids` vide, de deux identifiants (refusé dans ce
  ticket), non textuel ; demande déjà retirée ; demande inconnue ; après un retrait ordinaire, toutes les
  colonnes du visiteur sont nulles ; après un retrait indésirable, aucune ligne ne reste ; la demande
  retirée ne paraît plus ni dans la liste ni au détail.

**Hors périmètre :**
- la sélection de plusieurs demandes et le retrait groupé depuis la liste (ticket 09) ;
- l'îlot de la liste, `EcranDemandes.svelte`, et le retrait de `MontageChoixSuite.astro` (ticket 09) ;
- toute corbeille, toute annulation de retrait, tout effacement d'office ;
- l'effacement dans l'historique restaurable de D1 (7 jours) : résidu consigné par ADR-0030.

## Critères
- [ ] Quand l'éditrice retire la demande de Marie Dupont en déclarant le retrait ordinaire, et confirme, la demande ne paraît plus dans la liste, et la base ne porte plus aucune des valeurs que Marie Dupont avait saisies, ni son total, ni sa page d'origine   (SC-08a)
- [ ] Quand l'éditrice demande à retirer une demande, puis renonce à la confirmation, la demande est toujours dans la liste, avec tout son détail et sa suite   (SC-08b)
- [ ] Quand, à partir de quatorze demandes — onze de « Devis gâteau » dont trois de suite « commande », trois de « Devis atelier » —, l'éditrice retire deux demandes « sans suite » de « Devis gâteau » en déclarant le retrait ordinaire, l'écran affiche 12 demandes, 3 commandes et 2 retirées pour le site, et 9 demandes, 3 commandes et 2 retirées pour « Devis gâteau »   (SC-08c)
- [ ] Quand l'éditrice retire, en déclarant le retrait ordinaire, une demande de suite « commande », le nombre de demandes baisse de un, le nombre de retirées monte de un, et le nombre de commandes ne change pas   (SC-08d)
- [ ] Quand un retrait est envoyé sans session ouverte, il est refusé, et aucune demande ni aucun nombre ne change   (SC-08e)
