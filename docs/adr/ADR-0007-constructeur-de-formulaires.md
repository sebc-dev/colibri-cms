---
id: ADR-0007
title: Constructeur de formulaires (générique, borné)
status: accepted
date: 2026-07-17
authors: [arborescence-digital]
scope: packages/core/form/, packages/db/form/, apps/admin/islands/, apps/admin/pages/api/
supersedes: []
superseded-by: null
depends-on: [ADR-0003, ADR-0004, ADR-0010]
---

# ADR-0007 — Constructeur de formulaires (générique, borné)

**Statut :** accepted — 2026-07-17 · *amendé le 2026-08-01 (suites de la revue du PRD, amendements (a) à (d) ; puis suites de l'audit de sécurité, amendement (e))*

> **Place dans la famille.** ADR-0007 est le premier ADR de *fonctionnalité* (les précédents cadrent le socle). Il consomme les seams d'ADR-0004 (`writeHandler` public, `sendMail`, `verifyTurnstile`, calcul de total pur), les briques d'ADR-0003 (Turnstile) et le cycle de publication d'ADR-0010.

---

> **Amendement 2026-08-01 — ce qui a changé.** La revue contradictoire du PRD a produit dix exigences qui touchent ce moteur, et **renversé un choix de fournisseur**. Cinq changements :
>
> 1. **Le serveur ne fait plus confiance au navigateur, sur la seule route d'écriture publique du produit.** La soumission est **validée contre la définition publiée** (FR-090) et le total est **recalculé** côté serveur (FR-091), prix utilisés mentionnés dans le message. Le total du navigateur devient un pur **confort d'affichage**. Motif : sans cela, le consentement était déclaratif, le contenu de l'e-mail était dicté par l'expéditeur, et le total venait du visiteur — 5 € annoncés pour une pièce à 500 €.
> 2. **Renversement : Resend remplace Cloudflare Email Routing.** L'alternative « Resend » avait été rejetée pour « dépendance tierce, gratuité moins sûre ». Vérification faite le 2026-08-01 : l'envoi sortant Cloudflare **n'atteint aucun destinataire quelconque sur l'offre gratuite** — seulement les adresses de destination vérifiées du compte. FR-095 (copie au visiteur) exige l'inverse. Le repli documenté devient donc le choix retenu. Le seam `sendMail` étant injectable (ADR-0004 §f), c'est un changement d'implémentation par défaut, pas d'architecture.
> 3. **Le devis devient exploitable jusqu'au bout** : `Reply-To` dirigé vers le visiteur (FR-061), **copie au visiteur** (FR-095), **message de test** déclenché par l'éditrice (FR-096), et **signalement à l'éditrice** d'un échec définitif d'acheminement (FR-094).
> 4. **La non-persistance est précisée, pas abandonnée** : FR-064 ne vaut plus que pour l'acheminement **réussi**. En cas d'échec, le message composé est retenu le temps de réessayer, puis effacé. Ni écran, ni liste, ni recherche — la « base de prospects » reste hors périmètre.
> 5. **L'anti-spam est contraint par FR-089** : aucun code tiers avant une action explicite du visiteur. Turnstile est conservé, mais son script n'est injecté qu'au **premier geste dans le formulaire**.

> **Amendement 2026-08-01 (b) — le renversement est annulé : retour à Cloudflare Email Service.** Décision humaine postérieure au point 2 ci-dessus, prise le même jour : **ne pas ajouter de dépendance hors écosystème**. Le point 2 est donc **caduc** — il est conservé tel quel, l'ADR étant immuable, mais ne décrit plus le choix en vigueur. Trois conséquences, dont l'une n'est pas un effet de bord mais une décision distincte :
>
> - **`FR-095` (copie au visiteur) est retiré de la v1** — *conséquence forcée*. Le visiteur est un destinataire quelconque, indisponible sur l'offre gratuite ; c'est exactement l'incompatibilité qui avait motivé le point 2, et l'arbitrage se règle maintenant dans l'autre sens. D18 perd le filet qu'il avait placé chez la seule personne qui *sait* avoir envoyé quelque chose : **une demande définitivement perdue redevient silencieuse pour le visiteur.** Ce qui reste contre ce mode d'échec : la rétention et le réessai (FR-064), le signalement à l'éditrice (FR-094), l'adresse de destination confirmée avant publication (FR-046) et le message de test (FR-096) — c'est-à-dire tout ce qui traite la cause la plus probable (une adresse erronée), mais plus rien qui rattrape une perte après coup. Report en post-V1.
> - **`FR-061` perd le `Reply-To` dirigé vers le visiteur** — *décision distincte, non forcée*. L'en-tête `Reply-To` est un simple champ du MIME composé, gratuit chez les deux fournisseurs : ce retrait est un choix de produit, pas une contrainte de plateforme. L'adresse du visiteur reste **dans le corps** du message (c'est une réponse de son formulaire) ; la cliente la recopie pour répondre. Le « dernier mètre » de SC-007 identifié en D15 est donc rouvert sciemment.
> - **Deux frictions disparaissent.** L'envoi vers une **adresse de destination vérifiée du compte** est gratuit **et hors quota** sur toutes les offres : le mur des 100 messages/jour n'existe plus, et avec lui la borne de 50 soumissions/jour. Une clé d'API de moins au coffre, un fournisseur de moins à provisionner par instance — et la question de flotte « un compte par client ou un domaine d'agence unique ? », qui bloquait ADR-0008, **s'éteint sans être tranchée**.
>
> En contrepartie, l'éditrice ne peut pas acheminer vers une adresse **arbitraire** : la destination doit être une adresse vérifiée du compte, et en ajouter une déclenche un courriel de vérification qu'elle doit confirmer. `FR-046`, amendé le même jour, porte déjà cette contrainte.

> **Amendement 2026-08-01 (c) — la corbeille de courrier non distribué.** Le retrait de `FR-095` laissait une demande définitivement perdue sans aucun rattrapage. Le filet est reconstitué **du côté de l'éditrice** : `FR-094` gagne son motif, et trois exigences nouvelles ouvrent la rétention qui existait déjà — `FR-097` (consulter), `FR-098` (relancer l'acheminement), `FR-099` (effacer).
>
> **Ce que ce n'est pas, et pourquoi la promesse tient.** `undelivered_submissions` (ex-`submission_retries`, renommée parce qu'elle n'est plus seulement une file de réessai) conserve le **message composé**, c'est-à-dire exactement ce qui aurait dû arriver dans la boîte de l'éditrice. L'afficher ne révèle donc **rien de plus que l'e-mail qu'elle n'a pas reçu** : ce n'est pas une base de prospects, c'est une **corbeille de courrier non distribué**. Quatre propriétés la distinguent d'un mini-CRM, et ce sont elles qu'il faut préserver à l'implémentation :
>
> 1. **Seuls les échecs y entrent.** Une soumission acheminée avec succès n'y figure jamais et n'y laisse aucune trace. Sur le chemin nominal, la corbeille est vide — c'est l'invariant à tester (ADR-0005).
> 2. **On n'en sort que pour disparaître** : livrée après relance, effacée par l'éditrice, ou expirée. Aucun statut « traité », donc aucun objet qui survit à son traitement.
> 3. **Aucune recherche, aucun filtre, aucun export, aucun tri.** Ce qui ferait d'une corbeille un fichier, c'est la capacité à l'interroger.
> 4. **L'expiration reste inconditionnelle** — elle ne dépend d'aucune action, et ne peut pas être repoussée.
>
> **Ce que cela coûte, écrit.** Le délai borné de `FR-064` n'est plus de l'ordre de la minute : il doit laisser à l'éditrice le temps de s'apercevoir de l'échec. Des données personnelles sont donc conservées plus longtemps, ce qui doit figurer dans la mention d'information — la question RGPD ouverte du PRD gagne un paramètre concret. C'est le prix, et il est délibéré.
>
> **Ce que cela rachète.** Sur le mode d'échec de loin le plus probable — une adresse de destination erronée — la demande n'est plus perdue : l'éditrice corrige l'adresse et relance, et la demande **arrive réellement**. Le rattrapage est meilleur que celui que `FR-095` offrait sur ce cas précis. Restent hors d'atteinte l'échec qu'elle ne regarde jamais, et le fait que **le visiteur, lui, ne saura toujours rien** — c'est désormais le seul trou, et la seule raison de rouvrir `FR-095`.

> **Amendement 2026-08-01 (d) — deux points que le document de suivi de la revue portait seul.**
> Ce document a été clos et supprimé ; ces deux éléments n'existaient nulle part ailleurs.
>
> **1. Où vit un formulaire — le défaut que `FR-086` referme.** `FR-049` disait que le site présente
> chaque formulaire publié **sans jamais dire où**. `FR-012` n'avait pas de type formulaire,
> `FR-009` interdit à l'éditrice de créer une page, et la gestion des adresses est hors périmètre :
> elle pouvait donc composer son devis, le publier, et il n'existait **aucun endroit du site où il
> puisse apparaître**. `SC-007` était inatteignable par construction. La résolution est le partage
> qui porte tout le produit — **le gabarit possède l'emplacement, l'éditrice désigne le contenu** :
> une **zone de type formulaire** (`FR-086`, déclarée au contrat de gabarit, cf. ADR-0004). Un même
> formulaire peut être désigné par **plusieurs** pages — le formulaire de contact réutilisé est le
> cas le plus banal — ce qui est exactement pourquoi ADR-0010 § 7 pose qu'une référence est un
> identifiant et jamais une copie.
>
> Deux options écartées, à ne pas rouvrir : *(a)* **une page auto-générée par formulaire** —
> contredit `FR-009` et rouvre la gestion des adresses, exclue ; *(b)* **l'intégrateur câble en dur
> quel formulaire va où** — `FR-040` (l'éditrice compose ses formulaires) perdrait son sens, et on
> restaurerait précisément la dépendance à l'agence que `SC-007` existe pour supprimer.
>
> **2. Bord tranché de `FR-090`/`FR-091` : la définition a changé pendant que le visiteur
> remplissait.** Le site public est statique et potentiellement en cache ; la définition `live` peut
> donc avoir changé entre le chargement de la page et l'envoi. La règle est **d'acheminer avec le
> total recalculé, sans rien signaler au visiteur** — et non de rejeter la soumission. Motif :
> refuser la demande d'un prospect parce que la cliente a retouché un prix trois minutes plus tôt
> serait absurde, et coûterait exactement ce que `SC-007` mesure. La validation de `FR-090` reste
> stricte sur ce qui est vérifiable (champs existants, types, obligatoires, bornes, consentement) ;
> c'est **l'écart de prix** qui est absorbé en silence, pas un champ devenu invalide.

> **Amendement 2026-08-01 (e) — le chemin de soumission.** Suites de l'[audit de sécurité du
> 1<sup>er</sup> août 2026](../audit-securite-2026-08-01.md) (lot L5). La racine est
> [ADR-0011](./ADR-0011-frontieres-de-contenu-hostile.md), qui tient l'entrée (schéma), le rendu
> (contexte déclaré) et le transport (en-têtes) ; son § 6 renvoie ici **le chemin de soumission**
> — bornes, journaux, et tout ce qui n'appartient qu'à cette surface. ADR-0004 (c) point 6 a
> remonté `FR-090`/`FR-091` dans la tête du pipeline
> (`writeHandler({auth:'public', against:'live-form-definition'})`) ; le présent amendement
> **achève de décrire cette tête**, puis suit le message jusqu'à la boîte de l'éditrice.
>
> Le corpus disait *qui* protège cette route (Turnstile), *contre quoi* elle valide (la définition
> `state='live'`) et *où* ces deux règles vivent. Il ne disait nulle part comment le message est
> **composé**, ce que la corbeille **rend**, ce qui **borne** une valeur, qui **exécute** une
> expiration, à qui le message **part** réellement, ni si un formulaire **retiré du site** accepte
> encore des demandes. Neuf points, plus un renoncement. Ils ferment `B-03`, `B-04`, `B-08`,
> `B-09`, `B-11`, `C-05`, `C-06`, `C-08`, `C-09`, `C-14`, `D-10`, et le résiduel de `C-11`.
>
> **1. Le message est composé, pas concaténé** *(B-04)*. Le corpus prescrivait avec soin *ce que*
> le message contient et *à qui* il va, jamais **comment** il est composé — ni sujet, ni format,
> ni traitement des retours chariot. Trois règles :
> - **Sujet constant**, au plus complété par le **titre du formulaire**. Le réflexe naturel
>   (« Nouvelle demande de {nom} ») est exactement ce qui est interdit : le titre est une donnée
>   d'**éditrice**, le nom une donnée de **visiteur**, et seule la première a franchi une surface
>   authentifiée.
> - **Corps en texte brut en v1.** Le message n'a aucun besoin de mise en forme, et ce choix ferme
>   d'un seul coup le lien piégé, le contenu déguisé en message système visant l'administratrice
>   du site, et le réaffichage hostile du point 2. C'est le contexte de rendu `text` d'ADR-0011 § 3
>   — « la valeur est du texte, point » — instancié sur cette surface.
> - **Rejet à l'entrée de tout caractère de contrôle** dans un champ mono-ligne (`text`, `email`,
>   `phone`, et les libellés). Une valeur porteuse de `\r\n` injecte des en-têtes arbitraires
>   (`Bcc:`, `Reply-To:`) selon la composition MIME. Le rejet vit dans le **schéma d'entrée**, pas
>   dans le compositeur : la même règle qu'ADR-0011 § 1 — la neutralisation est une propriété de
>   l'entrée, jamais de l'étage qui restitue.
>
> **INTERDIT, en toutes lettres** : composer un en-tête d'e-mail à partir d'une valeur fournie par
> le visiteur. Aucune exception, y compris pour un sujet « plus utile ».
>
> **2. La corbeille est du texte, et son expiration a un exécuteur** *(B-03, C-09)*. L'amendement
> (c) argumentait la frontière *produit* — la corbeille ne révèle rien de plus que l'e-mail non
> reçu — en raisonnant sur le contenu **informationnel** du message, pas sur son contenu **actif**.
> `FR-097` crée pourtant une surface neuve : du contenu **100 % contrôlé par un visiteur anonyme**,
> rendu dans l'origine authentifiée de l'admin, et **ouvert par le geste de remédiation lui-même**
> — l'éditrice va voir la corbeille précisément *parce que* quelque chose a échoué, donc le taux de
> déclenchement est élevé. Le contenu d'une demande non acheminée est donc **affiché comme texte,
> jamais interprété** ; le corps en texte brut du point 1 rend la règle triviale à tenir.
>
> Deux manques distincts du même constat, tranchés ici :
> - **Le délai devient normatif : 30 jours.** `stack.md` en faisait un « paramètre à fixer, défaut
>   proposé » alors que le PRD exige qu'il soit *écrit* et annoncé (`FR-105`) ; un défaut proposé
>   n'est ni annonçable ni testable. La valeur est celle que `stack.md` proposait — la conserver
>   plus longtemps n'apporte rien, moins longtemps rend le geste de `FR-098` inutile.
> - **La purge a un exécuteur nommé** : le **Cron Trigger idempotent** d'ADR-0003 (a), qui porte
>   déjà le suivi de build et la boucle de réconciliation, gagne un troisième travail — supprimer
>   les lignes échues. Par **suppression effective** (`DELETE`), jamais par une lecture filtrée :
>   une expiration « inconditionnelle » implémentée en filtre laisse la ligne de données
>   personnelles vivante en base, et l'invariant serait faux tout en paraissant tenu. C'est le
>   même piège que la cible de test intermittente d'ADR-0010 (c) point 4.
>
> *Note de périmètre* : ADR-0003 n'est **pas** amendé pour autant — un ADR de fonctionnalité peut
> charger le Cron d'un travail sans rouvrir le socle qui le déclare. Et le troisième volet de
> `C-09` — l'**accès direct D1 de l'agence** aux données personnelles de production — n'appartient
> pas à cette route : il reste à ADR-0008 (lot L8), avec les sauvegardes de `C-10`.
>
> **3. Ce qui entre est borné** *(B-08)*. `FR-045` bornait la **valeur** d'un champ nombre, pour la
> justesse du total ; rien ne bornait la **taille** de quoi que ce soit d'autre. Une soumission de
> plusieurs mégaoctets dans un `textarea` est validée, son total recalculé, son message composé —
> puis soit acheminée (la limite de plateforme est de 25 Mio, largement de quoi rendre la boîte de
> l'éditrice inutilisable), soit mise en échec, où elle s'installe trente jours en D1 sur un quota
> gratuit. Répétée, c'est un déni de service sur la base, dont le geste de remédiation lui-même
> (`FR-097`) exige de charger les lignes. Donc, longueur maximale **par type de champ** :
>
> | Type | Borne | Motif |
> |---|---|---|
> | `text` | 200 caractères | un libellé de réponse, pas un texte |
> | `email` | 254 caractères | maximum d'une adresse (RFC 5321) |
> | `phone` | 32 caractères | indicatif international compris |
> | `textarea` | 5 000 caractères | le champ « votre demande » d'un devis |
> | `select_single` / `select_multi` | clés existantes, au plus le nombre d'options du champ | une clé inconnue **rejette**, elle n'est pas ignorée |
> | `date` | forme `YYYY-MM-DD` stricte | |
> | `number` | bornes de `FR-045` | inchangé |
> | `consent` | booléen | |
>
> Plus une **taille maximale de corps de requête : 64 Kio**, vérifiée avant toute analyse. Ces
> bornes sont portées par le schéma **dérivé de la définition `live`**, donc appliquées **dans la
> tête du pipeline** (ADR-0004 (c) point 6) et jamais dans `run` : elles tombent du même côté que
> `FR-090` parce qu'elles sont la même règle — ne rien croire de ce qui arrive.
>
> **4. Ce qui est composé est borné aussi** *(C-14)*. Trois trous distincts, dont un est une
> **contradiction interne du corpus** :
> - **`price_delta` n'a aucune contrainte de signe** dans le DDL, alors que le § Décision point 3
>   énonce « un champ à prix ne peut jamais faire *baisser* le total ». L'invariant était garanti
>   pour le champ `number` (minimum borné à 0) et **pas** pour les options d'un choix. Donc
>   `CHECK (price_delta >= 0)` — et c'est le DDL qui a tort, pas l'ADR.
> - **`max_value × unit_price` peut déborder.** Un total faux, éventuellement négatif, traverserait
>   le recalcul de `FR-091` et arriverait dans le message comme **le montant qui fait foi** —
>   c'est-à-dire la chose exacte que l'amendement (a) existe pour empêcher, obtenue par un autre
>   chemin. Plafonds retenus (centimes entiers) : `max_value` ≤ 10 000, `unit_price` ≤ 1 000 000
>   (10 000 €), `price_delta` ∈ [0, 1 000 000]. Pire produit : 10⁴ × 10⁶ = 10¹⁰, soit 5 × 10¹¹
>   sommé sur un formulaire plein — cinq ordres de grandeur sous `Number.MAX_SAFE_INTEGER`
>   (≈ 9 × 10¹⁵). La marge est écrite pour qu'on n'ait pas à la recalculer.
> - **Bornes de composition d'une définition** — 50 champs par formulaire, 50 options par champ,
>   libellés et titre ≤ 120 caractères. Cette définition est **bâtie dans le site** et **relue à
>   chaque soumission** : non bornée, elle est un vecteur des deux côtés.
>
> Et un **plafond absolu du total** : 100 000 000 centimes (1 000 000 €). Un dépassement fait
> **échouer la soumission** ; **INTERDIT** de tronquer, de saturer ou d'acheminer un montant
> approché — un devis refusé se voit, un devis faux ne se voit pas.
>
> **5. Turnstile n'est pas une limite de débit** *(B-09)*. Il élève le coût unitaire d'une
> soumission automatisée sans le porter à l'infini ; un solveur commercial permet des centaines de
> soumissions valides, chacune produisant un e-mail hors quota vers la boîte de la cliente — et la
> corbeille, volontairement dépourvue de recherche et de tri, ne peut même pas servir de témoin.
> Pire, l'amendement (b) a présenté comme un *bénéfice* la disparition de « la borne de 50
> soumissions/jour », qui était involontairement **le seul limiteur de volume du système**. Il est
> ici remplacé, en deux étages indépendants :
> - **une règle de limitation de débit en périphérie** (WAF Cloudflare, disponible sur l'offre
>   gratuite), en **amont** du Worker : elle absorbe un flood **sans consommer d'invocation**, ce
>   qui est le seul étage capable de protéger le quota de requêtes partagé entre l'admin, le Cron
>   et l'endpoint public ;
> - **un compteur KV par formulaire et fenêtre glissante**, dans le Worker : c'est lui qui tient
>   `FR-102`, dont la borne est « par formulaire » — une règle de périphérie borne un chemin ou une
>   adresse IP, elle ne connaît pas `form_id`. Plafond configurable au provisionnement.
>
> Aucun des deux ne rattrape le défaut de l'autre (ADR-0011 § 1) : le premier protège la
> plateforme, le second protège la boîte de l'éditrice.
>
> Deux points connexes du même constat, qui ne sont pas du débit mais de la **vérification** :
> - **le `hostname` de la réponse `siteverify` est contrôlé** contre l'hôte de l'instance. Sans
>   cela, un jeton obtenu sur un autre site du même compte Cloudflare est rejouable — et la flotte
>   partageant un compte *est* une topologie envisagée par ADR-0008 ;
> - **`siteverify` injoignable refuse la soumission** (*fail-closed*). Même geste que
>   `verifyAccessJwt` en ADR-0004 (c) point 5 : une vérification qu'on ne peut pas faire n'est pas
>   une vérification qui passe.
>
> **6. Le destinataire n'est ni dans le site, ni dans le geste** *(B-11, C-06)*. Deux manières
> différentes de perdre la garantie que l'amendement (b) tenait pour acquise — « un seul message,
> vers une adresse de destination vérifiée du compte ».
> - **La définition bâtie dans le site est une projection publique**, **sans** `recipient_email` ni
>   aucune donnée de destination. `form_defs` porte l'adresse personnelle ou professionnelle de la
>   cliente ; embarquée telle quelle dans les assets, elle est publiée en clair sur un site statique
>   — collecte triviale par robots, alors même que Turnstile protège soigneusement l'endpoint. Le
>   rendu et le calcul navigateur n'ont besoin que des **champs, choix et prix** : l'adresse n'est
>   **résolue que côté serveur**, à l'acheminement.
> - **L'appartenance à `verified_recipients` est vérifiée à chaque acheminement, relance comprise.**
>   `FR-046` en faisait une condition **de publication**, pas d'**envoi** : une adresse retirée de
>   `verified_recipients` après publication continuait de recevoir. Et `FR-098` ne disait pas
>   **quelle** adresse une relance utilise — si elle acceptait une adresse fournie au moment du
>   geste, la corbeille deviendrait un **relais de courrier vers une adresse arbitraire avec un
>   contenu contrôlé par un tiers**, ce qui est très exactement l'abus que le corpus se félicitait
>   d'avoir fermé par construction. Donc : l'adresse est **relue depuis `form_defs` en
>   `state='live'`** au moment de l'envoi, et **INTERDIT** qu'elle soit fournie par la requête du
>   geste — ni en relance, ni en message de test.
>
> **7. Un formulaire retiré du site n'accepte plus rien** *(C-05)*. ADR-0010 § 4 pose que dépublier
> **ne touche pas au contenu en ligne** : les lignes `state='live'` subsistent par conception. Or
> la validation est formulée « contre la définition `state='live'` » — critère qu'un formulaire
> dépublié satisfait **toujours**. Un formulaire retiré continuait donc d'accepter des soumissions
> forgées (l'adresse et les `field_key` sont connaissables depuis d'anciens caches, cas que
> l'amendement (d) reconnaît explicitement) et d'acheminer des e-mails — c'est-à-dire de
> **collecter des données personnelles par une surface que l'éditrice croit fermée**. La condition
> devient : définition `state='live'` **d'un formulaire dont `publications.en_ligne = 1`**, vérifiée
> **avant tout traitement**, sinon rejet. La promesse produit correspondante est `FR-112`.
>
> **8. La zone vidéo** *(C-08)*. Ce point n'est pas un point de formulaire, et il faut dire
> pourquoi il vit ici : ADR-0004 et ADR-0011 ont consommé leur amendement daté sur cette campagne,
> et ADR-0007 est le seul ADR de *fonctionnalité* qui porte déjà le motif dont il s'agit — une
> **liste fermée de fournisseurs** dont une **valeur d'éditrice** est interpolée. Trois défauts :
> - **`ref` est conforme à une expression rationnelle par fournisseur** — `^[A-Za-z0-9_-]{11}$`
>   pour YouTube, `^[0-9]{6,12}$` pour Vimeo. Non contrainte, elle permet une évasion d'attribut ou
>   une manipulation des paramètres d'embed, puisqu'elle est interpolée dans une URL d'iframe.
> - **L'URL d'embed est construite par le cœur, et jamais stockée.** Ce qui est stocké est le
>   couple `{ provider, ref }` ; l'adresse est fabriquée au rendu, à partir d'un gabarit en dur par
>   fournisseur. Une URL stockée serait une adresse d'origine tierce que le produit n'aurait plus
>   aucun moyen de valider. L'iframe porte `sandbox` et `referrerpolicy`.
> - **L'endpoint oEmbed est en dur par fournisseur, sans redirection hors domaine**, et la vignette
>   récupérée au build voit son **type réel et sa taille vérifiés avant écriture R2** — même règle
>   de signature d'octets qu'ADR-0011 § 4, parce que c'est le même problème : un fichier d'origine
>   tierce servi ensuite depuis **notre** domaine. Sans cela, la récupération est un SSRF léger et
>   la vignette un fichier arbitraire servi depuis notre origine.
>
> **9. Le motif d'échec est borné** *(résiduel de `C-11`)*. `FR-104` interdit les données
> personnelles dans les journaux techniques ; ADR-0011 § 6 renvoie ici le motif d'échec **conservé
> en base**, qui n'est pas un journal mais pose le même problème. Le `failure_reason` de
> `undelivered_submissions` retient donc un **code et une catégorie** — jamais la réponse brute du service
> d'envoi, qui peut porter l'adresse de destination ou un fragment de message. Le motif « sans
> terme technique » que lit l'éditrice (`FR-094`) se **dérive** du code : c'est une table de
> traduction du cœur, pas une chaîne recopiée. Corollaire : ce champ ne peut pas servir de journal
> de débogage, et c'est voulu.
>
> **Pour mémoire — un renoncement que le corpus n'avait pas écrit** *(D-10)*. L'amendement (d)
> point 2 tranche que l'écart de prix est **absorbé en silence**. La conséquence complète, jamais
> écrite : un visiteur peut avoir vu **5 €** quand l'éditrice reçoit **500 €**, sans qu'aucune des
> deux parties ne détienne de trace de ce qui a été affiché — `FR-095` (copie au visiteur) étant
> retirée de la v1, il ne reste aucun exemplaire côté visiteur. `FR-051` (total indicatif, non
> contractuel) est la parade, et elle **suffit** : rien de ce qui est affiché n'est opposable. Le
> renoncement est donc borné et assumé — il est écrit ici parce que ce corpus écrit ses
> renoncements, et que celui-ci était le seul de la revue à ne pas l'être.

---

## Contexte

Le PRD (FR-040 → FR-065, US6/US7) demande que la cliente **construise elle-même** ses formulaires — au premier chef un devis où le visiteur compose sa commande, obtient une **estimation indicative**, et l'envoie (SC-007). Le devis n'est pas un objet dédié : c'est **un formulaire** parmi d'autres (contact, réservation…), ce qui en fait une brique réutilisable côté agence.

Tension centrale, déjà arbitrée avec le porteur : construire un moteur générique pour un seul cas connu est le motif que la **règle de trois** (ADR-0004) proscrit — *sauf* quand le motif se répète réellement. Les **formulaires** se répètent d'un client à l'autre bien plus qu'un type de contenu. La décision optimise donc : **générique dans la structure, borné dans les capacités.**

Contrainte de forme héritée d'ADR-0004 : l'endpoint de soumission est la **première route d'écriture publique** (visiteur non authentifié).

---

## Décision

Un **moteur de formulaire générique** dont les capacités sont **strictement bornées au besoin réel** :

1. **Structure possédée par l'éditrice.** Elle compose un formulaire (ajoute, retire, réordonne des champs — FR-040/FR-041), fixe l'e-mail de destination (FR-046). C'est la **seule** surface où l'éditrice compose une structure ; l'entorse à « zones typées non restructurables » est assumée et bornée aux formulaires.
2. **Types de champ fixés** (FR-042) : texte court, e-mail, téléphone, zone de texte, choix unique, choix multiple, nombre, date, consentement. **Pas** de logique conditionnelle, **pas** de multi-étapes, **pas** d'upload (backlog).
3. **Champs à prix + total en somme simple.** Un choix (`select_*`) porte un montant ; un `number` porte un prix unitaire optionnel (FR-044, FR-045). Le total est une **somme des contributions**, calculée par **une seule** fonction pure de `@colibri/core` (ADR-0004 §c), appelée **deux fois** : côté navigateur pour l'affichage (FR-050) et côté serveur pour le montant qui fait foi (FR-091). **Pas de règle conditionnelle** (paliers, remises — backlog).
   *Bornes du champ nombre (FR-045)* : le **maximum est obligatoire** — un formulaire dont un champ nombre n'en porte pas ne peut pas être publié. Le minimum est facultatif et vaut **0** par défaut : un champ à prix ne peut jamais faire *baisser* le total. Motif : c'est le seul type dont la valeur entre dans un calcul, et rien ne refusait « 10 000 parts » ni « −5 ».
4. **Total indicatif, non contractuel** (FR-045/FR-051).
5. **Acheminement par e-mail, rétention transitoire au seul service du réessai.** À l'envoi : `writeHandler({auth:'public'})` → vérif **Turnstile** (FR-063) → Zod → **validation contre la définition publiée** (FR-090) → **recalcul du total** (FR-091) → **Cloudflare Email Service** : **un seul** message, vers l'adresse de destination vérifiée du formulaire (FR-061) — l'adresse du visiteur figure dans le corps, sans `Reply-To` *(amendement (b))* → confirmation au visiteur (FR-062). En cas d'échec, le message composé est retenu et réessayé, puis effacé à la livraison ou à l'échéance (FR-064) ; un échec définitif est signalé à l'éditrice **avec son motif** (FR-094), qui peut alors le **consulter** (FR-097), le **relancer** (FR-098) ou l'**effacer** (FR-099) — *amendement (c)*. **Aucune soumission acheminée n'est conservée ; aucune recherche, aucun filtre, aucun export, aucun statut « traité ».**
6. **Cycle brouillon/publication** comme les pages (FR-047), au sens d'**ADR-0010** : la définition `state='live'` est bâtie dans le site *et* sert de référence de validation serveur (FR-090, FR-091). Les champs sont désignés par une **clé naturelle stable** (`field_key`) — une soumission rapproche ses réponses par elle.
7. **RGPD par construction** : consentement explicite requis avant envoi (FR-060) **et vérifié côté serveur** (FR-090), collecte minimale et **non-conservation** (FR-065).
8. **Adresse de destination confirmée** (FR-046) : une adresse ne sert qu'une fois confirmée ; tant qu'elle ne l'est pas, le formulaire ne peut pas être publié. Le **message de test** (FR-096) est le geste par lequel l'éditrice le constate — parade v1 à la faute de frappe dans son propre domaine, qui produit une adresse bien formée que FR-048 ne peut pas détecter.
9. **Anti-spam sans code tiers au chargement** (FR-063 × FR-089) : le script Turnstile est injecté au **premier geste dans le formulaire**, puis rendu explicitement. Un geste dans le formulaire *est* une action explicite du visiteur ; SC-005, mesuré au chargement, n'est pas affecté.

Modèle de données : `forms` (identité) + `form_defs` + `form_fields` + `form_field_options`, tous porteurs du discriminant `state` d'ADR-0010, plus `verified_recipients` et `undelivered_submissions` (cf. stack.md). Montants en **centimes entiers** (jamais de flottant monétaire).

---

## Alternatives Considered
- **Formulaire de devis en dur, spécifique.** *Rejeté* : non réutilisable ; chaque futur formulaire (contact, réservation) redemanderait du code dédié.
- **Constructeur avec logique conditionnelle / multi-étapes / règles de prix.** *Rejeté* : abstraction en avance sur le besoin réel (un seul formulaire connu) — règle de trois. Reporté au backlog, activable quand un formulaire réel l'exige.
- ~~**Resend / MailChannels** pour l'envoi. *Rejeté* : dépendance tierce, gratuité moins sûre ; Email Routing reste dans l'écosystème Cloudflare (SC-001).~~ **→ Renversé le 2026-08-01.** Le repli est devenu le choix : l'envoi sortant Cloudflare ne permet d'écrire qu'aux **adresses de destination vérifiées du compte** sur l'offre gratuite ; atteindre un destinataire quelconque exige Workers Paid. FR-095 (copie au visiteur) et SC-001 (0 €/mois) ne pouvaient pas être vrais tous les deux avec ce fournisseur. **Resend** est retenu : 3 000 messages/mois et **100/jour** en gratuit, destinataires quelconques, un domaine vérifié. **→ Ce renversement est lui-même annulé le 2026-08-01 *(amendement (b))*** : la ligne ci-dessous redevient le choix en vigueur.
- ~~**Cloudflare Email Service, en renonçant à FR-095.** *Considéré et écarté le 2026-08-01* : préserverait l'écosystème et SC-001, mais retirerait le filet placé chez la **seule personne qui sait avoir envoyé quelque chose** — une demande perdue redeviendrait silencieuse pour le visiteur (cf. D18 de la revue).~~ **→ Retenu le 2026-08-01 *(amendement (b))*.** L'arbitrage est tranché dans l'autre sens : **aucune dépendance hors écosystème**, au prix explicite du filet de D18. Le coût est assumé et écrit, pas découvert.
- **Stockage des soumissions en base** (mini-CRM). *Rejeté* : hors périmètre v1 ; e-mail suffit pour une petite activité. *(À ne pas confondre avec la rétention transitoire de FR-064, qui n'expose aucune surface.)*
- ~~**Calcul du total côté serveur.** *Rejeté* : romprait la staticité du site public au-delà du strict nécessaire.~~ **→ Nuancé le 2026-08-01.** Le calcul **navigateur** reste, pour l'affichage à mesure des choix (FR-050) — la staticité des pages de contenu est intacte. Mais le total **acheminé** est recalculé côté serveur (FR-091), sur la route d'envoi, qui touchait déjà un runtime. Aucune staticité n'est perdue ; seule la confiance dans le chiffre du visiteur l'est.

---

## Conséquences
- **Positif** : une brique réutilisable sur toute la flotte ; le devis de la cliente en est la première instance ; staticité préservée hors envoi (SC-005) ; zéro persistance = zéro sujet de conservation de données.
- **Positif** : réutilise les seams d'ADR-0004 — aucun nouveau motif d'architecture.
- **Risque** : l'endpoint public est une cible d'abus → Turnstile obligatoire (FR-063) et testé (ADR-0005). Sans lui, l'e-mail de la cliente devient un canal de spam.
- **Aucun plafond de volume** *(amendement (b))* : l'envoi vers une adresse de destination **vérifiée du compte** est gratuit et **hors quota** sur toutes les offres. Limites annexes seulement : 50 destinataires par message, 5 Mio (25 Mio vers une destination vérifiée).
- **Aucune dépendance hors écosystème** *(amendement (b))* : rien de plus à provisionner par instance, aucune clé d'API tierce au coffre. Le seam `sendMail` reste injectable — c'est lui qui a rendu cet aller-retour de fournisseur gratuit en architecture.
- **Négatif, assumé** *(amendement (b), atténué par (c))* : un échec définitif d'acheminement est **silencieux pour le visiteur** (FR-095 retiré). L'éditrice, elle, en est informée avec son motif (FR-094) et peut **récupérer la demande** (FR-097 → FR-099) — mais seulement si elle regarde, et avant l'échéance. Ce qui reste irréductible : le visiteur ne saura jamais que rien n'est arrivé.
- **Négatif, assumé** *(amendement (c))* : des données personnelles sont conservées pendant un délai qui n'est plus de l'ordre de la minute, puisqu'il doit laisser à l'éditrice le temps de s'apercevoir de l'échec. À annoncer dans la mention d'information.
- **Négatif, choisi** *(amendement (b))* : répondre à un devis demande à la cliente de **recopier** l'adresse du visiteur depuis le corps du message (FR-061 sans `Reply-To`). Geste manuel sur le chemin que SC-007 mesure.

---

## Seuils qui feraient reconsidérer
- Si un formulaire réel exige de la logique conditionnelle ou des paliers de prix → sortir la capacité du backlog (ADR dédié ou amendement).
- Si le volume de soumissions ou le besoin de suivi grandit → reconsidérer la persistance (mini-CRM), en pesant le RGPD.
- Si Cloudflare ouvrait l'envoi vers un **destinataire quelconque** sur l'offre gratuite → rouvrir `FR-095` (copie au visiteur), qui n'attend que cela : c'est la seule chose qui manque au filet de D18.
- Si une demande réellement perdue en silence était constatée chez un client → reconsidérer `FR-095`, y compris au prix d'une dépendance ou d'une offre payante. C'est le seuil qui compte : le coût accepté ici est **théorique** tant qu'aucun cas réel n'est survenu.
- Si l'éditrice devait acheminer vers une adresse qu'elle ne contrôle pas (une boîte partagée d'un tiers, non vérifiable) → l'envoi vers destination vérifiée ne suffit plus ; reconsidérer le fournisseur.

---

## Constraints
> Compilées en hooks/CI (cf. ADR-0002, ADR-0006).
- **OBLIGATOIRE** : la route de soumission est un `writeHandler({auth:'public'})` avec vérification **Turnstile** avant tout traitement.
- **OBLIGATOIRE** : toute soumission est validée contre la définition `state='live'` du formulaire — champs existants, types, obligatoires, bornes, consentement (FR-090).
- **OBLIGATOIRE** : le total acheminé est **recalculé** côté serveur ; **INTERDIT** de reprendre un total venu de la requête du visiteur (FR-091).
- **OBLIGATOIRE** *(amendement (d))* : un écart entre la définition chargée par le visiteur et la définition `state='live'` au moment de l'envoi se résout par le **total recalculé** ; **INTERDIT** de rejeter la soumission pour ce seul motif (FR-090, FR-091).
- **INTERDIT** : conserver une soumission au-delà de son acheminement **réussi** — une demande livrée ne laisse aucune trace, et **INTERDIT** qu'elle entre dans la corbeille de FR-064.
- **OBLIGATOIRE** *(amendement (c))* : la rétention de FR-064 est bornée dans le temps, et son **expiration est inconditionnelle** — **INTERDIT** de la repousser, de la suspendre ou de la conditionner à une action.
- **INTERDIT** *(amendement (c))* : exposer sur la corbeille une recherche, un filtre, un tri, un export ou un statut « traité ». Une demande n'en sort que **livrée, effacée ou expirée** — consulter, relancer et effacer (FR-097 → FR-099) sont les seuls gestes offerts.
- **INTERDIT** : envoyer un vrai e-mail en test (mailer mocké — garde-fou free tier, ADR-0005).
- **OBLIGATOIRE** : refuser l'envoi tant qu'un champ obligatoire est vide (FR-052) ou qu'un consentement requis manque (FR-060) — **côté serveur**, pas seulement côté navigateur.
- **OBLIGATOIRE** : un champ `number` porte un **maximum** ; **INTERDIT** de publier un formulaire qui en manque (FR-045).
- **OBLIGATOIRE** : montants en centimes entiers ; total = somme pure (`@colibri/core`), jamais de flottant ni de règle conditionnelle en v1.
- **OBLIGATOIRE** : l'adresse de destination est **confirmée** avant que le formulaire puisse être publié (FR-046).
- **OBLIGATOIRE** *(amendement (b))* : une soumission produit **un seul** message, vers une **adresse de destination vérifiée du compte** ; **INTERDIT** d'envoyer à une adresse fournie par le visiteur (FR-095 est hors v1) ou de composer un `Reply-To` vers lui (FR-061).
- **INTERDIT** : charger le script anti-spam avant une action explicite du visiteur (FR-089).
- **INTERDIT** : introduire logique conditionnelle, multi-étapes ou upload sans ADR (backlog).
- **OBLIGATOIRE** *(2026-08-01)* : le sujet du message acheminé est **constant**, au plus complété par le titre du formulaire ; **INTERDIT** d'y faire entrer une valeur fournie par le visiteur.
- **OBLIGATOIRE** *(2026-08-01)* : le corps du message acheminé est en **texte brut** ; **INTERDIT** d'y composer du balisage en v1.
- **INTERDIT** *(2026-08-01)* : composer un **en-tête** d'e-mail à partir d'une valeur fournie par le visiteur, sans exception.
- **OBLIGATOIRE** *(2026-08-01)* : le schéma d'entrée **rejette** tout caractère de contrôle dans un champ mono-ligne (`text`, `email`, `phone`) et dans un libellé ; **INTERDIT** de les filtrer, de les échapper ou de les normaliser au moment de composer.
- **OBLIGATOIRE** *(2026-08-01)* : le contenu d'une demande non acheminée est affiché **comme texte** ; **INTERDIT** de l'interpréter, sur quelque surface de l'admin que ce soit.
- **OBLIGATOIRE** *(2026-08-01)* : l'expiration de `FR-064` est exécutée par le **Cron Trigger idempotent**, par **suppression effective** de la ligne ; **INTERDIT** de la réaliser par une lecture filtrée qui laisserait la ligne en base.
- **OBLIGATOIRE** *(2026-08-01)* : le schéma de soumission borne la **longueur de chaque valeur** selon le type de champ et la **taille totale du corps** de la requête ; ces bornes vivent dans la tête du pipeline (`against:'live-form-definition'`), **INTERDIT** de les laisser à `run`.
- **OBLIGATOIRE** *(2026-08-01)* : `price_delta >= 0` — un champ à prix ne peut jamais faire **baisser** le total, pour un choix comme pour un nombre.
- **OBLIGATOIRE** *(2026-08-01)* : `max_value`, `unit_price`, `price_delta`, le nombre de champs, le nombre d'options et la longueur des libellés sont **plafonnés** ; les plafonds sont choisis pour que tout produit intermédiaire reste très en deçà de `Number.MAX_SAFE_INTEGER`.
- **OBLIGATOIRE** *(2026-08-01)* : le total recalculé est vérifié contre un **plafond absolu** ; un dépassement fait **échouer la soumission** — **INTERDIT** de tronquer, de saturer ou d'acheminer un montant approché.
- **OBLIGATOIRE** *(2026-08-01)* : la route publique est protégée par une **limite de débit à deux étages** — une règle de périphérie en amont du Worker et un compteur par formulaire et fenêtre glissante (`FR-102`) ; **INTERDIT** de tenir la vérification anti-robot pour une limite de débit.
- **OBLIGATOIRE** *(2026-08-01)* : la vérification Turnstile contrôle le `hostname` de la réponse `siteverify` contre l'hôte de l'instance, et **refuse** quand `siteverify` est injoignable (*fail-closed*).
- **OBLIGATOIRE** *(2026-08-01)* : la définition de formulaire bâtie dans le site est une **projection sans `recipient_email`** ni aucune donnée de destination ; **INTERDIT** qu'une adresse de `form_defs` atteigne un asset public.
- **OBLIGATOIRE** *(2026-08-01)* : l'appartenance de l'adresse à `verified_recipients` est vérifiée **à chaque acheminement, relance comprise** ; l'adresse est **relue depuis `form_defs` en `state='live'`** et **INTERDIT** qu'elle soit fournie par la requête du geste.
- **OBLIGATOIRE** *(2026-08-01)* : une soumission n'est acceptée que si le formulaire visé porte `publications.en_ligne = 1` ; **INTERDIT** de tenir la seule existence de lignes `state='live'` pour un critère de publication (`FR-112`).
- **OBLIGATOIRE** *(2026-08-01)* : la `ref` d'une zone vidéo est validée par une **expression rationnelle propre au fournisseur**, et l'URL d'embed est **construite par le cœur** — **INTERDIT** de stocker une URL d'embed ou de la dériver d'une saisie ; l'iframe porte `sandbox` et `referrerpolicy`.
- **OBLIGATOIRE** *(2026-08-01)* : l'endpoint oEmbed est **en dur par fournisseur**, sans redirection hors domaine, et le type réel et la taille de la vignette sont vérifiés **avant** écriture R2 (ADR-0011 § 4).
- **OBLIGATOIRE** *(2026-08-01)* : `failure_reason` retient un **code et une catégorie** ; **INTERDIT** d'y écrire la réponse brute du service d'envoi, un fragment de message ou une donnée personnelle (`FR-104`).

## Related
- Consomme les seams de : ADR-0004 (`writeHandler` public, `sendMail`, `verifyTurnstile`, calcul de total pur) et le cycle de publication d'ADR-0010 (définition `state='live'`, `field_key` stable).
- Briques : ADR-0003 (Turnstile) ; **Cloudflare Email Service** pour l'envoi sortant, vers adresse de destination vérifiée *(amendement 2026-08-01 (b) — annule le passage à Resend de l'amendement (a))*.
- Testé par : ADR-0005 (route publique, Turnstile, e-mail mockés, soumission forgée, recalcul du total). *(Amendement (e) : s'y ajoutent une valeur porteuse de CRLF ne produisant aucun en-tête supplémentaire, une soumission vers un formulaire dépublié rejetée, un total dépassant le plafond faisant échouer la soumission, aucun asset bâti ne contenant une adresse de `form_defs`, et la ligne effacée après `expires_at`.)*
- Enraciné dans : **ADR-0011** *(2026-08-01)* (frontières de contenu hostile) — le § 6 renvoie ici le chemin de soumission : bornes de taille et plafond de volume (`FR-101`, `FR-102`) et bornage des journaux techniques (`FR-104`). Le contexte de rendu `text` du § 3 est ce que l'amendement (e) point 1 instancie sur le message acheminé.
- Cadre : PRD (FR-040 → FR-065, FR-086, FR-090, FR-091, FR-094, FR-096 → FR-099, FR-100 → FR-104, FR-112, US6, US7, SC-007), stack.md, revue contradictoire du PRD du 2026-08-01 (décisions D5, D10, D15, D18, reprises aux amendements (a) à (d)).
- Origine de l'amendement (e) : [audit de sécurité du 2026-08-01](../audit-securite-2026-08-01.md), constats `B-03` (corbeille hostile), `B-04` (composition du message), `B-08` (bornes d'entrée), `B-09` (limite de débit et Turnstile), `B-11` (`recipient_email` publié), `C-05` (formulaire dépublié), `C-06` (destinataire non re-vérifié), `C-08` (zone vidéo), `C-09` (délai et purge de la corbeille), `C-14` (bornes de définition et débordement), `D-10` (écart de total), plus le résiduel de `C-11` (bornage de `failure_reason`).
