# Audit — Authentification

| | |
|---|---|
| **Statut** | à traiter — 12 constats, aucun arbitré |
| **Date** | 2026-08-11 |
| **Objet audité** | La chaîne d'authentification complète : [Brief](./brief.md) § Vocabulaire et Invariants · [PRD](./prd.md) `FR-001` à `FR-014`, `SC-006`, `SC-020` · [Stack](./stack.md) lignes « Auth » et « Moyen de reprise », §§ « Pourquoi un code à saisir », « La quatrième porte », « `FR-013` et `FR-014` » · candidats ADR n° 6, n° 15, n° 16 |
| **Confronté à** | [Audit Brief↔PRD](./audit-brief-prd.md) (`A-01`, `A-02`, `A-09`) · [Audit Stack](./audit-stack.md) (`S-05`, `S-06`, `S-02`, `S-01`) · [Socle de livraison](./socle-de-livraison.md) |
| **Objet** | Ce que les choix fondateurs de l'authentification sont devenus une fois descendus jusqu'à la Stack — incohérences, mécanismes sans porteur, surfaces jamais instruites — à arbitrer un par un avant `archi` et `adr` |

> **Méthode.** Quatre passes, dans l'ordre du modèle de menace et non dans l'ordre des
> documents : (1) remonter chaque mécanisme de la Stack à l'exigence qui le porte, et chaque
> exigence au choix fondateur du Brief qui l'a produite ; (2) éprouver chaque cas limite du PRD
> contre le mécanisme censé le couvrir *après* l'arbitrage de `S-05` ; (3) chercher la porte
> suivante plutôt que croire un inventaire clos — c'est la méthode que `S-06` a payée pour
> apprendre ; (4) énumérer ce qu'un attaquant obtient à chaque position, y compris celles
> qu'aucun document n'a instruites. Chaque constat porte un identifiant `AU-nn`, une sévérité,
> ses références et une piste de traitement.
>
> **Modèle de menace, qui ordonne les constats.** Le **lecteur de la boîte** domine : il obtient
> tout ce que l'authentification protège, et il est **indétectable** — notifier chaque connexion
> notifierait la boîte qu'il lit. C'est une impasse à nommer, pas à contourner. Viennent ensuite
> le **porteur du papier** (moyen de reprise), le **détenteur d'une session** (vol de cookie,
> appareil), et l'**inconnu de l'internet public**, qui n'a par construction aucun compte mais
> dispose, lui, d'un canal d'écriture — c'est `AU-01`.
>
> **Sévérités.** *Majeur* : le constat rendrait un ADR faux ou incomplet s'il descendait tel
> quel, ou laisse un trou dont l'aval (archi, ci, specs) hériterait. *Mineur* : imprécision,
> hygiène documentaire, dette de forme — corrigible sans arbitrage lourd.
>
> **Ce que cet audit ne refait pas.** Les six décisions D1-D6 rendues le 11/08 et portées dans
> `stack.md` ; l'arbitrage `S-05` lui-même, dont il part. Rien n'est sourcé ni mesuré : la
> demande porte sur les seules pièces au dépôt. Et `stack.md` est lu avec `S-02` et `S-01`
> **non encore arbitrés** — son inventaire des secrets est un état intermédiaire, jamais une
> cible.

**Vérifié sans constat.** Les quatorze `FR` de la section « Accès à l'administration »
(`prd.md:336-364`) sont atomiques et testables, et chacune trace vers `US1` ou vers un cas
limite réel ; les cinq scénarios d'acceptation d'`US1` (`prd.md:43-58`) sont tous repris par au
moins une `FR`, y compris le scénario 2 sur la non-divulgation que `A-01` avait trouvé orphelin ;
les quatre `FR` nées de `A-01` (`FR-005` à `FR-008`) ferment bien les quatre vecteurs qu'elle
nommait ; le refus du lien au profit du code (`stack.md:229-241`) tient sur un mode de panne réel
et non sur le confort, et l'entropie de 40 bits est chiffrée là où six chiffres eût été une
convention héritée ; l'argument de la session opaque est honnête sur ce qu'il achète et sur ce
qu'il n'achète pas — « une conséquence automatique n'est pas une capacité offerte »
(`stack.md:250-251`) — et l'argument faux de la révocation a été explicitement retiré en cours
d'instruction ; le refus de porter `FR-013` et `FR-014` plutôt que de laisser le niveau specs
inventer un mécanisme (`stack.md:305-308`) est la bonne décision, et le rejet sur le fond de
l'API Email Routing (`stack.md:298-304`) est correctement motivé sans avoir besoin d'être sourcé ;
les attributs du cookie, `Path` non restreint compris, sont justifiés exigence par exigence.

