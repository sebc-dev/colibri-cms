## Context

Voir `proposal.md` — Why pour la motivation. État du code relevé le 2026-11-15 sur `main` (`9db5146`).

**Connexion.** `src/pages/admin/connexion.astro` lit la saisie telle quelle
(`String(donnees.get('adresse') ?? '')`), la passe à `estAdresseAutorisee`
(`src/platform/auth/magasin.ts`, `where adresse = ?1`), puis expédie le code **à la saisie**
(`demanderExpeditionDuCode(…, adresse, …)`). Aujourd'hui saisie et adresse enregistrée sont égales à
la lettre, donc FR-005 tient ; dès que la comparaison s'assouplit, expédier à la saisie ne convient
plus. L'adresse enregistrée peut porter des majuscules : la semence la pose telle qu'on la lui donne,
et le remplacement (`ouvrirRemplacement`) enregistre la saisie après un simple `trim`.

**Publication.** `src/platform/publication/publier.ts` rend `{ ok: false, raison: 'echec' }` dans cinq
situations sans rien écrire au journal : forge absente (`poursuivreUnePasse`, relance), passe d'images
non aboutie hors « octets manquants » (`passeDeBlobs`), `deposerImages` puis `deposerContenu` non
aboutis (`passeFinale`), `deposerContenu` non abouti (relance). Chaque dépôt non abouti porte pourtant
déjà sa nature : `raison: IssueForge | 'chemin-refuse' | 'octets-manquants'`, où `IssueForge` vaut
`acces-refuse` (401, 403), `introuvable` (404), `refusee-pas-avance-rapide` (409, 422) ou
`injoignable` (`src/core/publication/forge.ts`, `src/platform/publication/forge-github.ts`). Les routes
`src/pages/admin/publication/suite.ts` et `relancer.ts` répondent 502 avec la raison ; l'îlot
`EcranPublier.svelte` affiche `TEXTE_PUBLICATION_ECHEC` pour toute raison autre que `a-finaliser`.

## Goals / Non-Goals

**Goals :**
- Reconnaître l'adresse autorisée sans casse ni espaces de bord, sans migration de données.
- Garder FR-005 (aucun message hors de l'adresse autorisée) et FR-008 (même réponse, même moment).
- Rendre le refus durable distinct jusqu'à l'écran, et consigner tout échec de dépôt.

**Non-Goals :**
- Normaliser les adresses déjà enregistrées, ou celle que propose l'écran « Adresse e-mail ».
- Reconnaître des variantes d'adresse (points, suffixes `+…`).
- Porter au journal le statut HTTP exact : la nature de l'échec suffit au diagnostic (voir D4).
- Écrire le dossier d'instance (SC-014).

## Decisions

**D1 — La reconnaissance rend l'adresse enregistrée, pas un booléen.** La fonction de
`src/platform/auth/magasin.ts` prend la saisie, lui retire ses espaces de bord, et rend l'adresse
enregistrée qui lui est égale sans tenir compte de la casse, ou `null`. `connexion.astro` expédie à
cette valeur. Ainsi le destinataire est toujours une valeur lue en base (FR-005), quelle que soit la
saisie. Alternative écartée : normaliser la saisie puis comparer à la lettre — elle manque une adresse
enregistrée avec des majuscules et obligerait à migrer les données.

**D2 — La comparaison se fait en base, sur des minuscules.** `lower(adresse) = ?1`, la saisie mise en
minuscules côté code. `lower` de SQLite ne plie que les lettres ASCII : une adresse enregistrée avec
une majuscule accentuée ne serait reconnue qu'à l'identique. C'est accepté — les adresses de la cible
sont en ASCII — et noté en risque. La requête reste unique et de même coût dans les deux branches :
le délai plancher (ADR-0007 pour la garde, plancher du ticket 04 du change 001) couvre l'écart.

**D3 — Le clavier d'adresse est une indication du champ.** `inputmode="email"` sur le champ de
`connexion.astro` et sur celui de `adresse-e-mail.astro`, comme `reglages.astro` le fait déjà par
nature de champ. Seul le premier a un scénario de spec ; le second est le même geste, sans exigence
propre (capacité `remplacement-adresse-autorisee` inchangée).

**D4 — Une raison nouvelle, `refus-durable`, dans les issues de `publier.ts`.** Sont durables :
`acces-refuse`, `introuvable`, et la forge absente (dépôt non configuré ou clé absente). Tout le reste
garde `echec` : `injoignable`, `refusee-pas-avance-rapide` (après les essais de `deposerContenu`),
`chemin-refuse`, `octets-manquants`, et toute exception. Le classement vit dans une seule fonction de
`publier.ts`, qui écrit aussi la ligne du journal : `console.error('[publication] dépôt non abouti',
{ etape, nature })`, avec `etape` parmi `images`, `contenu`, `relance`, et `nature` la raison du dépôt
ou `depot-non-configure`. Le libellé d'`IssueForge` dit déjà la famille du statut (401/403, 404,
409/422) : faire remonter le nombre exact demanderait d'élargir `ResultatForge` dans `core`, pour un
gain de diagnostic nul entre 401 et 403. La clé ne transite jamais par ces valeurs : elle ne vit que
dans `creerForgeGithub`.

