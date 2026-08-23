# Spec : Connexion de l'éditrice par code
Statut : Brouillon | Créé : 2026-08-19 | Trace vers : docs/prd.md (US1 ; FR-001 à FR-006, FR-008,
FR-117, FR-118, FR-120 à FR-122 ; SC-003, SC-006, SC-015, SC-021) · ADR-0006 (authentification — les quatre
mécanismes) · ADR-0009 (forme du courriel — inerte et étiqueté) · ADR-0015 et ADR-0024 (en-têtes de réponse,
politique stricte de l'administration) · ADR-0020 (configuration d'instance — quatre lieux) · ADR-0026 (garde de
session par import)
Clarifié : 2026-08-19 | Corrigé : 2026-08-21 — gate `analyze` (3 Critical, 5 Major) ·
2026-08-22 — gate `analyze` (3 Critical, 4 Major) · 2026-08-22 — gate `analyze` (1 Critical)

## Légende
- **EARS** (*Easy Approach to Requirements Syntax*) — la forme normée des critères : cinq patterns,
  un par situation. Les mots-clés (`When`, `While`, `If…then`, `Where`, `shall`) restent en anglais
  pour que chaque critère se relise et se vérifie de la même façon partout.
- **shall** — le verbe de l'exigence : une phrase = une exigence = **une vérification observable**.
- **unwanted behavior** — le pattern du cas indésirable : `If <condition>, then the system shall …`
- **_(PRD: FR-0xx)_** — la backref : le besoin produit que ce critère décline. **Les numéros de
  cette spec et ceux du PRD partagent le même espace** : `SC-015` sans préfixe est celui de cette
  spec, `PRD: SC-015` est celui du PRD (la rémanence de l'autonomie après trois mois). Un identifiant
  du PRD cité hors d'une backref porte donc « du PRD » — `FR-005` du PRD, et non `FR-005`.
- **Adresse autorisée** — l'unique adresse e-mail qui ouvre l'administration du déploiement
  (glossaire du PRD).
- **Code** — le secret à usage unique émis vers l'adresse autorisée, que l'éditrice recopie pour
  prouver qu'elle a la maîtrise de sa boîte. Le PRD l'appelle *preuve de maîtrise*.
- **Émission** — le geste par lequel le système remet un message au canal d'acheminement. Elle se
  distingue de la **réception**, qui suppose une instance livrée et reste hors de cette feature.
- **Fenêtre glissante** — la fenêtre de comptage du plafond d'envois : elle se déplace en continu,
  et non par tranches horaires fixes.
- **Délai plancher** — la durée en deçà de laquelle l'écran de connexion ne rend jamais sa réponse,
  la même pour toute adresse soumise, quelle que soit la nature du travail effectué. Sa **valeur**
  n'est pas fixée ici : `SC-003` et `SC-012` en fixent les deux bornes observables, et le plan en
  déduit le chiffre.
- **Route d'administration** — toute adresse servie sous l'administration, **à l'exception de
  l'écran de connexion**. L'exception n'est pas un confort : l'écran de connexion est la destination
  du renvoi de `FR-035`, si bien que l'exiger derrière une session le renverrait à lui-même. Un
  **chemin inconnu** sous l'administration n'est pas une route non plus — rien n'y est servi —, donc
  ni `FR-019` ni `FR-035` ne le visent ; c'est `FR-041`, rédigé sur les **réponses** et non sur les
  routes, qui lui impose les en-têtes.
- **Terme de développeur** — au sens de `FR-117` du PRD, et pour ce parcours : *session*, *cookie*,
  *jeton*, *token*, *requête*, *serveur*, *base de données*, *API*, *URL*, *HTTP*, *404*, *403*,
  *hachage*, *empreinte*, *commit*, *branche*, *build*, *déploiement*, ainsi que leurs variantes de
  nombre et de genre. **Cette liste est un plancher, jamais un plafond** : `SC-007` prouve
  mécaniquement qu'elle est tenue, `SC-016` couvre ce qu'elle n'a pas prévu. L'interdit lie aussi
  les **exigences** : un critère qui prescrit un texte visible en énonce le **sens**, jamais une
  phrase portant un de ces termes — sans quoi il dicte ce que `SC-007` cherche pour le réfuter.
  C'est ce qui a fait réécrire la mention de `FR-030` le 2026-08-22.
- **Politique de sécurité d'une réponse** — la consigne qu'une réponse joint à elle-même pour dire
  au navigateur ce qu'il a le droit d'exécuter et de charger en la lisant. `ADR-0015` et `ADR-0024`
  en fixent la forme **stricte** pour l'administration, et la définissent par ses interdits.

## Résumé

Cette feature livre **la porte de l'administration** : l'éditrice saisit son adresse e-mail sur un
écran public, reçoit un code, le recopie, et entre. Elle ne choisit aucun mot de passe, ne crée
aucun compte, et ne se connecte à rien d'autre — c'est la condition que `SC-006` mesure et que
`FR-003` et `FR-004` imposent.

Le PRD le dit d'`US1` : « sans elle, aucune autre story n'est atteignable ». Tout écran
d'administration à venir, l'aperçu compris (`FR-082`), vit derrière cette porte.

**Ce que la feature livre en propre** : l'écran de connexion, l'émission du code vers la seule
adresse autorisée, la vérification du code, l'ouverture et l'expiration d'une session, la garde qui
refuse toute route d'administration sans session, **les en-têtes de sécurité que porte toute réponse
d'administration**, et **un unique écran d'accueil d'administration**
— vide de fonction, qui existe pour que la porte ouvre sur quelque chose et que les features
suivantes y accrochent leurs écrans.

**Ce qu'elle ne livre pas** : le moyen de reprise (`FR-009` à `FR-012`), le remplacement de
l'adresse autorisée (`FR-013`, `FR-014`), le seuil de fréquence par origine (`FR-007`), et la
**réception réelle** du message. Les frontières et leurs conséquences sont en § NON inclus, chacune
avec ce qu'elle laisse ouvert.

## User stories (priorisées)

### US1 — Entrer dans son administration avec sa seule adresse (Priorité : P1)
L'éditrice ouvre l'écran de connexion, saisit l'adresse e-mail qu'elle utilise déjà, reçoit un code
dans sa boîte, le recopie, et se retrouve dans son administration. Elle lit le code sur son
téléphone et le saisit sur son ordinateur si elle veut : c'est le même parcours.
- Trace vers : PRD FR-001, FR-003, FR-004, FR-120, FR-121 ; SC-006
- Scénarios d'acceptation (EARS) :
  1. **When** l'adresse autorisée est soumise sur l'écran de connexion, the system **shall** émettre
     vers cette adresse un message portant un code à usage unique.
  2. **When** ce code est saisi sur l'appareil depuis lequel il a été demandé, the system **shall**
     ouvrir une session d'administration et donner accès à l'écran d'accueil.
  3. **While** l'éditrice parcourt l'écran de connexion puis l'écran d'accueil, the system
     **shall** n'exiger la connexion à aucun compte autre que son administration.

### US2 — Le formulaire public n'apprend rien à un inconnu (Priorité : P1)
Le formulaire de connexion est ouvert à l'internet : n'importe qui peut y saisir n'importe quelle
adresse. Il ne doit ni écrire à une adresse qui n'est pas celle de la cliente, ni laisser deviner,
par ce qu'il répond ou par le moment où il répond, quelle adresse ouvre l'administration.
- Trace vers : PRD FR-002, FR-005, FR-008 ; SC-021
- Scénarios d'acceptation (EARS) :
  1. **If** une adresse autre que l'adresse autorisée est soumise, **then** the system **shall**
     n'émettre aucun message vers cette adresse.
  2. **When** une adresse quelconque est soumise, the system **shall** rendre une réponse dont le
     corps et les champs d'en-tête ne dépendent pas de l'adresse soumise.
  3. **When** une adresse quelconque est soumise, the system **shall** rendre sa réponse sans
     attendre l'issue de l'émission du message.
  4. **When** une adresse quelconque est soumise, the system **shall** rendre sa réponse au terme
     d'un délai plancher, le même quelle que soit l'adresse soumise et quelle que soit l'issue de
     l'émission.

### US3 — Le compte e-mail de la cliente reste hors d'atteinte (Priorité : P1)
Le même formulaire public permet de déclencher un envoi vers la boîte de la cliente. Une
sollicitation en rafale ne doit ni noyer cette boîte, ni abîmer sa délivrabilité, ni consommer les
quotas gratuits — sans pour autant fermer la porte à l'éditrice, qui n'a aucune autre entrée dans
le périmètre de cette feature.
- Trace vers : PRD FR-006 ; SC-021
- Scénarios d'acceptation (EARS) :
  1. **If** cinq messages ont déjà été émis vers l'adresse autorisée dans l'heure glissante,
     **then** the system **shall** n'en émettre aucun de plus avant que la fenêtre ne libère un
     envoi.
  2. **While** le plafond est atteint, the system **shall** laisser le dernier code émis ouvrir
     une session.
  3. **While** le plafond est atteint, the system **shall** rendre la même réponse à toute adresse
     soumise, que cette adresse soit ou non l'adresse autorisée.

### US4 — Une session ne dure pas indéfiniment (Priorité : P2)
Une session oubliée sur un appareil partagé s'éteint d'elle-même, et une session entretenue ne
devient jamais perpétuelle.
- Trace vers : PRD FR-118
- Scénarios d'acceptation (EARS) :
  1. **If** une session est restée sept jours sans usage, **then** the system **shall** la fermer.
  2. **If** une session a été ouverte il y a trente jours, **then** the system **shall** la fermer
     quel que soit son usage.

## Exigences fonctionnelles (EARS, atomiques, testables)

### Émission du code

- **FR-001** : When l'adresse autorisée est soumise sur l'écran de connexion, the system shall
  émettre vers cette adresse un message portant un code. _(PRD: FR-001)_
- **FR-002** : The system shall engendrer chaque code avec au moins 40 bits d'entropie.
  _(PRD: FR-001 ; ADR-0006)_
- **FR-003** : If une adresse autre que l'adresse autorisée est soumise, then the system shall
  n'engendrer aucun code. _(PRD: FR-002)_
- **FR-004** : The system shall n'émettre de message vers aucune adresse autre que l'adresse
  autorisée. _(PRD: FR-005)_
- **FR-026** : Where seule la connexion par code est livrée, the system shall n'offrir aucun écran
  ni aucune route permettant de poser ou de modifier l'adresse autorisée. _(ADR-0020 ; § NON inclus
  — `FR-013` du PRD, le remplacement de l'adresse depuis une session ouverte, est **différé et non
  refusé** : il est hors périmètre de cette feature et sans porteur en Stack. La précondition
  `Where` borne l'énoncé à ce que **cette** feature livre — sans elle, un `shall` permanent ferait
  de la livraison future de `FR-013` une violation de ce contrat.)_
