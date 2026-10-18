# 01 — Chaque demande acceptée est gardée à sa réception, telle qu'elle a été envoyée

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `migrations/0013_demandes.sql`, `src/core/demandes/detail.ts`, `src/platform/demandes/magasin.ts`, `src/pages/api/public/demandes.ts`, `docs/architecture/model.c4`, `docs/architecture/flows.c4`, `tests/unit/demandes/detail.test.ts`, `tests/integration/garde-d-une-demande.test.ts`, `tests/integration/colonnes-gardees-au-retrait.test.ts`

## Ce que ça livre

Chaque demande de devis acceptée est **gardée dans la liste des demandes** (FR-065), avant que son
e-mail ne parte et quel qu'en soit le sort (FR-066). Jusqu'ici, le site ne gardait rien : un e-mail qui
n'aboutissait pas perdait la demande. Ce ticket pose la table et la garde. Les écrans qui montrent la
liste viennent ensuite (tickets 03 et 06) : ici, la liste se constate dans la base.

Une demande gardée porte :
- sa date et son heure de réception ;
- son formulaire d'origine, sous le nom qu'il portait à l'envoi, et sa page d'origine, sous son titre à
  l'envoi (FR-067) ;
- pour un formulaire qui porte des prix, le total qui était affiché au visiteur (FR-068) ;
- son détail : chaque champ à choix renseigné avec ses options choisies et, dans un champ avec prix, le
  prix de chacune ; chaque coordonnée et chaque texte renseignés, avec leur libellé et la valeur saisie ;
- la coordonnée qui permet de répondre au visiteur : son adresse e-mail, à défaut son téléphone ;
- la suite « à renseigner » ;
- la mention que son e-mail n'a pas pu partir, tant que cet e-mail n'est pas parti.

Libellés, options et prix sont **copiés** depuis le formulaire publié contre lequel la demande vient d'être
vérifiée : une publication ultérieure ne change pas une demande gardée. Une demande refusée — champ
manquant ou mal formé, formulaire changé, total désaccordé, seuil atteint, envoi qui ne vient pas du site
— n'est pas gardée. Hors de la demande gardée, aucune valeur saisie n'est conservée : ni ailleurs dans la
base, ni dans un journal, ni dans la réponse.

**Ce que voit le visiteur ne change pas dans ce ticket.** Un e-mail refusé, ou l'absence d'adresse
autorisée, lui sont encore annoncés comme un échec (503 `acheminement`), même si la demande est gardée. La
nouvelle règle de confirmation est le ticket 02.

**Préalable.** Une PR de retouche des tests, faite à la main et fusionnée **avant** ce ticket, réécrit
SC-07i de `tests/integration/envoi-d-une-demande.test.ts` sous une forme vraie avant et après ce ticket :
« une fois la demande acheminée, aucune table hors de `demandes` ne porte les valeurs saisies ». Ce ticket
ne modifie **aucun** test existant.

