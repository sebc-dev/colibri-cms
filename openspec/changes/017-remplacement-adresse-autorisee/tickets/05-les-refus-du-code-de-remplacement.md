# 05 — Un code de remplacement refusé dit quel geste reprendre et ne change rien

**Bloqué par :** 04
**Vérif :** tdd
**Fichiers :** `src/core/auth/verdict.ts`, `src/platform/auth/remplacement-adresse.ts`, `src/pages/admin/adresse-e-mail.astro`, `src/admin/textes.ts`, `tests/unit/verdict-remplacement.test.ts`, `tests/integration/adresse-e-mail-refus.test.ts`

## Ce que ça livre

Le **code de remplacement** est le code de huit signes que le produit envoie à la nouvelle adresse
(ticket 03) ; recopié dans la session qui a demandé le remplacement, il fait de cette adresse
l'**adresse autorisée** (ticket 04, `basculerSiCodeValide` dans
`src/platform/auth/remplacement-adresse.ts`). Ce ticket livre **les refus** : tout code qui ne doit
pas remplacer l'adresse est refusé, ne change rien, et l'écran dit lequel des deux gestes reprendre.

**Le verdict** (`src/core/auth/verdict.ts`, testé à l'unité) tranche à partir de la ligne lue en
entier, dans cet ordre : brûlé (cinq saisies fautives, `SEUIL_ESSAIS_BRULAGE`), déjà utilisé, annulé,
expiré (quinze minutes, borne `expire_le <= maintenant`), autre session que la demandeuse. Une saisie
dont l'empreinte ne correspond à aucune ligne incrémente `essais` sur le code actif de la session
(patron du code de connexion, ticket 07 du change 001) ; à la cinquième, le code est brûlé : même le
bon code ne sert plus.

**Les deux gestes** (`ux.md` § 4) :
- **retaper** — code fautif : « Ce code ne correspond pas. Vérifiez chaque signe, puis réessayez. » ;
- **demander un nouveau code** — brûlé, expiré, déjà servi, annulé (par un nouveau code ou une
  nouvelle proposition) : « Ce code ne peut plus servir. Demandez-en un nouveau. »
Chaque refus redit l'adresse en place (UX2).

**Les cloisons** (design D4, menace M5) : les codes de remplacement vivent dans `codes_remplacement`,
que ni l'écran de connexion ni le plafond de la connexion ne lisent. Un code de remplacement présenté
à l'écran de connexion n'ouvre donc aucune session — ce ticket le constate.

**Les termes de développeur.** Tous les textes de l'écran et de ses étapes existent désormais
(tickets 01 à 05) ; ce ticket contrôle qu'aucun ne porte un terme de la liste de FR-117, sur le
patron des tests existants (`tests/integration/code-de-secours-refus.test.ts`). Les textes ajoutés
plus tard (plafond, avis) portent leur propre contrôle.

**Hors de ce ticket.** La saisie depuis l'écran de connexion ne compte pas dans le seuil par origine
(proposal, point 6) : rien à ajouter. La fermeture des sessions (06), l'avis (07), le plafond (08).

## Critères
- [ ] un code fautif saisi : l'écran invite à retaper, et l'adresse autorisée ne change pas   (SC-05a)
- [ ] un code de remplacement qui a reçu cinq saisies fautives, puis le bon code saisi : l'adresse autorisée ne change pas, et l'écran invite à demander un nouveau code   (SC-05b)
- [ ] le code saisi plus de quinze minutes après son envoi (quinze minutes pile comprises) : l'adresse autorisée ne change pas, et l'écran invite à demander un nouveau code   (SC-05c)
- [ ] le code de remplacement saisi depuis une autre session que celle qui a demandé le remplacement ne change pas l'adresse autorisée   (SC-05d)
- [ ] un code de remplacement qui a déjà servi, saisi à nouveau, ne remplace rien   (SC-05e)
- [ ] un code de remplacement présenté sur l'écran de connexion n'ouvre aucune session   (SC-05f)
- [ ] un remplacement en cours vers une première adresse, puis une seconde adresse proposée : le remplacement vers la première est annulé, et un code envoyé pour la première adresse ne permet plus de remplacer l'adresse   (SC-05g)
- [ ] l'écran « Adresse e-mail », chacune de ses étapes et chacun de ses refus rendus ne portent aucun terme de développeur (FR-117)   (SC-05h)
