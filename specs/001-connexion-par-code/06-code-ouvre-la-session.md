# 06 — Le code recopié ouvre la session

**Bloqué par :** 03
**Vérif :** test
**Fichiers :** `migrations/` (sessions), `src/core/auth/verdict.ts`, `src/platform/auth/magasin.ts`, `src/platform/session/index.ts`, `src/pages/admin/connexion.astro`, `src/admin/`, tests

## Ce que ça livre

L'éditrice recopie le code reçu sur le même appareil, et se retrouve dans son administration : la
session s'ouvre, l'accueil s'affiche. C'est le chemin nominal du parcours, et la première fois que
l'accueil livré par le ticket 01 (la porte close) est réellement atteignable.

Trois bornes tiennent ce chemin, et elles sont ici parce qu'elles définissent ce qu'est un code
valide : il n'ouvre une session que sur l'appareil qui l'a demandé, une seule fois, et dans les
quinze minutes. C'est aussi ce ticket qui rend honnête l'import du garde par la route de connexion —
importer sans jamais appeler est l'angle mort qu'ADR-0007 déclare assumé.

La session est opaque en base : il n'y a pas de clé de signature à ranger ni à faire tourner, et le
cookie ne porte rien qui se lise.

La saisie se normalise, parce qu'un alphabet sans confusables n'a de sens que si la lecture en tient
compte : ce qui se recopie à la main se recopie avec des majuscules, des espaces, et un `O` pour un
zéro.

## Critères

- [x] le code recopié sur l'appareil qui l'a demandé ouvre une session et renvoie vers l'accueil
- [x] l'accueil s'affiche alors, et ne porte toujours aucune fonction
- [x] la saisie est normalisée : casse indifférente, séparateurs ignorés, confusables ramenés à leur signe
- [x] le même code présenté une seconde fois n'ouvre pas de session
- [x] un code présenté au-delà de quinze minutes n'ouvre pas de session — jugé à instant injecté
- [x] le cookie de session porte le préfixe `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict` et `Path=/`, et rien de la session ne s'y lit
- [x] l'écran de saisie dit combien de temps le code reste bon, sans aucun terme de développeur
