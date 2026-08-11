# Stack technique — ColibriCMS

| | |
|---|---|
| **Statut** | Draft |
| **Date** | 2026-08-10 |
| **Trace vers** | [PRD](./prd.md) |
| **Consommé par** | Archi, ADR, CI, niveau specs |
| **Documents liés** | [Socle de livraison](./socle-de-livraison.md) — invariants `I1`–`I6`, contraintes `C1`–`C10`, Annexe A datée |

> **Méthode.** Chaque domaine a été arbitré par l'humain sur des faits **sourcés et datés**,
> jamais sur une préférence d'agent. Les faits proviennent des trois rapports de
> `docs/research/` du 2026-08-10 et de vérifications faites sur la machine, citées ici avec
> leur emplacement. Un fait non sourcé est marqué comme tel : il ne descend pas dans un ADR.

## Vue d'ensemble

ColibriCMS est un CMS déployé en une instance par site, servant un site statique et une
administration depuis un même Worker Cloudflare, dans les comptes du client.
La forme de la solution — style macro et micro, invariants — est dans `docs/archi.md` (phase 4).

## Choix retenus

| Domaine | Choix | Sert (FR/SC) | ADR |
|---|---|---|---|
| Langage | TypeScript, mode strict | (tous) | |
| Générateur du site public et de l'aperçu | Astro 7 | FR-081, FR-095, FR-096, SC-005 | |
| Cible de déploiement et système de build | Un Worker Cloudflare unique — assets statiques + routes serveur —, bâti par Workers Builds | FR-087, FR-089, FR-096, FR-097, SC-001, SC-004 | |
| Base de données | Cloudflare D1 — brouillons, état publié, demandes | FR-026, FR-032, FR-044, FR-051, FR-065, FR-078, FR-092 | |
| Contenu publié en fichiers | Un répertoire par objet dans le dépôt : `page.json` pour la structure, un `.md` par emplacement de texte riche | FR-087, FR-107, FR-109, SC-011 | |
| Médias publiés | Même dépôt, branche orpheline `media` réécrite à chaque publication | FR-037, FR-084, FR-088, FR-107, FR-108, SC-011 | |
| Forge et écriture de la publication | GitHub ; API REST *git data* — **contenu textuel inliné** dans les entrées de `POST /git/trees`, **médias déposés par `POST /git/blobs` en base64** — puis `PATCH /git/refs` en `force: false`, avance rapide obligatoire. Jeton à portée fine, sans expiration, permission `Contents: Read and write` **seule** | FR-086, FR-089, FR-091 | |
| Maintien en vie du jeton d'écriture | Cron Trigger dans le compte de la cliente, appel anodin périodique | FR-101, SC-012 | |
| Auth | Implémentation maison sur D1 : jeton haché à usage unique et expirant, cookie de session signé | FR-001 à FR-014, SC-006, SC-020 | |
| Acheminement des demandes | Cloudflare Email Routing, binding `send_email` vers l'adresse de destination **vérifiée** | FR-063, FR-064, SC-007 | |
| Moyen anti-abus | Turnstile en mode *managed* devant, puis compteur de fréquence par origine hachée dans un Durable Object | FR-007, FR-062 | |
| Sérialisation des publications | Verrou conditionnel sur une ligne d'état en D1 | FR-090, FR-091 | |
| Interface d'administration | Îlots Svelte 5 dans Astro | FR-017, FR-054, FR-117, SC-003, SC-005, SC-015 | |
| Texte riche | Éditeur TipTap, sérialisation en **Markdown restreint** aux marques testées | FR-018, FR-117, SC-011 | |
| Pipeline d'images | `image.layout: 'constrained'`, `image.breakpoints: [640, 960, 1280]`, `<Image>` à un seul format | SC-005, SC-001 (par `C5`) | |
| Accès aux données | API D1 native, migrations `wrangler d1 migrations` | FR-105, FR-106, SC-008 | |
| Tests | Vitest dans `workerd` via `@cloudflare/vitest-pool-workers`, Playwright pour les parcours, épreuve de réversibilité scriptée | (tous) ; SC-003, SC-009, SC-011, SC-016 | |
| Détection de panne d'acheminement | État d'acheminement porté par chaque demande et affiché dans la liste | **— exigence à créer**, voir ci-dessous | |

### Domaines sans objet

