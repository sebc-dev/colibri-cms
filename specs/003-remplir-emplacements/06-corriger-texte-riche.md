# 06 — Corriger un emplacement de texte riche

**Bloqué par :** 04
**Vérif :** test (couture haute `core/` pure pour la sérialisation + couture d'intégration HTTP)
**Fichiers :** `src/core/` (sérialisation en Markdown restreint, liste des marques et schémas d'URL), `src/admin/` (éditeur TipTap en îlot, barre de mise en forme), `src/pages/admin/` (route d'écriture, réutilise la colonne vertébrale de 04), `tests/integration/`

## Ce que ça livre
L'éditrice met en forme un emplacement de texte riche — gras, italique, lien, liste, titre — sans
jamais écrire de balise, et enregistre : le contenu est sérialisé en Markdown restreint et va au
brouillon (la page bascule à « brouillon », l'état publié reste intact, via la colonne vertébrale du
ticket 04). Seules les marques dont l'aller-retour est testé survivent ; une marque hors liste est
écartée. Seuls les schémas d'URL `https`, `mailto`, `tel` et les chemins relatifs sont admis dans un
lien ; tout autre schéma est rejeté. L'éditeur est TipTap, monté en îlot sous CSP stricte. Le rendu
HTML du Markdown n'est pas ici — il naît avec l'aperçu (hors-périmètre, I5 / `render/markdown/`).

## Critères
- [ ] En `core/`, l'aller-retour de sérialisation d'une marque retenue (gras, italique, lien, liste, titre) préserve la marque.
- [ ] En `core/`, une marque hors de la liste retenue est écartée à la sérialisation.
- [ ] En `core/`, un lien vers un schéma d'URL non autorisé (hors `https`, `mailto`, `tel`, relatif) est rejeté.
- [ ] À l'`Écran : Éditeur de page`, la barre de mise en forme pose gras, italique, lien, liste et titre sans que l'éditrice écrive de balise.
- [ ] Par la couture HTTP, enregistrer une correction de texte riche persiste le brouillon en Markdown restreint et fait basculer la page à « brouillon », l'état publié restant intact.
- [ ] Aucun terme de développeur ne paraît dans l'éditeur de texte riche ni dans sa barre de mise en forme.
