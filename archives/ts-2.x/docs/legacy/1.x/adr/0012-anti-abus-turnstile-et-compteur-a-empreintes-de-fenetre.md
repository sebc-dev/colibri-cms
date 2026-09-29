# ADR-0012 : Anti-abus — Turnstile *managed* devant, compteur de fréquence dans un objet unique à empreintes de fenêtre
Statut : Accepté | Date : 2026-08-13 | Trace vers : [docs/stack.md](../stack.md) — candidat n° 12, ligne « Moyen anti-abus »

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
[`docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md`](../research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md).

## Décision

Nous placerons **Turnstile en mode *managed* devant**, puis un **compteur de fréquence dans un
Durable Object unique**.

Cet objet portera une **table d'origines** — jamais un objet par visiteur. Chaque origine y
entrera sous une empreinte **HMAC**, sous une clé **tirée au hasard par le produit pour la
seule fenêtre de comptage en cours** ; **clé et entrées seront effacées ensemble** à la fin de
la fenêtre.

## Conséquences

**Positives.**

- **Rien de dérivé d'une origine ne survit à la fenêtre qui l'a fait naître.** C'est une
  propriété **statique**, donc lisible dans les sources — elle est portable par un contrôle
  bloquant de `docs/ci.md` plutôt que par une exigence.
- **La clé n'entre pas à l'inventaire des secrets** : personne ne la crée, ne la range ni ne la
  remet — le produit la fabrique et la jette. Il n'y a donc **aucune rotation à tenir à la
  main**, celle-ci étant automatique par construction.
- **Aucun identifiant durable n'est créé dans l'infrastructure de la plateforme.** Un objet par
  visiteur aurait fait du **nom de l'objet** l'empreinte d'une adresse, hors de portée de toute
  reprise.
- Turnstile absorbe le volume avant que le compteur, plafonné en requêtes, ne soit sollicité.
- Ce compteur est le **seul endroit du produit** qui retienne quoi que ce soit tiré d'une
  adresse IP : une demande enregistrée ne porte que sa date, son formulaire et sa page
  d'origine (`FR-067`), et ses coordonnées sont saisies par le visiteur lui-même.

**Négatives — ce à quoi le code s'engage.**

- **Réserve assumée marquée : la hauteur du mur Turnstile n'est pas connue.** Deux pages
  officielles de Cloudflare divergent — le blog GA annonce un plafond de « 1 million
  siteverify », la page *Plans* écrit « Unlimited challenges » —, et la conciliation qui
  réserve ce plafond aux widgets **invisibles** est tenue d'une **analyse tierce**, marquée
  `[INCERTAIN]` par le rapport cité. **L'ordre décide dans les deux lectures** : sous
  l'hypothèse basse, ce plafond reste un **mur** — un refus, jamais un compteur facturé, donc
  l'invariant `I5` du [socle de livraison](../socle-de-livraison.md) tient — et reste **devant**
  le compteur qu'il protège. L'incertitude ne déplace que la **hauteur** de ce mur ; le rapport
  ne lui donne même pas de période, aucun calcul ne la fixerait sans arbitraire, et aucune
  recette ne peut la constater.
- **Contre qui lit à la fois la table et la clé, l'empreinte ne protège rien.** Elle vaut
  contre la fuite **partielle** — une table lue sans sa clé, une sauvegarde ancienne — et
  contre la conservation qui n'a pas lieu d'être. Ce lecteur-là dispose de toute façon, dans la
  même base, des coordonnées en clair de tout visiteur ayant envoyé une demande (`FR-057`).
- **Un objet unique est un point de sérialisation** : tout le trafic anti-abus y passe.
- **La durée de la fenêtre et la valeur du seuil ne sont pas fixées ici** — ni `FR-007` ni
  `FR-062` ne les chiffrent, c'est au niveau specs de le faire. La propriété tient quelle que
  soit leur valeur.
- **Seule une des trois falsifications est statique.** L'objet nommé d'après une origine se lit
  dans les sources ; « une entrée qui franchit sa fenêtre » et « une clé qui ne change pas d'une
  fenêtre à l'autre » sont du comportement à l'exécution et descendent en specs. L'effacement
  **conjoint** de la clé et des entrées rejoint, lui, les contrôles bloquants de `docs/ci.md` :
  une entrée qui survit à sa fenêtre ne casse aucun écran et ne se voit qu'en ouvrant la base.

## Alternatives considérées

- **Une règle Cloudflare Rate Limiting** : écartée car sa disponibilité et ses limites sur le
  palier gratuit ne sont pas sourcées — elle ne peut donc pas descendre en décision figée.
- **Une clé HMAC ouverte à la livraison, à rotation** : écartée car elle remet le troisième
  secret que la session opaque de [ADR-0006](./0006-auth-implementation-maison-sur-d1.md) venait
  de retirer ; sa rotation n'a **aucun porteur** — ni ligne de recette, ni exigence, ni
  contrôle — et elle protège moins qu'il n'y paraît, la clé vivant dans le compte qui héberge
  déjà la table *et* les coordonnées en clair des visiteurs.
- **La même, sans rotation** : écartée car elle garde le coût en perdant le motif.
- **Le comptage en mémoire seule** : écartée car il ne persiste rien, mais rend le seuil gratuit
  à qui provoque le recyclage de l'objet.
- **La troncature de l'adresse** : écartée car sans aucun effet sur l'attaque par confirmation,
  qui ne balaie pas l'espace mais teste un candidat connu.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, forme du compteur
  arbitrée le 2026-08-12 par le traitement de `S-02`, réserve rétablie le même jour par celui
  de `S-11`. Revue humaine : 2026-08-13.
