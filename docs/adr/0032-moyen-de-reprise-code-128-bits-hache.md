# ADR-0032 : Moyen de reprise — un code de 128 bits haché en D1, créé depuis l'administration, à usage unique, dont l'emploi ferme les autres sessions
Statut : Accepté | Date : 2026-11-08

Promu depuis `docs/legacy/1.x/adr/0016-moyen-de-reprise-code-128-bits-hache.md` — ADR-0016, accepté
sous le cycle 1.x.

> Corps repris **verbatim** de l'ADR archivé sous le cycle 1.x, **sauf ce que l'amendement de la
> promotion change** : le titre, la Décision, et les points marqués *(amendé)* ou *(ajouté)* — le
> § « Amendée à la promotion » dit quoi et pourquoi ; la forme d'origine reste dans l'archive. Les
> renvois `FR-xxx`, `SC-xxx` et `I-n` sont des noms de **notation** et pointent vers
> `docs/legacy/1.x/` : ce ne sont pas des noms de fichier. Dans le texte d'origine, chaque renvoi à une
> autre décision porte la mention « (1.x) » — c'est son numéro du cycle 1.x ; dans le texte amendé, un
> numéro sans mention est un numéro 2.x (correspondance : [`README.md`](./README.md)).

## Contexte

`FR-009` fait remettre un moyen de reprise à la livraison de l'instance, et `FR-010` fait ouvrir
une session sur sa présentation — c'est le dernier recours quand la boîte e-mail est
inaccessible, situation que `SC-020` met à l'épreuve. Le PRD en borne étroitement la forme :

- *(amendé)* le glossaire dit « secret non e-mail **remis** à la livraison ». Le cycle 1.x en
  tirait qu'il ne pouvait pas naître dans une session déjà ouverte. La promotion lit « remis » au
  sens de ce que l'éditrice détient au sortir de la livraison : un papier, et non une boîte e-mail.
  Le lieu où le code naît est un autre point, tranché par la Décision ;
- `FR-011` interdit d'en conserver quoi que ce soit dans la configuration du déploiement ;
- `FR-012` le rend remplaçable depuis une session ouverte, avec cessation de l'ancien — ce qui
  impose un magasin **mutable**, donc D1.

Le contexte d'entropie vient de [ADR-0006 (1.x)](../legacy/1.x/adr/0006-auth-implementation-maison-sur-d1.md) : le
code de connexion vit à 40 bits **parce qu'il expire et qu'il brûle** au 5ᵉ essai. Le moyen de
reprise n'a ni l'un ni l'autre.

*(ajouté)* Aucun outil de livraison n'existe (Epic D non commencé) : à la date de la promotion,
l'adresse autorisée se sème à la main. Un code engendré hors de l'administration passerait donc par
un terminal, sous les yeux de qui le tient. Et [ADR-0001](./0001-auth-implementation-maison-sur-d1.md)
juge une session à la seule présence de sa ligne en D1 : supprimer des lignes ferme des sessions,
ce qui rend réel le geste « fermer les autres sessions » qu'il annonçait pour `FR-012`.

## Décision

*(amendé)* Nous utiliserons un **code de 128 bits** — 26 caractères base32, **groupés pour la
recopie** —, **haché en D1**, dont la base ne garde que l'empreinte.

*(amendé)* Le code **naît dans l'administration**, sur l'écran qui sert aussi à le remplacer : un
seul chemin de création. À la livraison, **l'éditrice** ouvre sa session par l'adresse autorisée,
sur son appareil, accompagnée par l'intégrateur. Elle crée le code et le note sur papier. Le
nouveau code ne s'affiche qu'**une seule fois**.

*(amendé)* Le code est **à usage unique et réémis à l'emploi**. Créer ou remplacer le code, comme
entrer par lui, fait cesser l'ancien et **ferme toute autre session ouverte** ; seule reste celle
de l'éditrice.

