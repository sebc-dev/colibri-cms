# Phase stack — les faits datés à sourcer avant d'arbitrer

Portée : socle
Ouvert le 2026-08-10 · Actualisé le 2026-08-10 · branche `work/reprise-socle-v2` · HEAD `77b3082`

## Objectif

Refermer les 14 domaines de la phase stack, aucun n'étant arbitré tant que le fait dont il
dépend n'est pas sourcé et daté.

## Contexte à charger

à extraire  `docs/prd.md` › `FR-083`–`FR-091`, `FR-107`, `FR-108`, `SC-010`, `SC-011` — le contrat
            que les arbitrages tranchés doivent tenir sans retouche (797 l.)
à extraire  `docs/socle-de-livraison.md` › § 5 « Les contraintes de développement du CMS » (C1–C10)
            et § « Annexe A » — C6 est à amender, le seuil d'alerte de C5 est à 15 000 (364 l.)
à extraire  `docs/brief.md` › § « Questions ouvertes » — **5** renvois Stack, pas 4 (376 l.)
à extraire  `docs/research/2026-08-10-gating-paiement-r2-email-cloudflare.md` › § « Tableau de
            gating » — verbatims, URL et dates citables dans un ADR (77 l.)
à extraire  `docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md` › § « Détail par
            composant » — les chiffres destinés à l'annexe datée (178 l.)
à situer    `docs/research/2026-08-10-acheminement-demandes-envoi-email.md` — son § C ne sert que
            si la voie Cloudflare tombe
à situer    `docs/research/2026-08-10-api-github-commit-atomique.md` — conclusion déjà dans Acquis

## Acquis

- Méthode : **rejouer à blanc**. La stack et les 12 ADR de `work/reprise-zero-2` (2026-08-07) ne
  sont ni relus ni cités — leurs « faits datés » ne portent aucune source.
- **R2 disqualifié par `I5`**, sur la Billing policy (souscription auto-renouvelée sur moyen de
  paiement enregistré) et non sur le fil Community. Seul composant à compteur facturé ; les six
  autres opposent un **mur**. Servir les assets ne consomme aucun quota.
- **Magasin tranché — D1 porte brouillons et état publié, le dépôt reçoit la copie publiée.**
  Confirme C1 et `I2` sans retouche ; ordre imposé, commit d'abord et marquage « publié » ensuite.
  J'ai écarté « le dépôt EST le magasin » sur `FR-032` : reconstruire l'index inverse sans base
  dépasse le plafond de **50 sous-requêtes par requête** (Workers Limits).
- **Médias tranchés — même dépôt, branche `media` orpheline réécrite à chaque publication.**
  L'espace maigrit, `FR-037` et `FR-084` restent vrais, le PRD n'est pas touché : `FR-087` et
  `FR-088` sont distincts, `FR-107` dit « les espace**s** », `SC-011` n'exige pas l'identité
  binaire — d'où la branche sans historique. `FR-108` exige le manifeste **inconditionnellement**.
- Ces deux choix déposent en Stack : **C6 à amender** (« un clone, deux branches ») · publication
  en trois temps (médias additifs → commit contenu → effacement des orphelins, après le build) ·
  **sérialisation des publications devenue obligatoire** (`prd.md:642`) · les 20 000 fichiers
  acquis comme donnée, le garde-fou C5 pour seul remède.
- **L'envoi tient sur Workers Free, sans carte** : send_email vers l'adresse de destination
  **vérifiée**, ce que `FR-063` demande exactement. Prérequis dur : domaine sur DNS Cloudflare.
  Destinataire arbitraire → Workers Paid → chute de `I5` ; or **aucun FR n'envoie d'e-mail au
  visiteur**, c'est une frontière de périmètre. Réserves : bêta publique (16/04/2026) et
  délivrabilité FR, qui ne se prouve qu'à la recette.
- **Détection de panne** : aucun FR ne la porte, seulement l'atténuation (`FR-066`, `FR-010`) —
  elle est à créer. Seul l'accusé périodique teste le canal réel, et sa valeur repose sur une
  éditrice qui remarque une **absence** — fréquence non tranchée. Repli SMTP : 465/587 ouverts,
  25 bloqué ; SMTP authentifié en bêta (08/06/2026).
