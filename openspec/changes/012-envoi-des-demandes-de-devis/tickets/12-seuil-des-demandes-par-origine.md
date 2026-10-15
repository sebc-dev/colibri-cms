# 12 — L'envoi des demandes refuse une origine au-delà de cinq par heure

**Bloqué par :** 02, 08, 11
**Vérif :** tdd
**Fichiers :** `src/pages/api/public/demandes.ts`, `src/render/formulaire/module.ts`, `tests/integration/seuil-des-demandes.test.ts`, `tests/parcours/formulaire-seuil.parcours.ts`

## Ce que ça livre

Une même **origine** — l'adresse IP que la plateforme attribue à la requête — ne peut plus envoyer plus
de **5 demandes par heure** (FR-062), sans compte visiteur :
- la sixième sollicitation d'une heure est refusée, et toutes les suivantes jusqu'à la fin de l'heure ;
- une nouvelle heure repart de zéro ;
- toute sollicitation reçue compte, qu'elle aboutisse ou non, même refusée pour un champ manquant ;
- le seuil d'une origine ne touche jamais une autre origine ;
- les demandes et la connexion ont chacune leur compte : atteindre le seuil des demandes ne change rien à
  l'écran de connexion, qui reste sous son propre seuil de 20 tentatives ;
- le comptage ne pose aucun cookie.

Le visiteur refusé pour seuil lit « Plusieurs demandes ont déjà été envoyées depuis votre connexion.
Votre saisie est conservée : réessayez dans une heure. ». Rien n'est effacé, et aucun e-mail n'est
envoyé.

**Décisions à respecter (ADR-0028) :**
- **Le compteur.** C'est celui du ticket 02 : `compterEtJuger(db, 'demande', origine, maintenant)`
  (`src/platform/frequence/index.ts`). Le seuil `demande` vaut 5 dans `src/core/frequence/regles.ts`.
  Aucune nouvelle table, aucune nouvelle liaison.
- **La place du comptage dans la route.** Il se fait **juste après le contrôle de méthode**, avant le
  contrôle d'`Origin`, de format et la lecture du corps. Toute sollicitation reçue compte.
  - L'origine vient de l'en-tête `CF-Connecting-IP`.
  - Au-delà du seuil, la réponse est `429 { "statut": "seuil" }`.
  - Une erreur de la base refuse la sollicitation : la protection ne s'ouvre pas sur une panne.
- **Le module.** Sur un `429`, il affiche le message du seuil, déjà posé dans
  `src/render/formulaire/textes.ts` (ticket 03). Il réactive le bouton et ne touche à aucun champ,
  comme pour les autres échecs (ticket 11).
- **Ce qui ne paraît jamais.** Ni l'adresse IP, ni la clé de la fenêtre, ni l'empreinte, dans une
  réponse ou un journal.
- **Les tests :**
  - l'origine est posée par l'en-tête `CF-Connecting-IP` ;
  - la bascule de fenêtre se provoque en vieillissant la ligne de `fenetre_seuil` dans la vraie base,
    jamais en simulant l'horloge.
- **Les cas limites à couvrir :**
  - la 5ᵉ demande acceptée et la 6ᵉ refusée ;
  - des sollicitations refusées pour un autre motif, qui comptent ;
  - deux surfaces séparées ;
  - deux origines séparées.
- **La recette.** L'origine réellement attribuée par Cloudflare se constate à la recette, par six envois
  depuis un même appareil, et s'ajoute au cahier de recette.

**Hors périmètre :** toute vérification anti-robot (Turnstile, écartée par l'ADR-0028) ; un compte
visiteur.

## Critères
- [ ] Quand une même origine envoie six demandes complètes dans la même fenêtre, les cinq premières sont acceptées, la sixième est refusée   (SC-12a)
- [ ] Quand une origine a atteint le seuil des demandes, et qu'une autre origine envoie une demande complète dans la même fenêtre, la demande de l'autre origine est acceptée   (SC-12b)
- [ ] Quand une origine a été refusée pour seuil atteint, et qu'elle envoie une demande complète dans la fenêtre suivante, la demande est acceptée   (SC-12c)
- [ ] Quand une origine a atteint le seuil des demandes, puis soumet une adresse à l'écran de connexion dans la même fenêtre, la soumission de connexion est traitée comme sous son propre seuil   (SC-12d)
- [ ] Quand une origine envoie cinq demandes refusées pour un champ manquant, puis une sixième, complète, dans la même fenêtre, la sixième est refusée pour seuil atteint   (SC-12e)
- [ ] Quand une sollicitation est comptée, la réponse ne pose aucun cookie lié au comptage   (SC-12f)
- [ ] Quand le visiteur envoie une demande au-delà du seuil de son origine, le formulaire dit que trop de demandes ont été envoyées depuis sa connexion et l'invite à réessayer plus tard, sans rien effacer, et aucun e-mail n'est envoyé   (SC-12g)
- [ ] Quand une sollicitation arrive et que la base refuse de la compter, la sollicitation est refusée, rien de ce qu'elle demande n'est fait, et la trace de l'échec ne porte ni son adresse IP, ni la clé de la fenêtre, ni son empreinte   (SC-12h)
