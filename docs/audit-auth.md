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

## Récapitulatif — arbitrages rendus

Les constats ci-dessus sont **figés** : ils sont datés, et les réécrire les rendrait
invérifiables. Cette section est le seul endroit à jour du document. Elle se remplit constat
par constat, sur feu vert de l'humain ; un `ID` absent n'a pas encore été arbitré.

| ID | Sévérité | Arbitrage rendu |
|---|---|---|
| AU-01 | Majeur | **Confirmé, et refermé côté Stack seul : l'e-mail acheminé devient inerte et étiqueté ; la dissociation des deux adresses est écartée sur rejeu.** L'instruction a d'abord serré la surface d'attaque : une demande ne porte **aucun texte libre** — les sélections viennent du catalogue, le total est calculé, le visiteur n'écrit que ses coordonnées (`FR-057`, `FR-058`), sans fichier (`FR-061`). La parade est donc une propriété du gabarit d'acheminement : **texte seul, objet fixe posé par le produit, chaque donnée du visiteur derrière son étiquette** — l'imitation d'un message de service doit tenir dans une ligne « Nom : … », et le constat perd ce qui faisait sa force, « la mise en forme et le vocabulaire du produit ». Le maintien de cette propriété est rendu **mécaniquement vérifiable** : la composition inerte rejoint le § « Vérification mécanique obligatoire » de `stack.md` (6ᵉ contrôle bloquant pour `ci`), un gabarit qui redevient HTML rouvrant la porte en silence. **La dissociation au PRD est écartée** : la seule forme qui ferme la porte — une adresse d'authentification **dédiée**, ne recevant que les codes, tout alias remélangeant les flux — est un compte ouvert par l'intégrateur et visité à chaque connexion, contre la **lettre** de `SC-006` (« jamais visités par elle ») et contre `FR-004`, avec son mot de passe au dossier d'instance (`AU-11` s'aggrave), le réapprentissage que `SC-003`/`SC-015` interdisent, et une **compromission silencieuse** — une boîte regardée seulement à la connexion, l'attaquant s'y installe sans bruit : le cas limite « boîte compromise » s'aggrave au lieu de se refermer. L'écarté de `A-02` (« deux boîtes = un second compte, contre `SC-006` ») **tenait donc, pour des motifs plus forts que le sien** ; son second motif, les pannes corrélées, est mort de son propre remède — le moyen de reprise. Enfin la dissociation ne refermait pas ce qu'on lui prêtait : le verrou `FR-005`/`FR-014` et le sort de `FR-013` tiennent au binding `send_email` — destination **vérifiée**, via le compte Cloudflare que `SC-006` interdit de faire visiter —, indépendant du nombre d'adresses ; ces dettes restent au dépôt de `S-05` pour `/scd-sdd:premortem socle`. **Limites assumées** : un client de messagerie peut rendre cliquable une URL collée dans un champ — elle reste derrière son étiquette — et le canal reste ouvert en écriture, un texte marqué atteignant toujours les yeux de l'éditrice ; ce résidu part au même dossier premortem, avec la racine qu'il partage. Portés dans `stack.md` : ligne « Acheminement des demandes » amendée, § « La cinquième porte » (**nouveau**), § « Vérification mécanique obligatoire » porté de cinq à six contrôles, candidat ADR n° 9 amendé, § « Ce que cette phase dépose ». |
| AU-02 | Majeur | **Confirmé, et refermé au PRD : le cas limite « boîte compromise » dit désormais ce qui est réellement offert — l'éviction, portée par `FR-012` amendé — et le retrait de l'adresse (`FR-013`) reste nommé comme seul remède durable, sa dépendance consignée.** L'instruction a d'abord vérifié l'éviction : elle est réelle — la session opaque ferme les autres sessions au remplacement (`stack.md`, § « Pourquoi un code à saisir, et pourquoi une session opaque ») — mais elle n'avait **aucun porteur au PRD** : `FR-012` ne disait que « l'ancien cessant alors d'ouvrir une session », et un lot l'implémentant à la lettre aurait laissé la session de l'attaquant vivante — une occurrence de plus de la forme exacte du défaut constaté, couvert par affirmation. `FR-012` est donc amendé — toute session ouverte autre que celle du remplacement est fermée — et l'exclusion « Révocation d'un accès en cours » gagne la clause qui la garde vraie : la fermeture est une **conséquence automatique** du remplacement, pas une fonction de constat ou de fermeture à la demande — l'argument déjà écrit en Stack. Le cas limite réécrit cesse de promettre : l'éviction « et rien de plus », l'attaquant qui tient la boîte revient au code suivant par l'écran public, et le retrait de l'adresse compromise (`FR-013`) reste le remède durable — l'exigence demeure au PRD, son portage reste au dépôt de `S-05` pour `/scd-sdd:premortem socle`. **Résidu assumé** : tant que le premortem n'a pas donné de porteur à `FR-013`, le remède durable reste une exigence sans mécanisme — le cas limite le présente désormais comme une suite conditionnée (« suppose d'entrer avant lui »), non comme une couverture ; le cas voisin « perd l'accès à sa boîte » repose sur les mêmes `FR-013`/`FR-014` et suivra le même dossier. **Écartés** : cesser de nommer `FR-013` au cas limite — l'exigence deviendrait orpheline de son cas d'usage, et le cas voisin la cite toujours : le PRD se contredirait d'un cas à l'autre ; réécrire le seul cas limite sans amender `FR-012` — l'éviction serait restée couverte par affirmation, le défaut reproduit dans son propre remède. Portés dans `prd.md` : `FR-012` amendé, cas limite « boîte compromise » réécrit, exclusion « Révocation d'un accès en cours » précisée. |
| AU-03 | Majeur | **Confirmé, et refermé côté Stack seul : l'entropie du moyen de reprise est chiffrée à 128 bits, et c'est elle qui porte tout — aucun frein par secret n'est ajouté.** L'instruction a d'abord vérifié les trois asymétries : toutes tiennent (`stack.md:37` contre `:38`, `FR-010`, exclusion « Révocation d'un accès en cours ») — et elle en a trouvé une **quatrième**, que le constat n'exploitait pas : le hachage n'est algorithmé nulle part (« haché en D1 », rien de plus), donc le régime **hors ligne** devait être instruit — une lecture de la base livre le hachage d'un secret **permanent**, et 40 bits y tombent en 55 s sur un GPU, 1,7 an même sous KDF lent. Le rejeu chiffré a montré que le 40 bits du code de connexion tient à l'**expiration** et au **brûlage**, que le moyen de reprise n'a pas ; dès 80 bits, les trois régimes — en ligne distribué contournant `FR-007` par le nombre d'origines, borne de quota (les 5 M req/jour de l'Annexe A épuisent l'instance avant l'espace de recherche), hors ligne — sont sans objet **par arithmétique seule**. **128 bits** est retenu pour la marge : 26 caractères base32, groupés pour la recopie — le coût d'une clé produit, une fois par incident. Ce chiffrage **décroche le dernier recours de `S-02`** : la protection ne pend plus à l'empreinte non arbitrée — c'était l'impact du constat — et `FR-007` redevient un simple frein anti-bruit ; le traitement de `S-02` en est prévenu, sa charge est allégée et non alourdie comme la piste le prévoyait. **Aucun frein par secret** : à cette entropie, il n'ajoute rien contre la devinette. **Écartés** : le **refus temporisé après N échecs** — la suggestion de la piste — parce qu'un attaquant qui entretient les échecs à bas coût ferait heurter le refus à l'éditrice pendant son urgence : le déni de service sur le dernier recours que le constat interdisait au brûlage, en version adoucie ; la **temporisation par tentative** (~1/s par secret) — saine (17 433 ans même à 40 bits, l'éditrice jamais refusée) mais redondante à cette entropie : un mécanisme et un état de plus pour rien. **Nuance versée au dossier** : « réémis à l'emploi » fait qu'un usage par un tiers **consomme le papier** de l'éditrice — l'usage silencieux exigé par `FR-010` n'est pas parfaitement indétectable, elle le découvre quand son papier ne marche plus ; tard, et c'est le cas limite « ferme la porte derrière lui », déjà assumé. **Résidu assumé** : le flood du formulaire de reprise brûle le quota de l'instance — vrai avec ou sans frein ; Turnstile et `FR-007` restent devant l'écran. Portés dans `stack.md` : ligne « Moyen de reprise » chiffrée, candidat ADR n° 16 amendé (entropie motivée, frein écarté) ; note au traitement de `S-02` (fiche en attente). |
| AU-04 | Majeur | **Confirmé, et refermé côté Stack seule : l'unicité de la passkey était fausse — le secret TOTP remis à la livraison survit aussi au lecteur de boîte — et le TOTP est écarté sur ses coûts propres, jamais plus sur l'unicité.** L'instruction a vérifié la transposition : aucun des quatre motifs du rejet de la passkey (« secret **remis** à la livraison », naissance sur l'appareil, session préalable supposée, trousseau tiers) ne s'applique à une graine engendrée par l'intégrateur et remise sur papier — `SC-006` et `FR-004` restent intacts. La quantification était fausse par inventaire clos trop tôt, la forme même du compte de trois portes de `S-06`. Trois coûts propres, chacun ancré à une pièce : **(1)** la graine n'est vérifiable qu'en **clair** côté serveur — le régime hors ligne instruit en `AU-03` la livrerait telle quelle sur une lecture de la base, là où le moyen de reprise ne concède qu'un hachage à 128 bits — et l'inventaire se rallonge au moment où la session opaque le raccourcissait (« retire un secret de l'inventaire », partiellement défait) ; **(2)** un outil à provisionner et une saisie de plus à chaque connexion, contre `SC-003` (« du premier coup »), `SC-015` (trois mois d'inusage, sans réapprentissage) et la promesse du glossaire « par sa seule adresse e-mail » — la friction n'est pas celle du papier de reprise, qui sert une fois par incident quand les `SC` mesurent le parcours courant ; **(3)** le gain serait partiel : la boîte reste la clé de voûte de l'instance (Brief, cas « perte ou compromission ») — sa lecture porte la récupération des comptes tiers, le chemin légitime de `SC-014` étant aussi celui de l'attaquant. L'arbitrage « le lecteur de boîte est une impasse à nommer, pas à contourner » cesse d'être forcé et devient un choix motivé — ce que la piste exigeait. **Second facteur examiné et non matérialisé** : double friction sur le parcours courant, même graine en clair, même gain partiel — il cumule les coûts des deux options sans l'apport propre d'aucune. **Nuance versée au dossier** : la connexion en lecture seule est le chemin le plus discret — aucun geste dans la boîte, aucune notification, là où la reprise des comptes tiers fait du bruit — et le TOTP l'aurait fermé ; ce résidu rejoint la famille « boîte compromise » au dépôt de `S-05` pour `/scd-sdd:premortem socle`. **Écartés** : retenir le TOTP en facteur primaire — le glossaire bouge (« par sa seule adresse e-mail »), l'arbitrage aurait quitté la Stack pour le premortem, quand ses trois coûts sont documentaires et décidables maintenant ; laisser l'alternative ouverte au candidat ADR — il descendrait incomplet, l'impact même que le constat dénonçait. Le glossaire ne bouge pas. Porté dans `stack.md` : candidat ADR n° 6 amendé — unicité corrigée, TOTP écarté en propre, résidu nommé. |
| AU-05 | Majeur | **Confirmé, et refermé au PRD et à la Stack : toute session expire — sept jours sans usage, trente jours d'âge — porté par `FR-118`, et l'objection d'`A-02` enfin rejouée contre la session retenue.** L'instruction a d'abord confirmé le constat sur pièces : aucune exigence ne fermait jamais une session — la seule mention était l'exclusion « Révocation d'un accès en cours » — et le « rafraîchissement glissant » de la Stack supposait une **durée de base à faire glisser, écrite nulle part** : un mécanisme sans exigence porteuse, la forme même d'`AU-10`, trouvée trois constats avant lui. Le rejeu d'`A-02` a tenu : le candidat ADR n° 16 notait que l'objection « perd de sa force avec la session opaque », et c'est vrai — `FR-012` ferme les autres sessions au remplacement — mais ce geste suppose que l'éditrice **sache** qu'une session survit quelque part, et le PRD lui refuse délibérément tout écran pour le constater : l'objection « irrévocable en cas de vol d'appareil », qui a suffi à écarter une **fonction**, s'appliquait mot pour mot à la **propriété** que le design possédait quand même. **Deux bornes** plutôt qu'une : l'absolue (30 jours) est la seule qui arrête un attaquant qui **entretient** la session volée — le glissant l'aurait renouvelée sans fin — ; l'inactivité (7 jours) éteint en une semaine la session oubliée sur un appareil partagé, et donne enfin au glissant son exigence porteuse. **Friction nulle sur le parcours mesuré** : `SC-015` prévoit trois mois d'absence, donc l'éditrice se reconnecte de toute façon après toute absence longue, par le geste même que `SC-003` éprouve — un code par e-mail, rien à retenir ; un rythme hebdomadaire ne se reconnecte jamais. L'expiration rejoint `FR-012` dans l'exclusion « Révocation d'un accès en cours » comme **conséquence automatique**, pas une fonction offerte — l'argument qui avait sauvé `FR-012` en `AU-02`. **Un volet de la piste était déjà consommé** : la phrase du cas limite « boîte compromise » disant que `FR-012` évince les sessions y est depuis l'arbitrage d'`AU-02`. **Limite assumée** : une borne ne ferme pas l'appareil volé, elle borne la fenêtre — trente jours au lieu de l'infini ; la vraie fermeture reste `FR-012`, la borne est le filet quand elle ne sait pas. **Écartés** : la borne absolue seule — le glissant restait sans exigence porteuse, le trou d'`AU-10` reproduit au moment de le refermer ; aucune borne avec motif écrit en Stack — le motif aurait dû poser la session perpétuelle comme acceptée, c'est-à-dire réécrire l'objection d'`A-02` pour conclure l'inverse sans fait nouveau ; la paire **24 h / 7 j** — fenêtres minimales mais reconnexion à presque chaque visite, un aller-retour e-mail payé sur le parcours courant que les `SC` mesurent ; la paire **30 j / 90 j** — la session dormante survivrait un mois entier, et rien au dépôt ne motive 90 jours plutôt que 30. Portés : `FR-118` (PRD, nouveau, « Accès à l'administration »), exclusion « Révocation d'un accès en cours » complétée, ligne « Auth » de `stack.md`, § « Une session opaque plutôt qu'un cookie signé » amendé, candidat ADR n° 6 amendé. |
| AU-06 | Majeur | **Confirmé, et refermé côté Stack seul : « stricte » est définie par ses interdits, le nonce a son porteur, la CSP devient le septième contrôle bloquant et le second invariant déposé pour `archi` — avec une correction à la piste : le sous-domaine dédié n'est pas un repli pour cette porte.** L'instruction a confirmé le constat sur pièces : la CSP n'existait que comme membre de phrase — ligne « En-têtes de réponse », § « La quatrième porte », candidat ADR n° 15 — sans définition, sans invariant, sans contrôle, quand l'autre parade cumulative, l'invariant d'échappement, avait les trois ; une parade sans contrôle est, dans ce projet, une parade qu'aucune relecture ne rattrapera (`brief.md`, « le code entrant n'est pas relu ligne à ligne »). **La trouvaille de l'instruction** : le repli que la piste nommait est faux — un script stocké dans la liste des demandes s'exécute dans la page d'administration elle-même, quel que soit son domaine ; le sous-domaine dédié ne vaut que contre le XSS venu des pages publiques. Pour la quatrième porte il n'existe donc que deux parades au monde, et un renoncement à la CSP serait désormais un arbitrage à écrire, jamais une chute silencieuse. **La définition retenue tient aux interdits** — aucun `unsafe-inline`, aucun `unsafe-eval`, aucune source tierce hors `challenges.cloudflare.com` (Turnstile, déjà exigé des deux côtés) — avec le porteur du nonce nommé : le second porteur d'en-têtes, le code qui génère la réponse posant la même valeur dans l'en-tête et dans le balisage. Le coût sur l'hydratation des îlots Svelte n'est pas nié : il est confié à `archi` par l'invariant déposé, qui l'oblige à instruire le mécanisme — nonce ou empreinte — avant de figer la manière dont l'administration est bâtie. **Écartés** : le contrôle de présence seul — `default-src * 'unsafe-inline'` passerait au vert, le contrôle certifierait une parade morte, pire que le silence actuel ; renoncer à la CSP avec motif écrit — la porte resterait tenue par une parade unique couverte par affirmation, la forme que le Brief refuse, et le repli supposé n'existe pas ; figer la directive complète — les sources exactes dépendent de choix d'implémentation que le dépôt ne porte pas, les interdits sont le noyau falsifiable, ce que la piste elle-même demandait. Portés dans `stack.md` : § « La quatrième porte » (définition et absence de repli), « Vérification mécanique obligatoire » porté de six à sept contrôles, § « Ce que `archi` devra reprendre en invariants » (second invariant de la quatrième porte), candidat ADR n° 15 amendé. |
| AU-07 | Majeur | **Confirmé, et refermé côté Stack seul : l'énumération est écrite, et elle montre que la borne du registre durable était déjà posée par le `force: false` de `S-03` — aucun mécanisme neuf, trois résidus versés à leurs dossiers.** L'instruction a d'abord vérifié le rayon sur pièces : une session compromise déclenche une publication qui écrit dans le dépôt de contenu (`FR-089`, jeton `Contents: Read and write` du Worker, `stack.md:34`), portant `I2`/`I3` (`brief.md:207-211`), et lit toutes les demandes reçues, données personnelles de tiers (`FR-065` à `FR-079`). **La confrontation à `S-03` demandée par la piste a donné la clé** : la publication écrit en `force: false` — on ne peut qu'ajouter des commits, jamais réécrire ni effacer —, donc une session volée peut **enterrer** le contenu de référence mais pas le **détruire** ; le bon reste dans l'historique git, `I3` garantit la reconstruction, le sinistre est réversible hors du produit sans perte. Le même `force: false` posé par `S-03` pour la concurrence borne, pour un second motif, la session compromise. La nuance de l'impact est écrite : « deux publications épuisent l'unique état antérieur » vaut de la restauration offerte par l'admin (`FR-092`/`FR-094`), un filet à un cran — pas de git, qui garde tout ; le retour à l'état sain devient une reprise git (coût réel, développeur requis), non une perte. **Ce que la session ne prend pas** est écrit aussi : le jeton, secret du Worker jamais exposé au navigateur — une session ne fait que *demander* au Worker de publier, son rayon borné par ce que les portes d'admin acceptent de faire, rien qui excède l'usage légitime de l'éditrice. **Écartés** : réduire la portée du jeton — il est hors de portée de la session, cela borne le Worker (qui a besoin d'écrire), pas la session ; exiger une confirmation hors-session à la publication — combat `FR-003`, tue `SC-003`/`SC-015` par un code à chaque publication, et ne ferme pas la lecture des demandes, qui n'exige aucune publication (même logique que le rejet du TOTP en `AU-04`) ; poser un cran « action dangereuse » exigeant le moyen de reprise ou un délai — le papier sert une fois par incident, un délai retarde l'éditrice pour un contenu déjà réversible. **Trois résidus qu'aucune borne d'authentification ne ferme** : la lecture des demandes (confidentialité de tiers, la session *doit* les lire) rejoint le cadrage des données personnelles (fiche en attente) ; la branche `media`, seule exception au `force: false` par son élagage en `force: true`, laisse détruire des médias publiés là où le contenu est indestructible — asymétrie portée à `/scd-sdd:premortem socle` ; la fenêtre de réputation entre la publication hostile et le `git revert`, au même dossier. Porté dans `stack.md` : § « Le rayon d'une session compromise, et où il s'arrête » (**nouveau**, après la cinquième porte). Aucun changement au PRD. |
| AU-12 | Mineur | **Requalifié en constat accepté, par l'arbitrage de `AU-01`** — l'issue que son propre constat prévoyait si la dissociation n'était pas retenue. L'adresse autorisée continue de se divulguer par l'usage normal : répondre à une demande l'apprend au demandeur. Impact « faible en soi », par le constat lui-même ; la borne reste celle discutée en `AU-09`, à arbitrer. Aucun texte porté. |