- **Authentification du visiteur** — non applicable : `FR-062` exige le seuil de fréquence
  « sans exiger de compte du visiteur », et le multi-éditeur est exclu par le PRD.
- **File d'attente / traitement asynchrone** — non applicable : `FR-097` fait de l'envoi
  d'une demande le seul traitement serveur, et la publication est un geste synchrone
  sérialisé.
- **Analytique** — non applicable : exclue par le PRD, et `FR-075` à `FR-078` portent
  l'instrument dans D1.
- **Cache / CDN applicatif** — non applicable : les assets statiques sont servis
  gratuitement et sans quota, sans configuration propre au projet.

### Le seul choix qui ne sert aujourd'hui aucune exigence

L'**état d'acheminement affiché dans la liste des demandes** répond à la question que le
Brief renvoie ici (« comment la cliente s'aperçoit-elle que l'e-mail ne part plus ? »), mais
le PRD ne porte que l'atténuation : `FR-066` enregistre la demande même si l'acheminement
échoue, `FR-010` garde l'admin atteignable. **Aucun `FR` ne demande de détecter.**

Ce choix est donc retenu **sans exigence porteuse**. Il ne peut pas descendre au niveau
specs en l'état : il faut d'abord que `/scd-sdd:premortem socle` crée le `FR` qui le porte.
La phase Stack ne rétro-modifie pas le PRD.

## Contraintes techniques transverses

### Ce que `I5` impose à tout composant

Aucun composant retenu n'exige de moyen de paiement à l'activation, et tous opposent un
**mur** au dépassement (refus, erreur, mise en file) plutôt qu'un compteur facturé. Vérifié
composant par composant dans `docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md`.
C'est ce critère, et non un palier chiffré, qui disqualifie R2.

**Réserve à porter telle quelle :** « aucun compteur facturé sur le palier gratuit » est une
**déduction** tirée du silence de la documentation, pas une phrase de l'éditeur. Le seuil qui
la ferait tomber — une limite gratuite passant du mur au compteur facturé — est à surveiller.

### Le domaine doit être sur DNS Cloudflare

Deux contraintes convergent et il n'y a rien à arbitrer : `send_email` exige que le domaine
soit servi par le DNS Cloudflare (`FR-063`), et un Worker n'accepte aucun domaine dont les
serveurs de noms sont gérés ailleurs. C'est une ligne de la recette de livraison.

### La publication est une séquence en trois temps

Dépôt additif des médias sur la branche `media` → commit du contenu sur la branche
principale → effacement des orphelins **après** le build. L'ordre est imposé : commit
d'abord, marquage « publié » ensuite. Il en découle que **la sérialisation des publications
est obligatoire** (cas limite du PRD, `prd.md:640`) : un compare-and-swap sur le dernier
geste ne protège pas les deux premiers.

### Le budget de sous-requêtes d'une publication, mesuré

`POST /git/trees` accepte le contenu **inliné** dans l'entrée d'arbre : le texte ne coûte
alors aucun appel dédié, et la chaîne tient en **4 appels quel que soit le nombre de fichiers
texte** — mesuré jusqu'à 1 000 entrées en une requête. Un blob par fichier coûtait `N + 4`,
soit les 50 sous-requêtes franchies **au 47ᵉ fichier**.

**Le contenu inliné est de l'UTF-8, et un binaire y est corrompu en silence** : un PNG de
70 octets en ressort à 84, `0x89` devenu `0xC2 0x89`, l'arbre répondant `201` malgré tout.
Les médias gardent donc `POST /git/blobs` en base64 — **un appel chacun, non mutualisable**.

Le budget devient `M + 4` appels pour `M` médias, le nombre de fichiers texte n'y figurant
plus. Un réessai (ci-dessous) coûte 4 appels de plus sans recréer les blobs, d'où `M + 8 ≤ 50` :

| | Plafond par publication |
|---|---|
| Fichiers texte | **non contraint** |
| Médias déposés | **42**, un réessai réservé — borne à descendre en specs |

**Le préambule qui lit le HEAD n'est pas fiablement *read-your-writes*.** Sur dix publications
enchaînées, deux `PATCH` ont été rejetés en `422 Update is not a fast forward` alors que rien
d'autre n'écrivait sur la branche ; les deux voies de lecture — `git data` et REST — se sont
montrées en retard tour à tour, et leur accord n'a rien garanti. **Le réessai est donc
obligatoire**, et le `422` fait au passage la démonstration de ce sur quoi `FR-091` s'appuie :
il refuse, il n'écrase pas. La fréquence réelle reste inconnue — la mesure enchaîne les gestes
en conditions adverses, là où le verrou D1 les sérialise et les espace.

