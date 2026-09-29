# Effacement des données d'un formulaire de demande de devis (site vitrine TPE) : purge automatique ou effacement manuel ?

*Recherche juridique — droit français et européen de la protection des données — à jour au 10 août 2026.*
*Ce rapport ne remplace pas la relecture juridique prévue au socle de livraison ; aucune de ses affirmations ne descend telle quelle dans un livrable sans arbitrage humain.*

---

## TL;DR

- **Réponse à D1 (le PRD doit-il porter une exigence de purge automatique assortie d'un délai ?) : NON — sous conditions.** Aucun texte contraignant n'impose de durée chiffrée pour ce traitement, ni n'impose au *logiciel* de purger automatiquement. L'obligation de limitation de la conservation (art. 5.1.e RGPD) pèse sur la **responsable de traitement** (la cliente TPE), qui peut y satisfaire par un effacement manuel encadré par une politique écrite. Trois conditions font que la réponse est « non, mais » : (1) l'effacement doit rester réellement **praticable** dans l'outil (filtre par date, effacement unitaire et groupé) — faute de quoi la protection dès la conception (art. 25) est en défaut ; (2) une **politique de durée écrite** doit exister et être appliquée par la cliente ; (3) la purge côté logiciel ne suffit **jamais seule**, car elle laisse intacte la copie e-mail dans la boîte de la cliente.
- **La durée de « 3 ans prospect » qui circule partout n'est PAS contraignante** : elle provient du référentiel CNIL « gestion des activités commerciales » (délibération n° 2021-131 du 23 septembre 2021), qui est indicatif et présume la conformité sans l'imposer. La CNIL écrit elle-même : « Les référentiels ne sont pas contraignants. Les responsables de traitement peuvent s'écarter de ces préconisations […] à condition toutefois de pouvoir justifier leur choix ».
- **Réponse à D2 (acte de sous-traitance art. 28 ?) : OUI, dès que l'intégrateur accède techniquement aux données**, même sans héberger et même avec des accès révocables. Tant qu'il se borne à livrer un produit sans jamais accéder aux demandes, il reste un simple fournisseur/tiers ; dès qu'il intervient en maintenance sur l'instance contenant les demandes, il devient sous-traitant au sens de l'art. 28 et un contrat de sous-traitance est requis.

---

## Key Findings

**1. Aucune durée chiffrée contraignante n'existe pour ce traitement — `contraignant` pour le principe / `absence de donnée` pour un chiffre légal (confiance : élevée).** Le seul texte contraignant est l'article 5.1.e RGPD : les données doivent être « conservées sous une forme permettant l'identification des personnes concernées pendant une durée n'excédant pas celle nécessaire au regard des finalités pour lesquelles elles sont traitées ». Ni le RGPD ni la loi n° 78-17 ne fixent de nombre d'années pour une demande de devis. **L'absence de durée légale chiffrée est donc un résultat établi, pas une lacune de recherche.**

**2. La durée « 3 ans prospect » est `recommandé`, non `contraignant` (confiance : élevée).** Elle provient du référentiel adopté par délibération CNIL n° 2021-131 du 23 septembre 2021. La CNIL, dans son questions-réponses officiel sur ce référentiel, écrit verbatim : « Les référentiels ne sont pas contraignants. Les responsables de traitement peuvent s'écarter de ces préconisations (exemple : en appliquant des durées de conservation différentes de celles suggérées par les référentiels), à condition toutefois de pouvoir justifier leur choix, dont ils demeurent responsables. »

**3. L'obligation pèse sur la responsable de traitement, pas sur l'éditeur du logiciel — `contraignant` (confiance : élevée).** L'article 25 RGPD (protection dès la conception et par défaut) vise le « responsable du traitement ». Le considérant 78 se borne à « inciter » les fabricants/producteurs de logiciels, sans les obliger. Les lignes directrices EDPB 4/2019 sur l'article 25 (version 2.0 adoptée le 20 octobre 2020) confirment que les producteurs « ne sont pas directement visés par l'article 25 ».

**4. La copie e-mail entre dans l'assiette de l'obligation — `interprétation` fondée (confiance : élevée).** La messagerie de la cliente est un second support du même traitement. Une purge appliquée au seul logiciel, laissant la copie dans la boîte mail, ne satisfait pas l'obligation de limitation : elle la manque partiellement.

**5. Registre des traitements : très probablement requis malgré la taille — `contraignant` avec exceptions (confiance : moyenne-élevée).** L'article 30.5 dispense les organisations de moins de 250 salariés « sauf si le traitement […] n'est pas occasionnel ». Un formulaire de devis permanent sur un site vitrine est un traitement régulier, donc non occasionnel : la dispense tombe et un registre (au moins allégé) est attendu.

**6. Analyse d'impact (AIPD) : non requise — `contraignant` (art. 35) / conclusion `interprétation` documentée (confiance : élevée).** Le traitement ne figure ni sur la liste des AIPD obligatoires (délibération CNIL n° 2018-327 du 11 octobre 2018), ni sur la liste des dispenses (délibération n° 2019-118 du 12 septembre 2019). Il faut appliquer les 9 critères du CEPD (WP248) : un formulaire de contact banal n'en remplit aucun ou un seul → pas d'AIPD, décision à documenter.

**7. Transferts hors UE via Cloudflare : couverts par le Data Privacy Framework, statut valide mais fragile — `officiel` (confiance : élevée).** Cloudflare est certifiée DPF. La décision d'adéquation UE–États-Unis du 10 juillet 2023 est en vigueur ; le Tribunal de l'UE a rejeté le recours Latombe le 3 septembre 2025 (affaire T-553/23, *Latombe c/ Commission*) ; un pourvoi a été formé le 31 octobre 2025 devant la CJUE.

**8. Qualification de l'intégrateur : sous-traitant dès l'accès technique — `officiel`/`interprétation` (confiance : moyenne-élevée).** La CNIL qualifie les prestataires de maintenance informatique de sous-traitants dès qu'ils peuvent accéder aux données, même sans les héberger.

---

## Details

### A. Le statut juridique de la durée (sert D1)

Le texte contraignant unique est l'**article 5.1.e RGPD** (principe de limitation de la conservation). Il n'énonce pas de durée : il énonce un standard (« n'excédant pas celle nécessaire »). Le **considérant 39** précise que « des délais devraient être fixés par le responsable du traitement pour leur effacement ou pour un examen périodique » — notez le conditionnel et l'alternative *effacement / examen périodique*. `contraignant` (art. 5.1.e) ; `interprétation` (considérant 39, non normatif en lui-même).

En pratique, la durée se justifie par la finalité : traiter une demande de devis jusqu'à sa conclusion (sans suite / devis envoyé / commande), plus une éventuelle fenêtre de relance ou de preuve. La responsable détermine et documente cette durée : c'est elle, et non un chiffre légal, qui fait foi.

**Table exigée — les durées qui circulent :**

| Durée annoncée | Pour quelles données | Source primaire trouvée ? | Statut : contraignant / recommandé / folklore |
|---|---|---|---|
| 3 ans à compter du dernier contact | Prospect non client (demande de devis) | Oui — délib. CNIL n° 2021-131 du 23/09/2021, référentiel gestion commerciale | **recommandé** (référentiel non contraignant) |
| Durée de la relation contractuelle + 3 ans | Client | Oui — même référentiel n° 2021-131 | **recommandé** |
| 10 ans | Pièces comptables / factures | Oui — Code de commerce, art. L123-22 | **contraignant** (mais hors périmètre : concerne factures émises, pas la demande de devis) |
| 13 mois | Données de carte bancaire | Référentiel CNIL | **recommandé** (sans objet ici : pas de CB) |
| 2 ans d'inactivité avant suppression | Comptes utilisateurs inactifs | Référentiel CNIL / sanction Discord SAN-2022-020 | **recommandé** (contexte comptes, pas demande de devis) |
| 3 mois en base active | Solvabilité candidat locataire | Référentiel gestion locative CNIL | **recommandé** (hors périmètre) |

Aucune de ces durées n'est une durée légale contraignante spécifique à la demande de devis. La seule vraiment contraignante (10 ans comptable) ne concerne pas les données du formulaire tant qu'aucune facture n'est émise. **Le chiffre « 3 ans » est très répandu mais remonte toujours à une source unique (le référentiel 2021-131) : il reste donc une source unique.**

### B. Valeur juridique des durées CNIL

Les référentiels **présument la conformité** sans l'imposer. S'en écarter est licite si la responsable justifie son choix. En contrôle, respecter le référentiel offre une sécurité (présomption de conformité) ; s'en écarter oblige à motiver. La CNIL peut néanmoins sanctionner sur le fondement de l'article 5.1.e lui-même, indépendamment du référentiel — c'est ce qu'illustre la sanction **Discord (délibération SAN-2022-020 du 10 novembre 2022, amende de 800 000 €**, manquements aux art. 5.1.e, 13, 25.2, 32 et 35). La CNIL y relève que « la société n'a pas défini de politique de durée de conservation des données et […] son registre des activités de traitements ne mentionne aucune durée de conservation ». Le manquement était **l'absence de politique et de mise en œuvre**, pas la violation d'un chiffre précis.

### C. Qui porte l'obligation — et ce que la protection dès la conception exige (cœur de D1)

L'article 25 RGPD vise le **responsable du traitement**. Le considérant 78 « incite » les producteurs de logiciels ; l'EDPB (lignes directrices 4/2019, v2.0 du 20 octobre 2020) confirme qu'ils « ne sont pas directement visés par l'article 25 ». **Conséquence : le droit n'impose pas au logiciel de purger automatiquement.** Il impose à la responsable de tenir sa durée.

Cela départage les hypothèses :

- **H1 (aucune durée légale ; effacement manuel + politique écrite suffisent) : retenue comme dominante.** Aucun texte ni sanction ne vise l'éditeur d'un outil de gestion de devis pour absence de purge automatique.
- **H2 (la purge doit être fournie par le logiciel) : écartée en droit strict.** L'article 25 ne descend pas jusqu'à l'éditeur. La sanction Discord (art. 25.2 retenu) visait Discord *en tant que responsable de son propre traitement*, pas en tant qu'éditeur vendant un outil à des tiers.
- **H3 (le logiciel doit rendre l'effacement praticable et documenté) : retenue comme complément opérationnel de H1.** Si l'outil empêche structurellement la responsable de tenir sa durée (pas de filtre par date, pas d'effacement groupé), la cliente est en défaut d'article 5.1.e et l'éditeur s'expose à un risque de responsabilité contractuelle (garantie de conformité de l'outil vendu pour cet usage), à défaut de risque réglementaire direct.

**Ce qui ferait basculer vers H2** : une délibération de sanction ou une position d'autorité visant explicitement l'éditeur d'un outil (et non l'utilisateur). Aucune trouvée au 10 août 2026. `[À VÉRIFIER]` en veille.

### D. La copie e-mail (sert D1)

La demande existe sur deux supports du même traitement : l'instance et la boîte mail de la cliente. L'obligation de limitation couvre les deux. Une purge logicielle laissant la copie mail intacte ne satisfait donc pas pleinement l'obligation. Conclusion opérationnelle : **la politique de conservation doit couvrir explicitement la boîte mail** (règle de tri/suppression), et aucune fonction logicielle ne peut à elle seule garantir la conformité de ce second support. C'est un argument décisif contre l'idée qu'une purge logicielle « règlerait » le sujet.

### E. Contenu obligatoire de l'information (art. 13 RGPD)

Au moment de la collecte, la responsable doit fournir : identité et coordonnées du responsable ; le cas échéant DPO (ici aucun) ; finalités ; base légale ; destinataires ou catégories ; intention de transfert hors UE et garanties ; durée de conservation ou critères ; droits (accès, rectification, effacement, opposition, limitation, portabilité) ; droit de réclamation auprès de la CNIL ; caractère obligatoire/facultatif des réponses. La CNIL et le CEPD admettent une approche à deux niveaux : mention courte au point de collecte + lien vers une politique complète, réellement accessible **avant** validation du formulaire. `contraignant` (art. 13) ; approche à niveaux `recommandé`. Base légale probable ici : mesures précontractuelles à la demande de la personne / intérêt légitime (art. 6.1.b ou 6.1.f) — à trancher par la relecture juridique.

### F. Transferts hors UE (Cloudflare)

Cloudflare déclare, dans son *Data Processing Addendum*, se conformer au Data Privacy Framework, ses transferts vers Cloudflare aux États-Unis « ne constitu[ant] pas un Transfert limité » sous le DPF. Base légale : décision d'adéquation UE–États-Unis (art. 45 RGPD), du 10 juillet 2023. **Statut au 10 août 2026 : en vigueur.** Le recours en annulation de Philippe Latombe a été rejeté par le Tribunal de l'UE le 3 septembre 2025 (affaire T-553/23) ; un pourvoi a été formé le 31 octobre 2025 devant la CJUE (limité aux points de droit, sans date d'audience annoncée). **Ce qui pèse sur la responsable** : vérifier que Cloudflare figure bien sur la liste DPF active et prévoir un plan de repli (clauses contractuelles types) en cas d'invalidation. `officiel`.

### G. Registre des traitements (art. 30.5)

L'exception des moins de 250 salariés ne joue que si le traitement est « occasionnel » (et sans données sensibles ni risque élevé) — les critères sont cumulatifs. Un formulaire de devis permanent est un traitement récurrent : la dispense tombe. Un registre au moins allégé est attendu. `contraignant` (art. 30.5, avec ses exceptions).

### H. Analyse d'impact (art. 35)

Le traitement ne figure sur **aucune** des deux listes CNIL. La liste des AIPD obligatoires (délibération n° 2018-327 du 11 octobre 2018) énumère 14 types (données de santé, génétiques, profilage RH, surveillance des employés, alertes, biométrie, logement social, localisation à large échelle, etc.) : la gestion commerciale ordinaire n'y figure pas. La liste des dispenses (délibération n° 2019-118 du 12 septembre 2019) vise 12 types, dont la « gestion de la relation fournisseurs » — mais **omet volontairement les clients et prospects**. Le traitement relevant d'aucune liste, on applique les 9 critères CEPD (WP248) : données de contact non sensibles, faible volume, pas de profilage, pas de décision automatisée, pas de surveillance → aucun ou un seul critère rempli → **pas d'AIPD requise**, décision à documenter dans le registre (la charge de la preuve pesant sur la responsable). `contraignant` (art. 35) ; conclusion `interprétation` documentée.

### I. Qualification du prestataire (sert D2)

Le sous-traitant (art. 4.8 RGPD) « traite des données pour le compte du responsable du traitement ». L'EDPB (lignes directrices 07/2020, v2.0 du 7 juillet 2021) rappelle que la qualification est **fonctionnelle, pas contractuelle**, et distingue les « moyens essentiels » (réservés au responsable) des « moyens non essentiels » (délégables au prestataire). La CNIL classe expressément les « prestataires de services informatiques (hébergement, maintenance, etc.) » parmi les sous-traitants.

- **H4 (sous-traitant dès l'accès technique) : retenue** pour la phase de maintenance. Dès que l'intégrateur intervient sur l'instance contenant les demandes (consultation, dépannage, sauvegarde, journalisation), il traite pour le compte de la cliente → sous-traitant, contrat art. 28 requis. La CNIL admet qu'un prestataire conserve des accès administrateur, mais « ces accès doivent être délégués, nominatifs, tracés » et l'entreprise doit pouvoir les révoquer — ce qui présuppose un cadre de sous-traitance.
- **H5 (pas sous-traitant tant qu'il ne traite pas) : retenue** pour la seule phase de livraison où il ne toucherait jamais aux données. Mais la détention d'accès d'administration révocables aux comptes de la cliente rend un accès effectif quasi inévitable en maintenance.

**Le geste qui fait basculer** : le premier accès effectif aux données du formulaire (ou la capacité, contractuellement prévue, d'y accéder en maintenance). À partir de là, **D2 = oui, acte de sous-traitance art. 28**.

---

## Évolutions annoncées mais non en vigueur au 10 août 2026

- **Proposition de la Commission européenne du 21 mai 2025 (4ᵉ paquet « Omnibus » de simplification)** : relever le seuil de dispense de registre pour cibler les « small mid-caps » (moins de 750 salariés **et** chiffre d'affaires < 150 M€ ou bilan < 129 M€) et recentrer le critère sur le risque plutôt que sur le caractère « occasionnel ». Selon les analyses doctrinales, elle pourrait faire bénéficier de la dérogation environ 38 000 entreprises supplémentaires, pour une économie estimée à 300 M€/an. **Non adoptée, non en vigueur.** Si adoptée, elle allégerait l'obligation de registre pour la TPE. `annoncé, non en vigueur`.
- **Pourvoi Latombe devant la CJUE** (formé le 31 octobre 2025) contre la validité du DPF. **Pendant, sans date d'audience annoncée.** Une invalidation ferait tomber la base d'adéquation et obligerait à basculer sur des clauses contractuelles types. `annoncé, non tranché`.

---

## Recommendations

1. **D1 — Ne pas inscrire d'exigence de purge automatique impérative dans le PRD.** Inscrire à la place une exigence de « conservation limitée praticable » : filtre par date, effacement unitaire **et** groupé, affichage de l'ancienneté des demandes. *Fait dont dépend cette reco : l'absence de toute position d'autorité visant l'éditeur d'un outil. Seuil de bascule : si une telle position (sanction, ligne directrice) paraît, passer à une purge configurable activée par défaut.*
2. **Offrir la purge automatique en option désactivable** (paramètre de durée réglable par la cliente), sans l'imposer : cela couvre H3 et protège l'éditeur au titre de la garantie de conformité, sans surcontraindre le produit.
3. **Fournir dans le socle de livraison un modèle de politique de conservation et un modèle de mention d'information art. 13**, incluant explicitement la **boîte mail** (règle de tri/suppression du second support). *Seuil de bascule : si le volume de demandes cesse d'être marginal, recommander l'activation de la purge automatique et l'archivage intermédiaire.*
4. **D2 — Inclure un acte de sous-traitance art. 28 dans le contrat de livraison**, déclenché par la clause d'accès de maintenance (accès délégués, nominatifs, tracés, révocables). *Fait dont dépend la reco : la réalité d'un accès technique aux données. Si l'intégrateur s'engage contractuellement à ne jamais accéder aux données et remet tous les accès à la cliente, un simple engagement de confidentialité peut théoriquement suffire — mais c'est fragile et déconseillé.*
5. **Vérifier annuellement le statut DPF de Cloudflare** et tenir des clauses contractuelles types prêtes en repli. *Seuil de bascule : invalidation du DPF par la CJUE sur pourvoi Latombe.*

### Ce qui ferait changer chaque recommandation

- **Référentiel CNIL 2021-131 abrogé/révisé** : la durée indicative de 3 ans changerait ; la reco de politique écrite (nº 3) resterait, seul le chiffre de référence bougerait.
- **Base légale des transferts (DPF) invalidée** : obligation immédiate de CCT + analyse de transfert (reco nº 5 déclenchée) ; l'hébergement Cloudflare gratuit resterait possible sous CCT.
- **Le site se met à prospecter** (newsletter, relance commerciale) : **changement de régime** — base légale distincte (consentement en B2C), information renforcée, droit d'opposition, et la durée « 3 ans prospect » du référentiel devient directement pertinente. La purge et la gestion des désabonnements deviennent alors des enjeux réels : la reco nº 1 devrait être réexaminée en faveur d'une purge par défaut.
- **Volume non marginal / traitement non occasionnel** : la dispense de registre tombe (elle est déjà probablement tombée) ; le registre devient clairement obligatoire.
- **Décision qualifiant l'éditeur de responsable conjoint** (art. 26) plutôt que de tiers : bascule majeure — l'éditeur devrait alors conclure un accord de responsabilité conjointe et porterait des obligations propres, dont potentiellement la purge.

---

## Caveats

- Ce rapport **ne remplace pas la relecture juridique** prévue au socle de livraison. Aucune affirmation ne doit descendre telle quelle dans un document livrable sans arbitrage humain.
- La qualification sous-traitant/tiers et la conclusion AIPD sont des analyses au **cas par cas** ; elles dépendent de la réalité des accès et du volume, non tranchées par un texte unique. `[À VÉRIFIER]` sur le cas concret de déploiement.
- Les durées CNIL reposent sur une **source unique** (le référentiel n° 2021-131) : un chiffre très répandu reste une source unique.
- La base légale exacte du traitement (art. 6.1.b mesures précontractuelles vs 6.1.f intérêt légitime) n'a pas été tranchée ici et relève de la relecture juridique. `[INCERTAIN]`.
- Les distinctions de niveau de contrainte (`contraignant` / `recommandé` / `interprétation`) ont été maintenues affirmation par affirmation ; en cas de doute résiduel, se reporter au texte primaire cité (article RGPD, numéro et date de délibération).