- **FR-029** : If aucune adresse autorisée n'est enregistrée, then the system shall n'émettre aucun
  message et refuser toute ouverture de session. _(PRD: FR-002 ; FR-026)_
- **FR-034** : The system shall composer chaque code de huit signes pris dans un alphabet de
  trente-deux caractères d'où sont exclus ceux qui se confondent à la lecture.
  _(PRD: SC-003, SC-015 ; ADR-0006 ; FR-002)_
- **FR-040** : The system shall ne conserver du code émis aucune forme qui permette de le
  retrouver. _(ADR-0006, mécanisme 1 — « haché en base » ; aucune exigence du PRD ne le porte : le
  PRD borne l'usage du code, jamais sa conservation, et c'est l'ADR qui décide de n'en garder
  qu'une empreinte)_
- **FR-036** : The system shall donner au message portant le code un objet identique d'une émission
  à l'autre, dont aucune partie ne provient de ce qui a été saisi sur l'écran de connexion.
  _(ADR-0009 · docs/stack.md § « La cinquième porte » — l'ADR décide la forme du courriel de
  **demande de devis** ; cette feature étend la même discipline au courriel de **code**, qui vise
  la même boîte et sert le facteur d'authentification que la cinquième porte cherche à récolter)_
- **FR-037** : The system shall composer le message portant le code en texte seul, sans mise en
  forme. _(ADR-0009 · docs/stack.md § « La cinquième porte » — même écart que `FR-036`)_

### Indiscernabilité de la réponse

- **FR-005** : When une adresse quelconque est soumise sur l'écran de connexion, the system shall
  rendre une réponse dont le **corps** et les **champs d'en-tête** sont les mêmes, que cette adresse
  soit ou non l'adresse autorisée. _(PRD: FR-008)_
- **FR-038** : The system shall n'attacher à la réponse de l'écran de connexion aucune valeur dont
  la **présence** ou la **longueur** dépende de l'adresse soumise. _(PRD: FR-008 ; FR-005 — la
  **valeur** d'un champ peut différer d'une réponse à l'autre, y compris pour la même adresse, dès
  lors qu'elle est tirée au hasard ; c'est sa présence et sa taille qui trahiraient)_
- **FR-006** : The system shall rendre la réponse de l'écran de connexion sans attendre l'issue de
  l'émission du message. _(PRD: FR-008)_
- **FR-007** : If l'émission d'un message échoue, then the system shall rendre la même réponse que
  si elle avait abouti. _(PRD: FR-008)_
- **FR-033** : When une adresse quelconque est soumise sur l'écran de connexion, the system shall
  rendre sa réponse au terme d'un **délai plancher**, le même quelle que soit l'adresse soumise et
  quelle que soit l'issue de l'émission. _(PRD: FR-008 ; SC-021 — la tolérance et le rapport que ce
  plancher doit tenir sont chiffrés par `SC-003` et `SC-012` ; ce critère porte la propriété, ceux-là
  portent les nombres)_

### Plafond d'envois

- **FR-008** : If cinq messages ont déjà été émis vers l'adresse autorisée dans l'heure glissante,
  then the system shall n'émettre aucun message supplémentaire vers cette adresse jusqu'à ce que la
  fenêtre libère un envoi. _(PRD: FR-006)_
- **FR-009** : When le plafond d'envois est atteint, the system shall l'indiquer à qui soumet
  l'écran de connexion. _(PRD: FR-006 ; PRD § NON inclus, « le plafond de FR-006, une fois atteint,
  a le droit de se manifester »)_
