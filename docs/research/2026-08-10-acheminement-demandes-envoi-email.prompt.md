# Prompt — Acheminement des demandes de devis : service d'envoi et détection de panne

Composé le 2026-08-10 · à jouer dans Claude Research (Claude Desktop) · rapport attendu sous
`docs/research/2026-08-10-acheminement-demandes-envoi-email.md`

---

## Question

Un site vitrine statique, hébergé gratuitement sur Cloudflare, porte un formulaire de demande de
devis. Chaque demande doit **arriver par e-mail** dans la boîte de son unique éditrice — une
pâtissière non technicienne, en France, propriétaire de tous les comptes de son instance.

Deux questions, la seconde dépendant de la première :

1. **Quel service ou quelle voie d'envoi d'e-mail transactionnel satisfait simultanément les trois
   conditions ci-dessous, au 10 août 2026 ?**
   - le compte s'ouvre **au nom de l'éditrice**, et rien du prestataire n'est nécessaire à son
     fonctionnement (aucun compte, aucun secret, aucune identité du prestataire) ;
   - il fonctionne **sans aucun moyen de paiement enregistré**, de façon durable, et **aucun
     mécanisme ne peut déclencher un prélèvement sans un acte explicite de l'éditrice** — ni essai
     qui expire en payant, ni bascule automatique au dépassement ;
   - sa **délivrabilité vers les boîtes grand public françaises est vérifiable à la recette**,
     c'est-à-dire constatable par un test reproductible au moment de la livraison.

2. **Comment l'éditrice s'aperçoit-elle qu'une panne d'acheminement s'est installée en silence**
   — compte suspendu, palier atteint, domaine dégradé, filtrage — alors que les demandes continuent
   d'être enregistrées côté site et que sa liste se remplit sans qu'elle la consulte ?

**La décision servie** : la phase Stack du socle de ce projet doit trancher deux domaines — le
service d'envoi, et le mécanisme de détection de panne d'acheminement. Les deux sont aujourd'hui
non arbitrés et renvoyés explicitement à cette phase par le Brief et le PRD.

**Enjeu particulier de la question 1** : c'est une **hypothèse d'existence**, pas un choix de
confort. Si aucune voie ne satisfait les trois conditions, la réponse attendue est de le dire
clairement et de nommer laquelle des trois est l'obstacle — cette réponse négative rouvrirait le
document fondateur du projet. Une réponse « il n'existe rien qui tienne les trois » est un
résultat de recherche utile, pas un échec.

---

## Périmètre

**Contexte technique fixe, à ne pas remettre en question** :

- hébergement Cloudflare (Workers / Pages), palier gratuit, compte au nom de l'éditrice — donnée
  d'entrée du projet, aucun repli chez un autre hébergeur n'est à instruire ;
- l'éditrice possède un nom de domaine et peut y poser des enregistrements DNS (SPF, DKIM, DMARC,
  MX) — la zone est chez Cloudflare ;
- le code du site appelle l'envoi depuis un Worker (JavaScript, runtime Workers), pas depuis un
  serveur classique ;
- l'enregistrement d'une demande **ne dépend pas** de la réussite de son acheminement : la demande
  est stockée quoi qu'il arrive, et consultable dans l'interface d'administration. L'e-mail est le
  canal de **notification**, pas le canal de **persistance** ;
- volume réel attendu : **quelques demandes par jour au plus** — très loin de tout palier. Les
  limites de volume ne sont donc pas le critère de départage ; l'activabilité sans carte et la
  pérennité du palier gratuit le sont ;
- destinataire : **une seule adresse**, celle de l'éditrice, chez un fournisseur grand public
  français (Gmail, Outlook/Hotmail, Orange, Free, SFR, La Poste).

**Inclus dans l'examen — les trois familles de candidats, toutes à instruire** :

1. **Fournisseurs d'envoi transactionnel tiers** avec palier gratuit permanent — par exemple, sans
   que la liste soit limitative : Resend, Brevo, Mailjet, SendGrid, Postmark, Scaleway Transactional
   Email, Amazon SES, MailerSend, SMTP2GO, Elastic Email, Zoho ZeptoMail, Loops, Plunk. Pour chacun :
   le palier gratuit existe-t-il encore au 10 août 2026, est-il **permanent** ou un essai, l'ouverture
   de compte et la vérification de domaine exigent-elles une carte, et l'API est-elle appelable depuis
   un Worker Cloudflare ?