- **③ tranché — l'oid attendu passe, mais par GraphQL `updateRefs` seul** : `RefUpdate.beforeOid`
  + `force: true`, atomique sur plusieurs refs. Ni `updateRef` (singulier) ni REST
  `PATCH /git/refs` n'ont de champ d'oid attendu ; hors API,
  `git push --force-with-lease=<ref>:<oid>` fait le même compare-and-swap. Permission établie
  pour REST seulement : **Contents: write**. À citer : le schéma public
  `docs.github.com/public/fpt/schema.docs.graphql`, et la table des permissions fine-grained sous
  `docs.github.com/en/rest/authentication/`.
- **④ tranché pour l'essentiel — la branche `media` est atteignable, mais rien ne garantit
  qu'elle soit déjà là.** Dépôt privé supporté (Pages, MAJ 21/04/2026), `git` présent dans
  l'image de build (MAJ 30/07/2026). Cloudflare **ne documente ni la profondeur du clone ni les
  refs récupérées** : le fetch de `media` doit être **explicite dans le build command et porter
  son propre jeton**, permission **`Contents`** en lecture — un secret de plus, à ouvrir sous
  `I4` et à inventorier sous `C7`. Repli non écarté : build hors Cloudflare + **Direct Upload**
  (`wrangler`), qui quitterait les comptes de la cliente et heurterait `I1`.
- **Trois sous-faits non établis, à trancher d'un appel réel en recette et non par recherche** :
  le scope qu'exige `updateRefs` (GitHub ne publie aucune table de permissions GraphQL),
  « Contents: write » pour le `git push` en HTTPS (rapporté, jamais primaire), et la sortie de
  preview d'`updateRefs` (inférée). Les gestes manuels des rapports A et B sont devenus des
  vérifications de **recette**.