- **FR-039** : While le plafond d'envois est atteint, the system shall rendre la même réponse à
  toute adresse soumise, que cette adresse soit ou non l'adresse autorisée. _(PRD: FR-006, FR-008 ;
  FR-005, FR-009 — sans ce critère, l'annonce du plafond serait le seul endroit du parcours où la
  réponse distinguerait l'adresse autorisée, et l'annoncer reviendrait à la désigner)_
- **FR-010** : While le plafond d'envois est atteint, the system shall laisser le dernier code émis
  ouvrir une session **jusqu'à son expiration**. _(PRD: FR-006, FR-121 ; FR-014, FR-027)_

### Vérification du code

- **FR-011** : When un code non expiré est présenté sur l'appareil depuis lequel il a été demandé,
  the system shall ouvrir une session d'administration. _(PRD: FR-001, FR-120)_
- **FR-012** : If un code est présenté depuis un appareil autre que celui qui l'a demandé, then the
  system shall refuser d'ouvrir une session. _(PRD: FR-120)_
- **FR-013** : When une session est ouverte à partir d'un code, the system shall rendre ce code
  inutilisable pour toute ouverture ultérieure. _(PRD: FR-121)_
- **FR-014** : If un code est présenté plus de quinze minutes après son émission, then the system
  shall refuser d'ouvrir une session. _(PRD: FR-121)_
