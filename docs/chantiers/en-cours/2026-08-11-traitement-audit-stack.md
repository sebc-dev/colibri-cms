# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-13 · branche `work/reprise-socle-v2` · HEAD `70e6027`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à extraire  `docs/audit-stack.md` › le § `S-12`, plus les seules lignes du récapitulatif qu'il
            recoupe — 424 l. ; le récapitulatif entier coûte plus que le dernier constat
à extraire  `docs/stack.md` › les lignes « Base de données » et « Accès aux données » du tableau,
            et le § « Données personnelles » — 1400 l. ; `S-12` tient à ce que D1 porte
à extraire  `docs/prd.md` › l'exclusion sur l'historique des demandes, et `FR-106` — 838 l. ;
            `S-12` s'appuie sur les deux
à extraire  `docs/socle-de-livraison.md` › `I2` et `C1` — 420 l. ; ce qui survit déjà à une perte
            de D1, donc ce qui borne le trou que `S-12` décrit
à situer    les relevés du 12/08 de `docs/research/`, `docs/audit-brief-prd.md`,
            `docs/audit-auth.md` — conclusions déjà portées
à situer    la fiche archivée du 10/08 — reclassée le 13/08 : elle portait la pièce qui a tranché
            `S-20`, elle ne porte rien pour `S-12`

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : les constats restent **figés**, seul le
  récapitulatif est à jour ; un arbitrage **complète** une ligne antérieure sans la défaire, et
  ce qui est arbitré **ne se relit pas**.
- **Ce que chaque constat a appris est écrit dans sa ligne du récapitulatif**, jamais ici.
- **J'instruisais l'argument du constat autant que son grief** — et trois fois de suite le
  constat s'est révélé plus faible que ce qu'il visait : `S-14` (la ligne DNS manquait au
  document entier, pas au seul §7), `S-16` (son propre décompte de rapports avait vieilli),
  `S-20` (ses deux branches étaient vraies à la fois, et le vrai défaut était une troisième).
- **Sept fois un grief est arrivé déjà refermé** par un arbitrage antérieur : je vérifiais
  l'état réel de la ligne visée **dans le corps entier du document**, pas dans la seule section
  que le constat nomme.
- **Une dette reçue peut être plus large que son renvoi** : `S-08` renvoyait la seule colonne de
  vérification de `C4`, c'est la ligne entière qui était fausse. J'ai fait trancher
  l'élargissement plutôt que de le prendre.
- **Toute ligne neuve au tableau naît avec son candidat ADR** — règle tirée de `S-17`.
- **« Assumer marqué » est la troisième issue posée par `S-10`** pour un fait qu'aucune mesure ni
  citation ne comble — employée en `S-11`, puis en `S-20`.
- **Une ligne `à situer` peut porter la pièce qui tranche** : sans la fiche archivée du 10/08,
  `S-20` restait une alternative ouverte.
- **J'ai accepté deux entretiens dans l'en-tête de la stack**, contre le précédent de `prd.md` :
  le compte de constats restants et la plage de dates `Amendé` sont à reprendre au rendu de
  `S-12`, puis à la fermeture de l'audit.

## Prochaine étape

**Instruire `S-12` et rendre l'arbitrage** — D1 sans sauvegarde ni export, perte sans recours.
Son issue était décidée d'avance le 11/08 : arbitré ici, **exécuté par `/scd-sdd:premortem
socle`**, à qui la phase dépose déjà cinq dettes. Il ferme `L7` et l'audit.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette. *Borné le
  12/08 : ne vise que ce que la documentation **ne porte pas**. Étendu le 13/08 : ne vaut pas
  davantage quand la documentation porte l'ambiguïté elle-même.*
- **Renvoyer en recette ce qu'aucun appel réel ne tranche** — écarté trois fois, la dernière en
  `S-20`.
- **Corriger la moitié d'une ligne fausse** — écarté en `S-14` : la moitié qui reste se lit quand
  même, et c'est un tiers qui exécute la recette.
- **Compter ou dater, dans un préambule, ce qui bouge** — écarté en `S-16` ; assumé à l'inverse
  pour le `Statut`, où le coût d'entretien est payé sciemment.
- **Les écartés propres à chaque constat** sont dans leur ligne du récapitulatif, avec leur motif.
