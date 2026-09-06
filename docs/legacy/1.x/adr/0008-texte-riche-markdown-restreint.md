# ADR-0008 : Texte riche — Markdown restreint aux marques testées et aux schémas d'URL autorisés
Statut : Accepté | Date : 2026-08-13 | Trace vers : [docs/stack.md](../stack.md) — candidat n° 8, ligne « Texte riche »

## Contexte

`FR-018` fait porter du texte riche à un emplacement éditable, et `FR-117` interdit tout terme
de développeur dans l'interface d'édition : l'éditrice met en forme, elle n'écrit pas de
balises. `SC-011` (épreuve de réversibilité) veut que ce contenu reste lisible en fichiers.

Le contexte de sécurité est posé par
[ADR-0001](./0001-cible-de-deploiement-worker-unique-workers-builds.md) : le site public et
l'administration sont servis par **un même Worker**, donc par une **même origine**. Tout
contenu tiers exécuté côté public vaut vol du cookie de session de l'éditrice. Et le PRD
envisage explicitement le cas où l'administration est compromise.

Le choix se joue donc sur la nature du **risque résiduel**, et les deux formes n'ont pas le
même : un assainissement de HTML raté est un risque dont on ne prouve **jamais** l'absence ;
une marque perdue à la sérialisation est un défaut qu'un aller-retour **rejoue**.

## Décision

Nous sérialiserons le texte riche en **Markdown restreint**, sur deux axes :

- les **marques**, bornées à celles dont l'aller-retour de sérialisation est testé ;
- les **URL** — seuls `https`, `mailto`, `tel` et les chemins relatifs sont admis, tout autre
  schéma est rejeté — et **aucun HTML brut** n'est accepté au rendu.

L'éditeur sera **TipTap**.

## Conséquences

**Positives.**

- Le risque résiduel devient **testable** : un aller-retour de sérialisation se rejoue
  mécaniquement, et la phase `ci` le rend bloquant. On échange un risque qu'on ne sait pas
  fermer contre un risque qu'on sait fermer.
- La restriction d'URL ferme une porte que la restriction de marques laissait ouverte : une
  marque autorisée peut porter une cible qui ne l'est pas.
- Le filtre vit dans le **rendu partagé**, donc il couvre d'un seul geste le site bâti et
  l'aperçu de `FR-081` — sans mécanisme neuf, c'est le contrôle déjà prévu pour l'aller-retour
  qui gagne un second volet.

**Négatives — ce à quoi le code s'engage.**

- **La fidélité est moindre.** Ce que l'éditrice peut exprimer est borné par la liste des
  marques, et non par ce que TipTap sait produire. Chaque marque ajoutée plus tard demande un
  aller-retour testé avant d'être admise.
- **Sans le contrôle bloquant, la perte est silencieuse.** Une marque autorisée qui ne se
  sérialise pas disparaît à la publication sans message, et l'éditrice ne s'en aperçoit qu'à
  l'écran public. La décision **dépend** donc du contrôle de `docs/ci.md` : elle n'est pas
  auto-portante.
- **Un lien vers un schéma non listé est rejeté**, y compris quand il serait légitime. C'est un
  coût réel côté éditrice, assumé au profit d'une liste blanche fermée plutôt que d'une liste
  noire à entretenir.

## Alternatives considérées

- **HTML restreint** : écartée bien qu'il soit **plus fidèle**. Il faudrait assainir sur deux
  chemins, et le PRD envisage explicitement le cas où l'administration est compromise — où du
  HTML stocké deviendrait du contenu tiers servi à chaque visiteuse, sur la même origine que
  l'administration. Un assainissement raté est un risque dont on ne prouve jamais l'absence.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase Stack, étendue aux
  schémas d'URL le 2026-08-11 par le traitement de `S-06`. Revue humaine : 2026-08-13.
