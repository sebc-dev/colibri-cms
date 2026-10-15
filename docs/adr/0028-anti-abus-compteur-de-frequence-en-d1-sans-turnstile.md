# ADR-0028 : Anti-abus — un compteur de fréquence en D1, à empreintes de fenêtre, sans Turnstile
Statut : Accepté | Date : 2026-10-15

Promu depuis `docs/legacy/1.x/adr/0012-anti-abus-turnstile-et-compteur-a-empreintes-de-fenetre.md` —
ADR-0012, accepté sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x, **sauf ce que l'amendement de la
> promotion change** : le titre, la Décision, et les points marqués *(amendé)* ou *(ajouté)* — le
> § « Amendée à la promotion » dit quoi et pourquoi ; les points retirés restent lisibles dans
> l'archive. Les renvois `FR-xxx`, `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers
> `docs/legacy/1.x/` : ce ne sont pas des noms de fichier. Dans le texte d'origine, chaque renvoi à une
> autre décision porte la mention « (1.x) » — c'est son numéro du cycle 1.x ; dans le texte amendé, un
> numéro sans mention est un numéro 2.x (correspondance : [`README.md`](./README.md)).

**Modèle** : aucun delta. La base (`colibri-cms.d1`) et la relation `colibri-cms.worker.platform →
colibri-cms.d1` sont déjà modélisées ; Turnstile, jamais entré au modèle, n'y entrera pas.

## Contexte

`FR-062` fait rejeter les demandes émises depuis une même origine au-delà d'un seuil, et
`FR-007` fait de même pour les tentatives d'ouverture de session. Les deux demandent
littéralement un **seuil de fréquence** — un compteur, pas une preuve d'humanité — et `FR-062`
exige de le faire « sans exiger de compte du visiteur ».

**Une « même origine » est une adresse IP, donc une donnée personnelle**, et c'est ce qui rend
la forme du compteur décisive. Un hachage simple n'en fait **pas** une pseudonymisation : la
recette d'un hachage est publique, si bien qu'on ne *renverse* pas une empreinte — on hache un
candidat et on compare. Vérifier qu'une personne dont on connaît l'adresse est passée coûte
donc **une** opération ; et balayer l'espace IPv4 entier a été **mesuré à ~110 s** sur un poste
à douze cœurs, moins d'une seconde sur une carte graphique. La taille de l'espace n'y change
rien : l'attaque par confirmation vaut identiquement en IPv6, et une adresse tronquée se
confirme comme une adresse entière.

L'ordre des deux moyens décide de leur coût : Turnstile est gratuit et ses vérifications sont
données pour **illimitées en mode *managed*** (docs Turnstile · *Plans*, 2026-04-16,
« Unlimited challenges »), quand le compteur vit dans un Worker plafonné à **100 000 requêtes
par jour**.

Faits sourcés :
[`docs/legacy/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md`](../legacy/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md).

*(ajouté)* **Ce qui a changé depuis.** Le change `012-envoi-des-demandes-de-devis` est le premier à
écrire le compteur. Deux faits du dépôt, absents en 1.x, pèsent sur la forme :
- **Le site public et l'administration partagent une origine** (SEC-1) : le script de Turnstile serait
  le premier script d'une autre origine chargé sur l'origine qu'habite la session de l'éditrice.
  Aucune page n'en charge aujourd'hui, et la politique de l'administration n'admet que `'self'` (`I12`).
- **Un Durable Object exige un point d'entrée de Worker propre au produit** pour exporter sa classe ;
  or `wrangler.astro.jsonc` documente que poser `main` détourne le build d'Astro de son propre graphe de
  pages (mesuré). D1, elle, est déjà liée et porte déjà le plafond horaire de la connexion (FR-006).

## Décision

*(amendé)* Nous tiendrons l'anti-abus par un **compteur de fréquence en D1**, **sans Turnstile**.

Ce compteur portera une **table d'origines** — jamais une ligne durable par visiteur. Chaque origine y
entrera sous une empreinte **HMAC**, sous une clé **tirée au hasard par le produit pour la seule
fenêtre de comptage en cours** ; au premier comptage d'une fenêtre nouvelle, **la clé et les entrées
de la fenêtre précédente seront effacées ensemble, en une seule écriture indivisible**, avant que rien
ne soit compté, et aucune entrée ne sera jamais comptée sous la clé d'une autre fenêtre.