Mesure du 11/08/2026, sur dépôt jetable et avec témoin :
[relevé](./research/2026-08-11-sous-requetes-publication.md), trace brute rejouable à côté.

### `C6` change de forme

« Un clone nu du dépôt produit le site complet » devient **« un clone, deux branches »** :
la procédure de reconstruction de `FR-107` et `FR-109` doit récupérer `main` **et** `media`.
Le *fetch* de `media` pendant le build doit être **explicite dans la commande de build et
porter son propre jeton** en lecture — Cloudflare ne documente ni la profondeur du clone ni
les refs récupérées. C'est un secret de plus à ouvrir sous `I4` et à inventorier sous `C7`.

### Le garde-fou `C5`, chiffré par la configuration retenue

Le plafond de 20 000 fichiers porte sur la **sortie du build**, jamais sur les sources du
dépôt. Avec `constrained` + breakpoints `[640, 960, 1280]` + `<Image>` à un format, une
photographie produit **5 fichiers** — soit un mur vers 4 000 photographies et l'alerte `C5`
(15 000 fichiers) vers 3 000. Calcul dérivé de `astro@7.2.0`,
`package/dist/assets/layout.js` (`getWidths`) et `internal.js:121` (sélection de
`LIMITED_RESOLUTIONS` dès que le service d'images est local). La valeur réelle se mesure au
premier déploiement et se reporte en Annexe A (réserve 3).

### Données personnelles

« Une même origine » au sens de `FR-007` et `FR-062` est une adresse IP, donc une donnée
personnelle. Le compteur de fréquence stocke une **empreinte**, jamais l'adresse en clair.
Le cadrage complet appartient au chantier `docs/chantiers/en-attente/2026-08-10-cadrage-donnees-personnelles.md`.

### Secrets à ouvrir au nom de la cliente (`I4`, `C7`)

Trois, et aucun n'appartient à l'intégrateur. Le dossier d'instance dit où chacun est rangé,
jamais sa valeur (`FR-112`).

| Secret | Portée mesurée le 11/08/2026 |
|---|---|
| Jeton d'écriture de la publication | Portée fine, dépôt unique, **sans expiration**, `Contents: Read and write` **seule** |
| Jeton de lecture du *fetch* de `media` pendant le build | Portée fine, dépôt unique, `Contents: Read-only` |
| Clé de signature des cookies de session | Générée dans le compte de la cliente |

**Le jeton d'écriture n'expire pas, mais il peut disparaître.** GitHub documente qu'il
« removes personal access tokens that haven't been used in a year ». Comme `FR-101` exige
qu'une publication aboutisse après retrait de tous les accès de l'intégrateur, et que
`SC-006` interdit d'envoyer la cliente sur GitHub, un **Cron Trigger dans son propre compte**
fait périodiquement un appel anodin avec ce jeton. Il vit chez elle, donc `I6` et `C10`
tiennent.

### Ce que `archi` devra reprendre en invariants

- Le rendu de l'aperçu et le rendu publié partagent **les mêmes composants** : c'est la seule
  façon de tenir `FR-081` (« le même rendu que celui du site publié ») sans un second moteur
  qui divergerait.
- La logique métier n'importe pas le framework web : sans cela, `C6` — le mode de build
  depuis les fichiers plats, sans D1 — n'est pas atteignable.

### Vérification mécanique obligatoire

Le Brief pose que « le code entrant n'est pas relu ligne à ligne » et que la confiance doit
venir de vérifications mécaniques. Deux choix de cette page en dépendent explicitement et la
phase `ci` doit les rendre bloquants : l'**aller-retour de sérialisation Markdown** de
l'éditeur (une marque autorisée qui ne se sérialise pas disparaît en silence à la
publication), et le **garde-fou `C5`** sur le nombre de fichiers produits.

## Le jeton d'écriture — mesuré, et non déduit

Ce point était ouvert. Il a été fermé le **11/08/2026** par une série de mesures sur un dépôt
jetable (`sebc-dev/colibri-jeton-essai`), avec témoin positif à chaque fois. Ce qui suit est
citable dans un ADR au niveau de preuve **mesuré** ; la documentation de GitHub ne porte
aucune de ces trois premières lignes.

