# ADR-0011 : Anti-forgerie des écritures d'administration — le cookie `SameSite=Strict`, sans jeton dédié
Statut : Accepté | Date : 2026-09-05

## Contexte
Le SPEC de 001 (connexion par code) a déclaré le jeton anti-forgerie « à naître avec la première
écriture depuis une session ouverte », cette feature n'en introduisant aucune. La feature 003
(remplir et corriger les emplacements d'une page) introduit cette **première écriture** : enregistrer
une correction d'emplacement dans le brouillon d'une page. Toute écriture d'administration ultérieure
(médias, réglages, formulaires, publication, suivi des demandes) en héritera — la décision est donc
transverse, et sécuritaire : elle ne se tranche pas au fil d'un ticket.

Le cookie de session vit sur l'**origine commune** au public et à l'administration (préoccupation
`SEC-1` de `docs/vision.md` : tout script tiers chargé où que ce soit est un risque XSS contre lui).
Une écriture authentifiée doit résister à la falsification cross-site (une page tierce qui déclenche,
dans le navigateur de l'éditrice connectée, une requête d'écriture vers l'administration). La session
de 001 pose déjà le cookie `__Host-session` avec `Path=/`, `HttpOnly`, `Secure` et **`SameSite=Strict`**
(`src/platform/session/index.ts`) : le navigateur n'attache alors ce cookie à aucune requête initiée
depuis un autre site, ce qui prive une requête forgée cross-site de la session.

## Décision
Nous fondons l'anti-forgerie des écritures d'administration sur le cookie de session **`SameSite=Strict`**
déjà posé par 001. Aucune écriture d'administration — 003 comprise, et celles qui suivront —
n'introduit de **jeton anti-forgerie dédié**.

## Conséquences
**Positives.**
- Aucune plomberie de jeton à porter sur chaque écriture de chaque feature d'administration : la
  protection est un attribut du cookie, posé une fois, uniforme sur toute la flotte (FR-105/SC-008 :
  aucun code propre à une cliente).
- La propriété est concentrée en un seul lieu — le composeur du cookie de session — plutôt que
  dispersée sur chaque formulaire et chaque route.

**Négatives — ce que le choix ferme.**
- On s'en remet à l'**application par le navigateur** de `SameSite` ; il n'y a pas de défense en
  profondeur par un second facteur applicatif si cette application venait à manquer.
- Cela ne concerne pas le **XSS same-origin** — menace distincte, qu'un jeton anti-forgerie ne
  protégerait pas davantage (un script injecté dans la page lirait le jeton et l'emploierait). Le XSS
  est traité par des décisions séparées : la CSP stricte de l'administration (`SEC-1` / ADR-0010 —
  CSP admin, `script-src` maintenu strict), le confinement du HTML brut à `src/render/markdown/`
  (candidat `html-brut-confine-au-rendu-markdown`) et le texte riche en Markdown restreint (`SEC-6` /
  candidat `texte-riche-markdown-restreint`).

## Alternatives considérées
- **Un jeton anti-forgerie dédié (double-submit cookie ou synchronizer token) sur chaque écriture** :
  écarté car redondant avec `SameSite=Strict` sur une administration à **origine unique**, et
  inopérant contre la seule menace résiduelle — le XSS same-origin — déjà traitée par la CSP et le
  confinement du HTML. Il ajouterait une plomberie transverse sans fermer aucune surface que le cookie
  ne ferme déjà.

## Vérifiable ?
Partiellement. La **présence de `SameSite=Strict`** sur le cookie de session est une trace observable
dans le composeur du cookie (`src/platform/session/`), qu'un contrôle pourrait figer. En revanche
l'**absence de jeton dédié** est une décision de principe, sans trace mécanique — on ne vérifie pas un
mécanisme qui n'existe pas.
