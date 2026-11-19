# 01 — Le fichier d'instance n'admet que des champs connus et bien formés

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/platform/instance/fichier-d-instance.ts`, `src/platform/instance/expediteur.ts`, `astro.config.ts`, `instance.json`, `wrangler.jsonc`, `.claude/skills/recette/scripts/recette.mjs`, `tests/unit/fichier-d-instance.test.ts`

## Ce que ça livre

Le **fichier d'instance** (`instance.json`) est, avec le contenu, la seule chose qui distingue le
site d'un client de celui d'un autre. Aujourd'hui, un champ inconnu y passe sans bruit : une clé
collée là par erreur resterait dans l'historique du dépôt du client. Ce ticket ferme cette porte :
la construction du site s'arrête, en nommant le champ, dès que le fichier porte un champ que le
produit ne connaît pas ou un champ connu mal formé.

**État du code.** `astro.config.ts` est le seul lecteur du fichier d'instance. Il valide à la main
`senderAddress` (par `exigerAdresseExpediteur`, `src/platform/instance/expediteur.ts`),
`depotDePublication` (par `depotValide`, `src/platform/publication/forge-github.ts`) et
`compteCloudflare` (32 hexadécimaux), ne valide pas `domain`, et laisse passer tout autre champ.
`instance.json` porte encore `turnstilePublicKey`, que plus rien ne lit depuis l'ADR-0028.

**Ce que ce ticket livre** (ADR-0034) :

- Un module unique de lecture du fichier d'instance dans `src/platform/instance/` : une fonction pure
  qui reçoit le texte du fichier et rend les valeurs, ou échoue en nommant le champ en cause. Les
  quatre champs connus sont `domain`, `senderAddress`, `depotDePublication`, `compteCloudflare`.
  `domain` et `senderAddress` sont exigés ; les deux autres peuvent manquer.
- `domain` est désormais validé : un nom d'hôte, sans schéma, sans chemin, non vide.
- `astro.config.ts` appelle ce module et ne valide plus rien lui-même. Les trois constantes injectées
  (`__ADRESSE_EXPEDITEUR__`, `__DEPOT_DE_PUBLICATION__`, `__COMPTE_CLOUDFLARE__`) gardent leur nom et
  leur valeur. Les messages d'erreur existants gardent leur forme (« instance.json : le champ … »).
- `instance.json` perd `turnstilePublicKey` et ne gagne rien. Les commentaires qui citent ce champ
  (`wrangler.jsonc`, `astro.config.ts`) sont mis à jour.
- L'outillage de recette cesse d'écrire ou de laisser passer un champ inconnu : sa fonction
  `ecrireInstance` relit le fichier du produit, donc elle suit sans autre changement, mais le ticket
  le vérifie en jouant `recette.mjs instance` puis une construction.

Le module est écrit pour être employé ensuite par la dérivation de la configuration de déploiement
et par le contrôle d'instance : il ne lit aucun fichier lui-même et ne dépend pas d'Astro.

**Tests.** Unité, sur la fonction pure. Oracle : la fonction rend les valeurs, ou lève une erreur
dont le message nomme le champ. Cas limites : champ inconnu ; `turnstilePublicKey` ; champ connu de
mauvais type ; domaine vide, avec schéma (`https://…`), avec chemin ; fichier vide ; JSON illisible ;
`depotDePublication` absent ; `compteCloudflare` absent ; les deux absents. Le test existant
`tests/unit/expediteur-instance.test.ts` reste vert sans retouche.

**Hors périmètre** : la complétude (les quatre champs exigés) et le refus des valeurs d'exemple, qui
relèvent du contrôle d'instance et non de la construction — le dépôt du produit doit continuer de se
construire avec ses valeurs d'exemple ; la dérivation de la configuration de déploiement ; tout champ
nouveau dans le fichier d'instance.

**Références** : ADR-0034 (`docs/adr/`), ADR-0005, invariants `I8` et `I19` de `docs/architecture.md`.

## Critères

- [ ] Quand le fichier d'instance porte un champ que le produit ne connaît pas, la construction s'arrête et le message nomme ce champ   (SC-01a)
- [ ] Quand l'identifiant du compte, le dépôt de publication, le nom de domaine ou l'adresse d'expéditeur est présent mais mal formé, la construction s'arrête et le message nomme le champ en cause   (SC-01b)
- [ ] Quand le fichier d'instance porte encore la clé publique de l'ancien test de présence humaine (`turnstilePublicKey`), la construction s'arrête en nommant ce champ   (SC-01c)
- [ ] Quand le fichier d'instance ne porte que le nom de domaine et l'adresse d'expéditeur, bien formés, la construction aboutit   (SC-01d)