| Fait | Comment il a été obtenu |
|---|---|
| Un jeton à portée fine sur compte personnel peut n'avoir **aucune expiration** | Témoin à 7 j → en-tête `github-authentication-token-expiration` daté ; jeton sans expiration → aucun en-tête |
| L'écriture complète de la publication passe avec **`Contents: write` seule** — blob, arbre, commit, déplacement de ref | Aucun refus sur la chaîne REST *git data* |
| `PATCH /git/refs` en `force: false` **refuse** un déplacement qui n'est pas en avance rapide | Commit bâti sur un parent périmé → `422 Update is not a fast forward` ; commit bâti sur la tête courante → accepté |
| Les mutations GraphQL `updateRefs` et `createCommitOnBranch` exigent **`Contents` + `Workflows`** | `Contents` seul → `FORBIDDEN` ; `Contents` + `Workflows` → `UNPROCESSABLE` sur l'oid attendu, puis commit créé |
| Le `git push --force-with-lease` fait le même contrôle, avec `Contents` seule | Oid attendu faux → `stale info` ; oid attendu juste → accepté |
| Un jeton inutilisé pendant un an est retiré | [officiel · rapporté] *« GitHub automatically removes personal access tokens that haven't been used in a year »* |

**Ce qui reste une inférence, à écrire comme telle** : la *nécessité* de `Workflows` pour les
mutations GraphQL est obtenue par différence — un seul facteur a changé entre les deux jetons —
et non par une phrase de GitHub, qui ne publie aucune table de permissions GraphQL.

**Ce qui n'a pas été instruit** : la branche GitHub App. Le jeton d'installation expire en une
heure (documenté) ; que la clé privée n'expire jamais n'est écrit sur aucune page lue, et la
propriété d'une App installée sur un compte de particulier (`I4`, `FR-098`) n'a pas été
établie. Sans objet tant que la voie retenue tient.

## À constater en recette, jamais par recherche

Ces points ne se tranchent que par un appel réel ; ils ne sont ni des faits acquis, ni des
options. Les trois qui portaient sur le jeton d'écriture ont été retirés le 11/08/2026 —
ils sont mesurés ci-dessus.

1. `DELETE … RETURNING` sur D1 — la page SQL n'énumère que FTS5, JSON et math, et renvoie au
   code source.
2. Le routage `/api/*` vers le code du Worker — `run_worker_first` et `not_found_handling` ne
   sont tenus que d'un billet personnel, pas de la documentation.
3. Le *checkout* Cloudflare atteint-il la branche `media` sans jeton fourni — ni documenté ni
   infirmé.
4. La délivrabilité réelle vers les boîtes françaises — Email Sending est en bêta publique
   depuis le 16/04/2026.

## Décisions structurantes → candidats ADR

Une ligne = un futur ADR. La colonne « ADR » du tableau ci-dessus est back-fillée par
`/scd-sdd:adr`.

1. **Cible de déploiement et système de build : un Worker unique bâti par Workers Builds.**
   Retenue car `FR-081` exige un aperçu rendu serveur avec les mêmes composants que le site
   publié, ce qui impose un adaptateur, et parce que la CI hébergée de Cloudflare est couplée
   à la cible. Alternative écartée : **projet Pages + Pages Build** — `@astrojs/cloudflare`
   a retiré le support de Pages à la **v13** (publiée le 10/03/2026 ; README v12 « Cloudflare
   Pages Functions targets », README v13 « Cloudflare Workers targets », zéro occurrence de
   `pages` dans son `dist`), donc l'aperçu rendu serveur y imposerait `astro@5.18.2` contre
   `astro@7.2.0` — deux majors en arrière, sur une branche que l'adaptateur a quittée, et
   `FR-105`/`SC-008` font porter cette dette par toute la flotte. Les plafonds, eux, sont
   **égaux** des deux côtés et n'ont rien départagé.

2. **Générateur : Astro 7.** Retenu car il produit un site statique par défaut (`FR-095`,
   `FR-096`) *et* sait rendre les mêmes composants côté serveur pour l'aperçu (`FR-081`).
   Alternative écartée : **Eleventy ou Hugo** — un générateur purement statique n'a pas de
   moteur de rendu serveur, donc l'aperçu repasserait par un build (attente pour l'éditrice,
   consommation du quota) ou par un second moteur, dont la divergence casserait « le même
   rendu que celui du site publié ».

