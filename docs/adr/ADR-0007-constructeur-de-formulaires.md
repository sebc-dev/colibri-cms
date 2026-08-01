---
id: ADR-0007
title: Constructeur de formulaires (générique, borné)
status: accepted
date: 2026-07-17
authors: [arborescence-digital]
scope: packages/core/form/, packages/db/form/, apps/admin/islands/, apps/admin/pages/api/
supersedes: []
superseded-by: null
depends-on: [ADR-0003, ADR-0004, ADR-0010]
---

# ADR-0007 — Constructeur de formulaires (générique, borné)

**Statut :** accepted — 2026-07-17 · *amendé le 2026-08-01 (suites de la revue du PRD)*

> **Place dans la famille.** ADR-0007 est le premier ADR de *fonctionnalité* (les précédents cadrent le socle). Il consomme les seams d'ADR-0004 (`writeHandler` public, `sendMail`, `verifyTurnstile`, calcul de total pur), les briques d'ADR-0003 (Turnstile) et le cycle de publication d'ADR-0010.

---

> **Amendement 2026-08-01 — ce qui a changé.** La revue contradictoire du PRD a produit dix exigences qui touchent ce moteur, et **renversé un choix de fournisseur**. Cinq changements :
>
> 1. **Le serveur ne fait plus confiance au navigateur, sur la seule route d'écriture publique du produit.** La soumission est **validée contre la définition publiée** (FR-090) et le total est **recalculé** côté serveur (FR-091), prix utilisés mentionnés dans le message. Le total du navigateur devient un pur **confort d'affichage**. Motif : sans cela, le consentement était déclaratif, le contenu de l'e-mail était dicté par l'expéditeur, et le total venait du visiteur — 5 € annoncés pour une pièce à 500 €.
> 2. **Renversement : Resend remplace Cloudflare Email Routing.** L'alternative « Resend » avait été rejetée pour « dépendance tierce, gratuité moins sûre ». Vérification faite le 2026-08-01 : l'envoi sortant Cloudflare **n'atteint aucun destinataire quelconque sur l'offre gratuite** — seulement les adresses de destination vérifiées du compte. FR-095 (copie au visiteur) exige l'inverse. Le repli documenté devient donc le choix retenu. Le seam `sendMail` étant injectable (ADR-0004 §f), c'est un changement d'implémentation par défaut, pas d'architecture.
> 3. **Le devis devient exploitable jusqu'au bout** : `Reply-To` dirigé vers le visiteur (FR-061), **copie au visiteur** (FR-095), **message de test** déclenché par l'éditrice (FR-096), et **signalement à l'éditrice** d'un échec définitif d'acheminement (FR-094).
> 4. **La non-persistance est précisée, pas abandonnée** : FR-064 ne vaut plus que pour l'acheminement **réussi**. En cas d'échec, le message composé est retenu le temps de réessayer, puis effacé. Ni écran, ni liste, ni recherche — la « base de prospects » reste hors périmètre.
> 5. **L'anti-spam est contraint par FR-089** : aucun code tiers avant une action explicite du visiteur. Turnstile est conservé, mais son script n'est injecté qu'au **premier geste dans le formulaire**.

---

## Contexte

Le PRD (FR-040 → FR-065, US6/US7) demande que la cliente **construise elle-même** ses formulaires — au premier chef un devis où le visiteur compose sa commande, obtient une **estimation indicative**, et l'envoie (SC-007). Le devis n'est pas un objet dédié : c'est **un formulaire** parmi d'autres (contact, réservation…), ce qui en fait une brique réutilisable côté agence.

Tension centrale, déjà arbitrée avec le porteur : construire un moteur générique pour un seul cas connu est le motif que la **règle de trois** (ADR-0004) proscrit — *sauf* quand le motif se répète réellement. Les **formulaires** se répètent d'un client à l'autre bien plus qu'un type de contenu. La décision optimise donc : **générique dans la structure, borné dans les capacités.**

Contrainte de forme héritée d'ADR-0004 : l'endpoint de soumission est la **première route d'écriture publique** (visiteur non authentifié).

---

## Décision

Un **moteur de formulaire générique** dont les capacités sont **strictement bornées au besoin réel** :

