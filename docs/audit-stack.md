# Audit — Stack technique

| | |
|---|---|
| **Statut** | à traiter — 20 constats, aucun arbitré |
| **Date** | 2026-08-11 |
| **Document audité** | [Stack](./stack.md) (Draft, 2026-08-10, amendé 11/08) |
| **Confronté à** | [PRD](./prd.md) · [Socle de livraison](./socle-de-livraison.md) · [Brief](./brief.md) · `docs/research/` (6 rapports du 2026-08-10) · fiche archivée `2026-08-10-phase-stack-faits-a-sourcer.md` |
| **Objet** | Incohérences, oublis, failles de sécurité et écarts de traçabilité, à arbitrer un par un avant `archi` et `adr` |

> **Méthode.** Quatre passes : (1) chaque citation `FR`/`SC` de la stack contre le PRD,
> existence et adéquation thématique ; (2) chaque référence `In`/`Cn`/Annexe contre le
> socle ; (3) chaque fait « sourcé » contre les rapports de `docs/research/` ; (4) analyse
> de sécurité et de cohérence interne du document lui-même. Chaque constat porte un
> identifiant `S-nn`, une sévérité, les références, et une piste de traitement.
>
> **Sévérités.** *Majeur* : le constat rendrait un ADR faux ou incomplet s'il descendait
> tel quel, ou laisse un trou dont l'aval (archi, ci, specs) hériterait. *Mineur* :
> imprécision, hygiène documentaire, dette de forme — corrigible sans arbitrage lourd.

**Vérifié sans constat.** Les 46 `FR` et 13 `SC` distincts cités existent tous dans le PRD
(bornes réelles : `FR-117`, `SC-020`) — aucun numéro fantôme, aucune citation hors plage ;
la plage `FR-001` à `FR-014` correspond exactement à la section « Accès à
l'administration » du PRD ; `prd.md:640` porte bien le cas limite invoqué pour la
sérialisation, au mot près ; les chiffres `C5` (20 000 / 15 000 / 5 fichiers par
photographie / murs vers 4 000 et 3 000) sont conformes au socle ; l'amendement `C6`
(« un clone, deux branches ») est réellement appliqué au socle (commit `14515b3`), et les
trois lignes de recette annoncées au §7 y sont ; la lecture de `I5`, `I6` et `C10` est
fidèle ; la réserve « aucun compteur facturé est une déduction tirée du silence » descend
intacte du rapport ; sont correctement sourcés dans les rapports : les 50 sous-requêtes,
les 3 Mo gzip, les deux plafonds Durable Objects, Email Sending payant et en bêta, Email
Routing gratuit vers destinataire vérifié sur DNS Cloudflare, l'égalité des plafonds
Pages/Workers, et le rejet de SendGrid/SES/MailerSend/ZeptoMail.

---

## Majeur

### S-01 — L'inventaire des secrets est faux : il en manque au moins un, peut-être deux

**Constat.** `stack.md:119-128` affirme « **Trois**, et aucun n'appartient à
l'intégrateur ». Or le choix Turnstile (`stack.md:36`) impose une **clé secrète
siteverify** en liaison du Worker — un secret à ouvrir dans le compte de la cliente sous
`I4` et à inventorier sous `C7`, absent du tableau. Il ne figure pas non plus au socle,
dont le §7 n'inventorie que les deux jetons GitHub : la **clé de signature des cookies**
que la stack liste n'y apparaît nulle part. Enfin, si `S-02` est retenu, l'empreinte
d'origine exige une clé de plus.

**Impact.** `C7` prescrit un inventaire complet au moment de la recette ; un secret
non inventorié est un secret qui ne sera ni ouvert au nom de la cliente, ni vérifié à la
passation (`SC-013`, `SC-014`).

**Piste.** Porter le tableau à quatre (ou cinq) lignes ; déposer les lignes manquantes au
§7 du socle en même temps.

### S-02 — L'« empreinte » d'origine est réversible : un hachage d'adresse IP sans clé n'est pas une pseudonymisation

