# ADR-0014 : Tests — l'oracle reste `workerd` ; l'intégration se nomme `@cloudflare/vitest-plugin`, sans famille de versions
Statut : Accepté | Date : 2026-09-11

Remplace [ADR-0003](./0003-tests-vitest-dans-workerd.md) — **même décision d'oracle**, identification
de l'outil rendue durable. ADR-0003 reste sur disque, immuable ; la table de
[`README.md`](./README.md) porte la redirection.

## Contexte

ADR-0003 identifiait l'intégration de test par son nom de paquet **et** par une famille de versions,
`@cloudflare/vitest-pool-workers` (famille `0.21.x`). Il expliquait ce choix, et l'explication était
juste : « un numéro de correctif n'a pas sa place dans un document immuable », la cadence de
publication de Cloudflare étant telle que `0.21.0` avait été dépassée deux fois en moins de 48 h.

Ce qu'ADR-0003 n'avait pas prévu, c'est que la **famille** périrait avant le correctif. Cloudflare a
renommé le paquet — `@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin` — et redémarré sa
numérotation à `1.0.0` le 2026-08-20, deux jours après avoir publié la dernière version de l'ancien
nom (`0.22.0`, le 2026-08-18 ; il n'est pas marqué déprécié sur npm, il a simplement cessé d'être
publié). Les deux moitiés de l'identification d'ADR-0003 sont donc fausses aujourd'hui, et la seconde
l'est **par construction** : nommer une famille, c'est nommer un fait d'approvisionnement dans un
document qui ne se corrige pas.

**Le changement de majeure n'est pas une rupture d'API, et c'est mesuré** (2026-09-11, les deux
paquets dépaquetés côte à côte) : la surface publique est identique **à une addition près**
(`explicitInjectTypeArgumentRequired`), sans aucune suppression, et les déclarations de
`cloudflare:test` sont identiques **à un commentaire près**. Ce dépôt utilisait déjà l'API plugin
(`cloudflareTest`) et non l'ancien `defineWorkersConfig` ; la montée s'est réduite au renommage du
specifier d'import et des directives `/// <reference types>`.

**Ce qui ne change pas, c'est l'oracle** — le seul motif d'ADR-0003. Le produit ne s'exécute pas dans
Node : il s'exécute dans `workerd`, contre D1 et le stockage d'un Durable Object. Un test qui ne
rencontre jamais ces implémentations n'atteste de rien de ce qui sera déployé. C'est aussi le fait
d'architecture dont [ADR-0013](./0013-profondeur-des-tests-mesuree-par-la-mutation.md) déduit que la
couverture vise le bundle et que la profondeur se mesure par la mutation : cette conséquence est
reprise ici sans changement.

Deux constats accessoires d'ADR-0003 ont également vieilli, et cet ADR les met à jour plutôt que de
les laisser démentir le document : la chaîne d'oracle portait `miniflare` en `5.20260804.0-alpha`, et
sa section « Vérifiable ? » notait que le dépôt ne portait **aucun** fichier de test.

## Décision

Nous maintenons **Vitest exécuté dans `workerd`** — désormais via **`@cloudflare/vitest-plugin`** —,
**Playwright** pour les parcours, et une **épreuve de réversibilité scriptée**.

Et nous tranchons la leçon que cet ADR paie : **cet ADR ne nomme aucune famille de versions.** Il
nomme le **paquet** et le **pair qu'il impose** (`vitest ^4.1.0`) ; la version exacte est un fait du
`package-lock.json`, pas de ce document. Une famille est aussi périssable qu'un correctif — c'est
précisément la clause d'ADR-0003 qui vient de mourir —, et un ADR qui la nomme se condamne à être
remplacé par le prochain renommage plutôt que par la prochaine décision.

## Conséquences

**Positives.**

- **L'oracle reste celui du produit.** Les tests s'exécutent dans `workerd` lui-même, contre les
  implémentations de D1 et du stockage des Durable Objects.
- **L'ADR ne se périme plus sur un fait d'approvisionnement.** Seule une décision peut désormais le
  remplacer, ce qui est la propriété qu'on attend d'un document immuable.
