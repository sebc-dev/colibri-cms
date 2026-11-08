# 01 — Créer le code de secours depuis l'administration et le voir une seule fois

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `migrations/0016_code_de_secours.sql`, `src/core/auth/code.ts`, `src/platform/auth/code-de-secours.ts`, `src/pages/admin/code-de-secours.astro`, `src/admin/NouveauCodeDeSecours.astro`, `src/pages/admin/reglages.astro`, `src/admin/textes.ts`, `tests/unit/code-de-secours.test.ts`, `tests/integration/code-de-secours-creer.test.ts`, `docs/cahier-de-test.md`

## Ce que ça livre

Le **code de secours** est le secret, noté sur papier, qui ouvre l'administration le jour où la boîte
e-mail de l'adresse autorisée ne répond plus (le « moyen de reprise » du glossaire ; l'éditrice ne lit
jamais que « code de secours »). Ce ticket livre sa **naissance** : l'éditrice, en session ouverte,
atteint l'écran « Code de secours » depuis Réglages, voit qu'aucun code n'est en place, le crée, et le
lit **une seule fois** pour le recopier ou l'imprimer (FR-009). C'est le geste de la livraison,
accompagné par l'intégrateur (ADR-0032 : le code naît dans l'administration, Isometria ne le voit
jamais). L'entrée par le code est le ticket 02 ; le remplacement confirmé est le ticket 06.

**La forme du code** (`src/core/auth/code.ts`, à côté de l'alphabet existant — `I1` interdit à un
fichier de `core/` d'en importer un autre) :
- `engendrerCodeDeSecours()` tire 26 signes de l'alphabet Crockford déjà en place (32 signes, sans
  I, L, O, U), un octet par signe par `crypto.getRandomValues` : 256 est un multiple de 32, aucun
  biais ; 130 bits.
- `grouperCodeDeSecours(code)` rend la forme affichée, en groupes de quatre séparés par une espace
  (le dernier groupe compte deux signes).
- La saisie se ramènera par `normaliserCode`, déjà en place.

**La conservation** (FR-011) — migration additive `migrations/0016_code_de_secours.sql` :
`create table if not exists code_de_secours (id integer primary key check (id = 1), empreinte text not null, cree_le integer not null)`.
`check (id = 1)` fait qu'au plus un code est en place (patron de `fenetre_seuil`, `migrations/0012`).
Pas de ligne = aucun code. Seule l'empreinte `SHA-256(normaliserCode(code))`, en hexadécimal, est
écrite ; jamais la valeur, ni affichée ni normalisée. Pas de sel ni de dérivation lente : le secret
est uniforme sur 2^130 (ADR-0032, design D1).

**Le module** `src/platform/auth/code-de-secours.ts`, autonome (`I1`/`I2` : il n'importe que
`core/`, ni `src/platform/session/` ni `magasin.ts`) ; il reprend la même définition de table en
`create table if not exists` pour les bases de test (patron défensif existant) :
- `lireEtatCodeDeSecours(db)` → `{ enPlace: false } | { enPlace: true, depuis }` ;
- `mettreEnPlaceCodeDeSecours(db, sessionCourante, maintenant)` → le code en clair, rendu une seule
  fois. Dans ce ticket, il écrit la ligne par
  `insert into code_de_secours (id, empreinte, cree_le) values (1, ?, ?) on conflict (id) do update set empreinte = excluded.empreinte, cree_le = excluded.cree_le`.
  La fermeture des autres sessions, qui entre dans la même transaction (`db.batch`), est livrée au
  ticket 06 ; la signature prend déjà `sessionCourante`.

**L'écran** `src/pages/admin/code-de-secours.astro`, gardé : sans session, renvoi vers l'écran de
connexion (`verifierSession`, ADR-0007) et rien n'est écrit. Rendu serveur, sans directive `client:*`
(`I4`), avec les pièces de `src/admin/composants/ui/` (`Card`, `Alert`, boutons), dans la mise en
page de l'administration ; la rubrique active du menu reste « Réglages ».
- En tête : « Code de secours », puis « Le code de secours vous permet d'entrer si vous n'avez plus
  accès à votre boîte e-mail. Il ne sert qu'une fois ; un nouveau vous est alors donné. »
- **Aucun code** : message ambre « Aucun code de secours n'est en place. » et bouton primaire
  « Créer le code de secours » (formulaire `method="post"`).