**Constat.** `stack.md:113-117` : « Le compteur de fréquence stocke une **empreinte**,
jamais l'adresse en clair. » Un hachage non clété d'une IPv4 se renverse par force brute —
l'espace fait 2³² valeurs, énumérable en secondes. Sans HMAC sous clé secrète (idéalement
avec rotation ou fenêtre temporelle), l'empreinte **est** la donnée personnelle.

**Impact.** La protection annoncée est illusoire en l'état ; le chantier
`cadrage-donnees-personnelles` hériterait d'une prémisse fausse (« l'adresse n'est pas
stockée ») ; et la clé HMAC est un secret de plus pour `S-01`.

**Piste.** Écrire « empreinte HMAC sous clé secrète, à rotation » dans le tableau des
choix ; ajouter la clé à l'inventaire ; renvoyer la période de rotation au chantier
données personnelles.

### S-03 — `force: false` est présenté comme absolu alors que la réécriture de `media` est non-avance-rapide

**Constat.** Le tableau (`stack.md:32`) fige : « `PATCH /git/refs` en `force: false` —
avance rapide obligatoire », sans exception. Le candidat ADR n° 5 (`stack.md:240-244`)
reconnaît pourtant que « le seul geste non-avance-rapide, la réécriture finale de `media`
après le build », existe — ce geste exigera `force: true` sur ce `PATCH`-là. Par
ailleurs, l'« effacement des orphelins **après** le build » (`stack.md:89-90`) n'a pas
d'acteur : si c'est l'étape de build, `C3` (« le build ne commite jamais ») tombe ; si
c'est le Worker, il lui faut un signal de fin de build qu'aucune ligne ne décrit.

**Impact.** L'ADR n° 5 serait auto-contradictoire s'il reprenait le tableau tel quel ; et
l'architecture de la fin de publication (qui réécrit, déclenché par quoi) n'est pas
descendable en specs.

**Piste.** Écrire l'exception dans le tableau (« `force: false`, sauf la réécriture de
`media` sous le verrou D1 ») ; trancher l'acteur et le signal de fin de build en phase
`archi`, en confrontant `C3`.

### S-04 — Le plafond des 50 sous-requêtes, qui a écarté l'alternative, n'a pas été confronté au chemin retenu

**Constat.** Les 50 sous-requêtes par requête servent à disqualifier « le dépôt EST le
magasin » (`stack.md:216-220`). Mais la chaîne retenue — blob → arbre → commit
(`stack.md:32`) — consomme environ **un appel par blob** : une publication qui dépose plus
de ~45 fichiers nouveaux (première publication, galerie ajoutée) dépasse le plafond dans
le même geste synchrone. Rien dans la stack ni dans les rapports n'instruit ce point.

**Impact.** La publication — le geste central du produit — peut échouer par construction
au premier site réel. Des parades existent (contenu textuel inliné dans `POST /git/trees`,
publication découpée en plusieurs requêtes, dépôt des médias étalé), mais aucune n'est
choisie ni même nommée.

**Piste.** Instruire et mesurer (même méthode que le jeton : dépôt jetable, témoin), puis
soit amender le choix (mode de dépôt par lots), soit consigner la borne (« N fichiers
nouveaux max par publication ») comme contrainte descendue en specs.

### S-05 — L'auth « maison » est trop peu spécifiée pour l'ADR qu'elle prétend alimenter, et le moyen de reprise n'a aucun choix technique

**Constat.** La ligne Auth (`stack.md:34`) couvre `FR-001` à `FR-014` en bloc, mais le
choix décrit — « jeton haché à usage unique et expirant, cookie de session signé » — ne
couvre que la connexion nominale. Restent sans choix : le **moyen de reprise non e-mail**
(`FR-009` à `FR-012`, exigé par le Brief et rangé chez la cliente — quel objet ? un code
de secours haché en D1 ?), la nature des sessions (signées sans état ? révocables ?), les
attributs du cookie, la protection CSRF des actions d'admin, la rotation de la clé de
signature. L'audit Brief↔PRD avait déjà établi (constat `A-02`) que la connexion dépend du
même canal e-mail que les demandes ; la stack retient ce canal sans mot sur ce couplage.

