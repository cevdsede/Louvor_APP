import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceExtensions = new Set(['.ts', '.tsx']);
const ignoredDirs = new Set(['.git', 'dist', 'node_modules', 'backups', '.vite']);

const failures = [];

const walk = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walk(fullPath));
      }
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(fullPath.slice(fullPath.lastIndexOf('.')))) {
      files.push(fullPath);
    }
  }

  return files;
};

const assertNoLegacyOfflineLayer = () => {
  const forbiddenPatterns = [
    'SyncService',
    'OfflineService',
    'CacheInitializer',
    'useCacheSync'
  ];

  for (const file of walk(root)) {
    const content = readFileSync(file, 'utf8');
    const relativePath = relative(root, file);

    for (const pattern of forbiddenPatterns) {
      if (content.includes(pattern)) {
        failures.push(`${relativePath} ainda referencia ${pattern}`);
      }
    }
  }
};

const assertRlsMigrationExists = () => {
  const migrationPath = join(
    root,
    'supabase',
    'migrations',
    '202604280001_tighten_notification_and_repertoire_rls.sql'
  );

  if (!existsSync(migrationPath) || !statSync(migrationPath).isFile()) {
    failures.push('Migration corretiva de RLS nao encontrada.');
    return;
  }

  const migration = readFileSync(migrationPath, 'utf8');
  const requiredSnippets = [
    'drop policy if exists "avisos_cultos_authenticated_insert"',
    'drop policy if exists "repertorio_authenticated_insert"',
    'create policy "aviso_geral_select_scoped"',
    'create policy "aviso_geral_insert_scoped"',
    'create policy "aviso_geral_update_scoped"',
    'create policy "aviso_geral_delete_scoped"',
    'private.managed_ministerio_ids()'
  ];

  for (const snippet of requiredSnippets) {
    if (!migration.includes(snippet)) {
      failures.push(`Migration corretiva de RLS nao contem: ${snippet}`);
    }
  }
};

assertNoLegacyOfflineLayer();
assertRlsMigrationExists();

if (failures.length > 0) {
  console.error('Contratos criticos falharam:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Contratos criticos verificados com sucesso.');
