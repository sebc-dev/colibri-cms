# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-11 · branche `work/reprise-socle-v2` · HEAD `b1e0d55`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › § « Récapitulatif — arbitrages rendus » (ce qui est déjà
            tranché), puis le seul § `S-nn` du lot courant — 406 l., pas une ligne de plus
à extraire  `docs/stack.md` › § « Choix retenus » et § « Décisions structurantes → candidats ADR »
            — 321 l., cible de la plupart des retouches
à extraire  `docs/socle-de-livraison.md` › § « 7. La recette de livraison » et § « Annexe A »
            — 380 l., cibles de S-01, S-08 et S-14
à extraire  `docs/prd.md` › les seuls `FR` nommés par S-13 et S-15 — 797 l., rien d'autre
à extraire  `docs/chantiers/archive/2026-08-10-phase-stack-faits-a-sourcer.md` › § « Écarté »
            — les pistes déjà mortes de la phase stack, à ne pas rouvrir
à lire      `docs/chantiers/en-attente/2026-08-10-cadrage-donnees-personnelles.md` — S-02 y
            renvoie la période de rotation (48 l.)
à déléguer  `docs/research/` — « que disent exactement les rapports sur R2, Turnstile, les Cron
            Triggers et la version d'Astro, et avec quel niveau de preuve ? » (S-11)
à situer    `docs/audit-brief-prd.md` — le précédent de forme, déjà distillé dans Acquis

## Acquis

- **Méthode calquée sur le précédent `audit-brief-prd`** : chaque constat arbitré par l'humain ;
  les constats restent **figés** — ils sont datés, les réécrire les rendrait invérifiables ; un
  récapitulatif des arbitrages s'ajoute en fin de document, seul endroit à jour.
- **Découpage retenu par dépendance et lieu de réparation, et non dans l'ordre `S-01`→`S-20`** :
  L1 mesure (S-04) · L2 fin de publication (S-03, S-07, S-08) · L3 médias (S-09, S-06) ·
  L4 accès et secrets (S-05, S-02, S-01) · L5 niveau de preuve (S-10, S-11, S-18, S-19) ·
  L6 couverture du tableau (S-13, S-15, S-17) · L7 socle et hygiène (S-14, S-16, S-20 ; S-12
  arbitré ici, mais exécuté par `/scd-sdd:premortem socle`).
- **L1 passe en premier parce que sa mesure peut changer L2 et L3** : si la chaîne
  blob→arbre→commit dépasse les 50 sous-requêtes, le mode de dépôt change, et avec lui la
  séquence de publication et la borne de taille des médias.
- **S-01 ferme L4** : S-02 (clé HMAC) et S-06 y ajoutent chacun un secret à inventorier.
- Le traitement précède `archi` : trois candidats ADR au moins citeraient des faits invérifiables.
- **L1 est clos** (commit `97f559c`) : la mesure n'a pas changé L2 ni L3 comme redouté — le texte
  inliné rend le coût constant, seuls les médias restent comptés (**42 par publication**). Mais
  elle a produit un fait que personne n'avait demandé : le HEAD lu n'est pas fiablement
  *read-your-writes* (2 × `422` sur 10 publications), **le réessai est obligatoire**, et ce fait
  **entre dans S-07**. La borne de taille des médias, elle, reste à descendre en specs.
- **L2 est clos** (`546b4d4`, `34739d0`, `b1e0d55`) : l'élagage de `media` ouvre désormais la
  publication **suivante** (séquence à deux temps, `C3` et `C7` intacts) ; une seule ligne D1
  porte verrou, bail et issue ; `main` seule déclenche le build. **Deux dettes en sortent** :
  la ligne de vérification de `C4` au socle, fausse, va à **S-14** ; la ligne « Sérialisation »,
  devenue structurante, va à **S-17** pour son candidat ADR. Et une bifurcation est écrite :
  si le build tape le mur des 20 min, générer les variantes à la publication ferait tomber le
  budget médias de 42 à ~8 — `archi` tranchera au premier déploiement.

## Prochaine étape

**L3 — les médias** : instruire S-09 (aucun magasin pour les médias en **brouillon** — le trou le
plus net du tableau) et S-06 (origine commune admin/public, rien ne borne ce qui remonte), puis les
présenter un par un. L2 a resserré leur cadre : `media` ne reçoit que du **publié**, et le budget
de 42 médias par publication est désormais chiffré — un magasin de brouillon ne peut donc pas être
la même branche, et sa borne de taille se lit face à ce budget.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Trancher S-04 par recherche** — la phase stack a déjà établi que ce plafond se mesure.