---

## Majeur

### AU-01 — Le canal qui authentifie est ouvert en écriture à l'internet anonyme : c'est une cinquième porte, et elle vise le facteur lui-même

**Constat.** `S-06` a compté trois portes vers l'origine commune, `S-05` en a trouvé une
quatrième, et la méthode qu'il en a tirée était de chercher la suivante. La voici, et elle ne
mène pas à l'origine commune mais **à la boîte e-mail**. Le glossaire du Brief fond en une seule
adresse celle qui ouvre l'administration et celle où les demandes sont acheminées
(`brief.md:126-128`), et `FR-063` (`prd.md:471-472`) achemine **chaque demande de devis à
l'adresse autorisée**, en y portant « les coordonnées du visiteur » (`FR-064`). Or le formulaire
de devis est la surface publique par excellence : `FR-057` (`prd.md:458-459`) l'ouvre à quiconque
renseigne ses coordonnées, et `FR-062` ne le borne qu'**au-delà d'un seuil de fréquence**, sans
exiger de compte.

Conséquence : **n'importe quel inconnu peut déposer un texte de son choix dans la boîte qui
constitue le facteur d'authentification**, autant de fois que le seuil de `FR-062` l'autorise, et
il reçoit de `FR-059` la confirmation que son envoi a abouti.

**Impact.** L'ingénierie sociale du « lisez-moi le code » était réputée fermée par la liaison du
code au navigateur demandeur (`stack.md:236-239`). Elle se rouvre par un autre bout, et bien plus
proprement : l'attaquant n'a plus besoin d'appeler l'éditrice, il écrit **dans sa boîte**, à côté
des vrais messages du produit, avec la mise en forme et le vocabulaire du produit. Il déclenche
lui-même l'envoi du vrai code depuis l'écran de connexion public — rien ne l'en empêche —, puis
dépose une demande de devis dont les coordonnées imitent un message de service, et il n'a plus
qu'à récolter. La seule chose que `FR-008` protège est l'écran de connexion ; le canal de
réception, lui, est ouvert par exigence.

Ce constat déborde l'authentification : il donne un **troisième motif** à la fusion des deux
adresses, après le verrou `FR-005`/`FR-014` et la casse des deux canaux par `FR-013`. Ce n'est
plus un défaut de rédaction, c'est un choix de départ dont le coût s'est accumulé en trois
endroits indépendants.

**Piste.** Trois formes, non exclusives. **(1)** Dissocier au PRD l'adresse qui authentifie de la
destination des demandes — ce qui referme aussi `FR-013`, et ce que `A-02` avait écarté pour un
autre motif (« deux boîtes = un second compte, contre `SC-006` ») qu'il faut rejouer : une
destination distincte n'est pas nécessairement une seconde **boîte** à visiter. **(2)** Poser à
la Stack que l'e-mail acheminé est **inerte** — texte seul, aucune mise en forme, aucun lien
cliquable issu du visiteur — et **marqué** de façon que le produit ne puisse pas être imité.
**(3)** Renvoyer à `/scd-sdd:premortem socle` avec les deux failles déjà parties, dont celle-ci
partage la racine.

### AU-02 — Le remède du cas limite « boîte compromise » repose sur `FR-013`, que la Stack vient de déclarer sans porteur

**Constat.** `prd.md:654-657` traite la compromission de la boîte : « Le remède est de retirer
l'adresse compromise en la remplaçant (`FR-013`), ce qui suppose d'entrer dans l'administration
avant lui. » Et `stack.md:278-308` conclut que `FR-013` est **aujourd'hui impossible à honorer**,
pour deux raisons indépendantes, et que la Stack refuse de le porter.

