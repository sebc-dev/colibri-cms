## Why

L'éditrice n'a aujourd'hui aucun moyen de défaire une correction. Une page, un réglage ou un formulaire
qu'elle a écrasé par erreur garde son brouillon jusqu'à la prochaine publication. Elle ne peut alors que
tout ressaisir à la main, ou publier l'erreur. SC-009 exige qu'elle retrouve **seule** la version
publiée. ADR-0026 compte aussi sur ce geste : une option de départ que l'intégrateur ajoute n'atteint un
champ déjà enregistré que si l'éditrice abandonne son brouillon.

Sert l'**Epic C — Filets & reprise**, story « Restauration : retour à la dernière version publiée »
(`docs/roadmap.md`) ; couvre **FR-092**, **FR-093**, **FR-094** et **SC-009** (`docs/vision.md`).

## What Changes

- L'éditeur d'une page, chaque carte de l'écran Réglages et l'écran d'un formulaire offrent un geste
  **« Revenir à la version publiée »**, tant que l'objet porte un brouillon.
- Le geste demande une confirmation, puis supprime le brouillon de cet objet et de lui seul. L'écran
  présente aussitôt la dernière version publiée, sans marque de brouillon. Un objet jamais publié
  reprend son contenu de départ, celui que le site en service montre.
- Le site public ne change pas. L'objet restauré quitte le récapitulatif de publication, et la
  publication suivante ne le réécrit pas.
- Aucun état plus ancien que la dernière version publiée n'est proposé, et le geste ne se défait pas.

## Points tranchés

Le détail est dans `design.md` § Decisions.

1. **Une page se restaure en entier.** Le brouillon d'une page couvre tous ses emplacements corrigés,
   et le geste les abandonne ensemble. Il n'y a pas de geste par emplacement : FR-092 parle du brouillon
   d'une page, et un geste par emplacement multiplierait les boutons sur l'écran le plus chargé. Chaque
   réglage (Coordonnées, Réseaux sociaux, Mention d'information) et chaque formulaire se restaure seul,
   comme il porte seul son brouillon.
2. **Une confirmation avant d'abandonner.** Le geste détruit un travail qu'aucune copie ne garde
   (ADR-0019). La confirmation nomme l'objet et dit que ses modifications seront perdues.
3. **Pas d'abandon pendant une publication.** Une publication confirmée emporte déjà le contenu des
   brouillons. Abandonner à ce moment ne retiendrait pas la correction, qui partirait quand même en
   ligne. Le geste est donc refusé, avec un message qui le dit, tant qu'une publication confirmée n'a
   pas fini de déposer, y compris quand elle s'est interrompue et attend d'être reprise.
4. **Images.** Une image posée seulement par le brouillon abandonné n'est plus posée nulle part. Elle
   paraît alors au récapitulatif parmi les images qui seront effacées, comme tout téléversement jamais
   posé. Une image « supprimée » depuis l'écran Médias, dont le retrait n'était écrit qu'au brouillon,
   redevient posée par la version publiée et cesse d'être à effacer.
5. **Un identifiant d'option ne revient pas.** Les identifiants donnés aux options d'un brouillon de
   formulaire abandonné ne sont jamais redonnés (ADR-0018, ADR-0026).

## Capabilities

### New Capabilities

- `restauration` : le geste « Revenir à la version publiée » sur une page, un réglage ou un
  formulaire ; sa confirmation ; son effet borné à l'objet (FR-093) ; l'absence de tout état antérieur
  (FR-094) ; son refus pendant une publication ; la conservation des identifiants d'option.

### Modified Capabilities

Aucune. Les exigences existantes dérivent déjà la marque de brouillon, le récapitulatif et l'aperçu de
la présence d'un brouillon. Elles restent vraies une fois le brouillon retiré.

## Impact

- **Code** : trois routes d'écriture nouvelles sous `src/pages/admin/` (page, réglage, formulaire),
  gardées par la session ; des fonctions de suppression dans les magasins de brouillons
  (`src/platform/brouillons/`, `src/platform/reglages/`, `src/platform/formulaires/`) ; un îlot de
  confirmation partagé dans `src/admin/ilots-svelte-5/` ; ses textes dans `src/admin/textes.ts`.
- **Base** : une migration additive garde le dernier numéro d'option donné par champ, pour qu'il
  survive à l'abandon du brouillon.
- **Tests** : intégration dans workerd sur le patron de `tests/integration/outils-publication.ts`.
- **Hors périmètre** : la description et le nom d'une image (FR-092 ne vise que pages, réglages et
  formulaires), l'abandon d'un seul emplacement, tout historique de versions, et toute lecture du
  dépôt du client.