2. **Les voies natives Cloudflare** — Email Routing, Email Workers et son *send binding*, ce qui
   reste de l'intégration MailChannels historique. Quel est leur statut exact au 10 août 2026 :
   entrant seulement, ou envoi sortant possible ? vers une adresse arbitraire, ou seulement vers une
   adresse vérifiée du compte ? en disponibilité générale ou en bêta ? gratuit sans carte ?
3. **Le SMTP du fournisseur de messagerie de l'éditrice elle-même** — envoyer via le compte
   e-mail existant, sans ouvrir aucun compte supplémentaire. Cette voie est-elle praticable depuis
   un Worker Cloudflare, et à quelles conditions ?

**Point technique à établir en premier, parce qu'il élimine des familles entières** : le runtime
Cloudflare Workers autorise-t-il, au 10 août 2026, une connexion sortante vers un serveur SMTP
(ports 25 / 465 / 587), via `connect()` ou autrement ? Si l'envoi n'est possible que par API HTTP,
tout candidat sans API HTTP tombe — dites-le explicitement plutôt que de le laisser déduire.

**Inclus aussi — la détection de panne (question 2)** : est admissible tout mécanisme qui vit
**dans les comptes de l'éditrice** — un déclencheur planifié dans son propre compte Cloudflare, un
accusé périodique, un contrôle au moment où elle ouvre son interface d'administration, un retour
d'échec du fournisseur (bounce, webhook, journal), une donnée lisible dans l'interface. Pour chaque
mécanisme : que détecte-t-il réellement, que **ne** détecte-t-il **pas**, et quel geste concret
l'éditrice doit-elle faire.

**Exclus — écrit pour que la recherche ne s'étale pas** :

- tout hébergement autre que Cloudflare, et toute comparaison d'hébergeurs ;
- tout ce que le prestataire opérerait, hébergerait ou renouvellerait : surveillance externalisée,
  service de *monitoring* tiers sous son compte, tâche planifiée chez lui, alerte qui transite par
  son infrastructure. Le test est : si le prestataire disparaît demain, le mécanisme fonctionne-t-il
  encore ? Sinon, il est hors périmètre ;
- l'e-mail **marketing** : campagnes, newsletters, listes, désabonnement, éditeurs de modèles. Seul
  le transactionnel unitaire compte ;
- l'auto-hébergement d'un serveur d'envoi (MTA, Postfix, relais maison) ;
- les paliers payants, les crédits d'essai qui expirent, et les offres « gratuites la première
  année » ;
- les guides génériques de délivrabilité non sourcés et les comparatifs publiés par un fournisseur
  sur ses concurrents ;
- le contenu de l'e-mail, sa mise en forme, et l'ergonomie du formulaire.

**Horizon** : la réponse doit être vraie **au 10 août 2026**. Tout palier, toute limite, toute
condition d'activation doit être **datée** de sa source, et une page de tarification sans date
constatable doit être signalée comme telle.

---

## Contraintes de sourcing

- **Source primaire exigée pour tout chiffre et toute condition d'activation** : documentation du
  fournisseur, page de tarification, conditions d'utilisation, changelog, dépôt. Remonter au
  document d'origine ; un chiffre trouvé sur trois pages qui se citent l'une l'autre reste **une
  seule** source.
- **Étiqueter chaque source** : officiel · préprint indépendant · benchmark d'éditeur · commercial /
  marketing · témoignage de forum ou de communauté.
- **Séparer les niveaux de preuve** : mesuré (protocole public, vérifiable) · rapporté (affirmé par
  une source identifiée, sans protocole) · anecdotique (témoignage, retour de praticien) · non étayé
  (circule sans source primaire trouvable — à démentir explicitement).
- **Citer verbatim** les passages qui portent une affirmation, et **attribuer par affirmation** —
  une source par affirmation, pas une bibliographie en fin de document que rien ne relie au texte.
  Une affirmation qu'aucune citation ne porte est une affirmation du modèle : elle s'écrit comme
  telle, ou elle ne s'écrit pas.
- **L'absence de donnée est un résultat** : « aucune source primaire ne dit si l'inscription exige
  une carte » s'écrit tel quel et ne s'approxime pas. C'est même le résultat le plus utile, parce
  que c'est celui qu'une recherche paresseuse remplace par une supposition.
- **Distinguer systématiquement** ce qui est écrit dans une documentation de ce qui est constaté
  par des utilisateurs sur un forum. Un fil de communauté est un signal, jamais une preuve — et un
  fil unique non recoupé reste unique même si plusieurs pages le répètent.
