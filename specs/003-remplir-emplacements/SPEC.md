# 003 — Remplir et corriger les emplacements d'une page

## Problème
Remplir seule ses pages est le geste central du produit (SC-003, SC-015 après des mois sans usage). Or
l'administration, après 001 (connexion) et 002 (socle d'îlots), n'a qu'un accueil vide, sans même de quoi
naviguer : ni menu, ni liste des pages, ni écran d'édition, ni enregistrement. Deux garde-fous ne
pardonnent pas — l'éditrice ne doit rien pouvoir casser de la mise en page (UX-3, FR-024/025), et aucune
correction ne doit toucher le site public tant qu'elle n'a pas publié (FR-026).

## Solution
Cette feature pose le **cadre de navigation de l'administration** — une barre latérale rétractable qui
porte le menu des rubriques — et y branche la première : « Mes pages ». L'éditrice voit ses pages, chacune
marquée si elle porte un brouillon (FR-015/016), ouvre une page, retrouve les emplacements posés par
l'intégrateur, et en corrige le contenu — texte riche, lien de vidéo, bouton d'action (FR-017/018/022/023).
Chaque correction va au brouillon (FR-026). La structure — quels emplacements, de quelle nature, dans quel
ordre — est posée par l'intégrateur et jamais offerte à la modification (FR-024/025). Le texte riche se met
en forme sans balise, et se range en Markdown restreint.

## Ce que ça change, concrètement
- L'administration présente une barre latérale portant le menu des rubriques ; « Mes pages » y est la
  rubrique active. La barre se replie en un rail d'icônes et se redéploie.
- La liste des pages s'affiche ; chaque page dit si elle porte un brouillon non publié.
- Ouvrir une page présente ses emplacements dans l'ordre posé, chacun avec le moyen d'édition de sa nature.
- Corriger un emplacement de texte riche — gras, italique, lien, liste, titre — sans jamais écrire de
  balise, et sans marque hors de celles retenues.
- Régler un emplacement de lien de vidéo : coller un lien externe reconnu ; un lien non reconnu est refusé
  en le disant.
- Régler un emplacement de bouton d'action : son libellé et sa destination.
- Toute correction bascule la page à l'état « brouillon » dans la liste, et reste sans effet sur le site public.
- Aucun geste n'ajoute, ne retire, ne déplace ni ne renomme un emplacement ou une page ; rien ne l'offre à l'écran.
- Aucun terme de développeur ne paraît dans le menu ni dans les textes du parcours (FR-117).

## Décisions d'implémentation
- **Le cadre est un unique îlot d'administration monté en application** — substrat de 002 (candidat
  `ilots-svelte-5`, ADR-0024 : aucune directive `client:*` sous `src/admin/`) : la barre latérale et le menu
  sont ce même îlot, pas une hydratation par page. L'état replié/déployé est une préférence retenue sur
  l'appareil (UX-2), sans effet serveur. Seule « Mes pages » y est branchée ; les autres rubriques ne font
  que situer la navigation (voir hors-périmètre).
- **Le modèle d'emplacement et l'application d'une correction vivent dans `core/`, sans base ni HTTP** —
  ADR-0022 (`src/core/` n'importe ni framework ni plateforme) et ARCH-5 : appliquer une correction à un
  brouillon, en dériver l'état « porte un brouillon », refuser une correction de structure — logique pure,
  la couture de test la plus haute.
- **Le brouillon est porté par D1** — candidat `magasin-d1-brouillons-etat-publie-et-demandes` : la
  correction écrit le brouillon de la page ; l'état publié reste intact jusqu'à la publication (feature distincte).
- **Le texte riche est édité par TipTap et sérialisé en Markdown restreint** — candidat
  `texte-riche-markdown-restreint` : l'éditrice met en forme, elle n'écrit pas de balise (FR-117) ; seules
  les marques et schémas d'URL retenus survivent. Le rendu HTML n'est pas ici (I5 / `render/markdown/`, il
  naît avec l'aperçu).
- **Première écriture depuis une session ouverte → le jeton anti-forgerie naît ici** — 001 le renvoyait « à
  la première écriture » ; enregistrer une correction l'est. Décision structurante déposée en candidat (voir rapport).
- **La déclaration des pages et emplacements est posée par l'intégrateur, hors administration** — le produit
  la lit, ne l'écrit pas (FR-024/025) ; sa forme s'accorde au format déposé (candidat
  `format-du-contenu-un-repertoire-par-objet`). Lieu et contrat déposés en candidat (voir rapport).

## Décisions de test
- **Couture haute — les fonctions de `core/`**, instanciées directement (ADR-0013, Vitest dans `workerd`) :
  correction appliquée au brouillon, dérivation de l'état « brouillon », refus d'une correction de
  structure, sérialisation du texte riche (marque interdite écartée, schéma d'URL non autorisé écarté).
- **Couture d'intégration — la requête HTTP contre le produit** (comme 001), contre la vraie base locale :
  une correction persistée bascule l'état de la page et laisse l'état publié intact.
- **Observé — l'écran sous CSP stricte** (comme 002) : le cadre et son menu, le repli/déploiement, l'édition
  d'un emplacement de bout en bout et l'absence de tout geste de structure (FR-024/025) se constatent au
  rendu, pas en test unitaire.
- **Prior art** : suites de 001 (`tests/integration/**`, couture HTTP) et de 002 (rendu sous CSP),
  déclaration de zones `eslint.config.boundaries.js`.

## Hors-périmètre
- **Les rubriques autres que « Mes pages »** — Médias, Réglages, Formulaires, Demandes sont des features
  distinctes ; leur entrée de menu ne mène à aucun écran servi ici, elle ne fait que situer la navigation.
- **Les emplacements porteurs d'image — image, galerie, carrousel (FR-019/020/021)** — arbitré le
  2026-09-04 : ils exigent le vivier et le téléversement portés par « Bibliothèque de médias » (FR-027→040,
  où « poser une image dans un emplacement » FR-033 est rangé). Ils reviendront en aval.
- **L'aperçu et la publication (FR-080→091)** — feature distincte. Ici la correction n'atteint que le
  brouillon en D1 ; ni rendu public, ni mise en ligne. Le rendu partagé (I3 / ADR-0023) naît avec l'aperçu.
- **L'abandon d'un brouillon et le retour à la version publiée (FR-092→094)** — feature « Restauration », Epic C.
- **La déconnexion explicite** — 001 la laisse à l'expiration ; le cadre n'introduit aucun geste de sortie.
- **La saisie de la déclaration des pages/emplacements** — geste d'intégration hors produit. Une instance
  sans page déclarée présente une liste vide, et rien ne le signale à l'éditrice.
