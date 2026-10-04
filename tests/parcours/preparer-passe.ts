// Prépare la passe de parcours : bâtit le site, remet à neuf la base locale
// dédiée, y applique les migrations et y sème UNE session d'éditrice (aucun
// e-mail, aucun code — la connexion n'est pas l'objet de la passe). Lancé par
// le `webServer` de playwright.config.ts avant `wrangler dev`.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

export const DOSSIER_BASE = '.wrangler/parcours';
export const FICHIER_SESSION = `${DOSSIER_BASE}/session.txt`;

function lancer(commande: string, args: string[]): void {
  execFileSync(commande, args, { stdio: 'inherit' });
}

function preparer(): void {
  lancer('npm', ['run', 'build']);

  rmSync(DOSSIER_BASE, { recursive: true, force: true });
  mkdirSync(DOSSIER_BASE, { recursive: true });

  const wrangler = ['wrangler', 'd1'];
  const base = ['--local', '--persist-to', DOSSIER_BASE];
  lancer('npx', [...wrangler, 'migrations', 'apply', 'DB', ...base]);

  const jeton = randomUUID();
  const maintenant = Date.now();
  lancer('npx', [
    ...wrangler,
    'execute',
    'DB',
    ...base,
    '--command',
    `insert into sessions (id, identifiant_appareil, creee_le) values ('${jeton}', 'parcours', ${String(maintenant)})`,
  ]);
  writeFileSync(FICHIER_SESSION, jeton);
}

preparer();
