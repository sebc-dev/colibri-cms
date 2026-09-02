# CSS d'administration inline au build, refusée par la CSP stricte

Portée : 001-connexion-par-code
Ouvert le 2026-09-02 · branche `fix/csp-styles-inline-admin` · HEAD `a465da1`

## Objectif
Ouvrir `/admin/ilots` sous l'artefact bâti (vérif C4 du ticket 002-01) sans
violation CSP. La console signalait une violation `style-src` et l'admin se
rendait sans style.

## Issue
- **Cause** : le défaut Astro `inlineStylesheets: 'auto'` inline
  `src/admin/admin.css` (~120 o) en bloc `<style>` dans le HTML bâti ; la CSP
  `style-src 'self'` sans `unsafe-inline` (ADR-0008) le refuse. Le source
  (`Gabarit.astro`) liait pourtant la feuille correctement — c'est le **build**
  qui la défaisait.
- **Portée réelle** : présent sur toutes les pages d'administration (constaté
  aussi sur `/admin/connexion`), donc **préexistant à la feature 002**. Contredit
  le critère de `specs/001-connexion-par-code/02-politique-de-securite.md`
  (« aucun gabarit servi sous /admin/ ne porte de bloc `<style>` »), coché mais
  jamais éprouvé contre l'artefact bâti — le dépôt ne porte aucun fichier de test.
- **Correctif** : `build.inlineStylesheets: 'never'` dans `astro.config.ts` →
  CSS servie en `<link>` externe même origine, autorisé par `'self'`. Commit
  `a465da1`. Preuve : au rebuild, `dist/client/_astro/*.css` externe apparaît,
  zéro CSS inline dans `dist/server`.

## Écarté
- `unsafe-inline` / nonce / empreinte dans la CSP — ADR-0008 les exclut ; ce
  serait affaiblir la parade plutôt que corriger le build.
- Plier le correctif dans le run du ticket 002-01 — hors périmètre (défaut de la
  feature 001) ; garderait la PR du ticket mélangée à un correctif transverse.

## Contexte à charger
à situer  `astro.config.ts` § `build.inlineStylesheets` — le pourquoi du réglage
