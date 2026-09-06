# Paliers gratuits de sept composants Cloudflare — activabilité sans carte, limites datées et comportement au dépassement (au 10 août 2026)

## TL;DR

- **Six des sept composants satisfont le critère « mur, jamais compteur facturé »** — Cloudflare Pages, Workers avec assets statiques, D1, Workers KV, Durable Objects (backend SQLite uniquement), WAF (Free Managed Ruleset) et Turnstile s'activent sur un compte sans moyen de paiement et se comportent au dépassement comme des murs (refus, erreur temporaire), sans jamais générer de facture.
- **R2 échoue au critère et sort du périmètre utilisable** : la documentation officielle « Get started » impose de « compléter le flux de checkout pour ajouter un abonnement R2 » avant de créer un bucket, et le tableau de bord exige une carte (ou PayPal) même pour le palier gratuit — un utilisateur de la Community décrit « a mandatory billing card information dialog [that] cannot be bypassed, preventing the creation of an R2 bucket without adding payment details ». Le dépassement est facturé au-delà de 10 Go / 1 M opérations Classe A / 10 M opérations Classe B. **Conséquence de conception : les médias du site vitrine ne peuvent pas vivre dans R2 sous la contrainte du projet.** Ils doivent vivre dans les assets statiques de Pages ou de Workers (limite de 20 000 fichiers, 25 Mio/fichier — largement au-dessus de 150-400 photos).
- **Pas de bascule automatique vers une offre payante sur un compte sans carte** : le plan Workers Paid exige un acte explicite (souscription à 5 $/mois) ; un échec de paiement provoque une *rétrogradation vers Free*, jamais une montée en gamme forcée. Entre Pages et Workers avec assets, les limites qui mordent sont identiques pour ce cas d'usage ; le seul départage est stratégique : **Cloudflare oriente désormais les nouveaux projets vers Workers**, sans dépréciation ni date butoir pour Pages.

## Key Findings

### Le fait transversal le plus important : aucune bascule automatique vers le payant, mais R2 est une exception structurelle

Sur un compte purement gratuit et **sans moyen de paiement enregistré**, aucun des produits « developer platform » ne peut générer de facture au dépassement, pour une raison de construction : le passage au plan Workers Paid est un acte volontaire facturé « for a minimum charge of $5 USD per month for an account » (docs Workers Pricing, officiel, mis à jour le 7 juillet 2026). La page Workers/plans affiche « Start building for free — no credit card required » (officiel). **Niveau de confiance : élevé.**

L'unique mécanisme de bascule automatique documenté joue **dans l'autre sens** : « If the failed payment relates to a recurring charge for a Cloudflare plan, add-on, or subscription, your account is automatically downgraded to a Free plan after a 5-day grace period » (docs Billing, « Resolve a payment failure », officiel). Il n'existe donc pas de montée en gamme automatique. **Confiance : élevée.**

**Exception R2** : R2 est un produit à facturation à l'usage dont l'activation est verrouillée derrière un flux de checkout. La doc « Get started » (officiel, mise à jour le 21 avril 2026) impose comme préalable de « Complete the checkout flow to add an R2 subscription to your account ». En pratique, le tableau de bord réclame une carte ou PayPal même quand l'abonnement affiche « $0.00/mo plus usage ». Le fil Cloudflare Community « Why using R2 free tier involves giving card info? » (3 août 2026) décrit précisément le blocage : l'utilisateur *lubovase0* rapporte qu'en cliquant « Add R2 subscription to my account » sur un profil sans abonnement R2, « a mandatory billing card information dialog appears… the dialog cannot be bypassed, preventing the creation of an R2 bucket without adding payment details ». Le modérateur/MVP *sjr* en donne la raison : « The usage is not capped, if you exceed the free allocation on R2 you will be charged so a payment method is needed. » **Niveau de preuve : rapporté (Community), cohérent avec la doc officielle sur le checkout.**

La politique de facturation confirme la logique de suspension pour ce type de service : « If your payment method fails, we may suspend your access to the usage-based billing services… In the case of R2, you will not be able to access your R2 buckets and requests will return errors, but your data will remain secure. If you do not update your payment method within 30 days, the data related to any usage-based billing service(s) may be deleted » (docs Billing policy, officiel, mis à jour le 29 mai 2026). **Verdict R2 : échec du critère. Confiance : élevée sur le principe (checkout + carte obligatoires) ; moyenne sur la mécanique exacte de débit (voir Caveats).**