- Signaler ce qui **ne peut être constaté qu'en étant connecté** à un tableau de bord ou à un
  tunnel d'inscription : ces points ne se tranchent pas depuis une documentation publique et
  doivent partir dans une liste séparée de gestes à faire à la main.

---

## Hypothèses concurrentes

Poser et départager explicitement, avec ce qui trancherait et le niveau de confiance de chacune.
Ne pas trancher artificiellement quand les sources divergent.

**Sur l'envoi** :

- **H1** — un fournisseur transactionnel tiers à palier gratuit permanent s'ouvre et se vérifie
  sans carte, et son API s'appelle depuis un Worker : c'est le chemin, et il en existe plusieurs.
- **H2** — la voie native Cloudflare suffit et évite d'ouvrir le moindre compte supplémentaire,
  parce que le compte d'hébergement existe déjà.
- **H3** — les paliers gratuits « permanents » sont assortis d'une condition cachée (carte exigée à
  la vérification du domaine, suspension après inactivité, envoi limité à une adresse déjà vérifiée)
  qui les disqualifie une fois lue en entier, et **aucun candidat ne tient les trois conditions**.

**Sur la détection** :

- **D1** — un accusé périodique auto-déclenché : son **absence** d'arrivée est le signal, ce qui a
  la propriété rare de tester le canal réel de bout en bout.
- **D2** — un retour d'échec du fournisseur (rejet, webhook, journal d'envoi) écrit dans
  l'interface : détecte le rejet, mais pas le compte suspendu ni le classement en indésirable.
- **D3** — un rapprochement fait par l'éditrice elle-même : ce que la liste contient face à ce
  qu'elle a reçu, présenté au moment où elle ouvre l'interface.

Pour chaque mécanisme de détection, répondre à : **quelle panne échappe encore à ce mécanisme ?**
C'est cette réponse qui départage, pas la sophistication du dispositif.

---

## Format de rendu

TL;DR · Key Findings · Details · Recommendations · Caveats.

Attendus supplémentaires :

- **Niveau de confiance par affirmation**, comme signal de classement.
- Marqueurs **`[À VÉRIFIER]`** et **`[INCERTAIN]`** sur tout ce qui n'est pas établi.
- Un **tableau de synthèse des candidats**, une ligne par voie d'envoi, avec en colonnes : palier
  gratuit permanent (oui/non/expire) · carte exigée à l'inscription · carte exigée à la vérification
  du domaine · appelable depuis un Worker (API HTTP / SMTP) · vérification de domaine requise
  (SPF/DKIM/DMARC) · limite quotidienne et mensuelle · comportement au dépassement (mur ou
  facturation) · date et source de chaque cellule.
- Un tableau **« chiffre ou condition qui circule → source primaire trouvée ? → verdict »** pour
  tout ce qui est affirmé sans document d'origine.
- Une **liste séparée des points qui ne se constatent qu'à la main**, connecté au service : pour
  chacun, le geste exact et ce qu'il faut observer.
- Une **réponse explicite à l'hypothèse d'existence** : si aucun candidat ne tient les trois
  conditions, le dire en une phrase et nommer la condition qui bloque.

---

## Ce qui ferait changer la recommandation

Nommer, pour la recommandation rendue, les faits dont elle dépend et le sens dans lequel elle
bascule si l'un d'eux se révèle faux :

- **si les connexions SMTP sortantes depuis un Worker sont possibles** (ou cessent de l'être), la
  famille de candidats admissible change entièrement ;
- **si la vérification de domaine d'un fournisseur exige une carte** alors que l'inscription n'en
  exigeait pas, ce fournisseur tombe malgré son palier gratuit affiché ;
- **si un palier gratuit suspend un compte après une période d'inactivité**, le candidat devient
  inutilisable pour un site à très faible volume — c'est exactement le profil visé ;
- **si l'envoi natif Cloudflare passe en disponibilité générale, ou vers une adresse arbitraire**,
  la voie sans compte supplémentaire devient la recommandation par défaut ;
- **si un fournisseur exige une identité d'entreprise, un numéro de TVA ou une vérification
  d'identité** que l'éditrice ne peut pas fournir seule, il tombe sur la première condition ;
- **si la boîte destinataire est chez un fournisseur qui filtre agressivement** un expéditeur donné,
  la délivrabilité vérifiable à la recette n'est plus acquise et le départage se refait sur ce
  critère ;
- **si un mécanisme de détection exige un service qui ne survit pas au départ du prestataire**, il
  tombe quels que soient ses mérites techniques.