- **Un code en place** : « Un code de secours est en place depuis le 8 novembre 2026. » (date en
  français, jour mois année) et bouton secondaire « Remplacer le code de secours ». La valeur n'est
  jamais affichée. La confirmation du remplacement est le ticket 06.
- **POST** : `mettreEnPlaceCodeDeSecours`, puis la réponse **rend directement** le nouveau code, sans
  redirection, avec `Cache-Control: no-store` (patron de `src/pages/admin/publier.astro`).
  Anti-forgerie : le cookie `SameSite=Strict` (ADR-0011) et `checkOrigin` d'Astro.

**L'affichage du nouveau code** — un composant serveur `src/admin/NouveauCodeDeSecours.astro`,
réutilisé par l'entrée par le code (ticket 03) :
- titre « Votre nouveau code de secours » ; le code groupé, en chasse fixe, en gros caractères,
  sélectionnable ;
- « Recopiez-le ou imprimez cette page, et rangez le papier en lieu sûr. » puis « Ce code ne
  s'affichera plus. L'ancien ne permet plus d'entrer. » ;
- boutons « Imprimer », qui ouvre l'impression du navigateur par un `<script>` Astro empaqueté (servi
  depuis l'origine, admis par `script-src 'self'`, patron de `src/pages/admin/mes-pages.astro` ; ni
  îlot, ni gestionnaire en ligne), et « Continuer », qui mène ici à l'écran « Code de secours ». Le
  code lui-même n'entre jamais dans ce script ;
- à l'impression, seule la carte du code sort : ni menu, ni bouton.

**Le lien depuis Réglages** : sous les cartes de `src/pages/admin/reglages.astro`, un lien « Code de
secours ». Ce n'est pas une carte de réglage : ni brouillon, ni restauration, ni place au
récapitulatif de publication.

Tous les textes vivent dans `src/admin/textes.ts`, sans terme de développeur (FR-117).

**Recette.** Ajouter au cahier (`docs/cahier-de-test.md`) une section pour ce ticket : à 360 px, ni
l'écran « Code de secours » ni l'affichage du nouveau code ne font défiler la page horizontalement, et
le code n'est pas coupé au milieu d'un groupe ; l'impression de l'affichage tient sur une page et ne
porte que le code et sa consigne.

**Hors de ce ticket.** La fermeture des autres sessions et la confirmation du remplacement (06) ;
l'écran de saisie du code (02) ; tout outil de livraison en ligne de commande (Epic D).

## Critères
- [ ] l'écran « Code de secours », ou son geste de création, demandé sans session ouverte renvoie vers l'écran de connexion, et aucun code n'est mis en place   (SC-01a)
- [ ] l'écran Réglages porte un lien vers l'écran « Code de secours »   (SC-01b)
- [ ] sur une instance où aucun code de secours n'est en place, l'écran dit qu'aucun code n'est en place et offre de le créer   (SC-01c)
- [ ] alors qu'un code de secours est en place, l'écran dit la date à laquelle il a été mis en place, et la valeur du code n'y paraît pas   (SC-01d)
- [ ] l'éditrice crée le code de secours : la réponse affiche le nouveau code et invite à le recopier ou à l'imprimer, elle interdit à tout intermédiaire de la conserver (`Cache-Control: no-store`), et revenir ensuite à l'écran ne le montre plus   (SC-01e)
- [ ] un code de secours engendré compte vingt-six signes de l'alphabet sans confusables, et il est affiché en groupes séparés   (SC-01f)
- [ ] sur un grand échantillon fixe de codes engendrés (par exemple 32 000), chaque signe de l'alphabet paraît à chaque position avec la fréquence attendue, dans une borne large choisie pour ne pas rougir par hasard plus d'une fois sur un million   (SC-01g)
- [ ] juste après la mise en place d'un code, sa valeur, sous sa forme affichée comme sous sa forme normalisée, ne se trouve dans aucune colonne texte d'aucune table de la base (tables relevées dans `sqlite_master`)   (SC-01h)
- [ ] la mise en place d'un code ne change ni la configuration du déploiement, ni le fichier d'instance, ni aucune liaison ou secret de la plateforme : test minimal qui constate que la création n'écrit que la ligne de `code_de_secours`, et ne touche à aucune liaison de l'environnement hors la base   (SC-01i)
