# Recette complète de l'application sur le serveur de recette

Portée : hors-cycle
Ouvert le 2026-10-27 · Actualisé le 2026-10-27 · branche `recette/complete-2026-10` · HEAD `594bb88`

## Objectif
Dérouler tout `docs/cahier-de-test.md` sur la version courante de `main`, sur le serveur de recette
(`https://colibri.sebc.dev`), dans un vrai navigateur piloté par `playwright-cli`, et reporter chaque
verdict (OK, KO, NA) au bilan du cahier.

## Contexte à charger
à lire      `.claude/skills/recette/SKILL.md` — déployer, se connecter, piloter le navigateur, traduire le cahier (202 l.)
à lire      `.claude/skills/site-factice/SKILL.md` — variantes et jeu d'images exigés par certains cas (58 l.)
à extraire  `docs/cahier-de-test.md` › `## 0. Préparer le terrain` et `## Bilan` — 899 l., les sections se lisent une à une pendant la recette
à situer    `.claude/skills/playwright-cli/SKILL.md` — 484 l., chargé par le skill recette au besoin
à situer    `~/projets/colibri_recette` — le clone du dépôt de recette que Workers Builds rebâtit

## Acquis
- J'avais retenu le cahier entier, sections déjà jugées comprises : leurs verdicts dataient d'une
  version antérieure.
- Je jouais moi-même chaque cas ; l'utilisateur ne refait jamais la recette à la main. Je ne lui
  renvoyais que l'inobservable (vrai téléphone, geste dans un compte tiers), en le nommant.
- Un KO se consignait dans le cahier et la recette continuait : aucun correctif en cours de passage,
  pour que la version recettée reste la même du début à la fin.
- Les verdicts allaient sur la branche du chantier, avec une PR à la fin.
- Mettre le serveur à jour suivait `recette/SKILL.md` § Publication réelle, plus deux gestes :
  contrôler que `git diff HEAD~1 -- content` est vide avant l'envoi du clone, et, après une
  migration, redéployer les variantes `rang`, `titres-longs`, `vide` et `sans-formulaire`.
- L'archivage du change 013 attendait le passage des §§ 35 à 41.
- Un attendu vieilli, je le jugeais contre la spec vivante citée en tête de section, et je notais
  l'écart en commentaire d'un OK. Une prémisse vieillie ne sauvait pas un cas que la spec vivante
  condamnait : CT-6.3 est sorti KO.
- Pour plusieurs appareils : un jeu de cookies `curl` par appareil (GET de `/admin/connexion`, puis
  POST avec l'en-tête `Origin`) ; le navigateur piloté gardait l'écran et la console.
- `recette.mjs raz` ne vidait pas `demandes`, `fenetre_seuil` ni `comptes_seuil` : je les vidais à
  la main par `$R sql`, à refaire avant le § 33. Corriger le script restait à décider.
- La pastille « Site à jour » à côté d'un brouillon était voulue (elle dit la dernière publication,
  change 011 ticket 18) : je l'avais signalée comme remarque de libellé, pas notée KO.
- Le texte riche se jouait au rythme humain (`run-code`, 300 ms entre deux gestes) : TipTap ne rend
  le focus au texte qu'une image après le clic sur Titre ou Lien ; sans pause, faux défaut.
- Une prémisse que la recette n'atteignait pas sans toucher l'état publié de la base partagée
  donnait NA, avec sa raison (choix de l'utilisateur pour la bibliothèque vide : CT-10.1, CT-13.7).
  Un défaut déjà consigné qui faisait échouer l'attendu d'un autre cas donnait KO « même défaut
  que CT-6.3 » (CT-15.5), sans compter de défaut neuf.
- La note « rang » sous le § 14 n'était pas un cas numéroté : je ne l'avais pas jouée.

## Prochaine étape
Jouer les §§ 18 à 28, puis rejouer les §§ 29 à 32 et jouer les §§ 33 à 41 (le § 22 veut la
bibliothèque garnie : semée pendant le § 14). Au remplissage du bilan, j'allais lui ajouter les
lignes des §§ 24 à 28, qui n'en ont pas, et recompter son total (215 affiché, 229 en lignes).
Puis reporter verdicts et bilan, commiter, actualiser la fiche.

## Écarté
- Jouer en local (`wrangler dev`, § 0.2 du cahier) : le serveur de recette donne la vraie D1, le vrai
  e-mail et la CSP servie en HTTPS.
- `recette.mjs deployer --principal` : il remplacerait le Worker bâti par Workers Builds, et toute
  publication échouerait.
- Le MCP Playwright : l'utilisateur avait choisi `playwright-cli`.
- Tout jouer en une session : le cahier est trop long ; la fiche s'actualise à chaque pause, lot de
  sections par lot.
- La recherche Gmail (`search_threads`) pour lire le dernier code : son index retardait de plusieurs
  minutes. `get_thread` sur le fil « Votre code de connexion » (`1a17f0647280cab1`), où tous les
  codes se regroupent, la remplace.
- Noter CT-6.3 OK sur sa prémisse vieillie : la spec 011/02 et l'ADR-0020 exigent la vignette d'une
  image publiée sans octets en base ; l'écran Médias la sert, l'éditeur de page non.
- Lire le dernier instantané par `ls -t .playwright-cli/` : il ramenait un fichier de septembre.
- Vider `medias` pour jouer CT-10.1 et CT-13.7 (variante « sans images », puis `delete from
  medias`) : l'écran Médias réinscrit à chaque ouverture les 47 images publiées, et vider la table
  effaçait leurs marques de publication juste avant de rejouer les §§ 29 à 32.
- Le port 8080 pour la page forgée du § 16 : un autre programme de la machine l'occupait ; 8091 a servi.
- Arrêter ce serveur par `pkill -f "http.server …"` : la commande se tuait elle-même ; un `timeout` suffisait.
