# 05 — Une correction des coordonnées s'enregistre au brouillon

**Bloqué par :** 03, 04
**Vérif :** test
**Fichiers :** `migrations/0007_brouillons_reglages.sql`, `src/core/reglages/coordonnees.ts`, `src/platform/reglages/magasin.ts`, `src/platform/reglages/corps.ts`, `src/pages/admin/reglages/coordonnees.ts`, `tests/integration/enregistrer-coordonnees.test.ts`

## Ce que ça livre

L'éditrice peut désormais enregistrer, en un geste, toutes les valeurs de la carte Coordonnées : le
réglage Coordonnées porte alors un **brouillon**, sans que le contenu déclaré (`content/reglages/`) ni
le site public soient touchés (FR-044). Une valeur vide est admise. Si une seule valeur est refusée, ou
si la soumission vise une coordonnée non déclarée, **rien** n'est enregistré et la réponse désigne le
champ refusé. La nature d'une coordonnée est **toujours** prise dans la déclaration, jamais dans la
soumission. Une écriture sans session, illisible, démesurée ou forgée depuis un autre site n'aboutit
pas. Ce ticket livre le comportement à la couture HTTP ; la carte qui l'appelle depuis l'écran arrive au
ticket 06.

**Décisions à respecter :**
- Migration **additive** `migrations/0007_brouillons_reglages.sql` : table
  `brouillons_reglages(reglage TEXT PRIMARY KEY CHECK (reglage IN ('coordonnees','reseaux','mention')),
  contenu TEXT NOT NULL, maj_le INTEGER NOT NULL)`. Aucune table existante touchée. **Une ligne par
  réglage** ; `contenu` est un JSON (ici : la table des valeurs par identifiant de coordonnée). « Porte un
  brouillon » se **dérive** de la présence de la ligne, jamais stocké (même règle que 0004).
- Magasin `src/platform/reglages/magasin.ts`, sur le patron de `src/platform/brouillons/magasin.ts` :
  lire le brouillon → appliquer la correction en `core/` → écrire (upsert de la ligne entière) **si et
  seulement si** acceptée. Table recréée défensivement au premier accès, comme `assurerTableBrouillons`.
  Requêtes D1 **préparées** (`prepare(...).bind(...)`) exclusivement. Il expose aussi la lecture des
  trois brouillons (consommée au ticket 06).
- En `core/` (`src/core/reglages/coordonnees.ts`, qui porte déjà les vérifications du ticket 03) :
  l'application d'une soumission entière — forme vérifiée champ par champ (un objet de valeurs texte par
  identifiant), identifiant non déclaré refusé, chaque valeur vérifiée selon la nature **déclarée**
  (toute nature annoncée par le corps est ignorée), valeurs enregistrées espaces de début et de fin
  retirés, refus si une seule valeur l'est.
- Route `POST /admin/reglages/coordonnees` (`src/pages/admin/reglages/coordonnees.ts`) : importe
  `verifierSession` (`I6`, ADR-0007) → `401` sans session. Lecture du corps **bornée à 64 Kio** (`413`
  au-delà), JSON invalide → `400`, forme inattendue → `400` ; jamais de `5xx` sur un corps mal formé.
  Refus de `core/` → `400 { ok: false, refus: [{ champ, raison }] }` (la raison est un **code**, jamais
  un texte affiché brut) ; succès → `200 { ok: true }`. La lecture bornée du corps vit dans
  `src/platform/reglages/corps.ts`, pour être réutilisée par les routes des tickets 07 et 08.
- Anti-forgerie : la session `SameSite=Strict` seule (ADR-0011, `I13`), **aucun** jeton dédié — le test
  d'une écriture forgée est celui d'une requête qui n'emporte pas le cookie (patron de
  `tests/integration/corriger-bouton-action.test.ts`, SC-04g du change 003).
- Aucun journal ne recopie les valeurs saisies (security-review du change).

**Hors périmètre :** la carte de l'écran et ses messages (ticket 06) ; les routes des réseaux et de la
mention (tickets 07, 08) ; l'abandon d'un brouillon ; la publication.

## Critères
- [ ] La table D1 des brouillons de réglages est créée par une migration versionnée additive, sans toucher aucune table existante   (SC-05a)
- [ ] Par la couture HTTP, enregistrer un téléphone « +33 1 23 45 67 89 », une adresse e-mail « atelier@exemple.fr » et une adresse postale de trois lignes écrit ces trois valeurs au brouillon des coordonnées, espaces de début et de fin retirés, et le réglage Coordonnées porte un brouillon   (SC-05b)
- [ ] Par la couture HTTP, enregistrer une valeur vide pour une coordonnée écrit cette valeur vide au brouillon   (SC-05c)
- [ ] Par la couture HTTP, enregistrer un téléphone valide et une adresse e-mail mal formée n'écrit aucun brouillon, et la réponse désigne le champ de l'adresse e-mail comme refusé   (SC-05d)
- [ ] Par la couture HTTP, une soumission qui annonce « texte d'une ligne » pour une coordonnée déclarée téléphone et lui donne la valeur « bonjour » voit la valeur vérifiée comme un téléphone, refusée, et rien n'est enregistré   (SC-05e)
- [ ] Par la couture HTTP, une soumission portant une valeur pour un identifiant qu'aucune coordonnée déclarée ne porte est refusée et rien n'est enregistré   (SC-05f)
- [ ] Par la couture HTTP, une correction d'un réglage soumise sans session ouverte est refusée et aucun brouillon n'est écrit   (SC-05g)
- [ ] Par la couture HTTP, en session, une correction soumise avec un corps qui n'est pas du JSON, dont la forme n'est pas celle attendue, ou de plus de 64 Kio est refusée sans erreur du serveur, et aucun brouillon n'est écrit   (SC-05h)
- [ ] Une écriture d'un réglage forgée depuis une autre origine n'aboutit pas, la session `SameSite=Strict` n'étant pas attachée à une requête cross-site (ADR-0011)   (SC-05i)