Le cas limite le plus probable du modèle de menace est donc, à ce jour, **réputé couvert par une
exigence sans mécanisme**.

**Impact.** C'est exactement la forme du défaut que `A-02` avait relevé au PRD — « le cas limite
qui déclarait la panne couverte par `FR-055` est corrigé : il l'était par affirmation, pas par
mécanisme » (`audit-brief-prd.md:229`). Le même défaut est revenu, une phase plus loin, sur le
cas limite voisin, et il est cette fois **produit** par un arbitrage : c'est le traitement de
`S-05` qui a retiré le porteur, sans que le cas limite qui en dépendait soit relu.

À noter, ce qui reste vrai : `FR-012` — remplacer le moyen de reprise — ferme bien les autres
sessions, la session opaque le lui permettant. L'éditrice peut donc **évincer** l'attaquant. Mais
il détient toujours la boîte, et l'écran de connexion est public : il rentre au coup suivant. La
seule chose qui l'arrête est le retrait de l'adresse, c'est-à-dire `FR-013`.

**Piste.** Le cas limite `prd.md:654-657` doit être réécrit pour dire ce qui est réellement
offert — l'éviction par `FR-012`, et rien de plus — et le remplacement d'adresse renvoyé à
l'arbitrage en cours. Le traitement de fond appartient à `/scd-sdd:premortem socle`, qui tient
déjà `FR-013` et `FR-014`.

### AU-03 — Le moyen de reprise est le seul secret sans entropie chiffrée, sans brûlage et dont l'usage doit rester silencieux

**Constat.** Trois asymétries, toutes vérifiables au tableau des choix retenus.

1. **L'entropie n'est pas chiffrée.** Le code de connexion est porté à **40 bits**, avec le
   motif du chiffre (`stack.md:37`, `stack.md:240-241`). Le moyen de reprise n'a que l'adjectif :
   « code de **haute entropie** haché en D1 » (`stack.md:38`). C'est le secret de plus longue
   vie, et c'est le seul qu'aucun nombre ne borne.
2. **Il n'a aucun brûlage.** Le code de connexion est « brûlé au 5ᵉ essai », `FR-006` servant de
   seconde borne. Le moyen de reprise n'en a pas — et il ne peut pas en avoir naïvement : le
   brûler sur échec offrirait à l'attaquant un déni de service sur le dernier recours de
   l'éditrice. Son unique frein est donc `FR-007`, un seuil **par origine**, qui ne dit rien
   d'une tentative distribuée.
3. **Son usage est silencieux par exigence.** `FR-010` ouvre la session « sans envoi d'aucun
   message ». C'est nécessaire — l'éditrice s'en sert justement quand sa boîte ne répond plus —
   et cela rend l'usage par un tiers **indétectable**, sur un produit qui exclut par ailleurs de
   « constater les accès en cours » (`prd.md:715-716`).

**Impact.** Le moyen de reprise est un porteur physique, permanent, à usage silencieux, dont la
seule protection contre l'épuisement est un compteur par origine — lequel repose sur l'empreinte
d'IP dont `S-02` a établi qu'elle est **réversible sans clé HMAC**, et dont l'arbitrage n'est pas
rendu. La protection du dernier recours de l'instance pend donc à un mécanisme non arbitré.

Le cas limite `prd.md:658-661` — « quelqu'un entre et ferme la porte derrière lui » — dit que le
produit ne prévoit rien, et l'assume. C'est un arbitrage légitime pour la position *après
l'entrée* ; il ne dit rien de la position *avant*, qui est celle-ci.

**Piste.** Chiffrer l'entropie du moyen de reprise dans `stack.md:38` et au candidat ADR n° 16,
au moins au niveau du code de connexion et plutôt au-delà, sa durée de vie étant sans commune
mesure. Décider s'il faut un compteur **par secret** en plus du seuil par origine, et ce qu'il
fait une fois atteint — le refus temporisé plutôt que le brûlage. Signaler dans le traitement de
`S-02` que `FR-007` porte cette charge-là aussi.

