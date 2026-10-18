# ADR-0030 : Le retrait d'une demande — un témoin réduit à son formulaire et à sa suite, tenu par la base ; aucun effacement d'office
Statut : Accepté | Date : 2026-10-17

Né sous le cycle 2.x, sans antécédent 1.x : tranché le 2026-10-17 par l'arbitrage humain du change
`013-reception-et-suivi-des-demandes` (`design.md` § D1), le premier à garder une demande en base. Il
complète [ADR-0019](./0019-magasin-d1-brouillons-etat-publie-et-demandes.md) sans le contredire.

## Contexte

ADR-0019 a décidé que D1 porte les demandes. Jusqu'au change `013`, aucune n'y entre : la route d'envoi
du change `012` achemine l'e-mail et ne garde rien. Le change `013` garde chaque demande acceptée (FR-065,
FR-066) avec ce que le visiteur a envoyé — nom, adresse e-mail, téléphone, message, choix, total, page et
date de réception (FR-067, FR-068). C'est la première fois que la base d'une instance porte des données
personnelles de visiteurs.

Le retrait doit tenir quatre exigences qui tirent en sens contraires :
- **FR-073, FR-074** — l'éditrice retire une demande, ou une sélection, en déclarant un motif : ordinaire
  ou indésirable ;
- **FR-078** — une demande retirée continue d'être comptée **après** que son contenu a cessé d'être
  conservé ; une commande retirée reste comptée parmi les commandes (FR-075) ;
- **FR-076** — un retrait indésirable n'est compté dans aucun nombre ;
- **FR-079** — le produit ne fait disparaître aucune demande de lui-même.

La durée est déjà arrêtée par le cahier des charges du cycle 1.x : aucune purge automatique, aucune
échéance affichée ; le produit ne décide pas d'une durée à la place de celle à qui les données sont
confiées, il rend l'effacement praticable (`docs/legacy/1.x/prd.md`, « Arrêté par ce PRD », d'après
`docs/legacy/research/2026-08-10-retention-donnees-demandes-devis.md`). Le cadrage juridique —
information du visiteur, politique de durée écrite, sous-traitance — reste ouvert sous **DAT-1**
(`docs/vision.md`).

Le design du change proposait une contrainte `check` sur la table, et affirmait qu'une colonne ajoutée
plus tard « devra entrer dans la contrainte pour qu'une migration passe ». Un essai du 2026-10-17, dans
un SQLite jetable (3.51, le moteur de D1), a démenti la seconde moitié : une colonne ajoutée par
`alter table … add column` échappe à une contrainte posée sur la table, la migration passe sans erreur,
et la base accepte ensuite une valeur dans cette colonne sur une demande déjà retirée.

## Décision

1. **Une demande acceptée est gardée entière** dans une table `demandes` de D1, jusqu'au geste de
   l'éditrice. Aucune durée ne s'applique et aucun effacement n'a lieu d'office (FR-079).
2. **Un retrait ordinaire réduit la demande à un témoin.** La ligne reste et ne garde que cinq valeurs :
   son identifiant tiré au hasard, l'identifiant et le nom de son formulaire d'origine, sa suite, et son
   état `retiree`. Tout le reste — coordonnées, valeurs saisies, choix, total, page d'origine, date de
   réception, mention d'e-mail — est effacé dans la même écriture. Aucune des cinq valeurs gardées ne
   vient du visiteur.
3. **Un retrait indésirable supprime la ligne.** Rien n'en reste, et la demande n'est comptée nulle part.
4. **Les nombres se lisent sur les lignes**, présentes et témoins, jamais sur des compteurs tenus à part.
5. **La base tient la règle, pas le code qui retire.** Une contrainte `check` refuse toute ligne
   `retiree` qui porte une valeur hors des cinq gardées.
6. **Une colonne nouvelle est présumée venir du visiteur.** Un test, joué dans `workerd` (ADR-0014), lit
   les colonnes de la table dans la base elle-même (`PRAGMA table_info`) et vérifie que chacune, hors la
   liste fermée des cinq, est refusée sur une demande retirée. Une colonne ajoutée sans sa clause fait
   échouer ce test. Elle s'ajoute par `alter table … add column` avec sa propre clause
   (`check (etat = 'presente' or <colonne> is null)`), sans reconstruire la table : l'essai du
   2026-10-17 montre que la base refuse alors la valeur sur une demande retirée et l'accepte sur une
   demande présente. Allonger la liste des cinq change cette décision et demande un nouvel ADR.
7. **Un retrait est définitif** : aucun moyen du produit — corbeille, annulation, restauration — ne fait
   reparaître une demande retirée.

## Conséquences

**Positives.**
- **Un oubli ne fuit pas.** Le code qui retire ne peut pas laisser une coordonnée derrière lui : la base
  refuse l'écriture, et un retrait groupé, écrit en une transaction, échoue alors en entier. Une
  migration future ne peut pas l'oublier non plus sans faire échouer le test.
- **Après un retrait ordinaire, la base ne porte plus aucune donnée du visiteur** : le nom d'un
  formulaire et une suite ne disent rien de lui.