**Impact.** « Implémentation maison » est précisément le choix qui ne bénéficie d'aucune
spécification externe : chaque propriété non écrite ici devra être inventée en
implémentation, sans contrat. `FR-010` (« l'admin reste atteignable ») repose entièrement
sur le moyen de reprise absent.

**Piste.** Compléter la ligne Auth d'un alinéa par mécanisme (reprise, session,
révocation, CSRF), ou déclarer explicitement que ces points descendent au niveau specs
avec la liste des décisions attendues.

### S-06 — Admin et site public partagent une origine, et rien ne borne ce qui remonte vers elle

**Constat.** Un Worker unique sert le site public **et** l'administration
(`stack.md:18-19`) : même origine, donc tout XSS stocké côté public vaut vol de session
admin. Le choix « Markdown restreint » ferme le vecteur texte riche (`stack.md:267-272`),
mais : les **médias téléversés** n'ont ni bornes ni validation — `FR-027` et `FR-040`
(« refus d'un fichier dont le format ou le poids sort des bornes ») ne sont portés par
aucun choix, et un SVG accepté comme image est un XSS stocké servi par l'origine commune ;
le rendu du Markdown n'exclut pas les URL `javascript:` par nature ; aucune ligne ne pose
d'en-têtes de réponse (CSP, `X-Content-Type-Options`…) alors que le PRD envisage
explicitement l'admin compromise.

**Impact.** Le scénario que le choix n° 8 dit vouloir fermer (« du contenu tiers servi à
chaque visiteuse ») reste ouvert par les deux autres portes (médias, en-têtes).

**Piste.** Ajouter un domaine « ingestion des médias » (formats autorisés — SVG exclu ou
assaini —, poids, dimension, où vivent les binaires en brouillon : voir `S-09`) et un
domaine « en-têtes de sécurité » ; câbler l'aller-retour Markdown déjà prévu en `ci` pour
rejeter aussi les URL de schéma non autorisé.

### S-07 — Le verrou de publication n'a pas de bail, et l'échec partiel n'a pas de procédure de reprise

**Constat.** « Verrou conditionnel sur une ligne d'état en D1 » (`stack.md:37`) : rien sur
la libération si le Worker meurt entre la pose et la fin de la séquence en trois temps —
le verrou resterait posé et toute publication ultérieure refusée. Rien non plus sur l'état
intermédiaire (médias déposés sur `media`, commit `main` échoué) : la séquence est-elle
rejouable telle quelle ? Enfin `FR-090` (« informer l'éditrice de l'issue de sa
publication ») est attribué à ce verrou alors qu'il n'en relève pas — voir `S-14` — et
n'est en réalité porté par aucun choix.

**Impact.** `FR-091` (le site reste servi pendant une publication) est précisément le
genre d'exigence qu'un verrou orphelin fait échouer en silence ; sans issue rapportée
(`FR-090`), l'éditrice ne saurait même pas que sa publication est restée en rade.

**Piste.** Écrire le bail (horodatage + expiration du verrou), poser l'idempotence de la
séquence (le dépôt additif sur `media` est rejouable, le commit `main` se recalcule), et
donner un porteur à `FR-090`.

### S-08 — Le déclenchement des builds n'est pas maîtrisé : `C2` non confronté aux deux branches, `C4` porté par rien, minutes de build jamais comptées

**Constat.** Trois manques liés. (1) `C2` dit « le commit est le déclencheur du build,
aucun autre chemin » — avec deux branches, quelle(s) branche(s) déclenchent ? Si `media`
déclenche, chaque publication produit **deux** builds ; sinon, il existe une configuration
d'exclusion que ni la stack ni le socle ne nomment — et la réécriture de `media` après le
build (S-03) en déclencherait un troisième. (2) `C4` (anti-rebond, concurrence de
build = 1) n'est repris par aucun choix : le verrou sérialise les publications mais ne
« débounce » rien. (3) L'Annexe A plafonne à 3 000 minutes/mois **au dépassement non
documenté** (réserve 1) et à 20 minutes par build (mur) ; le pipeline d'images régénère
les fichiers au build, et personne n'a compté ce que coûtent ~3 000 photographies en
minutes — `C5` ne surveille que le **nombre** de fichiers.

**Impact.** Le seul quota dont le comportement au dépassement est inconnu (donc le seul
risque `I5` non fermé) est aussi le seul dont la consommation n'est ni bornée ni mesurée.

**Piste.** Nommer la configuration de déclenchement par branche (ligne du tableau ou
`archi`) ; donner un porteur à `C4` ; ajouter « durée du build au premier déploiement » à
la mesure déjà prévue en Annexe A (réserve 3).

### S-09 — Les médias en brouillon n'ont aucun magasin : le trou le plus net du tableau

**Constat.** La ligne « Médias publiés » (`stack.md:31`) ne couvre que la branche `media`,
écrite **à la publication**. Où vivent les binaires entre le téléversement et la
publication ? D1 porte « brouillons, état publié, demandes » (`stack.md:29`) — des
binaires d'images dans D1 ? R2 est disqualifié. Rien n'est dit, alors que `FR-027`,
`FR-033` à `FR-038` (écran Médias complet) et `SC-010` en dépendent, et que la réponse
contraint la taille max d'un média (`S-06`) et le nombre d'appels à la publication
(`S-04`).

**Impact.** C'est un domaine entier du produit — l'écran le plus riche de l'admin — sans
fondation technique ; il ne peut pas descendre en specs.

**Piste.** Ajouter une ligne « Médias en brouillon » au tableau des choix, arbitrée sur
faits (limites de taille de ligne/requête D1, alternatives réelles sous `I5`).

### S-10 — Plusieurs faits d'ADR violent la méthode annoncée : ils ne sont sourcés nulle part

**Constat.** Le préambule (`stack.md:11-14`) pose : « Un fait non sourcé est marqué comme
tel : il ne descend pas dans un ADR. » Or : les chiffres Better Auth « 3,2 Mo, 17
dépendances, 19 pairs » (ADR n° 6) n'existent dans **aucun** rapport ni fiche — la fiche
archivée ne porte que « 1.6.26, jeton 300 s » ; `@cloudflare/vitest-pool-workers@0.21.0`
et sa capacité de liaisons réelles (ADR n° 13) : zéro occurrence dans `docs/research/` ;
la phrase GitHub « removes personal access tokens… » est étiquetée « [officiel ·
rapporté] » sans emplacement citable ; les versions et dates Astro/adaptateur v13 de
l'ADR n° 1 ne vivent que dans la fiche archivée (le dépôt n'a ni `package.json` ni
`node_modules` : la trace est morte) ; et les mesures du 11/08 vivent sur un dépôt jetable
externe, sans transcript versionné.