### AU-04 — La passkey n'était pas la seule forme survivant au lecteur de boîte : le secret TOTP remis à la livraison n'a jamais été examiné

**Constat.** Le traitement de `S-05` et le candidat ADR n° 6 (`stack.md:619-627`) écartent la
passkey WebAuthn en la qualifiant de « seule forme qui survivrait à un lecteur de la boîte », sur
un motif précis : « `FR-009` et le glossaire du PRD disent secret **remis** à la livraison, quand
une passkey naît sur l'appareil de l'éditrice et suppose une session déjà ouverte, et sa
récupération pend au trousseau d'un tiers ».

Ce motif ne se transpose pas à un **secret TOTP** : une graine est engendrée par l'intégrateur,
**remise sur papier à la livraison** exactement comme le moyen de reprise, ne suppose aucune
session préalable, ne dépend d'aucun trousseau tiers, n'ouvre aucun compte — donc ne heurte ni
`SC-006`, ni `FR-004`. Et elle survit au lecteur de la boîte, qui est le scénario dominant.

La quantification de l'unicité est donc fausse, et elle est fausse **de la même manière** que le
compte de trois portes de `S-06` : par inventaire clos trop tôt.

**Impact.** Un candidat ADR affirme qu'une seule alternative existait et qu'elle exigeait
d'amender le PRD. Si une seconde existe et n'exige rien de tel, l'ADR descendrait incomplet, et
l'arbitrage « le lecteur de boîte est une impasse à nommer, pas à contourner » perd son caractère
forcé — il redevient un choix, qu'il faut alors motiver.

**Ce qui plaide contre, et doit être pesé dans le même geste.** Une graine TOTP est un secret
**stocké en clair et récupérable** côté serveur, ce qui l'ajoute à l'inventaire au moment même où
la session opaque venait d'en retirer un — l'argument « un secret de moins » de `stack.md:245-247`
en serait partiellement défait. Et elle ajoute une friction permanente à chaque connexion, sur un
produit qui mesure l'autonomie sans réapprentissage après trois mois d'inusage (`SC-015`) et dont
`SC-003` exige la réussite « du premier coup ».

**Piste.** Rouvrir l'alternative au candidat ADR n° 6 et trancher explicitement — retenue,
ou écartée sur le coût d'usage et l'inventaire des secrets, mais **jamais plus sur l'unicité**.
L'arbitrage appartient à `/scd-sdd:premortem socle` s'il touche au glossaire, à la Stack sinon.

### AU-05 — Aucune exigence ne borne la durée d'une session, et l'objection qui a tué la rémanence longue en `A-02` n'a jamais été rejouée contre la session retenue

**Constat.** Aucune des quatorze `FR` d'accès à l'administration ne borne la durée d'une session,
ni ne prévoit sa fermeture — ni par expiration absolue, ni par inactivité, ni par un geste de
l'éditrice. La seule mention est une **exclusion** (`prd.md:715-716`). Côté Stack, le seul élément
de durée est un « rafraîchissement glissant » borné en écriture (`stack.md:306-308`), c'est-à-dire
un mécanisme qui **prolonge** la session, jamais qui la termine.

Une session ouverte est donc, en l'état des documents, **perpétuelle tant qu'elle sert**.

**Impact.** `A-02` avait écarté la « rémanence de session longue » comme moyen de reprise, au
motif qu'elle est « irrévocable en cas de vol d'appareil » (`audit-brief-prd.md:229`), et le
candidat ADR n° 16 reprend cette objection (`stack.md:729-732`) en notant qu'elle « perd de sa
force avec la session opaque ». Elle en perd, en effet — le remplacement du moyen de reprise
ferme les autres sessions — mais l'éditrice ne remplacera son moyen de reprise que si elle
**sait** qu'un appareil lui a été volé, et elle ne dispose d'aucun écran pour le constater.

Autrement dit : l'objection qui a suffi à écarter une **fonction** s'applique mot pour mot à la
**propriété** que le design retenu possède quand même, et elle n'a été rejouée nulle part.

