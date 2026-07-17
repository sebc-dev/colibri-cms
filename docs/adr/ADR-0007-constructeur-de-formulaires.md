---
id: ADR-0007
title: Constructeur de formulaires (générique, borné)
status: accepted
date: 2026-07-17
authors: [arborescence-digital]
scope: packages/core/form/, packages/db/form/, apps/admin/islands/, apps/admin/pages/api/
supersedes: []
superseded-by: null
depends-on: [ADR-0003, ADR-0004]
---

# ADR-0007 — Constructeur de formulaires (générique, borné)

**Statut :** accepted — 2026-07-17

> **Place dans la famille.** ADR-0007 est le premier ADR de *fonctionnalité* (les précédents cadrent le socle). Il consomme les seams d'ADR-0004 (`writeHandler` public, `sendMail`, `verifyTurnstile`, calcul de total pur) et les briques d'ADR-0003 (Cloudflare Email Routing, Turnstile).

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
3. **Champs à prix + total en somme simple.** Un choix (`select_*`) porte un montant ; un `number` porte un prix unitaire optionnel (FR-044, FR-045). Le total est une **somme des contributions**, calculée **côté navigateur** (FR-050) par la fonction pure de `@colibri/core` (ADR-0004 §c). **Pas de règle conditionnelle** (paliers, remises — backlog).
4. **Total indicatif, non contractuel** (FR-045/FR-051).
5. **Acheminement par e-mail, sans persistance.** À l'envoi : `writeHandler({auth:'public'})` → vérif **Turnstile** (FR-063) → Zod → **Cloudflare Email Routing** (FR-061) → confirmation au visiteur (FR-062). La soumission n'est **jamais** conservée (FR-064) : ni table, ni écran de suivi.
6. **Cycle brouillon/publication** comme les pages (FR-047) : la définition d'un formulaire publié est bâtie dans le site (donnée statique consommée par le rendu et le calcul navigateur).
7. **RGPD par construction** : consentement explicite requis avant envoi (FR-060), collecte minimale (FR-065).

Modèle de données : `forms` + `form_fields` + `form_field_options` (cf. stack.md). Montants en **centimes entiers** (jamais de flottant monétaire).

---

## Alternatives Considered
- **Formulaire de devis en dur, spécifique.** *Rejeté* : non réutilisable ; chaque futur formulaire (contact, réservation) redemanderait du code dédié.
- **Constructeur avec logique conditionnelle / multi-étapes / règles de prix.** *Rejeté* : abstraction en avance sur le besoin réel (un seul formulaire connu) — règle de trois. Reporté au backlog, activable quand un formulaire réel l'exige.
- **Resend / MailChannels** pour l'envoi. *Rejeté* : dépendance tierce, gratuité moins sûre ; Email Routing reste dans l'écosystème Cloudflare (SC-001). *Repli documenté si Email Routing sortant indisponible : Resend (gratuit plafonné).*
- **Stockage des soumissions en base** (mini-CRM). *Rejeté* : hors périmètre v1 ; e-mail suffit pour une petite activité.
- **Calcul du total côté serveur.** *Rejeté* : romprait la staticité du site public au-delà du strict nécessaire (seul l'envoi doit toucher un runtime).

---

## Conséquences
- **Positif** : une brique réutilisable sur toute la flotte ; le devis de la cliente en est la première instance ; staticité préservée hors envoi (SC-005) ; zéro persistance = zéro sujet de conservation de données.
- **Positif** : réutilise les seams d'ADR-0004 — aucun nouveau motif d'architecture.
- **Risque** : l'endpoint public est une cible d'abus → Turnstile obligatoire (FR-063) et testé (ADR-0005). Sans lui, l'e-mail de la cliente devient un canal de spam.
- **Vigilance** : `[À VÉRIFIER]` l'envoi *sortant* via Cloudflare Email Routing sur le free tier au jour de l'installation (repli Resend).

---

## Seuils qui feraient reconsidérer
- Si un formulaire réel exige de la logique conditionnelle ou des paliers de prix → sortir la capacité du backlog (ADR dédié ou amendement).
- Si le volume de soumissions ou le besoin de suivi grandit → reconsidérer la persistance (mini-CRM), en pesant le RGPD.
- Si Email Routing sortant se révèle indisponible/limité → basculer sur Resend (repli documenté).

---

## Constraints
> Compilées en hooks/CI (cf. ADR-0002, ADR-0006).
- **OBLIGATOIRE** : la route de soumission est un `writeHandler({auth:'public'})` avec vérification **Turnstile** avant tout traitement.
- **INTERDIT** : persister une soumission de formulaire (acheminement e-mail uniquement, FR-064).
- **INTERDIT** : envoyer un vrai e-mail en test (mailer mocké — garde-fou free tier, ADR-0005).
- **OBLIGATOIRE** : refuser l'envoi tant qu'un champ obligatoire est vide (FR-052) ou qu'un consentement requis manque (FR-060).
- **OBLIGATOIRE** : montants en centimes entiers ; total = somme pure (`@colibri/core`), jamais de flottant ni de règle conditionnelle en v1.
- **INTERDIT** : introduire logique conditionnelle, multi-étapes ou upload sans ADR (backlog).

## Related
- Consomme les seams de : ADR-0004 (`writeHandler` public, `sendMail`, `verifyTurnstile`, calcul de total pur).
- Briques : ADR-0003 (Cloudflare Email Routing, Turnstile).
- Testé par : ADR-0005 (route publique, Turnstile, e-mail mockés).
- Cadre : PRD (FR-040 → FR-065, US6, US7, SC-007), stack.md.
