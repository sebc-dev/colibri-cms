# Socle de livraison — ce qui doit être vrai de chaque site livré

**Version 1.0 · 5 août 2026**

> **Ce que ce document est.** La traduction opérationnelle du seul territoire que l'audit
> concurrentiel a trouvé libre — *le site continue quand vous arrêtez de payer* — en propriétés
> **vérifiables**, et non en promesses.
>
> **Il a deux lecteurs.** Le **client**, à qui il fournit le clausier du §4. Et le **CMS**, à qui il
> fournit des contraintes de développement testables (§5). Les deux sortent des mêmes invariants :
> si le code s'en écarte, la clause devient fausse.

> ✅ **Revalidé le 2026-08-10 par la phase Stack.** Le bandeau qui précédait marquait comme
> périmée toute mention de D1, de Worker, de dépôt Git ou d'un système de build : ces mentions
> ont été confrontées aux arbitrages de [`docs/stack.md`](./stack.md) et corrigées ici — § 3
> (topologie), § 5 (`C6`), annexe A et sa réserve 1. `C1`, `C8` et le § 6 sont **confirmés
> sans retouche** : D1 porte bien les brouillons, l'état publié et le compteur de demandes.
>
> **Une correction touche le clausier.** Le § 4.1 écrit que les limites du plan gratuit « se
> traduisent […] par un refus temporaire ». C'est vrai et sourcé pour les fichiers, les
> requêtes et le stockage ; ça ne l'est **pas** pour les quotas de build, dont le comportement
> au dépassement n'est documenté d'aucun côté. À porter à la relecture juridique (§ « Ce qui
> reste ouvert », n° 5).

---

## 1. Pourquoi ce document existe

L'audit d'expérience concurrentielle a passé quinze sites au crible et n'a trouvé qu'un seul terrain
non occupé :

> *Même prix. Même périmètre écrit. Mais quand vous arrêtez de payer, le site reste.*

Le concurrent le plus proche de notre offre écrit son périmètre avec rigueur, à 49 € HT par mois, sur
notre cible mot pour mot — **et le client perd son site à la résiliation.**

Ce territoire ne se tient pas par un argument. **Il se tient par une topologie de déploiement**, et
il tombe au premier objet qui vit ailleurs que chez le client. D'où ce document : il énumère les
objets, leur détenteur, et la façon de le prouver.

**Le test unique dont tout le reste découle :**

> **Si Isometria disparaît demain, que reste-t-il au client ?**

---

## 2. Les six invariants

Chacun s'énonce, se vérifie, et contraint le code. Un invariant qu'on ne peut pas vérifier est une
promesse, donc il ne compte pas.

### I1 — Aucun objet nécessaire au site ne vit hors des comptes du client

**Vérification.** La table du §3 est complète et chaque ligne porte le nom du client.

**Conséquence pour le CMS.** Rien ne s'exécute sur une infrastructure Isometria : ni file d'attente,
ni service de build, ni stockage, ni fonction. Le CMS est **déployé chez le client**, pas offert
comme service.

### I2 — Le contenu existe à tout moment en clair, hors base

Une base SQLite managée est *accessible* ; elle n'est pas *portable*. Sans copie en clair, le client
peut lire ses données mais ne peut pas partir avec.

**Vérification.** À tout instant, le dépôt du client contient le contenu publié en fichiers texte
(Markdown ou JSON), daté du dernier commit.

**Conséquence pour le CMS.** À la publication, le CMS écrit dans D1 **et** commite le contenu en
clair dans le dépôt. Voir C1 et C2.

### I3 — Le site se reconstruit sans Isometria et sans le CMS

C'est l'invariant qui transforme la réversibilité en fait exécutable.

**Vérification.** Un développeur tiers, avec le seul dépôt et sans aucun accès Cloudflare, obtient le
site complet par une commande de build documentée. **Ça se teste, donc ça se prouve.**

**Conséquence pour le CMS.** Le build doit disposer d'un mode qui lit **les fichiers plats** et non
D1. Voir C6.

### I4 — Aucun secret propre à Isometria n'est nécessaire au fonctionnement