**Piste.** Une `FR` bornant la durée de vie absolue d'une session, ou un motif écrit pour ne pas
en poser. Le geste « fermer les autres sessions » n'a pas besoin d'être offert — le PRD l'exclut
délibérément —, mais `FR-012` en tient déjà lieu, et le dire dans le cas limite de la boîte
compromise coûte une phrase (voir `AU-02`).

### AU-06 — La CSP stricte de l'administration est nommée parade, jamais définie, et c'est la seule des cinq mécaniques de sécurité sans contrôle bloquant

**Constat.** Deux parades cumulatives tiennent la quatrième porte (`stack.md:271-277`) :
l'invariant d'échappement et « la CSP stricte de l'administration ». La première est portée en
invariant d'`archi` (`stack.md:452-455`) **et** posée en cinquième contrôle bloquant de `ci`
(`stack.md:470-473`). La seconde ne figure ni dans les invariants, ni dans la liste des cinq
vérifications mécaniques obligatoires : elle n'existe que comme membre de phrase dans la ligne
« En-têtes de réponse » (`stack.md:45`) et dans l'amendement du candidat ADR n° 15
(`stack.md:711-714`). Aucune de ces mentions ne dit **ce que « stricte » signifie**.

**Impact.** Trois conséquences. **(1)** Le Brief pose que « le code entrant n'est pas relu ligne
à ligne » et que la confiance vient de vérifications mécaniques (`brief.md:258-262`) : une parade
sans contrôle est, dans ce projet, une parade qu'aucune relecture ne rattrapera. **(2)** Une CSP
stricte n'est pas un en-tête que l'on pose, c'est une contrainte sur la façon dont l'application
est écrite — interdire `unsafe-inline` oblige à un nonce ou une empreinte sur chaque script et
chaque style en ligne, et l'hydratation d'îlots Svelte en produit. Le coût est donc réel et
**jamais instruit**, alors qu'il porte sur la manière même dont l'administration est bâtie, ce
qui est une matière d'`archi` et non de specs. **(3)** Des deux parades cumulatives, une seule
est falsifiable ; si la seconde s'avère coûteuse au moment de l'implémentation, elle tombera en
silence, et l'origine commune se retrouvera tenue par une seule parade sans que rien ne le
signale.

**Piste.** Définir la directive au moins par ce qu'elle interdit (`unsafe-inline`,
`unsafe-eval`, sources tierces), poser le porteur du nonce, et l'ajouter à « Vérification
mécanique obligatoire » — la présence de l'en-tête sur une réponse d'administration se vérifie
mécaniquement. Si le coût sur les îlots s'avère bloquant, c'est le **sous-domaine dédié** du
candidat ADR n° 15 qui reprend la charge, et il a déjà deux motifs.

### AU-07 — Le rayon d'action d'une session compromise n'a jamais été énuméré, et il porte sur le registre durable du contenu

**Constat.** Tous les documents raisonnent sur les moyens **d'entrer**. Aucun n'énumère ce que
l'on obtient **une fois entré**. Or le produit place derrière la session d'administration le
déclenchement d'une publication (`FR-089`), qui écrit dans le dépôt de contenu de la cliente avec
le jeton `Contents: Read and write` porté par le Worker (`stack.md:34`, `stack.md:426-430`).

Ce que cela donne à un attaquant assis dans une session : publier ce qu'il veut sous le **domaine
de la cliente** — et ce domaine est le seul actif de réputation qu'elle possède ; écrire dans le
dépôt qui **est** le contenu de référence, celui sur lequel reposent `I2` (contenu en clair, hors
base) et `I3` (reconstruction sans le CMS) ; et lire l'intégralité des demandes reçues, qui sont
des données personnelles de tiers.

**Impact.** La restauration offerte par le produit ne donne qu'**un seul état antérieur**
(`brief.md:149`) : deux publications successives l'épuisent, et le retour à l'état sain cesse
d'être un geste de l'administration pour devenir une reprise sur pièces dans le dépôt. Le sinistre
ne s'arrête donc pas au site rendu, il atteint le registre durable — c'est-à-dire précisément ce
que les invariants promettent au client.

