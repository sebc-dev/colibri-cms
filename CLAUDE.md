# ColibriCMS — prototype Rust

## État
- Le projet repart de zéro en Rust sur Cloudflare Workers (plan gratuit).
- Document de base : `docs/prototype-rust/decision.md` (décisions D1–D14, plan du prototype P1–P8).
- Tout le cadrage et les specs du cycle TypeScript sont archivés sous `archives/ts-2.x/` (index :
  `archives/ts-2.x/README.md`) : c'est une **référence**, pas la réalité courante.

## Glossaire du domaine (repris du cycle TypeScript, toujours valable)
- **Éditrice** : la cliente, seule utilisatrice de l'administration, sans notion technique.
- **Intégrateur** : Isometria, qui pose les gabarits et les emplacements, hors administration.
- **Emplacement** : zone éditable posée par l'intégrateur ; l'éditrice la remplit, n'en crée aucune.
- **Brouillon** : état non publié d'une page, d'un réglage ou d'un formulaire.
- **Aperçu** : le brouillon rendu tel qu'il sera publié, jamais atteignable du site public.
- **Publication** : le geste explicite qui met le site public à jour.
- **Demande** : une soumission du formulaire de devis.
- **Adresse autorisée** : l'unique adresse e-mail qui ouvre l'administration et reçoit les demandes.

## Invariants produit non négociables (repris du cycle TypeScript)
- Site public statique : zéro traitement serveur hors l'envoi d'une demande de devis.
- Aucun identifiant appartenant à Isometria dans le code ou la config : chaque secret est un secret
  du compte client.
- Aucun terme de développeur dans un texte visible par l'éditrice.
- Ne jamais souscrire Workers Paid (décision D1).
