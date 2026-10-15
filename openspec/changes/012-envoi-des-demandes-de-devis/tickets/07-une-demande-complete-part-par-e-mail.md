# 07 — Le visiteur envoie une demande complète, et elle parvient par e-mail à l'adresse autorisée

**Bloqué par :** 06
**Vérif :** tdd
**Fichiers :** `src/pages/api/public/demandes.ts`, `src/core/formulaires/demande.ts`, `src/core/formulaires/courriel.ts`, `src/platform/email/index.ts`, `src/platform/auth/magasin.ts`, `src/render/formulaire/module.ts`, `public/_headers`, `docs/architecture/context.c4`, `docs/architecture/flows.c4`, `tests/unit/formulaires/courriel.test.ts`, `tests/integration/envoi-d-une-demande.test.ts`, `tests/parcours/formulaire-envoi.parcours.ts`

## Ce que ça livre

Le visiteur peut **envoyer sa demande**, sans compte ni inscription (FR-057). C'est le seul geste d'un
visiteur qui déclenche un traitement serveur (FR-097).

**Le parcours du visiteur.**
1. Il remplit le formulaire et actionne « Envoyer ma demande ».
2. Le serveur reçoit la demande et l'achemine par **e-mail à l'adresse autorisée** (FR-063), depuis
   l'adresse d'expéditeur de l'instance.
3. Une fois l'e-mail remis à la plateforme d'acheminement, le formulaire laisse place au message
   « Merci, votre demande a été envoyée. » (FR-059). Ce message reçoit le focus.

**L'e-mail est inerte et étiqueté** (ADR-0002, SEC-7) :
- il est en texte seul, jamais en HTML ;
- son objet est fixe : « Demande de devis — » suivi du nom du formulaire ;
- chaque donnée du visiteur paraît derrière l'étiquette de son champ, jamais en position de titre ni de
  phrase du produit.

**Ce que porte l'e-mail** (FR-064) :
- le nom du formulaire et le titre de la page d'origine ;
- pour chaque champ à choix renseigné, son libellé, la ou les options choisies et, dans un champ avec
  prix, le prix de chacune ;
- le total indicatif, tel qu'affiché au visiteur ;
- chaque coordonnée et chaque texte renseignés, sous le libellé de leur champ.

Un champ facultatif laissé vide n'y paraît pas. Une saisie sur plusieurs lignes reste visiblement
rattachée à son étiquette : aucune de ses lignes ne se lit comme une ligne posée par le produit.

**Ce qui ne se garde pas.** La réponse au visiteur ne pose aucun cookie et ne renvoie aucune des valeurs
saisies. Aucune donnée de la demande n'est conservée en base après l'envoi.