Ce que l'attaquant **n'obtient pas**, et qu'il faut écrire aussi : le jeton d'écriture lui-même,
qui est un secret du Worker et n'est jamais exposé au navigateur ; son rayon d'action reste borné
par ce que les points d'entrée de l'administration acceptent de faire. C'est exactement pourquoi
l'énumération manque — c'est elle qui dirait où poser la borne.

**Piste.** Une section de `stack.md` qui énumère le rayon d'action d'une session compromise et en
tire les bornes conséquentes : ce qu'un point d'entrée d'administration ne doit jamais permettre,
et si la publication mérite une confirmation qui ne soit pas seulement dans la session. À
confronter à `S-03`, qui tient déjà l'acteur de l'effacement et le `force: false`.

### AU-08 — L'état d'authentification n'a aucune exigence de durabilité, et `FR-011` ferme l'échappatoire

**Constat.** Trois choses vivent en D1 et n'existent nulle part ailleurs : l'**adresse
autorisée**, l'**empreinte du moyen de reprise** (`stack.md:38`) et les **sessions**. Aucune
n'est du contenu, donc `I2` — « le contenu existe à tout moment en clair, hors base »
(`brief.md:207-209`) — ne les couvre pas, et `I3` ne les reconstruit pas : un tiers rebâtit le
**site**, pas le droit d'entrer dans l'administration. Aucune `FR` n'exige de sauvegarde, de
copie ou de reconstitution de cet état ; `FR-106` ne protège que le contenu au déploiement d'une
version.

Et l'échappatoire évidente est **fermée par exigence** : `FR-011` interdit que la configuration
du déploiement conserve quoi que ce soit permettant de reconstituer le moyen de reprise.

**Impact.** La perte de la base rend l'instance **inadministrable**, sans recours dans le
produit. Le dernier recours est hors produit — la reprise sur pièces de `SC-014` — c'est-à-dire
la même issue que le cas limite « quelqu'un ferme la porte derrière lui », mais atteinte sans
attaquant, par un simple incident de plateforme.

`FR-011` est justifié : sa raison d'être est qu'un moyen de reprise reconstituable depuis la
configuration n'en est pas un. Mais il a été écrit contre un attaquant, et personne n'a vérifié
ce qu'il coûtait face à une panne. C'est la marque d'un choix de départ dont l'effet de bord
n'apparaît qu'une fois le magasin technique choisi.

**Piste.** Trancher explicitement : soit une exigence de durabilité de l'état d'authentification
et son porteur technique, soit une procédure de **réamorçage** au dossier d'instance — refaire
naître une adresse autorisée et un moyen de reprise depuis les accès de la cliente — qui devient
alors une pièce de `SC-014` et une ligne du socle §7. Le second est vraisemblablement le bon,
mais il doit être écrit, sans quoi il n'existera pas le jour venu.

### AU-09 — `FR-006` désigne l'adresse autorisée que `FR-008` veut cacher

**Constat.** `FR-008` exige qu'« aucune réponse de l'écran de connexion NE DOIT permettre de
distinguer l'adresse autorisée d'une adresse qui ne l'est pas » (`prd.md:352-353`). `FR-005`
interdit tout envoi vers une autre adresse, et `FR-006` borne le nombre d'envois vers l'adresse
autorisée (`prd.md:346-349`).

Le plafond de `FR-006` **n'est atteignable que pour l'adresse autorisée** — puisque aucune autre
ne déclenche d'envoi. Toute manifestation observable de ce plafond, sur l'écran de connexion,
distingue donc l'adresse autorisée de toutes les autres. La saisie répétée d'une même adresse
est un test que quiconque peut mener depuis un formulaire public.

**Impact.** L'énumération que `A-01` voulait fermer se rouvre, non par la réponse nominale — qui
peut rester identique — mais par le **comportement** du service : un différentiel de temps de
réponse entre le chemin qui envoie un message et celui qui n'en envoie pas, et un changement de
comportement une fois le plafond atteint. Ce n'est pas une objection théorique sur ce produit :
`FR-062` montre que le PRD sait écrire un seuil, et `prd.md:632` sait dire ce qu'il advient d'un
légitime rejeté — le même soin n'a pas été porté ici.

