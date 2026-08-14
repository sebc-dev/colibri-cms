# Durcissement du portail CI

Portée : socle
Ouvert le 2026-08-14 · branche `work/reprise-socle-v2` · HEAD `00927eb`

## Objectif
Faire monter en bloquant ce que la phase `ci` a dû laisser informatif, sur mesure et non sur
conviction — et poser les trois contrôles qu'elle n'a pas su écrire faute de code.

## Contexte à charger
à lire  `docs/ci.md` § Registre des ADR vérifiés et § Ce que ces contrôles ne couvrent pas — les
        deux seules rubriques dont ce chantier dépend

## Acquis
- J'ai arbitré le 2026-08-14 que `coverage`, `sast` et `arch-invariants` resteraient informatifs :
  aucun n'avait jamais tourné sur du code de ce projet, et un chiffre posé sans mesure est un pari.
- J'ai retenu la mesure **par rejeu sur l'historique du dépôt**, et pas sur une fenêtre de temps :
  le volume de PR d'un développeur seul ne suffit pas à estimer un taux en temps réel.
- J'ai fixé le seuil à ~10-15 % de faux positifs, **dans les deux sens** : au-delà, un bloquant
  redescend informatif.
- J'avais noté que six ADR acceptés — `0006`, `0008`, `0009`, `0012`, `0015`, `0024` — écrivent au
  présent qu'un contrôle **bloquant** porte leur propriété. Huit clauses. C'est ce chantier qui
  ferme l'écart, et rien d'autre.

## Prochaine étape
Rejouer `.github/scripts/arch-invariants.sh` sur l'historique du dépôt une fois le scaffold posé,
compter les signalements et les trier vrai / faux, puis décider invariant par invariant.

## Ce qui restait à écrire
- `[à compléter]` **dependency-cruiser** — `I1` (sens des dépendances entre zones) et `I3` (point
  d'entrée unique du rendu) exigent un graphe d'imports résolu. Réserve à instruire : l'outil ne
  parse pas les fichiers `.astro`, et une partie des zones en est faite.
- `[à compléter]` **la composition inerte de l'e-mail acheminé** (`ADR-0009`) — le gabarit n'existe
  pas, son chemin n'est pas décidé, et aucun motif ne se dérive sans l'inventer. La cinquième porte
  reste ouverte à la CI tant que ce contrôle manque.
- `[à compléter]` **l'ablation no-op** — remplacer un artefact critique par une implémentation vide
  et vérifier que quelque chose casse. Aucune commande réelle ne l'exprime aujourd'hui.
- `[à compléter]` **la base de référence des mutants survivants** — sans elle, le premier vrai run
  de mutation remonte l'intégralité du corpus comme nouveau.
- Le **seuil chiffré de couverture du diff**, à poser une fois qu'on aura vu ce que le code réel
  produit.
- Les **constats de maturité datés du 2026-08-08**, repris de l'archive du socle v1 : à
  re-vérifier à l'adoption, sur le dépôt et le registre, jamais sur une page de présentation.

## La réserve qui vaut pour tous les gardes greppables
**Réprimer un comportement peut le rendre plus subtil plutôt que l'éliminer.** Aucune mesure
publiée ne tranche. Ces contrôles réduisent une surface, ils ne ferment pas le sujet — et un taux
de faux positifs qui tomberait à zéro se lirait aussi bien comme une victoire que comme un
contournement appris.

## Écarté
- **Un job maison qui rejoue la résolution de dépendances** pour tenir le cooldown — il échoue au
  facteur maintenance, et npm porte la clé nativement.
- **Rendre les invariants bloquants d'emblée** parce que six ADR le demandent : l'urgence n'est pas
  une borne, et la seule qui autorise les gardes d'intégrité à bloquer sans taux publié est leur
  signal déterministe et greppable.
- **`required_signatures` au ruleset** — l'agent ne pourrait plus commiter du tout ; l'exigence de
  signature reste portée par les deux gardes, sur les seuls commits concernés.