### Que devient un compte gratuit qui dépasse durablement

Pour les produits qui n'exigent pas de carte (Workers, Pages, D1, KV, Durable Objects), le dépassement est un **mur** : « If you exceed any one of these limits, further operations of that type will fail with an error » (docs Workers Pricing, officiel). Pour Workers spécifiquement : « When a Worker exceeds this limit, Cloudflare returns Error 1027 » (docs Workers Limits, officiel, mis à jour le 28 juillet 2026), avec deux modes configurables : *fail open* (« Bypasses the Worker. Requests behave as if no Worker is configured ») ou *fail closed* (« Returns a Cloudflare 1027 error page »). Le message vu par les visiteurs est : « This website has been temporarily rate limited… Check back later once traffic has gone down » (Cloudflare Community, rapporté). Il n'y a ni facture ni suspension du compte. **Confiance : élevée.**

La suspension de compte pour impayés (« Your account is locked due to the unpaid invoices. (Code: 1323) ») ne concerne que des comptes ayant des factures dues, c'est-à-dire ayant souscrit à un produit payant — pas un compte gratuit sans carte (Cloudflare Community, rapporté). **Confiance : moyenne** (comportement documenté par la Community, cohérent avec la politique officielle).

### Pages contre Workers avec assets — départage

Sur les limites qui mordent pour un site vitrine, les deux sont **équivalents** : les deux plafonnent à **20 000 fichiers par déploiement** et **25 Mio par fichier** sur le plan Free (docs Pages Limits, officiel, mis à jour le 16 juillet 2026 : « Cloudflare Pages sites can contain up to 20,000 files on the Free plan » ; docs Workers Limits : « Files per Worker version : 20,000 » sur Free). Pour 150-400 photos, on est à ~2 % de la limite. **H1 (équivalence) l'emporte pour ce cas d'usage. Confiance : élevée.**

Le départage n'est donc pas une limite mais une **trajectoire produit** : Cloudflare oriente les nouveaux projets vers Workers avec assets statiques. La page produit Pages officielle (cloudflare.com/products/pages) affiche désormais : « Start with Workers, which now supports nearly all of Pages' features — plus extra tools and integrations not found in Pages », et un témoin tiers (thefridaydeploy.substack.com) confirme que « the Pages documentation now comes with a banner recommending migration to Workers ». Il n'y a toutefois **aucune dépréciation ni date butoir** : le guide Mecanik.dev (« Cloudflare Pages vs Workers: Which to Use in 2026 ») résume l'état officiel : « Is Cloudflare Pages being discontinued? No. Pages remains fully supported. Cloudflare now steers new full-stack projects toward Workers, but existing Pages projects continue to work and there is no forced migration. » La doc officielle de migration « Migrate from Pages to Workers » existe mais ne fixe pas de date. **Confiance : moyenne-élevée.** Recommandation : pour un projet neuf, **Workers avec assets statiques** ; le seuil qui inverserait ce choix serait l'annonce d'une date de dépréciation de Pages.

### Durable Objects sur palier gratuit — ce qui est accessible et depuis quand

Depuis le **7 avril 2025** (changelog officiel), « Durable Objects can now be used with zero commitment on the Workers Free plan ». La restriction structurante : sur Free, **seul le backend de stockage SQLite est accessible** — « Workers Free plan: Only Durable Objects with SQLite storage backend are available » (docs Workers Pricing, officiel). Le backend clé-valeur (key-value) reste réservé au plan payant, et depuis le **9 juillet 2026** aucun nouveau namespace clé-valeur ne peut être créé sur aucun compte n'en ayant pas déjà (changelog officiel). La facturation du stockage SQLite a été activée le **7 janvier 2026**, mais « Developers on the Workers Free plan will not be charged » (changelog du 12 décembre 2025, officiel). **Confiance : élevée.**

## Details

### Tableau de synthèse à sept lignes

