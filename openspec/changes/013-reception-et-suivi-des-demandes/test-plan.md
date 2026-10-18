## Niveaux

- **Unitaire** (`tests/unit/`) — la logique neuve de `src/core/demandes/` s'exerce sans plateforme : la
  composition du détail gardé depuis un formulaire déclaré et des valeurs vérifiées, la coordonnée de
  réponse, la relecture tolérante du détail, les nombres (sommes, noms, affichage des retirées), les règles
  de la suite et du retrait (valeurs admises, sélection bornée), le format des dates dans le fuseau de
  l'administration. C'est l'étage des cas limites.
- **Intégration** (`tests/integration/`, `workerd`) — par `exports.default.fetch` contre le Worker bâti et
  la vraie D1 : la route d'envoi (demande gardée, mention d'e-mail, règle de confirmation sur les quatre
  combinaisons garde × acheminement, rien hors de la table), la contrainte de la table (une ligne retirée
  ne peut pas porter de donnée du visiteur) et la liste fermée des colonnes gardées (ADR-0030 : chaque
  colonne lue par `PRAGMA table_info`, hors les cinq gardées, est refusée non nulle sur une ligne
  retirée), les deux écrans (HTML rendu : ordre, filtre, pages, nombres,
  détail, texte jamais interprété, garde), les deux écritures (suite, retrait : garde, corps, tout ou
  rien, demande déjà retirée), le menu du cadre.
- **Parcours** (`tests/parcours/`, Playwright) — ce qui n'existe que dans un navigateur : choisir une suite
  dans la liste et voir le nombre de commandes changer ; sélectionner, ouvrir le dialogue, choisir le
  motif, confirmer ou renoncer ; le focus du dialogue ; la page rechargée après un retrait. La garde
  `garde-politique.ts` fait échouer tout parcours qui heurte la politique de l'administration.

## Oracle

| Scénarios | Oracle | Conséquence pour strategie-verif |
|---|---|---|
| Détail gardé, coordonnée de réponse | lignes attendues écrites d'avance depuis la déclaration d'exemple | `tdd` |
| Nombres et ventilations (SC-019) | arithmétique sur un jeu connu, écrite d'avance | `tdd` |
| Règles de la suite et du retrait | valeurs admises et bornes des specs | `tdd` |
| Route d'envoi : garde, mention, confirmation | statut, état de la table, espion sur la liaison | `tdd` |
| Effacement au retrait, contrainte de la table | colonnes du visiteur nulles, insertion refusée par la base | `tdd` |
| Liste fermée des colonnes gardées (ADR-0030) | colonnes lues dans la base par `PRAGMA table_info` ; chacune hors des cinq gardées refusée non nulle sur une ligne retirée | `tdd` |
| Écrans : ordre, filtre, pages, détail, garde | HTML rendu par le Worker, sur une table semée | `tdd` ou `test` |
| Gestes dans le navigateur (suite, dialogue, focus) | événements et état observés par Playwright | `test` (parcours) |
| Lisibilité au téléphone, annonce au lecteur d'écran | constat humain | `observé` |

## Cas limites

- **Garde × acheminement** — gardée et partie (200, `parti`) ; gardée, e-mail refusé (200, `non-parti`) ;
  gardée, aucune adresse autorisée (200, `non-parti`, aucun appel à la liaison) ; non gardée, partie (200,
  aucune ligne, trace sans donnée) ; ni gardée ni partie (503 `acheminement`) ; marque `parti` qui échoue
  après un e-mail parti (200, `non-parti` reste).
- **Refus avant la garde** — champ manquant, formulaire changé, seuil atteint, compteur en panne, origine
  étrangère : aucune ligne dans la table.
- **Détail** — champ facultatif vide omis ; texte long de 1 et de 3 lignes, ligne vide au milieu ;
  caractères `<`, `>`, `&`, guillemets, émojis ; formulaire sans prix (total absent) ; choix multiple à
  plusieurs options ; formulaire renommé et option re-prixée après la garde (la demande ne bouge pas) ;
  `detail` corrompu en base (affiché vide, jamais d'erreur).
- **Coordonnée de réponse** — e-mail seul ; téléphone seul ; les deux (l'e-mail l'emporte) ; e-mail
  facultatif vide et téléphone renseigné.
- **Liste** — 0, 1, 50, 51 et 120 demandes (pages de 50, dernière page de 20) ; `?page=0`, `?page=-1`,
  `?page=abc`, page au-delà de la dernière (bornée) ; égalité de date de réception (ordre stable) ;
  `?formulaire=` inconnu (ignoré) ; formulaire de demande présente qui n'est plus déclaré.
- **Nombres** — le jeu de SC-019 et de l'ancien US10 : 11 « Devis gâteau » dont 3 commandes, 3 « Devis
  atelier » ; deux retraits ordinaires sans suite ; quarante indésirables (52 puis 12) ; une commande
  retirée ordinairement (commandes inchangé) ; une commande retirée en indésirable (commandes −1) ; aucune
  retirée (nombre absent) ; la somme des formulaires égale le site pour les trois nombres.
- **Suite** — chacune des trois ; `a-renseigner` refusée ; valeur inconnue, absente, non textuelle ;
  demande retirée ou inconnue (404) ; corps illisible, trop gros ; sans session (401).
- **Retrait** — 1 et 50 identifiants ; 0 et 51 refusés ; identifiant répété ; identifiant inconnu mêlé à des
  connus ; motif inconnu ; demande déjà retirée dans la sélection (laissée, comptée une fois) ; panne de la
  base au milieu (aucune retirée) ; sans session (401) ; après retrait ordinaire, toutes les colonnes du
  visiteur nulles ; après retrait indésirable, aucune ligne.
- **Colonnes gardées** (ADR-0030) — pour chaque colonne lue par `PRAGMA table_info` hors `id`,
  `formulaire_id`, `formulaire_nom`, `suite`, `etat` : une valeur non nulle sur une ligne `retiree` est
  refusée par la base ; le test échoue si la lecture ne rend aucune colonne hors des cinq, pour ne jamais
  passer sans rien vérifier.
- **Aucun effacement d'office** — une demande reçue il y a plus d'un an reste, avec son détail, après une
  nouvelle demande, une lecture des écrans et une publication.

## Doubles

- **La liaison d'expédition** — l'espion du change 012 sur `env.EXPEDITEUR_CODE_CONNEXION.send` : il capte
  le message, et lève une erreur pour l'échec.
- **La panne de la base** — un déclencheur `raise(abort)` posé sur `demandes` (insertion, mise à jour ou
  suppression) puis retiré, sur le patron de `tests/integration/panne-du-compteur.test.ts`. Aucune base
  simulée.
- **Le temps** — `recue_le` passé en paramètre à `core/` ; en intégration, les dates se sèment directement
  dans la table, jamais par une horloge simulée.
- **L'adresse autorisée absente** — table `adresses_autorisees` vidée pour le test.
- Aucun `core/` simulé, aucun magasin simulé.

## Zones sans test automatisé

- **La lisibilité des deux écrans au téléphone et l'annonce au lecteur d'écran** (UX1, UX4, UX5) — les
  attributs d'accessibilité se testent ; le rendu et l'annonce réelle se constatent à la recette, au cahier
  de test partagé.
- **SC-007 de bout en bout** — l'e-mail reçu dans une vraie boîte puis la suite notée dans la liste, sur la
  recette (`colibri.sebc.dev`), en mode `observé`.
- **L'effacement dans l'historique restaurable de D1** — hors de portée de `workerd` ; résidu de 7 jours
  consigné par ADR-0030 et le security-review, pas testé.
