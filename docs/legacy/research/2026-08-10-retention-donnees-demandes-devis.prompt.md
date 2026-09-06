# Prompt de recherche — Rétention et effacement des données des demandes de devis

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Décision servie** | PRD `A-04.1` (purge automatique exigée ou non) + clausier du socle de livraison (responsable / sous-traitant) |
| **À jouer dans** | Claude Research (Claude Desktop) |
| **Rapport attendu** | `docs/research/AAAA-MM-JJ-retention-donnees-demandes-devis.md` |

---

## Contexte du système étudié

Un CMS pour sites vitrines statiques de TPE françaises (artisans, commerce de proximité). Une
instance = un client. Le site porte un formulaire de demande de devis qui collecte : nom,
adresse e-mail, téléphone, message libre, sélections d'options et total indicatif.

Chaque demande suit deux chemins simultanés :

1. elle est **enregistrée dans l'instance**, consultable dans l'admin du site, où la cliente
   note la suite donnée (sans suite / devis envoyé / commande) ;
2. elle est **acheminée par e-mail** vers la boîte de la cliente, où elle réside ensuite comme
   n'importe quel courrier reçu.

Propriétés du montage qui pèsent sur la question :

- **tous les comptes sont ouverts au nom de la cliente** — domaine, hébergement, stockage,
  service d'envoi d'e-mail. Le prestataire qui déploie n'héberge rien et ne dispose que
  d'accès révocables à tout moment ;
- l'hébergement est **Cloudflare, offre gratuite** (donnée d'entrée non négociable) ;
- **aucun cookie, aucun traceur, aucune analytique tierce** n'est posé par le site ;
- **aucune prospection commerciale** n'est faite à partir des demandes reçues ;
- la cliente est une TPE de moins de 250 salariés, sans DPO.

L'arbitrage en cours : le produit doit-il **appliquer lui-même une durée de conservation**
(purge automatique), ou l'effacement manuel par la cliente suffit-il à satisfaire le droit ?

---

## Question

**Le droit applicable impose-t-il d'effacer, au terme d'une durée déterminée, les données
personnelles collectées par un formulaire de demande de devis sur le site vitrine d'une TPE
française — et si oui, cette obligation impose-t-elle au logiciel de procéder à une purge
automatique, ou l'effacement manuel par la responsable de traitement suffit-il à y satisfaire ?**

Cette question sert deux décisions :

- **D1** — le PRD du produit doit-il porter une exigence de purge automatique assortie d'un
  délai, ou peut-il s'en tenir à un effacement déclenché par la cliente ?
- **D2** — le contrat de livraison doit-il porter un acte de sous-traitance au sens de
  l'article 28 du RGPD entre le prestataire qui déploie et la cliente, ou la répartition
  est-elle autre ?

Une réponse qui ne permet pas de trancher D1 par oui ou par non n'a pas répondu.

---

## Périmètre

**Inclus**

- Le **statut juridique de la durée** : existe-t-il un texte qui fixe un nombre d'années pour
  ce type de données, ou seulement le principe de limitation de la conservation ? Si le
  principe seul s'applique, comment une durée se justifie-t-elle en pratique ?
- La **valeur juridique des durées publiées par la CNIL** (référentiels, recommandations,
  délibérations) : opposables, ou indicatives et présumant la conformité ? Quel effet
  exactement en cas de contrôle ?
- **Qui porte l'obligation** : la responsable de traitement, l'éditeur du logiciel, ou les
  deux ? En particulier, ce que la protection des données dès la conception et par défaut
  exige d'un outil mis sur le marché pour cet usage — impose-t-elle une fonction de purge, ou
  seulement de ne pas empêcher l'effacement ?
- La **copie e-mail dans la boîte de la cliente** : entre-t-elle dans l'assiette de
  l'obligation de conservation limitée ? Une purge appliquée par le seul logiciel, laissant
  intacte la copie dans la messagerie, satisfait-elle l'obligation ou la manque-t-elle ?
- Le **contenu obligatoire de l'information** délivrée au visiteur au moment de la collecte :
  mentions exigées, moment et forme de leur présentation.
- Les **transferts hors Union européenne** liés à un hébergement Cloudflare : quelle base
  légale, quel est son statut courant, et qu'est-ce qui pèse sur la responsable de traitement.
- Le **registre des traitements** : applicable à une TPE de moins de 250 salariés dans ce cas
  précis, ou couvert par une dispense — et si dispense, avec quelles conditions et quelles
  exceptions.
- L'**analyse d'impact** : ce traitement figure-t-il parmi ceux qui l'exigent, parmi ceux qui
  en sont dispensés, ou dans aucune des deux listes ?
- La **qualification du prestataire** : un intégrateur qui n'héberge rien, dont l'infrastructure
  ne traite aucune donnée, et qui ne dispose que d'accès révocables aux comptes ouverts au nom
  de la cliente — est-il sous-traitant, et à partir de quel geste le devient-il ?

**Exclus** — écrit pour que la recherche ne s'étale pas :

- cookies, traceurs, consentement à leur dépôt : le site n'en pose aucun ;
- prospection commerciale, newsletter, réutilisation des coordonnées à des fins de démarchage ;
- données sensibles, données de santé, données de mineurs ;
- droit applicable hors France et hors Union européenne ;
- comparatif d'outils, de prestataires ou de solutions de mise en conformité ;
- procédures de notification de violation de données ;
- droit du travail, données de salariés, vidéosurveillance.

