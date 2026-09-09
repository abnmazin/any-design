// Remove a template forever: delete the files, prune the home gallery list,
// rebuild dist/, and commit. Run from the repo root:
//   node scripts/remove-template.mjs <templateId>
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const TEMPLATE_DIRS = {
  'wedding': 'wedding',
  'story': 'story',
  'bento': 'bento',
  'debt-ledger': 'debt-ledger',
  'windows-1': 'windows-1',
  'windows-2': 'windows-2',
  'phone-1': 'phone-1',
  'phone-2': 'phone-2'
};

const id = process.argv[2];
if (!id || !TEMPLATE_DIRS[id]) {
  console.error('usage: node scripts/remove-template.mjs <templateId>');
  console.error('known ids: ' + Object.keys(TEMPLATE_DIRS).join(', '));
  process.exit(1);
}

const sourceDir = 'templates/' + TEMPLATE_DIRS[id];
if (!existsSync(sourceDir)) {
  console.error('template directory not found: ' + sourceDir);
  process.exit(1);
}

rmSync(sourceDir, { recursive: true, force: true });
console.log('removed ' + sourceDir);
execSync('git add -A ' + sourceDir, { stdio: 'inherit' });

const distDir = 'dist/' + TEMPLATE_DIRS[id];
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
  execSync('git add -A ' + distDir, { stdio: 'inherit' });
  console.log('removed ' + distDir);
}

const homePath = 'app/home.html';
const homeSource = readFileSync(homePath, 'utf8');
const lineRe = new RegExp('^[ \t]*\\{[ \t]*id: \'' + id + '\'[ \\t]*,[^\\n]*\\}\\s*\\n', 'm');
const pruned = homeSource.replace(lineRe, '');
if (pruned === homeSource) {
  console.error('no gallery entry found for ' + id + ' in ' + homePath);
  process.exit(1);
}
writeFileSync(homePath, pruned);
console.log('pruned gallery entry for ' + id);

execSync('npm run build', { stdio: 'inherit' });

execSync('git add -u app/home.html dist app/index.html index.html', { stdio: 'inherit' });
execSync('git commit -m "fix(ui): remove template ' + id + '"', { stdio: 'inherit' });
console.log('template "' + id + '" removed and committed');