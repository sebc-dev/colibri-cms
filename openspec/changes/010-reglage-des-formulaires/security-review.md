## Surface

- **Une route d'écriture neuve** derrière la session : `POST /admin/formulaires/<id>/options`, corps
  JSON écrit par l'éditrice, `<id>` pris dans l'adresse.
- **Deux écrans neufs** `GET /admin/formulaires` et `GET /admin/formulaires/<id>`, qui rendent sur la
  même origine que le cookie de session des textes saisis par l'éditrice (libellés d'options, prix) et
  déclarés par l'intégrateur (noms de formulaires, libellés de champs et d'options).
- **Une table D1 neuve** `brouillons_formulaires`, écrite par requêtes préparées.
- **Une entrée versionnée neuve** : `content/formulaires/` (déclaration de l'intégrateur), lue au build.
- Aucune route publique, aucun secret, aucune permission nouvelle ; la politique de sécurité de
  l'administration (`src/platform/entetes/middleware.ts`) n'est pas touchée.

## Menaces

- **Écriture sans session ou forgée cross-site** — la route atteinte sans session, ou une requête
  forgée depuis un autre site qui profiterait de la session ouverte de l'éditrice.
- **XSS same-origin dans l'administration** — un libellé d'option ou un nom de formulaire portant du
  balisage (`<img onerror=…>`) exécuté sur l'origine du cookie de session ; le même libellé sera demain
  rendu au **visiteur** et recopié dans l'**e-mail** d'une demande.
- **Identifiant de formulaire hostile dans l'adresse** — `<id>` utilisé pour bâtir un chemin de fichier
  ou une requête.
- **Injection SQL** — un libellé ou un identifiant concaténé dans une requête D1.
- **Corps démesuré ou mal formé** — un JSON énorme, profond, d'un type inattendu, ou des milliers
  d'options, qui ferait échouer la route ou écrirait un brouillon incohérent.
- **Contournement de la structure** — une soumission qui ajoute un champ, donne des options à un champ
  sans option, annonce un prix sur un champ sans prix, ou forge des identifiants d'option, pour
  modifier ce que seul l'intégrateur pose (FR-050, UX-3).
- **Prix aberrant** — négatif, gigantesque, flottant (`1e308`, `NaN`) qui fausserait le total
  indicatif de la story suivante.

## Mitigations

- La route importe le garde de session (`I6`, ADR-0007) et renvoie 401 sans session ; anti-forgerie par
  le cookie `__Host-session` `SameSite=Strict` (ADR-0011, `I13`). Scénarios de spec : écriture sans
  session, écriture forgée.
- Rendu par l'**interpolation échappée** d'Astro et de Svelte seulement ; ni `set:html`, ni `{@html}`,
  ni `innerHTML` sur le chemin des formulaires (`I5`) ; données transmises à l'îlot en JSON échappé par
  Astro. Scénario de spec : `<`, `>`, `&` et guillemets affichés comme du texte. La CSP stricte
  (`script-src 'self'`, `I12`) reste la seconde barrière. À reporter dans la story suivante : libellés
  rendus échappés au visiteur et dans l'e-mail.
- `<id>` n'est **jamais** utilisé pour lire un fichier : il est cherché dans la liste déjà chargée au
  build par `import.meta.glob` ; non trouvé → 404. Requêtes D1 **préparées** exclusivement.
- Corps lu borné à 64 Kio (413 au-delà, `lireCorpsJsonBorne`), JSON invalide → 400 ; forme vérifiée
  champ par champ en `core/` (types, longueurs, 1 à 30 options par champ) avant toute écriture ; tout
  refus n'écrit rien ; jamais de 5xx sur une entrée de l'éditrice.
- La structure — existence du formulaire, liste et nature des champs, marque avec / sans prix — est
  **toujours** prise dans la déclaration ; un champ inconnu, un champ à choix omis, un identifiant
  d'option inconnu ou répété sont refusés. Scénarios de spec dédiés. Le dernier numéro d'option
  retenu par le brouillon ne vient jamais de la soumission : une requête forgée ne peut pas le remettre
  à zéro pour faire redonner l'identifiant d'une option retirée (ADR-0018).
- Le prix arrive en **texte** et est lu par une seule fonction de `core/` vers un entier de centimes
  borné (0 à 9 999 999) ; aucun `parseFloat` d'une valeur brute ; le brouillon ne stocke que des
  entiers.

## Données

Aucune donnée personnelle : libellés et prix sont un contenu commercial destiné à être public. Aucune
donnée de visiteur n'est touchée par ce change (elles arrivent avec la story de l'envoi d'une demande).
Le brouillon reste dans la D1 du compte client. Aucun journal ne recopie les valeurs saisies.
