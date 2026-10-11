# 19 — Recette : une modification publiée est en ligne en moins de 5 minutes

**Bloqué par :** 07, 09, 16, 17, 18
**Vérif :** observé
**Fichiers :** `.claude/skills/recette/SKILL.md`, `.claude/skills/recette/scripts/recette.mjs`, `docs/architecture/context.c4`, `docs/architecture/flows.c4`, `docs/cahier-de-test.md`

## Ce que ça livre

La chaîne réelle de publication est montée sur l'instance de recette (`colibri.sebc.dev`) et prouvée
de bout en bout. L'éditrice modifie un texte, publie et confirme. La page publique présente la
modification **moins de 5 minutes** après la confirmation (SC-004), et l'administration dit la
publication en ligne.

On constate aussi, sur la vraie chaîne, ce qu'aucun test automatisé ne peut voir :
- les images partent avant le contenu, sur leur propre branche ;
- seul le dépôt de la branche principale déclenche la reconstruction du site (FR-089) ;
- la reconstruction automatique récupère bien la branche des images. C'est un point bloquant hérité,
  ni documenté ni infirmé à ce jour.

On mesure enfin le bail et la borne de 30 minutes contre les durées réelles.

**Décisions à respecter :**
- **Trois gestes humains**, guidés par le skill `recette` mis à jour :
  1. un dépôt GitHub **privé** pour le site de recette ;
  2. une clé à portée fine sur ce seul dépôt (`Contents: Read and write`), posée en secret
     `JETON_DEPOT` du Worker de recette ;
  3. la reconstruction automatique (Workers Builds), branchée sur la **seule** branche principale.

  Les identifiants du compte de recette vivent dans le dépôt de recette, jamais dans le dépôt produit.
- **Branche des images** : si la reconstruction automatique ne l'atteint pas sans clé, une clé en
  lecture seule (`Contents: Read-only`, secret du compte) est passée au script de récupération, qui
  l'accepte déjà en variable d'environnement facultative (ticket 02).
- **Mesures**, consignées au cahier de recette :
  - la durée d'une publication à 1 et à 40 images ;
  - la durée d'une reconstruction ;
  - leur comparaison à `BAIL` (5 minutes) et à `BORNE_MISE_EN_LIGNE` (30 minutes).

  ADR-0023 laisse ces valeurs au change. Si les mesures les infirment, les constantes se corrigent dans
  `core/`, sans toucher l'ADR.
- **Modèle d'architecture** dans `context.c4` :
  - système externe `workers-builds` (`#external`) ;
  - `github -[async]-> workers-builds 'déclenche la reconstruction (branche principale seule)'` ;
  - `workers-builds -[async]-> colibri-cms.worker 'bâtit, récupère les images, déploie'`.

  Une vue dynamique `flow-publication` s'ajoute dans `flows.c4`, et `likec4 validate --no-layout
  --json --project colibri-cms docs/architecture` reste vert.
- **Cahier de recette** : un paragraphe par ticket du change pour ce qu'un test ne voit pas, joué au
  navigateur en fin de front. On y trouve le gabarit public sur 360 px sans défilement horizontal,
  l'écran Publier sur téléphone, « Publier » visible tiroir fermé, et le bandeau d'aperçu.
- Preuve **observée** : chronométrage, captures et journaux de la vraie chaîne. Ce que l'agent ne peut
  pas constater lui-même est remonté pour un constat humain, jamais attesté à sa place.

**Hors périmètre :** le Cron de maintien en vie de la clé, le déploiement d'une instance au nom du
client, la reconstruction sans le CMS, la convention de flotte pour les identifiants d'instance
(Epic D).

## Critères
- [ ] Sur l'instance de recette, quand l'éditrice modifie un texte, publie et confirme, la page publique présente la modification moins de 5 minutes après la confirmation (SC-004), et l'administration dit la publication en ligne   (SC-19a)
- [ ] Quand une publication dépose des images et du contenu, les images sont déposées sur la branche des images avant que le contenu ne soit déposé sur la branche principale, et seule la branche principale déclenche la reconstruction   (SC-19b)