1. **Structure possédée par l'éditrice.** Elle compose un formulaire (ajoute, retire, réordonne des champs — FR-040/FR-041), fixe l'e-mail de destination (FR-046). C'est la **seule** surface où l'éditrice compose une structure ; l'entorse à « zones typées non restructurables » est assumée et bornée aux formulaires.
2. **Types de champ fixés** (FR-042) : texte court, e-mail, téléphone, zone de texte, choix unique, choix multiple, nombre, date, consentement. **Pas** de logique conditionnelle, **pas** de multi-étapes, **pas** d'upload (backlog).
3. **Champs à prix + total en somme simple.** Un choix (`select_*`) porte un montant ; un `number` porte un prix unitaire optionnel (FR-044, FR-045). Le total est une **somme des contributions**, calculée par **une seule** fonction pure de `@colibri/core` (ADR-0004 §c), appelée **deux fois** : côté navigateur pour l'affichage (FR-050) et côté serveur pour le montant qui fait foi (FR-091). **Pas de règle conditionnelle** (paliers, remises — backlog).
   *Bornes du champ nombre (FR-045)* : le **maximum est obligatoire** — un formulaire dont un champ nombre n'en porte pas ne peut pas être publié. Le minimum est facultatif et vaut **0** par défaut : un champ à prix ne peut jamais faire *baisser* le total. Motif : c'est le seul type dont la valeur entre dans un calcul, et rien ne refusait « 10 000 parts » ni « −5 ».
4. **Total indicatif, non contractuel** (FR-045/FR-051).
5. **Acheminement par e-mail, rétention transitoire au seul service du réessai.** À l'envoi : `writeHandler({auth:'public'})` → vérif **Turnstile** (FR-063) → Zod → **validation contre la définition publiée** (FR-090) → **recalcul du total** (FR-091) → **Resend** : un message à l'éditrice avec `Reply-To` = adresse du visiteur (FR-061), un message de copie au visiteur (FR-095) → confirmation au visiteur (FR-062). En cas d'échec, le message composé est retenu et réessayé, puis effacé à la livraison ou à l'échéance (FR-064) ; un échec définitif est signalé à l'éditrice (FR-094). **Ni écran de suivi, ni liste, ni recherche.**
6. **Cycle brouillon/publication** comme les pages (FR-047), au sens d'**ADR-0010** : la définition `state='live'` est bâtie dans le site *et* sert de référence de validation serveur (FR-090, FR-091). Les champs sont désignés par une **clé naturelle stable** (`field_key`) — une soumission rapproche ses réponses par elle.
7. **RGPD par construction** : consentement explicite requis avant envoi (FR-060) **et vérifié côté serveur** (FR-090), collecte minimale et **non-conservation** (FR-065).
8. **Adresse de destination confirmée** (FR-046) : une adresse ne sert qu'une fois confirmée ; tant qu'elle ne l'est pas, le formulaire ne peut pas être publié. Le **message de test** (FR-096) est le geste par lequel l'éditrice le constate — parade v1 à la faute de frappe dans son propre domaine, qui produit une adresse bien formée que FR-048 ne peut pas détecter.
9. **Anti-spam sans code tiers au chargement** (FR-063 × FR-089) : le script Turnstile est injecté au **premier geste dans le formulaire**, puis rendu explicitement. Un geste dans le formulaire *est* une action explicite du visiteur ; SC-005, mesuré au chargement, n'est pas affecté.

Modèle de données : `forms` (identité) + `form_defs` + `form_fields` + `form_field_options`, tous porteurs du discriminant `state` d'ADR-0010, plus `verified_recipients` et `submission_retries` (cf. stack.md). Montants en **centimes entiers** (jamais de flottant monétaire).

---

