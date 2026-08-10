# Audit de cohérence — Brief ↔ PRD

| | |
|---|---|
| **Statut** | traité — 11 constats sur 11 arbitrés le 2026-08-10 |
| **Date** | 2026-08-10 |
| **Documents audités** | [Brief](./brief.md) (accepted, amendé 2026-08-10) · [PRD](./prd.md) (accepted, 2026-08-10) |
| **Objet** | Incohérences et oublis entre les deux documents, à arbitrer un par un |
| **Issue** | PRD : 103 → 117 FR (renumérotation complète), 19 → 20 SC, 13 → 17 cas limites, 4 exclusions ajoutées · Brief amendé en 2 points · 1 recherche versée ([rétention](./research/2026-08-10-retention-donnees-demandes-devis.md)) |

> **Méthode.** Croisement systématique : chaque rubrique du Brief (Inclus, EXCLU,
> contraintes, invariants, SC, questions ouvertes) contre les US, FR, SC, cas limites et
> NON inclus du PRD, et retour. Chaque constat porte un identifiant `A-nn`, une sévérité,
> les références, et une piste de traitement. Le traitement se fait dans un second temps,
> constat par constat.
>
> **Sévérités.** *Majeur* : une exigence du Brief reste sans exigence PRD, ou une décision
> du PRD contredit le Brief — l'aval (Stack, specs) hériterait du trou. *Mineur* : perte de
> précision, ambiguïté locale, hygiène documentaire — corrigible sans arbitrage lourd.

**Vérifié sans constat** : les 17 exclusions du Brief sont toutes reprises dans le NON
inclus du PRD ; SC-001 à SC-015 sont repris sans renumérotation ; la numérotation FR-001 à
FR-103 est continue ; l'exemple chiffré d'US10 (11+3=14, 3 commandes) est juste ; la
mécanique suppression d'image → retrait en brouillon → effacement conditionnel à la
publication (FR-025 à FR-028) est cohérente avec SC-010 et couvre ses propres cas limites
(abandon de brouillon, image posée uniquement en brouillon).

---

## Majeur

### A-01 — La surface admin, exposée au public, n'a aucune exigence de protection

**Constat.** Le Brief nomme **deux** surfaces exposées à l'internet public : « l'envoi
d'une demande de devis […] **et l'accès à l'admin** » (brief.md:260-266). Le PRD ne couvre
que la première : FR-051 (seuil de fréquence) ne porte que sur les demandes. Aucune FR ne
borne les tentatives de connexion à l'administration. Par ailleurs le scénario 2 d'US1
(« rien ne révèle quelles adresses sont autorisées », prd.md:39-41) n'est repris par
aucune FR — FR-002 exige le refus, pas la non-divulgation.

**Impact.** La connexion par preuve de maîtrise d'une adresse e-mail implique un envoi
d'e-mail par tentative : une soumission massive sur l'écran de connexion consomme le quota
du service d'envoi et met en danger la délivrabilité du compte de la cliente — exactement
ce que la contrainte du Brief interdit (« ni consommer les quotas gratuits (I5), ni mettre
en danger le compte d'envoi d'e-mail »). L'énumération d'adresses est aussi possible sans
FR qui l'interdise.

**Piste.** Étendre FR-051 (ou créer FR dédiée) aux sollicitations de l'écran de connexion ;
ajouter une FR « aucune réponse de l'écran de connexion NE DOIT révéler si une adresse est
autorisée ».

### A-02 — La connexion admin dépend du même canal e-mail que la réception des demandes ; la panne les emporte ensemble

**Constat.** FR-055 fait de la liste des demandes de l'admin le filet quand l'acheminement
e-mail échoue (prd.md:426-427, cas limite prd.md:551-553). Mais l'ouverture d'une session
passe par la preuve de maîtrise d'une adresse e-mail (FR-001), donc — sauf moyen non
e-mail tranché en Stack — par le **même service d'envoi**. Ni le Brief ni le PRD ne
relèvent que la panne d'acheminement (compte suspendu, palier atteint, délivrabilité)
bloque simultanément la réception des demandes **et** l'accès au filet censé la pallier.