| Composant | Activable sans carte ? | Limites du palier (avec date de page consultée) | Dépassement : mur ou compteur facturé ? | Verdict au regard du critère | Qualité de la source |
|---|---|---|---|---|---|
| **Cloudflare Pages** | Oui | 20 000 fichiers/site ; 25 Mio/fichier ; 500 builds/mois ; 1 build simultané ; 100 domaines perso/projet ; 100 projets/compte ; déploiements de prévisualisation illimités (docs Pages Limits, 16 juil. 2026) | **Mur** — erreur au déploiement si >20 000 fichiers (« Pages only supports up to 20,000 files in a deployment ») ; pas de facturation | **PASS** | Officiel |
| **Workers + assets statiques** | Oui (« no credit card required ») | 100 000 requêtes/jour ; CPU 10 ms/invocation ; mémoire 128 Mo ; 50 sous-requêtes/requête ; taille du Worker 3 Mo (gzip) ; 100 Workers/compte ; assets : 20 000 fichiers/version, 25 Mio/fichier (docs Workers Limits, 28 juil. 2026 ; Pricing, 7 juil. 2026) | **Mur** — Error 1027 (fail open ou fail closed) ; requêtes vers assets statiques gratuites et illimitées ; pas de facturation | **PASS** | Officiel |
| **R2** | **Non** — checkout/abonnement + carte exigés | 10 Go-mois ; 1 M opérations Classe A/mois ; 10 M opérations Classe B/mois ; egress gratuit (docs R2 Pricing, 7 août 2026) | **Compteur facturé** — au-delà : 0,015 $/Go-mois, 4,50 $/M Classe A, 0,36 $/M Classe B ; suspension puis suppression des données à 30 j si paiement échoue | **ÉCHEC** | Officiel (activation) + rapporté (carte) |
| **D1** | Oui | 5 M lignes lues/jour ; 100 000 lignes écrites/jour ; 5 Go de stockage total (docs Workers Pricing, 7 juil. 2026) | **Mur** — « you will not be able to run queries against D1. D1 API will return errors » ; stockage plein : impossible d'insérer | **PASS** | Officiel |
| **Workers KV** | Oui | 100 000 lectures/jour ; 1 000 écritures/jour ; 1 000 suppressions/jour ; 1 000 list/jour ; 1 Go stocké ; 1 000 namespaces/compte (docs KV Pricing ; changelog namespaces 27 janv. 2025) | **Mur** — « further operations of that type will fail with an error » ; hard caps, pas de throttling | **PASS** | Officiel |
| **Durable Objects** | Oui (backend SQLite uniquement) | Backend SQLite seul sur Free ; 100 000 requêtes/jour ; 13 000 Go-s/jour de durée ; stockage SQLite : 5 M lignes lues/jour, 100 000 lignes écrites/jour, 5 Go (docs Workers Pricing, 7 juil. 2026 ; changelog 7 avr. 2025) | **Mur** — limites gratuites ; « Developers on the Workers Free plan will not be charged » pour le stockage | **PASS** | Officiel |
| **WAF** | Oui | Cloudflare Free Managed Ruleset (activé par défaut sur toutes les zones) ; règles personnalisées au niveau zone pour tous ; inspection du corps de requête plafonnée à 1 Mo sur Free (docs WAF) | **Sans objet** — fonctionnalité incluse, pas de compteur d'usage ; le mur est l'indisponibilité du Managed Ruleset complet/OWASP (payant) | **PASS** | Officiel |
| **Turnstile** | Oui | Jusqu'à 20 widgets ; 10 hostnames/widget ; rétention analytics 7 jours ; challenges/vérifications illimités (modes managed/non-interactive) ; tous les modes de widget (docs Turnstile Plans, 16 avr. 2026) | **Mur/sans objet** — « Unlimited challenges » ; le mur est le plafond de 20 widgets et l'absence de fonctions Enterprise | **PASS** | Officiel |

### Tableau « chiffre circulant → source primaire trouvée ? → verdict »