Une clé d'API, un jeton, un compte de service au nom du studio est une dépendance invisible : elle ne
se voit pas dans la topologie et elle casse tout le jour où on la révoque.

**Vérification.** L'inventaire des variables d'environnement et des liaisons du déploiement ne
contient aucun identifiant appartenant à Isometria.

**Conséquence pour le CMS.** Tout secret est créé dans le compte du client, au nom du client. Si un
service tiers est nécessaire (envoi d'e-mail du formulaire, par exemple), **le compte est ouvert au
nom du client**, jamais mutualisé.

### I5 — Aucun prélèvement n'est possible sans un acte du client

**Ce qui rend le prélèvement impossible n'est pas le plan gratuit, c'est l'absence de moyen de
paiement enregistré.** Toutes les limites gratuites de Cloudflare sont des murs — erreur ou refus de
service — et non des compteurs facturés. Mais le compte appartient au client : **il peut enregistrer
une carte lui-même**, sans nous prévenir.

**Vérification.** Aucun moyen de paiement sur le compte, aucun abonnement payant souscrit.

**Conséquence pour la rédaction.** La gratuité s'écrit en **condition**, jamais en promesse
unilatérale. Voir §4.1.

### I6 — Le retrait des accès d'Isometria ne dégrade rien

**Vérification.** Après révocation, le site est servi, le CMS s'ouvre, une publication aboutit.

**Conséquence pour le CMS.** Aucune tâche planifiée, aucun renouvellement, aucune surveillance
hébergée côté Isometria ne conditionne le fonctionnement. Ce qui relève du carnet doit être
**additif**, jamais vital.

---

## 3. La topologie

| Objet | Où il vit | Au nom de | Pièce qui le prouve |
|---|---|---|---|
| Nom de domaine | Registrar tiers (OVH) | **Client** | Facture du registrar |
| Compte Cloudflare | Cloudflare | **Client**, seul Super Administrateur | **Facture à 0 €**, émise même en plan gratuit |
| Site statique servi **et** CMS — un seul Worker | Cloudflare, compte client | Client | — |
| Base D1 — brouillons, état publié, demandes | Cloudflare, compte client | Client | — |
| Durable Object — compteur anti-abus | Cloudflare, compte client | Client | — |
| Exécution du build (*Workers Builds*) | Infrastructure de build Cloudflare, compte client | Client | Journal des déploiements |
| **Dépôt Git** — code + contenu en clair (branche `main`) et médias (branche orpheline `media`) | GitHub | **Client**, Isometria collaborateur | Propriété du dépôt |
| Accès d'Isometria | Membre Administrateur Cloudflare + collaborateur du dépôt | Révocable par le client à tout moment | — |

**Le point à ne pas rater : le dépôt.** Le système de build Cloudflare construit depuis un dépôt Git.
C'est le seul objet de la chaîne qui vit hors du compte Cloudflare — et donc le seul endroit où la
propriété peut silencieusement basculer du mauvais côté. **Le dépôt est ouvert au nom du client.**
C'est gratuit, et ça rend la phrase uniforme au lieu d'avoir une exception à expliquer.

**Activer les factures à 0 € dès l'ouverture du compte** (préférences de facturation), sans quoi la
trace n'existe qu'à la demande.

---

## 4. Le clausier

> **Projet de clauses, à faire relire avant tout usage contractuel.** Elles sont écrites pour être
> comprises par le client, pas pour impressionner : c'est le territoire B — *ce qui est inclus, ce
> qui ne l'est pas*.
>
> **Règle de rédaction : aucune valeur chiffrée de plateforme dans le corps du contrat.** Les paliers
> gratuits de Cloudflare ont déjà bougé plusieurs fois ; un contrat qui cite un nombre de fichiers
> devient faux le jour où ce nombre change. **Le corps porte le mécanisme, l'annexe datée porte les
> valeurs**, et l'annexe se révise sans rouvrir le contrat.

### 4.1 Hébergement et coût

> Votre site est hébergé sur **votre propre compte Cloudflare**, ouvert à votre nom. Il fonctionne
> dans les limites du plan gratuit, dont les valeurs en vigueur figurent en **annexe A**, datée.
>
> **Tant qu'aucun moyen de paiement n'est enregistré sur votre compte et qu'aucun abonnement payant
> n'y est souscrit, aucun prélèvement n'est possible.** Les limites du plan gratuit ne se traduisent
> jamais par une facturation : elles se traduisent par un refus temporaire — une publication
> refusée, ou une requête en erreur jusqu'à la remise à zéro. **Le site déjà en ligne continue
> d'être servi.**
>
> Si l'usage de votre site devait durablement dépasser ces limites, deux voies existent :
> l'optimisation, ou le passage à une offre payante. **Aucune des deux n'est engagée sans votre
> accord écrit**, et la seconde est facturée par la plateforme directement à votre compte.
>
> Le nom de domaine est acheté et renouvelé **à votre nom**, chez un prestataire tiers. Il vous est
> facturé directement. C'est la seule dépense certaine liée à votre site.

### 4.2 Propriété et accès

> Tout ce qui fait votre site — le nom de domaine, le compte d'hébergement, la base qui contient vos
> contenus, l'outil d'édition et le dépôt du code — **est ouvert à votre nom et vous appartient**.
>
> Isometria n'y dispose que d'**accès**, en qualité de membre ou de collaborateur. **Vous pouvez les
> retirer à tout moment**, sans préavis et sans motif, depuis vos comptes. Vous restez seul
> administrateur principal.
>
> Aucun identifiant, aucune clé et aucun compte appartenant à Isometria n'est nécessaire au
> fonctionnement de votre site.

### 4.3 Ce qui continue, et pendant combien de temps

Deux garanties de durées différentes, qu'il ne faut pas confondre en une seule.

> **Votre site restera en ligne sans limite de durée.** Il est constitué de fichiers servis
> directement ; il ne dépend d'aucun programme qui doive être entretenu pour continuer de
> fonctionner.
>
> **Votre outil d'édition restera à votre disposition dans sa version du jour de notre séparation.**
> Il cessera d'être mis à jour. Comme tout logiciel qui n'est plus entretenu, il finira par ne plus
> fonctionner le jour où la plateforme sur laquelle il repose aura suffisamment évolué — cela peut
> prendre plusieurs années, et **je ne peux pas vous garantir de date**.
>
> **Ce que cette échéance ne touche pas : vos contenus.** Ils sont déposés en clair, en fichiers
> lisibles, dans votre dépôt, à chaque publication. Ils restent exploitables par n'importe quel
> professionnel, avec ou sans l'outil.
>
> **Le sort des demandes de devis reçues.** Leur historique reste consultable dans votre outil
> d'édition tant qu'il fonctionne ; il n'est pas couvert par la garantie de contenu en clair
> ci-dessus. Chaque demande vous parvient aussi par e-mail, dans votre boîte, dès sa réception.

### 4.4 Sortie

> À l'arrêt de nos relations, il n'y a **rien à transférer** : tout est déjà chez vous. Ce qui se
> passe tient en trois gestes, et vous pouvez les faire seul.
>
> 1. Vous retirez mes accès à votre compte d'hébergement et à votre dépôt.
> 2. Votre site continue d'être servi, à l'identique.
> 3. Vous conservez l'outil d'édition, dans les termes de l'article précédent.
>
> **Aucune donnée n'est effacée, aucun service n'est désactivé, aucune indemnité n'est due.**

### 4.5 Référencement

> Votre site est construit sur les fondations qu'un site statique offre au référencement : des
> pages rapides, un HTML complet servi tel quel. **Aucune position dans les moteurs de recherche ni
> aucun volume de trafic n'est un livrable** : le classement dépend de facteurs extérieurs au site.
> Toute prestation de référencement fait l'objet d'une offre distincte.

---

## 5. Les contraintes de développement du CMS

Chacune découle d'un invariant. **Elles sont testables** : ce sont des critères de recette, pas des
intentions.

| # | Contrainte | Invariant | Comment on la vérifie |
|---|---|---|---|
| **C1** | À la publication, le CMS écrit le contenu dans D1 **et** le commite en **fichiers plats** (Markdown ou JSON) dans le dépôt du client | I2 | Après une publication, le dépôt contient le contenu en clair, daté du commit |
| **C2** | **Le commit est le déclencheur du build.** Un seul mécanisme : la copie portable et le déclencheur sont le même geste, donc l'export ne peut jamais être périmé | I2 | Aucun autre chemin de déclenchement n'existe |
| **C3** | **Le build ne commite jamais.** Le dump vient du CMS, pas du build — un build qui écrit dans son propre dépôt boucle | I2 | Aucune écriture Git depuis l'étape de build |
| **C4** | **Anti-rebond des publications.** La concurrence de build est de 1 : une rafale d'enregistrements doit produire un build, pas dix | I5 | Dix enregistrements en deux minutes → un seul déploiement |
| **C5** | **Garde-fou sur le nombre de fichiers.** Le build compte les fichiers produits et **alerte au-delà du seuil d'annexe A**. C'est la seule limite qui morde en premier, et elle se mesure localement | I5 | Un build artificiellement gonflé déclenche l'alerte |
| **C6** | **Mode de build « depuis les fichiers plats »**, sans D1 et sans accès Cloudflare, documenté dans le `README` du dépôt. Le contenu vit sur `main`, les médias sur la branche orpheline `media` : la procédure récupère **les deux** | I3 | **Un clone, deux branches** → le site complet, médias compris |
| **C7** | **Aucun secret Isometria** dans les variables d'environnement ni dans les liaisons du déploiement | I4 | Inventaire au moment de la recette |
| **C8** | **Le compteur de demandes vit dans D1**, dans le compte du client — jamais dans un service d'analytique tiers | I1, §6 | La table existe et se lit sans quitter le compte |
| **C9** | **Rien n'exige un moyen de paiement.** Aucun service payant, aucun essai qui bascule automatiquement | I5 | Le compte reste sans moyen de paiement à la livraison |
| **C10** | **Rien de vital côté Isometria** : ni tâche planifiée, ni surveillance, ni renouvellement automatique dont l'arrêt casserait le site | I6 | Après révocation des accès, une publication aboutit encore |

### L'épreuve de réversibilité

C6 mérite d'être exécutée, pas seulement écrite. **Une fois à la livraison, puis une fois par an :**
cloner le dépôt dans un environnement neuf — **`main` et `media`** —, sans aucun accès, lancer le
build, comparer le résultat au site en ligne. **La sortie de la commande est une pièce** — c'est la
démonstration de la réversibilité, datée, et personne dans la catégorie ne peut la produire.

C'est aussi, le cas échéant, un artefact que le carnet peut livrer une fois par an, à côté du relevé
mensuel. **À arbitrer quand le périmètre du carnet sera écrit — ce n'est pas décidé ici.**

---

## 6. Ce que le relevé mesure, et pourquoi pas les indicateurs de la plateforme

Le récurrent se justifie par le compte, pas par l'assurance contre la panne (D9). Il faut donc
mesurer **ce que le site produit**, et il y a une raison factuelle de ne pas s'appuyer sur
l'analytique de la plateforme.

**Cloudflare Web Analytics ne peut pas porter un relevé mensuel :**

- la résolution pleine ne couvre que **7 jours**, au-delà les données sont agrégées et échantillonnées ;
- il n'accepte **aucun événement personnalisé** — une demande de devis n'y est donc pas comptable ;
- le mouchard est bloqué par une partie des navigateurs, ce qui sous-estime le trafic ;
- et surtout, **ces indicateurs sont déjà dans le compte du client** : les facturer reviendrait à
  vendre l'accès à ce qu'il possède, c'est-à-dire le mécanisme même contre lequel on se positionne.

> **Le minimum viable, c'est le compteur de demandes qualifiées, dans D1.**
>
> Une table par demande — horodatage, contenu du formulaire, page d'origine — et **un champ de suite
> que le client renseigne lui-même** : sans suite, devis envoyé, commande. Deux nombres en sortent :
> ce que le site a apporté, et ce que ça a donné.
>
> C'est ça, le compte. Aucun concurrent ne peut le produire, **parce qu'aucun ne pose la question**.

Les indicateurs Cloudflare restent une garniture gratuite. **Ce qui se vend, c'est la lecture** — le
travail de dire s'il faut changer quelque chose, y compris quand la réponse est non — **pas
l'accès.**

---

## 7. La recette de livraison

À passer avant la mise en ligne. Chaque ligne est vérifiable ; aucune ne se déclare acquise.

**Propriété**

- [ ] Compte Cloudflare ouvert au nom du client, client Super Administrateur
- [ ] Nom de domaine acheté et renouvelé au nom du client
- [ ] Renouvellement du domaine assuré sans intervention d'Isometria : renouvellement automatique
      activé chez le registrar avec un moyen de paiement du client (acte du client — compatible I5,
      c'est la seule dépense certaine du §4.1), ou renouvellement pluriannuel réglé d'avance ;
      échéance notée au dossier d'instance
- [ ] **Dépôt Git ouvert au nom du client**, Isometria collaborateur
- [ ] Isometria n'est qu'Administrateur / collaborateur, nulle part propriétaire
- [ ] **Envoi des factures à 0 € activé** dans les préférences de facturation
- [ ] Dossier d'instance déposé dans un espace appartenant au client, atteignable par lui sans
      Isometria — emplacement montré au client à la livraison

**Invariants**

- [ ] I3 exécuté : clone nu → build → site complet, **sortie de commande conservée**
- [ ] C7 : inventaire des secrets, aucun n'appartient à Isometria
- [ ] Jeton d'écriture GitHub créé **sans expiration**, portée fine sur le seul dépôt du site,
      permission `Contents: Read and write` **et rien d'autre**
- [ ] Jeton de lecture de la branche `media` pour le build : `Contents: Read-only`
- [ ] Maintien en vie du jeton d'écriture actif — GitHub retire un jeton resté un an sans
      usage, et `FR-101` exige qu'une publication aboutisse après retrait des accès d'Isometria
- [ ] C9 : aucun moyen de paiement sur le compte
- [ ] C10 : révocation d'essai des accès → publication encore possible

**Instrument**

- [ ] Compteur de demandes en place **avant la mise en ligne** — sinon le premier relevé n'a rien à
      relever, et le mois est perdu
- [ ] Champ de suite renseignable par le client
- [ ] C5 : garde-fou du nombre de fichiers actif, seuil pris en annexe A

**Contrat**

- [ ] Clauses du §4 relues et signées
- [ ] Annexe A datée, jointe
- [ ] Les quatre pièces collectées : facture du domaine, facture Cloudflare à 0 €, propriété du
      dépôt, sortie de l'épreuve de réversibilité

---

## Annexe A — Limites du plan gratuit Cloudflare

> **Relevé du 5 août 2026**, sources officielles Cloudflare. **Cette annexe se révise sans rouvrir le
> contrat** — et elle doit être revérifiée au moins une fois par an, les paliers ayant déjà changé
> plusieurs fois.

| Limite | Valeur | Période | Au dépassement |
|---|---|---|---|
| **Fichiers par version de Worker** | **20 000** | Par version | **Déploiement refusé.** Le site en ligne continue d'être servi |
| Taille d'un fichier | 25 Mio | Par fichier | Fichier refusé |
| Minutes de build (*Workers Builds*) | 3 000 | Mois | **Non documenté.** Un message produit rapporté en communauté annonce des builds en pause jusqu'à la remise à zéro — jamais une facturation. Voir réserve 1 |
| Builds simultanés | 1 | — | Mise en file d'attente, sans erreur ni coût |
| Durée d'un build | 20 min | Par build | Build interrompu |
| D1 — lignes lues | 5 000 000 | Jour | Requêtes en erreur jusqu'à la remise à zéro |
| D1 — lignes écrites | 100 000 | Jour | Idem |
| D1 — stockage | 5 Go (compte) | Absolu | Blocage des insertions |
| Workers — requêtes | 100 000 | Jour | Erreur |
| Bande passante et requêtes des visiteurs | Illimitées | — | Encadré par les conditions de service |
| Membres en rôle Administrateur | Illimité | — | — |

**Sur le profil d'un site vitrine riche en photographies, aucune de ces limites n'est approchée :
la marge la plus faible est d'environ 4×.** La première à mordre en cas de croissance est le nombre
de fichiers par version — et ce nombre est **une décision de configuration, pas une propriété du
produit** : avec la configuration d'images retenue en Stack (`layout: 'constrained'`, breakpoints
`[640, 960, 1280]`, un seul format), une photographie produit **5 fichiers**, soit un plafond de
l'ordre de **4 000 photographies**. Une configuration plus généreuse le ferait tomber à moins de
1 000.

**Seuil d'alerte à câbler dans le build (C5) : 15 000 fichiers**, soit 75 % du plafond — atteint
vers 3 000 photographies dans la configuration retenue.

**Trois réserves à connaître, reprises de la recherche :**

1. Le comportement au dépassement des quotas de build sur le plan gratuit **n'est documenté d'aucun
   côté** — ni les 3 000 minutes de *Workers Builds*, ni les 500 déploiements de *Pages Build*. La
   seule preuve d'un mur (« Builds paused ») est un message produit rapporté en communauté. **Ne
   rien contractualiser dessus**, et ne pas lui prêter le « refus temporaire » que le § 4.1 énonce
   pour les autres limites. Ce plafond ne mord de toute façon pas au rythme de publication d'un
   site vitrine.
2. La « bande passante illimitée » n'est chiffrée nulle part ; elle est encadrée par les conditions
   de service (pas de vidéo, pas de proportion disproportionnée de contenu non-HTML). **Non
   chiffrable, donc non contractualisable en valeur.**
3. Le nombre de fichiers produits par photographie dépend de la configuration réelle du build —
   **et sa durée aussi.** Le build régénère les variantes d'images ; à la limite de conception
   de `C5` (15 000 fichiers, de l'ordre de 3 000 photographies), personne n'a compté ce que
   cela coûte face au mur des **20 minutes par build**, ni face aux 3 000 minutes/mois dont la
   réserve 1 dit que le dépassement n'est documenté nulle part. **Les deux sont à mesurer sur
   le premier déploiement réel** et à reporter ici. *(Élargi le 2026-08-11, traitement de
   `S-08` de l'audit de la stack.)*

---

## Ce qui reste ouvert

| # | Sujet | Où ça se tranche |
|---|---|---|
| 1 | **Le périmètre écrit du carnet**, dont le sort de l'épreuve annuelle de réversibilité (§5) | Décision d'exploitation, hors chaîne rampstack |
| 2 | ~~Le service d'envoi du formulaire~~ — **tranché** le 2026-08-10 : Cloudflare Email Routing, binding `send_email` vers l'adresse de destination vérifiée, gratuit sans carte | [`docs/stack.md`](./stack.md) |
| 3 | **La mesure réelle du nombre de fichiers par photographie**, à reporter en annexe A | Premier déploiement |
| 4 | ~~Choix du système de build~~ — **tranché** le 2026-08-10 : un Worker unique bâti par *Workers Builds*. La cible et le système de build ne font qu'un choix, la CI hébergée de Cloudflare étant couplée à la cible | [`docs/stack.md`](./stack.md) |
| 5 | **Relecture juridique du clausier §4**, dont le « refus temporaire » du § 4.1 appliqué aux quotas de build, qui n'est pas sourcé (voir réserve 1) | Avant la première signature |
| 6 | ~~Durée de vie du jeton d'écriture GitHub~~ — **tranché** le 2026-08-11, par mesure : un jeton à portée fine sur compte personnel peut n'avoir aucune expiration, et `Contents: Read and write` suffit à toute l'écriture de la publication. Reste le retrait après un an sans usage, couvert par un appel périodique depuis le compte de la cliente | [`docs/stack.md`](./stack.md) |
