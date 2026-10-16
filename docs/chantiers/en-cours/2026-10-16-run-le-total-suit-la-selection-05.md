# Run du ticket 05 bloqué : deux anciens tests interdisent le module du formulaire

Portée : 012-envoi-des-demandes-de-devis · ticket 05
Ouvert le 2026-10-16 · branche `impl/le-total-suit-la-selection-05` · HEAD `885b0e2`

## Objectif
Faire aboutir le run du ticket 05 (`wf_29fb859f-7e2`), arrêté en `blocked-red` sans PR.

## Contexte à charger
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/tickets/05-le-total-suit-la-selection.md` — le ticket, dont son « Préalable »
à lire      `openspec/changes/012-envoi-des-demandes-de-devis/` — le change (proposal, design D4, delta `site-public`)

## Acquis
- Le workflow avait posé la branche, écrit les trois tests du ticket (vus rouges), puis
  l'implémentation (`total.ts`, `module.ts`, `Formulaire.astro`, `public/_headers`). Ce travail était
  resté non commité dans l'arbre, tests neufs indexés ; les tests du ticket passaient.
- Les deux seuls rouges venaient de `tests/static/pages-publiques-statique.test.ts` (ticket 04 du
  change 011), que le préalable `b53f510` n'avait pas retouché : SC-04f et SC-04d interdisaient tout
  `<script>` sur `/contact`, qui pose désormais le formulaire et son module. Sortie, non tronquée :

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/static/pages-publiques-statique.test.ts > pages publiques bâties > SC-04f — le lien de vidéo paraît comme « Voir la vidéo » vers la vidéo, sans rien charger de l’hébergeur
AssertionError: expected '<!DOCTYPE html><html lang="fr"><head>…' not to match /<(iframe|script|embed|object|video)\b/i
- Expected:
/<(iframe|script|embed|object|video)\b/i
+ Received:
"<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Contact</title><link rel=\"stylesheet\" href=\"/_astro/site.DX_-667i.css\"></head><body><header><nav aria-label=\"Pages du site\"><details><summary>Menu</summary><ul><li><a href=\"/\">Accueil</a></li><li><a href=\"/tarifs\">Tarifs</a></li><li><a href=\"/contact\" aria-current=\"page\">Contact</a></li></ul></details></nav></header><main><h1>Contact</h1><div class=\"texte-riche\"><p>Pour toute demande, écrivez-nous ou appelez l&#39;atelier : nous répondons sous 48 heures.</p></div><p class=\"lien-video\"><a href=\"https://vimeo.com/76979871\" rel=\"noopener noreferrer\">Voir la vidéo</a></p><img src=\"/_astro/media-fixture-equipe.B7UDFyG5.png\" width=\"960\" height=\"640\" alt=\"Photo de l'équipe du site de démonstration\" loading=\"lazy\" decoding=\"async\"><section class=\"formulaire\"><h2>Devis gâteau</h2><form novalidate data-formulaire=\"devis-gateau\" data-page=\"contact\" data-mode=\"actif\"><fieldset class=\"champ\" data-champ=\"parfum\" data-nature=\"choix-unique\" data-obligatoire=\"oui\"><legend>Parfum<span class=\"obligatoire\"> obligatoire</span></legend><label class=\"option\"><input type=\"radio\" name=\"formulaire-devis-parfum\" value=\"vanille\" data-prix=\"800\"><span>Vanille</span><span class=\"prix\"> — 8 €</span></label><label class=\"option\"><input type=\"radio\" name=\"formulaire-devis-parfum\" value=\"chocolat\" data-prix=\"900\"><span>Chocolat</span><span class=\"prix\"> — 9 €</span></label><label class=\"option\"><input type=\"radio\" name=\"formulaire-devis-parfum\" value=\"fraise\" data-prix=\"1000\"><span>Fraise</span><span class=\"prix\"> — 10 €</span></label></fieldset><fieldset class=\"champ\" data-champ=\"nombre-de-parts\" data-nature=\"choix-unique\" data-obligatoire=\"non\"><legend>Nombre de parts</legend><label class=\"option\"><input type=\"radio\" name=\"formulaire-devis-nombre-de-parts\" value=\"six-parts\" data-prix=\"1800\"><span>6 parts</span><span class=\"prix\"> — 18 €</span></label><label class=\"option\"><input type=\"radio\" name=\"formulaire-devis-nombre-de-parts\" value=\"dix-parts\" data-prix=\"3000\"><span>10 parts</span><span class=\"prix\"> — 30 €</span></label><label class=\"option\"><input type=\"radio\" name=\"formulaire-devis-nombre-de-parts\" value=\"vingt-parts\" data-prix=\"5500\"><span>20 parts</span><span class=\"prix\"> — 55 €</span></label></fieldset><fieldset class=\"champ\" data-champ=\"occasion\" data-nature=\"choix-multiple\" data-obligatoire=\"non\"><legend>Occasion</legend><label class=\"option\"><input type=\"checkbox\" name=\"formulaire-devis-occasion\" value=\"anniversaire\"><span>Anniversaire</span></label><label class=\"option\"><input type=\"checkbox\" name=\"formulaire-devis-occasion\" value=\"mariage\"><span>Mariage</span></label><label class=\"option\"><input type=\"checkbox\" name=\"formulaire-devis-occasion\" value=\"bapteme\"><span>Baptême &amp; communion</span></label></fieldset><div class=\"champ\" data-champ=\"nom\" data-nature=\"texte\" data-obligatoire=\"non\"><label for=\"formulaire-devis-nom\">Votre nom</label><input id=\"formulaire-devis-nom\" name=\"formulaire-devis-nom\" type=\"text\"></div><div class=\"champ\" data-champ=\"courriel\" data-nature=\"email\" data-obligatoire=\"oui\"><label for=\"formulaire-devis-courriel\">Votre adresse e-mail<span class=\"obligatoire\"> obligatoire</span></label><input id=\"formulaire-devis-courriel\" name=\"formulaire-devis-courriel\" type=\"email\"></div><div class=\"champ\" data-champ=\"telephone\" data-nature=\"telephone\" data-obligatoire=\"non\"><label for=\"formulaire-devis-telephone\">Votre numéro de téléphone</label><input id=\"formulaire-devis-telephone\" name=\"formulaire-devis-telephone\" type=\"tel\"></div><div class=\"champ\" data-champ=\"message\" data-nature=\"texte-long\" data-obligatoire=\"non\"><label for=\"formulaire-devis-message\">Votre message</label><textarea id=\"formulaire-devis-message\" name=\"formulaire-devis-message\" rows=\"5\"></textarea></div><p class=\"total\" hidden>Total estimé : <output data-total>0 €</output></p><p class=\"estimation\">Estimation indicative, non engageante.</p><div class=\"mention\"><div class=\"texte-riche\"><p>Les informations saisies dans le formulaire servent uniquement à répondre à votre demande. Elles ne sont ni revendues ni transmises à des tiers.</p></div></div><p class=\"etat\" data-etat=\"envoi\" hidden>Envoi en cours…</p><p class=\"etat\" data-etat=\"confirmation\" hidden>Merci, votre demande a été envoyée.</p><p class=\"etat\" data-etat=\"echec\" hidden>Votre demande n&#39;a pas pu être envoyée. Votre saisie est conservée : réessayez dans quelques instants.</p><p class=\"etat\" data-etat=\"limite\" hidden>Plusieurs demandes ont déjà été envoyées depuis votre connexion. Votre saisie est conservée : réessayez dans une heure.</p><p class=\"etat\" data-etat=\"modifie\" hidden>Ce formulaire vient d&#39;être mis à jour. Rechargez la page pour voir les prix à jour, puis refaites votre demande.</p><button type=\"submit\" disabled>Envoyer ma demande</button><noscript><p class=\"etat\">Le total et l&#39;envoi de ce formulaire ont besoin de JavaScript, désactivé dans votre navigateur. Vous pouvez nous écrire avec les coordonnées en bas de page.</p></noscript></form></section><script type=\"module\" src=\"/_astro/Formulaire.astro_astro_type_script_index_0_lang.CZiV7BW_.js\"></script></main><footer class=\"pied\"><ul class=\"coordonnees\"><li><span class=\"nom\">Téléphone de l&#39;atelier : </span><a href=\"tel:0123456789\">01 23 45 67 89</a></li><li><a href=\"mailto:atelier@example.org\">atelier@example.org</a></li><li><span class=\"nom\">Adresse : </span>12 rue des Tilleuls, 75000 Paris</li></ul><ul class=\"reseaux\"><li><a href=\"https://www.instagram.com/atelier-exemple\" rel=\"noopener noreferrer\">Instagram</a></li><li><a href=\"https://www.facebook.com/atelier-exemple\" rel=\"noopener noreferrer\">Facebook</a></li><li><a href=\"https://www.pinterest.com/atelier-exemple\" rel=\"noopener noreferrer\">Pinterest</a></li></ul></footer></body></html>"
 ❯ tests/static/pages-publiques-statique.test.ts:131:23
    129|
    130|     expect(corps).toContain('<a href="https://vimeo.com/76979871" rel=…
    131|     expect(corps).not.toMatch(/<(iframe|script|embed|object|video)\b/i…
       |                       ^
    132|     expect(corps).not.toMatch(/<link[^>]+href="https?:\/\//i);
    133|   });
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯
 FAIL  tests/static/pages-publiques-statique.test.ts > pages publiques bâties depuis le contenu jetable > SC-04d — titre, libellé de bouton et coordonnée contenant <, >, & ou guillemets s’affichent comme texte
AssertionError: /contact: expected [ { balise: 'script', …(2) } ] to deeply equal []
- Expected
+ Received
- []
+ [
+   {
+     "attributs": [
+       [
+         "type",
+         "module",
+       ],
+       [
+         "src",
+         "/_astro/Formulaire.astro_astro_type_script_index_0_lang.CZiV7BW_.js",
+       ],
+     ],
+     "balise": "script",
+     "texte": "",
+   },
+ ]
 ❯ tests/static/pages-publiques-statique.test.ts:287:52
    285|     for (const { adresse, corps } of pages) {
    286|       const releve = await relever(corps, ['i', 'b', 'script', 'img']);
    287|       expect([...releve.values()].flat(), adresse).toEqual([]);
       |                                                    ^
    288|       expect(corps, adresse).not.toMatch(/<(?:i|b|script|img)[\s>/]/i);
    289|     }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯
 Test Files  1 failed (1)
```