| Chiffre circulant | Source primaire officielle trouvée ? | Verdict |
|---|---|---|
| Workers : 100 000 requêtes/jour | Oui — docs Workers Pricing/Limits (7 & 28 juil. 2026) | **Valide** |
| Workers Free : CPU « 30 ms »/requête | Non — la doc dit **10 ms** ; « 30 ms » circule mais est faux pour Free (c'est le défaut du plan Paid) | **Périmé/erroné** |
| Workers Free : taille du Worker « 1 Mo » | Non — passé à **3 Mo** (gzip) ; « 1 Mo » traîne dans de vieux billets et un ancien patch de doc | **Périmé** |
| Pages : 20 000 fichiers (Free) | Oui — docs Pages Limits (16 juil. 2026) ; le passage à 100 000 concerne **uniquement les plans payants** (changelog 23 janv. 2026) | **Valide** |
| Pages : 500 builds/mois | Oui — docs Pages Limits | **Valide** |
| R2 : 10 Go / 1 M Classe A / 10 M Classe B | Oui — docs R2 Pricing (7 août 2026) | **Valide** |
| D1 : « 5 GB storage, 5M reads/writes per month » | Partiellement — la doc dit **5 M lignes lues/JOUR** et **100 000 écrites/JOUR** (pas « par mois ») ; 5 Go correct | **Formulation périmée** — les chiffres « /mois » circulent mais l'unité officielle est le jour |
| D1 : « ~150 M lignes lues/mois, ~3 M écrites/mois » | Non — extrapolation d'un calculateur tiers à partir des limites/jour ; pas une valeur officielle | **Non étayé** (dérivé) |
| KV : 100 000 lectures/jour, 1 000 écritures/jour | Oui — docs KV Pricing ; blog Cloudflare (free tier KV) | **Valide** |
| KV : « 100 000 reads/writes per day » | Non — les écritures sont **1 000/jour**, pas 100 000 ; confusion fréquente | **Erroné** |
| Durable Objects : « 400K GB-s, 1M requests/month » | Non pour Free — la doc Free dit **100 000 requêtes/jour** et **13 000 Go-s/jour** ; « 400K GB-s / 1M req/month » sont les **inclus du plan Paid** | **Erroné pour Free** |
| Turnstile : « 1 million siteverify » comme plafond | Partiellement — ne vise que les widgets **invisibles** ; managed/non-interactive = illimités (voir Details Turnstile) | **À nuancer** |
| Turnstile : « 7-day analytics » | Oui — docs Turnstile Plans (16 avr. 2026) ; certains billets disent « 24h » (erroné) | **Valide** (7 jours) |

### Détail par composant (verbatim porteur)

**Cloudflare Pages** (officiel, docs Pages Limits, mis à jour le 16 juillet 2026).
- Fichiers : « Cloudflare Pages sites can contain up to 20,000 files on the Free plan. » Confiance : élevée.
- Taille de fichier : « The maximum file size for a single Cloudflare Pages site asset is 25 MiB. » Confiance : élevée.
- Builds : tableau « Builds per month : Free = 500 » et « Builds : 1 build at a time ». Confiance : élevée.
- Comportement au dépassement du nombre de fichiers : erreur au déploiement, « Error: Pages only supports up to 20,000 files in a deployment » (rapporté par GitHub issue + Community, cohérent). C'est un **mur**. Confiance : élevée.
- Note : la limite « 100 000 fichiers » ne vaut **que pour les plans payants** et nécessite `PAGES_WRANGLER_MAJOR_VERSION=4` ; « The Free plan remains at 20,000 files per site » (changelog du 23 janvier 2026, officiel).

**Workers avec assets statiques** (officiel, docs Workers Limits/Pricing).
- « Requests : 100,000/day » ; « CPU time : 10 ms » ; « Memory : 128 MB » ; « Subrequests : 50/request » ; « Worker size : 3 MB » (après gzip) ; « Number of Workers : 100 » ; « Number of Static Asset files per Worker version : 20,000 » ; « Individual Static Asset file size : 25 MiB ». Confiance : élevée.
- « Requests to static assets are free and unlimited » (docs Workers Pricing, note 3). C'est décisif : servir le site vitrine ne consomme pas le quota de 100 000 requêtes/jour ; seul le traitement serveur (envoi du formulaire) le consomme. Confiance : élevée.
- Dépassement : « When a Worker exceeds this limit, Cloudflare returns Error 1027 ». **Mur.** Confiance : élevée.

**R2** (officiel + rapporté).
- Palier : « Storage 10 GB-month / month ; Class A Operations 1 million requests / month ; Class B Operations 10 million requests / month ; Egress Free » (docs R2 Pricing, 7 août 2026). Confiance : élevée.
- Activation : « You need a Cloudflare account with an R2 subscription… Complete the checkout flow to add an R2 subscription to your account » (docs R2 Get started, 21 avril 2026). Confiance : élevée.
- Exigence de carte pour le palier gratuit : documentée principalement par la Community, non par la page de tarification. Le fil « Why using R2 free tier involves giving card info? » (3 août 2026) est le plus précis : « a mandatory billing card information dialog appears… cannot be bypassed, preventing the creation of an R2 bucket without adding payment details » (utilisateur), avec confirmation d'un MVP : « a payment method is needed ». **Niveau de preuve : rapporté.** Divergence à signaler : la page R2 Pricing ne mentionne aucune exigence de moyen de paiement, alors que le tableau de bord et la doc Get started imposent un checkout. Confiance sur le principe : élevée ; sur le mécanisme carte : moyenne.
- Dépassement : compteur facturé (0,015 $/Go-mois, 4,50 $/M Classe A, 0,36 $/M Classe B). **Compteur facturé → échec du critère.**

**D1** (officiel, docs Workers Pricing + D1 FAQ).
- « Rows read : 5 million / day ; Rows written : 100,000 / day ; Storage : 5 GB (total) ». Confiance : élevée.
- Dépassement : « When your account hits the daily read and/or write limits, you will not be able to run queries against D1. D1 API will return errors… Once you have reached your included storage limit, you will need to delete unused databases or clean up stale data before you can insert new data » (D1 FAQ, officiel). **Mur.** Confiance : élevée.
- « Yes, the Workers Free plan will always include the ability to prototype and experiment with D1 for free » (D1 FAQ, officiel).

**Workers KV** (officiel, docs KV Pricing).
- « Keys read 100,000/day ; Keys written 1,000/day ; Keys deleted 1,000/day ; List requests 1,000/day ; Stored data 1 GB ». Confiance : élevée.
- « up to 1000 Workers KV namespaces per account » (changelog du 27 janvier 2025, officiel). Confiance : élevée.
- Dépassement : « If you exceed any one of these limits, further operations of that type will fail with an error. » **Mur.** Confiance : élevée.

**Durable Objects** (officiel).
- « Workers Free plan: Only Durable Objects with SQLite storage backend are available » (docs Workers Pricing). Confiance : élevée.
- Free : « Requests 100,000/day » ; « Duration 13,000 GB-s/day » ; stockage SQLite Free : « Rows reads 5 million/day ; Rows written 100,000/day ; SQL Stored data 5 GB (total) ». Confiance : élevée.
- Accessible sur Free depuis le 7 avril 2025 (changelog). Backend clé-valeur : payant, et création de nouveaux namespaces KV bloquée depuis le 9 juillet 2026 (changelog). Confiance : élevée.
- Dépassement : mur (limites journalières) ; stockage non facturé sur Free. Confiance : élevée.

**WAF** (officiel).
- « all customers have access at least to the Cloudflare Free Managed Ruleset, which provides mitigations against high and wide-impacting vulnerabilities » (docs WAF, learning path). « The Free Managed Ruleset is deployed by default on Free plans » (docs WAF Get started). Confiance : élevée.
- Règles personnalisées : « At the zone level, all customers can create and deploy custom rulesets » (docs WAF Custom rulesets). Confiance : élevée.
- Le mur : le Cloudflare Managed Ruleset complet et l'OWASP Core Ruleset requièrent un plan payant (Pro/Business/Enterprise) ; l'inspection du corps de requête est plafonnée à 1 Mo sur Free. Pas de compteur facturé. Confiance : élevée.

**Turnstile** (officiel, docs Turnstile Plans, 16 avril 2026).
- « Number of widgets : Up to 20 widgets » ; « Unlimited challenges (traffic or verification requests) : Yes » ; « Hostname management : 10 hostnames per widget » ; « Analytics lookback : 7 days maximum ». Confiance : élevée.
- « Turnstile can be used independently without requiring other Cloudflare services. » Confiance : élevée.
- Le token de validation « is valid for five minutes » (docs Turnstile server-side validation, officiel). Confiance : élevée.
- Nuance historique et par mode : le blog de GA (2023) évoquait « below our 1 million siteverify request limit » pour les fonctions avancées. La lecture par mode de widget (analyse tierce de Marcel Gruber, 19 avril 2025, dérivée du blog GA) précise : « On the free plan, invisible widgets get up to 1 million siteverify (server-side) validation requests per month. The managed and non-interactive widgets have unlimited siteverify requests. » **Pour un formulaire de devis en mode managed (recommandé), les vérifications sont illimitées ; un plafond d'1 M/mois ne jouerait que si le widget était configuré en mode invisible.** Confiance : moyenne-élevée.

## À vérifier à la main sur le compte (livrable distinct)

Ces points ne se constatent qu'en étant connecté au tableau de bord Cloudflare du compte client, sans carte au dossier. Pour chacun : le geste exact et ce qu'il faut observer.

1. **R2 — activation sans carte.**
   Geste : Dashboard → **Storage & databases → R2 → Overview** → cliquer **Add R2 subscription / Purchase R2**.
   À observer : le flux de checkout s'ouvre-t-il en demandant un moyen de paiement ? Le dialogue de saisie de carte peut-il être contourné ? (attendu, d'après la Community : non, « mandatory billing card information dialog [that] cannot be bypassed »). Le bouton de confirmation reste-t-il grisé sans carte ? Conclure : si aucune carte ne peut être omise, R2 est **inutilisable** sous la contrainte.