**Impact.** Le cas limite « l'acheminement cesse en silence » est réputé couvert par
FR-055, alors que dans le scénario de panne le plus probable, la cliente ne peut plus
ouvrir l'admin pour consulter la liste. La question ouverte du Brief (« détection d'une
panne d'acheminement », brief.md:349-353) est transmise à la phase Stack sans cette
donnée, qui change la nature du problème.

**Piste.** Soit une FR découplant l'ouverture de session de la réussite du service d'envoi
des demandes (deux canaux, ou tolérance de session longue), soit a minima compléter la
question ouverte transmise à la Stack pour que le couplage soit arbitré là-bas en
connaissance de cause.

### A-03 — L'intégrité des « deux nombres » n'est pas exigée face au spam sous le seuil ni face aux suppressions

**Constat.** Le Brief exige qu'une soumission massive ne puisse « ni rendre la liste des
demandes inutilisable, **ni fausser les deux nombres** qui en sortent » (brief.md:262-264).
Le PRD n'a que FR-051 (rejet au-delà d'un seuil de fréquence) : des soumissions
automatisées **sous le seuil**, ou distribuées, entrent dans la liste et comptent dans
FR-063/FR-064 sans qu'aucune exigence n'en préserve la lecture. Symétriquement, l'effet de
la suppression manuelle (FR-062) sur les compteurs n'est pas spécifié : une demande
supprimée compte-t-elle encore dans « ce que le site a apporté » ?

**Impact.** Les deux nombres sont l'instrument central revendiqué par le Brief (« Deux
nombres en sortent ») et par SC-019 ; leur sémantique n'est pourtant définie que pour le
cas nominal. Le niveau specs ne saura pas quoi tester.

**Piste.** Décider et écrire : (a) le comportement attendu de la liste et des compteurs
face aux entrées indésirables restantes (au minimum, assumer explicitement que la
suppression manuelle est le seul remède) ; (b) une FR fixant que les compteurs portent sur
les demandes **présentes** dans la liste (ou l'inverse).

### A-04 — Le PRD ferme des questions que le Brief dit « à cadrer avant la première mise en ligne »

**Constat.** Deux questions ouvertes du Brief exigent un cadrage **avant mise en ligne**,
et le PRD les arrête en exclusions sans que le cadrage ait eu lieu :

1. **Données personnelles** (brief.md:362-366) : information, **durée de rétention,
   effacement** sont « à cadrer avant la première mise en ligne » et la relecture juridique
   ne couvre que le clausier. Le PRD introduit la mention d'information (FR-033, FR-045 —
   bien) mais arrête « aucune purge automatique, l'effacement est un geste de l'éditrice »
   (prd.md:616-617) — une décision de rétention prise **avant** la relecture juridique qui
   pourrait imposer l'inverse.
