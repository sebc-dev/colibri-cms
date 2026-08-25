# Candidat ADR : L'invariant `I10` ne porte que la configuration Astro — la configuration du déploiement en sort
Statut : Candidat | Date : 2026-08-23 | Provenance : `docs/1.x/adr/0032-invariant-i10-restreint-a-la-configuration-astro.md` (ADR-0032 accepté sous le cycle 1.x)

> Corps repris **verbatim** de l'ADR archivé. Les renvois `FR-xxx`, `SC-xxx` et `I-n`
> pointent vers `docs/1.x/` : ce sont des noms de **notation**, pas des noms de fichier.
> La numérotation 1.x ne survit pas — `/scd-sdd:adr` attribuera un `NNNN` neuf.


## Contexte

[ADR-0030](../../1.x/adr/0030-configurations-lisent-le-fichier-d-instance.md) (accepté le 2026-08-13) exige
que **la configuration Astro et celle du Worker** lisent `instance.json` « au moment où elles
s'évaluent, **sans outil intermédiaire** ». Il écrit lui-même que cette obligation « impose JSON »
et qu'une autre forme « demanderait un ADR de remplacement ».

**Sa moitié Worker est inexécutable, et c'est mesuré.** Le 2026-08-15, sur `wrangler@4.120.0`, un
fichier de configuration **évalué** — `wrangler.ts` — n'est pas reconnu comme une configuration :

```
✘ [ERROR] No configuration file found. Create a wrangler.jsonc file to define your D1 database.
```

L'outil n'accepte que du JSON/JSONC ou du TOML **statique**, et un fichier statique ne lit rien.
Il n'existe donc aucune forme qui satisfasse à la fois « configuration du Worker » et « lit
`instance.json` au moment où elle s'évalue, sans outil intermédiaire ».

**Ce que la partition des quatre lieux a changé depuis.**
[ADR-0020](../../1.x/adr/0020-configuration-d-instance-quatre-lieux.md) affecte les **liaisons de plateforme**
— rattachement D1, `send_email`, Durable Object, Cron — à la **configuration du déploiement**, qui
*est* leur lieu propre. Ce qui distingue une instance d'une autre dans ce fichier n'appartient donc
pas au fichier d'instance : la moitié Worker d'`I10` réclamait une lecture pour une valeur qui n'a
aucune raison d'y être. Le scaffold le vérifie par l'exemple — son `wrangler.jsonc` ne porte **aucune
valeur d'instance**, et n'en manque aucune.

**Caractéristique architecturale servie** : `C4` — uniformité de la flotte.
**Exigences servies** : `FR-104`, `FR-105`, `SC-008`.

**Trace observable** : la **lecture d'`instance.json`**, dans `astro.config.*`.

## Décision

**`I10` ne portera que la configuration Astro** : `astro.config.*` lira dans `instance.json` les
valeurs qu'`I8` y loge, et n'en écrira aucune en dur.

**La configuration du déploiement sort du périmètre de cet invariant.** Elle ne porte que des
liaisons de plateforme, dont le lieu propre est elle-même
([ADR-0020](../../1.x/adr/0020-configuration-d-instance-quatre-lieux.md)) — `database_id` compris, à la
livraison réelle.

## Conséquences

**Positives.**

- L'invariant redevient **exécutable** : `arch-invariants` peut le rendre au vert, au lieu de porter
  une violation permanente que personne ne peut refermer.
- `C6` du [socle de livraison](../../socle-de-livraison.md) tient sans changement : c'est
  `astro.config.*` — et elle seule — qui a besoin du domaine pour les URL canoniques et de la clé
  publique Turnstile pour le widget. Un clone nu bâtit le site.
- `I8` est inchangé et continue de tenir l'interdit : aucune valeur logée dans `instance.json` ne
  vit ailleurs, configuration du déploiement comprise.

**Négatives — ce à quoi le code s'engage.**

- **Plus rien ne dit d'où vient une valeur de la configuration du déploiement.** Le jour où une
  valeur relevant vraiment du fichier d'instance devrait y entrer, aucun invariant ne l'attraperait :
  il faudrait rouvrir cette décision. Le pari est que ce jour n'arrive pas, parce que
  [ADR-0020](../../1.x/adr/0020-configuration-d-instance-quatre-lieux.md) a donné à chaque nature de valeur
  un lieu, et que celui-ci n'en accueille qu'une.
- **La trace ne nomme plus qu'une famille de fichiers.** La limite qu'`ADR-0030` écrivait déjà se
  resserre : une configuration ajoutée plus tard n'est pas couverte.
- **Un ADR accepté est remplacé.** `ADR-0030` reste immuable et lisible ; c'est celui-ci qui dit ce
  qui s'applique, et `docs/archi.md` devra être repris en conséquence — travail de
  `/scd-sdd:archi`, jamais d'une phase `plan`.

## Alternatives considérées

- **Une étape de génération — `instance.json` → `wrangler.jsonc`** : écartée. Elle rétablirait
  l'« outil intermédiaire » qu'`ADR-0030` refusait explicitement, ajouterait un fichier engendré
  qu'un `git add` peut désynchroniser de sa source, et imposerait une commande avant tout build et
  tout déploiement. Le coût est certain ; le besoin qu'elle couvre est hypothétique.
- **L'injection par variables de build de Workers Builds** : écartée **par défaut d'instruction**,
  exactement comme dans `ADR-0030` — aucun fait de plateforme n'a été constaté. La retenir
  supposerait une recherche préalable, et laisserait `I10` en violation sans échéance entre-temps.
- **Laisser `ADR-0030` tel quel et vivre avec un contrôle rouge** : écartée. Un contrôle qui ne peut
  pas passer au vert est un contrôle qu'on apprend à ignorer — et `docs/ci.md` écrit qu'« un contrôle
  bruyant finit désactivé ».

## Vérifiable ?

Oui — `arch-invariants`, invariant `I10` : la configuration Astro lit `instance.json` et ne redit pas ses valeurs.

## Contexte agent (optionnel)

- Décision influencée/générée par l'agent : oui — instruite en phase `plan` de
  `specs/001-scaffold-projet/`, sur une mesure rejouée le 2026-08-15 (`wrangler@4.120.0` refuse un
  `wrangler.ts`). **Arbitrage humain rendu le 2026-08-15** entre trois issues : restreindre,
  engendrer, ou renvoyer à une recherche. **Promotion en ADR accepté validée le 2026-08-15.**
