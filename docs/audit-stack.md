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

---

## Récapitulatif — arbitrages rendus

Les constats ci-dessus sont **figés** : ils sont datés, et les réécrire les rendrait
invérifiables. Cette section est le seul endroit à jour du document. Elle se remplit lot par
lot, sur feu vert de l'humain ; un `ID` absent n'a pas encore été arbitré.

| ID | Sévérité | Arbitrage rendu |
|---|---|---|
| S-01 | Majeur | **Confirmé sur le secret Turnstile, refermé sur les deux inventaires — et l'instruction a trouvé que la ligne de recette qui vérifie `C7` était plus étroite que `C7` lui-même, ce qui laissait sans porteur la seule liaison de la chaîne qui traverse deux comptes.** L'instruction a d'abord **séparé les deux inventaires** que le constat frôlait : celui de la **phase Stack** (« secrets à ouvrir au nom de la cliente ») recense ce qu'il faut créer quelque part pour que les choix techniques tiennent ; celui de la **livraison** (§7 du socle) est la liste cochée devant la cliente, et c'est lui que `C7` et `SC-013` visent. **(1) Turnstile — confirmé, rien à arbitrer.** Le mécanisme a deux moitiés : une clé **publique** posée dans la page, et une **clé de vérification** que le serveur envoie à Cloudflare pour valider le jeton du visiteur ; seule la seconde est un secret. Elle naît dans le compte Cloudflare de la cliente avec le widget, donc `I4` est tenu sans effort — mais elle était absente des **deux** inventaires. Portée close par construction : il n'y a rien à borner comme sur les jetons GitHub. **(2) Le retrait de la clé de signature était sans objet au socle.** `S-05` l'avait renvoyé ici ; vérification faite, elle n'a **jamais** figuré au §7 — le constat le disait lui-même (« elle n'y apparaît nulle part ») —, seulement au tableau de la phase Stack, d'où `S-05` l'a retirée le 11/08. Un renvoi qui se ferme sans écrire une ligne. **(3) Le moyen de reprise n'entre pas au tableau de la Stack, et c'est la doctrine de `S-02` qui le décide.** Ce tableau ne contient que ce qu'on **ouvre** dans un compte ; le papier de 128 bits n'est ouvert nulle part — le produit le fabrique, en garde l'empreinte et l'imprime —, exactement la forme qui avait laissé la clé d'empreinte de `S-02` hors inventaire la veille. Il a en revanche sa place au §7, où deux exigences le réclamaient sans qu'aucune ligne les coche : `SC-013` (« rien n'y permet de reconstituer le moyen de reprise ») et `FR-112` (« où il est rangé, sans sa valeur »), cette dernière lue avec la borne que `AU-11` a posée sur `FR-110`. **(4) Ce que le constat ne voyait pas — la recette vérifiait moins que la contrainte.** `C7` interdit un secret d'Isometria « dans les variables d'environnement **ni dans les liaisons du déploiement** », et `SC-013` mesure « l'inventaire des identifiants **et des liaisons** » ; la ligne du §7 ne disait que « inventaire des secrets ». Les liaisons avaient disparu en route, et avec elles la seule de la chaîne qui traverse deux comptes : **la connexion entre Workers Builds et GitHub**. Ce n'est pas un jeton, c'est une **autorisation portée par un compte GitHub**, que ni le tableau des secrets ni la topologie du §3 ne nomment — le §3 dit « exécution du build : compte client » et s'arrête là. Si elle porte le compte de l'intégrateur, le retrait des accès laisse le `git push` passer et **le build ne repart pas** : la « dépendance invisible » que `I4` décrit mot pour mot, qu'aucun des trois secrets inventoriés ne couvre, et que `C10` tel qu'il était rédigé (« publication encore possible ») laissait filer, un push réussi devant un build mort satisfaisant la lettre. **La parade ne coûte aucun mécanisme neuf** : `S-07` a rendu l'issue d'une publication observable en faisant exposer par le site publié l'empreinte du commit dont il est né — `C10` exige désormais que le site **en ligne** porte la nouvelle empreinte. Le fait de plateforme lui-même — au nom de qui Cloudflare pose cette autorisation — n'est **pas sourcé ici** : il part en point de recette, la phase ayant écarté de trancher un fait de plateforme par recherche. Portés dans `stack.md` : tableau des secrets porté de deux à **trois** lignes et sa note refermée sur les trois renvois, **6ᵉ point** de « À constater en recette » (**nouveau**), § « Ce que cette phase dépose » sur ses deux bullets de renvoi. Portés dans `socle-de-livraison.md` §7 : **cinq lignes** — clé Turnstile, moyen de reprise remis sur papier, emplacement au dossier d'instance, ligne `C7` élargie aux liaisons, ligne `C10` durcie par l'empreinte de commit. **Écartés** : porter le moyen de reprise au tableau de la Stack — il défairait à vingt-quatre heures d'intervalle, et sans motif neuf, la forme retenue en `S-02` ; **écrire au §3 la propriété de la liaison de build** — ce serait affirmer un fait de plateforme non constaté, et le §3 est un tableau de ce qui est **prouvé par une pièce** ; **s'en remettre à `C10` tel quel** — sa formulation acceptait le cas qu'on veut attraper ; **renvoyer la liaison à `S-14` ou au premortem** — `S-14` traite des dettes déjà déposées, celle-ci naît ici, et le premortem l'aurait reçue sans le point de recette qui la rend constatable. **`S-01` ferme L4.** |
| S-02 | Majeur | **Confirmé, et refermé côté Stack seul — mais par une forme que la piste ne prévoyait pas : rien de dérivé d'une origine ne survit à sa fenêtre de comptage, et aucun secret n'entre à l'inventaire.** L'instruction a d'abord **mesuré** ce que le constat affirmait : balayer l'espace IPv4 coûte **~110 s** sur un poste à douze cœurs — 3,28 M empreintes SHA-256 par seconde et par cœur, relevé `openssl` du 2026-08-12 — et moins d'une seconde sur une carte graphique ; « énumérable en secondes » est exact, et le chiffre est désormais au dossier plutôt que sur parole. Elle a ensuite trouvé **trois choses que le constat ne voyait pas**. **(1) La réversibilité n'est pas le défaut** : on ne renverse pas une empreinte, on hache un candidat et on compare — vérifier qu'une personne dont on connaît l'adresse est passée coûte **une** opération, et cette attaque par confirmation vaut identiquement en IPv6 comme sur une adresse tronquée. Toute parade fondée sur la taille de l'espace tombe donc avant d'être instruite, et il n'en reste que deux : rendre la recette secrète, ou ne rien garder. **(2) L'empreinte était aussi l'adresse de l'objet** : « par origine hachée dans un Durable Object » nomme un objet **par visiteur**, donc crée dans l'infrastructure de la plateforme un identifiant tiré d'une adresse, qu'aucune rotation de clé ne retire et dont la conservation par l'hébergeur n'est pas sourçable ici. Le compteur passe à **une table dans un objet unique** — arbitré avec le reste, la ligne de tableau étant ambiguë et non le choix. **(3) Ce compteur est la seule rétention d'adresse du produit** — `FR-067` ne garde d'une demande que sa date, son formulaire et sa page d'origine, et les coordonnées sont saisies par le visiteur —, et **rien n'exige qu'une entrée survive à sa fenêtre**. Le remède n'est donc pas de mieux cacher la donnée, mais de ne pas la garder. **Forme retenue** : empreinte **HMAC sous une clé tirée au hasard pour la seule fenêtre en cours**, clé et entrées **effacées ensemble** à la fin de la fenêtre. Cette clé n'est pas un secret ouvert au nom de la cliente — le produit la fabrique et la jette —, donc **l'inventaire ne bouge pas** et la rotation est automatique par construction. La promesse étant une propriété **statique**, elle prend son porteur selon la doctrine d'`AU-10` : un invariant pour `archi` et le **neuvième contrôle bloquant** de `ci`, jamais une exigence. Écartés : **la piste du constat elle-même** — clé ouverte à la livraison, à rotation — parce qu'elle remet le troisième secret que `S-05` venait de retirer, que sa rotation n'a **aucun porteur** (ni ligne de recette §7, ni exigence, ni contrôle) et qu'elle protège moins qu'il n'y paraît, clé et table vivant dans le compte qui héberge déjà les coordonnées en clair des visiteurs (`FR-057`) ; **la même sans rotation**, qui garde le coût en perdant le motif ; **le comptage en mémoire seule**, qui ne persiste rien mais rend le seuil gratuit à qui provoque le recyclage de l'objet ; **la troncature de l'adresse**, sans effet sur l'attaque par confirmation. Portés dans `stack.md` : ligne « Moyen anti-abus » réécrite, § « Données personnelles » réécrit, note de l'inventaire des secrets amendée, un invariant ajouté à « Ce que `archi` devra reprendre », § « Vérification mécanique obligatoire » porté de huit à neuf contrôles, candidat ADR n° 12 amendé, § « Ce que cette phase dépose ». **Renvoyé au chantier `cadrage-donnees-personnelles`** : la seule **information du visiteur** ; la période de rotation ne lui est **pas** renvoyée, la forme retenue n'en ayant pas, ni aucune durée de rétention à décider. **Laissé au niveau specs** : la durée de la fenêtre et la valeur du seuil, qu'aucune exigence ne chiffre — la propriété tient quelle que soit leur valeur. |
| S-03 | Majeur | **Confirmé sur les deux volets, et refermé en Stack plutôt qu'en `archi`.** Le constat visait juste, et l'instruction a trouvé une contradiction de plus : le tableau disait `media` « réécrite à chaque publication » quand la séquence disait « dépôt **additif** puis effacement après le build ». Un seul de ces gestes est non-avance-rapide — l'élagage. **L'exception est donc écrite bornée** : « `force: false`, avance rapide obligatoire — **sauf l'élagage de `media`** », et l'ADR n° 5 cesse d'être auto-contradictoire. **L'acteur, lui, est tranché ici et non renvoyé à `archi`** : l'élagage n'est plus un troisième temps après le build, il **ouvre la publication suivante**, déjà sous le verrou et déjà en écriture sur `media`. Les deux autres voies coûtaient un invariant ou un secret — le build élagueur fait tomber `C3`, le Worker sur signal de fin de build impose un jeton d'API Cloudflare qui mord sur `C7` et sur `S-01`. La séquence passe de trois temps à **deux**. Conséquence assumée : les orphelins survivent d'une publication à l'autre. **Un garde neuf, tiré de la mesure de `S-04`** : l'élagage est le seul geste qui écrase, et une lecture en retard y effacerait un média en silence là où un `force: false` répondrait `422` — ce qu'il faut garder se calcule donc **depuis l'inventaire D1**, jamais depuis l'état lu de la branche. Portés dans `stack.md` : lignes « Médias publiés » et « Forge et écriture », § « La publication est une séquence en deux temps », candidats ADR n° 4 et n° 5. **Le « troisième build » que `S-08` redoutait tombe au passage** : `FR-089` réserve déjà le déclenchement au dépôt du **contenu**, et il n'y a plus d'écriture sur `media` après le build. |
| S-04 | Majeur | **Confirmé, puis refermé par une parade mesurée.** La chaîne naïve coûte bien `N + 4` appels et franchit les 50 sous-requêtes au **47ᵉ** fichier (mesuré : 45 fichiers = 49 appels) — l'audit annonçait « ~45 », à un fichier près. Le **choix est amendé** plutôt qu'assorti d'une simple borne : le contenu textuel est **inliné dans `POST /git/trees`**, ce qui rend le coût **constant à 4 appels** quel que soit le nombre de fichiers texte (mesuré jusqu'à 1 000 entrées). La borne subsistante ne porte plus que sur les **médias**, qui ne peuvent pas être inlinés — `content` est de l'UTF-8 et **corrompt un binaire en silence** (PNG 70 o → 84 o, `0x89` → `0xC2 0x89`, arbre répondant `201`) : **42 médias par publication**, un réessai réservé. Deux faits sont sortis **au-delà** de la question posée : le préambule de lecture du HEAD **n'est pas fiablement *read-your-writes*** (2 rejets `422` sur 10 publications enchaînées, les deux voies de lecture en retard tour à tour, leur accord ne garantissant rien), d'où un **réessai obligatoire** porté en contrainte transverse ; et le plafond réel de `POST /git/trees` **n'a pas été atteint** (1 000 entrées, 16 Mio par entrée). Portés dans `stack.md` : ligne « Forge et écriture », et § « Le budget de sous-requêtes d'une publication, mesuré ». Mesure versée : [`research/2026-08-11-sous-requetes-publication.md`](./research/2026-08-11-sous-requetes-publication.md) + trace brute rejouable. **Le `422` intermittent mord sur `S-07`** (verrou, échec partiel, reprise) et y est renvoyé, la cadence « un lot à la fois » étant tenue. |
| S-05 | Majeur | **Confirmé, et refermé par quatre mécanismes nommés plus une ligne de tableau neuve — sauf deux exigences que la Stack refuse désormais de porter.** L'instruction a d'abord trouvé que **le PRD tranchait déjà** ce que le constat croyait ouvert : la nature des sessions est fixée en négatif par l'exclusion « le produit n'offre aucun moyen de fermer une session ouverte ailleurs ni de constater les accès en cours », et le moyen de reprise est borné par le glossaire (« **secret** non e-mail **remis** à la livraison ») plus `FR-011` (rien en configuration) et `FR-012` (remplaçable, l'ancien cessant d'ouvrir), ce qui ne laisse qu'une forme conforme. **(1) Un code à saisir, jamais un lien** — un lien à usage unique se fait consommer par les scanners de messagerie avant le clic, ce qui enferme l'éditrice dehors sous le plafond d'envois de `FR-006` et lui fait brûler son moyen de reprise à cause d'un antivirus ; le code ne met rien dans une URL, donc rien dans les journaux, et rend gratuite la liaison au navigateur demandeur, là où lier un lien interdirait le multi-appareil. Entropie portée à **40 bits**, six chiffres étant une convention héritée du SMS ; brûlage au 5ᵉ essai, `FR-006` servant alors aussi de borne à la force brute. Précision d'analyse, contre une idée reçue : cette liaison **ne protège pas** d'un lecteur de la boîte — le formulaire de connexion est public, il déclenche son propre envoi — elle ferme l'ingénierie sociale du « lisez-moi le code ». **(2) Une session opaque en D1, non un cookie signé** — l'économie invoquée n'existe pas (500 lectures/jour sur les 5 000 000 de l'Annexe A, l'administration lisant déjà D1 à chaque écran), et l'opaque achète deux choses : **un secret de moins à l'inventaire**, la clé de signature disparaissant au moment où `S-02` et `S-06` en ajoutent, et l'invalidation **automatique** des autres sessions par `FR-012` et `FR-013`, qui rend réel le remède du cas limite « boîte compromise » sans offrir la fonction que le PRD exclut — une conséquence n'est pas une capacité. À noter, l'argument « la révocation devient possible » a été **retiré** en cours d'instruction : la rotation de clé donne déjà un interrupteur général, équivalent à la révocation pour une éditrice unique. **(3) Cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path` non restreint** — le renvoi de `S-06` est honoré ; ne pas restreindre le `Path` est une exigence et non un défaut, l'aperçu de `FR-082` vivant sur la même origine sous une autre route. **(4) Jeton anti-CSRF par écriture + contrôle d'`Origin`**, qui ne visent que la forgerie venue d'un autre site. **Une ligne de tableau neuve** : le **moyen de reprise** cesse d'être fondu dans la ligne Auth — code de haute entropie haché en D1, remis sur papier, à usage unique et réémis à l'emploi, avec son candidat ADR n° 16. **Ce que le constat ne voyait pas, et qui déborde son périmètre.** D'abord une **quatrième porte** vers l'origine commune, que `S-06` ne pouvait pas compter : la liste des demandes affiche du texte d'inconnus (`FR-064`, `FR-065`, `FR-069`-`FR-074`) sur un écran d'administration, quand le filtre de `S-06` vit dans le rendu partagé, qui ne sert que le publié et l'aperçu — et sur une origine commune, ni `SameSite` ni un jeton anti-CSRF n'opposent quoi que ce soit à un XSS same-origin, qui lit le jeton dans le DOM. Deux parades cumulatives sont retenues, l'**invariant d'échappement** (aucune donnée de visiteur n'atteint `{@html}`, falsifiable, cinquième contrôle bloquant de `ci`) et la **CSP stricte de l'administration**, portée par le second porteur d'en-têtes que `S-06` venait de créer ; le sous-domaine dédié y gagne un second motif sans que le premier devienne caduc. Ensuite **deux failles de contrat que la Stack ne peut pas refermer** : `FR-005` verrouille `FR-014` (prouver la maîtrise d'une adresse candidate suppose de lui écrire, ce que `FR-005` interdit — défaut de rédaction de `A-01`, qui visait l'énumération), et `FR-013` casse les deux canaux à la fois (le glossaire fond adresse de connexion et destination des demandes, `send_email` n'écrit qu'à une destination vérifiée, et vérifier passe par le compte Cloudflare que `SC-006` interdit de faire visiter). **La ligne Auth ne couvre donc plus que `FR-001` à `FR-008`**, le moyen de reprise `FR-009` à `FR-012`, et `FR-013`/`FR-014` restent délibérément **sans porteur** plutôt que de laisser le niveau specs en inventer un. Écartés : la **passkey WebAuthn** en facteur primaire — seule forme survivant à un lecteur de la boîte, et qui *serait* le moyen de reprise, mais elle naît sur l'appareil et suppose une session ouverte, contre « secret remis à la livraison », et sa récupération pend au trousseau d'un tiers, motif même du rejet d'Access OTP ; l'**API Email Routing appelée depuis le Worker** — elle refermait les deux failles d'un seul geste, la vérification de Cloudflare valant preuve de maîtrise, mais elle exige un jeton capable de réécrire le routage du courrier, si bien qu'une administration compromise cesserait d'emporter le site pour emporter tous les comptes de la cliente : **écartée sur le fond, sans avoir à être sourcée**. Portés dans `stack.md` : ligne « Auth » réécrite, ligne « Moyen de reprise » (**nouvelle**), ligne « En-têtes de réponse » amendée, § « Pourquoi un code à saisir, et pourquoi une session opaque », § « La quatrième porte », § « `FR-013` et `FR-014` n'ont aucun porteur » (**trois nouveaux**), inventaire des secrets ramené de trois à deux, invariants d'`archi` et § « Vérification mécanique obligatoire » portés de quatre à cinq contrôles, candidats ADR n° 6 et n° 15 amendés, n° 16 (**nouveau**), § « Ce que cette phase dépose ». **Renvoyé à `S-01`** : le moyen de reprise et le retrait de la clé de signature dans l'inventaire de livraison et la recette §7. **Renvoyé à `/scd-sdd:premortem socle`** : les deux failles de contrat, et la passkey avec elles. *Complément du 2026-08-12, par le traitement de `S-02` : « la clé de signature disparaissant au moment où `S-02` et `S-06` en ajoutent » n'a été vérifié ni pour l'un ni pour l'autre. `S-02` s'est refermé sans aucun secret à l'inventaire — sa clé d'empreinte est tirée par le produit pour la seule fenêtre de comptage, et n'est ouverte au nom de personne ; et l'arbitrage de `S-06`, rendu la veille, ne portait que sur les médias, les URL et les en-têtes, sans jamais toucher à l'inventaire. Le secret de moins gagné ici n'est donc **pas** compensé : il est acquis, et le seul que `S-01` aura à ajouter est la clé de vérification Turnstile, que son propre constat nomme.* |
| S-06 | Majeur | **Confirmé sur les trois portes, refermé sans toucher à l'origine commune.** **(1) Ce qui entre** — `FR-040` reçoit son volet « format », `S-09` lui ayant donné son volet « poids » : liste blanche fermée **JPEG / PNG / WebP**, reconnue sur les **octets d'en-tête** et non sur l'extension ni sur le `Content-Type` du téléversement, tous deux choisis par celui qui téléverse. Le geste ne coûte rien parce qu'il est **déjà obligatoire** : `FR-108` exige les **dimensions** de chaque média déposé, donc l'en-tête est lu de toute façon. **Le SVG est refusé**, et c'est le motif du candidat ADR n° 8 rendu dans l'autre sens — un assainissement raté est un risque dont on ne prouve jamais l'absence. Deux bénéfices en découlent : le comportement du pipeline d'images face à un SVG n'a plus à être établi, et `FR-108` tient sans règle de plus, un SVG n'ayant pas de dimensions en pixels fiables. Coût assumé : un logo vectoriel est fourni en PNG, un HEIC de téléphone est refusé — en le disant à l'éditrice, comme `FR-040` l'exige. Écartés : *SVG assaini* (bibliothèque de plus sous les 3 Mo gzip, pour une absence non prouvable), *SVG sur origine distincte* (un espace de plus sous `I1` pour un format dont le produit n'a pas besoin), *HEIC admis* (lecture par le pipeline non établie, ce serait un point de recette bloquant de plus). **(2) Ce qui est rendu** — le Markdown restreint bornait les **marques** et rien d'autre : la restriction s'étend aux **URL** (`https`, `mailto`, `tel`, relatif ; aucun HTML brut). Aucun mécanisme neuf, c'est le contrôle `ci` déjà prévu pour l'aller-retour de sérialisation qui gagne un second volet, et le filtre vit dans le **rendu partagé**, donc il couvre le publié et l'aperçu d'un seul geste. **(3) Ce qui est renvoyé — un fait de plateforme change la forme de la réparation** : les en-têtes du fichier `_headers` « are not applied to responses generated by your Worker code » (docs Cloudflare · *Workers · Static Assets · Headers*, page datée du **23/04/2026**). Comme `FR-095` et `FR-096` font des pages publiques des **assets statiques**, le fichier les couvre sans coût (« Requests to static assets are free and unlimited », page *Pricing* du 07/07/2026, donc hors du quota de 100 000 requêtes/jour), mais l'administration, l'aperçu et les médias servis depuis D1 portent les leurs **dans le code**. Deux porteurs, comme `FR-090` en `S-07`. **Une contrainte vérifiable en découle** : `run_worker_first` reste une liste **bornée**, sans quoi tout devient réponse de Worker et `_headers` ne s'applique plus à rien — le point 2 de la recette y gagne cette exigence au lieu d'un point à lui, et `ci` un quatrième contrôle bloquant. **Ce que le constat ne voyait pas, étant daté d'avant l'arbitrage de `S-09`** : depuis que le brouillon vit en D1, un média est servi par une route du Worker **avant toute publication** — la porte est plus grande que décrite, et c'est pourquoi la liste blanche est posée au **téléversement**. **L'origine commune est conservée** : les trois portes se ferment sans elle. Le **sous-domaine d'administration dédié** n'est pas écarté sur le fond — il coûte une entrée DNS et une route de plus, le §3 du socle à amender et `FR-081` à revérifier sur les URL relatives — c'est la parade de repli le jour où du contenu tiers devra être servi. **Renvoyé à `S-05`** : les attributs du cookie de session, qui relèvent de la ligne « Auth ». Portés dans `stack.md` : lignes « Ingestion des médias » et « En-têtes de réponse » (**nouvelles**), ligne « Texte riche » amendée, § « Trois portes remontent vers l'origine commune » (**nouveau**), candidats ADR n° 14 et n° 15 (**nouveaux**) et n° 8 amendé, point 2 de « À constater en recette », § « Vérification mécanique obligatoire » porté de deux à quatre contrôles, § « Ce que cette phase dépose ». **Deux lignes que `S-17` n'aura pas à reprendre** : les deux nouvelles naissent avec leur candidat ADR nommé. **Complété le 2026-08-11 par le traitement de `S-05` : il y a une quatrième porte.** La liste des demandes affiche du texte fourni par des inconnus (`FR-064`, `FR-065`, `FR-069`-`FR-074`) sur un écran d'administration, quand le filtre décidé ici vit dans le **rendu partagé**, qui ne sert que le publié et l'aperçu. Le compte de trois était donc incomplet, et avec lui la phrase « les trois portes se ferment sans elle » : elle reste vraie pour les trois, elle ne suffit plus à fonder à elle seule la conservation de l'origine commune. Deux parades cumulatives sont retenues en `S-05` — l'invariant d'échappement `{@html}` et la CSP stricte de l'administration —, et le sous-domaine dédié y gagne un second motif. L'arbitrage rendu ici n'est pas défait : il est complété. |
| S-07 | Majeur | **Confirmé sur les trois volets, et refermé par un seul objet.** Les trois manques n'en font qu'un : la ligne d'état D1 qui porte le verrou porte aussi son **bail horodaté** et **l'issue de la publication**. Un Worker tué net n'exécute pas sa sortie — une publication qui trouve un verrou **expiré** le reprend, au lieu de laisser le site bloqué pour toujours. La valeur du bail se borne par la durée de la séquence (4 + `M` appels) et **se mesure en recette** ; le chiffre descend en specs. **La reprise est légitime parce que la mesure de `S-04` l'a rendue sûre** : le dépôt sur `media` est additif et adressé par contenu, l'arbre et le commit se recalculent depuis le HEAD — la séquence est rejouable telle quelle, et le réessai obligatoire du `422` devient gratuit à écrire. Le seul cas qui résistait, **la réponse perdue**, se ferme en comparant l'oid de l'arbre à pousser à celui du HEAD : le même contenu donne le même oid, donc le réessai reconnaît son propre commit sans marqueur à maintenir. **`FR-090` reçoit un porteur, et l'instruction a corrigé la question au passage** : « l'issue » ne pouvait pas être le seul dépôt, puisque `FR-089` en fait un simple déclencheur et qu'un build peut échouer après lui — l'éditrice verrait l'ancien site avec un succès affiché. Le site publié expose donc l'empreinte du commit dont il est né, et l'administration la lit par une requête **publique** : ni jeton d'API Cloudflare, ni webhook, rien qui morde sur `C7` ni sur `S-01`. Portés dans `stack.md` : ligne « Sérialisation et suivi des publications » (réécrite), ligne « Constat de la mise en ligne » (**nouvelle**), § « Une seule ligne d'état porte le verrou, son bail et l'issue ». **Reste ouvert pour `S-17`** : cette ligne, désormais structurante, n'a toujours aucun candidat ADR nommé. |
| S-08 | Majeur | **Trois manques, trois issues différentes.** **(1) Le déclenchement se refermait presque seul** : `FR-089` réserve déjà le déclenchement au dépôt du **contenu**, donc `media` ne déclenche rien et une publication ne produit qu'un build ; et l'élagage ayant quitté l'après-build par `S-03`, le troisième build redouté n'existe plus. La configuration est écrite (« Workers Builds surveille `main` seule ; le build récupère `media` pendant son exécution »), et le point qui en dépend est **promu bloquant** en recette : si le *checkout* Cloudflare n'atteint pas `media` sans jeton fourni, le jeton de lecture `Read-only` du §7 devient obligatoire, faute de quoi le site bâti n'a aucun média. **(2) `C4` n'est pas orphelin, il est vide** — sa formulation (« une rafale d'**enregistrements** doit produire un build, pas dix ») décrit une architecture où enregistrer commite ; ici les enregistrements vont en D1 et seule une publication commite, geste explicite avec récapitulatif et confirmation. Dix enregistrements produisent **zéro** déploiement : `C4` est tenu par construction, et c'est sa **ligne de vérification** qui est fausse — dette renvoyée à `S-14`, qui traite les dettes déposées sur le socle. Résidu assumé : dix *publications* en deux minutes feraient dix builds, mis en file sans erreur ni coût par la concurrence de 1. **(3) Les minutes restent non mesurées, et ne peuvent pas l'être aujourd'hui** — le dépôt n'a pas une ligne de code, et un chiffre obtenu en local ne dirait rien du matériel de Workers Builds. La durée du build rejoint donc le nombre de fichiers par photographie dans la **réserve 3 de l'Annexe A**, élargie. **Une bifurcation est écrite plutôt que laissée à découvrir au mur** : si la durée croît avec la médiathèque jusqu'aux 20 minutes, la parade est de générer les variantes à la publication — au prix d'un budget médias qui tombe de **42 à ~8** (5 fichiers par photo au lieu d'un). `archi` tranchera avec le chiffre en main. Portés dans `stack.md` : ligne « Déclenchement du build » (**nouvelle**), § « Ce que le déclenchement par `main` seule règle, et ce qu'il laisse », point 3 de « À constater en recette » promu bloquant, § « Ce que cette phase dépose ». Porté dans `socle-de-livraison.md` : réserve 3 de l'Annexe A. |
| S-09 | Majeur | **Confirmé, et refermé par un magasin qui ne rouvre rien : D1 porte le binaire en brouillon**, la publication le dépose sur `media` puis l'efface de la base. `media` continue donc de ne recevoir que du **publié**, la séquence en deux temps de `S-03` tient, et le budget de 42 médias mesuré en `S-04` reste vrai. **La piste que la phase stack croyait morte ne l'était pas** : son écarté « D1, KV ou Durable Objects — `FR-107` exige des fichiers » visait le magasin du **publié** ; ce qui n'est pas encore publié n'a pas à survivre dans un clone nu, et c'est cette confusion de portée qui laissait le trou. **Deux faits neufs décident, et aucun n'est un choix** — docs Cloudflare D1 · *Limits*, page datée du 21/04/2026, absents de tous les rapports de `docs/research/` : la taille maximale d'une ligne ou d'un `BLOB` est de **2 Mo**, et la taille maximale d'une base sur le palier gratuit est de **500 Mo**, non les 5 Go que l'Annexe A connaissait — les 5 Go sont le total du **compte**, et la page *Pricing*, seule source du relevé initial, ne mentionne pas le plafond par base. **`FR-040` reçoit ainsi une borne documentée plutôt qu'estimée** : 2 Mo par média. Le coût est réel mais faible — un original d'appareil photo est refusé, quand le plus grand *breakpoint* retenu est de 1280 px et qu'une source de 1280 à 2000 px passe très en dessous. **Écartées, et pour un motif nommé** : *déposer sur `media` dès le téléversement* — seule voie qui ferait tomber le budget de 42 en rendant la publication constante à 4 appels, mais un téléversement hors verrou courrait contre l'élagage en `force: true` calculé depuis D1, soit exactement l'effacement silencieux que `S-03` venait de fermer, et l'aperçu de `FR-081` relirait GitHub sous le jeton d'**écriture** ; *une branche `media-draft` distincte* — même course, et un espace de plus sous `I1`, le motif qui avait déjà écarté « deux dépôts distincts ». **Ce que S-09 ne tranche pas** : les formats admis, le sort du SVG et les en-têtes de réponse restent entiers — ils sont à `S-06`. **Un point part en recette** : la documentation borne la ligne à 2 Mo et l'instruction SQL à 100 Ko, mais ne dit rien de la taille maximale d'un **paramètre lié** ; si celui-ci mord plus bas, c'est lui qui devient la borne de `FR-040`. Portés dans `stack.md` : ligne « Médias en brouillon » (**nouvelle**), § « Le brouillon des médias vit en D1, et c'est D1 qui fixe la borne de `FR-040` », candidat ADR n° 4 étendu aux deux magasins, point 5 de « À constater en recette », § « Ce que cette phase dépose ». Portés dans `socle-de-livraison.md` : deux lignes au tableau de l'Annexe A. |
| S-10 | Majeur | **Confirmé sur les cinq faits, et refermé sans qu'aucun ADR perde de motif — mais quatre fois sur cinq, mesurer un fait juste a invalidé les preuves écrites à son appui.** L'instruction a d'abord dégagé la méthode que le constat appelait sans la nommer : **un fait non sourcé se referme de trois façons** — le **mesurer**, le **citer**, ou l'**assumer marqué** quand rien ne le comble —, et dans les deux premières c'est le **transcript versionné** qui satisfait « la vérification doit laisser une trace citable ». Cinq relevés du 2026-08-12 sont versés dans `docs/research/`, chacun avec sa trace brute rejouable. **(1) Better Auth — mesuré, et l'argument de poids tombe.** « 17 dépendances, 19 pairs » est exact et reste ; « 3,2 Mo » ne se rejoue sur **aucune** grandeur — le registre donne 2,07 Mo dépaquetés — et surtout ce n'était pas l'unité du plafond invoqué, qui porte sur le paquet **déployé gzippé** : un Worker réel important `betterAuth` et son plugin de code à usage unique pèse **0,19 Mo gzip, soit 6,1 % des 3 Mio**. Le même relevé a montré que les quatre mécanismes retenus en `S-05` existent tous dans le paquet — `otpLength`, `expiresIn`, `allowedAttempts`, `storeOTP`, le préfixe `__Host-`, `originCheck`, les sessions opaques en table —, si bien que **la surface restant à écrire par-dessus est bien plus étroite qu'annoncé**. L'écarté ne tient plus que sur l'intégration (aucun point d'entrée Cloudflare ni D1, dialecte tiers `kysely-d1`, `nodejs_compat`) et l'approvisionnement (version à la semaine sur le chemin d'accès unique). **(2) `vitest-pool-workers` — mesuré, capacité confirmée, deux formulations corrigées.** Ce qui est réel est le **moteur** (`workerd` lui-même) et non la **connexion** : les liaisons sont locales, servies par Miniflare, et l'option `remoteBindings` est un autre réglage — « réel » et « distant » sont à ne pas confondre en recette. La version passe de `0.21.0` à la **famille `0.21.x`** : `0.21.0` a été publiée le 10/08 et dépassée **deux fois en moins de 48 h** (`0.21.2` le 12/08). **(3) La phrase GitHub — citée, et elle en corrobore une autre.** L'énoncé `[officiel · rapporté]` visait les jetons **classiques** ; il est remplacé par la ligne qui parle du jeton **à portée fine**, celui du produit : « **Revoked automatically** if pushed to a public repository or gist, or **if unused for one year** » — docs GitHub · *GitHub credential types reference*, § « Credential revocation », source `github/docs` au commit `6f9f6f89` du 23/06/2026. La même page corrobore au passage le fait **mesuré** de la première ligne du tableau (durée de vie « up to 1 year, **or no expiration** »). **Ce que la citation ne couvre pas est écrit comme tel** : que le compteur d'un an **reparte à zéro** à chaque usage, et ce qui compte comme usage, n'est écrit nulle part — la parade du Cron Trigger repose donc sur une **lecture**, désormais énoncée en réserve sous le §. **(4) Astro v13 — mesuré, et deux preuves écrites cèdent.** `@astrojs/cloudflare@13.0.0` et `astro@6.0.0` ont été publiés le **10/03/2026 à trois secondes d'intervalle** : « v13 » et « Astro 6 » nomment le **même** événement. Le rapport du 10/08, qui date la rupture d'« Astro 6, déc. 2025 », n'est **pas corrigé** — il substitue une date d'**annonce** à une date de **publication**, la PR de documentation qu'il cite étant passée pendant l'alpha (`6.0.0-alpha.0`, 10/11/2025) — mais la coexistence des deux dates est écrite, pour qui remonte au rapport. Deux preuves de la ligne sont tombées à la mesure : le README de la 13.0.0 dit **encore** « Cloudflare Pages Functions targets » (il ne bascule qu'à la 13.1.3, le 20/03/2026), et le mot `pages` figure bien trois fois dans son `dist`, au sens des pages du site. Elles cèdent la place à `_routes.json`, absent du `dist` de la 13.0.0 et **vérifiable d'une commande**. **(5) Les mesures du 11/08 — deux lignes citées, une assumée marquée, et une condition tue mise au jour.** Le dépôt jetable a disparu et la trace n'a jamais été versée ; l'instruction a trouvé que **deux lignes n'avaient pas besoin d'être mesurées** : GitHub publie les permissions exigées de chaque point d'entrée REST en **donnée lisible à la machine** (`progAccess.permissions`, `github/docs` › `src/rest/data/fpt-2026-03-10/git.json`, commit `0b2db291` du 23/06/2026). Et cette donnée dit **ce que la mesure ne pouvait pas voir** : blob, arbre et commit n'ont qu'un jeu de permissions suffisant, mais le **déplacement de ref en admet deux** — `Contents: write`, **ou** `Contents: write` + `Workflows: write`, le second se levant quand le commit visé touche `.github/workflows/`. Le dépôt d'essai n'avait aucun fichier de workflow, la mesure ne pouvait donc que voir le premier. **L'argument « une seule permission » du candidat ADR n° 5 est vrai sous une condition que personne n'avait écrite** : elle est posée, et à rendre falsifiable en `archi` — **la publication n'écrit jamais sous `.github/`**. Si elle tombe, le jeton se fait refuser au **dernier** geste de la publication, celui qui rend le contenu visible, et rien dans le code ne relierait la panne à cette ligne. Restent **quatre** lignes `[mesuré · trace non versée]` : trois ne coûtent rien (l'une est corroborée par la documentation, l'avance rapide l'est pour son intention, celle du `git push` ne porte aucun argument) ; **la quatrième est assumée marquée** — la double permission exigée par les mutations GraphQL est le seul motif écrit de leur écartement, et elle **ne se citera jamais**, l'entrée `createCommitOnBranch` de la donnée GraphQL de `github/docs` ne portant aucune clé de permission là où une opération REST porte la sienne. **Ce que l'instruction a appris, et qui vaut au-delà de ce constat** : retirer un argument faux ne suffit pas, il faut **écrire ce qui le remplace** ; une mesure ne voit que ce que son témoin peut lever, si bien que le fait à écrire est parfois la **condition** et non l'argument ; et quand une page rendue se contredit, il faut descendre à la **donnée qui la génère**. Portés dans `stack.md` : candidats ADR n° 1, n° 5, n° 6 et n° 13 complétés ou amendés ; § « Le jeton d'écriture — mesuré ou cité, jamais déduit » réécrit en tête, son tableau portant désormais le **niveau de preuve ligne par ligne** (deux lignes passées en `[officiel · cité]`, une substituée, une ajoutée) ; § « Ce qui reste sans trace, et qui est assumé » et § « Ce qui reste une inférence, à écrire comme telle » (**nouveaux**) ; réserve de lecture sous « Le jeton d'écriture n'expire pas, mais il peut disparaître » ; § « Ce que cette phase dépose ». **Écartés** : **rouvrir le choix Better Auth** — la mesure retire l'argument de poids, pas la décision, et rouvrir ferait relire les quatre mécanismes de `S-05` et le candidat ADR n° 16 ; **épingler un numéro de correctif dans un candidat ADR** — c'est fabriquer le défaut qu'on referme ; **rejouer les mesures du jeton d'écriture** — il faudrait créer à la main des jetons à portée fine, un jeton `gh` ordinaire étant la mauvaise forme, puisque c'est précisément ce qu'une permission *unique* autorise qui est en jeu ; **rétrograder la ligne GraphQL au rang « non sourcé »** — elle est le seul motif écrit de l'écartement, et les motifs de repli (« les deux manques ne coûtent rien ») n'écartent rien ; **marquer non sourcé la désuétude du jeton** — le candidat ADR n° 5 perdrait le motif du Cron de maintien en vie, et `FR-101` sa seule parade écrite ; **la renvoyer en recette** — aucun appel réel ne la lève, il faudrait laisser le jeton intouché pendant un an ; **corriger la fiche archivée du 10/08**, dont le `peerDeps` v13 est celui de la 13.7.0 — une fiche archivée ne se récrit pas, c'est le relevé du 12/08 qui porte la valeur exacte ; **garder trois preuves faibles en les rendant exactes** — elles allongent la ligne sans mieux établir l'écartement de Pages. **Renvoyé à `archi`** : la contrainte `.github/`, à rendre falsifiable. **Renvoyé à `/scd-sdd:premortem socle`** : l'**absence d'observabilité du Cron de maintien en vie** — s'il cesse de tourner, rien ne le signale, et la panne ne se manifeste que par une publication qui échoue, **jusqu'à un an plus tard**, ce que `FR-101` interdit ; c'est l'angle mort que `S-07` a fermé pour la publication, et il ne se referme par aucune citation. **Recoupe `S-11`** : le complément du candidat ADR n° 1 rend deux moitiés d'un même fait dans le **même** paragraphe — la trace pour `S-10`, la qualification de la date pour `S-11` — sans l'écrire deux fois. |
| S-11 | Majeur | **Confirmé sur les trois griefs restants — le quatrième était déjà rendu —, et l'instruction a réfuté la piste sur R2 puis déplacé la cible sur Cron : deux fois, le constat désignait la bonne ligne pour la mauvaise raison.** **(0) Le grief Astro n'avait plus à être instruit.** Il a été rendu le 2026-08-12 avec `S-10`, dans le **même** paragraphe du candidat ADR n° 1 — un même fait en deux moitiés, la trace pour l'un, la qualification de la date pour l'autre. **(1) R2 — confirmé sur le libellé, réfuté sur la piste.** La ligne écrivait « un moyen de paiement est exigé au *checkout* d'activation, ce qui tombe sous `I5` (Billing policy, et non le témoignage Community) » : le verdict est juste, la phrase ne l'est pas. Trois affirmations s'y mélangeaient, et elles n'ont pas le même niveau. Officiel : le *checkout* est **obligatoire avant tout bucket** (doc R2 « Get started », MAJ 21/04/2026, verbatim). Officiel aussi : ce checkout **souscrit un service facturé à l'usage sur le moyen de paiement du compte** (Billing policy). Témoignage `[À VÉRIFIER]` en revanche : le **dialogue de carte non contournable** à l'écran — et c'est celui-là que la stack affirmait. Elle énonçait donc un **fait de terrain** là où elle tenait un **fait de contrat**, exactement la promotion « rapporté → officiel » que le constat vise ; les deux ne se recouvrent pas, et le caveat 2 du rapport montre où ils divergent (le checkout passe-t-il sans **nouvelle** carte quand le compte en a déjà une ? non tranchable). **Mais la piste se trompait de source.** « La disqualification tient déjà par le seul *checkout* officiel » est faux : un checkout à 0 $ n'implique par lui-même aucun moyen de paiement enregistré, or `I5` (`brief.md:218`) tient précisément à l'**absence** de moyen de paiement enregistré — « ce qui rend le prélèvement impossible n'est pas le palier gratuit mais l'absence de moyen de paiement enregistré ». C'est la **Billing policy** qui fait le lien souscription → moyen de paiement, et la stack avait raison de la citer : la piste la lui aurait retirée. Phrase requalifiée, source conservée, disqualification de R2 intacte et désormais indépendante de tout témoignage. **(2) Turnstile — confirmé ; réserve rétablie avec sa conséquence.** Le rapport parle à **deux voix** et la stack n'avait repris que la première : son tableau classe « Officiel » les vérifications illimitées en mode *managed* (docs Turnstile *Plans*, 16/04/2026, « Unlimited challenges ») ; son caveat marque `[INCERTAIN]` la **ventilation par mode**, parce que le blog GA annonce un plafond de « 1 million siteverify » et que la conciliation qui le réserve aux widgets **invisibles** est tenue d'une analyse tierce. La partie « illimité » était donc officielle, la partie « **en mode *managed*** » — c'est-à-dire *ce plafond ne mord pas ici* — était l'incertaine, et c'est elle qui avait disparu. La réserve est rétablie **avec ce qu'elle change**, faute de quoi elle obligerait chaque lecteur à refaire l'instruction : l'argument de la ligne est un argument **d'ordre** — Turnstile devant, le compteur derrière — et il tient dans les **deux** lectures, puisque sous l'hypothèse basse le plafond reste un **mur** (un refus, jamais un compteur facturé : `I5` tient) et reste **devant** le compteur qu'il protège. L'incertitude ne déplace que la **hauteur** de ce mur — et cette hauteur, rien ne la fixe : le rapport ne lui donne même pas de période, aucun appel réel ne la constate, et la calculer reviendrait à refaire l'erreur que le § « Écarté » du 10/08 avait déjà rejetée (diviser un quota par trente pour en tirer un seuil quotidien). Elle est donc **assumée marquée** — la **troisième** des trois issues posées par `S-10` pour un fait qui ne se comble pas, et son premier emploi. **(3) Cron — confirmé sur la source, déplacé sur la conséquence.** Deux reproches, deux sorts. La **disponibilité sur le palier gratuit** est bien non sourcée, et plus nettement que le constat ne le disait : `docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md`, qui inventorie composant par composant ce que ce palier porte, **ne mentionne Cron pas une seule fois** ; les limites connues — 5 déclencheurs par compte, 3 par Worker, minimum d'une minute, UTC seulement — ne viennent que de deux blogs tiers, situation identique à celle de `run_worker_first` au point 2 de « À constater en recette », et au motif qui avait fait écarter ce dernier comme acquis le 10/08. D'où un **point 7** dans cette même section. Le **« pas de retry »**, lui, **visait à côté** : le rapport le relève pour l'**accusé périodique d'acheminement**, où l'*absence* d'arrivée **est** le signal et où un raté produit donc une fausse alerte — or la stack n'a pas retenu cet accusé, elle porte « l'état d'acheminement porté par chaque demande et affiché dans la liste », sans aucun Cron. Le seul Cron de la stack est le maintien en vie du jeton, et là un appel sauté est absorbé par la fenêtre glissante d'un an de GitHub. **Ce que le constat désignait sans le nommer** : la ligne écrivait « appel anodin **périodique** », **sans cadence** — et sans retry, c'est la marge qui protège, donc c'est la cadence. À l'hebdomadaire, cinquante ratés d'affilée ne font rien ; à l'annuelle, un seul révoque le jeton et `FR-101` tombe. Cadence posée à l'**hebdomadaire**, avec son motif écrit dans la ligne : 52 passages par an contre une fenêtre d'un an. **Écarté** : **marquer `[À VÉRIFIER]` la phrase R2 sans la requalifier** — le lecteur croirait la **disqualification** incertaine alors que seul le **libellé** l'était ; **suivre la piste R2 à la lettre** — elle retire la source qui porte l'arbitrage et laisse un checkout obligatoire démontrer seul un invariant formulé sur l'absence de moyen de paiement ; **marquer `[INCERTAIN]` Turnstile sans instruire la conséquence** — une réserve qui ne dit pas si l'arbitrage tient oblige à refaire le travail ; **ouvrir une dette premortem sur le mur Turnstile atteint** — le chemin d'erreur est réel (le formulaire fermerait au lieu de noyer le compteur) mais l'hypothèse qui l'ouvre n'est pas établie, et une dette sur une hypothèse non établie encombre le premortem ; **ranger la cadence du Cron en recette** — cette section dit d'elle-même que ses points « ne sont ni des faits acquis, ni des options », or une cadence ne se constate par aucun appel réel : elle se décide ; **rouvrir le grief Astro** — rendu le 12/08 avec `S-10`, une ligne arbitrée ne se relit pas. **Recoupe `S-10`** : outre le grief Astro rendu en commun, la troisième de ses trois issues — **assumer marqué** ce qu'aucune mesure et aucune citation ne comble — trouve ici son premier emploi, sur la hauteur du mur Turnstile. |
