# ADR-0006 : Authentification — implémentation maison sur D1, quatre mécanismes
Statut : Accepté | Date : 2026-08-13 | Trace vers : [docs/stack.md](../stack.md) — candidat n° 6, ligne « Auth »

## Contexte

L'administration n'a qu'une porte, et le PRD en borne la forme étroitement : `FR-003` interdit
tout mot de passe, `FR-004` interdit d'exiger la connexion à un compte autre, `SC-006` compte
les comptes que l'éditrice doit visiter et veut qu'ils restent « jamais visités par elle ».
La surface est donc exactement : **une adresse, une preuve de maîtrise, une session**.

Exigences servies : `FR-001` à `FR-008` (ouverture et refus de session, bornage des envois,
rejet par origine, réponse uniforme), `FR-082` (l'aperçu n'est atteignable que depuis une
session), `FR-118` (fermeture d'une session restée sept jours sans usage), `FR-120` à `FR-122`
(liaison à l'appareil demandeur, usage unique et expiration de la preuve, mise hors d'usage
après N essais), `SC-006`, `SC-021` (épreuve de résistance de la connexion).

Le magasin est acquis : [ADR-0003](./0003-magasin-d1-brouillons-etat-publie-et-demandes.md) a
retenu D1. Et `FR-005` — ne rien envoyer à une adresse non autorisée — est tenu **par la
plateforme elle-même**, `send_email` n'écrivant qu'à une destination vérifiée.

Les faits qui ont retiré l'argument de poids contre l'alternative principale sont mesurés et
versés :
[`docs/research/2026-08-12-better-auth-poids.md`](../research/2026-08-12-better-auth-poids.md).

## Décision

Nous écrirons l'authentification **nous-mêmes, sur D1**, composée de quatre mécanismes :

1. **Un code à saisir, jamais un lien** — **40 bits**, haché en base, à **usage unique**,
   **expirant**, **lié au navigateur demandeur**, et **brûlé au 5ᵉ essai**.
2. **Une session opaque en D1**, donc **sans clé de signature**, expirant à **sept jours
   d'inactivité** et **trente jours d'âge**.
3. **Un cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`** — sans
   restriction de chemin.
4. **Un jeton anti-CSRF sur chaque écriture**, doublé d'un contrôle d'en-tête `Origin`.

## Conséquences

**Positives.**

- **Le code ferme trois modes de panne du lien d'un seul geste** : il n'offre rien à précharger
  aux scanners de messagerie qui consomment les liens avant le clic ; il ne met pas le secret
  dans une URL — donc ni dans l'historique, ni dans un `Referer`, ni dans les journaux de la
  plateforme ; et il rend **gratuite** la liaison au navigateur demandeur, quand lier un lien
  interdirait le multi-appareil. Sa seule faiblesse propre, l'entropie, se paie de deux
  caractères : **40 bits** plutôt que les 20 bits hérités du SMS.
- **La session opaque retire un secret de l'inventaire** — il n'y a plus de clé de signature à
  ouvrir, à ranger ni à faire tourner — et elle permet à `FR-012` et `FR-013` de **fermer les
  autres sessions** au moment du remplacement, ce qui rend réel le remède du cas limite « boîte
  compromise » sans offrir à l'éditrice la fonction que le PRD exclut : constater ou fermer une
  session ouverte ailleurs. Une conséquence automatique n'est pas une capacité offerte.
- Son coût est nul en pratique : l'administration lit déjà D1 à chaque écran, et une lecture de
  session par requête pèse de l'ordre de **500 lignes par jour sur les 5 000 000** de l'Annexe A
  du socle de livraison.
- Le préfixe `__Host-` est gratuit et ferme l'injection de cookie depuis un sous-domaine.

**Négatives — ce à quoi le code s'engage.**

- **Quatre mécanismes de sécurité sont à écrire à la main**, sur le chemin d'accès **unique** à
  l'administration. Rien ne les fournit, et rien ne les corrigera par une montée de version.
- **`FR-008` n'est pas tenu par construction.** Le traitement de `AU-09` a montré que le
  plafond de `FR-006` n'est atteignable que pour l'adresse autorisée, et que le chemin qui
  envoie un message n'a aucune raison de répondre dans le même délai que celui qui n'en envoie
  pas. L'exigence a été rédigée à nouveau et bornée : c'est **elle** qui doit être tenue, non
  une propriété supposée acquise.
- **`FR-013` et `FR-014` restent sans porteur, et c'est délibéré** : ils sont aujourd'hui
  **impossibles à honorer**. `FR-005` interdit tout message de preuve à une adresse autre que
  l'autorisée, ce qui verrouille `FR-014` tel qu'il est rédigé ; et le glossaire fond en une
  seule adresse celle qui ouvre l'administration et celle où les demandes sont acheminées, que
  `send_email` ne sait déplacer qu'après une vérification dans le compte Cloudflare — que
  `SC-006` interdit précisément de faire visiter. Les issues amendent toutes le PRD : dette au
  dossier de `/scd-sdd:premortem socle`.
- **La boîte e-mail reste la clé de voûte de l'instance**, et un lecteur de cette boîte reste
  une impasse. La liaison au navigateur demandeur ne protège pas de lui — le formulaire de
  connexion est public, quiconque peut déclencher son propre envoi ; elle ferme l'ingénierie
  sociale du « lisez-moi le code que vous venez de recevoir », qui est le vecteur réaliste sur
  un profil non technique. L'impasse est désormais tenue sur un **choix motivé** et non plus
  forcé : la connexion en lecture seule est le chemin le plus discret, et le TOTP l'aurait
  fermé.
- **Le rafraîchissement glissant de la session n'écrit pas à chaque requête** : le budget
  d'écriture de D1 est cinquante fois plus serré que celui de lecture.
- **Deux des quatre mécanismes ne cassent aucun écran s'ils manquent.** Les attributs du cookie
  et le jeton anti-CSRF doublé d'`Origin` sont des propriétés **statiques** : leur absence ne
  se voit qu'à l'attaque. Ils rejoignent donc les contrôles bloquants de `docs/ci.md`, et
  l'ensemble se mesure par l'épreuve `SC-021`.
- **Le jeton anti-CSRF ne vaut rien contre le XSS same-origin** — il est lisible dans le DOM,
  et `SameSite` ne peut rien non plus. Ce sont l'invariant d'échappement et la CSP stricte de
  l'administration qui répondent là.

## Alternatives considérées

- **Better Auth 1.6.26** : écartée sur l'**intégration** et l'**approvisionnement**, non sur le
  poids. L'éditeur ne publie **aucun point d'entrée Cloudflare ni D1** — huit cibles de
  framework sur cinquante-six exports, pas une pour la plateforme retenue —, si bien que le
  branchement de la seule porte du CMS passerait par un **dialecte tiers**, `kysely-d1@0.4.0`,
  écrit ni par Better Auth ni par Cloudflare ; le paquet **exige `nodejs_compat`**, important
  `node:crypto` ; il porte 17 dépendances et 19 pairs, dont six piles de base de données pour
  une seule qui sert ; son installation ajoute 22 paquets et sa version bouge à la semaine
  (`1.6.26` le 2026-08-04, `1.6.27` le 2026-08-11), sur le chemin d'accès unique à
  l'administration ; et le **moyen de reprise** resterait entièrement à écrire par-dessus, ses
  codes de secours naissant dans une session déjà ouverte quand le glossaire exige un secret
  **remis** à la livraison. *L'argument de poids qui portait cet écarté a été retiré le
  2026-08-12 par une mesure : un Worker réel important `betterAuth` et son plugin de code à
  usage unique pèse **0,19 Mo gzip, soit 6,1 % des 3 Mio** du plan gratuit. Le même relevé a
  montré qu'`otpLength`, `expiresIn`, `allowedAttempts`, `storeOTP`, le préfixe `__Host-`,
  `originCheck` et les sessions opaques en table existent tous dans le paquet — la surface
  restant à écrire par-dessus est donc plus étroite qu'annoncé.*
- **Cloudflare Access one-time PIN** : écartée car son palier gratuit n'a **aucune source
  primaire**, donc invérifiable face à l'invariant `I5` du socle de livraison et à `FR-103` ;
  et l'éditrice se connecterait à une couche d'identité tierce, ce que `FR-004` et `SC-006`
  interdisent.
- **Un lien à usage unique plutôt qu'un code** : écartée — les scanners de messagerie
  préchargent les URL et le consomment avant le clic ; le secret entre dans une URL ; et il ne
  peut être lié au navigateur demandeur qu'en interdisant le multi-appareil.
- **Un cookie signé plutôt qu'une session opaque** : écartée car l'économie invoquée n'existe
  pas — l'administration lit déjà D1 à chaque écran — et le cookie signé remet une clé de
  signature à l'inventaire tout en interdisant à `FR-012` de fermer les autres sessions.
- **Une session sans bornes** : écartée car l'objection qui a écarté la rémanence longue en
  `A-02` — « irrévocable en cas de vol d'appareil » — s'appliquait mot pour mot. `FR-012` ne
  ferme les autres sessions que si l'éditrice **sait** qu'il en survit une, et le PRD lui
  refuse délibérément tout écran pour le constater.
- **La passkey WebAuthn en facteur primaire** : écartée car `FR-009` et le glossaire disent
  « secret **remis** à la livraison », quand une passkey naît sur l'appareil de l'éditrice et
  suppose une session déjà ouverte, et sa récupération pend au trousseau d'un tiers — le motif
  même du rejet d'Access OTP. Elle demande d'amender le PRD.
- **Une graine TOTP engendrée par l'intégrateur et remise sur papier** : écartée sur ses coûts
  propres, et non plus sur une unicité qui était fausse. Elle n'est vérifiable qu'en **clair**
  côté serveur — une lecture de la base la livrerait telle quelle — et rallonge l'inventaire au
  moment où la session opaque le raccourcissait ; elle demande un outil à provisionner et une
  saisie de plus à chaque connexion, sur le parcours que `SC-003` et `SC-015` mesurent et que
  le glossaire promet « par sa seule adresse e-mail » ; et le gain serait partiel, la boîte
  restant la clé de voûte de l'instance.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, complétée par les
  traitements de `S-05`, `AU-04`, `AU-05`, `AU-09` et `AU-10`. Revue humaine : 2026-08-13.
