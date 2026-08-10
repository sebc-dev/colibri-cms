# Phase stack — les faits datés à sourcer avant d'arbitrer

Portée : socle
Ouvert le 2026-08-10 · Actualisé le 2026-08-10 · branche `work/reprise-socle-v2` · HEAD `6af8fdb`
Bloqué par : les gestes à jouer connecté au tableau de bord, par l'humain — un pour/contre au jugé finit en ADR immuable

## Objectif

Refermer les 14 domaines de la phase stack, aucun n'étant arbitré tant que le fait dont il
dépend n'est pas sourcé et daté.

## Contexte à charger

à lire      `docs/brief.md` § Questions ouvertes — les 6 renvois explicites à la phase Stack (48 l.)
à extraire  `docs/research/2026-08-10-palier-gratuit-cloudflare-sans-carte.md` › § « À vérifier à la main sur le compte » — 178 l., seuls les 8 gestes servent la reprise
à extraire  `docs/research/2026-08-10-acheminement-demandes-envoi-email.md` › § F « Points qui ne se constatent qu'à la main » — 137 l. ; son § C (tableau des candidats) ne sert que si le geste ① tombe
à situer    `docs/prd.md` — la réponse sur l'e-mail est déjà dans Acquis, ne pas relire
à situer    `docs/research/2026-08-10-api-github-commit-atomique.md` — conclusion déjà dans Acquis
à situer    `docs/socle-de-livraison.md` — I1–I6 valides ; son annexe datée est la destination écrite des chiffres de plateforme

## Acquis

- Méthode tranchée : **rejouer à blanc**. La stack et les 12 ADR de `work/reprise-zero-2`
  (2026-08-07) ne sont ni relus ni cités — leurs « faits datés » ne portent aucune source.
- Écriture groupée de N fichiers : existe, verrou optimiste obligatoire. Rapport archivé.
- **« Magasin de l'état publié » et « où vivent les médias » ne font qu'un arbitrage** : `FR-091`
  ne tient par construction que si contenu et médias partent du même geste.
- Rapport A revenu et classé. Officiel : aucune bascule automatique vers le payant (le seul
  mécanisme automatique dégrade vers Free) ; dépassement = **mur** sur Workers, Pages, D1, KV, DO ;
  servir les assets ne consomme aucun quota ; Pages ≈ Workers+assets sur les limites qui mordent.
- **R2 est le seul échec à `I5`** — mais son pivot (« la carte ne peut pas être contournée ») est
  un fil Community non recoupé. J'ai décidé de ne pas arbitrer les médias avant le geste manuel.
- Rapport B revenu et classé. **Le Brief ne se rouvre pas** : le binding `send_email` vers une
  adresse de destination vérifiée, Email Routing seul, tient les trois conditions sur le papier.
  Trois réserves qui interdisent d'arbitrer tout de suite — gratuité sans carte établie par
  *absence* de mention, service en **bêta publique**, délivrabilité FR non sourcée.
- Le PRD ne porte **aucun** FR de détection de panne, seulement l'atténuation (`FR-066`, `FR-010`).
  La détection est à créer, pas à retrouver.
- SMTP sortant depuis un Worker : possible sur **465/587**, seul le 25 est bloqué.
- Aucun mécanisme de détection ne couvre tout ; seul l'accusé périodique teste le canal réel, et
  sa valeur repose sur une éditrice qui remarque une **absence** — fréquence non tranchée.

## Prochaine étape

Jouer **une seule session connectée** au tableau de bord Cloudflare, qui referme deux arbitrages
racines d'un coup : geste ① du rapport A (R2 sans carte → les médias) et gestes ①② du rapport B
(aucune carte pour vérifier une adresse de destination, ni pour activer le binding → l'envoi).
Restent ensuite les 4 lookups — ③ jeton d'écriture · ④ dépôts privés · ⑥ Astro · ⑪ lien magique.

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
