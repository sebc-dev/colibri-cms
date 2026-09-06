# Prompt — Enveloppe du palier gratuit Cloudflare sans moyen de paiement enregistré

Composé le 2026-08-10 · à jouer dans Claude Research (Claude Desktop)
Rapport attendu sous `docs/research/AAAA-MM-JJ-palier-gratuit-cloudflare-sans-carte.md`

---

## Question

Pour chacun des sept composants Cloudflare listés ci-dessous, trois faits, et rien d'autre :

1. **Le composant s'active-t-il, et fonctionne-t-il durablement, sur un compte Cloudflare qui n'a
   aucun moyen de paiement enregistré ?** (pas « existe-t-il un palier gratuit » — la question est
   l'absence de carte au dossier.)
2. **Quelles sont les limites du palier gratuit**, chiffre par chiffre, et **à quelle date chacune
   a-t-elle bougé pour la dernière fois** ?
3. **Que se passe-t-il au dépassement ?** Il s'agit de départager deux comportements qui n'ont pas
   du tout la même conséquence :
   - **mur** — la requête est refusée, une erreur temporaire est rendue, le service se dégrade ou
     s'arrête, et rien n'est dû ;
   - **compteur facturé** — la consommation au-delà du palier est comptabilisée puis facturée, ou
     le compte bascule automatiquement sur une offre payante.

**Décision que cette réponse doit servir.** Elle commande l'arbitrage racine de la phase Stack d'un
CMS auto-hébergé chez le client : où vit le magasin de l'état publié, où vivent les médias, quel
runtime sert le site public, quel moyen protège les surfaces exposées, et où vit l'état applicatif.
Aucun de ces domaines n'est tranché tant que cette enveloppe n'est pas connue.

**Le critère qui gouverne tout, à appliquer tel quel à chaque composant** — invariant du projet, cité
ici comme grille de lecture, non comme fait à sourcer :

> Aucun prélèvement n'est possible sans un acte du client. Ce qui rend le prélèvement impossible
> n'est pas le palier gratuit mais **l'absence de moyen de paiement enregistré** : les limites
> gratuites sont des **murs** (refus, erreur temporaire), **jamais des compteurs facturés**.

Un composant dont le palier gratuit est généreux mais dont le dépassement se facture **échoue** au
critère. Un composant dont le palier est étroit mais dont le dépassement est un mur **le satisfait**.
Le rapport doit trancher dans ces termes-là.

## Périmètre

**Inclus — sept composants :**

- **Cloudflare Pages** et **Cloudflare Workers avec assets statiques**, traités comme deux options
  concurrentes pour servir un site vitrine statique plus un unique traitement serveur (l'envoi d'un
  formulaire). Ce qui les départage compte autant que leurs limites respectives : convergence
  annoncée, dépréciation éventuelle de l'un des deux, limites qui diffèrent réellement.
- **R2** (stockage objet).
- **D1** (base relationnelle).
- **Workers KV**.
- **Durable Objects** — en distinguant explicitement ce qui est accessible sans offre payante de ce
  qui ne l'est pas (backends de stockage, classes d'objets).
- **WAF** — les règles disponibles sur une zone gratuite.
- **Turnstile** — palier gratuit, limites, et conditions d'usage.

**Inclus aussi, transversal :** existe-t-il, sur un compte sans moyen de paiement, un mécanisme
global de bascule automatique vers une offre payante, ou un déblocage automatique du dépassement ?
Et à l'inverse : que devient un compte gratuit qui dépasse durablement — suspension, blocage du
service, blocage du compte entier ?

**Exclus :**

- toute offre payante, tout palier Pro/Business/Enterprise, sauf pour dire **où le mur se situe** ;
- les alternatives hors Cloudflare : l'hébergement est une donnée d'entrée du projet. Un composant
  qui échoue au critère se rend comme un **constat d'échec**, sans proposer de remplaçant ;
- Workers Builds et l'outillage de CI de la plateforme ;
- les comparaisons de performance, de latence ou de couverture géographique ;
- le prix des offres payantes.

**Horizon.** La réponse doit être vraie au **10 août 2026**. Ces paliers ont bougé plusieurs fois :
pour chaque chiffre, donner la date de la page consultée et, si elle est trouvable, la date du
dernier changement de la valeur. Un chiffre sans date n'est pas utilisable ici.

## Contraintes de sourcing

- Source primaire exigée pour tout chiffre — documentation Cloudflare, page de tarification,
  changelog, conditions de service. Remonter au document d'origine : un chiffre trouvé sur trois
  billets qui se citent l'un l'autre est **une seule** source, non recoupée.
