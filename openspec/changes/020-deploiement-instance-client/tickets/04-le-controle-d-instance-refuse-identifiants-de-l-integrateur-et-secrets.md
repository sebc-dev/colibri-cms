# 04 — Le contrôle d'instance refuse tout identifiant désigné de l'intégrateur et toute valeur à forme de clé

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `src/platform/instance/controle.ts`, `scripts/livraison.mjs`, `tests/unit/controle-d-instance-depot.test.ts`

## Ce que ça livre

Le dépôt d'un client ne doit porter ni identifiant de l'**intégrateur** (son nom de compte, son nom
de domaine, son adresse e-mail), ni secret. Un identifiant de l'intégrateur resté là fait dépendre
l'instance de lui ; une clé collée dans un fichier reste dans l'historique du dépôt. Ce ticket étend
le **contrôle d'instance** : il cherche ces deux choses dans **tout fichier versionné** du dépôt du
client, et refuse en nommant le fichier.

**État du code.** Le contrôle d'instance (`src/platform/instance/controle.ts`, geste
`controler <dépôt>` de `scripts/livraison.mjs`) ne juge aujourd'hui que le fichier d'instance. Sa
fonction rend une liste de refus.

**Ce que ce ticket livre** :

- Le geste devient `controler <dépôt> [--proscrire a,b,…]`. La liste des identifiants à proscrire
  vient **de la ligne de commande seule**. Elle n'est écrite dans aucun fichier du produit, et le
  contrôle n'ouvre aucun fichier pour la composer : sinon le produit porterait lui-même les
  identifiants de l'intégrateur.
- La fonction pure reçoit en plus la liste des fichiers versionnés avec leur texte, et la liste des
  identifiants à proscrire. Elle cherche chaque identifiant **sans égard à la casse**, y compris à
  l'intérieur d'un mot plus long, dans chaque fichier, fichier d'instance et contenu compris. Le
  refus nomme le fichier et l'identifiant trouvé.
- Elle cherche aussi, dans chaque fichier, les formes connues de clé : clé d'accès au dépôt
  (`github_pat_…`, `ghp_…`) et préfixes de clé de la plateforme Cloudflare en vigueur. Le refus nomme
  le fichier et la ligne, **jamais la valeur ni aucune partie d'elle**.
- L'enveloppe obtient la liste des fichiers versionnés par git (`git ls-files` dans le dépôt
  contrôlé) et lit leur texte. Elle ne modifie rien.

**Tests.** Unité sur la fonction pure. Oracle : la liste des refus (fichier, motif). Cas limites :
identifiant en autre casse ; à l'intérieur d'un mot plus long ; dans un fichier de contenu ; dans un
fichier hors du contenu ; liste de proscrits vide (aucun refus à ce titre) ; clé à la forme connue
dans un fichier de contenu. Pour « jamais la valeur » : le test pose une clé de valeur connue et
cherche cette valeur, et ses fragments, dans les messages de refus. Un test vérifie que le contrôle
n'ouvre aucun fichier pour composer la liste des proscrits.

**Hors périmètre** : détecter un secret de forme inconnue ; analyser l'historique git du dépôt ;
contrôler autre chose que les fichiers versionnés ; ranger la liste des proscrits où que ce soit.

**Références** : `docs/security.md`, ADR-0005 (`docs/adr/`), invariant produit « aucun identifiant
appartenant à Isometria dans le code ou la config » (`CLAUDE.md`).

## Critères

- [ ] Quand le contrôle est lancé en désignant un identifiant de l'intégrateur et que le dépôt de publication du fichier d'instance le porte, le contrôle échoue en nommant le fichier d'instance et l'identifiant trouvé   (SC-04a)
- [ ] Quand le contrôle est lancé en désignant un nom de domaine de l'intégrateur et qu'un fichier du contenu le porte, le contrôle échoue en nommant ce fichier   (SC-04b)
- [ ] Quand l'identifiant désigné figure dans le dépôt avec une autre casse, le contrôle échoue de la même façon   (SC-04c)
- [ ] Quand les identifiants désignés ne figurent nulle part dans le dépôt, aucun refus n'est émis à ce titre   (SC-04d)
- [ ] Quand un fichier versionné porte une valeur de la forme d'une clé d'accès au dépôt, le contrôle échoue en nommant le fichier, et le message ne reproduit ni la valeur ni aucune partie d'elle   (SC-04e)
- [ ] Quand aucun fichier versionné ne porte de valeur de cette forme, aucun refus n'est émis à ce titre   (SC-04f)
