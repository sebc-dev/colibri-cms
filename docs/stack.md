# Stack technique — ColibriCMS

| | |
|---|---|
| **Statut** | Draft |
| **Date** | 2026-08-07 |
| **Trace vers** | [PRD](./prd.md) |
| **Consommé par** | ADR, CI, niveau specs |
| **Documents liés** | [Socle de livraison](./socle-de-livraison.md) — invariants `I1`–`I6`, contraintes `C1`–`C10`, annexe A datée |

> **Ce que ce document est.** La synthèse des fondations techniques, en mode *options
> justifiées* : chaque ligne a été arbitrée par l'humain, contre des faits relevés le
> 6 août 2026, et chacune sert au moins une exigence du PRD. Le **rationale détaillé** de
> chaque décision coûteuse à inverser part dans un ADR — c'est la dernière section qui
> pilote cette phase-là, pas le tableau des choix.
>
> La colonne « ADR » est **volontairement vide** : `/scd-sdd:adr` la back-fille.

---

## Vue d'ensemble

ColibriCMS est **un site statique et un outil d'édition, déployés côte à côte dans le
compte Cloudflare de la cliente**, sans aucune infrastructure Isometria. L'état publié du
site n'existe qu'en **fichiers plats dans le dépôt Git de la cliente** ; la base ne porte
que le brouillon, la médiathèque et les demandes de devis. Publier, c'est écrire un commit
— et ce commit est le seul déclencheur de la reconstruction, si bien que la copie portable
et la mise en ligne sont le même geste et ne peuvent pas diverger.

Deux objets déployables aux cycles de vie disjoints : un **Worker de site public** qui ne
sert que des assets statiques, jamais un script ; un **Worker de CMS** qui porte l'admin,
la base, la publication et l'unique traitement serveur du produit — la réception d'une
demande de devis.

---

## Choix retenus

| Domaine | Choix | Sert (FR/SC) | ADR |
|---|---|---|---|
| **Langage** | TypeScript strict, avec validation de schéma à l'exécution sur toutes les frontières d'entrée | `FR-065`, `FR-066`, `FR-067` · contrainte « vérifications mécaniques » | [ADR-0006](./adr/0006-typescript-strict-validation-aux-frontieres.md) |
| **Framework du site public** | Astro | `FR-045`, `FR-046`, `FR-047`, `FR-058`, `SC-005` | [ADR-0005](./adr/0005-astro-moteur-de-rendu.md) |
| **Framework de l'admin** | Coquille statique Astro + îlots interactifs + API JSON dans le Worker | `FR-004`–`FR-014`, `FR-030`, `FR-048`–`FR-056`, `FR-072`–`FR-079` | [ADR-0005](./adr/0005-astro-moteur-de-rendu.md) · [ADR-0004](./adr/0004-cloudflare-workers-deux-workers-separes.md) |
| **Magasin de l'état publié** | Le dépôt Git de la cliente, en fichiers plats — source de vérité unique | `FR-037`, `FR-040`, `FR-043`, `SC-009`, `SC-011` | [ADR-0001](./adr/0001-depot-client-magasin-de-l-etat-publie.md) |
| **Format du contenu déposé** | Markdown pour le texte riche, frontmatter YAML pour les champs structurés | `FR-006`, `FR-037`, `FR-043`, `SC-011` | [ADR-0002](./adr/0002-format-du-contenu-markdown-frontmatter-yaml.md) |
| **Médias** | Fichiers statiques du dépôt ; dérivés responsive générés au build | `FR-017`, `FR-021`, `FR-038`, `FR-039`, `SC-010`, `SC-001` | [ADR-0003](./adr/0003-medias-en-fichiers-du-depot-r2-ecarte.md) |
| **Base de données** | Cloudflare D1 — brouillon, médiathèque, demandes. Ne porte **jamais** l'état publié | `FR-023`, `FR-024`, `FR-029`, `FR-035`, `FR-066`, `FR-072`, `FR-075`, `FR-080` | [ADR-0001](./adr/0001-depot-client-magasin-de-l-etat-publie.md) |
| **Auth** | Lien magique, mécanique déléguée à une bibliothèque d'authentification éprouvée | `FR-001`, `FR-002`, `FR-003`, `SC-006`, `SC-015` | [ADR-0007](./adr/0007-authentification-par-lien-magique.md) |
| **Envoi d'e-mail** | Cloudflare Email Service, **restreint à l'adresse de destination vérifiée** de la cliente | `FR-068`, `FR-069`, `FR-070`, `FR-071`, `SC-016` | [ADR-0008](./adr/0008-envoi-e-mail-cloudflare-email-service.md) |
| **Anti-abus** | Deux étages : 1 règle WAF en périphérie + Turnstile devant l'enregistrement | `FR-065`, `SC-017` | [ADR-0009](./adr/0009-anti-abus-a-deux-etages.md) |
| **Forge** | GitHub, dépôt ouvert au nom de la cliente ; publication par l'API Git | `FR-037`, `FR-041`, `FR-088`, `SC-013` | [ADR-0010](./adr/0010-github-forge-et-chemin-de-publication.md) |
| **Cible de déploiement** | Cloudflare Workers, **deux Workers séparés** (site public en assets · CMS) | `FR-046`, `FR-086`, `FR-097`, `FR-098`, `SC-008`, `SC-012` | [ADR-0004](./adr/0004-cloudflare-workers-deux-workers-separes.md) |
| **Système de build** | Workers Builds, déclenché par le commit, dans le compte de la cliente | `FR-040`, `FR-042`, `FR-045`, `SC-004` | [ADR-0004](./adr/0004-cloudflare-workers-deux-workers-separes.md) |
| **Maintien de la flotte** | CMS publié en paquet versionné ; dépôt d'instance mince (contenu + config, pas de code) | `FR-086`, `SC-008` | [ADR-0011](./adr/0011-cms-en-paquet-versionne-depot-d-instance-mince.md) |
| **Stratégie de test** | Trois étages — unitaire/intégration · bout en bout · **épreuves d'invariant rejouables** — portail bloquant sur le code nouveau | `SC-011`, `SC-012`, `SC-014` · contrainte « code non relu ligne à ligne » | [ADR-0012](./adr/0012-strategie-de-test-a-trois-etages.md) |

