# ColibriCMS — Feuille de route

Les epics et leurs stories. **Une story = un change OpenSpec** : l'unité qui se propose, se
décompose en tickets, s'implémente et s'archive. Les epics, leurs résultats-clés et le rattachement
`FR`/`SC` sont dérivés de [`docs/vision.md`](./vision.md) (§ Découpage — epics) ; on ne les recopie
pas, on y renvoie.

> **Ce document ordonne, il ne mesure pas.** L'avancement réel — quels changes existent, quels
> tickets sont faits — se lit par `/scd-spec-dev:status`, jamais ici. Les cases ci-dessous marquent
> ce qui est **livré** (feature portée à son terme et fusionnée), pas l'état instantané d'un run.

Une story cochée a été livrée sous le système précédent (`scd-sdd`, dossiers `specs/NNN-*/`) ; les
stories à venir deviennent des changes OpenSpec sous `scd-spec-dev`. Deux identifiants ne sont
rattachés à aucune story, à dessein : **FR-117** (aucun terme de développeur dans l'interface)
s'impose à toutes, et **SC-002** (le site en production) est le critère-somme du produit entier.

---

## Epic A — Entrer et éditer · Now

Le cœur du produit : l'éditrice entre, remplit ses pages, gère ses images, règle ses formulaires,
prévisualise et publie. Résultats-clés : elle édite et publie seule, sans vocabulaire technique ;
aucune fausse manœuvre ne casse la mise en page ni ne laisse un trou dans une page publiée.

- [x] **001 — Connexion de l'éditrice par code** · *livrée* (FR-001→006, FR-008, FR-118,
      FR-120→122 · SC-006, SC-021)
- [x] **002 — Socle d'îlots d'administration shadcn-svelte** · *livrée* (aucun FR propre — substrat
      des features d'édition · SEC-1, ARCH-2, UX-1)
- [ ] **003 — Remplir et corriger les emplacements d'une page** · *en cours* (FR-015→026 · SC-003,
      SC-015)
- [ ] Bibliothèque de médias (FR-027→040 · SC-010, SC-018)
- [ ] Réglages transverses (FR-041→044 · SC-017)
- [ ] Réglage des formulaires de devis (FR-045→051 · SC-007)
- [ ] Aperçu et publication (FR-080→091 · SC-004, SC-016)

## Epic B — Convertir le visiteur · Next

Le site vitrine devient un outil qui rapporte : pages rapides, devis chiffré, demandes reçues et
pilotées. Le site public reste statique — un seul traitement serveur, l'envoi d'une demande.

- [ ] Composer et envoyer une demande de devis (FR-007, FR-052→062 · SC-007) — porte FR-007, le
      seuil par origine que 001 a déclaré hors-périmètre et lui délègue
- [ ] Réception et suivi des demandes (FR-063→079 · SC-007, SC-019)
- [ ] Site public rapide et complet (FR-095→097 · SC-005)

## Epic C — Filets & reprise · Later

Ce qui protège l'éditrice quand quelque chose tourne mal — sans destinataire au premier jour, mais
vital ensuite.

- [ ] Restauration : retour à la dernière version publiée (FR-092→094 · SC-009)
- [ ] Moyen de reprise (FR-009→012 · SC-020)
- [ ] Remplacement de l'adresse autorisée (FR-013, FR-014)

## Epic D — Flotte & réversibilité · Later

Ce qui rend la promesse commerciale vraie et exécutable : déployer, maintenir, et partir sans rien
perdre. *Later* dans l'ordre de construction, pas dans l'échéance — rien n'entre en production
(SC-002) sans instance déployée au nom du client, et la reconstruction s'éprouve « à la livraison »
(SC-011).

- [ ] Déployer une instance au nom du client (FR-098→104 · SC-001, SC-012, SC-013)
- [ ] Déployer une nouvelle version sur une instance existante (FR-105, FR-106 · SC-008)
- [ ] Reconstruire le site sans le CMS (FR-107→109 · SC-011)
- [ ] Dossier d'instance (FR-110→116, FR-119 · SC-014)
