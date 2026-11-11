## Why

La recette du change 017 a rendu un KO sur CT-47.2 (`docs/cahier-de-test.md` § 47) : quand l'éditrice
clique dans le message de Cloudflare puis revient aussitôt à l'écran « Adresse e-mail », le produit
lui dit « Un code vient de partir » alors qu'aucun message n'arrive. Cloudflare tient l'adresse pour
vérifiée, mais refuse encore d'y écrire pendant plusieurs dizaines de secondes, et le produit ne
regarde pas l'issue de l'envoi. C'est le geste le plus naturel du parcours qui échoue, et chaque
nouvel essai entame le plafond de cinq messages par heure.

Mesures de la recette, sur `colibri.sebc.dev` :

| Essai | Délai après le clic chez Cloudflare | Issue |
|---|---|---|
| 2026-11-10 | 16 s, puis 30 s | aucun message reçu |
| 2026-11-10 | 3 min 36 s | reçu en 1 s |
| 2026-11-11 | 2 s | ligne de journal « envoi du code échoué » |
| 2026-11-11 | 45 s, puis 91 s | reçus |

Sert l'**Epic C — Filets & reprise**, story « Remplacement de l'adresse autorisée »
(`docs/roadmap.md`) ; couvre **FR-014** (la preuve de maîtrise doit pouvoir aboutir) et respecte
**FR-117** (`docs/vision.md`). Corrige la capacité `remplacement-adresse-autorisee` introduite par le
change 017, dans le cadre de l'ADR-0033.

## What Changes

- **Une confirmation trop récente fait patienter.** Tant que Cloudflare a enregistré le clic depuis
  moins d'une minute, le produit n'écrit ni n'envoie aucun code. L'écran dit que le clic est bien
  enregistré et invite à represser le bouton dans un instant. Rien n'est compté au plafond.
- **L'écran ne dit « Un code vient de partir » qu'une fois l'envoi accepté.** Le produit attend
  l'issue de l'envoi avant de répondre. S'il est refusé, il réessaie brièvement, puis le dit à
  l'écran en mots simples et invite à redemander le code un peu plus tard.
- **Un code qui n'est pas parti ne coûte rien.** Il est annulé, et sa place au plafond de cinq
  messages par heure est rendue.
- **Le refus du plafond garde l'étape du code.** Quand un code encore bon est en circulation et que
  le plafond refuse d'en envoyer un autre, l'écran garde le champ de saisie : l'éditrice peut toujours
  recopier le code qu'elle a reçu. (Constaté en recette : l'écran revenait à l'étape précédente.)
- **Une adresse longue se lit en entier sur un téléphone.** À 360 px, l'adresse revient à la ligne au
  lieu d'être rognée par le bord de la carte, à toutes les étapes de l'écran.

Aucun changement cassant. Aucune donnée nouvelle, aucune table nouvelle, aucun secret nouveau.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `remplacement-adresse-autorisee` : l'exigence « Le code du produit ne part qu'une fois la
  confirmation de Cloudflare constatée » gagne l'attente d'une minute et l'annonce fidèle de l'envoi ;
  l'exigence « Le plafond de cinq messages par heure pour le remplacement » ne compte plus un code qui
  n'est pas parti et garde l'étape du code à son refus ; l'exigence « L'écran « Adresse e-mail »
  montre l'adresse et propose de la remplacer » gagne la lisibilité d'une adresse longue.

**Préalable d'archivage.** Le change 017 devait être archivé avant celui-ci, sans quoi les exigences
modifiées n'auraient pas de cible. C'est fait (`openspec/changes/archive/2026-11-11-017-remplacement-adresse-autorisee`) :
la capacité est désormais une spec vivante, `openspec/specs/remplacement-adresse-autorisee/spec.md`.

## Impact

- **Code** : la route `src/pages/admin/adresse-e-mail.astro` (étape « vérifier ») ; l'adaptateur
  `src/platform/adresses-cloudflare/` (rendre l'instant de vérification) ; `src/platform/auth/
  remplacement-adresse.ts` (annuler un code non parti, rendre sa place) ; les textes de l'écran ;
  la carte de l'écran sous `src/admin/`.
- **Tests** : intégration dans `workerd` (double de l'API des adresses, espion de l'envoi) ; le cas
  CT-47.2 du cahier se rejoue en recette, avec un cas neuf pour la confirmation trop récente.
- **Plateforme** : aucun appel sortant nouveau, aucune permission nouvelle pour la clé.
- **Hors périmètre** : le classement en courriers indésirables des messages du produit, et le
  rangement par Gmail d'un second message de Cloudflare dans la conversation du premier — deux
  constats de recette qui ne dépendent pas du produit.