- **L'épreuve de réversibilité scriptée** produit la pièce datée que `SC-011` réclame, au lieu d'un
  constat manuel.

**Négatives — ce à quoi le code s'engage.**

- **Ce qui est réel ici est le moteur, non la connexion.** Les liaisons sont **locales**, servies par
  Miniflare : rien ne part vers la base D1 d'un compte Cloudflare. L'option `remoteBindings` existe,
  mais « réel » et « distant » sont **deux réglages distincts**, à ne pas confondre en recette.
- **Une version majeure de l'outil de test est décidée par ce choix** : le pair `vitest ^4.1.0` est
  imposé, et le produit ne peut pas en changer indépendamment.
- **L'oracle repose sur une chaîne alpha.** `miniflare` y est en version **alpha** et la chaîne de
  moteur est épinglée au correctif près. C'est la façon dont Cloudflare publie — mais c'est bien la
  brique qui sert d'oracle au projet qui repose dessus.
- **Le paquet peut être renommé sous nos pieds, et il l'a été.** La cadence n'est pas seulement rapide,
  elle est discontinue : une majeure peut ne porter qu'un renommage, et l'identité du paquet n'est pas
  plus stable que ses numéros. Toute lecture de cet ADR doit passer par le lockfile pour savoir ce qui
  est réellement installé.
- **Le gel d'approvisionnement plafonne ce qui est atteignable.** `.npmrc` refuse toute version publiée
  depuis moins de sept jours : le lockfile traîne structurellement derrière la dernière version
  publiée, et viser cette dernière est une erreur de méthode.
- **Playwright ajoute une seconde chaîne d'outillage** à installer et à tenir à jour, avec ses
  navigateurs. **Constat au 2026-09-11 : elle n'est pas installée** — ni dépendance, ni configuration,
  ni suite de parcours sur disque. Cette moitié de la décision reste donc à honorer ; cet ADR la
  reprend, il ne la solde pas.

## Alternatives considérées

- **Amender ADR-0003 en place** : écartée car un ADR est **immuable** — la correction se paie en ADR de
  remplacement, pas en édition. Une édition rétroactive ferait mentir la date et l'historique du
  document, et rien ne signalerait au lecteur qu'une décision a bougé.
- **Ne rien écrire et laisser ADR-0003 nommer un paquet disparu** : écartée car c'est le seul endroit
  du dépôt, hors archives, qui nommerait encore `@cloudflare/vitest-pool-workers` — un lecteur y
  chercherait un paquet introuvable sans rien pour le rediriger, et la famille `0.21.x` ne
  s'installerait plus sous le gel d'approvisionnement.
- **Nommer la nouvelle famille (`1.1.x`)** : écartée car c'est exactement la clause qui vient de
  mourir. Elle rendrait cet ADR remplaçable par le prochain renommage, et la leçon serait payée deux
  fois.
- **Rester sur `@cloudflare/vitest-pool-workers`** : écartée car le paquet a cessé d'être publié à
  `0.22.0`. L'oracle du projet cesserait de suivre le moteur qu'il prétend imiter — c'est la chaîne
  `miniflare`/`workerd` que la montée fait avancer, pas un confort d'outillage.
- **Vitest sous Node avec liaisons simulées** : écartée — reprise d'ADR-0003 sans changement — car
  l'**oracle devient faux** : les tests attesteraient du comportement des simulacres, et non de celui
  de D1, du stockage d'un Durable Object ou de `workerd`.

## Vérifiable ?

**Oui pour la moitié Vitest**, et la réserve d'ADR-0003 est levée : le dépôt porte **22 fichiers de
test et 174 tests**, tous verts le 2026-09-11 (`npm test`, dans `workerd`). Le vert atteste désormais
un comportement, plus seulement l'existence d'un script.

**Non pour les deux autres moitiés.** Les parcours Playwright n'ont aucune trace mécanique — l'outil
n'est pas installé. L'épreuve de réversibilité scriptée se tient hors de la boucle de test. Et la
clause « aucune famille de versions dans cet ADR » n'est pas vérifiable par une commande : elle se
tient en review, comme toute discipline de rédaction.
