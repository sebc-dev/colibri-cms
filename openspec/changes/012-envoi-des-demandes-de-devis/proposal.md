## Why

L'éditrice règle ses formulaires de devis et les publie, mais aucun visiteur ne les voit : aucune page
ne porte de formulaire, le site public n'exécute aucun script et refuse tout envoi. Le site vitrine ne
convertit donc encore personne. Cette story ouvre le seul traitement serveur que le site public
s'autorise (FR-097) : l'envoi d'une demande.

Sert **Epic B — Convertir le visiteur** (`docs/roadmap.md`), première story **Composer et envoyer une
demande de devis** ; couvre **FR-052 → FR-062** et **FR-007** — le seuil par origine que la connexion
(change 001) a déclaré hors-périmètre et délégué à cette story —, sous **FR-117**, **SEC-1**, **SEC-2**,
**SEC-7** et **DAT-3**. Elle tire en avant, par arbitrage humain du 2026-10-15, **FR-063** et **FR-064**
(l'acheminement par e-mail et son contenu), rangés par la feuille de route dans la story « Réception et
suivi des demandes » : sans eux, « votre demande a été envoyée » serait faux. Elle sert la part e-mail de
**SC-007**. Elle reprend enfin la part « formulaires » de **FR-081**, que l'aperçu (change 011) a
déléguée au jour où le formulaire serait dessiné dans le rendu partagé.

## What Changes

- **L'intégrateur pose un formulaire sur une page.** Une nouvelle sorte d'emplacement, « formulaire »,
  désigne dans `page.json` un formulaire par son identifiant et prend son rang parmi les autres. Un même
  formulaire peut être posé sur plusieurs pages. L'éditrice ne le modifie pas depuis la page : l'éditeur
  de la page le présente avec le nom du formulaire et la renvoie à l'écran Formulaires. La publication
  d'une page garde cet emplacement tel que posé.
- **Le formulaire paraît sur la page publique**, à son rang : ses champs dans l'ordre déclaré, les options
  de chaque champ à choix avec leur prix, la mention que l'estimation est indicative et non engageante, et
  la mention d'information sur le traitement des coordonnées réglée par l'éditrice. La page reste un
  document complet bâti à la publication.
- **Le total se calcule chez le visiteur.** À chaque changement de sélection, le total — la somme des
  prix des options choisies — se met à jour sur son appareil, sans échange avec le serveur. C'est le
  premier script du site public : un module servi par le site lui-même, présent sur les seules pages qui
  portent un formulaire ; aucun script d'une autre origine, aucun script écrit dans la page.
- **Le visiteur envoie sa demande.** Un champ obligatoire vide bloque l'envoi en désignant le champ. Le
  serveur revérifie tout depuis le formulaire publié — champs, options, total affiché — et refuse ce qui ne
  s'y accorde pas. Une demande acceptée part par e-mail à l'adresse autorisée — texte seul, chaque donnée
  du visiteur derrière son étiquette, objet fixe posé par le produit — et le visiteur lit qu'elle est
  envoyée. Un envoi qui n'aboutit pas le lui dit, sans rien effacer de sa saisie. Aucun fichier n'est
  accepté.
- **Un seuil par origine, pour les demandes et pour la connexion.** Au-delà de 5 demandes par heure depuis
  une même adresse IP, l'envoi est refusé, sans compte visiteur (FR-062). Au-delà de 20 tentatives de
  connexion par heure depuis une même adresse IP, l'écran de connexion refuse la tentative et l'annonce
  identiquement quelle que soit l'adresse saisie (FR-007). Le compteur ne garde jamais une adresse IP en
  clair : chaque origine y entre sous une empreinte calculée avec une clé tirée au hasard pour la seule
  heure en cours, et clé et empreintes sont effacées ensemble à l'heure suivante.
- **L'aperçu montre le formulaire avec son brouillon** — options, libellés et prix courants — au même
  rendu que la page publique ; depuis l'aperçu, le bouton d'envoi n'envoie rien.
- **Sans script, rien ne casse.** Le formulaire s'affiche, mais sans total ni envoi ; un message invite
  le visiteur à utiliser les coordonnées du bas de page.

Hors-périmètre :
- L'enregistrement des demandes, leur liste dans l'administration, la suite, les retraits et les
  compteurs (**FR-065 → FR-079**, story « Réception et suivi des demandes »). Jusqu'à elle, une demande
  dont l'e-mail échoue est perdue — le visiteur en est averti et garde sa saisie.
- La vérification anti-robot de Cloudflare (Turnstile) : écartée par arbitrage humain du 2026-10-15 —
  elle chargerait le premier script d'une autre origine sur l'origine qu'habite la session de
  l'éditrice (SEC-1). À rouvrir par une décision séparée si le spam paraît en production.
- La durée de conservation des coordonnées (**DAT-1**) et le signal d'un acheminement qui cesse en silence
  (**DAT-2**), toujours ouverts ; cette story ne conserve aucune coordonnée.
- La rapidité mesurée des pages publiques (**SC-005**, story « Site public rapide et complet ») — le
  module du formulaire reste toutefois léger, parce qu'elle se mesurera sur ces pages-là.

## Capabilities

### New Capabilities
- `demande-de-devis` : le formulaire de devis vu et rempli par le visiteur — dessin des champs et des
  options, total recalculé sur son appareil, mentions, champs obligatoires, envoi, confirmation, échec
  sans perte de saisie, aucun fichier — et l'acheminement de la demande par e-mail à l'adresse autorisée.
- `seuil-par-origine` : le comptage des sollicitations d'une même origine sur une fenêtre d'une heure, les
  seuils des demandes et de la connexion, et ce que le compteur s'interdit de garder.

### Modified Capabilities
- `connexion-par-code` : une même origine est refusée au-delà de 20 tentatives de connexion par heure, et
  le refus s'annonce identiquement quelle que soit l'adresse saisie (FR-007).
- `site-public` : une page publique porte le formulaire posé sur elle, avec la mention d'information ; le
  module du formulaire est le seul script admis, servi par le site lui-même ; la reconstruction échoue
  quand une page pose un formulaire inconnu ou un formulaire sans moyen de répondre au visiteur.
- `apercu` : l'aperçu d'une page présente ses formulaires avec leur brouillon, et n'envoie rien.
- `pages-et-emplacements` : la déclaration admet l'emplacement « formulaire » ; l'éditeur d'une page le
  présente sans moyen de le modifier et renvoie à l'écran du formulaire.
- `publication` : le `page.json` déposé garde l'emplacement « formulaire » tel que l'intégrateur l'a posé.

## Impact

- **Code** : une route publique d'envoi, seule route serveur du site public (sous `src/pages/api/public/`,
  sans garde de session, sans lecture de corps `multipart`) ; le dessin du formulaire dans le rendu
  partagé (`src/render/`) et son module de navigateur ; la vérification d'une demande, le calcul du total
  et la composition de l'e-mail dans `src/core/formulaires/` ; un compteur de fréquence
  (`src/core/frequence/`, `src/platform/frequence/`) ; l'expédition de la demande dans
  `src/platform/email/` ; l'écran de connexion, la lecture de la déclaration des pages, l'éditeur d'une
  page, la composition de la page et le plan de dépôt retouchés.
- **Données** : une migration D1 pour le compteur (clé de la fenêtre en cours et empreintes) ; aucune
  donnée de visiteur conservée.
- **Contenu** : `page.json` admet l'emplacement de nature `formulaire` ; le contenu de départ du dépôt
  produit pose les formulaires d'exemple sur des pages.
- **Configuration** : la politique de sécurité des pages publiques (`public/_headers`) admet les scripts
  et les échanges du site lui-même ; aucune nouvelle liaison, aucun nouveau secret.
- **Décisions** : un ADR nouveau (la pose d'un formulaire par un emplacement) et deux candidats à promouvoir
  en les amendant (anti-abus sans Turnstile, compteur en base ; Svelte réservé à l'administration, le
  formulaire public étant un document complet amélioré par un module du site) — voir design.md.
- **Recette** : le site factice pose les formulaires sur ses pages ; l'e-mail d'une demande se reçoit sur
  la boîte de recette.