- **FR-015** : If un code est présenté erroné cinq fois, then the system shall le rendre
  inutilisable pour toute présentation ultérieure. _(PRD: FR-122 ; ADR-0006)_
- **FR-016** : The system shall ouvrir une session sans exiger de mot de passe. _(PRD: FR-003)_
- **FR-017** : The system shall ouvrir une session sans exiger la création d'un compte.
  _(PRD: FR-003, FR-004)_
- **FR-027** : When un code est émis à un appareil qui portait déjà un code utilisable, the system
  shall rendre ce code précédent inutilisable **sur cet appareil**. _(PRD: FR-120 ; ADR-0006 — le
  code n'ouvre de session que sur l'appareil demandeur, et cet appareil n'en porte qu'un à la fois ;
  un code demandé depuis un **autre** appareil n'est pas touché et continue d'y ouvrir une session)_
- **FR-030** : The system shall indiquer, sur l'écran de saisie du code, que si un nouveau code a
  été demandé depuis cet appareil, seul le dernier **permet d'entrer**. _(PRD: SC-003, SC-015 ;
  FR-027 — aucune exigence du PRD ne demande ce guidage ; il sert « seule, sans aide et du premier
  coup », dont il est la condition sur cet écran. La mention est **bornée à l'appareil**, comme
  `FR-027` : un code demandé ailleurs n'est pas touché, et annoncer « seul le dernier message reçu »
  serait faux pour qui a deux appareils en cours. Elle dit « permet d'entrer » et non « ouvre une
  session » : depuis que `FR-025` couvre cet écran, *session* est le premier des termes que la
  Légende y interdit — dicter cette phrase-là reviendrait à exiger le mot que `SC-007` cherche pour
  réfuter `FR-025`.)_
- **FR-028** : If un code erroné est présenté alors qu'il lui reste des présentations, then the
  system shall inviter à vérifier la saisie. _(PRD: SC-003, SC-015, FR-122 — même écart que
  `FR-030`)_
- **FR-031** : If un code est refusé parce qu'il est expiré, déjà utilisé, remplacé par une demande
  ultérieure faite depuis le même appareil, ou devenu inutilisable après cinq présentations
  erronées, then the system shall inviter à demander un nouveau code. _(PRD: SC-003, SC-015,
  FR-121, FR-122 ; FR-014, FR-015, FR-027 — même écart que `FR-030` sur le guidage)_
- **FR-032** : If un code est présenté depuis un appareil autre que celui qui l'a demandé, then the
  system shall inviter à reprendre sur l'appareil depuis lequel le code a été demandé.
  _(PRD: SC-003, SC-015, FR-120 ; FR-012 — même écart que `FR-030` sur le guidage)_

### Session et garde

- **FR-018** : While une session valide est présentée, the system shall donner accès à l'écran
  d'accueil de l'administration. _(PRD: FR-001)_
- **FR-019** : If une route d'administration est demandée sans session valide, then the system
  shall en refuser l'accès. _(PRD: FR-001, FR-002 ; ADR-0026 ; Légende — « route d'administration »
  excepte l'écran de connexion et ne vise pas un chemin inconnu)_
- **FR-035** : If une route d'administration est demandée sans session valide, then the system shall
  renvoyer vers l'écran de connexion. _(PRD: SC-003, SC-015 ; FR-019)_
- **FR-020** : If une session est restée sept jours sans usage, then the system shall la fermer.
  _(PRD: FR-118)_
- **FR-021** : If une session a été ouverte il y a trente jours, then the system shall la fermer
  quel que soit son usage. _(PRD: FR-118)_
- **FR-022** : The system shall rendre l'identifiant de session inaccessible aux scripts exécutés
  dans la page. _(PRD: FR-001 ; ADR-0006, mécanisme 3)_
- **FR-023** : If une requête d'administration est émise depuis un autre site, then the system
  shall ne pas y joindre la session. _(PRD: FR-001 ; ADR-0006, mécanisme 3)_

### Ce que porte toute réponse d'administration

- **FR-041** : The system shall joindre la politique de sécurité de l'administration à **toute**
  réponse servie sous l'administration, y compris à un renvoi vers l'écran de connexion et à une
  réponse d'erreur. _(ADR-0015, ADR-0024 — aucune exigence du PRD ne la porte : elle vient de
  l'origine commune décidée par `ADR-0001`, et c'est, avec l'invariant d'échappement, l'une des deux
  seules parades au vol de session par script injecté ; cette feature est celle qui ouvre
  l'administration, donc celle qui doit la poser)_
- **FR-042** : The system shall n'admettre dans cette politique aucune des trois formes qu'`ADR-0015`
  lui interdit : script en ligne, évaluation dynamique de code, source autre que le site lui-même.
  _(ADR-0015, ADR-0024 — « stricte » se définit par ses interdits ; la présence de la politique ne
  prouve rien, ce sont eux qui se vérifient)_
- **FR-043** : The system shall joindre à toute réponse servie sous l'administration le refus de voir
  son type de contenu réinterprété par le navigateur. _(ADR-0015)_
- **FR-044** : The system shall joindre à toute réponse servie sous l'administration le refus de
  transmettre à un site tiers l'adresse consultée. _(ADR-0015)_