2. **Workers Paid — absence de bascule automatique.**
   Geste : Dashboard → **Workers & Pages → Plans**.
   À observer : le passage au plan Paid exige-t-il un clic explicite « Subscribe » + saisie de carte ? Vérifier qu'aucune option « auto-upgrade on overage » n'est activée par défaut. Conclure : confirmer que rien ne peut basculer le compte en payant sans acte.

3. **D1 — création d'une base sans carte.**
   Geste : Dashboard → **Workers & Pages → D1 → Create database**.
   À observer : la création aboutit-elle sans checkout ? (attendu : oui, D1 est inclus dans le plan Free par défaut).

4. **Durable Objects — déploiement SQLite sans carte.**
   Geste : déployer un Worker avec une classe Durable Object via une migration `new_sqlite_classes`.
   À observer : le déploiement réussit-il ? Une migration `new_classes` (clé-valeur) doit échouer avec « In order to use Durable Objects with a free plan, you must create a namespace using a new_sqlite_classes migration. [code: 10097] ».

5. **Pages — comportement au 501ᵉ build du mois / >20 000 fichiers.**
   Geste : tenter un déploiement dépassant 20 000 fichiers.
   À observer : erreur « Pages only supports up to 20,000 files in a deployment » (mur confirmé). Pour la limite de builds, observer le message au 501ᵉ build (non documenté verbatim — à constater).