L'origine est l'adresse IP que la plateforme attribue à la requête. La durée de la fenêtre et les
seuils sont fixés au niveau specs — capacité `seuil-par-origine` du change `012` : une heure,
5 demandes, 20 tentatives de connexion, chaque surface sous son propre compte. Une erreur de la base
refuse la sollicitation : la protection ne s'ouvre pas sur une panne.

## Conséquences

**Positives.**

- *(amendé)* **Rien de dérivé d'une origine n'est compté au-delà de sa fenêtre, ni gardé au-delà de
  la première sollicitation de la fenêtre suivante.** La forme d'origine en faisait une propriété
  statique, portée par le nom de l'objet ; sans objet, ses trois falsifications sont du comportement à
  l'exécution, et c'est la spec `seuil-par-origine` qui les porte en scénarios testés (aucune adresse
  IP en clair, clé et entrées effacées ensemble, deux fenêtres jamais sous la même clé).
- **La clé n'entre pas à l'inventaire des secrets** : personne ne la crée, ne la range ni ne la
  remet — le produit la fabrique et la jette. Il n'y a donc **aucune rotation à tenir à la
  main**, celle-ci étant automatique par construction.
- *(amendé)* **Aucun objet n'est créé dans l'infrastructure de la plateforme.** Le compteur vit dans
  des tables de la base déjà liée ; aucun nom d'objet ne peut devenir l'empreinte d'une adresse.
- Ce compteur est le **seul endroit du produit** qui retienne quoi que ce soit tiré d'une
  adresse IP : une demande enregistrée ne porte que sa date, son formulaire et sa page
  d'origine (`FR-067`), et ses coordonnées sont saisies par le visiteur lui-même.
- *(ajouté)* **Aucun script d'une autre origine sur l'origine commune.** La politique du site public
  peut rester à `'self'`, comme celle de l'administration ; SEC-1 tient sans exception.
- *(ajouté)* **Aucune liaison, aucun secret, aucun point d'entrée nouveaux** : ni clé de vérification
  Turnstile à créer au nom de la cliente, ni classe de Durable Object à exporter.

**Négatives — ce à quoi le code s'engage.**

- **Contre qui lit à la fois la table et la clé, l'empreinte ne protège rien.** Elle vaut
  contre la fuite **partielle** — une table lue sans sa clé, une sauvegarde ancienne — et
  contre la conservation qui n'a pas lieu d'être. Ce lecteur-là dispose de toute façon, dans la
  même base, des coordonnées en clair de tout visiteur ayant envoyé une demande (`FR-057`).
- *(amendé)* **Le compteur partage la base des brouillons et des sessions.** D1 sérialise ses
  écritures, et chaque sollicitation en coûte une ou deux ; sous une attaque soutenue, le quota
  gratuit d'écritures peut s'épuiser — le compteur refuse alors toute sollicitation, et
  l'administration perd ses écritures jusqu'au renouvellement du quota.
- *(amendé)* **La durée de la fenêtre et la valeur des seuils ne sont pas fixées ici** — ni `FR-007`
  ni `FR-062` ne les chiffrent ; la spec `seuil-par-origine` le fait. La propriété tient quelle que
  soit leur valeur.
- *(amendé)* **Aucune des trois falsifications n'est statique.** Sans objet nommé, rien de la
  promesse ne se lit dans les sources : un contrôle de `docs/ci.md` n'a rien à porter, et l'invariant
  `I7`, qui tenait le nom de l'objet, perd son objet. Une entrée qui survit à sa fenêtre ne casse
  aucun écran : seuls les tests de la spec la voient.
- *(ajouté)* **Les entrées de la dernière fenêtre restent tant qu'aucune sollicitation ne vient.**
  L'effacement a lieu au premier comptage de la fenêtre suivante, jamais par une minuterie : sans
  trafic, la base garde la clé et les empreintes d'une fenêtre — jamais plus, jamais une accumulation.
- *(ajouté)* **Un robot qui change d'adresse IP passe le seuil.** Sans preuve d'humanité devant le
  compteur, un envoi automatisé réparti sur plusieurs adresses atteint la boîte de l'éditrice ;
  l'e-mail reste inerte (ADR-0002). Rouvrir Turnstile demande une décision qui supersède celle-ci.