**Impact.** Trois ADR au moins (n° 1, 6, 13) citeraient des faits invérifiables — c'est
exactement ce que la méthode du document interdit, et ce que la mémoire du projet exige
(« montrer transcript et rejeu adverse, sinon l'arbitrage est interrompu »).

**Piste.** Soit verser les preuves (transcript des mesures du 11/08, relevé npm daté pour
Better Auth et vitest-pool-workers) dans `docs/research/` ou une annexe, soit rétrograder
ces faits au rang « non sourcé » avec la marque prévue.

### S-11 — Quatre faits sont plus affirmés dans la stack que dans leur source

**Constat.** (1) **R2** : la stack écarte R2 « (Billing policy, et non le témoignage
Community) » — les deux rapports disent l'inverse : l'exigence de carte est « rapportée,
non documentée », marquée `[À VÉRIFIER]` ; seul le *checkout* d'activation est officiel.
(2) **Turnstile** : « gratuit et illimité en mode *managed* » est classé `[INCERTAIN]`
par le rapport (ventilation par mode tenue d'une analyse tierce) ; la réserve n'a pas
suivi. (3) **Cron Triggers** : la disponibilité sur le palier gratuit n'est établie sur
aucune source primaire (limites tenues de blogs tiers), et le « pas de retry » relevé par
le rapport n'est pas repris — alors que la boucle `FR-101`/`SC-012` repose dessus. (4)
**Astro v13/10-03-2026** : la stack corrige silencieusement son propre rapport (qui date
la rupture « Astro 6, déc. 2025 ») ; la correction est documentée en fiche, mais un
lecteur remontant au rapport cité trouvera d'autres chiffres.

**Impact.** Le niveau de preuve est la colonne vertébrale du document ; chaque promotion
silencieuse (« rapporté » → « officiel », « incertain » → « acquis ») est une dette qui
ressortira à l'ADR ou en recette.

**Piste.** Rétablir la qualification exacte de chacun (la disqualification de R2 tient
déjà par le *checkout* officiel seul) ; ajouter le keep-alive Cron aux points « à
constater en recette » ; noter dans l'ADR n° 1 que la stack corrige le rapport, avec la
référence de la fiche.

### S-12 — Tout ce qui ne vit qu'en D1 est sans remède en cas de perte

**Constat.** Brouillons, état publié, demandes et champ de suite vivent uniquement en D1.
`I2`/`C1` ne couvrent que le contenu **publié** ; l'exclusion PRD assume la perte de
l'historique des demandes **au départ du CMS** — pas la perte par accident (base
corrompue, compte fermé, fausse manœuvre de migration `FR-106`). Aucune ligne de la stack
(ni contrainte du socle) ne porte sauvegarde, export ou restauration de D1 ; les capacités
natives de D1 en la matière ne sont ni citées ni vérifiées.

**Impact.** Le brouillon en cours d'une éditrice et son relevé (« ce que ça a donné »)
peuvent disparaître sans recours, dans un produit dont l'argument commercial est « rien ne
se perd ».

**Piste.** Matière à `/scd-sdd:premortem socle` (comme la détection de panne
d'acheminement) : soit un `FR` de sauvegarde naît, soit la perte est assumée par écrit au
clausier — dans les deux cas la stack doit dire ce que D1 sait faire.

### S-13 — Des exigences à forte teneur technique n'ont aucun porteur dans le tableau

**Constat.** Au-delà de `S-05`/`S-09`, restent sans choix : `FR-082` (l'aperçu n'est
atteignable que depuis une session ouverte — la route SSR qui motive tout l'ADR n° 1 n'a
pas de ligne de protection) ; `FR-022` (vidéo par lien externe : quel embed, quel coût
Lighthouse face à `SC-005`) ; `FR-029` (recherche d'images : LIKE ou FTS5, dont la
disponibilité D1 est justement en « à constater en recette ») ; `FR-039`/`SC-018`
(métadonnées d'image jusqu'au rendu) ; `FR-061` (refus de tout fichier téléversé par un
visiteur — aucune contrainte sur la route de soumission) ; `FR-099`-`FR-104` (outillage
d'instance : convention de config, déploiement identique — seul `FR-101` est porté) ;
`FR-110`-`FR-116` (dossier d'instance : support, format, espace — seul `FR-112` est
cité) ; `FR-069`-`FR-074`/`SC-019` (écran Demandes complet, ventilation des compteurs).

**Impact.** 64 FR sur 117 ne sont mappés nulle part ; la plupart relèvent légitimement du
niveau specs, mais ceux listés ici exigent un **choix de fondation** que specs ne peut pas
faire seul.

**Piste.** Passer la liste en revue : une ligne de tableau pour ce qui est un vrai
domaine (dossier d'instance, outillage de flotte), une mention « descend en specs avec la
décision X attendue » pour le reste.

### S-14 — La phase a déposé deux dettes sur le socle qui n'ont pas suivi l'amendement

**Constat.** (1) Le §7 du socle garde la case « `I3` exécuté : **clone nu** → build →
site complet » : depuis l'amendement `C6`, un clone nu de `main` seul ne produit plus le
site — la case de recette est fausse. (2) La stack affirme que le prérequis « domaine sur
DNS Cloudflare » « est une ligne de la recette de livraison » (`stack.md:81-85`) : le §7
n'en contient aucune.

**Impact.** La recette est le document qu'un tiers exécute ; une case fausse ou manquante
s'y paie en passation (`SC-014`).

**Piste.** Deux retouches du socle : « clone, **deux branches** » au §7, et une ligne
« serveurs de noms chez Cloudflare vérifiés ».

---

## Mineur

### S-15 — Cinq attributions du tableau sont inexactes

**Constat.** `FR-090` (informer de l'issue) est rangé sous le verrou de sérialisation,
qui n'informe personne (voir `S-07`) ; `FR-054` et `SC-005` sont rangés sous « Interface
d'administration » alors qu'ils portent sur le site public (l'argumentaire de l'ADR n° 11,
lui, est juste) ; « Analytique — exclue par le PRD » est auto-contradictoire (le PRD
n'exclut que l'analytique **tierce** et exige l'instrument `FR-075`-`FR-078`) ; « FR-097
fait de l'envoi le seul traitement serveur » sur-lit le FR (limité aux gestes du
**visiteur**) ; le multi-éditeur exclu est invoqué pour « l'authentification du
visiteur », qu'il ne concerne pas.

**Piste.** Cinq retouches de libellé ; renommer la ligne îlots « framework d'îlots,
public et admin ».

### S-16 — L'en-tête et le préambule ne décrivent plus le document

**Constat.** Statut « Draft » alors que la phase est jouée et fermée (fiche archivée,
journal) ; Date « 2026-08-10 » alors que le corps porte des mesures du 11/08 ; deux
formats de date mélangés (`2026-08-10` / `11/08/2026`) ; « les **trois** rapports de
`docs/research/` » alors qu'il y en a six (quatre exploités) ; `docs/archi.md` cité au
présent (« est dans ») alors qu'il n'existe pas encore.

**Piste.** Mettre l'en-tête au statut réel, unifier le format de date, écrire « les
rapports de `docs/research/` » sans les compter, conjuguer archi au futur.

### S-17 — Quatre lignes du tableau n'ont pas de candidat ADR nommé

**Constat.** « Maintien en vie du jeton », « Sérialisation des publications »,
« Pipeline d'images » et « Accès aux données » ne correspondent à aucun des 13 candidats.
Certaines descendront sans doute dans un ADR voisin (n° 5, n° 2, n° 3), mais rien ne le
dit, et la colonne ADR ne pourra pas être back-fillée pour elles.

**Piste.** Une phrase sous la liste des candidats : quelle ligne descend dans quel ADR,
et lesquelles n'en méritent pas (avec motif).

### S-18 — Le keep-alive du jeton repose sur deux non-dits

**Constat.** « Appel anodin périodique » (`stack.md:33`) : rien ne vérifie qu'un appel
API authentifié **compte** comme « usage » au sens de la règle GitHub d'un an (plausible,
non mesuré), et la fréquence n'est pas tranchée. Accessoirement, le Cron efface le seul
signal d'inactivité réelle du jeton : un jeton d'écriture permanent maintenu vivant des
années sans publication est un choix de sécurité qui mérite une ligne assumée (pas de
rotation, pas de détection de compromission — la surface est un dépôt qui **est** le site
publié).

**Piste.** Ajouter « l'appel du Cron compte comme usage » aux points à constater en
recette ; assumer par écrit le compromis « jeton permanent vs rotation » dans l'ADR n° 5.

### S-19 — « L'espace maigrit » suppose un ramasse-miettes GitHub que rien ne source

**Constat.** La réécriture de `media` rend les anciens blobs inaccessibles, mais la
récupération effective de l'espace côté GitHub (GC, quota affiché) n'est ni documentée ni
mesurée. Sans effet sur la validité du choix (la croissance **logique** s'arrête), mais
l'argument « l'espace maigrit » est plus fort que ce qui est su.

**Piste.** Reformuler (« ne croît pas sans fin ») ou ajouter aux mesures de recette.

### S-20 — Le point de recette n° 4 nomme « Email Sending », qui est l'alternative écartée

**Constat.** « À constater en recette » n° 4 (`stack.md:190-191`) : « La délivrabilité
réelle vers les boîtes françaises — **Email Sending** est en bêta publique depuis le
16/04/2026. » Le choix retenu est Email Routing/`send_email` ; Email Sending (destinataire
arbitraire, payant) est l'alternative écartée de l'ADR n° 9. Soit la bêta concerne aussi
le chemin retenu et le choix repose sur une bêta — ce qui mérite d'être dit au tableau —,
soit le point de recette cite le mauvais produit.

**Piste.** Clarifier quel produit exactement est en bêta (la fiche archivée parle de
`send_email` lui-même) et aligner le libellé du point de recette avec l'ADR n° 9.

---

## Récapitulatif pour le traitement

| ID | Sévérité | En une ligne | Où ça se répare |
|---|---|---|---|
| S-01 | Majeur | Inventaire des secrets incomplet (Turnstile, cookies au socle, clé d'empreinte) | stack + socle §7 |
| S-02 | Majeur | Empreinte d'IP réversible sans HMAC clété | stack + chantier données perso |
| S-03 | Majeur | `force: false` contredit la réécriture de `media` ; acteur de l'effacement absent | stack (tableau + ADR 5), archi |
| S-04 | Majeur | 50 sous-requêtes non confrontées à la chaîne blob→arbre→commit | mesure, puis stack |
| S-05 | Majeur | Auth sous-spécifiée ; moyen de reprise sans choix technique | stack (ligne Auth) |
| S-06 | Majeur | Origine commune admin/public ; médias et en-têtes non bornés | stack (2 domaines nouveaux) |
| S-07 | Majeur | Verrou sans bail ; échec partiel sans reprise ; FR-090 orphelin | stack, archi |
| S-08 | Majeur | Builds : déclenchement par branche, anti-rebond `C4`, minutes non comptées | stack, archi, Annexe A |
| S-09 | Majeur | Aucun magasin pour les médias en brouillon | stack (ligne nouvelle) |
| S-10 | Majeur | Faits d'ADR non sourcés (Better Auth, vitest, GitHub 1 an, Astro v13) | research/annexe, ou marquage |
| S-11 | Majeur | Niveaux de preuve promus en silence (R2, Turnstile, Cron, Astro) | stack (qualifications) |
| S-12 | Majeur | D1 sans sauvegarde ni export : perte sans recours | premortem socle |
| S-13 | Majeur | Exigences techniques sans porteur (aperçu, vidéo, recherche, instance…) | stack, ou renvoi specs explicite |
| S-14 | Majeur | Socle : case « clone nu » fausse, ligne DNS absente | socle §7 |
| S-15 | Mineur | Cinq attributions FR/SC inexactes dans le tableau | stack (libellés) |
| S-16 | Mineur | En-tête périmé, dates mixtes, « trois rapports », archi au présent | stack (en-tête) |
| S-17 | Mineur | Quatre lignes sans candidat ADR nommé | stack (liste ADR) |
| S-18 | Mineur | Keep-alive : « usage » non vérifié, compromis sécurité tacite | stack (recette + ADR 5) |
| S-19 | Mineur | « L'espace maigrit » non sourcé côté GitHub | stack (reformuler) |
| S-20 | Mineur | Recette n° 4 : « Email Sending » nommé pour le chemin Email Routing | stack (libellé) |
