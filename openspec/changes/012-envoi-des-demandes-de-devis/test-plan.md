## Niveaux

- **Unitaire** (`tests/unit/`) — toute la logique neuve vit en `core/` et s'exerce sans plateforme :
  le total, la vérification d'une demande contre une déclaration, la composition de l'e-mail, les règles
  du seuil (fenêtre, verdict), la lecture de la nature `formulaire`, la composition d'une page qui pose un
  formulaire (et ses erreurs nommées), le plan de dépôt qui garde l'emplacement. C'est l'étage où vivent
  les cas limites.
- **Intégration** (`tests/integration/`, `workerd`) — par `exports.default.fetch` contre le Worker bâti :
  la route d'envoi (refus de méthode, d'origine, de format, de taille ; comptage ; accord avec le
  formulaire publié ; e-mail remis à la liaison ; rien conservé en base), le compteur contre la vraie D1
  (empreintes, bascule de fenêtre), l'écran de connexion au-delà du seuil, le HTML de la page publique et
  de l'aperçu (formulaire présent, prix, mentions, script seulement là où un formulaire est posé), la
  carte de l'éditeur, le refus d'une correction visant un emplacement de formulaire.
- **Parcours** (`tests/parcours/`, Playwright) — ce qui n'existe que dans un navigateur : le total qui suit
  la sélection sans aucune requête, l'envoi et la confirmation, le refus de saisie avec le focus, l'échec
  qui garde la saisie, le double envoi, l'absence de script (JavaScript coupé), l'aperçu qui n'envoie
  rien. La garde `garde-politique.ts` fait échouer tout parcours qui heurte la politique de sécurité :
  c'est elle qui prouve que `script-src 'self'` et `connect-src 'self'` suffisent.

## Oracle

| Scénarios | Oracle | Conséquence pour strategie-verif |
|---|---|---|
| Total, centimes, option sans prix | arithmétique connue avant le code | `tdd` |
| Saisie vérifiée, accord avec le formulaire publié | règles des specs, partitions ci-dessous | `tdd` |
| Contenu et forme de l'e-mail | texte attendu écrit d'avance, ligne par ligne | `tdd` |
| Seuils et fenêtre | compte et bascule déterministes, l'heure passée en paramètre | `tdd` |
| Route d'envoi, connexion au-delà du seuil | statut, corps, espion sur la liaison, état de la base | `tdd` ou `test` |
| Indiscernabilité des délais au-delà du seuil (connexion) | l'adresse n'est jamais lue au-delà du seuil : les deux réponses attendent au moins le délai plancher, médianes proches | `test` |
| Comportement au navigateur (total sans requête, focus, double envoi) | événements observés par Playwright | `test` (parcours) |
| Arrivée réelle de l'e-mail dans une boîte | constat sur la boîte de recette | `observé` |

## Cas limites

- **Prix et total** — option à 0 ; prix maximal 9 999 999 ; centimes (10,50 € + 0,20 € = 10,70 €) ;
  choix multiple avec prix, toutes options cochées ; aucune option choisie (0 €).
- **Choix** — choix unique avec 0, 1 et 2 options ; choix multiple avec 0, 1, toutes, et la même option
  deux fois (refus d'accord) ; option inconnue ; une option envoyée pour un champ de texte.
- **Textes** — vide ; fait d'espaces ; longueurs aux bornes : 200/201 (texte), 2 000/2 001 (texte long),
  254/255 (e-mail), 30/31 (téléphone) ; caractères hors ASCII et émojis comptés en caractères.
- **E-mail** — `nom@domaine.fr` accepté ; `marie.exemple.fr`, `nom@`, `@domaine.fr` refusés.
- **Téléphone** — `+33 6 12 34 56 78`, `06.12.34.56.78`, `(0)6-12-34-56-78` acceptés ; lettres, `+` au
  milieu refusés.
- **Requête** — `Origin` absente, autre hôte, autre schéma ; `Content-Type` `application/json;
  charset=utf-8` accepté, `multipart/form-data` refusé sans lecture ; corps à 16 Kio et 16 Kio + 1 ;
  JSON invalide ; `totalAffiche` absent, négatif, décimal, textuel ; formulaire ou page inconnus ; page qui
  ne pose pas le formulaire.
- **Seuil** — 5ᵉ demande acceptée, 6ᵉ refusée ; 20ᵉ tentative de connexion traitée, 21ᵉ refusée ;
  sollicitations refusées pour un autre motif qui comptent ; deux surfaces séparées ; deux origines
  séparées ; bascule de fenêtre (clé changée, empreintes effacées) ; origine absente (« inconnue ») ;
  adresse IPv6 ; erreur de la base (refus, trace sans adresse, clé ni empreinte).
- **E-mail composé** — valeur d'une ligne portant retour chariot ou saut de ligne ; texte long dont une
  ligne commence par « Total indicatif : » ; saisie ressemblant à du HTML ou à un code de connexion ;
  champs facultatifs vides omis ; adresse autorisée absente (échec).
- **Reconstruction** — emplacement qui désigne un formulaire inconnu ; formulaire sans champ e-mail ni
  téléphone obligatoire ; formulaire posé sur deux pages.

## Doubles

- **La liaison d'expédition** — un espion sur `env.EXPEDITEUR_CODE_CONNEXION.send`, le même objet que lit
  la route : il capte le message remis, et, pour l'échec, lève une erreur. Aucun autre double de la
  plateforme.
- **Le temps** — les fonctions de `core/` reçoivent l'instant en paramètre ; en intégration, la bascule de
  fenêtre se provoque en vieillissant la ligne de `fenetre_seuil` dans la vraie base, jamais en simulant
  l'horloge.
- **L'origine** — l'en-tête `CF-Connecting-IP` posé sur les requêtes de test.
- Aucune base simulée, aucun `core/` simulé.

## Zones sans test automatisé

- **L'e-mail reçu dans une vraie boîte** (part e-mail de SC-007) — Email Routing ne se joue pas en local ;
  constat sur la recette (`colibri.sebc.dev`, boîte de recette), au cahier de test, en mode `observé`.
- **La mise en page au téléphone et l'écoute au lecteur d'écran** (UX1, UX3) — les attributs
  d'accessibilité se testent ; le rendu et l'annonce réelle se constatent à la recette.
- **L'origine attribuée par Cloudflare** (`CF-Connecting-IP` en production) — constatée à la recette par
  six envois depuis un même appareil.
- La rapidité mesurée (SC-005) reste à sa story.