*(amendé)* Nous n'ajouterons **aucun frein propre au code** : sa présentation compte seulement dans
le seuil commun de vingt tentatives de connexion par heure et par origine (`FR-007`,
[ADR-0028](./0028-anti-abus-compteur-de-frequence-en-d1-sans-turnstile.md)).

## Conséquences

**Positives.**

- **L'entropie seule rend la devinette sans objet**, en ligne comme hors ligne, et par
  arithmétique seule : le dernier recours de l'instance ne pend plus à un mécanisme non
  arbitré, ni à `FR-007`, ni au sort de l'empreinte d'origine.
- **Il doit tenir hors ligne, et il le tient.** Permanent, il n'a pas de compteur d'essais qui
  le protège : une lecture de la base livre son hachage, jamais algorithmé ailleurs qu'ici, et
  40 bits y tomberaient en secondes quel que soit le KDF.
- **Aucune dépendance, aucun mécanisme neuf** : c'est le patron déjà retenu pour le code de
  connexion, à un autre chiffrage.
- **L'usage unique évite une porte dérobée permanente sur papier**, et la réémission à l'emploi
  évite de laisser l'éditrice sans filet au sortir de la panne même qui l'a fait servir —
  `FR-012` fournit déjà le geste.
- *(ajouté)* **Le code ne passe par aucun terminal, et Isometria ne le voit pas.** Il naît sur
  l'écran de l'éditrice, comme ses remplaçants. La livraison et le remplacement suivent le même
  chemin, donc un seul chemin se teste.
- *(ajouté)* **L'emploi chasse un intrus.** Quand l'éditrice entre par le code, c'est que sa boîte
  lui échappe, et quelqu'un d'autre la tient peut-être. Fermer les autres sessions à ce moment
  ferme celle que cet intrus aurait ouverte par la boîte.

**Négatives — ce à quoi le code s'engage.**

- **26 caractères à recopier à la main**, sur papier, exactement dans la situation où l'on est
  le plus mal placé pour le faire. C'est le coût d'une clé produite une fois par incident, et il
  est assumé — le groupement des caractères l'atténue, il ne l'annule pas.
- **La garde du papier est hors du produit.** Il peut être perdu, ou photographié ; rien dans le
  code ne le rattrape. Son emplacement se note au dossier d'instance, **jamais sa valeur**
  (`FR-112`).
- **L'éditrice doit ranger le nouveau code après chaque usage.** L'usage unique la laisse sans
  filet si elle ne le fait pas, et rien ne l'y contraint.
- *(amendé)* **Rien ne freine les tentatives en propre.** Le seuil par origine de `FR-007` reste
  devant l'écran pour le bruit, mais si l'entropie était un jour abaissée, il n'y aurait plus
  aucune seconde ligne : la sûreté de ce mécanisme **est** son chiffre.
- *(ajouté)* **Une instance livrée sans code est sans filet.** Avant que l'éditrice crée le code,
  l'instance n'a pas de moyen de reprise ; l'écran le dit, et la liste de livraison (Epic D) doit
  porter le geste. La présence de l'éditrice à la livraison devient une condition du produit.
- *(ajouté)* **Les sessions simultanées ne coexistent plus sans condition.** Un autre appareil de
  l'éditrice est déconnecté quand elle crée, remplace ou emploie le code. Elle s'y reconnecte par
  l'adresse autorisée.
- *(ajouté)* **Une réponse perdue coûte un code.** L'emploi est une seule transaction : l'ancien
  code cesse, le nouveau naît. Si la réponse qui porte le nouveau code et le cookie se perd en
  route, l'éditrice n'a ni session ni code. Le risque est accepté : la fenêtre est celle d'une
  seule réponse, et le corriger exigerait de garder l'ancien code valable jusqu'à un accusé de
  lecture, ce qui contredit l'usage unique.

## Alternatives considérées

