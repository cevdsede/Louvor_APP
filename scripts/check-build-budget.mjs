import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const assetsDir = join(root, 'dist', 'assets');
const maxMainBundleBytes = 550 * 1024;
const maxRouteBundleBytes = 130 * 1024;

const failures = [];
const assets = readdirSync(assetsDir).filter((file) => file.endsWith('.js'));

const mainBundle = assets.find((file) => file.startsWith('index-'));

if (!mainBundle) {
  failures.push('Bundle principal index-*.js nao encontrado em dist/assets.');
} else {
  const mainSize = statSync(join(assetsDir, mainBundle)).size;

  if (mainSize > maxMainBundleBytes) {
    failures.push(
      `Bundle principal excedeu ${(maxMainBundleBytes / 1024).toFixed(0)} KiB: ${(mainSize / 1024).toFixed(1)} KiB.`
    );
  }
}

const routeBundlePattern = /^(DashboardView|ListView|CalendarView|CleaningView|TeamView|MusicView|ToolsView)-.*\.js$/;

for (const asset of assets.filter((file) => routeBundlePattern.test(file))) {
  const size = statSync(join(assetsDir, asset)).size;

  if (size > maxRouteBundleBytes) {
    failures.push(
      `Bundle de rota ${asset} excedeu ${(maxRouteBundleBytes / 1024).toFixed(0)} KiB: ${(size / 1024).toFixed(1)} KiB.`
    );
  }
}

if (failures.length > 0) {
  console.error('Orcamento de build falhou:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Orcamento de build verificado com sucesso.');
