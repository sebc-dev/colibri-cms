# Gating des parcours Cloudflare (R2, Email Routing + send_email, Email Sending) — où le paiement devient obligatoire

## TL;DR
- **R2 est le seul des trois parcours où un moyen de paiement bloque dès le départ** : la doc officielle impose de « Complete the checkout flow to add an R2 subscription to your account » avant de créer le moindre bucket, et les témoignages utilisateurs datés confirment qu'un dialogue de carte bancaire (ou PayPal) obligatoire et non contournable apparaît — même si l'usage reste dans le free tier gratuit (10 Go, 1 M opérations classe A, 10 M classe B, egress gratuit).
- **Email Routing est entièrement gratuit et sans carte** : onboarding du domaine, vérification d'une adresse de destination et forwarding entrant illimité fonctionnent sur Workers Free ; un Worker peut même envoyer vers une adresse de destination vérifiée gratuitement sur tout plan.
- **Email Sending (send_email / REST API) exige le plan Workers Paid (minimum 5 $/mois)** pour envoyer vers des destinataires arbitraires ; le point de bascule est l'envoi lui-même, pas l'onboarding du domaine d'envoi. Le produit est en **public beta** depuis le 16 avril 2026.

## Key Findings

**Deux axes de plans distincts.** Cloudflare superpose deux grilles indépendantes : (1) les plans de zone Free / Pro (20 $/mois) / Business (200 $/mois) / Enterprise, et (2) les plans de la developer platform Workers Free / Workers Paid (minimum 5 $/mois par compte). Les trois parcours étudiés relèvent de l'axe Workers/developer platform et de la facturation à l'usage, pas des plans de zone.