- **La passkey WebAuthn** : écartée car elle demande d'amender le glossaire du PRD — elle naît
  sur l'appareil de l'éditrice et suppose une session déjà ouverte, quand le glossaire exige un
  secret **remis** à la livraison, et sa récupération pend au trousseau d'un tiers.
  *(ajouté)* La promotion admet désormais une naissance en session ouverte ; l'objection qui reste
  est le trousseau d'un tiers, et un secret qui ne s'écrit pas sur papier.
- **La rémanence de session longue** : écartée par `A-02` au motif qu'elle est irrévocable en cas
  de vol d'appareil. L'objection perd de sa force avec la session opaque de
  [ADR-0006 (1.x)](../legacy/1.x/adr/0006-auth-implementation-maison-sur-d1.md), mais une session n'est pas un secret
  remis à la livraison et ne répond pas à `FR-009`.
- **Une seconde adresse e-mail** : écartée par `A-02` et `A-09` — deux boîtes valent un second
  compte contre `SC-006`, et leurs pannes sont corrélées.
- **Le refus temporisé après N échecs sur le moyen de reprise** : écartée car elle se retourne.
  Un attaquant qui entretient les échecs à bas coût ferait heurter le refus à l'éditrice pendant
  son urgence : c'est le déni de service sur le dernier recours — celui-là même qui interdit le
  brûlage — en version adoucie.
- **La temporisation par tentative (~1/s par secret)** : écartée car saine mais redondante à
  cette entropie — un mécanisme et un état de plus pour rien.
- *(ajouté)* **Un code engendré à la livraison hors de l'administration** (commande en terminal,
  valeur semée en base) : écarté. Il demande un outil de livraison qui n'existe pas, il passe sous
  les yeux de qui tient le terminal, et il ouvre un second chemin de création à tester à côté du
  remplacement.
- *(ajouté)* **Un code créé par l'intégrateur et remis sur papier** : écarté. Isometria aurait vu
  le dernier recours de l'instance, et la sûreté pendrait à ce que l'éditrice le remplace aussitôt.
- *(ajouté)* **Garder les autres sessions ouvertes à l'emploi** : écarté. Une session ouverte par
  la boîte perdue survivrait au geste même qui sert à reprendre la main.

## Amendée à la promotion

Promue le 2026-11-08 par le change `016-moyen-de-reprise`, avant ses tickets (design D8). Les deux
amendements ont été arbitrés avec l'humain le même jour.

**Quoi.** Le code naît dans l'administration, sur l'écran du remplacement, et c'est l'éditrice qui
le crée à la livraison, accompagnée. Créer, remplacer ou employer le code ferme toute autre session
ouverte. La mention de Turnstile disparaît : le seuil par origine est celui d'ADR-0028.

**Pourquoi.** Aucun outil de livraison n'existe, et un code né hors de l'administration passerait
par un terminal ; un seul chemin de création se teste mieux que deux. L'éditrice crée le code
elle-même pour qu'Isometria ne voie jamais le dernier recours d'une instance qui doit lui survivre.
Fermer les autres sessions chasse un intrus entré par la boîte perdue (proposal du change 016,
points 1 et 3). Turnstile a été retiré par ADR-0028.

Retouchés en conséquence, marqués *(amendé)* ou *(ajouté)* : le titre, la Décision, une puce du
contexte amendée et un paragraphe ajouté, une conséquence négative amendée, deux positives et trois
négatives ajoutées, une alternative complétée et trois ajoutées.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

*(ajouté)* Aucun invariant de `docs/architecture.md` n'en naît. « La base ne garde jamais le code
en clair » dépend du comportement à l'exécution et reste une intention de ce texte ; les tests
d'intégration du change 016 et la recette de `SC-020` la vérifient.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, chiffrée à 128 bits
  le 2026-08-11 par le traitement de `AU-03`. Revue humaine : 2026-08-13.
- *(ajouté)* Promotion amendée instruite par l'agent pour le change 016 (proposal § Points tranchés,
  design D8) ; amendements et qui crée le code arbitrés avec l'humain le 2026-11-08.
