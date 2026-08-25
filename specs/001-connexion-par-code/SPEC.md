# 001 — Connexion de l'éditrice par code

## Problème
L'administration n'a pas de porte, et rien de ce que le produit promet — remplir un emplacement, publier, suivre
une demande — n'est atteignable tant qu'il n'y en a pas. L'éditrice doit entrer sans mot de passe, sans compte à
créer, sans service tiers à visiter. Or cet écran est ouvert à l'internet et la boîte e-mail derrière lui est la
clé de voûte de l'instance : un inconnu ne doit ni apprendre quelle adresse l'ouvre, ni noyer cette boîte.

## Solution
L'éditrice saisit l'adresse autorisée qu'elle utilise déjà, reçoit un code court dans sa boîte, le recopie sur le
même appareil, et se retrouve dans son administration. La feature livre la garde qui refuse toute autre porte sans
session, les en-têtes de sécurité de chaque réponse d'administration, et un écran d'accueil vide de fonction.

## Ce que ça change, concrètement
- L'adresse autorisée soumise fait partir un message portant un code ; toute autre adresse ne fait rien partir.
- **Sur une soumission donnée**, l'écran rend la même réponse, au même moment, quelle que soit l'adresse — y
  compris quand l'envoi échoue, et quand aucune adresse autorisée n'est enregistrée.
- Au plus cinq messages partent par heure glissante ; le plafond atteint s'annonce, identiquement à toute adresse.
- Un code n'ouvre une session que sur l'appareil qui l'a demandé, une seule fois, dans les quinze minutes, et il
  est brûlé à la cinquième saisie fautive.
- Une nouvelle demande depuis le même appareil rend inutilisable le code précédent de cet appareil ; l'écran de
  saisie l'annonce, et dit aussi combien de temps le code reste bon.
- Chaque refus dit quel geste reprendre : retaper, demander un nouveau code, revenir sur l'appareil demandeur.
- Toute route d'administration demandée sans session valide est refusée et renvoyée vers l'écran de connexion.
  L'écran de connexion, lui, est servi avec ou sans session : il n'est pas une route d'administration.
- Une session se ferme après sept jours sans usage, et après trente jours quoi qu'il arrive.
- Les trois formes de réponse de l'administration — écran servi, renvoi, chemin inconnu — portent la même
  politique de sécurité stricte.
- Aucun terme de développeur ne paraît dans les textes visibles du parcours ni dans le message.

## Décisions d'implémentation
- **Une seule route porte les deux étapes** — ADR-0007 (le garde de session est tenu par l'import) fait importer
  le garde à tout fichier de route d'administration ; une route dédiée à la seule soumission l'importerait sans
  jamais l'appeler, et creuserait l'angle mort que cet ADR déclare assumé.
- **Le code fait huit signes d'un alphabet de trente-deux caractères sans confusables** — la borne d'entropie
  d'ADR-0001 (authentification maison sur D1) est atteinte au signe près, et il se recopie à la main sans erreur.
- **L'identifiant d'appareil est posé à l'affichage du formulaire, seulement s'il manque, jamais à la soumission**
  — posé à la soumission il ne le serait que pour l'adresse autorisée et sa seule présence la trahirait ; réémis à
  chaque affichage, deux onglets s'annuleraient. **Sa durée ne peut être plus courte que celle d'un code.**
- **La réponse est rendue au terme d'un délai plancher fixe, l'envoi étant remis à la plateforme après elle** —
  c'est ce qui rend le temps de réponse indépendant du travail fait, donc de l'adresse. Le plancher est gelé en
  source : la mesure le juge et ne le règle jamais, sinon le contrôle est circulaire.
- **De chaque code n'est conservée qu'une empreinte salée** — ce qui est promis est la non-conservation, pas
  l'irréversibilité : à quarante bits, ce sont l'expiration et le brûlage qui opposent une recherche exhaustive.
- **Le plafond compte les codes écrits dans l'heure, jamais les envois aboutis** — la réponse part avant que
  l'envoi se résolve. Son épreuve est indivisible de l'écriture (point d'entrée public, sans seuil par origine),
  et une ligne morte ne part qu'une fois sortie de l'heure : sinon un code annulé s'efface avant d'être compté.

## Décisions de test
- **Couture : la requête HTTP contre le produit**, dans son vrai moteur et contre la vraie base locale (ADR-0003
  — Vitest dans `workerd`). Tout ce qui se juge sur une réponse y passe : verdicts de code, garde de session,
  en-têtes, égalité du corps et des champs d'en-tête entre les deux branches.
- **Ce qu'elle ne couvre pas — arbitré le 2026-08-25 : tout ce qui touche l'envoi**, qu'un message parte, vers
  qui, et sa forme, se constate hors des tests, sur un parcours joué contre le serveur local : la vraie liaison
  est éprouvée, au prix d'une vérification lente. S'y constate aussi l'égalité des temps de réponse — deux cents
  soumissions **conduites hors plafond, la fenêtre vidée entre les salves**, sinon la branche autorisée bascule
  au sixième tir sur celle qui ne travaille pas et la mesure devient triviale — et la relecture des textes.
- **Les délais longs se jugent à instant injecté** — quinze minutes, sept jours, trente jours.
- **Prior art : aucun.** Le dépôt ne porte aucun fichier de test ; cette feature écrit le premier, et le vert
  actuel de la suite n'atteste que l'existence du script.

## Hors-périmètre
- **Le secret de l'adresse autorisée au-delà d'une soumission** — le PRD ne le promet pas et ne traite pas
  l'adresse comme un secret : le plafond a le droit de se manifester, donc son état reste observable, et cinq
  soumissions d'une adresse suivies d'une sixième disent si c'était la bonne. Se ferme avec le seuil par origine.
- **Le moyen de reprise** — feature dédiée. Tant qu'il n'existe pas, l'e-mail est l'unique entrée : une panne
  d'acheminement ferme l'administration sans aucun recours dans le produit, et sans trace pour le diagnostiquer.
- **Le remplacement de l'adresse autorisée** — sans porteur possible : la plateforme n'écrit qu'à une destination
  vérifiée, et la vérifier demande de visiter le compte que l'éditrice ne doit jamais visiter.
- **Le seuil de fréquence par origine** — partagé avec le formulaire de devis, il part avec lui. Seuls les
  messages émis sont bornés ici : cinq requêtes par heure suffisent à tenir le plafond saturé et à priver
  l'éditrice d'entrée. Risque assumé — le plafond protège d'abord la boîte de la cliente, dommage durable.
- **Le geste qui pose l'adresse autorisée** — geste d'exploitation à la livraison, hors produit. Une instance non
  semée reste porte close, et rien ne le signale.
- **Plusieurs sessions simultanées** — rien ne les compte ni ne les ferme ; elles expirent, et c'est tout.
- **La réception réelle du message** — les critères portent sur le départ, jamais sur l'arrivée.
- **La déconnexion explicite** — aucune exigence ne la porte ; l'ordinateur partagé est traité par l'expiration.
- **Tout écran d'administration autre que l'accueil, et l'aperçu** — l'accueil livré ici est vide de fonction.
- **Le jeton anti-forgerie sur les écritures** — cette feature n'introduit aucune écriture depuis une session
  ouverte ; le mécanisme naîtra avec la première.
