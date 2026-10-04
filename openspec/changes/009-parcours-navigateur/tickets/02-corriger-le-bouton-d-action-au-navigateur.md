# 02 — L'éditrice corrige le bouton d'action de l'accueil au navigateur, sans aucune violation de la politique de sécurité

**Bloqué par :** 01
**Vérif :** test
**Fichiers :** `tests/parcours/correction-bouton.parcours.ts`, `tests/parcours/garde-politique.ts`, `docs/test.md`

## Ce que ça livre

Le dispositif de parcours existe déjà (ticket 01) : `npm run parcours` bâtit le site, le sert en local
par `wrangler dev` sur une base neuve, sème une session, et Chromium entre dans l'administration en
tant qu'éditrice. Ce ticket y joue le **parcours pilote**, le geste qui a échappé aux tests serveur à la
PR #72 : sur l'éditeur de la page Accueil (`/admin/pages/accueil`), l'éditrice remplace le libellé du
bouton d'action (« Demander un devis », emplacement `bouton-devis`) par un autre libellé et enregistre.
L'écran annonce l'enregistrement, la marque de brouillon de la page apparaît **sans recharger
l'écran**, et après rechargement la correction est toujours là. Ce geste exerce en une passe le cadre
de l'administration, le montage d'un îlot Svelte, l'envoi d'une correction (POST de même origine,
anti-forgerie par le seul cookie `SameSite=Strict`, ADR-0011) et la marque de brouillon.

Il pose aussi la **garde contre les violations de la politique de sécurité**, qui vaut pour tout
parcours : la moindre ressource bloquée par la politique servie fait échouer le parcours en nommant la
directive et la ressource bloquées. Le ticket prouve que cette garde **mord**, en rejouant
localement le défaut de la PR #72.

Enfin, il fait passer l'étage « Parcours » de `docs/test.md` de « à venir » à présent.

**Décisions à respecter :**
- **La garde.** Le contexte du navigateur écoute l'évènement `securitypolicyviolation` (script
  d'initialisation injecté par Playwright, hors de portée de la politique de la page — il n'exige
  aucune source supplémentaire) **et** les messages de console « Refused to … ». Toute occurrence fait
  échouer le parcours, quel que soit le geste en cours, en nommant la directive et la ressource.
- **La politique n'est pas touchée.** La garde se joue contre la politique telle qu'elle est servie.
  Ajouter une source à `POLITIQUE_DE_SECURITE` ou modifier quoi que ce soit sous
  `src/platform/entetes/` pour faire passer le parcours est interdit : c'est la menace principale de
  ce change.
- **La preuve que la garde mord est une passe d'épreuve, jamais commitée.** On prive à dessein la
  politique servie de `connect-src`, on joue le parcours pilote, on joint sa sortie (échec nommant
  `connect-src`) à la PR, puis on restaure. Aucune trace de cette modification ne reste dans la branche.
- **Désignation par rôle et nom accessibles** (libellé du champ, nom du bouton), jamais par classe ou
  structure de DOM : le parcours lit l'écran comme l'éditrice.
- **Attentes sur l'état de l'écran**, jamais de délais fixes ; pas de `retries`.
- **Libellé corrigé** : un libellé non vide et différent de l'original. Les refus (libellé vide,
  destination invalide) relèvent des tests serveur existants, pas de ce parcours.
- **Aucun double** : ni `fetch` simulé, ni liaison remplacée, ni module du produit doublé.

**Hors périmètre :** le job de CI (ticket 03) ; les cas fins de chaque îlot (chaque refus, chaque
état) ; les autres parcours (téléversement d'une image, connexion par code, réglages, site public) ; la
mesure de couverture du code navigateur ; toute modification du produit.

## Critères
- [ ] Quand l'éditrice remplace, sur l'éditeur de la page Accueil, le libellé du bouton d'action par un autre libellé et enregistre, l'écran annonce l'enregistrement, la marque de brouillon de la page apparaît sans rechargement, et après rechargement le champ porte toujours le nouveau libellé   (SC-02a)
- [ ] Quand le parcours pilote se joue en entier, aucun évènement `securitypolicyviolation` et aucun message de console « Refused to … » ne s'est produit ; dans le cas contraire, le parcours échoue en nommant la directive et la ressource bloquées   (SC-02b)
- [ ] Quand on prive à dessein la politique servie de `connect-src` (passe d'épreuve locale, jamais commitée), le parcours pilote échoue sur la garde en nommant `connect-src` — la reproduction du défaut de la PR #72   (SC-02c)
- [ ] Quand deux passes de parcours s'enchaînent, la seconde voit le libellé d'origine du bouton d'action (« Demander un devis »), et non la correction enregistrée par la première   (SC-02d)
- [ ] Quand on compare la branche du ticket à `main`, aucun fichier sous `src/`, `migrations/`, `content/` ni `public/` n'est modifié   (SC-02e)
