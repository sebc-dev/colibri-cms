#!/usr/bin/env node
// scd-arch-conformance.mjs — la couche 3 de la dimension architecture : le code est-il conforme au
// modèle LikeC4 ? Recette portée par le plugin scd-spec-dev, copiée par /scd-spec-dev:setup dans
// .claude/scripts/ du projet (propriétaire : le plugin, rafraîchie au re-jeu). Ne pas éditer la copie.
//
// Ce que le script fait
//   1. exporte le modèle (`likec4 export json --skip-layout --project <p> -o <tmp> <dir>` — l'export
//      écrit un fichier, jamais stdout) ;
//   2. dresse la table `sourceDir → FQN` depuis `metadata.sourceDir` des éléments (chaîne ou tableau) ;
//   3. pour chaque fichier modifié rattaché à un élément, extrait ses imports par expression
//      régulière — JS/TS, Python, Go, Dart, Rust — et résout chacun en chemin du dépôt ;
//   4. chaque import dont l'élément cible ≠ l'élément du fichier est une FRONTIÈRE FRANCHIE : elle est
//      conforme s'il existe dans le modèle une relation `from -> to` dans ce sens exact (déclarée sur
//      les éléments eux-mêmes ou sur un de leurs ancêtres) et de kind `sync` ou non typé ; sinon c'est
//      un finding, selon trois règles :
//        - `no-relation`  : aucune relation entre les deux éléments, dans aucun sens ;
//        - `reverse-only` : seule la relation inverse (`to -> from`) existe ;
//        - `async-only`   : la ou les relations `from -> to` sont TOUTES de kind `async` — un import
//                           direct matérialise un appel `sync`, un `async` ne laisse jamais de trace
//                           d'import (skill architecture, references/modele.md). Une relation sans
//                           `kind` reste conforme : non typée, on ne sait pas.
//
// `sourceDir` est la SEULE clé code ↔ modèle : un fichier est rattaché à l'élément dont un `sourceDir`
// est le préfixe le plus long de son chemin. Un élément sans `sourceDir` n'est jamais confronté au
// code ; un fichier — ou un import résolu — qu'aucun `sourceDir` ne couvre va dans `unmapped[]`,
// jamais en finding. Un import entre un élément et l'un de ses descendants est interne, pas une
// frontière.
//
// Quatre limites déclarées — le script est AVEUGLE à :
//   - les alias de chemins (tsconfig `paths`, `@/…`, `#…`, webpack/vite `resolve.alias`) : seuls les
//     spécificateurs relatifs (`./`, `../`) sont résolus ; un spécificateur nu est un paquet, ignoré ;
//   - les barrels et ré-exports (`index.ts` qui ré-exporte un autre élément) : l'import est rattaché au
//     fichier barrel, pas à ce qu'il ré-exporte ;
//   - les imports dynamiques calculés (`import(variable)`, `require(path.join(…))`) : seul un
//     spécificateur littéral est vu ;
//   - les cycles transitifs (a -> b -> c -> a) : chaque import est jugé seul, contre une relation
//     directe.
// Ce qu'il ne voit pas relève de l'architecture-reviewer (contexte frais) et de la table des
// invariants de docs/architecture.md.
//
// Usage
//   node scd-arch-conformance.mjs [--model <dir>] [--project <nom>] (<fichier>… | --base <ref>)
//     --model    répertoire du projet LikeC4 (défaut : docs/architecture)
//     --project  nom du projet LikeC4 ; à défaut, `name` de <model>/likec4.config.json
//     --base     à défaut de fichiers positionnels : `git diff --name-only <ref>...HEAD`, plus les
//                modifications non commitées et les fichiers non suivis
//   Sortie : TOUJOURS du JSON sur stdout —
//     { findings: [{file, line, from, to, rule, specifier, resolved}],
//       unmapped: [{kind: 'file'|'import', file, line?, specifier?, resolved?, reason}],
//       summary:  {files, imports, crossings} }
//   Code de sortie : 1 si findings non vide, 0 sinon, 2 sur erreur d'usage ou d'export (stderr).
//
// Node ≥ 20, ESM, aucune dépendance npm.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const USAGE =
  'usage : node scd-arch-conformance.mjs [--model <dir>] [--project <nom>] (<fichier>… | --base <ref>)';

