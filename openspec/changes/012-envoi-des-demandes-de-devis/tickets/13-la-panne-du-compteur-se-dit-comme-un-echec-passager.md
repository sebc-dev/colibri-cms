# 13 — Une panne du compteur se dit comme un échec passager, pas comme un seuil atteint

**Bloqué par :** 02, 11, 12
**Vérif :** tdd
**Fichiers :** `src/core/frequence/regles.ts`, `src/platform/frequence/index.ts`, `src/pages/api/public/demandes.ts`, `src/pages/admin/connexion.astro`, `src/admin/textes.ts`, `tests/integration/panne-du-compteur.test.ts`, `tests/parcours/formulaire-panne.parcours.ts`, `tests/integration/seuil-des-demandes.test.ts` (dérogation, voir plus bas), `tests/integration/seuil-de-connexion.test.ts` (dérogation, voir plus bas)

## Ce que ça livre

Quand la base ne permet pas de compter une sollicitation, le **compteur de seuil par origine** (tickets 02
et 12) la refuse toujours : la protection ne s'ouvre pas sur une panne. Mais ce refus ne se présente plus
comme un **seuil atteint** — aujourd'hui, le visiteur lit « Plusieurs demandes ont déjà été envoyées… » et
l'éditrice « Trop de tentatives de connexion… patienter une heure », alors qu'aucun des deux n'a rien
dépassé. Arbitrage du 2026-10-17 (relecture du ticket 12, PR #266).

- **Formulaire de devis.** Le visiteur lit le message d'échec existant : « Votre demande n'a pas pu être
  envoyée. Votre saisie est conservée : réessayez dans quelques instants. ». Rien n'est effacé, le bouton
  redevient actif, aucun e-mail ne part.
- **Écran de connexion.** L'éditrice lit, dans le message d'état ambre : « La connexion n'a pas pu se
  faire. Réessayez dans quelques instants. ». Aucun code n'est écrit ni vérifié, aucune session ne
  s'ouvre, aucun message ne part. Le texte, les champs d'en-tête et le délai de la réponse ne dépendent
  pas de l'adresse ou du code soumis : la réponse attend le même délai plancher que toute soumission.

**Décisions à respecter (design D6, D8, D9) :**
- **Le verdict.** `Verdict` (`src/core/frequence/regles.ts`) devient `'traitee' | 'refusee' |
  'indisponible'`. `compterEtJuger` (`src/platform/frequence/index.ts`) rend `indisponible` — jamais
  `refusee` — quand la base lève une erreur, et quand la fenêtre bascule encore après la reprise
  (« fenêtre instable »). `refusee` ne veut plus dire que « seuil atteint ». Les traces existantes
  (`[seuil] comptage impossible…`) restent à motif fixe, sans adresse IP, ni clé, ni empreinte.
- **Refuser sur tout verdict autre que `traitee`.** Chaque appelant décide le refus par
  `verdict !== 'traitee'`, jamais par `=== 'refusee'` : un verdict ajouté ne doit jamais ouvrir une
  surface. C'est le risque relevé à la relecture du ticket 12 (`connexion.astro` teste aujourd'hui
  `=== 'refusee'`).
- **La route d'envoi.** Sur `indisponible`, `503 { "statut": "indisponible" }`, à la même place que le
  `429` du seuil : juste après le contrôle de méthode, avant `Origin`, format et lecture du corps. Le
  module du formulaire n'a pas à changer : il présente déjà tout `503` comme un échec passager.
- **L'écran de connexion.** Sur `indisponible`, même traitement qu'au-delà du seuil (rien d'écrit ni de
  vérifié, délai plancher attendu depuis le début de la soumission, quel que soit ce qui est soumis), mais
  l'écran affiche l'annonce de panne, un second texte de `src/admin/textes.ts` à côté de
  `TEXTE_ANNONCE_SEUIL`, sans terme de développeur.
- **Les tests :**
  - la panne se provoque par des déclencheurs `raise(abort)` sur `comptes_seuil` dans la vraie base,
    retirés dans un `finally`, comme les tests SC-12h et SC-02j ;
  - l'origine est posée par l'en-tête `CF-Connecting-IP` ;
  - le message lu par le visiteur se constate au navigateur : un parcours qui simule le `503
    indisponible`, sous la garde de la politique de sécurité, comme le parcours du ticket 12.

**Dérogation déclarée — deux tests existants à mettre à jour.** Le delta `seuil-par-origine` exige
désormais qu'une panne ne se dise pas comme un seuil atteint. Deux tests existants affirment l'inverse :
- `SC-12h` de `tests/integration/seuil-des-demandes.test.ts` (ticket 12) attend `429 { statut: 'seuil' }`
  pendant la panne ;
- `SC-02j` de `tests/integration/seuil-de-connexion.test.ts` (ticket 02) attend le verdict `refusee` et
  `TEXTE_ANNONCE_SEUIL` dans la réponse pendant la panne.

Ce ticket est **autorisé** à remplacer, dans ces deux tests, ces seules attentes par le nouvel affichage
(`503 { statut: 'indisponible' }` ; verdict `indisponible` et annonce de panne) — **et rien d'autre** :
le refus, l'absence de code, d'e-mail et de session, et l'absence d'adresse IP, de clé et d'empreinte dans
les traces y restent intacts. Arbitré par l'humain à la décomposition ; si la vérification finale bloque
malgré la dérogation, la retouche est reprise à la main.

**Hors périmètre :** distinguer un quota de base épuisé d'une autre panne (résidu assumé au design) ;
changer le message d'échec du formulaire ; le plafond horaire des codes ; toute vérification anti-robot.

## Critères
- [ ] Quand une sollicitation arrive et que la base refuse de la compter, la réponse ne porte pas le refus pour seuil atteint, et invite à réessayer dans quelques instants   (SC-13a)
- [ ] Quand le visiteur envoie une demande complète et que la base refuse de compter la sollicitation, le formulaire dit que la demande n'a pas pu être envoyée et invite à réessayer dans quelques instants, sans parler de seuil ni rien effacer, et aucun e-mail n'est envoyé   (SC-13b)
- [ ] Quand la base refuse de compter une soumission portant l'adresse autorisée, puis une autre portant un code valide, aucun code n'est écrit, aucun message n'est envoyé, le code valide n'est ni consommé ni accepté, aucune session ne s'ouvre, et l'écran dit que la connexion n'a pas pu se faire, sans annoncer le seuil   (SC-13c)
- [ ] Quand la base refuse de compter une soumission portant l'adresse autorisée, et une autre portant une adresse quelconque, les deux réponses portent le même texte et les mêmes champs d'en-tête, et toutes deux attendent le délai plancher   (SC-13d)