**Décisions à respecter (ADR-0030, ADR-0019, I2, I17 ; D1 à D3 de l'approche) :**
- **La table.** `migrations/0013_demandes.sql`, additive : une table `demandes` et un index
  `(etat, recue_le desc)`, posés par `create table if not exists` et `create index if not exists`. Les
  colonnes :
  - **gardées après un retrait** — une liste fermée de cinq : `id` (texte tiré au hasard,
    `crypto.randomUUID`), `formulaire_id`, `formulaire_nom`, `suite` (`a-renseigner` | `sans-suite` |
    `devis-envoye` | `commande`), `etat` (`presente` | `retiree`) ;
  - **effacées au retrait** : `recue_le` (millisecondes), `page_titre`, `total` (centimes entiers, nul
    sans prix), `contact`, `detail` (JSON), `courriel` (`parti` | `non-parti`).
- **La base tient la règle.** Une contrainte `check` refuse toute ligne `retiree` dont une colonne hors des
  cinq gardées est non nulle. Aucun fichier de `src/` ni de `migrations/` ne contient
  `ignore_check_constraints` (I17).
- **Le magasin rejoue la définition de la table**, comme le compteur rejoue la migration 0012
  (`assurerSchema` de `src/platform/frequence/index.ts`) et les sessions la migration 0003. Toute lecture
  ou écriture de `src/platform/demandes/magasin.ts` passe d'abord par cette assurance, mémorisée, sans
  effet quand la table existe. La définition rejouée est **identique** à celle de la migration,
  contrainte `check` comprise. C'est ce qui garde verts, sans les modifier, les tests existants qui ne
  montent que leurs propres migrations et postent une demande acceptée (`envoi-d-une-demande`,
  `acheminement-en-echec`, `point-d-envoi-ferme`, `demande-desaccordee`, `saisie-refusee`,
  `seuil-des-demandes`, `panne-du-compteur`).
- **Le test des colonnes gardées (ADR-0030, point 6).** `tests/integration/colonnes-gardees-au-retrait.test.ts`
  lit les colonnes de la table dans la base (`PRAGMA table_info`). Pour chacune hors des cinq gardées, une
  valeur non nulle sur une ligne `retiree` est refusée par la base. Le test échoue si la lecture ne rend
  aucune colonne hors des cinq, pour ne jamais passer sans rien vérifier. Il s'exerce **deux fois** : sur
  la table créée par la migration, et sur la table créée par le magasin seul. Les lignes s'y écrivent
  directement en SQL : le retrait n'existe pas encore (ticket 08).
- **Le détail, composition pure.** `src/core/demandes/detail.ts`, sans import de framework ni de
  plateforme (I2). `composerDetail(formulaire, valeurs)` rend une suite de lignes étiquetées, dans l'ordre
  des champs déclarés, les champs facultatifs vides omis :
  - `{ etiquette, options: [{ libelle, prix? }] }` pour un champ à choix renseigné ;
  - `{ etiquette, valeur }` pour une coordonnée ou un texte d'une ligne ;
  - `{ etiquette, lignes: [...] }` pour un texte long.
- **La coordonnée de réponse.** `contactDeReponse(formulaire, valeurs)`, même module, rend la valeur du
  premier champ `email` renseigné, à défaut celle du premier champ `telephone`.
- **`composerCourriel` n'est pas réécrit** (`src/core/formulaires/courriel.ts`) : ses tests restent tels
  quels. Si l'analyse de duplication relève le parcours commun des champs, il s'extrait sans changer la
  sortie de l'e-mail.
- **Le magasin.** `src/platform/demandes/magasin.ts` :
  - `garderDemande(db, demande, maintenant)` insère la ligne avec `courriel = 'non-parti'` et rend son
    identifiant ;
  - `marquerCourrielParti(db, id)` passe la mention à `parti`.
  Requêtes préparées seules (`prepare(...).bind(...)`).
- **La route** (`src/pages/api/public/demandes.ts`). Après la vérification inchangée (seuil, origine,
  format, taille, déclaration, total) :
  1. garder la demande, `recue_le` valant `Date.now()` lu une fois ;
  2. lire l'adresse autorisée ; absente → réponse inchangée, 503 `acheminement` ;
  3. acheminer, inchangé ; un refus de la plateforme → réponse inchangée, 503 `acheminement` ;
  4. e-mail parti → marquer `parti` ; une erreur à cette étape est consignée sans aucune donnée du
     visiteur, et laisse la mention ;
  5. répondre 200 `envoyee`.
  Garder avant d'acheminer tient FR-066 même si le Worker s'interrompt pendant l'envoi. Ce ticket
  n'attrape pas une erreur de la garde : la base qui refuse de garder est le ticket 02. Le commentaire
  d'en-tête de la route cesse de dire « rien n'est conservé en base ».
- **Journaux.** Aucune trace ne porte une valeur saisie, un identifiant de demande ni une adresse.
- **Le modèle d'architecture.** Dans `docs/architecture/model.c4`, la description de `colibri-cms.d1` gagne
  « les demandes de devis et leur suite ». Dans `docs/architecture/flows.c4`, la vue `flow-demande` gagne le
  pas `colibri-cms.worker.platform -> colibri-cms.d1 'garde la demande'` avant l'acheminement, et sa
  description cesse de dire « Rien n'est conservé en base ». Puis
  `likec4 validate --no-layout --json --project colibri-cms docs/architecture`. Aucune relation nouvelle.
- **Le double envoi (SC-01h).** La part du navigateur — deux gestes ne font partir qu'une requête — est
  déjà gardée par le parcours SC-11a de `tests/parcours/formulaire-echec.parcours.ts`. Ce critère prouve
  qu'un envoi accepté produit exactement une demande gardée et un e-mail.
- **Cas limites à couvrir :**
  - détail : champ facultatif vide omis ; texte long d'une et de trois lignes, ligne vide au milieu ;
    caractères `<`, `>`, `&`, guillemets et émojis gardés tels quels ; formulaire sans prix (total nul) ;
    choix multiple à plusieurs options ;
  - coordonnée de réponse : e-mail seul ; téléphone seul ; les deux (l'e-mail l'emporte) ; e-mail
    facultatif vide et téléphone renseigné ;
  - marque `parti` qui échoue après un e-mail parti : la réponse reste 200 et la mention `non-parti` reste.
- **Doubles.** L'espion du change 012 sur `env.EXPEDITEUR_CODE_CONNEXION.send`, qui capte le message et lève
  une erreur pour l'échec ; l'adresse autorisée absente en vidant `adresses_autorisees` ; une panne de la
  base par un déclencheur `raise(abort)` posé puis retiré, sur le patron de
  `tests/integration/panne-du-compteur.test.ts`. Aucune base simulée, aucun `core/` simulé.

**Hors périmètre :**
- la confirmation du visiteur quand l'e-mail ne part pas, et la base qui refuse de garder (ticket 02) ;
- tout écran d'administration (tickets 03 et suivants) ;
- la relecture du détail pour l'affichage (ticket 06) ;
- toute durée de conservation ou tout effacement d'office : il n'y en a aucun (FR-079).

## Critères
- [ ] Quand un visiteur envoie, depuis la page « Contact », une demande complète pour « Devis gâteau » avec « Fraise » (10 €) et « 10 parts » (30 €), la liste des demandes porte une demande de « Devis gâteau », venue de la page « Contact », avec sa date et son heure de réception et un total de 40 €   (SC-01a)
- [ ] Quand la plateforme d'acheminement refuse l'e-mail d'une demande complète, la demande figure dans la liste avec tout son détail, et porte la mention que son e-mail n'a pas pu partir   (SC-01b)
- [ ] Quand aucune adresse autorisée n'est enregistrée et qu'un visiteur envoie une demande complète, la demande figure dans la liste, et porte la mention que son e-mail n'a pas pu partir   (SC-01c)
- [ ] Quand une demande complète est gardée et que son e-mail est remis à la plateforme d'acheminement, la demande figure dans la liste sans la mention que son e-mail n'a pas pu partir   (SC-01d)
- [ ] Quand une demande a été gardée avec « Fraise » à 10 €, puis que l'éditrice publie « Fraise » renommée « Fraise des bois » à 11 €, la demande gardée porte toujours « Fraise » à 10 € et un total de 40 €   (SC-01e)
- [ ] Quand une demande est refusée parce qu'un champ obligatoire manque, parce que son total ne s'accorde pas au formulaire publié, ou parce que le seuil de son origine est atteint, la liste n'en porte aucune trace   (SC-01f)
- [ ] Quand une demande vient d'arriver, sa suite est « à renseigner »   (SC-01g)
- [ ] Quand le visiteur actionne deux fois de suite le bouton d'envoi, une seule demande part, une seule demande paraît dans la liste des demandes, et un seul e-mail parvient à l'adresse autorisée   (SC-01h)
- [ ] Quand une demande a été gardée, puis que la plateforme d'acheminement a refusé son e-mail, les valeurs saisies par le visiteur ne figurent que dans la demande gardée : ni ailleurs dans la base, ni dans les journaux, ni dans la réponse   (SC-01i)
