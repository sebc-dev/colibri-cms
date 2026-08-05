---
id: ADR-0012
title: Preuve d'attribution de l'approbation
status: proposed
date: 2026-08-05
scope: ["tooling/quality-gate/", "approbations/", "approbateurs.allowed_signers"]
depends-on: ["ADR-0002", "ADR-0006", "ADR-0009"]
---

# ADR-0012 — Preuve d'attribution de l'approbation

> **CANDIDAT — brouillon.** Rédigé en phase `plan` de la feature
> [`specs/002-mecanisation-portail`](../../../specs/002-mecanisation-portail/plan.md). Il n'a
> **aucune valeur normative** tant qu'un humain ne l'a pas promu via `/scd-sdd:adr`. Il doit être
> accepté **dans la même PR** que le code qui l'incarne (`CLAUDE.md` § *Comment travailler ici*).

## Contexte

ADR-0006 amdt 2026-08-01 pt 3 pose que le portail **refuse** un diff touchant un seam, un endpoint
d'écriture nouveau, l'allowlist réseau, un manifeste de dépendances ou le mécanisme d'application,
tant qu'une **approbation humaine explicite** n'est pas portée. L'amdt 2026-08-02 (b) confirme que
cette relecture vit **dans le dépôt**, sous forme d'un marqueur contrôlé par la CI, et non comme un
compte d'approbations sur la forge — un dépôt à mainteneur unique ne peut pas tenir la seconde
forme sans se contourner lui-même.

Les deux amendements décrivent **ce qui déclenche** la revue et **où elle vit**. Aucun ne dit *qui
approuve*, ni *comment on le prouve*. Or le marqueur est un fichier du dépôt, et l'adversaire du
modèle de menace d'ADR-0006 pt 1 — un agent générateur dévoyé — **écrit le dépôt**. Sans preuve
d'attribution, l'agent qui doit être bloqué rédige lui-même son autorisation : la barrière ne vaut
alors que contre la maladresse, jamais contre l'évasion. C'est la question que le lot L10 ne
pouvait pas laisser ouverte (tranchée en `clarify` : l'attribution est exigée **dès ce lot**).

## Décision

**Une approbation n'est valide que si elle porte une signature vérifiable, hors ligne, par une clé
publique inscrite dans un registre d'approbateurs versionné dans le dépôt.**

1. **Schéma de signature — SSH détachée.** L'artefact d'approbation est signé par
   `ssh-keygen -Y sign -n colibri-approbation`, produisant un `.sig` à côté du JSON ; le portail
   vérifie par `ssh-keygen -Y verify` contre un fichier au format OpenSSH `allowed_signers`. Motifs :
   la vérification est **purement locale** — donc conforme à ADR-0006 amdt 2026-08-01 pt 2, qui
   interdit tout appel réseau hors d'un seam déclaré —, la gestion de la passphrase est native, et
   **aucune dépendance npm nouvelle** n'est introduite, ce qui importe puisque les manifestes
   deviennent eux-mêmes possédés par l'humain.
2. **L'approbation désigne un contenu, jamais une révision.** Elle énumère, pour chaque chemin
   déclencheur qu'elle couvre, l'**empreinte du contenu** de ce chemin. Un chemin retouché après
   coup cesse d'être couvert ; un chemin sans rapport, modifié après coup, ne périme rien. La
   friction reste proportionnelle au risque, et le découpage en commits ne l'influence pas.
3. **Registre d'approbateurs, auto-référence fermée dans les deux sens.** Le registre est un chemin
   **déclencheur de revue** : le modifier exige une approbation signée par une clé **présente avant
   le diff soumis** — le portail lit donc le registre à l'état du **point de divergence** avec la
   branche par défaut, jamais dans l'arbre de travail. Symétriquement, l'artefact d'approbation
   lui-même est **exempté** : sans cette exemption, aucune approbation ne serait jamais accordable.
   Deux auto-références, fermées en sens inverse — l'une pour rendre le geste possible, l'autre pour
   l'empêcher de s'auto-servir.
4. **Amorçage humain, hors du mécanisme.** La première clé est posée par l'humain, et le registre
   atteint la branche par défaut **avant** que le contrôle d'approbation ne soit activé. Il n'existe
   pas de chemin par lequel le mécanisme s'amorce lui-même, et c'est délibéré.
5. **Écart local / intégration continue, délibéré et écrit.** Hors CI, le portail vérifie la
   **couverture** des chemins déclencheurs sans exiger la signature ; en CI, il l'exige. Motif :
   ne pas imposer la saisie d'une passphrase à chaque itération locale. Le vert local signifie
   « couvert », **jamais** « approuvé », et le rapport lisible le dit. Si le contexte d'exécution ne
   peut pas être déterminé, la signature est **exigée** — lecture fail-closed de la contrainte
   d'ADR-0009.
6. **Le geste qui produit l'approbation, pas seulement celui qui la juge.** L'outil de fabrication
   **refuse de produire quoi que ce soit hors d'un terminal interactif**, et le **motif est saisi par
   la personne qui approuve** — jamais pré-rempli, jamais dérivé du diff. Sans le premier refus, un
   agent lance la commande, une demande de phrase secrète surgit hors contexte, et la personne la
   remplit par réflexe ; sans le second, un motif rédigé par l'agent qui a écrit le diff est une case
   à cocher déguisée (ADR-0006 amdt 2026-08-01 pt 3, « la revue est une lecture, pas une case »). La
   ligne de commande n'offre donc **aucun** drapeau de motif ni de mode non interactif : un tel
   drapeau rouvrirait exactement ce que ces deux propriétés ferment.

## Conséquences

**Ce que la décision achète.** Une propriété précise : *le seul accès en écriture au dépôt ne suffit
plus à produire une approbation valide*. Un agent qui écrit le dépôt peut rédiger l'entrée ; il ne
peut pas la signer, la passphrase ne vivant pas dans le dépôt.

**Ce qu'elle n'achète pas** — trois résiduels, aucun détectable depuis le dépôt :

- **une clé chargée dans l'agent SSH annule la barrière, silencieusement** : le socket d'agent est
  hérité par tout processus de l'utilisateur, l'agent d'IA compris. L'état à préserver — agent vide
  — est une **discipline d'exploitation**, pas un mécanisme ;
- **le fichier de clé chiffré reste lisible** par tout processus de l'utilisateur, donc exfiltrable
  pour une attaque hors ligne ;
- **en local, la signature n'est pas exigée** (point 5).

**La frontière s'est donc déplacée sans disparaître** : la barrière vaut contre une IA qui écrit le
dépôt, et cesse de valoir contre une IA qui atteint les identifiants du poste — le même adversaire
que celui qui atteint le jeton de la forge. C'est le meilleur point atteignable avec des clés
logicielles. Résiduel hérité d'ADR-0006 pt 3, rappelé : l'approbateur est aujourd'hui la personne
qui lance l'agent, donc un adversaire faible ; la revue ne vaut pas contre une intention humaine.

## Alternatives Considered

- **Ne pas exiger d'attribution** (état d'avant `clarify`) — écarté : le marqueur serait rédigeable
  par l'agent qu'il doit arrêter, et produirait « un vert qui ressemble à une garantie », le mode
  d'échec qu'ADR-0006 amdt (b) nomme explicitement.
