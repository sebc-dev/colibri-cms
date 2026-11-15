# 02 — Un refus durable de la publication se dit à l'éditrice, et tout échec de dépôt se consigne

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/platform/publication/publier.ts`, `src/pages/admin/publication/suite.ts`, `src/pages/admin/publication/relancer.ts`, `src/admin/ilots-svelte-5/EcranPublier.svelte`, `src/admin/textes.ts`, `tests/integration/refus-durable-de-publication.test.ts`, `tests/static/ecran-publier-statique.test.ts`, `tests/integration/publier-en-un-geste.test.ts`, `tests/integration/finalisation-de-la-publication.test.ts`

## Ce que ça livre

La **publication** dépose les images puis le contenu dans le dépôt du client (GitHub), par passes
(ADR-0023) : `POST /admin/publication` prend le verrou, puis l'îlot `EcranPublier.svelte` appelle
`POST /admin/publication/suite` jusqu'à la fin. Quand la mise en ligne n'a pas abouti, l'éditrice peut
la relancer (`POST /admin/publication/relancer`).

**Le défaut corrigé** (issue #355, CT-31.2 joué le 2026-11-15) : quand le dépôt refuse de façon
durable — clé expirée ou refusée, dépôt introuvable, dépôt non configuré —, `/suite` répond
`502 {"ok":false,"raison":"echec"}`, l'écran dit « Réessayez dans quelques minutes », et le serveur
n'écrit aucune ligne au journal. L'éditrice réessaie sans fin ; la personne qui dépanne ne trouve rien.

**État du code.** `src/platform/publication/publier.ts` rend `{ ok: false, raison: 'echec' }` sans
journal dans cinq situations : forge absente (`poursuivreUnePasse`, et la relance), passe d'images non
aboutie hors « octets manquants » (`passeDeBlobs`), `deposerImages` puis `deposerContenu` non aboutis
(`passeFinale`), `deposerContenu` non abouti (relance). Chaque dépôt non abouti porte déjà sa nature :
`raison: IssueForge | 'chemin-refuse' | 'octets-manquants'`, avec `IssueForge` = `acces-refuse`
(401, 403) | `introuvable` (404) | `refusee-pas-avance-rapide` (409, 422) | `injoignable`
(`src/core/publication/forge.ts`). Les routes `suite.ts` et `relancer.ts` répondent 502 avec la
raison ; l'îlot affiche `TEXTE_PUBLICATION_ECHEC` pour toute raison autre que `a-finaliser`.

**Ce que ce ticket livre** (design D4 à D7) :

- Une raison nouvelle, `refus-durable`, dans les issues de `publier.ts` (suite et relance). Sont
  durables : `acces-refuse`, `introuvable`, et la forge absente (dépôt non configuré ou clé absente).
  Tout le reste garde `echec` : `injoignable`, `refusee-pas-avance-rapide`, `chemin-refuse`,
  `octets-manquants`, toute exception.
- Une seule fonction de `publier.ts` classe l'échec et écrit la ligne du journal :
  `console.error('[publication] dépôt non abouti', { etape, nature })`, `etape` parmi `images`,
  `contenu`, `relance`, `nature` la raison du dépôt ou `depot-non-configure`. La clé d'écriture ne
  transite jamais par ces valeurs. Une publication qui aboutit n'écrit aucune ligne d'échec.
- `suite.ts` et `relancer.ts` transmettent la raison ; le statut HTTP reste 502. Aucune route
  nouvelle.
- `src/admin/textes.ts` gagne une constante, affichée par `EcranPublier.svelte` quand la raison est
  `refus-durable`, pour la publication comme pour la relance :

  > La publication n'a pas pu se faire, et réessayer n'y changera rien. Rien n'a changé : votre site
  > et vos modifications sont intacts. Prévenez la personne qui s'occupe de votre site.

  Aucun terme de développeur (FR-117). Un échec passager garde `TEXTE_PUBLICATION_ECHEC`.
- Le verrou est libéré comme aujourd'hui sur chaque chemin d'échec : après un refus durable, une
  nouvelle publication n'est pas refusée au motif qu'une autre serait en cours.

**Tests.** Intégration dans `workerd` (ADR-0014), D1 réelle, dans un fichier neuf. Reprendre les
outils de `tests/integration/outils-publication.ts` et `ForgeEnMemoire`
(`tests/unit/publication/forge-en-memoire.ts`, `tomberEnPanne(issue)`), comme le fait
`tests/integration/publication-qui-echoue.test.ts`. Oracle de la raison : la valeur rendue par
`poursuivrePublication` et `relancerLaMiseEnLigne`, et le corps de `/suite` sur l'instance de test
(sans dépôt raccordé). Oracle du journal : un espion sur `console.error`, dont les arguments portent
l'étape et la nature, et ne portent jamais la clé. Oracle du message : la constante de `textes.ts`
(invite à prévenir, n'invite pas à réessayer, aucun terme de développeur) et, en test statique, le
choix du message par l'îlot selon la raison (`tests/static/ecran-publier-statique.test.ts`, à
compléter par ajout).

**Dérogation de test déclarée.** Deux assertions de tickets précédents figent l'ancienne raison et
doivent suivre le nouveau contrat ; elles se retouchent, une ligne chacune, sans retirer ni affaiblir
aucun cas :
- `tests/integration/publier-en-un-geste.test.ts`, « ticket 15 — sans dépôt raccordé… » :
  `raison` attendue `'echec'` → `'refus-durable'` ;
- `tests/integration/finalisation-de-la-publication.test.ts`, le cas où le déplacement de la branche
  principale est refusé par `acces-refuse` : issue attendue `{ ok: false, raison: 'echec' }` →
  `{ ok: false, raison: 'refus-durable' }`.

Les cas `injoignable` de ces fichiers et de `issue-de-la-publication.test.ts` gardent `echec`.

**Hors périmètre** : porter au journal le statut HTTP exact (la nature suffit, design D4) ; écrire le
dossier d'instance (SC-014) ; la connexion (ticket 01) ; `docs/cahier-de-test.md` (le cas CT-31.2 sera
complété après la fusion de la recette globale, PR #350).

## Critères

- [ ] Quand l'éditrice confirme une publication et que le dépôt est injoignable : l'écran dit que la publication n'a pas pu se faire, que rien n'a changé, et invite à réessayer dans quelques minutes   (SC-02a)
- [ ] Quand l'éditrice confirme une publication et que le dépôt refuse l'accès : l'écran dit que rien n'a changé et invite à prévenir la personne qui s'occupe du site, sans inviter à réessayer   (SC-02b)
- [ ] Quand l'éditrice confirme une publication et que le dépôt est introuvable : l'écran dit que rien n'a changé et invite à prévenir la personne qui s'occupe du site, sans inviter à réessayer   (SC-02c)
- [ ] Quand l'instance n'a pas de dépôt de publication configuré, ou pas de clé d'écriture, et que l'éditrice confirme une publication : l'écran invite à prévenir la personne qui s'occupe du site, sans inviter à réessayer   (SC-02d)
- [ ] Quand l'éditrice relance une mise en ligne qui n'a pas abouti et que le dépôt refuse l'accès : l'écran invite à prévenir la personne qui s'occupe du site, sans inviter à réessayer   (SC-02e)
- [x] Quand une publication vient d'être refusée durablement, puis que l'éditrice confirme une nouvelle publication : la nouvelle publication n'est pas refusée au motif qu'une autre serait en cours   (SC-02f)
- [x] Quand l'éditrice lit le message d'un refus durable : aucun terme de développeur n'y paraît (FR-117)   (SC-02g)
- [x] Quand une publication échoue parce que le dépôt refuse l'accès au moment de déposer le contenu : une trace est écrite dans les journaux de la plateforme, qui dit l'étape du contenu et que l'accès a été refusé   (SC-02h)
- [x] Quand une publication échoue pendant le dépôt des images : une trace est écrite dans les journaux de la plateforme, qui dit l'étape des images et la nature de l'échec   (SC-02i)
- [x] Quand l'instance n'a pas de dépôt de publication configuré, ou pas de clé d'écriture, et qu'une publication est confirmée : une trace est écrite dans les journaux de la plateforme, qui dit que le dépôt n'est pas configuré   (SC-02j)
- [x] Quand la relance d'une mise en ligne échoue parce que le dépôt n'a pas abouti : une trace est écrite dans les journaux de la plateforme, qui dit l'étape de la relance et la nature de l'échec   (SC-02k)
- [x] Quand une trace d'échec de dépôt est écrite : la clé d'écriture n'y paraît pas, ni en entier ni en partie   (SC-02l)
- [x] Quand une publication aboutit : aucune trace d'échec de dépôt n'est écrite   (SC-02m)