6. **WAF — Free Managed Ruleset actif par défaut.**
   Geste : Dashboard → zone → **Security → WAF → Managed rules**.
   À observer : le « Cloudflare Free Managed Ruleset » est-il présent et activé ? Le « Cloudflare Managed Ruleset » complet et l'OWASP sont-ils grisés/indisponibles ?

7. **Turnstile — création de widget sans carte + plafond 20 widgets.**
   Geste : Dashboard → **Turnstile → Add widget**.
   À observer : création sans checkout (attendu : oui) ; message au 21ᵉ widget.

8. **Compte gratuit dépassant durablement — pas de suspension.**
   Geste : laisser un Worker dépasser 100 000 req/jour plusieurs jours.
   À observer : Error 1027 pour les visiteurs, réinitialisation à 00:00 UTC, absence d'e-mail de facturation et absence de blocage du compte.

## Recommendations

1. **Écarter R2 du socle gratuit sous la contrainte « aucune carte ».** R2 échoue au critère (activation verrouillée par un checkout + carte ; dépassement facturé). Ne pas y loger les médias. C'est un **constat d'échec**, pas une invitation à chercher un remplaçant hors Cloudflare (exclu par le périmètre).
2. **Loger les médias dans les assets statiques du runtime public.** 150-400 photos ≪ 20 000 fichiers, chaque photo ≪ 25 Mio → aucune limite ne mord. Le magasin des médias et le magasin du contenu peuvent donc vivre **au même endroit**.
3. **Choisir Workers avec assets statiques comme runtime public** pour un projet neuf, Cloudflare orientant les nouveaux projets vers Workers. Servir les assets ne consomme pas le quota de requêtes ; seul l'envoi du formulaire (un unique traitement serveur) consomme sur les 100 000 req/jour — marge énorme pour 200-2 000 visites/mois.
4. **État applicatif et état publié : D1 (relationnel) ou KV (clé-valeur), tous deux murs et sans carte.** Pour un seul éditeur et 2-10 builds/mois, D1 (5 M lectures/jour) est confortable ; l'écriture (100 000 lignes/jour) est le plafond à surveiller, mais reste hors d'atteinte pour ce profil. KV mord d'abord sur les écritures (1 000/jour) — à réserver au cache/lecture.
5. **Protéger les surfaces exposées avec WAF Free Managed Ruleset (actif par défaut) + Turnstile sur le formulaire.** Les deux sont gratuits, sans carte, illimités en volume pour ce profil (Turnstile en mode managed : vérifications illimitées).
6. **Contractualiser la borne de gratuité** ainsi : 100 000 requêtes Worker/jour ; assets statiques illimités ; 20 000 fichiers/déploiement ; 5 Go D1 ; 1 Go KV ; WAF Free + Turnstile (≤ 20 widgets). Tout est un **mur** : au-delà, le service se dégrade temporairement, rien n'est dû.