**D5 — Les routes transmettent la raison, le statut HTTP reste 502.** `suite.ts` ajoute `refus-durable`
à sa table des statuts ; `relancer.ts` répond 502 pour `echec` comme pour `refus-durable`. Aucune
route nouvelle, aucune route publique touchée (FR-097).

**D6 — Le message.** Une constante nouvelle dans `src/admin/textes.ts`, affichée par
`EcranPublier.svelte` quand la raison est `refus-durable`, pour la publication comme pour la relance :
« La publication n'a pas pu se faire, et réessayer n'y changera rien. Rien n'a changé : votre site
et vos modifications sont intacts. Prévenez la personne qui s'occupe de votre site. » Le début
reprend les mots du message d'échec passager, que les scénarios gardés exigent (« n'a pas pu se
faire », « rien n'a changé »). Aucun terme de développeur (FR-117) ; « la personne qui s'occupe de votre site » ne nomme pas
Isometria, le produit devant lui survivre. Le texte est relu par l'humain dans la PR.

**D7 — Le verrou est libéré comme aujourd'hui.** Aucun chemin d'échec ne change son traitement du
verrou : le scénario « après un refus durable, une publication reste possible » fige un comportement
existant.

Conformité : aucun invariant de `docs/architecture.md` n'est franchi (`core` reste sans dépendance,
`platform` n'importe que `core`). Aucun ADR nouveau : rien de structurant. ADR contraignants
respectés : ADR-0007 (garde de session), ADR-0023 (publication par passes, verrou).

## Architecture

**Éléments touchés (FQN) :** `colibri-cms.worker.platform` (auth, publication),
`colibri-cms.worker.routes` (connexion, adresse e-mail, suite et relance de la publication),
`colibri-cms.worker.admin` (écran Publier, textes).

**Relations ajoutées / retirées :** aucune.

## Risks / Trade-offs

- [Une adresse enregistrée avec une majuscule non ASCII n'est reconnue qu'à l'identique] → cas hors
  cible ; le comportement est alors celui d'aujourd'hui, pas pire.
- [Deux adresses enregistrées ne différant que par la casse] → la table n'en porte qu'une
  (`limit 1` partout) ; la requête garde `limit 1`.
- [Le temps de réponse des deux branches] → une seule requête dans chaque branche, sous le délai
  plancher ; le scénario existant « Les temps de réponse ne distinguent pas les branches » reste le
  garde-fou.
- [Un refus classé durable à tort] → un 403 de limitation de débit de GitHub serait dit durable.
  L'éditrice est alors invitée à prévenir au lieu de réessayer : gêne sans perte, et la ligne du
  journal dit la nature.
- [Le message invite à prévenir quelqu'un que le produit ne nomme pas] → voulu (SC-012/SC-013) ; le
  dossier d'instance dira qui.

## Migration Plan

Aucune migration. Retour arrière : annuler les deux PR, indépendantes l'une de l'autre.
