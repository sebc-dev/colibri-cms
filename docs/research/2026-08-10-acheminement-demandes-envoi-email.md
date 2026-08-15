# Envoi d'e-mail transactionnel depuis un Worker Cloudflare, sans carte, avec détection de panne — arbitrage Stack (10 août 2026)

## TL;DR
- **Oui, une voie tient les trois conditions.** La voie native Cloudflare — le binding `send_email` de Cloudflare Email Service vers une **adresse de destination vérifiée**, avec seulement Email Routing configuré — est gratuite sur le plan Workers Free, ne demande ni clé d'API ni secret du prestataire, et n'exige aucune carte selon la documentation officielle. C'est la recommandation par défaut (hypothèse H2 confirmée). L'hypothèse d'existence est donc satisfaite ; la condition la plus fragile n'est pas l'activabilité mais la **délivrabilité**, à constater à la recette.
- **Point technique dirimant tranché** : le runtime Workers **autorise** les connexions TCP sortantes via `connect()` sur les ports **465/587** ; seul le port **25 est bloqué**. L'envoi SMTP depuis un Worker est donc techniquement possible (bibliothèque `worker-mailer`), ce qui **contredit** l'affirmation marketing répandue « SMTP impossible dans Workers ». Aucune famille de candidats n'est donc éliminée par « pas d'API HTTP » — mais le SMTP reste fragile et non recommandé.
- **Détection** : aucun mécanisme unique ne couvre tout. Le seul qui teste le canal réel de bout en bout est un **accusé périodique auto-déclenché par Cron Trigger** dont **l'absence** d'arrivée est le signal (D1). Il vit dans le compte Cloudflare de l'éditrice et survit au départ du prestataire. Il faut le compléter par un contrôle des journaux/rebonds côté fournisseur (D2) et un rapprochement liste↔boîte (D3).

## Key Findings

**1. La question technique qui élimine des familles entières est tranchée en faveur d'une ouverture, pas d'une fermeture.**
La documentation officielle énonce que les Workers peuvent ouvrir des sockets TCP sortants via `connect()`, y compris pour SMTP sur 465/587 ; seul le port 25 est interdit. Verbatim des docs Cloudflare (`tcp-sockets.mdx`) : « By default, Workers cannot create outbound TCP connections on port 25 to send email to SMTP mail servers ». Le README de `worker-mailer` confirme : « Cloudflare Workers cannot make outbound connections on port 25 ... but common ports like 587 and 465 are supported ». La page officielle `workers/reference/protocols` liste « Direct TCP sockets — Outbound : Create outbound TCP connections using the connect() API ». **Conséquence** : un candidat sans API HTTP ne tombe PAS automatiquement ; SMTP est jouable. Mais la fiabilité en production d'un client SMTP dans un isolate V8 (gestion de connexion, TLS, timeouts) reste un signal communautaire, pas une garantie.
*Niveau de preuve : mesuré (docs officielles) · Confiance : élevée.*