### Domaines explicitement non applicables

- **Rôles et permissions** — `EXCLU` du Brief : une seule éditrice par instance, la collision
  qu'un modèle de droits protégerait est structurellement impossible.
- **Analytique** — `EXCLU` du Brief et `FR-081`. L'instrument du produit est le compteur de
  demandes en D1, pas le trafic.
- **File d'attente et traitement asynchrone** — aucun traitement différé au périmètre v1 :
  la publication est synchrone jusqu'au commit, puis c'est le build qui prend le relais.
- **Internationalisation** — hors périmètre v1, aucun `FR` ne la demande.
- **Mutualisation / multi-tenant** — `EXCLU` du Brief : un déploiement = un site = un client.

---

## Contraintes techniques transverses

**Gratuité conditionnelle (`I5`, `C9`, `SC-001`).** Tout composant retenu est gratuit
**sans moyen de paiement enregistré**. C'est ce critère — et non le prix — qui a écarté
Cloudflare R2 (activation par un parcours de souscription exigeant une carte), Cloudflare
Images (produit payant) et l'envoi d'e-mail vers des destinataires arbitraires (plan
Workers Paid).

**Tout dans le compte de la cliente (`I1`, `I4`, `FR-041`, `FR-102`).** Domaine, compte
Cloudflare, dépôt GitHub, base D1, les deux Workers, le domaine d'envoi d'e-mail, le widget
Turnstile : chacun ouvert à son nom. Isometria n'y a que des accès révocables.

**Le contenu publié n'a pas de second exemplaire (`I2`, `I3`).** Il n'existe qu'en fichiers
plats. Aucune double écriture n'est possible, donc aucune divergence ne l'est.

**Enveloppe du palier gratuit, relevé du 6 août 2026** — les valeurs vivent dans l'annexe A
du socle de livraison, qui se révise sans rouvrir le contrat. Ce qui contraint le code :

