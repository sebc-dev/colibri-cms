# Un jeton GitHub inutilisé est-il retiré, et la règle vise-t-elle le nôtre ? — relevé

*Lecture de documentation du 12 août 2026, sur `docs.github.com` et sur le dépôt `github/docs`.
Instruit le troisième des quatre faits de `S-10` de `docs/audit-stack.md` — la phrase « removes
personal access tokens that haven't been used in a year », étiquetée `[officiel · rapporté]` dans
`docs/stack.md` sans emplacement citable.*
*Ce document est un **relevé de source**, pas une mesure : rien n'a été exécuté contre l'API GitHub,
et aucune expiration n'a été observée. Il établit **où** la règle est écrite et **quel type de jeton**
elle vise.*
*Trace rejouable — URL, citations verbatim et commandes de datation :
`2026-08-12-jeton-github-desuetude.transcript.txt`.*

---

## TL;DR

**La règle existe, elle vise bien notre jeton, et la phrase que la stack citait visait l'autre.**

1. **Le fait est documenté à trois endroits.** Il n'était pas insourçable — il était non cité.
2. **La phrase reprise par la stack est sous le mauvais titre.** Le mot-à-mot
   « GitHub automatically removes personal access tokens that haven't been used in a year » vit sur
   *Managing your personal access tokens*, **dans la section « Personal access tokens (classic) »**.
   La section « Fine-grained personal access tokens » de la même page ne dit **rien** de la
   désuétude et ne renvoie pas à la règle des classiques. Or le jeton de la publication est **à
   portée fine**. Telle qu'elle était citée, la phrase parlait d'un autre type de jeton.
3. **Il existe une citation correctement portée.** *GitHub credential types reference*,
   § « Credential revocation », ligne **Fine-grained personal access token** :
   « **Revoked automatically** if pushed to a public repository or gist, or **if unused for one
   year** ». C'est celle-ci qui doit être citée.
4. **Elle corrobore un second fait, obtenu par mesure la veille.** Le tableau d'ensemble de la même
   page donne, en colonne *Lifespan* pour un jeton à portée fine : « Configurable (up to 1 year, **or
   no expiration**) ». La documentation confirme donc ce que le relevé du 11/08 avait établi par
   témoin : un tel jeton **peut n'avoir aucune expiration**.
5. **Une troisième page donne la formulation générale**, sans qualifier le type de jeton :
   *Token expiration and revocation*, § « Token expired due to lack of use » — « GitHub will
   automatically revoke an OAuth token or personal access token when the token hasn't been used in
   one year. »

**Le fait 3 est donc confirmé, et son niveau de preuve monte de « rapporté » à « officiel · cité ».**
Le motif du Cron Trigger de maintien en vie tient — mieux qu'avant, puisqu'il repose désormais sur
la ligne qui parle du bon jeton.

---

## Ce qui a été lu, et comment

**Trois pages de `docs.github.com`**, lues le 12/08/2026, citées par leur titre, leur section et
leur URL. Les phrases sont reprises **verbatim**.

**La question de portée a été posée deux fois, différemment**, précisément parce que la réponse
décidait de l'arbitrage : d'abord « sous quel titre cette phrase se trouve-t-elle », puis, sur la
même page, « la section *Fine-grained personal access tokens* mentionne-t-elle la désuétude, et
la page dit-elle quelque part que la règle des classiques s'applique aussi aux jetons à portée
fine ». Les deux lectures concordent : la phrase est sous le titre des classiques, et aucun renvoi
ne l'étend.

**La datation ne peut pas suivre la forme employée pour Cloudflare.** Les pages de Cloudflare citées
en `S-06` et `S-09` affichent une date de dernière mise à jour ; **celles de GitHub n'en affichent
aucune**. La date est donc prise à la source du contenu — le fichier Markdown dans le dépôt public
`github/docs` — par son dernier commit. C'est une trace plus dure qu'une date imprimée, et elle se
rejoue d'un appel (`gh api`).

---

## Les emplacements

| Fait | Emplacement citable | Dernier commit du fichier source |
|---|---|---|
| Un jeton **à portée fine** est révoqué s'il reste **un an sans usage** — et aussi s'il est poussé dans un dépôt ou un gist public | *GitHub credential types reference* › § « Credential revocation » › ligne **Fine-grained personal access token** | `6f9f6f89`, **2026-06-23** |
| Un jeton à portée fine peut avoir **une durée de vie infinie** | *GitHub credential types reference* › tableau d'ensemble, colonne *Lifespan* : « Configurable (up to 1 year, or no expiration) » | `6f9f6f89`, **2026-06-23** |
| Formulation générale, **sans qualification** de type : « an OAuth token or personal access token » | *Token expiration and revocation* › § « Token expired due to lack of use » | `3c5bf3cf`, **2026-07-08** |
| La phrase que la stack citait — **portée aux jetons classiques** | *Managing your personal access tokens* › § « Personal access tokens (classic) » | `3363b628`, **2026-07-30** |

URL, dans le même ordre :

- <https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/github-credential-types>
- <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation>
- <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens>

---

## Un effet de bord, gratuit

La même ligne de *Credential revocation* donne une seconde cause de révocation automatique d'un
jeton à portée fine : **s'il est poussé dans un dépôt ou un gist public**. Le jeton de la publication
vit en secret de Worker et n'a aucune raison d'entrer dans le dépôt ; c'est donc un filet, pas une
contrainte. Aucun mécanisme n'en découle, et rien n'est à écrire — mais c'est un fait de plateforme
de plus au dossier, et il va dans le sens de `I4`.

---

## Ce que ce relevé **ne** dit **pas**

- **Il n'observe aucune révocation.** Aucun jeton n'a été laissé au repos, aucune expiration n'a été
  constatée. C'est un relevé de **ce qui est écrit**, au même titre que les citations Cloudflare de
  `S-06` et `S-09` — et contrairement aux cinq premières lignes du tableau du jeton d'écriture, qui
  sont, elles, mesurées.
- **Il ne prouve pas que l'horloge se réinitialise à chaque usage.** « hasn't been used in one year »
  est une fenêtre glissante, ce qui va dans le sens du maintien en vie, mais **GitHub n'écrit nulle
  part** que le compteur repart à zéro. C'est une **lecture**, et le Cron de maintien en vie en
  dépend entièrement.
- **Il ne dit rien de ce qui compte comme « usage ».** L'« appel anodin périodique » du Cron est
  supposé compter ; aucune page ne définit le geste qui rafraîchit la date de dernier emploi.
- **Il ne dit pas si la cliente serait avertie.** Aucune des trois pages ne mentionne de
  notification avant la révocation pour désuétude.
- **Il ne couvre pas la branche GitHub App**, restée non instruite depuis le 11/08.
- **Il vieillit.** Les quatre emplacements sont datés du 12/08/2026 par le commit de leur fichier
  source ; une page de documentation se réécrit sans préavis.