// ---------------------------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { model: 'docs/architecture', project: null, base: null, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      process.stdout.write(USAGE + '\n');
      process.exit(0);
    }
    if (a === '--model' || a === '--project' || a === '--base') {
      const v = argv[++i];
      if (v === undefined) fail(`option ${a} sans valeur\n${USAGE}`);
      opts[a.slice(2)] = v;
    } else if (a.startsWith('--')) {
      fail(`option inconnue : ${a}\n${USAGE}`);
    } else {
      opts.files.push(a);
    }
  }
  return opts;
}

function fail(message) {
  process.stderr.write(`scd-arch-conformance : ${message}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------------------------------------
// Chemins — tout est posix, relatif à la racine (le cwd)
// ---------------------------------------------------------------------------------------------

const ROOT = process.cwd();

function toRel(p) {
  const rel = path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join('/');
  return rel;
}

function normDir(d) {
  return String(d).replace(/^\.\//, '').replace(/\/+$/, '');
}

function isInsideRoot(rel) {
  return rel !== '' && !rel.startsWith('../') && rel !== '..' && !path.isAbsolute(rel);
}

function isFile(rel) {
  try {
    return statSync(path.join(ROOT, rel)).isFile();
  } catch {
    return false;
  }
}

function isDir(rel) {
  try {
    return statSync(path.join(ROOT, rel)).isDirectory();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Le modèle
// ---------------------------------------------------------------------------------------------

function readProjectName(modelDir) {
  const cfg = path.join(ROOT, modelDir, 'likec4.config.json');
  if (!existsSync(cfg)) return null;
  try {
    const name = JSON.parse(readFileSync(cfg, 'utf8')).name;
    return typeof name === 'string' && name ? name : null;
  } catch {
    return null;
  }
}

function exportModel(modelDir, project) {
  if (!isDir(modelDir)) fail(`répertoire du modèle introuvable : ${modelDir}`);
  const tmp = mkdtempSync(path.join(tmpdir(), 'scd-arch-'));
  const out = path.join(tmp, 'model.json');
  try {
    execFileSync(
      'likec4',
      ['export', 'json', '--skip-layout', '--project', project, '-o', out, modelDir],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' },
    );
  } catch (err) {
    fail(`likec4 export json a échoué (projet « ${project} », répertoire ${modelDir})\n${errorLines(err)}`);
  }
  let json;
  try {
    json = JSON.parse(readFileSync(out, 'utf8'));
  } catch (err) {
    fail(`export illisible : ${err.message}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  // Sans --project, l'export peut être un tableau ; on le passe toujours, mais on se protège.
  if (Array.isArray(json)) {
    const hit = json.find((m) => m && (m.projectId === project || m.project?.id === project));
    if (!hit) fail(`l'export est un tableau et aucun projet ne s'appelle « ${project} »`);
    json = hit;
  }
  if (!json || typeof json.elements !== 'object') fail("export sans clé `elements`");
  return json;
}

// likec4 recopie son aide entière sur stderr après une erreur : ne garder que les lignes d'erreur.
function errorLines(err) {
  const raw = `${err.stderr || ''}\n${err.stdout || ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const errs = lines.filter((l) => /\b(error|erreur)\b/i.test(l) && !l.startsWith('at '));
  return (errs.length ? errs : lines.slice(-3)).slice(0, 5).join('\n') || err.message;
}

function buildIndex(model) {
  const dirs = []; // { dir, fqn }
  for (const [fqn, el] of Object.entries(model.elements)) {
    const sd = el?.metadata?.sourceDir;
    if (sd === undefined || sd === null) continue;
    for (const d of Array.isArray(sd) ? sd : [sd]) {
      const dir = normDir(d);
      if (dir) dirs.push({ dir, fqn });
    }
  }
  // Le plus long d'abord : le premier préfixe qui matche est le plus spécifique.
  dirs.sort((a, b) => b.dir.length - a.dir.length);

  const forward = new Map(); // "from|to" → [kind | null, …]
  for (const rel of Object.values(model.relations ?? {})) {
    const s = rel?.source?.model ?? rel?.source;
    const t = rel?.target?.model ?? rel?.target;
    if (typeof s !== 'string' || typeof t !== 'string') continue;
    const key = `${s}|${t}`;
    if (!forward.has(key)) forward.set(key, []);
    forward.get(key).push(typeof rel.kind === 'string' ? rel.kind : null);
  }
  return { dirs, forward };
}

function elementOf(index, rel) {
  for (const { dir, fqn } of index.dirs) {
    if (rel === dir || rel.startsWith(dir + '/')) return fqn;
  }
  return null;
}

function ancestorsAndSelf(fqn) {
  const parts = fqn.split('.');
  const out = [];
  for (let i = parts.length; i >= 1; i--) out.push(parts.slice(0, i).join('.'));
  return out;
}

function isAncestorOrSelf(a, b) {
  return a === b || b.startsWith(a + '.');
}

// Une relation déclarée sur un ancêtre couvre ses descendants (ui -> api couvre ui.pages -> api.auth),
// pourvu que l'ancêtre retenu ne soit pas commun aux deux bouts. Rend les kinds de toutes les
// relations from -> to trouvées (null = non typée) ; tableau vide = aucune relation.
function relationKinds(index, from, to) {
  const kinds = [];
  for (const s of ancestorsAndSelf(from)) {
    if (isAncestorOrSelf(s, to)) break;
    for (const t of ancestorsAndSelf(to)) {
      if (isAncestorOrSelf(t, from)) break;
      kinds.push(...(index.forward.get(`${s}|${t}`) ?? []));
    }
  }
  return kinds;
}

// null si la frontière est couverte, sinon la règle du finding.
function ruleFor(index, from, to) {
  const kinds = relationKinds(index, from, to);
  if (kinds.length > 0) return kinds.every((k) => k === 'async') ? 'async-only' : null;
  return relationKinds(index, to, from).length > 0 ? 'reverse-only' : 'no-relation';
}

// ---------------------------------------------------------------------------------------------
// Les fichiers modifiés
// ---------------------------------------------------------------------------------------------

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    fail(`git ${args.join(' ')} a échoué : ${(err.stderr || err.message).toString().trim()}`);
  }
}

function changedFiles(base) {
  const lines = [
    ...git(['diff', '--name-only', `${base}...HEAD`]).split('\n'),
    ...git(['diff', '--name-only', 'HEAD']).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ];
  return [...new Set(lines.map((l) => l.trim()).filter(Boolean))];
}

// ---------------------------------------------------------------------------------------------
// Extraction des imports — par famille, sur le contenu débarrassé des commentaires
// ---------------------------------------------------------------------------------------------

const JS_EXT = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro'];

function familyOf(rel) {
  const ext = path.extname(rel).toLowerCase();
  if (JS_EXT.includes(ext)) return 'js';
  if (ext === '.py') return 'py';
  if (ext === '.go') return 'go';
  if (ext === '.dart') return 'dart';
  if (ext === '.rs') return 'rs';
  return null;
}

// Retire les commentaires en préservant les retours à la ligne (les numéros de ligne tiennent).
function stripComments(src, family) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  if (family === 'py') s = s.replace(/^[ \t]*#.*$/gm, '');
  else s = s.replace(/^[ \t]*\/\/.*$/gm, '');
  return s;
}

function lineAt(src, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

function matchAll(src, re, group = 1) {
  const out = [];
  for (const m of src.matchAll(re)) out.push({ spec: m[group], line: lineAt(src, m.index) });
  return out;
}

// Chaque extracteur rend [{ spec, line, resolved }] où resolved est un chemin relatif à la racine,
// ou null si le spécificateur n'est pas local (paquet, alias, stdlib).

function extractJs(rel, src) {
  const specs = [
    ...matchAll(src, /\bimport\s+(?:type\s+)?(?:[\w$*{}\s,]+?\s+from\s+)?['"]([^'"\n]+)['"]/g),
    ...matchAll(src, /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s+['"]([^'"\n]+)['"]/g),
    ...matchAll(src, /\brequire\(\s*['"]([^'"\n]+)['"]\s*\)/g),
    ...matchAll(src, /\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g),
  ];
  const dir = path.posix.dirname(rel);
  return specs.map(({ spec, line }) => {
    if (!spec.startsWith('./') && !spec.startsWith('../')) return { spec, line, resolved: null };
    const target = path.posix.normalize(path.posix.join(dir, spec));
    return { spec, line, resolved: resolveJsPath(target) };
  });
}

function resolveJsPath(target) {
  if (isFile(target)) return target;
  const candidates = [];
  const ext = path.posix.extname(target);
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
    // TS écrit en ESM importe `./x.js` pour `./x.ts`
    const stem = target.slice(0, -ext.length);
    candidates.push(stem + '.ts', stem + '.tsx', stem + '.mts', stem + '.cts', stem + '.d.ts');
  }
  for (const e of JS_EXT) candidates.push(target + e);
  candidates.push(target + '.d.ts');
  for (const e of JS_EXT) candidates.push(path.posix.join(target, 'index' + e));
  for (const c of candidates) if (isFile(c)) return c;
  return target; // introuvable : le chemin normalisé garde son sens pour le préfixe sourceDir
}

function extractPy(rel, src) {
  const out = [];
  const dir = path.posix.dirname(rel);
  for (const m of src.matchAll(/^[ \t]*import[ \t]+([\w.]+(?:[ \t]*,[ \t]*[\w.]+)*)/gm)) {
    const line = lineAt(src, m.index);
    for (const mod of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
      out.push({ spec: mod, line, resolved: resolvePyModule(mod, null) });
    }
  }
  for (const m of src.matchAll(/^[ \t]*from[ \t]+(\.*[\w.]*)[ \t]+import\b/gm)) {
    const line = lineAt(src, m.index);
    out.push({ spec: m[1], line, resolved: resolvePyModule(m[1], dir) });
  }
  return out;
}

function resolvePyModule(mod, fileDir) {
  const dots = mod.match(/^\.*/)[0].length;
  const rest = mod.slice(dots);
  const parts = rest ? rest.split('.') : [];
  let bases;
  if (dots > 0) {
    if (fileDir === null) return null;
    let d = fileDir;
    for (let i = 1; i < dots; i++) d = path.posix.dirname(d);
    bases = [d];
  } else {
    bases = ['', 'src'];
  }
  for (const b of bases) {
    const p = path.posix.normalize(path.posix.join(b, ...parts));
    if (isFile(p + '.py')) return p + '.py';
    if (isFile(path.posix.join(p, '__init__.py'))) return path.posix.join(p, '__init__.py');
    if (parts.length === 0 && dots > 0 && isDir(p)) return path.posix.join(p, '__init__.py');
  }
  return null; // stdlib ou paquet
}

let goModule; // mémoïsé
function goModulePath() {
  if (goModule !== undefined) return goModule;
  goModule = null;
  if (isFile('go.mod')) {
    const m = readFileSync(path.join(ROOT, 'go.mod'), 'utf8').match(/^module\s+(\S+)/m);
    if (m) goModule = m[1];
  }
  return goModule;
}

function extractGo(rel, src) {
  const out = [];
  const push = (spec, idx) => out.push({ spec, line: lineAt(src, idx), resolved: resolveGoImport(spec) });
  for (const m of src.matchAll(/^[ \t]*import[ \t]+(?:[\w.]+[ \t]+)?"([^"\n]+)"/gm)) push(m[1], m.index);
  for (const block of src.matchAll(/^[ \t]*import[ \t]*\(([\s\S]*?)^\)/gm)) {
    const inner = block[1];
    const offset = block.index + block[0].indexOf(inner);
    for (const m of inner.matchAll(/^[ \t]*(?:[\w.]+[ \t]+)?"([^"\n]+)"/gm)) push(m[1], offset + m.index);
  }
  return out;
}

function resolveGoImport(spec) {
  const mod = goModulePath();
  if (mod && (spec === mod || spec.startsWith(mod + '/'))) {
    const p = spec === mod ? '.' : spec.slice(mod.length + 1);
    return p === '.' ? null : p;
  }
  // Repli par suffixe : le plus long suffixe du chemin d'import qui est un répertoire du dépôt.
  const segs = spec.split('/');
  for (let i = 1; i < segs.length; i++) {
    const p = segs.slice(i).join('/');
    if (isDir(p)) return p;
  }
  return null;
}

let dartPkg;
function dartPackageName() {
  if (dartPkg !== undefined) return dartPkg;
  dartPkg = null;
  if (isFile('pubspec.yaml')) {
    const m = readFileSync(path.join(ROOT, 'pubspec.yaml'), 'utf8').match(/^name:\s*([\w-]+)/m);
    if (m) dartPkg = m[1];
  }
  return dartPkg;
}

function extractDart(rel, src) {
  const dir = path.posix.dirname(rel);
  return matchAll(src, /^[ \t]*(?:import|export|part)[ \t]+['"]([^'"\n]+)['"]/gm).map(({ spec, line }) => {
    if (spec.startsWith('package:')) {
      const rest = spec.slice('package:'.length);
      const slash = rest.indexOf('/');
      if (slash < 0) return { spec, line, resolved: null };
      const pkg = rest.slice(0, slash);
      const own = dartPackageName();
      if (own && pkg !== own) return { spec, line, resolved: null };
      const p = path.posix.join('lib', rest.slice(slash + 1));
      return { spec, line, resolved: own || isFile(p) ? p : null };
    }
    if (spec.startsWith('dart:')) return { spec, line, resolved: null };
    return { spec, line, resolved: path.posix.normalize(path.posix.join(dir, spec)) };
  });
}

function extractRs(rel, src) {
  return matchAll(src, /^[ \t]*(?:pub(?:\([^)]*\))?[ \t]+)?use[ \t]+crate::([\w:]+)/gm).map(({ spec, line }) => ({
    spec: 'crate::' + spec,
    line,
    resolved: resolveRustPath(spec.split('::').filter(Boolean)),
  }));
}

function resolveRustPath(segs) {
  // Le plus long préfixe de segments qui désigne un fichier : src/a/b.rs ou src/a/b/mod.rs.
  for (let i = segs.length; i >= 1; i--) {
    const p = path.posix.join('src', ...segs.slice(0, i));
    if (isFile(p + '.rs')) return p + '.rs';
    if (isFile(path.posix.join(p, 'mod.rs'))) return path.posix.join(p, 'mod.rs');
  }
  return null; // déclaré dans lib.rs/main.rs : même élément que la racine du crate, pas de frontière visible
}

const EXTRACTORS = { js: extractJs, py: extractPy, go: extractGo, dart: extractDart, rs: extractRs };

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const modelDir = normDir(toRel(opts.model));
  const project = opts.project ?? readProjectName(modelDir);
  if (!project) {
    fail(`--project manquant et aucun \`name\` lisible dans ${modelDir}/likec4.config.json\n${USAGE}`);
  }

  let files;
  if (opts.files.length > 0) files = opts.files.map(toRel);
  else if (opts.base) files = changedFiles(opts.base);
  else fail(`aucun fichier : passe des chemins en argument ou --base <ref>\n${USAGE}`);
  files = [...new Set(files)];

  const model = exportModel(modelDir, project);
  const index = buildIndex(model);

  const findings = [];
  const unmapped = [];
  let imports = 0;
  let crossings = 0;

  for (const file of files) {
    if (!isInsideRoot(file)) {
      unmapped.push({ kind: 'file', file, reason: 'hors de la racine du dépôt' });
      continue;
    }
    if (!isFile(file)) {
      unmapped.push({ kind: 'file', file, reason: 'absent du disque (supprimé ou renommé)' });
      continue;
    }
    const from = elementOf(index, file);
    if (!from) {
      unmapped.push({ kind: 'file', file, reason: "aucun sourceDir ne couvre ce chemin" });
      continue;
    }
    const family = familyOf(file);
    if (!family) continue; // rattaché, mais pas une famille d'imports connue : rien à confronter

    const src = stripComments(readFileSync(path.join(ROOT, file), 'utf8'), family);
    for (const { spec, line, resolved } of EXTRACTORS[family](file, src)) {
      if (resolved === null) continue; // paquet, alias, stdlib — ignoré (limite déclarée)
      imports++;
      if (!isInsideRoot(resolved)) {
        unmapped.push({ kind: 'import', file, line, specifier: spec, resolved, reason: 'résolu hors du dépôt' });
        continue;
      }
      const to = elementOf(index, resolved);
      if (!to) {
        unmapped.push({ kind: 'import', file, line, specifier: spec, resolved, reason: "aucun sourceDir ne couvre la cible" });
        continue;
      }
      if (to === from || isAncestorOrSelf(from, to) || isAncestorOrSelf(to, from)) continue; // interne
      crossings++;
      const rule = ruleFor(index, from, to);
      if (rule === null) continue;
      findings.push({ file, line, from, to, rule, specifier: spec, resolved });
    }
  }

  const result = { findings, unmapped, summary: { files: files.length, imports, crossings } };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(findings.length > 0 ? 1 : 0);
}

main();
