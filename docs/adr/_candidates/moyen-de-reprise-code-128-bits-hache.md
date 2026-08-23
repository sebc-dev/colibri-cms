# Candidat ADR : Moyen de reprise — un code de 128 bits haché en D1, remis sur papier, à usage unique et réémis à l'emploi
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0016-moyen-de-reprise-code-128-bits-hache.md` (ADR-0016 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

`FR-009` fait remettre un moyen de reprise à la livraison de l'instance, et `FR-010` fait ouvrir
une session sur sa présentation — c'est le dernier recours quand la boîte e-mail est
inaccessible, situation que `SC-020` met à l'épreuve. Le PRD en borne étroitement la forme :

- le glossaire dit « secret non e-mail **remis** à la livraison » — donc pas un secret né dans
  une session déjà ouverte, ni sur un appareil de l'éditrice ;
- `FR-011` interdit d'en conserver quoi que ce soit dans la configuration du déploiement ;
- `FR-012` le rend remplaçable depuis une session ouverte, avec cessation de l'ancien — ce qui
  impose un magasin **mutable**, donc D1.

Le contexte d'entropie vient de [ADR-0006](../../1.x/adr/0006-auth-implementation-maison-sur-d1.md) : le
code de connexion vit à 40 bits **parce qu'il expire et qu'il brûle** au 5ᵉ essai. Le moyen de
reprise n'a ni l'un ni l'autre.

## Décision

Nous utiliserons un **code de 128 bits** — 26 caractères base32, **groupés pour la recopie** —
**haché en D1**, **remis sur papier à la livraison**, **à usage unique et réémis à l'emploi**.

Nous n'ajouterons **aucun frein par secret** au seuil par origine.

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

**Négatives — ce à quoi le code s'engage.**

- **26 caractères à recopier à la main**, sur papier, exactement dans la situation où l'on est
  le plus mal placé pour le faire. C'est le coût d'une clé produite une fois par incident, et il
  est assumé — le groupement des caractères l'atténue, il ne l'annule pas.
- **La garde du papier est hors du produit.** Il peut être perdu, ou photographié ; rien dans le
  code ne le rattrape. Son emplacement se note au dossier d'instance, **jamais sa valeur**
  (`FR-112`).
- **L'éditrice doit ranger le nouveau code après chaque usage.** L'usage unique la laisse sans
  filet si elle ne le fait pas, et rien ne l'y contraint.
- **Rien ne freine les tentatives en propre.** Turnstile et `FR-007` restent devant l'écran pour
  le bruit, mais si l'entropie était un jour abaissée, il n'y aurait plus aucune seconde ligne :
  la sûreté de ce mécanisme **est** son chiffre.

## Alternatives considérées

- **La passkey WebAuthn** : écartée car elle demande d'amender le glossaire du PRD — elle naît
  sur l'appareil de l'éditrice et suppose une session déjà ouverte, quand le glossaire exige un
  secret **remis** à la livraison, et sa récupération pend au trousseau d'un tiers.
- **La rémanence de session longue** : écartée par `A-02` au motif qu'elle est irrévocable en cas
  de vol d'appareil. L'objection perd de sa force avec la session opaque de
  [ADR-0006](../../1.x/adr/0006-auth-implementation-maison-sur-d1.md), mais une session n'est pas un secret
  remis à la livraison et ne répond pas à `FR-009`.
- **Une seconde adresse e-mail** : écartée par `A-02` et `A-09` — deux boîtes valent un second
  compte contre `SC-006`, et leurs pannes sont corrélées.
- **Le refus temporisé après N échecs sur le moyen de reprise** : écartée car elle se retourne.
  Un attaquant qui entretient les échecs à bas coût ferait heurter le refus à l'éditrice pendant
  son urgence : c'est le déni de service sur le dernier recours — celui-là même qui interdit le
  brûlage — en version adoucie.
- **La temporisation par tentative (~1/s par secret)** : écartée car saine mais redondante à
  cette entropie — un mécanisme et un état de plus pour rien.

## Vérifiable ?

Non — le registre de `docs/ci.md` ne nomme aucun contrôle pour cette décision. C'est une décision de **fondation** : elle se constate à la recette de livraison, pas dans l'arborescence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, chiffrée à 128 bits
  le 2026-08-11 par le traitement de `AU-03`. Revue humaine : 2026-08-13.
