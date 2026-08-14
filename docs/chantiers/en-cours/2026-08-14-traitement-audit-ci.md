# Traitement de l'audit de la CI

Portée : socle
Ouvert le 2026-08-14 · branche `work/reprise-socle-v2` · HEAD `b3556c7`

## Objectif
Refermer les quatre Major relevés le 14/08 sur `docs/ci.md`, par éditions chirurgicales et un
candidat ADR — jamais en rejouant la phase `ci`.

## Contexte à charger
à extraire  `docs/ci.md` › `l. 70` + tableau `## Contrôles` `l. 104-121` · `l. 38-46` · table
            `## La maturité de l'outillage` `l. 467-476` · `l. 443-455` — 763 l., les quatre
            seuls endroits à éditer
à extraire  `.github/workflows/ci.yml` › job `lint:` `l. 45` — 644 l. ; il lance `npm run lint`,
            donc c'est lui qui porterait les règles ESLint de frontière — M1 se tranche là
à lire      `docs/chantiers/en-attente/2026-08-14-durcissement-ci.md` — 114 l. ; il porte la
            recette ESLint et la « Prochaine étape » que M1 met en défaut
à situer    `docs/stack.md` — 1475 l., conclusion déjà dans Acquis
à situer    `docs/adr/0012-anti-abus-turnstile-et-compteur-a-empreintes-de-fenetre.md` — la
            clause de M4 est citée ci-dessous, ne pas relire
à situer    `docs/journal/socle.md`, ligne `audit` du 14/08 — les quatre Major y sont écrits en
            entier, c'est la source de cette fiche

## Acquis
- **M1, lot A** — le graphe d'imports (`I1` sens descendant des dépendances entre zones, `I3`
  point d'entrée unique du rendu) n'a **aucune ligne** dans `## Contrôles` : ni job, ni portée,
  ni statut, ni mode ; il n'existe qu'en `l. 70`. Depuis que la campagne a remplacé
  dependency-cruiser, ses règles se posent dans `eslint.config.*` — donc sous `lint`, informatif
  au titre du **style**, quand `I1`/`I3` sont du mode 5. J'avais tranché qu'il fallait une ligne
  au tableau, et que le job restait à décider.
- **M2, lots B et C** — j'ai vérifié que `docs/stack.md` ne tranche le gestionnaire de paquets
  nulle part (sa seule occurrence de `npm`, `l. 561`, est un `npm pack` de vérification) et
  qu'aucun des 30 ADR ne le porte : `docs/ci.md:38-46` l'arbitre seul. J'avais retenu un
  candidat ADR plutôt qu'une édition, plus un signalement vers `/scd-sdd:audit stack`.
- **M3, lot A** — la table `l. 467-476` ne porte, pour aucun de ses 8 outils, de constat de
  **licence** ni de **palier gratuit**, quand `l. 483-486` en fait deux des trois seuils de
  re-passe. Semgrep est le cas saillant : trois jeux de règles du registre.
- **M4, lot A** — « huit clauses » (`l. 443`), trois non rendues (`l. 453`), quatre au registre :
  4 + 3 = 7. La huitième est `ADR-0012` — « rien de dérivé d'une origine ne survit à la fenêtre
  qui l'a fait naître » —, tenue par `I7`, mais nommée seulement `l. 722-723`.
- Le verdict de la passe était **CONFORME** : aucun des quatre ne bloque quoi que ce soit.
- **M1 refermé (14/08)** — job dédié `boundaries`, mode 5, séparé de `lint` : la raison retenue
  est que le chantier de durcissement promeut les invariants un par un, et noyer `I1`/`I3` dans
  `lint` interdirait de les promouvoir sans bloquer aussi sur le style. Édité : table
  `## Contrôles`, ligne `l. 70`, registre des ADR (`I1`, `I3`) et sa prose, plus le job dans
  `.github/workflows/ci.yml`.

## Prochaine étape
Trancher M3 — ajouter à la table `## La maturité de l'outillage` (l. 467-476) le constat de
licence et de palier gratuit des 8 outils, absent aujourd'hui alors que `l. 483-486` en fait deux
des trois seuils de re-passe.

## Écarté
- Ouvrir une fiche d'audit `2026-08-14-audit-ci.md` — le verdict était CONFORME, et la règle du
  cycle interdit d'en ouvrir une sur un verdict vert ; le nom collisionnerait en plus avec celle
  déjà archivée du même jour.
- Verser les 3 Minor (commandes abrégées du tableau, `import-x/no-internal-modules` non nommé,
  intitulé « SCA ») — un Minor ne va jamais sur disque.
- Rejouer `/scd-sdd:ci` — ré-assembler est une voie de destruction déguisée en mise à jour.
