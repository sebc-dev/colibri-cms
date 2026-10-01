# 03 — Sur le serveur de recette, le code arrive dans la boîte de l'adresse autorisée

**Bloqué par :** 01, 02
**Vérif :** observé
**Fichiers :** `.claude/skills/recette/SKILL.md`, `.claude/skills/recette/scripts/`, `docs/cahier-de-test.md`

## Ce que ça livre

La preuve, en conditions réelles, que l'éditrice reçoit bien son code : sur le serveur de recette
(`colibri.sebc.dev`, vraie liaison d'expédition), on soumet l'adresse autorisée et le message
portant le code **arrive dans sa boîte**, avec pour expéditeur l'adresse d'expéditeur déclarée par
l'instance. Le parcours réel de connexion par e-mail redevient jouable en recette (cas CT-2.1,
CT-2.2 et la suite CT-3.x du cahier de test).

La recette de livraison gagne en même temps le geste qui rend l'envoi possible chez chaque
cliente : déclarer `senderAddress` dans le fichier d'instance, puis **activer l'acheminement
d'e-mail sur le domaine de cette adresse** dans le compte Cloudflare de la cliente — sur un
sous-domaine (Email Routing → Settings → Subdomains) quand le domaine principal reçoit déjà son
courrier ailleurs, **jamais** sur le domaine principal dans ce cas, car l'activation y remplacerait
les MX.

**Décisions à respecter :**
- Le serveur de recette déclare une adresse d'expéditeur sur `colibri.sebc.dev` (domaine routé). Le
  fichier d'instance servi par la recette la porte ; aucune valeur du compte de recette n'entre dans
  `wrangler.jsonc` ni `wrangler.astro.jsonc`.
- Le skill `recette` cesse de dire que le parcours réel « ne marche pas encore » : il décrit le
  parcours par e-mail (lecture du code dans la boîte de l'adresse de recette), et `journal` comme le
  lieu où se lit la ligne d'échec d'un envoi refusé. La session créée en base (`$R session`) reste
  disponible pour la relecture visuelle, mais n'est plus le détour obligé pour se connecter.
- Le cahier de test (§ 0.3 et §§ 2–3) cesse de décrire ce détour comme le seul moyen ; il décrit
  l'arrivée du message et le geste d'activation de l'acheminement d'e-mail.
- Aucun texte visible par l'éditrice ne change.

**Preuve attendue :** après bâti et déploiement sur le serveur principal de recette, une demande de
code sur `https://colibri.sebc.dev/admin/connexion` ; message reçu dans la boîte de l'adresse
autorisée de recette, objet fixe, texte seul, en-tête `From` = l'adresse déclarée (capturé). Le
code reçu ouvre la session. L'activation de l'acheminement d'e-mail sur le domaine de recette est un
**geste humain** dans le compte Cloudflare : s'il manque, le critère reste à constater par l'humain.

**Hors périmètre :** automatiser l'activation de l'acheminement d'e-mail ; la mise à jour des dépôts
de cliente existants (geste de livraison, hors de ce dépôt).

## Critères
- [ ] Quand l'adresse autorisée est soumise sur une instance livrée, dont l'acheminement d'e-mail est activé sur le domaine de l'adresse d'expéditeur, un message portant le code arrive dans la boîte de l'adresse autorisée   (SC-03a)
