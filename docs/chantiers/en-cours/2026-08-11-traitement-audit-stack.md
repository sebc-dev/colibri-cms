# Traitement de l'audit de la stack

Portée : socle
Ouvert le 2026-08-11 · Actualisé le 2026-08-13 · branche `work/reprise-socle-v2` · HEAD `e79678f`

## Objectif

Arbitrer les 20 constats de `docs/audit-stack.md`, un par un et sur feu vert, pour que
`docs/stack.md` puisse descendre en `archi` puis en `adr` sans porter de fait faux ni de trou.

## Contexte à charger

à lire      `docs/research/2026-08-10-gating-paiement-r2-email-cloudflare.md` — 77 l. ; le seul
            document qui dise ce qui est en bêta, et tout `S-20` tient à ce mot
à extraire  `docs/audit-stack.md` › le seul § `S-nn` en cours, plus les seules lignes du
            récapitulatif que ce constat recoupe — 421 l. ; le récapitulatif entier coûte plus
            que les quatre constats restants réunis
à extraire  `docs/socle-de-livraison.md` › §7 et §3 — 411 l. ; `S-14` y porte quatre retouches
à extraire  `docs/stack.md` › l'en-tête et le préambule pour `S-16` ; le point 4 de « À constater
            en recette » et le candidat n° 9 pour `S-20` ; la ligne « Base de données » pour
            `S-12` — 1363 l.
à extraire  `docs/prd.md` › l'exclusion sur l'historique des demandes, et `FR-106` — 838 l. ;
            `S-12` s'appuie sur les deux
à situer    les relevés du 12/08 de `docs/research/`, `docs/audit-brief-prd.md`,
            `docs/audit-auth.md`, la fiche archivée du 10/08 — conclusions déjà portées

## Acquis

- **Méthode calquée sur `audit-brief-prd`** : les constats restent **figés**, seul le
  récapitulatif est à jour ; un arbitrage **complète** une ligne antérieure sans la défaire, et
  ce qui est arbitré **ne se relit pas**.
- **Découpage par dépendance, décidé le 11/08** : `L5` (`S-11`, `S-18`, `S-19`), puis `L6`
  (`S-13`, `S-15`, `S-17`), puis `L7` (`S-14`, `S-16`, `S-20`) ; `S-12` arbitré ici, exécuté
  par `premortem socle`.
- **Ce que chaque constat a appris est écrit dans sa ligne du récapitulatif**, jamais ici.
- **J'instruisais la piste autant que le constat — et, depuis `S-13`, l'argument que le constat
  avance autant que son grief** : il donnait `FTS5` pour incertain quand la page qu'il cite
  l'atteste, et le vrai trou était ailleurs que là où il regardait.
- **Sept fois un grief est arrivé déjà refermé** par un arbitrage antérieur : je vérifiais
  l'état réel de la ligne visée **dans le corps entier du document**, pas dans la seule section
  que le constat nomme.
- **Toute ligne neuve au tableau naît avec son candidat ADR** — règle tirée de `S-17`, appliquée
  pour la première fois en `S-13`.

## Prochaine étape

**Ouvrir `L7` avec `S-14`**, qui a grossi depuis sa rédaction. Son constat nomme deux retouches
du §7 du socle — la case « clone nu » devenue fausse, la ligne DNS absente ; deux dettes lui ont
été renvoyées depuis : la vérification de `C4` par `S-08`, et le contenu du dossier d'instance
(`FR-111`, `FR-113`, `FR-114`-`FR-116`) par `S-13`.

## Écarté

- **Traiter dans l'ordre du document** — il classe par sévérité, pas par dépendance.
- **Enchaîner les lots sans feu vert** — cadence héritée de l'audit de sécurité.
- **Réécrire les constats à mesure** — un constat d'audit est daté ; seul le récapitulatif bouge.
- **Ouvrir une feature** (`kickoff-feature`) — aucun de ces constats ne descend en code.
- **Sourcer soi-même un fait de plateforme pour trancher** — ça se constate en recette. *Borné le
  12/08 : ne vise que ce que la documentation **ne porte pas**.*
- **Renvoyer en recette ce qu'aucun appel réel ne tranche** — écarté deux fois le 12/08.
- **Les écartés propres à chaque constat** sont dans leur ligne du récapitulatif, avec leur motif.