**2. La voie native Cloudflare est passée en bêta publique le 16 avril 2026 et rend l'envoi vers une adresse vérifiée gratuit sur tous les plans.**
Le blog officiel « Email for agents » (blog.cloudflare.com, 16 avril 2026, par Thomas Gauvin et Eric Falcão) annonce : « Today, as part of Agents Week, Cloudflare Email Service is entering public beta, allowing any application and any agent to send emails. » La doc de tarification énonce, verbatim : « Sending to verified destination addresses in your account is free on all plans, including when only Email Routing is configured » ; et la page Limits : « Sends to verified destination addresses are always free: they do not count toward your monthly quota or your daily sending limits, on any plan ». Le binding `send_email` s'utilise dans le code du Worker « no API keys, no secrets management » [Cloudflare](https://blog.cloudflare.com/email-for-agents/) (blog). L'expéditeur doit être « from your routing domains ». [Cloudflare](https://developers.cloudflare.com/email-service/platform/limits/) L'envoi vers un destinataire **arbitraire** exige, lui, le plan Workers Paid ($5/mois) : « Sending to arbitrary recipients requires the Workers Paid plan » (3 000 messages inclus/mois puis $0,35 par 1 000). Comme la destinataire est **une seule boîte fixe**, on reste dans le cas gratuit.
*Niveau de preuve : mesuré (docs officielles, MàJ 9 juin 2026) · Confiance : élevée.*

**3. Aucun candidat tiers ne domine sur les trois conditions ; plusieurs les tiennent, mais avec des réserves.**
- **Postmark** : 100 e-mails/mois, gratuit permanent, **sans carte**. Verbatim (postmarkapp.com/pricing) : « All new accounts start off on our free developer plan with 100 emails per month. Use it for however long you need, it doesn't expire ». Le support précise « limited to 100 emails a month with no monthly overages allowed » → **mur** au dépassement, donc aucun prélèvement possible sans acte explicite. Le mieux calibré pour « quelques demandes/jour ». API HTTP.
- **Scaleway TEM** (français, EU) : palier gratuit **300 e-mails/mois** selon la doc officielle. Verbatim (FAQ Scaleway) : « if you use the free tier of 300 emails per month, and you end up sending 305 emails, you will only be billed for five emails ». Dépassement = **facturation** de l'excédent (€0,25/1000), [EuroBoxx](https://euroboxx.eu/tools/scaleway-tem/) pas un mur — donc un moyen de paiement finit par être requis pour dépasser, ce qui heurte la condition « aucun prélèvement possible sans acte explicite ». API HTTP + SMTP.
- **Brevo** (français) : 300/jour, sans carte, permanent [Brevo](https://www.emailvendorselection.com/brevo-pricing/) ; API HTTP.
- **Mailjet** (français) : 6000/mois (200/jour), sans carte [PulseSignal](https://getpulsesignal.com/pricing/mailjet) à l'inscription [Mailjet](https://www.mailjet.com/pricing/) ; dépassement = file d'attente puis suppression après 3 jours, pas de facturation surprise sur le plan gratuit. API HTTP + SMTP.
- **MailerSend** : palier gratuit tombé à 500/mois (2 déc. 2025) et **carte exigée** pour activer le plan gratuit [Checkthat](https://checkthat.ai/brands/mailersend/pricing) → tombe sur la condition « sans moyen de paiement enregistré ».
- **SMTP2GO** : 1000/mois, sans carte, permanent [SMTP2GO](https://www.smtp2go.com/pricing/) ; API HTTP + SMTP.
- **SendGrid** : plan gratuit permanent **supprimé** (essai 60 jours depuis mai 2025) → tombe sur « permanent ».
- **Amazon SES** : palier gratuit devenu un **crédit de 12 mois** (3000/mois) [Saaspricepulse](https://www.saaspricepulse.com/tools/amazon-ses) puis payant ; **carte requise** à l'ouverture AWS ; **sandbox** à lever manuellement [OneUptime](https://oneuptime.com/blog/post/2026-02-12-move-amazon-ses-out-of-sandbox/view) → tombe sur « permanent » et « sans carte ».
- **ZeptoMail** : crédit de 10 000 e-mails valables 1 mois, [zoho](https://help.zoho.com/portal/en/kb/zeptomail/faqs/subscription) puis pay-as-you-go → pas un palier gratuit permanent.
- **Resend** : 3000/mois (100/jour), sans carte, permanent, 1 domaine [BuildMVPFast](https://www.buildmvpfast.com/alternatives/resend) ; pause (pas de débit) au dépassement ; API HTTP.
*Niveau de preuve : rapporté (pages fournisseurs + comparatifs) · Confiance : moyenne à élevée selon la cellule.*

**4. La détection de panne : le seul test de bout en bout est l'accusé périodique dont l'absence alerte.**
Un Cron Trigger dans le compte Cloudflare de l'éditrice (Free : jusqu'à 5 déclencheurs/ [Runhooks](https://runhooks.app/blog/cloudflare-workers-cron-triggers-limits/) compte, [Markaicode](https://markaicode.com/benchmarks/cloudflare-workers-scalability-benchmark/) 3/Worker) envoie un e-mail-témoin périodique vers sa boîte. Si le canal est en panne (compte suspendu, palier atteint, domaine dégradé, filtrage), le témoin n'arrive pas — c'est **l'absence** qui alerte. Les autres mécanismes (journaux/rebonds/webhooks du fournisseur, rapprochement liste↔boîte) détectent des sous-ensembles.

## Details

### A. Le verrou technique : SMTP sortant depuis un Worker
- **Fait établi (mesuré)** : `connect()` autorise TCP sortant sur 465/587 ; port 25 bloqué. Sources : docs Cloudflare `workers/runtime-apis/tcp-sockets`, `workers/reference/protocols`, blog « Announcing connect() ». La bibliothèque `worker-mailer` (npm) implémente un client SMTP pur-Worker sans dépendance.
- **Contre-signal marketing** : plusieurs pages (mailertogo) affirment « SMTP structurally impossible in Cloudflare Workers ». [Mailertogo](https://resources.mailertogo.com/comparisons/smtp-vs-email-api-cloudflare-workers) **C'est faux au sens strict** pour 465/587 ; c'est du contenu commercial émanant d'un fournisseur d'API HTTP — à démentir. `[À VÉRIFIER]` la robustesse réelle en production reste un signal communautaire.
- **Nuance sur la voie native** : le endpoint SMTP de Cloudflare *lui-même* n'offre que le port **465** en TLS implicite (verbatim doc SMTP : « Cloudflare only offers SMTP submission on port 465 with implicit TLS. Plaintext SMTP, opportunistic STARTTLS on port 587 ... are not supported for outbound submission. Port 25 is reserved for inbound mail to Email Routing. »). Mais pour la recommandation retenue, on n'utilise **pas** SMTP : on utilise le **binding** natif, sans port ni credential.
- **Conséquence d'arbitrage** : le SMTP de la messagerie de l'éditrice (famille 3) est techniquement praticable, mais dépend d'un fournisseur grand public autorisant l'envoi authentifié SMTP depuis une IP Cloudflare partagée — souvent bloqué ou soumis à réputation. **Non recommandé.**

### B. Cloudflare Email Service — la voie H2 (recommandée)
Chronologie officielle : annonce privée novembre 2025 (blog Email Service) ; **bêta publique le 16 avril 2026** (Agents Week). Statut au 10 août 2026 : **bêta publique** — « beta features and APIs may change before general availability » [Bavimail](https://bavimail.com/compare/cloudflare-email) (à signaler comme risque de stabilité).
- **Gratuité** : les envois vers adresse vérifiée sont « free on all plans » et hors quota ; l'envoi arbitraire exige Workers Paid ($5/mois) + domaine onboardé.
- **Sans carte** : aucune page officielle developers.cloudflare.com/blog n'énonce d'exigence de carte pour Email Routing ni pour les envois vers adresse vérifiée. `[INCERTAIN]` : l'absence d'exigence de carte ne se constate définitivement qu'en ouvrant le tunnel — voir liste « à la main ».
- **Sans secret du prestataire** : le binding `send_email` s'utilise sans clé d'API ; il vit dans le compte de l'éditrice.
- **Authentification** : SPF/DKIM gérés par Cloudflare [Cloudflare](https://developers.cloudflare.com/email-service/concepts/email-authentication/) (la zone est déjà chez Cloudflare — donnée d'entrée du projet). Pour le cas « adresse vérifiée seulement », l'onboarding d'un domaine d'envoi n'est **pas** requis [Cloudflare](https://developers.cloudflare.com/email-service/platform/limits/) ; seul Email Routing doit être configuré, et l'expéditeur doit appartenir à un « routing domain ». La destinataire confirme son adresse via un e-mail de vérification (« Cloudflare sends a verification email to that address. Open the email and select Verify email address to activate it. »).
- **Piège d'observabilité documenté** : « Emails sent from a Worker using the send_email binding appear in the Email Routing summary as **dropped**, even when they were delivered successfully. To track outbound send success, use Email sending metrics and logs instead. » [Cloudflare](https://developers.cloudflare.com/email-service/platform/limits/) → ne pas se fier au résumé Routing.

### C. Tableau de synthèse des candidats

| Voie d'envoi | Palier gratuit permanent | Carte à l'inscription | Carte à la vérif. domaine | Appelable depuis Worker | Vérif. domaine (SPF/DKIM/DMARC) | Limite j / mois | Dépassement | Source & date |
|---|---|---|---|---|---|---|---|---|
| **Cloudflare Email Service (adresse vérifiée)** | Oui (gratuit tous plans) | Non (aucune mention officielle) | N/A (pas d'onboarding domaine requis) | Oui — binding natif, sans clé | Non requis pour adresse vérifiée (Routing seul) | pas de quota sur adresse vérifiée | N/A (hors quota) | docs pricing/limits, MàJ 9 juin 2026 |
| **Cloudflare Email Service (destinataire arbitraire)** | Non — exige Workers Paid $5/mo | — | — | Oui — binding | Oui (onboarding) | 3000/mois inclus | facturation $0,35/1000 | docs pricing, 9 juin 2026 |
| **Postmark** | Oui (100/mois, « doesn't expire ») | Non | Non | Oui (API HTTP) | Oui | 100/mois | **mur** (« no overages allowed ») | postmarkapp.com/pricing |
| **Resend** | Oui (3000/mois, 100/j) | Non | Non | Oui (API HTTP) | Oui (1 domaine) | 100/j · 3000/mois | pause (pas de débit) | resend.com/pricing (via Nuntly, MàJ 21 avr. 2026) |
| **Scaleway TEM** (FR) | Oui (300/**mois**) | `[À VÉRIFIER]` | `[À VÉRIFIER]` | Oui (API HTTP + SMTP) | Oui | ~300/mois | **facturation** €0,25/1000 | scaleway docs FAQ |
| **Brevo** (FR) | Oui (300/j) | Non | `[À VÉRIFIER]` | Oui (API HTTP) | Oui (dédié transac.) | 300/j | file/mur | brevo pricing 2026 |
| **Mailjet** (FR) | Oui (6000/mois, 200/j) | Non | `[À VÉRIFIER]` | Oui (API HTTP + SMTP) | Oui | 200/j · 6000/mois | file 3j puis suppression | mailjet.com/pricing |
| **SMTP2GO** | Oui (1000/mois) | Non | Non | Oui (API HTTP + SMTP) | Oui | 200/j · 1000/mois | mur | smtp2go.com/pricing |
| **MailerSend** | Oui (500/mois) mais… | **Oui (carte requise)** | — | Oui (API HTTP) | Oui | 100/j · 500/mois | facturation | checkthat.ai (MàJ 2 déc. 2025) |
| **SendGrid** | **Non (essai 60 j)** | Non | — | Oui (API HTTP) | Oui | 100/j (60 j) | arrêt après essai | twilio changelog (mai 2025) |
| **Amazon SES** | **Non (crédit 12 mois)** | **Oui** | — | Oui (API HTTP + SMTP) | Oui | 3000/mois (12 mois) puis payant | facturation ; sandbox | aws.amazon.com/ses/pricing |
| **ZeptoMail** | **Non (crédit 1 mois)** | `[À VÉRIFIER]` | — | Oui (API HTTP) | Oui | crédit 10k / 1 mois | pay-as-you-go | zoho.com/zeptomail |
| **SMTP messagerie de l'éditrice** | dépend du fournisseur | N/A | N/A | Oui via `connect()` 465/587 | selon fournisseur | selon fournisseur | selon fournisseur | docs TCP sockets |

### D. Tableau « chiffre/condition qui circule → source primaire → verdict »

| Affirmation qui circule | Source primaire trouvée ? | Verdict |
|---|---|---|
| « SMTP est impossible dans Cloudflare Workers » | Non (contredit par docs officielles : 465/587 OK) | **FAUX** — marketing ; seul le port 25 est bloqué |
| « Cloudflare Email Sending est gratuit » | Oui (docs pricing) | **Partiellement vrai** : gratuit seulement vers adresse vérifiée ; arbitraire = Workers Paid |
| « SES : 62 000 e-mails/mois gratuits » | Oui (AWS blog 2023) | **PÉRIMÉ** : réduit à 3000/mois, crédit 12 mois |
| « SendGrid a un plan gratuit permanent » | Oui (Twilio changelog, mai 2025) | **FAUX depuis 2025** : essai 60 jours |
| « MailerSend gratuit sans carte » | Oui (checkthat.ai, doc MailerSend) | **FAUX** : carte requise pour activer le gratuit |
| « Scaleway TEM = 300/jour gratuits » | Oui — FAQ Scaleway dit 300/**mois** | **CONFLIT** : doc officielle = 300/mois ; source tierce (makerstack) = 300/jour — `[À VÉRIFIER]` en console |
| « Le binding send_email marche sur le plan Free » | Oui (docs, recoupées) | **VRAI pour adresse vérifiée** ; la case « Not available (Free) » du tableau vise l'envoi arbitraire |

### E. Détection de panne d'acheminement (question 2)

**D1 — Accusé périodique auto-déclenché (Cron Trigger dans le compte Cloudflare).**
- *Ce qu'il détecte* : la panne réelle **de bout en bout**, quelle qu'en soit la cause (compte suspendu, palier atteint, domaine dégradé, filtrage spam), car il teste la livraison effective dans la vraie boîte.
- *Ce qu'il ne détecte pas* : rien de structurel — mais il souffre d'un angle mort : **si le témoin arrive en indésirable**, il « arrive » quand même ; il faut donc que l'éditrice vérifie aussi son dossier spam, ou que le témoin soit distinct des vraies notifications. Autre limite : le Cron Free n'a **pas de retry** [Runhooks](https://runhooks.app/blog/cloudflare-workers-cron-triggers-limits/) ; une exécution ratée est simplement sautée.
- *Geste concret* : l'éditrice reçoit (ex.) un e-mail-témoin quotidien « canal OK — [date] ». **La règle est inversée : c'est l'absence qui alarme.** Il faut donc un rappel : « si je n'ai pas vu le témoin hier, le canal est peut-être coupé ». Confiance : élevée que ce soit le seul test réel ; moyenne sur l'ergonomie (dépend d'un humain qui remarque une absence).

**D2 — Retour d'échec du fournisseur (rebond, webhook, journal).**
- Cloudflare Email Service publie 6 types d'événements : `message.delivered`, `message.deferred`, `message.bounced`, `message.failed`, `message.rejected`, `message.complained` (changelog 15 juil. 2026), [Cloudflare](https://developers.cloudflare.com/changelog/post/2026-07-15-event-subscriptions/) plus journaux et liste de suppression.
- *Ce qu'il détecte* : rejet SMTP, hard bounce, mise en liste de suppression, [Cloudflare](https://developers.cloudflare.com/email-service/concepts/deliverability/) plainte spam remontée par les postmasters.
- *Ce qu'il **ne** détecte **pas*** : le **compte/service suspendu** (aucun événement n'est émis si le service est coupé), le classement silencieux en indésirable (le message est « delivered » côté fournisseur mais invisible côté humaine), et la panne du Worker lui-même.
- *Geste concret* : consulter les journaux d'envoi dans le tableau de bord ; `[À VÉRIFIER]` l'abonnement aux événements via Queues peut exiger le plan Paid.

**D3 — Rapprochement liste ↔ boîte fait par l'éditrice.**
- *Ce qu'il détecte* : l'écart « X demandes enregistrées vs Y e-mails reçus », donc une panne installée — au moment où elle ouvre l'admin.
- *Ce qu'il ne détecte pas* : rien tant qu'elle n'ouvre pas l'interface (or l'énoncé précise justement qu'elle ne la consulte pas). Détection **tardive**.
- *Geste concret* : afficher en tête de l'admin un bandeau « N demandes non notifiées depuis [date] ».

**Synthèse détection** : combiner **D1 (test réel, dans son compte, survit au prestataire)** + **D3 (bandeau de rapprochement)**. D2 est un bonus d'observabilité mais ne couvre ni la suspension ni le spam. Aucun mécanisme ne détecte à lui seul le classement en indésirable ; seul D1 s'en approche, et seulement si la vérification du dossier spam est intégrée au geste.

### F. Points qui ne se constatent qu'à la main (connecté)
1. **Cloudflare** : ouvrir le tunnel Email Routing → confirmer qu'aucune carte n'est demandée pour vérifier une adresse de destination et activer le binding. *Observer* : présence/absence d'un écran de paiement.
2. **Cloudflare Email Sending** : vérifier si l'onboarding d'un domaine d'envoi (non nécessaire pour adresse vérifiée) déclenche une demande de plan payant. *Observer* : mention « Workers Paid required ».
3. **Recette délivrabilité** : envoyer un test réel vers la boîte cible réelle (Gmail/Orange/Free/SFR/La Poste selon le cas) et **constater l'arrivée en boîte principale, pas en spam**. *Observer* : dossier de réception ET dossier indésirable.
4. **Scaleway** : confirmer en console si le palier est 300/mois (doc) ou 300/jour (source tierce), et si une carte est exigée à l'inscription et à la vérification de domaine.
5. **Brevo/Mailjet** : confirmer qu'aucune carte n'est requise à la **vérification du domaine** d'envoi (distinct de l'inscription).

### G. Réponse explicite à l'hypothèse d'existence
**Une voie tient les trois conditions** : Cloudflare Email Service, envoi via `send_email` vers une **adresse de destination vérifiée**, avec seulement Email Routing configuré, sur le plan Workers Free. Elle satisfait (1) compte au nom de l'éditrice sans rien du prestataire, (2) gratuité durable sans carte ni prélèvement possible (l'envoi arbitraire payant est une bascule qui exige un acte explicite : passer en Workers Paid), et (3) délivrabilité constatable à la recette. **La condition la plus fragile n'est pas l'activabilité mais la délivrabilité** (condition 3), car c'est la seule qui ne se prouve qu'empiriquement à la livraison et qui dépend du filtrage du fournisseur destinataire — et parce que le service est en **bêta publique**, donc susceptible de changer.

*Le second choix qui tient les trois conditions le plus proprement est **Postmark** (100/mois, sans carte, permanent, mur au dépassement — donc aucun prélèvement possible), au prix d'un compte tiers supplémentaire.*

## Recommendations

**Étape 1 — Recommandation par défaut (H2)** : implémenter l'envoi via le binding `send_email` de Cloudflare Email Service vers l'**adresse de destination vérifiée** de l'éditrice, avec Email Routing configuré, plan Workers Free.
- *Pourquoi* : aucun compte tiers, aucun secret, aucune carte selon les docs, gratuit et hors quota.
- *Bascule* : si, à l'ouverture du tunnel, une carte ou un plan Paid est exigé pour vérifier l'adresse (contredisant les docs) → passer à l'étape 2.

**Étape 2 — Repli tiers si la voie native échoue à la recette** : **Postmark** en premier choix (100/mois, sans carte, permanent, **mur** au dépassement) ; **Resend** ou **SMTP2GO** en alternatives équivalentes. Pour respecter « aucun prélèvement sans acte explicite », **préférer les paliers qui bloquent au dépassement** (Postmark, SMTP2GO, Mailjet, Resend) plutôt que ceux qui facturent l'excédent (Scaleway, MailerSend). Écarter d'emblée SendGrid, Amazon SES, MailerSend et ZeptoMail (échec sur « permanent » et/ou « sans carte »).

**Étape 3 — Détection (non optionnelle)** : déployer un **Cron Trigger** (plan Free) qui envoie un accusé quotidien, **et** un bandeau de rapprochement liste↔boîte dans l'admin. Documenter la règle inversée (« l'absence de témoin = alerte ») et inclure la vérification du dossier indésirable dans le geste.

**Étape 4 — Recette** : avant mise en production, test de livraison réel vers la boîte cible réelle, constat en boîte principale.

**Seuils qui changent la reco** :
- Si Cloudflare Email Sending passe en **disponibilité générale** et/ou rend l'envoi vers adresse arbitraire gratuit → la voie native devient recommandation sans réserve.
- Si le test de recette montre un classement en **spam** persistant chez le fournisseur destinataire → basculer vers un fournisseur tiers à meilleure réputation partagée (Postmark) et refaire la recette.
- Si une carte s'avère exigée à la vérification de domaine d'un tiers pressenti → ce tiers tombe malgré son palier gratuit affiché.
- Si le volume dépassait durablement les paliers gratuits (non prévu : « quelques/jour ») → réévaluer.

## Caveats
- **Bêta publique** : Cloudflare Email Sending est en bêta publique depuis le 16 avril 2026 ; « APIs may change before GA ». Risque de changement de conditions. `[INCERTAIN]`
- **Absence d'exigence de carte** : établie par **absence** de mention dans les docs officielles developers.cloudflare.com/blog, pas par une affirmation positive dans le périmètre autorisé (les pages marketing cloudflare.com disent « no credit card required », mais elles sont hors périmètre de sourcing primaire) ; à confirmer à la main dans le tunnel.
- **Délivrabilité française** : aucune source primaire mesurée ne certifie l'inbox placement Cloudflare vers Orange/Free/SFR/La Poste. Les benchmarks tiers (emailtooltester) mesurent SMTP2GO, Postmark, Mailjet, Brevo, SendGrid — pas la voie native Cloudflare. La condition 3 reste donc **à constater à la recette**, jamais acquise sur documentation. `[À VÉRIFIER]`
- **SMTP dans Workers** : possible techniquement (465/587) mais la robustesse en production n'est qu'un signal communautaire ; le port 25 est définitivement bloqué. [GitHub](https://github.com/zou-yu/worker-mailer)
- **Cron Free** : 5 déclencheurs/compte, 3/Worker, minimum 1 minute, **pas de retry**, UTC seulement. [Runhooks](https://runhooks.app/blog/cloudflare-workers-cron-triggers-limits/) Un accusé raté n'est pas réémis automatiquement.
- **Divergence Scaleway** : doc officielle = 300/**mois** ; source tierce (makerstack) = 300/jour. Conflit non résolu depuis la documentation seule.
- **worker-mailer** : dernière version publiée il y a ~5–8 mois selon npm [npm](https://www.npmjs.com/package/worker-mailer) ; vérifier la maintenance avant tout usage.
- **Sources tierces** : les pages de comparaison de fournisseurs (nuntly, checkthat, saaspricepulse, etc.) sont classées « commercial/benchmark d'éditeur » et n'ont servi qu'à orienter vers, ou recouper, les pages officielles. Chaque chiffre décisif ci-dessus est ancré à une page primaire du fournisseur ou de Cloudflare.