- **Ed25519 en PEM vérifié par `node:crypto`** — écarté : impose d'écrire soi-même la gestion de
  passphrase côté signature, pour aucun gain de sûreté.
- **Signatures de commit vérifiées par la forge** — écarté deux fois : c'est un appel réseau, donc
  un seam, donc l'inverse d'ADR-0006 amdt 2026-08-01 pt 2 ; et cela replacerait la preuve hors du
  dépôt, là où aucun check requis ne la relit.
- **Jeton matériel à présence physique** — non écarté, **différé** : il déplacerait la frontière
  d'un cran de plus et ne changerait **aucun `SHALL`** — seule la nature de la clé du registre
  changerait. Aucun jeton n'est disponible aujourd'hui.

## Constraints

> À activer seulement une fois cet ADR promu en `accepted` (source de vérifications déterministes).

- **OBLIGATOIRE** : une approbation porte un **motif non vide** et une **signature vérifiable hors
  ligne** par une clé du registre versionné ; **INTERDIT** tout appel réseau pour cette vérification.
- **OBLIGATOIRE** : l'approbation désigne l'**empreinte du contenu** des chemins qu'elle couvre ;
  **INTERDIT** de la lier à une révision.
- **OBLIGATOIRE** : le registre d'approbateurs est lu à l'état du **point de divergence** avec la
  branche par défaut ; **INTERDIT** de le lire dans l'arbre de travail.
- **OBLIGATOIRE** : le registre d'approbateurs est un chemin **déclencheur de revue** ; **INTERDIT**
  d'exiger une approbation pour l'artefact d'approbation lui-même.
- **INTERDIT** : charger la clé de signature dans l'agent SSH.
- **OBLIGATOIRE** : contexte d'exécution indéterminable ⇒ **signature exigée** (fail-closed).
- **OBLIGATOIRE** : l'outil de fabrication **refuse** de produire une approbation hors terminal
  interactif, et le **motif est saisi par la personne qui approuve** ; **INTERDIT** un drapeau de
  ligne de commande fournissant le motif ou forçant un mode non interactif.

## Related

- ADR-0006 § 5, amdt 2026-08-01 pts 3-5, amdt 2026-08-02 (b) — ce que la revue déclenche, et où elle vit
- ADR-0009 contraintes 4 et 5 — rapport et sortie machine dérivés du même `GateResult` (4),
  fail-closed et `ignoré` réservé à un périmètre vérifié vide (5)
- ADR-0002 § 3 — couche déterministe
- ADR-0013 *(candidat)* — le régime d'amorçage sous lequel ce mécanisme se construit, et à
  l'extinction duquel il prend le relais
- `specs/002-mecanisation-portail/` — `FR-045`, `FR-059` → `FR-062`, `FR-066`, `FR-067`, `FR-070`,
  `FR-071`, `SC-015`, `SC-016`, `SC-022`, `SC-024`