### Aucun compte à visiter, aucun terme de développeur

- **FR-024** : While l'éditrice parcourt l'écran de connexion et l'écran d'accueil, the system
  shall n'exiger la connexion à aucun compte autre que son administration. _(PRD: FR-004 ; SC-006)_
- **FR-025** : The system shall n'employer aucun terme de développeur — au sens de la Légende, qui
  en énumère la liste — dans les textes visibles de l'écran de connexion, de l'écran de saisie du
  code, de l'écran d'accueil et du message portant le code. _(PRD: FR-117)_

## Cas limites & comportements indésirables (unwanted behavior)

- **Le code n'arrive pas, l'éditrice en redemande.** Chaque demande consomme un envoi du plafond
  (`FR-008`) **et rend inutilisable, sur cet appareil, le code qu'il portait** (`FR-027`) : depuis
  cet appareil, seul le dernier message reçu ouvre une session, et l'écran de saisie l'en avertit
  (`FR-030`). Au cinquième envoi, l'écran annonce le plafond (`FR-009`) — la même annonce que pour
  n'importe quelle autre adresse (`FR-039`) — et elle attend que la fenêtre glisse. **Le dernier
  code reçu n'ouvre une session que jusqu'à son expiration**, soit quinze minutes après son émission
  (`FR-010`, `FR-014`), quand la fenêtre glissante, elle, ne libère un envoi qu'une heure après le
  **premier** des cinq. Si ses cinq demandes se sont suivies de près, elle se retrouve donc **sans
  aucune entrée pendant près de quarante-cinq minutes**. **Trou assumé dans le périmètre de cette
  feature** : il se referme par le moyen de reprise (`FR-010` du PRD), hors périmètre ici — et c'est
  la deuxième raison, après la panne d'acheminement, pour laquelle cette feature-là ne peut pas
  rester longtemps en attente.
- **Deux messages arrivent dans le désordre.** L'éditrice, qui a demandé deux fois depuis le même
  appareil, saisit le code du plus ancien : il est refusé (`FR-027`) et l'écran l'invite à en
  demander un nouveau (`FR-031`). Rien d'autre ne la protège de cette méprise — c'est la mention
  portée par l'écran de saisie (`FR-030`) qui doit la lui éviter, et c'est le coût assumé de n'avoir
  qu'un seul code vivant **par appareil**. **Un code demandé depuis un autre appareil n'est pas
  touché** (`FR-027`) : il continue d'ouvrir une session là où il a été demandé, ce qui évite qu'une
  demande faite sur la tablette ne tue celle qui était en cours sur l'ordinateur.
- **L'instance est déployée mais l'adresse autorisée n'a pas encore été posée.** Aucun message n'est
  émis et aucune session ne s'ouvre (`FR-029`) ; le produit n'offre aucun écran pour la poser
  (`FR-026`). Une instance livrée sans ce geste reste porte close, et **rien dans le produit ne le
  signale** — voir § NON inclus.
- **L'émission échoue en silence.** La réponse est la même qu'en cas de succès (`FR-007`), donc
  l'éditrice ne l'apprend pas de l'écran. **Conséquence assumée et grave dans le périmètre de cette
  feature** : le PRD répond à ce cas par le moyen de reprise (`FR-010` du PRD), qui est hors
  périmètre ici. Tant qu'il n'est pas livré, une panne d'acheminement ferme l'administration **sans
  recours dans le produit**. C'est la raison pour laquelle la feature du moyen de reprise ne peut
  pas rester longtemps en attente.
- **Une session est ouverte sur un ordinateur partagé et n'est pas refermée.** Aucune déconnexion
  n'est offerte — voir § NON inclus, avec le signalement de trou au PRD. La session s'éteint d'
  elle-même à sept jours d'inactivité (`FR-020`).
- **Le plafond est atteint par un inconnu, pas par l'éditrice.** Cinq requêtes par heure suffisent à
  maintenir le plafond saturé, pour un coût d'attaque quasi nul. L'éditrice ne peut alors plus
  obtenir de code, et n'a aucune autre entrée dans ce périmètre. **Risque assumé**, arbitré le
  2026-08-19 : le plafond protège d'abord la boîte et la délivrabilité de la cliente, qui sont le
  dommage durable. Il se referme par deux features à venir — le seuil de fréquence par origine
  (`FR-007` du PRD) et le moyen de reprise.
- **Le formulaire de connexion est sollicité en masse.** Le seuil de fréquence par origine est hors
  périmètre : rien ne borne le nombre de requêtes, seul le nombre de **messages émis** est borné
  (`FR-008`). Voir § NON inclus.
- **Un code valide est présenté deux fois.** Le second est refusé (`FR-013`).
- **Un code est intercepté dans la boîte de l'éditrice.** Il ne sert à rien à qui le lit : il
  n'ouvre de session que sur l'appareil qui l'a demandé (`FR-012`). Cette liaison ne protège pas de
  qui lit la boîte **et** demande son propre code — le formulaire est public, et le PRD assume ce
  résidu.

## Contrats d'entrée/sortie (observables)

**Soumission d'une adresse sur l'écran de connexion**

