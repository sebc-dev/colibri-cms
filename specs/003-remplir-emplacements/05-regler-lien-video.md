# 05 — Régler un emplacement de lien de vidéo

**Bloqué par :** 04
**Vérif :** test (couture haute `core/` pure pour la reconnaissance d'URL + couture d'intégration HTTP)
**Fichiers :** `src/core/` (reconnaissance d'un lien de vidéo), `src/pages/admin/` (route d'écriture, réutilise la colonne vertébrale de 04), `src/admin/` (champ de lien de vidéo et message d'erreur), `tests/integration/`

## Ce que ça livre
L'éditrice règle un emplacement de lien de vidéo en collant un lien externe : un lien reconnu est
enregistré au brouillon de la page (la page bascule à « brouillon », l'état publié reste intact,
via la colonne vertébrale d'écriture du ticket 04) ; un lien non reconnu est refusé au niveau du
champ, en disant ce qui est attendu, sans rien enregistrer. La reconnaissance est une logique pure de
`core/`, testable en aller-retour.

## Critères
- [ ] En `core/`, un lien de vidéo externe reconnu est accepté ; un lien non reconnu est rejeté.
- [ ] Par la couture HTTP, coller un lien reconnu persiste le brouillon et fait basculer la page à « brouillon », l'état publié restant intact.
- [ ] Par la couture HTTP, coller un lien non reconnu n'écrit aucun brouillon et ne fait pas basculer l'état de la page.
- [ ] À l'`Écran : Éditeur de page`, un lien non reconnu est refusé au niveau du champ (`États : erreur`) en disant ce qui est attendu.
- [ ] Aucun terme de développeur ne paraît dans le champ ni dans le message d'erreur.