- *(ajouté)* **Trois ADR acceptés supposaient Turnstile** et se lisent désormais avec celui-ci (la
  redirection vit dans [`README.md`](./README.md)) : la clause d'ADR-0004 qui fait prévoir
  `challenges.cloudflare.com` à la politique de sécurité est levée — aucune politique n'admet d'hôte
  tiers ; les deux clés Turnstile que range ADR-0005 n'existent plus, et le champ `turnstilePublicKey`
  d'`instance.json` n'a plus de lecteur — son retrait, et celui de l'exemple que l'invariant `I8` en
  donne, est un geste ultérieur ; l'exception « hors Turnstile » d'ADR-0006 n'a plus d'objet.

## Alternatives considérées

- **Une règle Cloudflare Rate Limiting** : écartée car sa disponibilité et ses limites sur le
  palier gratuit ne sont pas sourcées — elle ne peut donc pas descendre en décision figée.
- **Une clé HMAC ouverte à la livraison, à rotation** : écartée car elle remet le troisième
  secret que la session opaque de [ADR-0006 (1.x)](../legacy/1.x/adr/0006-auth-implementation-maison-sur-d1.md)
  venait de retirer ; sa rotation n'a **aucun porteur** — ni ligne de recette, ni exigence, ni
  contrôle — et elle protège moins qu'il n'y paraît, la clé vivant dans le compte qui héberge
  déjà la table *et* les coordonnées en clair des visiteurs.
- **La même, sans rotation** : écartée car elle garde le coût en perdant le motif.
- **Le comptage en mémoire seule** : écartée car il ne persiste rien, mais rend le seuil gratuit
  à qui provoque le recyclage de l'objet.
- **La troncature de l'adresse** : écartée car sans aucun effet sur l'attaque par confirmation,
  qui ne balaie pas l'espace mais teste un candidat connu.
- *(ajouté)* **Turnstile *managed* devant le compteur** (la forme d'origine) : écartée par arbitrage
  humain le 2026-10-15. `FR-062` ne demande qu'un seuil par origine ; Turnstile chargerait le premier
  script d'une autre origine sur l'origine de la session (SEC-1), ajouterait une clé de vérification
  au compte de la cliente, et alourdirait les pages où `SC-005` se mesure.
- *(ajouté)* **Le compteur dans un Durable Object unique** (la forme d'origine) : écartée car elle
  exige un point d'entrée de Worker propre au produit, que le build d'Astro ne tolère pas sans
  détour mesuré, pour une propriété que D1 tient à l'identique — clé et entrées effacées ensemble.

## Amendée à la promotion

Promue le 2026-10-15 par le change `012-envoi-des-demandes-de-devis`, le premier à écrire le
compteur. Deux points de la décision d'origine changent ; le reste est repris tel quel.

1. **Turnstile est retiré.** Arbitrage humain du 2026-10-15 : la protection se limite au seuil que
   `FR-007` et `FR-062` demandent, sans script d'une autre origine. Retirés en conséquence : la
   conséquence positive « Turnstile absorbe le volume avant que le compteur ne soit sollicité » et la
   réserve sur la hauteur du mur Turnstile.
2. **Le compteur passe d'un Durable Object unique à D1.** La propriété décisive — clé de fenêtre
   fabriquée et jetée par le produit, effacée avec ses entrées — est conservée ; l'effacement devient
   paresseux (au premier comptage de la fenêtre suivante). L'invariant `I7` et le candidat
   `objet-de-frequence-nomme-par-une-constante`, qui tenaient le nom de l'objet, sont **retirés** par
   cet ADR.

Retouchés en conséquence, marqués *(amendé)* ou *(ajouté)* : le titre, la Décision, un paragraphe de
contexte ajouté, deux conséquences positives amendées et deux ajoutées, trois conséquences négatives
amendées et trois ajoutées, deux alternatives ajoutées, et la vérification.

## Vérifiable ?

*(amendé)* Non par un contrôle statique : sans objet nommé, la propriété n'a plus de trace dans les
sources, et `I7` est retiré. Elle se vérifie par les scénarios de la spec `seuil-par-origine` (change
`012`) — aucune adresse IP en clair dans la base, clé et empreintes effacées ensemble au changement de
fenêtre, deux fenêtres sous deux clés —, joués contre la vraie D1 dans `workerd` (ADR-0014).

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, forme du compteur
  arbitrée le 2026-08-12 par le traitement de `S-02`, réserve rétablie le même jour par celui
  de `S-11`. Revue humaine : 2026-08-13.
- *(ajouté)* Promotion amendée instruite par l'agent pour le change `012` : retrait de Turnstile tranché
  par l'humain le 2026-10-15 ; passage à D1 proposé par le `design.md` du change (§ D8), accepté avec la
  fusion de la PR #242.