**Horizon** — la réponse doit être vraie au **10 août 2026**. Toute évolution déjà votée,
publiée ou officiellement annoncée à cette date doit être signalée séparément, avec sa date
d'entrée en vigueur attendue, sans être mélangée à l'état en vigueur.

---

## Contraintes de sourcing

- **Source primaire exigée pour toute affirmation normative** : remonter au texte lui-même —
  article et numéro, décision ou délibération avec sa référence et sa date. Une page qui
  paraphrase un article ne vaut pas l'article.
- **Étiqueter chaque source** : `officiel` (texte de loi, règlement, autorité de contrôle,
  comité européen) · `jurisprudence` · `doctrine` (cabinet d'avocats, éditeur juridique) ·
  `commercial` (éditeur vendant une solution de conformité, dont l'intérêt est que
  l'obligation paraisse plus lourde qu'elle n'est).
- **Séparer les niveaux de contrainte**, et ne jamais les confondre dans une même phrase :
  `contraignant` (le texte l'impose) · `recommandé` (une autorité le conseille, sans force
  obligatoire) · `interprétation` (lecture de doctrine) · `non étayé`.
- **Citer verbatim** le passage qui porte chaque affirmation normative, en français, avec sa
  référence exacte. Attribuer par affirmation, pas par paragraphe.
- **L'absence de donnée est un résultat.** Si aucun texte ne fixe de durée chiffrée pour ce
  traitement, l'écrire en toutes lettres plutôt que de reprendre une durée circulant ailleurs.
- **Un chiffre très répandu reste une source unique** s'il remonte toujours au même document.

**Table exigée — les durées qui circulent.** Ce domaine est saturé de durées reprises de page
en page sans que personne ne remonte à leur origine. Rendre le tableau suivant, une ligne par
durée rencontrée :

| Durée annoncée | Pour quelles données | Source primaire trouvée ? | Statut : contraignant / recommandé / folklore |

---

## Hypothèses concurrentes

Poser explicitement, ne pas trancher artificiellement, dire ce qui les départagerait.

**Sur la durée et la purge (sert D1)**

- **H1** — Aucun texte ne fixe de durée pour ce traitement. Seul s'applique le principe de
  limitation de la conservation, qui exige une durée *déterminée par la responsable de
  traitement et justifiable*, pas une durée fixée d'avance. Conséquence : un effacement
  manuel accompagné d'une politique écrite satisfait le droit, et le logiciel n'a pas à purger.
- **H2** — La combinaison du principe de limitation et de l'exigence de protection dès la
  conception fait de la purge une fonction que le logiciel doit fournir, faute de quoi la
  responsable est structurellement empêchée de tenir sa durée. Conséquence : le produit doit
  porter la purge.
- **H3** — Position intermédiaire : le logiciel doit rendre l'effacement *praticable et
  documenté* (rappel, filtre par date, effacement groupé) sans que la purge automatique soit
  exigée.

Ce qui les départagerait : un texte, une délibération de sanction, ou une position d'autorité
qui vise l'éditeur d'un outil plutôt que l'utilisateur de cet outil.

**Sur la qualification du prestataire (sert D2)**

- **H4** — L'intégrateur est sous-traitant dès lors qu'il dispose d'un accès technique aux
  données, même sans les héberger et même si l'accès est révocable.
- **H5** — L'intégrateur n'est pas sous-traitant tant qu'il ne traite les données ni pour son
  compte ni sur instruction ; l'accès d'administration à des comptes appartenant à la cliente
  ne suffit pas à le qualifier.

Ce qui les départagerait : la définition retenue du « traitement pour le compte du responsable »
et toute position d'autorité sur les prestataires de maintenance disposant d'accès.

---

## Format de rendu

`TL;DR` · `Key Findings` · `Details` · `Recommendations` · `Caveats`

- **Niveau de confiance par affirmation**, en signal de classement et non en probabilité.
- Marqueurs **`[À VÉRIFIER]`** et **`[INCERTAIN]`** sur tout ce qui n'est pas établi par une
  source primaire.
- La **table des durées circulantes** décrite plus haut.
- Une **réponse explicite à D1** en tête du `TL;DR`, formulée en oui / non / sous conditions —
  et si c'est « sous conditions », dire lesquelles en une phrase chacune.
- Une **section distincte** pour les évolutions annoncées mais non en vigueur au 10 août 2026.

---

## Ce qui ferait changer la recommandation

Nommer, pour chaque recommandation rendue, le fait dont elle dépend. Au minimum, dire ce qu'il
adviendrait si :

- le référentiel ou la recommandation d'autorité invoqué pour justifier une durée est abrogé,
  remplacé ou révisé ;
- la base légale des transferts hors Union européenne utilisée par l'hébergeur est invalidée
  ou suspendue ;
- le site se met à faire de la prospection à partir des demandes reçues (newsletter, relance
  commerciale) — le régime change-t-il, et comment ?
- le volume de demandes cesse d'être marginal, ou le traitement cesse d'être occasionnel — la
  dispense de registre tombe-t-elle ?
- une décision qualifie l'éditeur d'un outil de responsable conjoint plutôt que de tiers.

---

## Note au lecteur du rapport

Ce rapport **ne remplace pas la relecture juridique** que le socle de livraison prévoit déjà.
Il sert à décider si le PRD doit porter une exigence de purge, et à préparer la relecture en
sachant quelles questions lui poser. Aucune de ses affirmations ne descend telle quelle dans un
document du socle sans arbitrage humain.