2. **Perte de la boîte e-mail** (brief.md:354-358) : le Brief demande « quel est le chemin
   de reprise […] qu'exige-t-il d'avoir été **préparé à la livraison** ». Le PRD classe le
   sujet NON inclus avec pour seule réponse un recensement documentaire (FR-099) — il
   recense les comptes dépendants, il ne prépare aucun chemin de reprise pour l'admin
   elle-même (l'adresse de secours est explicitement exclue, prd.md:618-619).

**Impact.** Deux exclusions du PRD sont présentées comme des décisions alors qu'elles
préemptent un cadrage que le Brief déclare bloquant pour la mise en production. Si le
cadrage juridique ou le premier incident les invalide, c'est le PRD qu'il faudra rouvrir.

**Piste.** Soit conditionner explicitement ces deux exclusions (« sous réserve du cadrage
prévu au Brief »), soit faire le cadrage maintenant et confirmer les décisions, soit les
reclasser en questions ouvertes du PRD.

### A-05 — Les formulaires ont des brouillons, mais le vocabulaire, le récapitulatif et l'abandon ne connaissent que « pages et réglages »

**Constat.** US5 crée des « brouillons de formulaire » (prd.md:113-115) et US4/FR-034 des
brouillons de réglages. Or : la définition de *Brouillon* du chapeau (« état non publié
d'une **page ou d'un réglage** », prd.md:17) ignore les formulaires ; le récapitulatif de
publication (FR-069) et SC-016 ne listent que « pages et réglages » ; l'abandon de
brouillon (FR-078, FR-079) n'existe que **par page** — aucun moyen d'abandonner le
brouillon d'un réglage transverse ou d'un formulaire n'est spécifié, ni son exclusion
assumée.

**Impact.** Trois lectures possibles (formulaire = réglage ; formulaire = troisième objet
publiable ; formulaire porté par une page) qui donnent des récapitulatifs et des
restaurations différents. SC-016 exige « aucune omission » d'un récapitulatif dont le
contenu exact est ambigu. Le niveau specs tranchera implicitement, c'est-à-dire mal.

**Piste.** Étendre le vocabulaire (*Brouillon* couvre pages, réglages, formulaires),
compléter FR-069/SC-016, et décider si l'abandon de brouillon existe pour les réglages et
formulaires (FR dédiée) ou est exclu (ligne NON inclus).

---

## Mineur

### A-06 — Le « remplacement » de l'écran Médias du Brief n'a pas d'équivalent bibliothèque dans le PRD

**Constat.** Le Brief liste parmi les gestes de l'écran de gestion : « recherche,
renommage, suppression, **remplacement**, et réemploi » (brief.md:94-96). Le PRD n'a que
FR-024, « remplacer l'image **posée dans un emplacement** » — un geste d'édition de page,
pas de bibliothèque. Le remplacement du fichier d'une image de la bibliothèque (nouvelle
version d'une photo, propagée à tous ses emplacements) n'existe dans aucune FR, et n'est
pas non plus exclu.

**Piste.** Trancher : ajouter une FR de remplacement de fichier au niveau bibliothèque, ou
acter dans NON inclus que « remplacement » au sens du Brief se fait emplacement par
emplacement.

### A-07 — Le manifeste des médias du PRD perd les dimensions citées par le Brief

**Constat.** Le Brief décrit le manifeste : « clé, nom d'origine, **dimensions**, texte
alternatif » (brief.md:338-340). FR-094 et US13-2 retiennent « identité, nom d'origine,
description » — les dimensions ont disparu sans arbitrage tracé.

**Piste.** Les réintégrer dans FR-094, ou acter leur abandon (elles sont re-dérivables du
binaire, ce qui peut justifier l'omission — mais alors l'écrire).

### A-08 — SC-005 a perdu son instrument de mesure

**Constat.** Brief : « score **Lighthouse** Performance ≥ 95 en mobile » (brief.md:279-280).
PRD SC-005 : « score de performance ≥ 95 en conditions mobiles » — l'agnosticisme
technologique du PRD a retiré l'outil, mais un score sans instrument nommé n'est plus
mesurable tel quel.

**Piste.** Assumer la référence à l'instrument dans le SC (un outil de mesure n'est pas un
choix de stack), ou noter que l'instrument est fixé en phase Stack/CI.

### A-09 — « L'adresse de l'éditrice » (FR-052) est indéterminée face à la liste d'adresses autorisées et aux coordonnées éditables

**Constat.** FR-001 introduit une **liste** d'adresses autorisées (pluriel possible, en
tension avec « un seul éditeur par site » du Brief, brief.md:144-145) ; FR-031 rend les
coordonnées de contact éditables ; FR-052 achemine « à l'adresse de l'éditrice » sans dire
laquelle : l'adresse de connexion ? la première de la liste ? les coordonnées de contact
affichées au public ?