3. **Magasin : D1 porte les brouillons et l'état publié ; le dépôt reçoit la copie publiée.**
   Retenu car il confirme `C1` et `I2` sans retouche. Alternative écartée : **le dépôt EST le
   magasin** (et sa variante dépôt + index D1 dérivé) — reconstruire l'index inverse
   qu'exige `FR-032` sans base dépasse le plafond de **50 sous-requêtes par requête** des
   Workers, à la lecture comme à la reconstruction.

4. **Médias : même dépôt, branche orpheline `media` réécrite à chaque publication.** Retenue
   car l'espace maigrit au lieu de croître sans fin, `FR-037` et `FR-084` restent vrais à
   l'écran, et `SC-011` n'exige pas l'identité binaire. Alternatives écartées : **R2** — un
   moyen de paiement est exigé au *checkout* d'activation, ce qui tombe sous `I5` (Billing
   policy, et non le témoignage Community) ; **deux dépôts distincts** — mêmes bénéfices, un
   espace de plus à ouvrir et à vérifier sous `I1` ; **D1, KV ou Durable Objects** —
   `FR-107` exige des **fichiers**, un clone nu n'en produirait aucun ; **un dépôt à
   historique complet** — `FR-037` et `FR-084` deviendraient faux à l'écran.

5. **Forge et écriture de la publication : GitHub, API REST *git data* puis
   `PATCH /git/refs` en `force: false`, sous un jeton à portée fine sans expiration portant
   `Contents: Read and write` seule.** Retenue car l'avance rapide obligatoire refuse
   précisément les situations que `FR-091` redoute — mesuré : `422 Update is not a fast
   forward` sur un commit bâti sur un parent périmé — et parce que c'est la voie qui demande
   **une seule permission** sur le dépôt de la cliente. Alternative écartée : **GraphQL
   `updateRefs` avec `beforeOid` et `force: true`** — vrai compare-and-swap y compris sur une
   réécriture, et deux refs en un appel atomique, mais il exige en plus **`Workflows: write`**
   (mesuré par différence), c'est-à-dire le droit de réécrire le pipeline qui bâtit le site,
   accordé à un jeton qui vit dans un Worker. Les deux « manques » de la voie retenue ne
   coûtent rien : l'atomicité multi-refs n'était de toute façon pas atteignable — la
   publication est une séquence en trois temps — et le seul geste non-avance-rapide, la
   réécriture finale de `media` après le build, se déroule sous le verrou conditionnel en D1
   retenu au tableau des choix.
   Alternatives écartées plus tôt : **`git push --force-with-lease`** — même contrôle avec la
   même permission (mesuré), mais un Worker n'a ni sous-processus ni système de fichiers, donc
   il ne peut pas lancer `git` ; **GitLab** — aucun des faits sourcés ne porte sur lui.

6. **Auth : implémentation maison sur D1.** Retenue car la surface est exactement le besoin —
   une adresse, un jeton, une session — et parce que `FR-005` (ne rien envoyer à une adresse
   non autorisée) et `FR-008` (aucune réponse ne distingue) y sont tenus par construction.
   Alternatives écartées : **Better Auth 1.6.26** — 3,2 Mo dépaquetés, 17 dépendances et 19
   pairs pour six piles de base de données dont une seule sert, sous un plafond de Worker de
   3 Mo gzip, et `FR-005`, `FR-008` et le moyen de reprise (`FR-009` à `FR-012`) resteraient
   à écrire par-dessus ; **Cloudflare Access one-time PIN** — son palier gratuit n'a **aucune
   source primaire**, donc invérifiable face à `I5` et `FR-103`, et l'éditrice se
   connecterait à une couche d'identité tierce, ce que `FR-004` et `SC-006` interdisent.

7. **Format du contenu déposé : un répertoire par objet.** Retenu car le §4.3 du clausier
   promet des fichiers « exploitables par n'importe quel professionnel, avec ou sans
   l'outil », et c'est le texte de la cliente qui doit rester lisible. Alternatives
   écartées : **un JSON par objet** — le texte riche y devient une chaîne échappée et le diff
   Git cesse d'être une lecture ; **Markdown + frontmatter** — empêchement de structure, une
   page porte plusieurs emplacements de texte riche (`FR-017`, `FR-018`) là où un fichier
   Markdown n'a qu'un corps.