| Entrée | Sortie observable |
|---|---|
| l'adresse autorisée | réponse `A` · un message émis vers cette adresse et vers aucune autre |
| une adresse quelconque autre | réponse `A`, **mêmes champs d'en-tête et même corps** · aucun message émis |
| n'importe quelle adresse, plafond atteint | réponse `B`, celle qui annonce le plafond (`FR-009`) — **la même quelle que soit l'adresse** (`FR-039`) · aucun message émis |
| n'importe quelle adresse, émission en échec | réponse `A` (`FR-007`) |
| n'importe quelle adresse, aucune adresse autorisée enregistrée | réponse `A` · aucun message émis (`FR-029`) |

**Deux réponses seulement, `A` et `B`**, et le choix entre les deux ne dépend que de l'état du
plafond du déploiement — jamais de l'adresse soumise. Ni le corps, ni les champs d'en-tête, ni la
présence ou la longueur d'une valeur attachée à la réponse ne portent trace de l'adresse (`FR-005`,
`FR-038`). La réponse est rendue sans attendre l'issue de l'émission (`FR-006`) et **au terme du
délai plancher** (`FR-033`), dont `SC-003` chiffre la tolérance et `SC-012` la borne basse.

**Ce que « les mêmes champs d'en-tête » interdit, concrètement** : qu'un champ n'apparaisse que dans
l'un des deux cas. Une valeur tirée au hasard à chaque réponse peut différer — elle diffère déjà
d'une soumission à l'autre pour la **même** adresse, donc elle ne distingue rien —, mais sa présence
et sa longueur, elles, ne varient pas d'une adresse à l'autre (`FR-038`).

**Présentation d'un code**

| Entrée | Sortie observable |
|---|---|
| code non expiré, appareil demandeur, première présentation | session ouverte · accès à l'écran d'accueil |
| code erroné, présentations restantes | refus · invitation à vérifier la saisie (`FR-028`) |
| code présenté après quinze minutes | refus · invitation à demander un nouveau code (`FR-031`) |
| code déjà utilisé | refus · invitation à demander un nouveau code (`FR-031`) |
| code remplacé par une demande ultérieure faite depuis le même appareil | refus · invitation à demander un nouveau code (`FR-027`, `FR-031`) |
| code demandé depuis un **autre** appareil, présenté sur cet autre appareil, une demande ayant eu lieu entre-temps ailleurs | session ouverte — la demande faite ailleurs ne l'a pas touché (`FR-027`) |
| code erroné, cinquième présentation | refus · le code cesse d'être présentable (`FR-015`) · invitation à demander un nouveau code (`FR-031`) |
| code présenté depuis un autre appareil | refus · invitation à reprendre sur l'appareil demandeur (`FR-032`) |

Les refus se répartissent en **trois réponses, une par geste attendu** — retaper, demander un
nouveau code, revenir sur l'appareil demandeur : les causes qui appellent le même geste partagent le
même texte.

**Demande sous l'administration**

| Entrée | Sortie observable |
|---|---|
| **route d'administration**, session valide | la route est servie · la réponse porte la politique de sécurité et ses trois interdits (`FR-041`, `FR-042`), le refus de réinterprétation du type de contenu (`FR-043`) et le refus de transmettre l'adresse consultée (`FR-044`) |
| **route d'administration**, aucune session, session expirée, session fermée | accès refusé (`FR-019`) · renvoi vers l'écran de connexion (`FR-035`) · **la réponse de renvoi porte les mêmes en-têtes** (`FR-041`) |
| **écran de connexion**, avec ou sans session | servi · **il n'est pas une route d'administration** (Légende) : `FR-019` ne le refuse pas, et il porte les mêmes en-têtes (`FR-041`) |
| **chemin inconnu** sous l'administration | réponse d'erreur · **il n'est pas une route** — rien n'y est servi, donc ni `FR-019` ni `FR-035` ne le visent · **elle porte les mêmes en-têtes** (`FR-041`) |

**Trois lignes sur quatre disent la même chose sous trois formes, et c'est délibéré** : une politique
posée sur l'écran servi mais absente du renvoi ou de l'erreur laisse deux réponses nues sur l'origine
que partagent le site public et l'administration. C'est ce que `SC-014` compte. La quatrième ligne,
l'écran de connexion, est l'**exception que la Légende écrit** : il est la destination du renvoi, donc
l'exiger derrière une session le renverrait à lui-même — et il porte les en-têtes comme les autres,
puisque `FR-041` est rédigé sur les réponses et non sur les routes.

## NON inclus (frontière de périmètre)

- **Le moyen de reprise** (PRD `FR-009` à `FR-012`) — le code de 128 bits remis sur papier à la
  livraison. Feature dédiée. **Ce que son absence laisse ouvert** : tant qu'il n'existe pas,
  l'e-mail est l'unique entrée, et une panne d'acheminement ou une boîte inaccessible ferme
  l'administration sans recours dans le produit.
- **Le remplacement de l'adresse autorisée** (PRD `FR-013`, `FR-014`) — `docs/stack.md` **refuse
  explicitement de les porter** : `FR-005` verrouille `FR-014` tel qu'il est rédigé, et `FR-013`
  couperait à la fois la connexion et l'acheminement. Le dossier est chez
  `/scd-sdd:premortem socle` ; aucune passe aval ne doit leur inventer un porteur ici.