**Piste.** Une phrase de vocabulaire ou une FR : l'adresse de réception des demandes est
un réglage désigné (et dire si la liste d'adresses autorisées peut en contenir plusieurs,
et pourquoi ce n'est pas du multi-éditeur).

### A-10 — La fidélité de l'aperçu n'est définie que pour le brouillon de la page

**Constat.** FR-066/FR-067 définissent l'aperçu d'**une page** présentant **son**
brouillon. Rien ne dit si l'aperçu rend aussi les brouillons des réglages transverses
(nouveau téléphone en pied de page) et des options de formulaire posées sur la page —
alors qu'US6 promet « exactement ce que verront ses visiteurs ».

**Piste.** Étendre FR-067 : l'aperçu rend la page avec l'ensemble des brouillons qui la
concernent (page, réglages, formulaires), ou assumer l'inverse.

### A-11 — Hygiène de traçabilité et pertes de précision dans la reprise des SC

**Constat.**
- SC-016 à SC-019 ne sont tracés par aucune user story, alors qu'ils naissent d'US6, US4,
  US3 et US10 respectivement (les lignes « Trace » de ces US ne les citent pas).
- SC-011 PRD perd la précision du Brief « l'identité binaire des fichiers n'est pas
  exigée » (brief.md:304) — c'est elle qui rend l'épreuve arbitrable.
- SC-002 PRD perd la note « pas d'échéance contractuelle » ; SC-006 PRD perd « les comptes
  portés par son nom […] jamais visités par elle ».
- La contrainte du Brief « le dossier d'instance est une pièce **tenue à jour** […] se
  vérifie par exécution » (brief.md:226-233) n'a pas de FR : FR-096 à FR-102 décrivent un
  contenu, pas la propriété d'être maintenu.

**Piste.** Compléter les lignes Trace des quatre US ; réintégrer les trois précisions
perdues ; décider si la tenue à jour du dossier relève d'une FR ou de la seule épreuve
SC-014.

---

## Récapitulatif — arbitrages rendus

Les numéros de FR ci-dessous sont ceux du PRD **après** traitement (renumérotation complète,
`FR-001` à `FR-117`). Les références des constats ci-dessus renvoient, elles, à la
numérotation d'avant.

| ID | Sévérité | Arbitrage rendu |
|---|---|---|
| A-01 | Majeur | **Quatre FR dédiées** plutôt qu'une extension du seuil générique : aucun message vers une adresse non autorisée (`FR-005`), plafond d'envois vers l'adresse autorisée (`FR-006`), seuil par origine sur les tentatives (`FR-007`), non-divulgation (`FR-008`). Ferme séparément les quatre vecteurs, dont l'énumération par balayage — que le refus de session de `FR-002` ne couvrait pas. |
| A-02 | Majeur | **Moyen de reprise non e-mail** remis à la livraison (`FR-009` à `FR-012`) : seule réponse couvrant les deux bouts de la chaîne (expéditeur suspendu **et** boîte injoignable), et révocable par la cliente. Écartées : la rémanence de session longue (irrévocable en cas de vol d'appareil), la destination distincte (deux boîtes = un second compte, contre `SC-006`, et pannes corrélées), le second service d'envoi (demi-couverture, coût plein). Le cas limite qui déclarait la panne couverte par `FR-055` est corrigé : il l'était par affirmation, pas par mécanisme. Referme `A-04.2` au passage. |
| A-03 | Majeur | **Trois nombres, dont le troisième n'apparaît que s'il est non nul** — présentes, commandes, retirées (`FR-075` à `FR-078`) — plutôt que le choix binaire « compteur qui ment par excès / par omission ». Ce qui faussait la lecture n'était pas le retrait, mais son invisibilité. Le retrait porte un motif déclaré **au moment du geste** (`FR-073`) : un retrait indésirable n'est compté nulle part. Retrait groupé (`FR-074`), sans quoi le remède manuel rendait lui-même la liste inutilisable. Le comptage survit à l'effacement du contenu (`FR-078`) — propriété qui rend la réponse indépendante de l'issue de `A-04.1`. |
| A-04 | Majeur | **`.1`** — le verrou n'était pas dans le NON inclus mais dans `FR-065`, qui interdisait toute purge et non la seule cascade : rétrécie à son intention (`FR-079`). Ligne NON inclus motivée, non plus conditionnée, après [recherche versée](./research/2026-08-10-retention-donnees-demandes-devis.md) : aucun texte n'impose de purge au logiciel, l'obligation pèse sur la responsable de traitement. Purge automatique et filtre par date écartés. **`.2`** — refermé par le moyen de reprise de `A-02`. |
| A-05 | Majeur | Le formulaire est un **troisième objet publiable** — conséquence de `FR-045` et d'`US5-4`, pas un choix. Vocabulaire élargi, FR d'enregistrement en brouillon des formulaires ajoutée (`FR-051`, elle manquait entièrement), récapitulatif et `SC-016` complétés, **abandon de brouillon généralisé à l'objet** (`FR-092`, `FR-093`). `SC-009` réaligné sur le Brief, dont le PRD avait rétréci la portée à « la page concernée ». |
| A-06 | Mineur | **Exclu** : le remplacement se fait emplacement par emplacement. Une substitution de binaire propagée devrait attendre la publication comme tout brouillon — un état en attente pour un objet qui n'en a pas. À rouvrir si une image est posée à beaucoup d'emplacements sans pouvoir devenir un réglage. |
| A-07 | Mineur | **Dimensions réintégrées** (`FR-108`, `US13-2`). Re-dérivables du binaire, donc l'omission se défendait — mais elle coûtait un mot et faisait diverger du Brief sans trace. |
| A-08 | Mineur | **Instrument nommé** dans `SC-005`. Un score sans échelle n'est pas un critère ; et nommer un outil de mesure n'est pas choisir une stack — la portée du PRD interdit de nommer ce dont le produit dépend, pas ce qui le constate. |
| A-09 | Mineur | Moitié refermée par `A-02` (la liste est devenue **une** adresse, remplaçable). Pour le reste : **les demandes arrivent à l'adresse autorisée** (`FR-063`). Un réglage de réception distinct a été écarté — il fabriquerait une nouvelle façon de perdre les demandes en silence, soit la panne même dont le Brief demande la détection. |
| A-10 | Mineur | **Forcé, pas arbitré** : `FR-086` publie tous les brouillons en un geste, donc un aperçu partiel montrerait un état qui n'existera jamais. `FR-081` étendue aux trois objets. |
| A-11 | Mineur | Traces complétées (`SC-016` → `US6`, `SC-017` → `US4`, `SC-018` → `US3`, `SC-019` → `US10`) ; trois précisions du Brief réintégrées (`SC-002`, `SC-006`, `SC-011`). **Pas de FR pour la tenue à jour du dossier d'instance** : le PRD spécifie un produit, « tenu à jour » qualifie la conduite d'un humain dans le temps. `SC-014` est déjà la vérification par exécution que le Brief réclame ; la contrainte appartient au socle de livraison. |

## Ce que le traitement laisse ouvert

- **Le cadrage des données personnelles reste dû avant la première mise en ligne**, et la
  recherche versée ne le fait pas — elle dit quoi demander à la relecture juridique. Deux
  volets lui restent : l'acte de sous-traitance du clausier (`socle-de-livraison.md`) et le
  texte de la mention d'information de `FR-043`/`FR-056`. Porté par un chantier en attente.
- **La détection d'une panne d'acheminement** reste tranchée en phase Stack, mais avec une
  donnée que le Brief n'avait pas : la liste de l'admin est désormais réellement atteignable
  pendant la panne.
- **Le moyen de reprise est un secret dormant.** Rien dans le produit ne garantit que la
  cliente saura où il est trois ans plus tard ; `FR-112` exige que le dossier d'instance le
  dise, la livraison doit vérifier qu'elle l'a rangé.