### Seuils qui feraient changer la recommandation

- Si l'un des composants « mur » se met à facturer au dépassement → il sort du périmètre (comme R2 aujourd'hui).
- Si Pages et Workers avec assets divergent un jour sur une limite qui mord → le choix redevient un arbitrage ; aujourd'hui ils sont équivalents (préférence, pas arbitrage).
- Si Pages est annoncé en dépréciation avec date butoir → cela prime sur toute comparaison : migrer vers Workers immédiatement.
- Si la limite de 20 000 fichiers ou de 25 Mio/fichier était abaissée → réévaluer où vivent les médias (bascule éventuelle vers un stockage objet, donc réintroduction du problème R2/carte).
- Si WAF Free ou Turnstile exigeaient une carte → repenser entièrement la protection des surfaces exposées.
- Si une bascule automatique vers le payant devenait non désactivable → fait le plus important du rapport ; tout le raisonnement tomberait.

## Caveats

- **Exigence de carte pour R2** : établie sur le principe (checkout obligatoire, doc officielle « Get started ») et confirmée en pratique par la Cloudflare Community (dialogue de carte non contournable), mais **la page de tarification R2 reste muette** sur cette exigence. `[À VÉRIFIER]` en tableau de bord.
- **Mécanisme de la charge R2 à l'activation** : contesté selon les témoignages. Certains décrivent une simple pré-autorisation temporaire de 5 $ ; un autre fil (« Question regarding 5 USD charge for R2 Storage activation ») rapporte un **débit** : « I enabled R2 storage expecting to use the free tier, but I was charged 5 USD immediately after adding my payment [method] ». Pré-autorisation vs débit : `[INCERTAIN]`.
- **Divergence de sources officielles Turnstile** : le blog GA (plafond « 1 million siteverify » pour fonctions avancées / widgets invisibles) vs page Plans actuelle (« Unlimited challenges »). En mode managed/non-interactive, les vérifications sont illimitées ; l'existence d'un plafond ne concerne que le mode invisible. `[INCERTAIN]` sur l'application exacte au 10 août 2026.
- **Comportement au 501ᵉ build Pages** : non documenté verbatim ; probable mur (déploiement refusé) mais `[À VÉRIFIER]`.
- **Suspension d'un compte purement gratuit** : la doc ne décrit la suspension que pour impayés (donc comptes avec souscription payante). Pour un compte sans carte dépassant durablement, la doc ne décrit **pas** de suspension — c'est un **résultat** (absence de donnée), pas une déduction. `[INCERTAIN]` sur les cas extrêmes d'abus.
- **Unités D1/DO** : de nombreux billets tiers expriment les limites « par mois » ; la doc officielle les exprime **par jour** pour le plan Free. Les valeurs « par mois » qui circulent sont des extrapolations non officielles.
- Les dates « mis à jour le » citées sont celles des pages consultées le 10 août 2026 ; sauf changelog explicite, la date du **dernier changement de valeur** n'est pas toujours distincte de la date de dernière révision de page.