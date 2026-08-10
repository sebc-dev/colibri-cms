# Phase stack — les faits datés à sourcer avant d'arbitrer

Portée : socle
Ouvert le 2026-08-10 · Actualisé le 2026-08-10 · branche `work/reprise-socle-v2` · HEAD `521c1c5`

## Objectif

Refermer les 14 domaines de la phase stack, aucun n'étant arbitré tant que le fait dont il
dépend n'est pas sourcé et daté.

## Contexte à charger

à extraire  `docs/brief.md` › § « Questions ouvertes » — les 6 renvois à la phase Stack (48 l. sur 376)
à extraire  `docs/research/2026-08-10-gating-paiement-r2-email-cloudflare.md` › § « Tableau de gating » — les verbatims, URL et dates citables dans un ADR
à extraire  `docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md` › § « Détail par composant (verbatim porteur) » — les chiffres destinés à l'annexe datée
à situer    `docs/research/2026-08-10-acheminement-demandes-envoi-email.md` — conclusions absorbées ; son § C ne sert que si la voie Cloudflare tombe
à situer    `docs/prd.md` — `FR-063`, `FR-066`, `FR-091` déjà dans Acquis, ne pas relire
à situer    `docs/research/2026-08-10-api-github-commit-atomique.md` — conclusion déjà dans Acquis
à situer    `docs/socle-de-livraison.md` — I1–I6 valides ; son annexe datée est la destination des chiffres

## Acquis

- Méthode : **rejouer à blanc**. La stack et les 12 ADR de `work/reprise-zero-2` (2026-08-07)
  ne sont ni relus ni cités — leurs « faits datés » ne portent aucune source.
- Écriture groupée de N fichiers : existe, verrou optimiste obligatoire.
- **« Magasin de l'état publié » et « où vivent les médias » ne font qu'un arbitrage** : `FR-091`
  ne tient par construction que si contenu et médias partent du même geste.
- Officiel : aucune bascule automatique vers le payant ; dépassement = **mur** sur Workers, Pages,
  D1, KV, DO ; servir les assets ne consomme aucun quota ; Pages ≈ Workers+assets.
- **R2 est disqualifié par `I5`, sur source primaire** — non par le fil Community, qui reste
  anecdotique, mais par la Billing policy : activer R2 est une souscription auto-renouvelée
  facturée à un moyen de paiement enregistré, et `I5` porte sur l'**enregistrement**.
- **L'envoi tient sur Workers Free, sans carte** (verbatim officiel) : vers une adresse de
  destination **vérifiée**, Email Routing seul configuré. Or `FR-063` n'achemine que vers
  l'**adresse autorisée du déploiement**. Prérequis dur : le domaine sur **DNS Cloudflare**.
- **Aucun FR n'envoie d'e-mail au visiteur** — un accusé au visiteur exigerait un destinataire
  arbitraire, donc Workers Paid, donc la chute de `I5`. C'est une frontière de périmètre.
- Réserves e-mail restantes : **bêta publique** (16/04/2026, quota quotidien conservateur au
  départ) et **délivrabilité FR**, qui ne se prouve qu'à la recette.
- **Détection de panne** : le PRD n'en porte aucun FR, seulement l'atténuation (`FR-066`,
  `FR-010`) — elle est à créer. Aucun mécanisme ne couvre tout ; seul l'accusé périodique teste
  le canal réel, et sa valeur repose sur une éditrice qui remarque une **absence** — fréquence
  non tranchée. Repli SMTP : **465/587** ouverts, 25 bloqué ; SMTP authentifié en bêta (08/06/2026).
- Les gestes manuels des rapports A et B ne bloquent plus aucun arbitrage : ce sont désormais des
  vérifications de **recette**.

## Prochaine étape

Trancher l'arbitrage racine restant — **le magasin de contenu et les médias**, désormais sans R2 :
les médias repartent avec le contenu, donc un espace versionné qui grossit sans maigrir, les
images de retour dans le décompte de fichiers par déploiement, et le geste « supprimer » de
l'écran Médias à tenir pour `SC-011`. Restent ensuite les 4 lookups — ③ jeton d'écriture ·
④ dépôts privés · ⑥ Astro · ⑪ lien magique — avant de jouer `/scd-sdd:stack`.

## Écarté

- **Reprendre la stack du 2026-08-07** — arbitrage humain, faits non sourcés.
- **Le palier gratuit en cinq lookups séparés** — `I5` les relie et c'est lui qui décide.
- **Trancher le magasin avant les médias** — question posée, interrompue à raison.
- **Sourcer moi-même ce qui descend dans un ADR** — la vérification doit laisser une trace citable.
- **Instruire un repli hors Cloudflare** — l'hébergement est une donnée d'entrée (`brief.md:244`).
- **Figer les chiffres de paliers dans le Brief ou un ADR** — le Brief les route vers l'annexe datée.
- **La recommandation 4 du rapport A telle quelle** (état publié dans D1) — le chercheur n'avait
  que `I5` en grille, pas `I2` « contenu en clair, hors base ».
- **Le SMTP de la boîte de la cliente** — praticable, mais suspendu à un fournisseur grand public
  qui accepterait l'envoi depuis une IP Cloudflare partagée.
- **SendGrid · SES · MailerSend · ZeptoMail** — échouent sur « permanent » ou sur « sans carte ».
- **La clause d'ancrage du rapport B** (« chaque chiffre décisif est ancré à une page primaire ») —
  ses propres liens la démentent sur cinq lignes de son tableau.
- **R2 pour les médias** — `I5`, tranché sur la Billing policy officielle et non sur le témoignage.
- **La recommandation 3 du rapport C** (un autre fournisseur de stockage objet) — même motif que
  le repli hors Cloudflare : l'hébergement est une donnée d'entrée.
- **Le geste ① comme préalable à l'arbitrage** — la Billing policy tranche sans lui ; il reste une
  vérification de recette.
