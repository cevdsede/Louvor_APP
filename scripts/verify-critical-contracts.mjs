import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const sourceExtensions = new Set(['.ts', '.tsx']);
const scannedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.yml', '.yaml', '.md', '.sql']);
const ignoredDirs = new Set(['.git', 'dist', 'node_modules', 'backups', '.vite', '.temp']);

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

    if (entry.isFile() && sourceExtensions.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
};

const walkAll = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walkAll(fullPath));
      }
      continue;
    }

    if (entry.isFile()) {
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

const assertNoTemporaryArtifacts = () => {
  const forbiddenFilePatterns = [
    /\.codex\.new\./,
    /\.codex\.new$/,
    /\.backup$/,
    /(^|[\\/])tmp-/,
    /(^|[\\/])\.vite([\\/]|$)/,
    /(^|[\\/])supabase[\\/]\.temp([\\/]|$)/
  ];

  for (const file of walkAll(root)) {
    const relativePath = relative(root, file);

    if (forbiddenFilePatterns.some((pattern) => pattern.test(relativePath))) {
      failures.push(`Arquivo temporario nao deve voltar ao repositorio: ${relativePath}`);
    }
  }
};

const assertWorkflowRunsCriticalChecks = () => {
  const workflowPath = join(root, '.github', 'workflows', 'quality.yml');

  if (!existsSync(workflowPath)) {
    failures.push('Workflow de qualidade nao encontrado.');
    return;
  }

  const workflow = readFileSync(workflowPath, 'utf8');
  const requiredCommands = ['npm run typecheck', 'npm run verify', 'npm run build'];

  for (const command of requiredCommands) {
    if (!workflow.includes(command)) {
      failures.push(`Workflow de qualidade nao executa: ${command}`);
    }
  }
};

const assertSupabaseMigrationsAreAllowed = () => {
  const gitignorePath = join(root, '.gitignore');
  const gitignore = readFileSync(gitignorePath, 'utf8');

  if (!gitignore.includes('!supabase/migrations/*.sql')) {
    failures.push('.gitignore deve permitir versionar supabase/migrations/*.sql');
  }

  const migrationsDir = join(root, 'supabase', 'migrations');
  const migrations = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'));

  if (migrations.length === 0) {
    failures.push('Nenhuma migration do Supabase encontrada.');
  }
};

const assertViewRoutingContracts = () => {
  const typesPath = join(root, 'types.ts');
  const appPath = join(root, 'App.tsx');
  const types = readFileSync(typesPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const viewTypeMatch = types.match(/export type ViewType =([\s\S]*?);/);

  if (!viewTypeMatch) {
    failures.push('ViewType nao encontrado em types.ts');
    return;
  }

  const viewMatches = [...viewTypeMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const missingViews = viewMatches.filter((view) => !app.includes(`'${view}'`));

  if (missingViews.length > 0) {
    failures.push(`Views sem contrato de roteamento em App.tsx: ${missingViews.join(', ')}`);
  }

  const requiredLazyViews = [
    'DashboardView',
    'ListView',
    'CalendarView',
    'CleaningView',
    'TeamView',
    'MusicView',
    'ToolsView'
  ];

  for (const view of requiredLazyViews) {
    if (!app.includes(`const ${view} = lazy(`)) {
      failures.push(`${view} deve continuar carregando com React.lazy`);
    }
  }
};

assertNoLegacyOfflineLayer();
assertRlsMigrationExists();
assertNoTemporaryArtifacts();
assertWorkflowRunsCriticalChecks();
assertSupabaseMigrationsAreAllowed();
assertViewRoutingContracts();

if (failures.length > 0) {
  console.error('Contratos criticos falharam:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Contratos criticos verificados com sucesso.');