- J'avais préparé une retouche de ces deux tests, non commitée : le module du site (`<script
  type="module" src="/_astro/….js"></script>`, vide) était retiré avant le contrôle, et seulement sur
  une page qui pose un formulaire. Verte avec le code du ticket ; rouge sur quatre pièges (script de
  l'hébergeur, lecteur intégré, script écrit dans la page, module sur une page sans formulaire).

## Prochaine étape
Avec l'accord de l'humain sur la retouche et sur sa voie (PR distincte fusionnée d'abord, comme le
ticket le demande, ou commit séparé sur la branche du ticket, comme pour le ticket 04), reprendre dans
la session qui a lancé le run seulement :

```
Workflow(scriptPath: "/home/negus/projets/colibri-cms/.git/implement-ticket.1460894.js",
         resumeFromRunId: "wf_29fb859f-7e2",
         args: { changeDir: "openspec/changes/012-envoi-des-demandes-de-devis", ticket: "05",
                 oldBase: "impl/la-page-publique-presente-le-formulaire-03", rerun: "2" })
```

Hors de cette session : commiter le travail en vol, puis relancer `/scd-spec-dev:run
012-envoi-des-demandes-de-devis 05`, qui rejoint la branche et repart du début.

## Écarté
- Retirer le module de `/contact` ou l'écrire dans la page : SC-05h exige un module chargé depuis le site.
- Laisser l'implémenteur retoucher ces tests : un test existant lui est interdit, à raison.
- Retirer `script` de la liste interdite de SC-04f : un script de l'hébergeur passerait.
