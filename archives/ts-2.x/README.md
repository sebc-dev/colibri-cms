# Archive — ColibriCMS TypeScript (cycle 2.x)

Référence historique, **pas la réalité courante**. Le projet repart de zéro en Rust
(voir `docs/prototype-rust/decision.md`). Le code TypeScript (Astro, Svelte, tests `workerd`,
migrations D1) n'est plus dans l'arbre : il reste lisible dans l'historique git, sur `main`
avant la bascule (dernier commit TypeScript : `0e262e5`).

Ce qui peut encore servir :

| Chemin | Contenu | Utile pour |
|---|---|---|
| `docs/vision.md` | Vision produit, exigences FR et critères SC | Le « quoi » : il ne dépend pas du langage |
| `docs/roadmap.md` | Feuille de route 2.x | Découpage fonctionnel |
| `docs/architecture.md` | Invariants I1–I10 | Contraintes à retraduire dans les crates |
| `docs/security.md` | Modèle de menace, authentification, CSP | Authentification OTP, cookies, CSP |
| `docs/design-system.md` | Interface d'administration | Gabarits askama et îlot Tiptap |
| `docs/test.md`, `docs/cahier-de-test.md` | Stratégie de test et cahier de recette | Scénarios à rejouer |
| `docs/ci.md` | CI informative du cycle 2.x | Contre-exemple et historique |
| `docs/adr/` | ADR 0001 et suivants, candidats | Décisions à reconduire ou à remplacer |
| `docs/chantiers/`, `docs/legacy/` | Fiches de chantier, cycle 1.x, preuves, recherches | Historique |
| `openspec/` | Specs vivantes et changes OpenSpec | Comportements attendus, scénarios |
| `recette/` | Site factice de recette | Données de test |
| `CLAUDE.md` | Consignes agent du cycle TypeScript | Glossaire du domaine, invariants produit |
| `.claude/` | Agents de la quality gate, skills de recette | Modèles à adapter |
| `.github/workflows/` | CI TypeScript | Modèle à adapter |