## Alternatives Considered
- **Formulaire de devis en dur, spécifique.** *Rejeté* : non réutilisable ; chaque futur formulaire (contact, réservation) redemanderait du code dédié.
- **Constructeur avec logique conditionnelle / multi-étapes / règles de prix.** *Rejeté* : abstraction en avance sur le besoin réel (un seul formulaire connu) — règle de trois. Reporté au backlog, activable quand un formulaire réel l'exige.
- ~~**Resend / MailChannels** pour l'envoi. *Rejeté* : dépendance tierce, gratuité moins sûre ; Email Routing reste dans l'écosystème Cloudflare (SC-001).~~ **→ Renversé le 2026-08-01.** Le repli est devenu le choix : l'envoi sortant Cloudflare ne permet d'écrire qu'aux **adresses de destination vérifiées du compte** sur l'offre gratuite ; atteindre un destinataire quelconque exige Workers Paid. FR-095 (copie au visiteur) et SC-001 (0 €/mois) ne pouvaient pas être vrais tous les deux avec ce fournisseur. **Resend** est retenu : 3 000 messages/mois et **100/jour** en gratuit, destinataires quelconques, un domaine vérifié.
- **Cloudflare Email Service, en renonçant à FR-095.** *Considéré et écarté le 2026-08-01* : préserverait l'écosystème et SC-001, mais retirerait le filet placé chez la **seule personne qui sait avoir envoyé quelque chose** — une demande perdue redeviendrait silencieuse pour le visiteur (cf. D18 de la revue).
- **Stockage des soumissions en base** (mini-CRM). *Rejeté* : hors périmètre v1 ; e-mail suffit pour une petite activité. *(À ne pas confondre avec la rétention transitoire de FR-064, qui n'expose aucune surface.)*
- ~~**Calcul du total côté serveur.** *Rejeté* : romprait la staticité du site public au-delà du strict nécessaire.~~ **→ Nuancé le 2026-08-01.** Le calcul **navigateur** reste, pour l'affichage à mesure des choix (FR-050) — la staticité des pages de contenu est intacte. Mais le total **acheminé** est recalculé côté serveur (FR-091), sur la route d'envoi, qui touchait déjà un runtime. Aucune staticité n'est perdue ; seule la confiance dans le chiffre du visiteur l'est.

---

## Conséquences
- **Positif** : une brique réutilisable sur toute la flotte ; le devis de la cliente en est la première instance ; staticité préservée hors envoi (SC-005) ; zéro persistance = zéro sujet de conservation de données.
- **Positif** : réutilise les seams d'ADR-0004 — aucun nouveau motif d'architecture.
- **Risque** : l'endpoint public est une cible d'abus → Turnstile obligatoire (FR-063) et testé (ADR-0005). Sans lui, l'e-mail de la cliente devient un canal de spam.
- **Plafond à connaître** (2026-08-01) : l'offre gratuite Resend est de 3 000 messages/mois **et 100/jour**. À deux messages par soumission, cela borne à **50 soumissions par jour** — très au-delà de l'usage attendu d'un site vitrine, mais c'est le premier mur qu'un site à fort trafic rencontrerait.
- **Dépendance hors écosystème** assumée : un fournisseur de plus à provisionner par instance, une clé d'API de plus au coffre. Le seam `sendMail` borne le coût d'un changement futur à une implémentation.

---

## Seuils qui feraient reconsidérer
- Si un formulaire réel exige de la logique conditionnelle ou des paliers de prix → sortir la capacité du backlog (ADR dédié ou amendement).
- Si le volume de soumissions ou le besoin de suivi grandit → reconsidérer la persistance (mini-CRM), en pesant le RGPD.
- Si le plafond de 100 messages/jour est atteint → offre payante Resend, ou revenir à Cloudflare pour le message de l'éditrice (adresse vérifiée, gratuit et hors quota) en ne payant que la copie au visiteur.
- Si Cloudflare ouvrait l'envoi vers un destinataire quelconque sur l'offre gratuite → reconsidérer le retour dans l'écosystème (une dépendance de moins).

---

## Constraints
> Compilées en hooks/CI (cf. ADR-0002, ADR-0006).
- **OBLIGATOIRE** : la route de soumission est un `writeHandler({auth:'public'})` avec vérification **Turnstile** avant tout traitement.
- **OBLIGATOIRE** : toute soumission est validée contre la définition `state='live'` du formulaire — champs existants, types, obligatoires, bornes, consentement (FR-090).
- **OBLIGATOIRE** : le total acheminé est **recalculé** côté serveur ; **INTERDIT** de reprendre un total venu de la requête du visiteur (FR-091).
- **INTERDIT** : conserver une soumission au-delà de son acheminement **réussi** ; la rétention de FR-064 est bornée dans le temps et **INTERDIT** d'en exposer une surface (écran, liste, recherche).
- **INTERDIT** : envoyer un vrai e-mail en test (mailer mocké — garde-fou free tier, ADR-0005).
- **OBLIGATOIRE** : refuser l'envoi tant qu'un champ obligatoire est vide (FR-052) ou qu'un consentement requis manque (FR-060) — **côté serveur**, pas seulement côté navigateur.
- **OBLIGATOIRE** : un champ `number` porte un **maximum** ; **INTERDIT** de publier un formulaire qui en manque (FR-045).
- **OBLIGATOIRE** : montants en centimes entiers ; total = somme pure (`@colibri/core`), jamais de flottant ni de règle conditionnelle en v1.
- **OBLIGATOIRE** : l'adresse de destination est **confirmée** avant que le formulaire puisse être publié (FR-046).
- **INTERDIT** : charger le script anti-spam avant une action explicite du visiteur (FR-089).
- **INTERDIT** : introduire logique conditionnelle, multi-étapes ou upload sans ADR (backlog).

## Related
- Consomme les seams de : ADR-0004 (`writeHandler` public, `sendMail`, `verifyTurnstile`, calcul de total pur) et le cycle de publication d'ADR-0010 (définition `state='live'`, `field_key` stable).
- Briques : ADR-0003 (Turnstile) ; **Resend** pour l'envoi sortant *(amendement 2026-08-01 — remplace Cloudflare Email Routing)*.
- Testé par : ADR-0005 (route publique, Turnstile, e-mail mockés, soumission forgée, recalcul du total).
- Cadre : PRD (FR-040 → FR-065, FR-086, FR-090, FR-091, FR-094 → FR-096, US6, US7, SC-007), stack.md, [docs/suites-revue-prd.md](../suites-revue-prd.md) (D5, D10, D15, D18).