**Impact borné, à dire aussi.** L'adresse autorisée est celle d'une pâtissière et figure
vraisemblablement sur son propre site : l'enjeu réel n'est pas le secret de l'adresse mais le
fait que `FR-008` **promet** quelque chose que l'implémentation ne pourra pas tenir sans une
exigence de comportement constant. Une promesse intenable est pire qu'une promesse absente.

**Piste.** Amender `FR-008` pour qu'elle porte sur le comportement et non sur la seule réponse —
réponse identique, délai indistinguable, plafond sans manifestation visible côté écran — ou
qualifier ce qu'elle protège réellement. Le niveau specs doit en tirer un critère observable ;
il ne peut pas l'inventer.

### AU-10 — Les quatre mécanismes de la ligne « Auth » n'ont aucune exigence porteuse, et les quatre `FR` de sécurité aucun critère de succès

**Constat.** La ligne « Auth » (`stack.md:37`) tranche quatre mécanismes : liaison du code au
navigateur demandeur, brûlage au 5ᵉ essai, attributs du cookie, jeton anti-CSRF doublé du
contrôle d'`Origin`. Aucun n'a d'exigence en amont : les `FR-001` à `FR-008` qu'elle cite en
backref décrivent des **effets** (ouvrir, refuser, ne pas divulguer, borner), jamais ces
mécanismes-là. Symétriquement, les critères de succès mesurables ne couvrent l'authentification
que par `SC-006` (zéro compte) et `SC-020` (reprise par le moyen de reprise) : **aucun `SC` ne
mesure quoi que ce soit de `FR-005` à `FR-008`**, c'est-à-dire des quatre exigences nées de
l'audit `A-01`.

**Impact.** Le niveau specs dérive ses lots des exigences et écrit une vérification observable
par `SHALL`. Un mécanisme qui n'est porté par aucune exigence et mesuré par aucun critère est un
mécanisme qu'un lot peut **omettre sans qu'aucun contrôle échoue** — et la Stack n'est pas un
document que la `ci` vérifie. C'est le même trou que celui de `AU-06` sur la CSP, mais élargi :
il porte sur l'ensemble des défenses de la connexion.

**Piste.** Deux gestes distincts. **(1)** Un `SC` mesurable sur la résistance de l'écran de
connexion — l'épreuve existe déjà en nature dans `SC-014` et `SC-020`, il manque son équivalent
côté abus. **(2)** Au moment des specs, exiger que chaque mécanisme de la ligne « Auth »
descende en `SHALL` avec sa vérification observable, plutôt qu'en note d'implémentation. Le
candidat ADR n° 6 est le bon endroit pour l'écrire, puisqu'il les porte tous les quatre.

---

## Mineur

### AU-11 — Le dossier d'instance est la carte complète du trousseau, et rien ne dit qui peut le lire

**Constat.** `FR-112` exige que le dossier indique, pour chaque identifiant — le moyen de reprise
compris —, **où il est rangé** ; `FR-113` qu'il recense les comptes dont la récupération dépend
de la boîte e-mail ; `FR-111` les comptes ouverts et à quel nom. Le Brief ajoute qu'il « vit dans
un espace appartenant à la cliente et connu d'elle » (`brief.md:118-123`). Aucune exigence ne dit
qui peut y accéder, ni ne borne cet espace.

**Impact.** La discipline « jamais la valeur, seulement l'emplacement » est bonne et tenue
partout. Mais l'agrégation reste : un lecteur du dossier apprend **où chercher** le moyen de
reprise, et quels comptes tombent avec la boîte. C'est un plan, pas une clé — et un plan a de la
valeur pour qui a un accès physique, qui est précisément la position du porteur de papier.

**Piste.** Une phrase au Brief ou une `FR` disant que l'espace du dossier n'est pas plus ouvert
que les accès qu'il décrit. C'est de l'hygiène, pas un arbitrage.

### AU-12 — La non-divulgation de l'adresse autorisée est défaite par l'usage normal du produit