- **Le seuil de fréquence par origine** (PRD `FR-007`) — arbitré hors périmètre le 2026-08-19 : le
  dispositif est partagé avec `FR-062` (formulaire de devis) et part avec lui dans une feature
  anti-abus dédiée. **Ce que son absence laisse ouvert** : la branche « adresses balayées une à une »
  de `SC-021` ne peut pas être jouée en entier avant cette feature-là, et le formulaire de connexion
  reste ouvert au volume de requêtes. Seuls les **messages émis** sont bornés (`FR-008`).
- **La réception réelle du message** — les critères de cette feature portent sur l'**émission**.
  La réception et la délivrabilité vers les boîtes courantes sont le point 4 de « À constater en
  recette » de `docs/stack.md`, et s'observent sur une instance livrée. Ne pas lire cette feature
  comme « l'e-mail est couvert ».
- **La déconnexion explicite.** *Signalement de trou au PRD* : aucun `FR` du PRD ne porte un geste
  de déconnexion. Le PRD exclut la « révocation d'un accès en cours » — constater ou fermer une
  session ouverte **ailleurs** —, ce qui n'est pas la même chose que fermer la sienne sur son propre
  appareil. Rien n'est inventé ici ; le cas de l'ordinateur partagé est traité par la seule
  expiration (`FR-020`). À verser à `/scd-sdd:premortem socle`.
- **Tout écran d'administration autre que l'accueil** — pages, médias, réglages, formulaires,
  demandes. L'écran d'accueil livré ici est **vide de fonction** : il atteste que la porte ouvre sur
  quelque chose, et sert de point d'accroche aux features suivantes.
- **L'aperçu** (PRD `FR-082`) — il n'existe aucun contenu à prévisualiser. La garde de `FR-019` est
  ce qui le protégera le jour venu.
- **Le jeton anti-forgerie sur les écritures** (`ADR-0006`, mécanisme 4) — cette feature n'introduit
  **aucune écriture authentifiée** : la soumission de l'écran de connexion précède toute session, et
  l'écran d'accueil est en lecture seule. Le mécanisme naîtra avec la première écriture
  d'administration. `FR-023` couvre en revanche la moitié qui existe déjà : une requête venue d'un
  autre site n'emporte pas la session.
- **Le compteur de tentatives par adresse** — le PRD arbitre explicitement de ne pas « compter les
  sollicitations adresse par adresse », et ne traite pas l'adresse autorisée comme un secret.
- **Le geste qui pose l'adresse autorisée dans une instance neuve** — arbitré le 2026-08-19 : elle
  est écrite en base par un **geste d'exploitation ponctuel à la livraison**, hors produit, et
  documenté au dossier d'instance. Le produit n'offre aucun écran ni aucune route pour la poser
  (`FR-026`), et une instance non semée reste porte close (`FR-029`). Rien de propre à la cliente
  n'entre ainsi dans le dépôt, ce que « deux instances ont le même dépôt » (`SC-008` du PRD) exige.
  *Signalement de trou au socle* : la recette de livraison de `docs/socle-de-livraison.md` porte
  déjà le **réamorçage** de l'adresse après incident (`FR-119` du PRD), mais **aucune ligne pour la
  poser la première fois**. À verser à `/scd-sdd:premortem socle`, seul à pouvoir ajouter une ligne
  de recette.

## Critères de succès mesurables

- **SC-001** : Une personne qui n'a jamais vu le produit ouvre l'administration à partir de la seule
  adresse autorisée, sans mot de passe et sans créer de compte. Le message émis lui est remis
  **intégralement et tel quel**, à la place de la boîte e-mail que cette feature ne livre pas ; elle
  ne reçoit **aucune autre assistance**. _(PRD: SC-003, SC-006 ; FR-003 du PRD ; FR-016, FR-017,
  FR-030, FR-034 — remettre le message n'est pas de l'aide sur le produit : c'est le canal manquant
  qu'on remplace, la **réception réelle** étant hors périmètre. Elle doit toujours repérer le code
  dans le message, le recopier sans le confondre et comprendre l'écran — ce que servent les huit
  signes lisibles de `FR-034` et la mention de `FR-030`. Sans cette borne, l'épreuve se réfutait
  elle-même : la seule façon de la jouer aurait été de lui tendre le code, donc de l'aider.)_
- **SC-002** : Sur un balayage d'adresses non autorisées, **zéro** message est émis vers une adresse
  autre que l'adresse autorisée. _(PRD: SC-021 ; FR-005 du PRD)_
- **SC-003** : Sur **cent soumissions de chaque adresse** — l'adresse autorisée et une adresse
  inconnue —, la campagne étant conduite de sorte qu'**aucun tir n'atteigne le plafond d'envois**,
  l'écart entre les **95ᵉ centiles** des deux séries de délais de réponse est **inférieur ou égal à
  25 ms**, et les deux séries rendent le même corps et les mêmes champs d'en-tête. _(PRD: SC-021 ;
  FR-008 du PRD ; FR-005, FR-033, FR-038 — la condition « hors plafond » est ce qui rend l'épreuve
  exécutable : sans elle, le plafond de `FR-008` coupe la série autorisée au sixième tir et les
  quatre-vingt-quinze suivants basculent sur une branche qui ne travaille pas et rend l'**autre**
  réponse, si bien que le centile devient trivial. Ainsi conduite, la campagne oppose les deux
  branches qui diffèrent réellement par le travail — engendrer, écrire et émettre d'un côté, rien de
  l'autre. L'égalité **sous** plafond, où aucune des deux branches ne travaille, est mesurée par
  `SC-013`. Comment le plafond est tenu à l'écart, et comment la campagne laisse la fenêtre de
  comptage dans un état où le reste de la vérification peut encore se jouer, sont des moyens
  tranchés au plan.)_