| Limite | Valeur (plan Free) | Ce que le code doit en faire |
|---|---|---|
| Fichiers par version de Worker | 20 000 | Compter au build et alerter à 15 000 (`C5`) — les dérivés d'images sont le poste dominant |
| CPU par invocation | 10 ms | Aucun rendu de gabarit à la demande : l'admin est servi en assets, le script ne fait que des écritures courtes. L'attente réseau n'est pas comptée |
| Requêtes Worker | 100 000/jour | La règle WAF doit arrêter la rafale **avant** le Worker, sinon Turnstile la rejette correctement en brûlant le quota |
| D1 | 5 M lignes lues/j · 100 k écrites/j · 5 Go | Confortable pour ce profil ; à surveiller si la médiathèque devient volumineuse |
| Workers Builds | 3 000 min/mois · 1 build concurrent · timeout 20 min | Le comportement au-delà des minutes reste non documenté — ne rien contractualiser dessus (réserve 1 de l'annexe A) |

**Un seul destinataire d'e-mail.** L'envoi n'est gratuit que vers une **adresse de
destination vérifiée** du compte. Le produit ne dépasse jamais ce couloir parce que son
unique destinataire est l'éditrice elle-même — et l'exclusion « accusé de réception par
e-mail au visiteur » du PRD n'est donc plus seulement une décision de périmètre : **elle
porte la gratuité de l'envoi**. La rouvrir rouvre `SC-001`.

**Le dépôt ne maigrit jamais.** Une image supprimée disparaît de l'arbre de travail mais
demeure dans l'historique. C'est le prix assumé du renoncement à R2 ; il n'a aucun effet
sur `SC-010` (aucune page publiée n'affiche d'image manquante) mais il pèse sur la taille
du dépôt dans la durée.

**Anti-rebond à la charge du CMS (`C4`, `FR-042`).** La concurrence de build à 1 *sérialise*
une rafale, elle ne la fusionne pas. Le regroupement des publications rapprochées est du
travail applicatif, pas un acquis de la plateforme.

**Concentration chez un fournisseur unique.** Framework, hébergement, build, base, envoi
d'e-mail et anti-abus relèvent tous de Cloudflare depuis l'acquisition d'Astro en janvier
2026. Contrepoids retenus : Astro est sous licence MIT et son code est public ; l'épreuve
de réversibilité (`SC-011`) ne dépend d'aucun accès Cloudflare ; `I3` s'entend « sans accès
Cloudflare », pas « sans registre de paquets ».

**Open source**, sans promesse d'usage par des tiers en v1 — reprise de la contrainte du
Brief, sans effet sur les choix ci-dessus.

---

## Ce que cette phase rouvre en amont

Deux points à traiter hors de ce document, avant qu'ils ne se figent dans un ADR :

- **`C1` du socle de livraison est devenu faux.** Il écrit « le CMS écrit le contenu dans D1
  **et** le commite en fichiers plats ». L'arbitrage retenu supprime la double écriture : D1
  ne porte plus l'état publié. `C1` et sa colonne de vérification sont à amender.
- **Réserve 1 de l'annexe A, partiellement levée.** Le quantum des minutes de build est
  désormais documenté (3 000/mois, plan Free) ; seul le comportement au dépassement reste
  non documenté. La réserve se resserre au lieu de disparaître.

**Restent ouvertes, et non tranchées ici** — ce ne sont pas des choix de stack : la perte ou
la compromission de la boîte e-mail de la cliente (clé de voûte de l'instance), et les
obligations RGPD attachées aux coordonnées transportées par chaque demande. Toutes deux à
cadrer avant la première mise en ligne, comme le Brief le pose.

---

## Décisions structurantes → candidats ADR

Une ligne = un futur ADR. Chacune est coûteuse à inverser ; les choix cosmétiques et les
conventions évidentes n'y figurent pas.

1. **Le dépôt de la cliente porte l'état publié ; D1 ne porte que le brouillon.** Retenue
   parce que `I2`, `I3` et `SC-009` deviennent vrais par construction et qu'aucune
   divergence n'est possible faute de second exemplaire. *Alternative écartée* : D1 porte
   tout et le dépôt en est une copie déposée (le `C1` d'origine) — écartée parce que la
   double écriture ouvre une fenêtre où `I2` est faux si le commit échoue après le succès
   en base, fenêtre qu'il faudrait réconcilier par du code que rien ne teste tant qu'il ne
   casse pas.

2. **Format du contenu déposé : Markdown + frontmatter YAML.** Retenue parce que `FR-037`
   « fichiers lisibles » et `SC-011` ne valent que si un tiers ouvre le fichier et lit,
   sans connaître aucun schéma ; et parce que borner l'éditeur à ce que Markdown exprime va
   dans le sens du produit — elle ne peut pas casser sa mise en page. *Alternative écartée*
   : le JSON structuré de l'éditeur — fidélité parfaite, mais `SC-011` obligerait le tiers à
   décoder le schéma d'un éditeur, et `US11` prévient que ce format se paie s'il est repris
   tard.

3. **Médias en fichiers statiques du dépôt, dérivés générés au build ; R2 écarté.** Retenue
   par élimination : R2 était techniquement supérieur — hors du décompte de fichiers, dépôt
   qui ne gonfle pas, suppression honnête — mais son activation exige un moyen de paiement
   sur le compte, ce qui rend faux `I5`, `C9`, `SC-001` et la clause §4.1 du clausier.
   *Alternative écartée* : R2, sur ce seul motif — à rouvrir si Cloudflare change cette
   condition d'entrée.

4. **Plateforme et topologie : Cloudflare Workers, deux Workers séparés.** Retenue parce que
   le site public et le CMS ont des cycles de vie disjoints — publier du contenu ne doit pas
   redéployer du code, et sortir une version du CMS ne doit pas retoucher le site en ligne
   (`SC-008`) — et parce qu'un défaut de l'admin ne peut alors pas retirer le site.
   *Alternative écartée* : Cloudflare Pages, malgré sa limite écrite de 500 déploiements par
   mois, parce que Cloudflare publie un guide de migration vers Workers et que l'adaptateur
   Astro ne le cible plus par défaut.

5. **Astro comme moteur de rendu du site public et de l'admin.** Retenue pour les collections
   de contenu lisant les fichiers plats, la génération des dérivés d'images au build — ce qui
   remplace exactement ce que R2 aurait apporté —, les îlots pour le calcul du total chez le
   visiteur (`FR-058`) et le zéro JavaScript par défaut (`FR-047`, `SC-005`), le tout sur un
   seul outillage partagé avec l'admin. *Alternative écartée* : Eleventy, plus neutre vis-à-vis
   du fournisseur, mais sans pipeline d'images ni îlots — il faudrait les écrire, et `SC-005`
   redeviendrait un travail d'optimisation manuel.

6. **TypeScript strict, avec validation de schéma à l'exécution sur les frontières.** Retenue
   parce que la contrainte « le code entrant n'est pas relu ligne à ligne » exige des
   vérifications mécaniques, et que les types disparaissent à la compilation : trois
   frontières reçoivent des octets non maîtrisés — soumission du visiteur, réponses de l'API
   GitHub, lignes relues de D1. *Alternative écartée* : TypeScript seul, où une donnée mal
   formée se propage jusqu'à échouer loin de sa cause.

7. **Authentification par lien magique, mécanique déléguée à une bibliothèque éprouvée.**
   Retenue parce qu'elle réalise le geste exact de `FR-001` — l'adresse, puis un clic,
   aucune autre information demandée — sans que la sécurité de l'admin repose sur cinq
   points (aléa, usage unique, expiration, comparaison en temps constant, fixation de
   session) qui se trompent en silence et ne font échouer aucun test. *Alternative écartée*
   : Cloudflare Access par code à six chiffres — zéro code d'authentification et une
   protection du quota à la périphérie, mais elle impose de retaper un code, ce qui s'écarte
   de la lettre de `FR-001` et du scénario `US1`.

8. **Cloudflare Email Service, envoi restreint à l'adresse de destination vérifiée.**
   Retenue parce que c'est le seul chemin gratuit **sans moyen de paiement** qui satisfait
   les trois conditions posées par le Brief (compte au nom de la cliente, aucune carte,
   délivrabilité vérifiable), et parce que l'échec d'envoi est rendu de façon synchrone —
   ce qui honore `FR-070` et `FR-071` sans aucune surveillance hébergée, donc sans entamer
   `I6`. *Alternative écartée* : un service tiers d'envoi (Resend, Brevo et assimilés), qui
   ajouterait un compte, un secret et une dépendance là où la plateforme déjà retenue suffit.

9. **Anti-abus à deux étages : règle WAF en périphérie + Turnstile devant l'enregistrement.**
   Retenue parce que les deux étages font deux travaux qui ne se remplacent pas : la règle
   WAF protège le quota de requêtes (`I5`) en arrêtant la rafale avant le Worker, Turnstile
   protège la liste des demandes et les deux nombres (`SC-017`) mais s'exécute *dans* le
   Worker. *Alternative écartée* : Turnstile seul — correct sur `SC-017`, mais une rafale
   massive serait proprement rejetée tout en brûlant le quota journalier.

10. **GitHub comme forge et comme chemin de publication.** Retenue pour l'épreuve de
    passation (`SC-014`) : c'est la forge que le développeur tiers connaît déjà, et une
    épreuve « sans poser aucune question » se joue sur du familier. *Alternative écartée* :
    GitLab, dont l'API de commits accepte toutes les actions de fichiers en une seule
    requête réellement atomique — un avantage réel sur le chemin le plus critique du
    produit, payé en familiarité.

11. **Maintien de la flotte : CMS publié en paquet versionné, dépôt d'instance mince.**
    Retenue parce que `FR-086` exige littéralement qu'aucun code propre au client n'existe :
    le dépôt de la cliente ne porte que ce qui lui appartient — contenu, médias, gabarits,
    configuration — et monter de version est un changement de numéro. *Alternative écartée*
    : le dépôt-gabarit forké et monté par fusion amont, qui produit des conflits à résoudre
    client par client dès la première personnalisation, c'est-à-dire précisément le code
    divergent que le Brief interdit.

12. **Stratégie de test à trois étages, portail bloquant sur le code nouveau.** Retenue
    parce que les promesses centrales du produit — `SC-011`, `SC-012`, `SC-014` — ne se
    vérifient par aucun test unitaire : ce sont des procédures qu'on exécute et dont la
    sortie est une pièce datée. Le portail porte sur le code nouveau pour qu'un seuil global
    ne puisse pas se dégrader sans que rien ne refuse. *Alternative écartée* : les parcours
    de bout en bout seuls, trop grossiers pour localiser un défaut dans un code que personne
    ne relit ligne à ligne.
