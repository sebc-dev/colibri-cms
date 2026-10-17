## Surface

- **Une route serveur ouverte à l'internet anonyme** : `POST /api/public/demandes`, sans session, sans
  compte, seule surface serveur du visiteur (FR-097). Elle lit un corps JSON borné et déclenche un e-mail.
- **Un canal d'écriture vers la boîte de l'éditrice** : l'e-mail de la demande part vers l'adresse
  autorisée — la boîte qui reçoit aussi les codes de connexion —, depuis la même adresse d'expéditeur.
- **Le premier script du site public**, servi sur l'origine qu'habite le cookie de session de
  l'administration (SEC-1), et la politique du site public qui s'ouvre à `script-src 'self'` et
  `connect-src 'self'`.
- **Un compteur dérivé des adresses IP** (DAT-3), partagé par la route d'envoi et l'écran de connexion.
- **L'écran de connexion** gagne un refus par origine, qui ne doit rien dire de l'adresse autorisée
  (SEC-4).

## Menaces

1. **Imitation d'un message du produit** (SEC-7, ADR-0002) — un inconnu déclenche l'envoi d'un code à
   l'éditrice depuis l'écran public, puis envoie une demande dont le texte se fait passer pour une
   consigne du produit (« transmettez le code reçu à… »), ou fabrique dans un texte long des lignes qui
   imitent le total ou l'en-tête de l'e-mail.
2. **Injection dans l'e-mail** — retours à la ligne ou caractères de contrôle dans une valeur pour casser
   la structure « Étiquette : valeur » ; HTML dans une valeur, rendu par le client de messagerie.
3. **Abus de la route** — envois en rafale qui remplissent la boîte, consomment les quotas gratuits (requêtes
   du Worker, écritures D1, envois) ou servent de relais. Un robot qui change d'adresse IP passe le seuil
   (arbitrage du 2026-10-15 : sans Turnstile).
4. **Requêtes forgées depuis un autre site** — une page tierce qui fait envoyer des demandes par le
   navigateur de ses visiteurs.
5. **XSS sur l'origine commune** — le module du formulaire, premier script public, qui écrirait du HTML
   depuis une donnée ; un libellé d'intégrateur ou d'éditrice interprété ; une valeur du visiteur
   renvoyée dans une réponse puis dans la page.
6. **Désérialisation et épuisement** — corps démesuré, JSON profond, clés comme `__proto__` dans les
   valeurs, corps `multipart` portant un fichier (FR-061).
7. **Énumération par le seuil de connexion** — une annonce, des en-têtes ou un délai qui différeraient
   selon que l'adresse soumise est l'adresse autorisée.
8. **Fichier des visiteurs** (DAT-3) — une adresse IP écrite en clair, une empreinte qui survit à sa
   fenêtre, une clé lisible, ou les valeurs d'une demande gardées en base ou dans un journal.

## Mitigations

1. **E-mail inerte et étiqueté** (D7) : texte seul ; objet fixe « Demande de devis — » + nom du
   formulaire (donnée de l'intégrateur, jamais du visiteur) ; chaque valeur derrière l'étiquette de son
   champ ; les lignes d'un texte long préfixées d'un retrait marqué, pour qu'aucune ne commence comme une
   ligne du produit. Résidu assumé par ADR-0002 : un texte marqué atteint toujours les yeux de l'éditrice.
2. Valeurs d'une ligne : retours à la ligne et caractères de contrôle remplacés par des espaces ; aucune
   partie HTML n'est jamais composée ; `to` et `from` ne viennent jamais du visiteur, et la liaison
   `send_email` n'écrit qu'à sa destination vérifiée (FR-005 tenu par la plateforme).
3. Seuil par origine de 5 demandes par heure (D8), compté **avant** la lecture du corps ; refus des
   méthodes, origines, formats et tailles hors contrat avant tout travail coûteux (D6) ; un compteur en
   panne refuse (fermé sur panne), par un verdict distinct qui ne se présente pas comme un seuil atteint ;
   chaque appelant refuse sur tout verdict autre que `traitee`, pour qu'un verdict ajouté ne puisse ouvrir
   une surface. Résidu : la rotation d'adresses IP — Turnstile se rouvre par une
   décision séparée si le spam paraît.
4. `Origin` exigée et égale à l'origine du site (403 sinon) ; seul `application/json` est accepté, ce qui
   impose au navigateur une requête préalable qu'aucun en-tête d'autorisation croisée ne satisfait ; la
   route ignore tout cookie.
5. Le module n'écrit qu'en texte (`textContent`), jamais `innerHTML` ; ses données viennent d'attributs
   `data-*` lus comme nombres ou textes ; aucun `eval`. Le formulaire est dessiné par Astro, qui échappe
   chaque libellé ; la mention passe par le seul lieu du HTML brut (`src/render/markdown/`, I5). La
   réponse de la route ne renvoie aucune valeur saisie — seulement des identifiants de champ et des codes
   de motif. La politique publique n'admet que `'self'`, sans `'unsafe-inline'` ni hôte tiers.
6. Corps lu par un lecteur borné à 16 Kio (`Content-Length` absent compris) ; `multipart` refusé **sans
   lecture** (I6, jamais `request.formData()`) ; les valeurs se lisent par `Object.hasOwn` contre la liste
   des champs déclarés, toute clé inconnue refusée.
7. Le seuil de connexion se juge avant toute lecture de l'adresse ; l'annonce est un texte unique ; la
   soumission d'adresse refusée attend le même délai plancher (D9) ; les deux soumissions attendent le
   même plancher, l'adresse n'étant jamais lue au-delà du seuil.
8. Empreinte `HMAC-SHA-256` sous une clé de 32 octets tirée par le produit pour l'heure en cours ; clé et
   empreintes effacées ensemble, en une écriture indivisible, au premier comptage de l'heure suivante ;
   aucune adresse IP, clé ni empreinte dans une réponse ou un journal ; la trace d'un acheminement en
   échec ne porte que le motif rendu par la plateforme ; aucune table ne reçoit les valeurs d'une demande.

## Données

- **Coordonnées et textes du visiteur** (nom, adresse e-mail, téléphone, message, sélections) — en
  transit seulement : reçues par la route, acheminées dans l'e-mail, jamais écrites en base ni dans un
  journal. Aucune durée de conservation n'est donc introduite par ce change ; DAT-1 reste ouvert et
  concernera la story « Réception et suivi des demandes », qui les enregistrera.
- **Adresse IP** — jamais conservée en clair : une empreinte qui ne vit qu'une fenêtre d'une heure (au
  plus jusqu'à la sollicitation suivante quand le trafic s'arrête), sous une clé jetée avec elle.
- **Résidu à constater** — `wrangler.jsonc` active les journaux de la plateforme (`observability`) ; ce que
  la plateforme y retient des requêtes elle-même (dont, possiblement, l'adresse IP) échappe au compteur.
  À constater à la recette et à porter au cadrage de DAT-1 / DAT-3, sans changer ce change.
- **Résidu de l'historique de la base** — D1 garde un historique restaurable, toujours actif, de 7 jours
  sur le palier gratuit (Time Travel). Une clé et ses empreintes effacées à la bascule y restent
  restaurables pendant 7 jours par qui détient l'accès au compte, et une empreinte avec sa clé suffit à
  retrouver une adresse IPv4 par essai de toutes les adresses. À porter au cadrage de DAT-3, avec le
  résidu des journaux.
- **Aucun secret nouveau** : la clé de fenêtre est fabriquée et jetée par le produit ; aucune liaison ni
  valeur d'instance n'est ajoutée (SEC-3, I8).