**R2 — blocage à l'activation, avant la création du bucket.** La doc officielle R2 « Get started » (MAJ 21 avril 2026) est explicite sur l'étape bloquante : « Complete the checkout flow to add an R2 subscription to your account. R2 is free to get started with included free monthly usage. » Le libellé réel du bouton dans le dashboard (Storage & databases → R2 Object Storage → Overview) est « Add R2 subscription to my account » [Cloudflare Community](https://community.cloudflare.com/t/why-using-r2-free-tier-involves-giving-card-info/945179) (variante « …to your account »). La documentation officielle **ne dit pas explicitement qu'une carte est obligatoire pour le free tier** : elle parle seulement de « checkout flow » et, via la Billing policy, d'un modèle usage-based nécessitant un moyen de paiement. En revanche, de nombreux témoignages utilisateurs datés rapportent qu'un dialogue de carte/PayPal obligatoire s'affiche et bloque la création de bucket sans moyen de paiement. Il y a donc une tension entre le marketing (« no credit card required » sur la page produit, qui vise la création de compte) [Cloudflare](https://www.cloudflare.com/developer-platform/products/r2/) et le comportement réel du checkout R2.

**Email Routing — gratuit de bout en bout.** La doc pricing officielle est nette : « Email Routing is available on both the Workers Free and Workers Paid plans. » Le forwarding entrant est illimité sur les deux plans. La vérification d'une adresse de destination se fait via un e-mail de confirmation (Compute → Email Service → Email Routing → Destination Addresses). [Cloudflare](https://developers.cloudflare.com/email-service/get-started/route-emails/) Aucun plan payant ni carte n'est requis. Un Worker peut envoyer vers une adresse de destination **vérifiée** gratuitement sur n'importe quel plan : « Sending to verified destination addresses in your account is free on all plans, including when only Email Routing is configured. »

**send_email / Email Sending — bascule à l'envoi vers destinataires arbitraires.** La page pricing officielle tranche : « Sending to arbitrary recipients requires the Workers Paid plan. » [Cloudflare](https://developers.cloudflare.com/email-service/platform/pricing/) Sur Workers Free, l'envoi sortant (« Outbound emails ») est « Not available ». [cloudflare](https://developers.cloudflare.com/email-service/platform/pricing/) Sur Workers Paid : « The 3,000 included emails apply per account, per month, aligned with your Cloudflare subscription billing cycle », puis 0,35 $ par 1 000 e-mails, plan Workers Paid à 5 $/mois minimum. L'onboarding d'un domaine d'envoi (Onboard Domain, DNS SPF/DKIM/DMARC automatiques sur le sous-domaine cf-bounce) ne semble pas exiger en soi le plan payant — c'est l'appel d'envoi vers un destinataire arbitraire qui échoue sans Workers Paid. Prérequis absolu : « You must be using Cloudflare DNS to use Email Service. »

**Statut & historique.** Email Service a été annoncé en private beta le **25 septembre 2025** (Birthday Week 2025, blog signé Thomas Gauvin et Celso Martinho), puis Email Sending est passé en **public beta le 16 avril 2026** (Agents Week, blog signé Thomas Gauvin et Eric Falcão : « Today, as part of Agents Week, Cloudflare Email Service is entering public beta »). L'annonce private beta indiquait déjà le futur gating payant : « Email Sending will require a paid Workers subscription, and we'll be charging based on messages sent. We're still finalizing the packaging… » SMTP authentifié a été ajouté en beta le 8 juin 2026 (smtp.mx.cloudflare.net:465).

## Details

### Tableau de gating

| Parcours / étape | Paiement exigé | Plan requis | Source (consultée le 10 août 2026) | Date de la source |
|---|---|---|---|---|
| **R2** — Activer R2 (« Add R2 subscription to my account » / checkout flow) avant tout bucket | **OUI (bloquant)** — checkout flow ; carte/PayPal rapportée obligatoire par les utilisateurs, non énoncé explicitement par la doc | Aucun plan de zone payant ; souscription R2 (usage-based) | developers.cloudflare.com/r2/get-started/ ; developers.cloudflare.com/billing/understand/billing-policy/ ; community.cloudflare.com (témoignages) | Doc MAJ 21 avr. 2026 ; témoignage Community 3 août 2026 |
| **R2** — Rester dans le free tier (10 Go, 1M classe A, 10M classe B, egress gratuit) | NON (0 $) une fois activé | Free tier R2 | developers.cloudflare.com/r2/pricing | MAJ 7 août 2026 |
| **R2** — Infrequent Access | OUI (pas de free tier) | Usage-based | developers.cloudflare.com/r2/pricing | MAJ 7 août 2026 |
| **Email Routing** — Onboard domaine + DNS auto | NON | Workers Free | developers.cloudflare.com/email-service/get-started/route-emails/ | MAJ 2026 |
| **Email Routing** — Vérifier une adresse de destination | NON | Workers Free | developers.cloudflare.com/email-service/configuration/email-routing-addresses/ | 2026 |
| **Email Routing** — Forwarding entrant illimité | NON | Workers Free & Paid | developers.cloudflare.com/email-service/platform/pricing/ | MAJ 9 juin 2026 |
| **send_email** — Envoyer vers une adresse de destination **vérifiée** du compte | NON (gratuit, tout plan) | Workers Free ok | developers.cloudflare.com/email-service/platform/pricing/ | MAJ 9 juin 2026 |
| **send_email / REST API** — Envoyer vers un destinataire **arbitraire** | **OUI (bloquant)** | **Workers Paid** (min 5 $/mois) | developers.cloudflare.com/email-service/platform/pricing/ | MAJ 9 juin 2026 |
| **Email Sending** — Onboard domaine d'envoi (cf-bounce, SPF/DKIM/DMARC) | NON (prérequis : DNS Cloudflare) | pas de plan payant pour l'onboarding seul | developers.cloudflare.com/email-service/configuration/domains/ ; .../get-started/send-emails/ | MAJ juin 2026 |
| **Email Sending** — Quota au-delà de 3 000/mois | OUI (0,35 $/1000) | Workers Paid | developers.cloudflare.com/email-service/platform/pricing/ | MAJ 9 juin 2026 |

### Documenté officiellement vs. rapporté par les utilisateurs

**Officiel (haute confiance) :**
- R2 pricing (verbatim) : free tier « Storage 10 GB-month / month; Class A Operations 1 million requests / month; Class B Operations 10 million requests / month » ; au-delà : Standard 0,015 $/Go-mois, classe A 4,50 $/M, classe B 0,36 $/M, egress « Free ». Infrequent Access 0,01 $/Go-mois **sans free tier**, retrait 0,01 $/Go, durée min. 30 j.
- R2 « Get started » (verbatim) : « Complete the checkout flow to add an R2 subscription to your account. R2 is free to get started with included free monthly usage. » [cloudflare](https://developers.cloudflare.com/r2/get-started/index.md)
- Email pricing (verbatim) : « Sending to arbitrary recipients requires the Workers Paid plan. Sending to verified destination addresses in your account is free on all plans, including when only Email Routing is configured. » Workers Free = outbound « Not available ».
- Billing policy : le bouton « Enable » vaut souscription mensuelle auto-renouvelée facturée au moyen de paiement ; préautorisation de carte possible pour services usage-based ; suspension d'accès R2 (buckets inaccessibles, requêtes en erreur) si le paiement échoue, données conservées 30 j.

**Rapporté par les utilisateurs (à traiter comme témoignage daté) :**
- Le dialogue de carte obligatoire au checkout R2, non contournable même pour le free tier (Community, fil « Why using R2 free tier involves giving card info? », 3 août 2026 ; blogs r2drop.com, withlinda.dev, dev.to).
- Bug récurrent « Add R2 subscription » qui recharge la page en boucle sans activer R2 (plusieurs fils Community et Discord/Answer Overflow).
- Un débit immédiat de 5 USD signalé après activation R2 (cas isolé, non confirmé, vraisemblablement une préautorisation/hold).
- Les libellés « Purchase R2 Plan » / « Get Started » ne proviennent que d'un blog tiers non daté précisément et **ne sont pas confirmés** ; le libellé réel est « Add R2 subscription to my account ».
- Envoi sortant via send_email : plusieurs développeurs signalent un binding `undefined` / « No connected bindings » (Community, GitHub workers-sdk #13715) — voir divergences.

### Divergences à signaler
1. **Doc vs. terrain sur R2** : la doc n'exige pas explicitement une carte pour le free tier (« checkout flow »), mais le comportement réel décrit par les utilisateurs impose un moyen de paiement dès l'activation. La page produit R2 affiche « no credit card required » (valable pour la création de compte Cloudflare, pas pour l'activation de R2), ce qui crée une confusion réelle.
2. **send_email en local vs. remote** : des développeurs signalent que le binding ne fonctionne pas en `wrangler dev`/`next dev` local (binding `undefined`), seulement en `preview`/remote [GitHub](https://github.com/cloudflare/workers-sdk/issues/13715) (workers-sdk issue #13715). Ce n'est pas un problème de plan mais d'environnement de développement.

## Recommendations

1. **Avant de commencer, décider par parcours :**
   - **Email Routing seul** (recevoir/forwarder sur domaine perso, vérifier une destination) : démarrer immédiatement, **sans carte ni plan payant**. C'est le chemin le plus accessible sans souscription.
   - **Envoyer vers ses propres adresses vérifiées** (notifications internes, tests, boucle recevoir→répondre) : faisable sur Workers Free sans carte via send_email.
   - **R2, même pour tester le free tier** : prévoir d'ajouter un moyen de paiement (carte ou PayPal) dès l'activation ; l'usage reste à 0 $ tant qu'on est sous les limites, mais l'activation elle-même est bloquante sans moyen de paiement.
   - **Email Sending vers des destinataires externes arbitraires** : souscrire Workers Paid (5 $/mois) **avant** de commencer ; sinon l'envoi échoue (« Not available » sur Free).

2. **Seuils qui changeraient la décision :**
   - Si le besoin R2 dépasse 10 Go, 1 M classe A ou 10 M classe B/mois → coûts usage-based réels (stockage/opérations), egress toujours gratuit.
   - Si les envois dépassent 3 000/mois → 0,35 $/1000 en plus du plan Workers Paid.
   - Si Cloudflare fait sortir Email Sending de beta (GA) → vérifier un éventuel changement de packaging/prix (le pricing « was still being finalized » à l'annonce initiale).

3. **Contournements low-cost :** pour un pipeline recevoir+répondre limité à ses propres adresses vérifiées, rester sur Workers Free + Email Routing suffit et reste gratuit sans carte. Pour du stockage objet sans carte enregistrée, envisager un autre fournisseur, car R2 impose le moyen de paiement à l'activation.

## Caveats
- **Points non tranchables sans accès au dashboard Cloudflare (août 2026) :**
  1. Le contenu écran par écran du dialogue « Add R2 subscription » (montant affiché « $0.00 » ? mention explicite « payment method required » ?) — aucune capture officielle datée n'a pu être trouvée.
  2. Si le checkout R2 accepte l'activation **sans** nouvelle carte lorsque le compte a déjà un moyen de paiement enregistré pour un autre produit.
  3. Si l'écran « Onboard Domain » d'Email Sending affiche un message mentionnant explicitement « Workers Paid » ou bloque l'onboarding en Workers Free (la doc suggère que seul l'envoi arbitraire est bloqué, pas l'onboarding).
  4. Le message d'erreur exact affiché au déploiement d'un binding send_email sur Workers Free.
- **Sources tierces** : les chiffres de prix concordent entre doc officielle et blogs, mais tout libellé d'interface non confirmé par une page Cloudflare officielle est signalé comme témoignage.
- **Statut beta** : Email Sending est en public beta ; les nouveaux comptes démarrent avec un quota quotidien conservateur qui augmente avec la réputation d'envoi ; le packaging reste susceptible d'évoluer avant la GA.