8. **Texte riche : Markdown restreint aux marques testées.** Retenu car le risque résiduel —
   la perte silencieuse d'une marque à la sérialisation — est **testable**, donc fermable par
   la phase `ci`. Alternative écartée : **HTML restreint** — plus fidèle, mais il faudrait
   assainir sur deux chemins, et le PRD envisage explicitement le cas où l'administration est
   compromise, où du HTML stocké deviendrait du contenu tiers servi à chaque visiteuse. Un
   assainissement raté est un risque dont on ne prouve jamais l'absence.

9. **Acheminement : Email Routing et `send_email` vers l'adresse de destination vérifiée.**
   Retenu car c'est gratuit sur tout plan, sans carte, et c'est exactement ce que `FR-063`
   demande. Alternative écartée : **Email Sending vers un destinataire arbitraire** — exige
   Workers Paid (5 $/mois minimum), ce qui fait tomber `I5`, `FR-103` et `SC-001`.
   *Frontière de périmètre à porter : aucun `FR` n'envoie d'e-mail au visiteur.*
   Alternatives écartées plus tôt : **SendGrid, SES, MailerSend, ZeptoMail** — échouent sur
   « permanent » ou sur « sans carte » ; **le SMTP de la boîte de la cliente** — suspendu à
   un fournisseur grand public acceptant un envoi depuis une IP Cloudflare partagée.

10. **Langage : TypeScript strict.** Retenu car le Brief exige que la confiance vienne de
    vérifications mécaniques, le code n'étant pas relu ligne à ligne. Alternative écartée :
    **JavaScript + JSDoc vérifié par `tsc`** — même vérificateur, ergonomie dégradée sur les
    structures du produit (schéma des emplacements, contrats de publication).

11. **Îlots : Svelte 5.** Retenu car `FR-054` fait expédier du JavaScript sur toute page
    publique portant un formulaire, et `SC-005` mesure Lighthouse ≥ 95 en mobile sur ces
    pages : le compilateur de Svelte n'expédie pas de runtime de framework. Alternative
    écartée : **React 19** — écosystème plus large, mais le coût est payé par la visiteuse,
    là où le critère se mesure.

12. **Anti-abus : Turnstile *managed* devant, compteur par origine hachée dans un Durable
    Object.** Retenu car `FR-062` et `FR-007` demandent littéralement un **seuil de
    fréquence** — un compteur, pas une preuve d'humanité — et parce que l'ordre décide :
    Turnstile est gratuit et illimité en mode *managed*, il absorbe le volume avant que le
    compteur, plafonné à 100 000 requêtes par jour, ne soit sollicité. Alternative écartée :
    **une règle Cloudflare Rate Limiting** — sa disponibilité et ses limites sur le palier
    gratuit ne sont pas sourcées, elle ne peut donc pas descendre en ADR.

13. **Tests : Vitest dans `workerd`, Playwright, épreuve de réversibilité scriptée.** Retenue
    car `@cloudflare/vitest-pool-workers@0.21.0` exécute les tests avec les liaisons réelles
    D1 et Durable Objects, et parce que `SC-011` demande une pièce datée, donc un script
    rejouable. Alternative écartée : **Vitest sous Node avec liaisons simulées** — l'oracle
    devient faux, les tests attestant du comportement des simulacres.

## Ce que cette phase dépose sur les autres documents

- **`docs/socle-de-livraison.md`** : §3, `C6`, Annexe A et réserve 1 amendés le 2026-08-10
  par cette phase (le bandeau ⚠️ du document demandait cette revalidation) ; le n° 6 de « Ce
  qui reste ouvert » fermé le 2026-08-11 par la mesure du jeton d'écriture.
- **La recette de livraison** (§7 du socle) gagne trois lignes que cette phase impose :
  le jeton d'écriture créé **sans expiration** et portant `Contents: Read and write` seule,
  le jeton de lecture de `media` en `Contents: Read-only`, et le Cron de maintien en vie
  actif avant la livraison.
- **`docs/prd.md`** : non modifié, et il ne doit pas l'être ici. Une seule dette y est
  ouverte — le `FR` qui porterait la détection de panne d'acheminement, à créer par
  `/scd-sdd:premortem socle`.
- **`docs/ci.md`** (phase 6) : deux contrôles nommés ci-dessus doivent y devenir bloquants —
  l'aller-retour Markdown de l'éditeur et le garde-fou `C5`.