- **⑥ tranché — Astro 7.2.0 (06/08/2026) ; adapter `@astrojs/cloudflare` v14 pour Astro 7, v13
  pour Astro 6** (peerDeps du registre npm). **Un site statique n'a pas d'adapter du tout.** Les
  images responsive ne multiplient les fichiers **que si `layout` est posé** : `image.layout` vaut
  `undefined` par défaut, `fixed` → 2 fichiers, `constrained` w=800 → 7, `full-width` → 8 (jeu
  `LIMITED_RESOLUTIONS`, retenu dès que le service d'images est local) ; `<Picture>` multiplie par
  le nombre de `formats`. Source primaire : `packages/astro/src/assets/layout.ts` et `internal.ts`
  du monorepo. **C'est un levier de configuration sur le plafond de 20 000, donc sur C5.**
- **Un domaine nouveau est sorti de ⑥ : Pages ou Workers.** L'adapter v14 « no longer supports
  deployment on Cloudflare Pages » et Astro renvoie vers Workers ; Cloudflare, lui, **ne déprécie
  Pages nulle part** (guide Astro/Pages en ligne, MAJ 21/04/2026 ; page de migration du 28/07/2026
  qui parle de parité de coût). Ne se tranche pas d'un lookup : l'Annexe A chiffre le palier
  **côté Pages**, et la hausse à 100 000 fichiers des Workers static assets ne vaut **que pour les
  plans payants**.
- **⑤ moyen anti-abus n'était consigné nulle part**, alors que le brief le renvoie en Stack et que
  ses faits sont déjà sourcés : Turnstile Free, 20 widgets, siteverify **illimité en mode managed**
  (plafond 1 M/mois seulement en mode invisible), doc du 16/04/2026.
- **⑪ tranché — le lien magique tient sur Workers Free, et son jeton vit en D1.** Cloudflare publie
  l'exemple (`crypto.randomUUID()` + binding `send_email`, MAJ 09/06/2026) mais **n'implémente ni
  stockage, ni validation, ni expiration** — les « 15 minutes » ne sont que le texte de l'e-mail.
  KV est disqualifié comme magasin du jeton : plancher `expirationTtl` de **60 s** (MAJ 22/06) et
  « not ideal … atomic operations » (MAJ 21/04), face au `getAndDelete` qu'exige Better Auth
  (1.6.26 au registre npm ; jeton **300 s**, usage unique, consommé atomiquement). Le « donc D1 »
  est ma déduction, pas une phrase de l'éditeur.
- **L'adresse de l'éditrice étant pré-vérifiée, l'envoi du lien reste du côté gratuit** — c'est le
  même fait que `FR-063`. Corollaire de périmètre : ce dispositif n'authentifie **que** des
  adresses déclarées, jamais un visiteur.
- **Un quatrième sous-fait rejoint la recette** : `DELETE … RETURNING` sur D1 n'est **pas
  documenté** (la page SQL n'énumère que FTS5, JSON, math et renvoie au code source). Et une voie
  « zéro code » reste ouverte sans être instruite — **Access one-time PIN** (PIN 10 min, MAJ
  19/06) — dont le palier gratuit n'a **aucune source primaire**, donc invérifiable face à `I5`.

## Prochaine étape

Composer la recherche « Pages ou Workers », puis lancer `/scd-sdd:stack`. Le domaine ⑪ est clos ;
plus aucun lookup en attente.

## Écarté

- **Reprendre la stack du 2026-08-07** — arbitrage humain, faits non sourcés.
- **Le dépôt comme magasin** (voie 1 du Brief), et sa variante **dépôt + index D1 dérivé** — les
  50 sous-requêtes tombent dans les deux cas, à la lecture comme à la reconstruction de l'index.
- **Médias en un dépôt à historique complet** — `FR-037` et `FR-084` deviendraient faux à l'écran.
- **Médias en deux dépôts distincts** — mêmes bénéfices que la branche orpheline, un espace de
  plus à ouvrir et à vérifier sous `I1`.
- **Médias dans D1 / KV / DO** — `FR-107` exige des **fichiers** ; un clone nu ne produirait rien.
- **R2 pour les médias** — `I5`, sur la Billing policy et non sur le témoignage.
- **Le palier gratuit en cinq lookups séparés** — `I5` les relie et c'est lui qui décide.
- **Sourcer moi-même ce qui descend dans un ADR** — la vérification doit laisser une trace citable.
- **Instruire un repli hors Cloudflare**, et **la recommandation 3 du rapport C** (autre stockage
  objet) — l'hébergement est une donnée d'entrée (`brief.md:244`).
- **Figer les chiffres de paliers dans le Brief ou un ADR** — le Brief les route vers l'annexe.
- **La recommandation 4 du rapport A** (état publié dans D1) — le chercheur n'avait que `I5` en
  grille, pas `I2` « contenu en clair, hors base ».
- **Le SMTP de la boîte de la cliente** — suspendu à un fournisseur grand public qui accepterait
  l'envoi depuis une IP Cloudflare partagée.
- **SendGrid · SES · MailerSend · ZeptoMail** — échouent sur « permanent » ou sur « sans carte ».
- **La clause d'ancrage du rapport B** — ses propres liens la démentent sur cinq lignes.
- **Le geste ① comme préalable à l'arbitrage** — la Billing policy tranche sans lui.
- **Supposer que le checkout Cloudflare atteint `media` sans jeton fourni** — ni documenté ni
  infirmé ; ça se tranche d'un appel réel en recette, pas par recherche.
- **Le « clone superficiel » de Cloudflare comme fait** — il ne circule qu'en anecdotique, et le
  fil Community qui en discute renvoie 403 au fetcher.
- **Trancher « Pages ou Workers » sur le seul dire d'Astro** — Astro fait autorité sur son
  adapter, pas sur le statut d'un produit Cloudflare.
- **Les agrégateurs de versions** (astrobuild, blogs) — en retard d'une release sur le registre npm.
- **KV comme magasin du jeton de lien magique** — plancher de 60 s et aucune opération atomique.
- **Trancher « Better Auth / implémentation maison / Access OTP » par recherche** — c'est un
  arbitrage à trois branches pour la Stack, pas un fait à sourcer.
- **Le palier gratuit d'Access lu sur des comparateurs commerciaux** — ils se citent entre eux :
  une seule source, pas un recoupement.
