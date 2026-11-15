# 01 — L'adresse de connexion se reconnaît sans tenir compte des majuscules ni des espaces de bord

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/platform/auth/magasin.ts`, `src/pages/admin/connexion.astro`, `src/pages/admin/adresse-e-mail.astro`, `tests/integration/adresse-de-connexion-sans-casse.test.ts`

## Ce que ça livre

Sur `/admin/connexion`, l'éditrice saisit son **adresse autorisée** ; le produit écrit un code de
connexion et demande son expédition (change 001). La réponse est la même pour toute adresse, au même
moment (FR-008) : rien à l'écran ne dit si un code est parti.

**Le défaut corrigé** (issue #354, recette globale du 2026-11-12) : l'adresse autorisée saisie avec
une majuscule ne crée aucun code et n'envoie rien. Le clavier d'un téléphone met de lui-même une
majuscule en tête quand il ne s'ouvre pas en disposition d'adresse. L'éditrice attend un code qui ne
viendra pas.

**État du code.** `src/pages/admin/connexion.astro` lit la saisie telle quelle
(`String(donnees.get('adresse') ?? '')`), appelle `estAdresseAutorisee(env.DB, adresse)`
(`src/platform/auth/magasin.ts`, requête `where adresse = ?1 limit 1`), puis expédie **à la saisie** :
`demanderExpeditionDuCode(env.EXPEDITEUR_CODE_CONNEXION, adresse, code, __ADRESSE_EXPEDITEUR__)`.
L'adresse enregistrée dans `adresses_autorisees` peut porter des majuscules : la semence et le
remplacement de l'adresse l'enregistrent telle qu'on la leur donne.

**Ce que ce ticket livre** (design D1 à D3) :

- La reconnaissance de `src/platform/auth/magasin.ts` prend la saisie, lui retire ses espaces de
  bord, et rend **l'adresse enregistrée** qui lui est égale sans tenir compte de la casse, ou `null`
  — au lieu d'un booléen. La comparaison se fait en base sur des minuscules
  (`lower(adresse) = ?1`, la saisie mise en minuscules côté code), en une seule requête `limit 1`.
  Aucune migration : une adresse enregistrée avec des majuscules est reconnue telle quelle.
- `connexion.astro` expédie le code **à l'adresse rendue par la base**, jamais à la saisie : aucun
  message ne part hors de l'adresse autorisée (FR-005), quelle que soit la casse saisie.
- Tout le reste de la soumission est inchangé : même corps, mêmes champs d'en-tête, même délai
  plancher, même plafond, même seuil. Une adresse qui n'est pas l'adresse autorisée n'écrit rien et
  ne demande rien, comme aujourd'hui.
- Le champ d'adresse de `connexion.astro` porte `inputmode="email"`, comme les champs de
  `reglages.astro` le font par nature. Le champ `adresse` de `src/pages/admin/adresse-e-mail.astro`
  reçoit le même attribut (même geste, sans critère propre : la capacité
  `remplacement-adresse-autorisee` ne change pas).

**Tests.** Intégration dans `workerd` (ADR-0014), D1 réelle, sur `POST /admin/connexion`, dans un
fichier neuf. Reprendre le montage de `tests/integration/code-vers-adresse-autorisee.test.ts` (schéma,
adresse semée, cookie d'appareil, espion d'expédition vu depuis la route, en-tête `Origin`) sans le
modifier. Oracle : une ligne de plus dans les codes de connexion, et le destinataire remis à l'espion
égal à l'adresse **enregistrée**. Cas limites : majuscule en tête, tout en majuscules, espaces et
tabulation en bord, adresse enregistrée `Editrice@Example.com` soumise en minuscules ; une adresse
voisine (`editrice@example.org`) n'écrit toujours rien. Les tests existants de la connexion restent
verts sans retouche, dont « Les temps de réponse ne distinguent pas les branches ».

**Limite acceptée** (design, risques) : `lower` de SQLite ne plie que les lettres ASCII ; une adresse
enregistrée avec une majuscule accentuée n'est reconnue qu'à l'identique.

**Hors périmètre** : normaliser les adresses déjà enregistrées ou celle proposée sur l'écran
« Adresse e-mail » ; reconnaître des variantes d'adresse (points, suffixe `+…`) ; la publication
(ticket 02) ; `docs/cahier-de-test.md` (le cas CT-18.10 sera complété après la fusion de la recette
globale, PR #350, qui modifie ce fichier).

## Critères

- [ ] Quand l'adresse autorisée est soumise avec une ou plusieurs lettres en majuscule : un code est écrit, et son expédition est demandée vers l'adresse autorisée telle qu'elle est enregistrée   (SC-01a)
- [ ] Quand l'adresse autorisée est soumise précédée ou suivie d'espaces : un code est écrit, et son expédition est demandée vers l'adresse autorisée telle qu'elle est enregistrée   (SC-01b)
- [ ] Quand l'adresse autorisée est enregistrée avec des majuscules et qu'elle est soumise en minuscules : un code est écrit, et son expédition est demandée vers l'adresse autorisée telle qu'elle est enregistrée   (SC-01c)
- [ ] Quand l'écran de connexion est affiché : le champ de l'adresse demande explicitement à l'appareil un clavier d'adresse e-mail   (SC-01d)