- Étiqueter chaque source : officiel · préprint indépendant · benchmark d'éditeur · commercial.
- Séparer les niveaux de preuve : mesuré / rapporté / anecdotique / non étayé.
- Citer **verbatim** le passage qui porte chaque affirmation, et attribuer par affirmation — pas de
  bibliographie en fin de document que rien ne relie au texte.
- **L'absence de donnée est un résultat.** « La documentation ne dit pas ce qui se passe au
  dépassement pour ce composant » est une réponse recevable et utile ; une approximation
  vraisemblable ne l'est pas. Dire « je ne sais pas » est explicitement permis.
- Les conditions de service et la politique de facturation comptent autant que les pages de
  tarification, et se contredisent parfois : le signaler quand c'est le cas.

**Ce qui ne se prouve que dans le tableau de bord.** Une partie de la question — « ce composant
s'active-t-il sans carte au dossier ? » — ne se constate qu'en étant connecté, derrière une
authentification que la recherche ne franchira pas. Ne pas la combler par déduction. Rassembler
plutôt, **dans une section distincte du rapport**, la liste des faits qui ne se règlent que par une
manipulation, et pour chacun **le geste exact à faire** sur un compte Cloudflare existant sans carte
(quel écran, quel bouton, quel message d'erreur attendu, ce qu'il faudrait observer pour conclure).
Cette section est un livrable à part entière, pas un aveu d'échec.

## Hypothèses concurrentes

Quand les sources divergent, poser H1 / H2, ce qui les départagerait, et la confiance de chacune,
sans trancher artificiellement. Une divergence entre deux pages officielles de Cloudflare est une
information sur le sujet, pas un bruit à lisser.

Trois divergences sont attendues, et méritent ce traitement :

- **Pages contre Workers avec assets** — la documentation pousse à la convergence, la réalité des
  limites peut différer. H1 : les deux sont équivalents pour ce cas d'usage, le choix est indifférent.
  H2 : l'un des deux impose une limite qui mord sur un site vitrine (nombre de fichiers, taille d'un
  déploiement, nombre de déploiements). Dire ce qui les départage, chiffres à l'appui.
- **Le dépassement sur compte sans carte** — H1 : c'est un mur systématique, l'absence de moyen de
  paiement rend le prélèvement impossible par construction. H2 : certains composants comptabilisent
  et réclament ensuite, ou suspendent le compte. Ces deux hypothèses n'ont pas la même conséquence
  pour le projet ; ne pas les fondre.
- **Durable Objects sur palier gratuit** — l'accès a changé au fil du temps selon le backend de
  stockage. Dire ce qui est accessible aujourd'hui sans offre payante, et depuis quand.

## Format de rendu

TL;DR · Key Findings · Details · Recommendations · Caveats.

- Niveau de confiance **par affirmation**, comme signal de classement.
- Marqueurs `[À VÉRIFIER]` et `[INCERTAIN]` sur tout ce qui n'est pas établi.
- **Un tableau de synthèse à sept lignes**, une par composant :
  `composant | activable sans carte ? | limites du palier (avec date) | comportement au dépassement : mur ou compteur facturé ? | verdict au regard du critère | qualité de la source`
- **Un tableau « chiffre circulant → source primaire trouvée ? → verdict »** pour les valeurs de
  palier : beaucoup de ces chiffres circulent dans des billets recopiés et périmés, et savoir
  lesquels ne remontent à aucune page officielle courante fait partie du résultat.
- **Une section séparée « à vérifier à la main sur le compte »**, comme décrit plus haut : un item
  par fait, avec le geste exact et ce qu'il faudrait observer.

## Ce qui ferait changer la recommandation

Nommer explicitement les seuils qui feraient basculer la réponse — c'est ce qui permettra de réviser
la décision sans refaire la recherche :

- si un composant qu'on croyait « mur » se révèle facturer au dépassement, il sort du périmètre
  utilisable, quelles que soient ses qualités par ailleurs ;
- si Pages et Workers avec assets se révèlent équivalents sur toutes les limites qui mordent, le
  choix cesse d'être un arbitrage et devient une préférence ;
- si l'un des deux est annoncé en dépréciation, ou en gel de fonctionnalités, cela prime sur toute
  comparaison de limites ;
- si une limite de **nombre de fichiers par déploiement** ou de **taille totale d'un déploiement**
  existe, elle décide à elle seule si les médias d'un site vitrine peuvent vivre au même endroit que
  le contenu, ou doivent vivre dans un stockage objet distinct ;
- si le WAF gratuit ou Turnstile exigeaient une carte, la protection des surfaces exposées devrait
  être repensée entièrement ;
- si une bascule automatique vers une offre payante existe et n'est pas désactivable, l'ensemble du
  raisonnement tombe et c'est le fait le plus important du rapport.