- **SC-012** : Sur l'ensemble des délais mesurés par la campagne de `SC-003`, l'**étalement** —
  l'écart entre le 5ᵉ et le 95ᵉ centile, les deux séries confondues — est **au plus le vingtième de
  la médiane** de ces mêmes délais. **Sans cette seconde borne, `SC-003` resterait vrai après le
  retrait pur et simple du plancher** : l'écart entre les deux branches est du même ordre avec et
  sans lui, si bien qu'une tolérance sur l'écart, seule, ne verrait pas disparaître la protection
  qu'elle est censée mesurer. Le rapport, lui, s'effondre — plancher retiré, la médiane tombe au
  niveau du travail quand l'étalement, lui, ne bouge pas. _(PRD: SC-021 ; FR-033, SC-003 — ce
  critère se juge sur les **mêmes deux cents mesures** que `SC-003` : il n'appelle ni instrument ni
  campagne de plus. Il borne l'**écart entre les branches** plutôt que le travail lui-même, et c'est
  délibéré : de l'extérieur on n'observe que le plus long du plancher et du travail, si bien que le
  travail seul n'est pas une grandeur observable — et c'est l'écart, non le travail, qui fuit.)_
- **SC-004** : Quatre présentations fautives d'un code — rejeu, autre appareil, au-delà de quinze
  minutes, cinquième erreur — n'ouvrent **aucune** session : quatre cas, quatre refus.
  _(PRD: SC-021 ; FR-120 à FR-122 du PRD)_
- **SC-005** : Sur une rafale de soumissions de l'adresse autorisée, **au plus cinq** messages sont
  émis par heure glissante. _(PRD: SC-021 ; FR-006 du PRD)_
- **SC-006** : Aucune route d'administration n'est servie sans session valide. _(PRD: FR-001 ;
  ADR-0026)_
- **SC-007** : Sur le parcours complet — écran de connexion, message portant le code, saisie du
  code, écran d'accueil —, **aucun** des termes que la Légende énumère sous « terme de développeur »
  ne paraît dans les textes visibles. _(PRD: FR-117 ; FR-025 — la recherche des termes de la liste
  prouve ou réfute le respect sans jugement ; c'est ce qui manquait à l'interdit, qui ne se
  falsifiait pas)_
- **SC-016** : L'intégralité des textes visibles de ce parcours est relue, et n'y paraît aucun terme
  de développeur au-delà de ceux qu'énumère la Légende. _(PRD: FR-117 ; FR-025, SC-007 — la liste
  est un plancher : `SC-007` prouve mécaniquement qu'elle est tenue, celui-ci couvre ce qu'elle n'a
  pas prévu. Il suppose que ces textes soient **énumérables** ; comment ils le sont est un moyen,
  tranché au plan.)_
- **SC-008** : Aucun écran de ce parcours ne demande la connexion à un compte autre que
  l'administration. _(PRD: SC-006 ; FR-004 du PRD)_
- **SC-009** : Un code refusé produit l'une des **trois** réponses réglées sur le geste attendu, et
  celle qui correspond à sa cause : cinq causes de refus, trois réponses, aucune cause sans réponse.
  _(PRD: SC-003, SC-015 ; FR-028, FR-031, FR-032 — ce critère mesure le **guidage**, non le
  vocabulaire ; l'interdit de vocabulaire est mesuré par `SC-007`)_
- **SC-010** : Sur une instance dont la base ne porte aucune adresse autorisée, aucune soumission
  n'émet de message et aucune session ne s'ouvre. _(PRD: FR-002 ; FR-029)_
- **SC-011** : Un code émis est composé de huit signes lisibles sans ambiguïté, et l'alphabet dont
  il est tiré ne contient aucun des caractères qui se confondent à la lecture.
  _(PRD: SC-003, SC-015 ; FR-034)_
- **SC-013** : Le plafond étant atteint, la réponse rendue à une adresse inconnue porte le même
  corps et les mêmes champs d'en-tête que celle rendue à l'adresse autorisée : la soumission d'une
  adresse inconnue sous plafond fait partie de la mesure, et non la seule adresse autorisée.
  _(PRD: SC-021 ; FR-009, FR-039)_
- **SC-014** : Les **trois** formes de réponse de l'administration — un écran servi, un renvoi vers
  l'écran de connexion, un chemin inconnu — portent toutes les trois la politique de sécurité, et
  aucune des trois n'admet de script en ligne, d'évaluation dynamique de code ni de source autre que
  le site lui-même. _(ADR-0015, ADR-0024 ; FR-041, FR-042)_
- **SC-015** : Après l'émission d'un code, la lecture intégrale de ce que le système en a conservé
  ne permet pas de retrouver le code émis. _(ADR-0006, mécanisme 1 ; FR-040)_
