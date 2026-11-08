# 05 — La présentation d'un code de secours compte dans le seuil de connexion

**Bloqué par :** 02
**Vérif :** tdd
**Fichiers :** `src/pages/admin/reprise.astro`, `tests/integration/code-de-secours-seuil.test.ts`

## Ce que ça livre

Le **code de secours** est le secret noté sur papier qui ouvre l'administration quand la boîte e-mail
de l'adresse autorisée ne répond plus. Il se présente sur l'écran de saisie `/admin/reprise`, dont le
POST appelle `ouvrirSessionParCodeDeSecours` (`src/platform/auth/code-de-secours.ts`).

Ce ticket fait **compter chaque présentation** d'un code de secours comme une tentative de connexion
de son origine, dans **le même compte** que les soumissions de l'écran de connexion : vingt par heure
et par origine (FR-007, ADR-0028). Au-delà, ou quand la base ne permet pas de compter, la présentation
est refusée **avant toute vérification** : aucun code n'est vérifié ni servi, aucune session ne
s'ouvre, aucun nouveau code n'est mis en place.

**En tête du POST** de `src/pages/admin/reprise.astro`, avant tout autre travail :
`compterEtJuger(env.DB, 'connexion', ip, debut)` (`src/platform/frequence/index.ts`), la **même
surface** `'connexion'` que `src/pages/admin/connexion.astro` — d'où un seul compte de vingt. L'origine
est la valeur de `CF-Connecting-IP`, lue comme la connexion la lit.
- `'refusee'` → le texte `TEXTE_ANNONCE_SEUIL` ; panne du compteur → `TEXTE_ANNONCE_PANNE`, sans
  annoncer le seuil (`src/admin/textes.ts`, les mêmes mots que l'écran de connexion, message ambre) ;
- dans les deux cas, la réponse n'est rendue qu'au terme de `DELAI_PLANCHER_MS`
  (`src/core/auth/regles.ts`) mesuré depuis le début de la soumission, et ni le texte, ni les
  en-têtes, ni le délai ne dépendent du code présenté ;
- `'traitee'` → le chemin existant (`ouvrirSessionParCodeDeSecours`).

Le seuil reste inchangé dans la capacité de connexion : c'est cette route qui y fait compter le code
de secours. Aucun frein propre au code de secours n'est ajouté (ADR-0032).

**L'oracle.** Vingt soumissions mêlées entre `/admin/connexion` et `/admin/reprise` depuis une même
valeur de `CF-Connecting-IP`, puis la vingt-et-unième refusée ; l'empreinte de `code_de_secours`
inchangée après un refus. Panne simulée par une base qui refuse l'écriture de `comptes_seuil` (patron
de `tests/integration/seuil-de-connexion.test.ts`).

**Hors de ce ticket.** Le refus d'un code faux sous le seuil (04).

## Critères
- [ ] une même origine fait, dans la même heure, vingt soumissions mêlées de l'écran de connexion et de l'écran du code de secours, puis présente un code de secours : la vingt-et-unième tentative est refusée et l'écran annonce le seuil   (SC-05a)
- [ ] au-delà du seuil de son origine, le code de secours en place est présenté : aucune session ne s'ouvre, et le code en place ouvre encore une session une fois l'origine revenue sous le seuil   (SC-05b)
- [ ] au-delà du seuil de son origine, sont présentés le code en place puis un code faux : les deux réponses portent le même texte et les mêmes champs d'en-tête, et toutes deux attendent le délai plancher   (SC-05c)
- [ ] la base refuse de compter la présentation du code de secours en place : aucune session ne s'ouvre, le code en place reste valable, et l'écran dit que la connexion n'a pas pu se faire, sans annoncer le seuil   (SC-05d)