**Constat.** `FR-008` protège l'écran de connexion. Mais l'adresse autorisée est aussi la
destination des demandes (`FR-063`), et `US10` décrit l'éditrice qui traite ces demandes : dès
qu'elle répond à une visiteuse, celle-ci apprend l'adresse. Un attaquant obtient donc l'adresse
autorisée en envoyant une demande de devis et en attendant la réponse.

**Impact.** Faible en soi — voir la borne posée en `AU-09`. Il vaut surtout comme confirmation :
la fusion des deux adresses défait, un troisième fois et par un troisième chemin, une propriété
que le PRD croyait tenir. Le compte est désormais de quatre conséquences pour un seul choix de
départ : `FR-005`/`FR-014`, `FR-013`, `AU-01`, celle-ci.

**Piste.** Aucune en propre : elle se referme avec `AU-01` si la dissociation est retenue, et se
requalifie en constat accepté sinon.

---

## Récapitulatif pour le traitement

| ID | Sévérité | En une ligne | Où ça se répare |
|---|---|---|---|
| AU-01 | Majeur | Cinquième porte : l'internet anonyme écrit dans la boîte qui authentifie (`FR-063`) | prd (dissociation) + stack (e-mail inerte) + premortem |
| AU-02 | Majeur | Le remède « boîte compromise » repose sur `FR-013`, sans porteur depuis `S-05` | prd (cas limite) + premortem socle |
| AU-03 | Majeur | Moyen de reprise : entropie non chiffrée, aucun brûlage, usage silencieux exigé | stack (ligne + ADR 16) + traitement `S-02` |
| AU-04 | Majeur | La passkey n'était pas la seule forme survivant au lecteur de boîte — TOTP jamais examiné | stack (ADR 6) ou premortem si le glossaire bouge |
| AU-05 | Majeur | Aucune borne à la durée d'une session ; l'objection d'`A-02` jamais rejouée | prd (FR nouvelle) ou motif écrit en stack |
| AU-06 | Majeur | CSP stricte : parade nommée, jamais définie, sans contrôle bloquant ni coût instruit | stack + ci (6ᵉ contrôle) + archi |
| AU-07 | Majeur | Rayon d'action d'une session compromise jamais énuméré ; il atteint le registre durable | stack (§ nouveau) + premortem |
| AU-08 | Majeur | L'état d'authentification n'a aucune durabilité, et `FR-011` ferme l'échappatoire | prd ou stack + socle §7 (réamorçage) |
| AU-09 | Majeur | `FR-006` désigne l'adresse que `FR-008` veut cacher | prd (rédaction de `FR-008`) |
| AU-10 | Majeur | Quatre mécanismes sans exigence porteuse, quatre `FR` sans critère de succès | prd (`SC` nouveau) + stack (ADR 6) |
| AU-11 | Mineur | Le dossier d'instance est la carte du trousseau, sans exigence sur son propre accès | brief ou prd |
| AU-12 | Mineur | La non-divulgation est défaite par l'usage normal du produit | se referme avec `AU-01` |

**Ce que cet audit dit du soupçon de départ.** Il le confirme, et il en nomme la source. Un seul
choix fondateur produit quatre des douze constats : la **fusion, dans le glossaire du Brief, de
l'adresse qui authentifie et de l'adresse qui reçoit les demandes**. Elle était économe et juste
au niveau du Brief — une seule adresse à retenir, aucun compte à ouvrir. Elle s'est payée
`FR-005`/`FR-014`, puis `FR-013`, puis `AU-01`, puis `AU-12`, chaque fois découverte une phase
plus bas, chaque fois par un chemin indépendant. Les huit autres constats ne partagent pas de
racine unique : ils viennent de ce que la sécurité de l'authentification a été **tranchée en
mécanismes** (`S-05`) sans être **redescendue en exigences** — d'où `AU-06` et `AU-10` —, et de
positions d'attaquant que la chaîne documentaire n'a jamais parcourues : le porteur du papier
(`AU-03`), le détenteur d'une session (`AU-05`, `AU-07`), et l'incident sans attaquant (`AU-08`).