- **Les nombres sont une lecture de l'état.** Aucun second registre n'est à tenir d'accord ; la somme des
  nombres des formulaires égale celle du site par construction ; une commande retirée reste comptée parce
  que sa suite reste sur son témoin.
- **Le spam ne laisse aucune trace** : quarante demandes automatisées retirées comme indésirables rendent
  exactement les nombres d'avant leur arrivée.
- **Le témoin garde le nom du formulaire** : une demande retirée se compte sous un nom lisible même
  après que l'intégrateur a retiré ce formulaire de la déclaration.

**Négatives — ce à quoi le code s'engage.**
- **La base garde des données personnelles sans durée.** C'est l'arrêt du cahier des charges, pas un
  oubli ; DAT-1 doit pourtant être cadré avant la première mise en ligne, et le produit n'y supplée pas.
- **L'historique restaurable de D1 garde une demande effacée.** Time Travel est toujours actif et ne se
  coupe pas ; il remonte 7 jours sur le palier gratuit, 30 jours sur le palier payant (documentation
  Cloudflare, lue le 2026-10-17). Pendant cette durée, une demande retirée reste atteignable depuis le
  compte Cloudflare de la cliente, jamais depuis l'administration ; restaurer la base la ferait
  reparaître avec tout le reste. « Effacé définitivement », dans un texte de l'éditrice, veut donc dire :
  par le produit. Le change `012` a déjà assumé le même résidu pour le compteur de fréquence.
- **La copie e-mail échappe au produit.** Chaque demande existe aussi dans la boîte de l'adresse
  autorisée ; le retrait ne l'y touche pas, et le dialogue de retrait le rappelle.
- **La garantie suppose que la base vérifie ses contraintes.** D1 documente un
  `PRAGMA ignore_check_constraints` qui couperait cette vérification ; aucun code ni aucune migration ne
  l'emploie (`I17`).
- **Chaque migration future de la table porte une obligation** : une colonne du visiteur arrive avec sa
  clause, sinon le test échoue ; une colonne qu'on voudrait garder après un retrait demande un nouvel ADR.
- **Les témoins s'accumulent sans borne.** Chaque retrait ordinaire laisse une petite ligne, pour
  toujours, dans les 500 Mo de la base (ADR-0019). Le seuil du compteur de fréquence (ADR-0028) borne le
  rythme d'arrivée des demandes ; le coût reste négligeable sur la vie d'un site vitrine.
- **Un retrait par erreur est sans recours dans le produit.** Il n'existe pas de corbeille : la demande ne
  se retrouve que dans la boîte e-mail. Le dialogue de confirmation porte seul la prévention.

## Alternatives considérées

- **Des compteurs incrémentés au retrait, la ligne supprimée** : écartée — deux écritures à garder
  cohérentes, et un écart impossible à réparer après coup, puisque les lignes qui l'expliqueraient
  n'existent plus.
- **Deux tables, le témoin d'un côté, le contenu du visiteur de l'autre** — un retrait supprime la ligne
  de contenu, quelles que soient ses colonnes, et un déclencheur empêche qu'elle survive au retrait : la
  garantie la plus forte, écartée parce qu'elle redessine le change (réception en deux écritures, liste
  par jointure, déclencheur à tenir) quand un test ferme le même trou.
- **La contrainte de table seule** : écartée — l'essai du 2026-10-17 montre qu'une colonne ajoutée plus
  tard lui échappe en silence.
- **L'effacement confié au seul code de retrait** : écartée — une colonne oubliée fuit sans que rien ne
  le signale.
- **Un retrait qui masque la demande sans l'effacer** : écartée — FR-078 compte une demande retirée
  « après que son contenu a cessé d'être conservé ».
- **Une durée appliquée par le produit**, une purge après quelques mois : écartée par le cahier des
  charges et FR-079 — le produit ne choisit pas une durée à la place de la responsable des données.
- **Une corbeille, ou l'annulation d'un retrait** : écartée — elle garderait ce que le retrait promet
  d'effacer.

## Vérifiable ?

Par les scénarios du change `013` — un retrait ordinaire ne laisse aucune valeur du visiteur, un retrait
indésirable ne laisse rien, les nombres, le produit n'efface rien de lui-même —, par la contrainte de la
migration `0013_demandes.sql`, et par le test de la liste fermée des cinq colonnes. La règle « une
demande retirée ne garde rien du visiteur » porte sur le contenu des données, sans trace dans les imports
ni dans l'arborescence : elle n'entre pas dans la table de `docs/architecture.md`. L'interdiction de
couper la vérification des contraintes, elle, laisse une trace : elle **crée `I17`**.

**Modèle** : aucun delta. La base (`colibri-cms.d1`, `sourceDir migrations`) et la relation
`colibri-cms.worker.platform → colibri-cms.d1` sont modélisées ; la description de la base et les vues
`flow-demande` et `flow-suivi-demandes` changent avec le code qui les pose (change `013`, `design.md`
§ Architecture) ; pas de vue `adr-0030`.
