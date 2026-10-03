## Surface

- **Trois routes d'écriture neuves** derrière la session : `POST /admin/reglages/coordonnees`,
  `POST /admin/reglages/reseaux`, `POST /admin/reglages/mention`, corps JSON écrit par l'éditrice.
- **Un écran neuf** `GET /admin/reglages`, qui rend sur la même origine que le cookie de session des
  textes saisis par l'éditrice (valeurs de coordonnées, noms et adresses de liens, mention) et des textes
  déclarés par l'intégrateur (noms et valeurs de départ des coordonnées).
- **Une table D1 neuve** `brouillons_reglages`, écrite par requêtes préparées.
- **Une entrée versionnée neuve** : `content/reglages/` (déclaration de l'intégrateur), lue au build.
- Aucune route publique, aucun secret, aucune permission nouvelle ; la politique de sécurité de
  l'administration (`src/platform/entetes/middleware.ts`) n'est pas touchée.

## Menaces

- **Écriture sans session ou forgée cross-site** — une route d'écriture atteinte sans session, ou une
  requête forgée depuis un autre site qui profiterait de la session ouverte de l'éditrice.
- **XSS same-origin dans l'administration** — un nom de lien, une valeur de coordonnée ou un nom déclaré
  portant du balisage (`<img onerror=…>`) exécuté sur l'origine du cookie de session.
- **Schéma d'URL dangereux** — une adresse de lien `javascript:` ou `data:` enregistrée aujourd'hui, et
  rendue cliquable demain par l'aperçu ou le site public.
- **Injection SQL** — une valeur saisie concaténée dans une requête D1.
- **Corps démesuré ou mal formé** — un JSON énorme, profond ou d'un type inattendu (tableau à la place
  d'un objet, nombre à la place d'un texte) qui ferait échouer la route ou écrirait un brouillon
  incohérent.
- **Usurpation de la nature d'une coordonnée** — une soumission qui annonce « texte » pour un champ
  déclaré « téléphone », pour contourner sa vérification.

## Mitigations

- Chaque route importe le garde de session (`I6`, ADR-0007) et renvoie 401 sans session ; anti-forgerie
  par le cookie `__Host-session` `SameSite=Strict` (ADR-0011, `I13`), comme toute écriture de
  l'administration. Un scénario de spec couvre l'écriture sans session et l'écriture forgée.
- Rendu par l'**interpolation échappée** d'Astro et de Svelte seulement ; ni `set:html`, ni `{@html}`, ni
  `innerHTML` sur le chemin des réglages (`I5`) ; la mention est passée en Markdown à l'éditeur TipTap,
  jamais en HTML. Données transmises aux îlots par attributs `data-*` ou JSON échappés par Astro. Un
  scénario de spec exige que `<`, `>`, `&` et les guillemets s'affichent comme du texte. La CSP stricte
  (`script-src 'self'`, `I12`) reste la seconde barrière.
- Adresses de liens : `https` seul, avec un nom d'hôte, analysées par l'analyseur d'URL standard en
  `core/` ; liens de la mention sous la règle unique du texte riche (`https`, `mailto`, `tel`, chemins
  relatifs). À noter pour la story du site public : nom et adresse devront y être rendus échappés.
- Requêtes D1 **préparées** (`prepare(...).bind(...)`) exclusivement, comme le magasin des pages.
- Corps : lecture bornée en taille côté route (64 Kio, refus 413 au-delà), JSON invalide → 400 ; la forme
  est vérifiée champ par champ en `core/` (types, longueurs, nombre de liens au plus 12) avant toute
  écriture ; tout refus n'écrit rien.
- La nature d'une coordonnée est **toujours** prise dans la déclaration ; un identifiant non déclaré est
  refusé. Un scénario de spec couvre l'usurpation de nature.

## Données

Les coordonnées de contact sont des données **publiques par destination** (elles seront affichées sur le
site), mais peuvent être personnelles — le numéro ou l'adresse d'une entrepreneuse individuelle. Elles ne
quittent pas le compte du client : brouillon en D1, puis contenu déposé à la publication (story
distincte). Aucune donnée de visiteur n'est touchée. Aucun journal ne recopie les valeurs saisies.