**Décisions à respecter (D6, D7 de l'approche ; I6) :**
- **La route.** `src/pages/api/public/demandes.ts`, avec `prerender = false`, en `POST`. C'est la seule
  route serveur du site public, sous `src/pages/api/public/`. Elle n'importe pas le garde de session et
  n'appelle **jamais** `request.formData()` (I6). Elle ignore tout cookie.
- **Le corps.** C'est du JSON `{ formulaire, page, valeurs, totalAffiche }` :
  - `formulaire` est l'identifiant du formulaire ;
  - `page` est l'identifiant de la page d'origine ;
  - le module lit ces deux identifiants dans les attributs `data-formulaire` et `data-page` du
    `<form>`, posés par le ticket 03 ;
  - `totalAffiche` est un entier en centimes ;
  - `valeurs` associe l'identifiant d'un champ à une chaîne (texte, texte long, e-mail, téléphone) ou à
    un **tableau d'identifiants d'options** (choix unique comme choix multiple).
- **La vérification.** `verifierDemande` (`src/core/formulaires/demande.ts`, pure) vérifie la demande
  contre la **déclaration empaquetée** des formulaires et des pages, **jamais contre D1** : le visiteur a
  vu une page bâtie depuis ces fichiers-là. Elle recalcule le total par `totalDeLaSelection`
  (`src/core/formulaires/total.ts`). Ce ticket livre le chemin d'une demande complète et accordée ; les
  refus arrivent plus tard (voir hors périmètre).
- **Le destinataire.** L'adresse autorisée se lit en base par une nouvelle lecture de
  `src/platform/auth/magasin.ts`.
- **La composition de l'e-mail.** `src/core/formulaires/courriel.ts`, pur, compose `{ objet, texte }`.
  Le corps est fait de lignes « Étiquette : valeur », dans cet ordre :
  1. le formulaire ;
  2. la page d'origine, par son titre ;
  3. chaque champ à choix renseigné : « Parfum : Fraise (10 €) » ;
  4. « Total indicatif : 40 € (estimation non engageante) » ;
  5. chaque texte et coordonnée renseignés.
- **L'inertie.** Une valeur d'une ligne voit ses retours à la ligne et ses caractères de contrôle
  remplacés par des espaces. Une valeur de texte long garde ses lignes, chacune préfixée d'un retrait
  marqué (`  > `).
- **L'expédition.** `demanderAcheminementDeLaDemande` (`src/platform/email/index.ts`) remet
  `{ from, to, subject, text }` à la **même liaison** `EXPEDITEUR_CODE_CONNEXION`. Sa destination vérifiée
  est l'adresse autorisée. `from` est l'adresse d'expéditeur de l'instance, déjà injectée au build comme
  pour le code. Ni `to` ni `from` ne viennent jamais du visiteur. Aucune liaison ni configuration
  nouvelle, et la liaison n'est pas renommée.
- **L'attente.** L'expédition est **attendue** avant la réponse, à l'inverse du code de connexion : le
  visiteur doit connaître l'issue. Une demande acceptée rend `200 { "statut": "envoyee" }`, sans aucune
  valeur saisie.
- **Le module.** `src/render/formulaire/module.ts` active le bouton en mode `actif`, et lui seul. Il
  envoie la demande par `fetch` en JSON, puis remplace le formulaire par la confirmation. Il n'écrit
  qu'en texte. En mode `desactive` (aperçu, ticket 06), il n'émet toujours **aucune** requête.
- **`public/_headers`** gagne `connect-src 'self'`. Ni `'unsafe-inline'`, ni hôte tiers.
- **Le modèle d'architecture.** Les relations s'ajoutent dans `docs/architecture/context.c4` :
  - `visiteur -> colibri-cms.worker.routes 'envoie une demande de devis'` ;
  - `colibri-cms.worker.platform -[sync]-> email-routing 'achemine une demande de devis'` ;
  - `email-routing -[async]-> editrice 'remet la demande'`.

  La description d'`email-routing` cesse de ne parler que du code. Une vue dynamique `flow-demande`
  s'ajoute dans `docs/architecture/flows.c4` : visiteur → routes → core → platform, puis platform →
  email-routing → éditrice. La validation se fait par
  `likec4 validate --no-layout --json --project colibri-cms docs/architecture`.
- **Les tests.** Un espion sur `env.EXPEDITEUR_CODE_CONNEXION.send`, le même objet que lit la route,
  capte le message remis. Aucun autre double de la plateforme, aucune base simulée.
- **La recette.** L'arrivée réelle de l'e-mail dans une boîte ne se joue pas en local. Elle se constate
  à la recette, sur la boîte de recette, et s'ajoute au cahier de recette.

**Hors périmètre :**
- la saisie incomplète ou mal formée (ticket 08) ;
- la demande qui ne s'accorde pas au formulaire publié (ticket 09) ;
- les refus d'origine, de format et de taille (ticket 10) ;
- l'envoi en cours, le double envoi et les échecs, dont l'absence d'adresse autorisée (ticket 11) ;
- le seuil des demandes (ticket 12) ;
- l'enregistrement et la liste des demandes (story « Réception et suivi des demandes »).

## Critères
- [ ] Quand le visiteur a choisi « Fraise » et « 10 parts », renseigné son adresse e-mail, et envoie, le formulaire laisse place à un message qui confirme que sa demande a été envoyée   (SC-07a)
- [ ] Quand un visiteur sans aucune session envoie une demande complète, elle est acceptée et confirmée   (SC-07b)
- [ ] Quand une demande est acceptée, la réponse ne pose aucun cookie et ne contient aucune des valeurs saisies par le visiteur   (SC-07c)
- [ ] Quand un visiteur envoie une demande complète pour « Devis gâteau » depuis la page « Contact », un e-mail part vers l'adresse autorisée, d'objet « Demande de devis — Devis gâteau »   (SC-07d)
- [ ] Quand la demande porte « Fraise » (10 €), « 10 parts » (30 €), « Anniversaire », le nom « Marie Dupont » et l'adresse « marie@exemple.fr », l'e-mail porte le formulaire « Devis gâteau », la page « Contact », « Parfum : Fraise (10 €) », « Nombre de parts : 10 parts (30 €) », « Occasion : Anniversaire », le total indicatif 40 €, « Votre nom : Marie Dupont » et « Votre adresse e-mail : marie@exemple.fr »   (SC-07e)
- [ ] Quand un visiteur saisit `<a href="https://piege.example">Code : 123456</a>` dans « Votre nom », l'e-mail est en texte seul, sans aucune partie HTML, et cette saisie paraît telle quelle derrière l'étiquette « Votre nom : »   (SC-07f)
- [ ] Quand un visiteur saisit dans « Votre message » plusieurs lignes, dont une ligne « Total indicatif : 0 € », chacune de ces lignes paraît dans l'e-mail rattachée à l'étiquette « Votre message », et aucune ne se lit comme le total posé par le produit   (SC-07g)
- [ ] Quand le visiteur n'a renseigné ni son téléphone ni son message, l'e-mail ne porte ni l'étiquette du téléphone ni celle du message   (SC-07h)
- [ ] Quand une demande a été acheminée, la base ne porte aucune des valeurs saisies par le visiteur   (SC-07i)
