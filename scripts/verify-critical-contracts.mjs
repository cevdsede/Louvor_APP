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
    '20260428161851_tighten_notification_and_repertoire_rls.sql'
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

const assertRecentSecurityMigrationsExist = () => {
  const migrationsDir = join(root, 'supabase', 'migrations');
  const requiredMigrations = {
    '20260428162551_restrict_security_definer_execution.sql': [
      'revoke execute on function public.aprovar_membro(uuid, uuid[], bigint[]) from public, anon',
      'grant execute on function public.aprovar_membro(uuid, uuid[], bigint[]) to authenticated',
      'revoke execute on function public.get_auth_display_names() from public, anon',
      'revoke execute on function public.handle_new_user() from public, anon, authenticated'
    ],
    '20260428162944_fix_function_search_paths.sql': [
      'alter function public.formatar_musica_cantor() set search_path = public, pg_temp',
      'alter function public.get_user_display_names() set search_path = public, auth, pg_temp'
    ],
    '20260428163410_restrict_public_assets_listing.sql': [
      'drop policy if exists "leitura_publica" on storage.objects',
      'drop policy if exists "Public Assets Read" on storage.objects'
    ],
    '20260428164449_add_missing_foreign_key_indexes.sql': [
      'create index if not exists aviso_geral_id_culto_idx',
      'create index if not exists presenca_evento_id_evento_idx',
      'create index if not exists repertorio_id_musicas_idx'
    ],
    '20260428164947_optimize_rls_auth_function_calls.sql': [
      'using ((select auth.role()) =',
      'where membros.id = (select auth.uid())'
    ],
    '20260428165222_drop_duplicate_event_and_attendance_policies.sql': [
      'drop policy if exists "Users can view eventos"',
      'drop policy if exists "Users can insert presencas"'
    ],
    '20260428165440_split_manage_policies_from_select.sql': [
      'drop policy if exists avisos_manage',
      'create policy avisos_manage_insert',
      'create policy repertorio_manage_update',
      'create policy solicitacoes_manage_delete'
    ]
  };

  for (const [migrationFile, snippets] of Object.entries(requiredMigrations)) {
    const migrationPath = join(migrationsDir, migrationFile);

    if (!existsSync(migrationPath) || !statSync(migrationPath).isFile()) {
      failures.push(`Migration de seguranca/performance nao encontrada: ${migrationFile}`);
      continue;
    }

    const migration = readFileSync(migrationPath, 'utf8');

    for (const snippet of snippets) {
      if (!migration.includes(snippet)) {
        failures.push(`${relative(root, migrationPath)} nao contem contrato esperado: ${snippet}`);
      }
    }
  }
};

const assertNoPermissiveRlsAfterCorrection = () => {
  const migrationsDir = join(root, 'supabase', 'migrations');
  const correctionMigration = '20260428161851_tighten_notification_and_repertoire_rls.sql';
  const sensitiveTables = ['aviso_geral', 'avisos_cultos', 'repertorio'];
  const migrations = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const correctionIndex = migrations.indexOf(correctionMigration);

  if (correctionIndex === -1) {
    failures.push(`Migration corretiva nao encontrada na ordem esperada: ${correctionMigration}`);
    return;
  }

  const laterMigrations = migrations.slice(correctionIndex + 1);
  const permissivePatterns = [
    /auth\.role\(\)\s*=\s*'authenticated'/i,
    /auth\.role\(\)\s*=\s*"authenticated"/i,
    /to\s+authenticated\s+with\s+check\s*\(\s*true\s*\)/i,
    /authenticated_users_policy/i,
    /authenticated_(insert|update|delete|users)/i,
    /usuarios autenticados podem/i,
    /usuários autenticados podem/i
  ];

  for (const migrationFile of laterMigrations) {
    const migrationPath = join(migrationsDir, migrationFile);
    const migration = readFileSync(migrationPath, 'utf8');
    const lowerMigration = migration.toLowerCase();
    const touchesSensitiveTable = sensitiveTables.some((table) => lowerMigration.includes(`on public.${table}`));
    const hasPermissivePattern = permissivePatterns.some((pattern) => pattern.test(migration));

    if (touchesSensitiveTable && hasPermissivePattern) {
      failures.push(
        `${relative(root, migrationPath)} cria politica RLS ampla em tabela sensivel depois da migration corretiva.`
      );
    }
  }
};

const assertViewRoutingContracts = () => {
  const typesPath = join(root, 'types.ts');
  const appPath = join(root, 'App.tsx');
  const viewsPath = join(root, 'utils', 'views.ts');
  const types = readFileSync(typesPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const views = readFileSync(viewsPath, 'utf8');
  const viewTypeMatch = types.match(/export type ViewType =([\s\S]*?);/);

  if (!viewTypeMatch) {
    failures.push('ViewType nao encontrado em types.ts');
    return;
  }

  const viewMatches = [...viewTypeMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const missingViews = viewMatches.filter((view) => !app.includes(`'${view}'`) && !views.includes(`'${view}'`));

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

const assertApprovalRpcContract = () => {
  const sourceFiles = walk(root);

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8');
    const relativePath = relative(root, file);

    if (content.includes('ids_selecionados')) {
      failures.push(`${relativePath} usa parametro antigo ids_selecionados no fluxo de aprovacao.`);
    }
  }

  const approvalsPath = join(root, 'components', 'tools', 'ApprovalsPanel.tsx');

  if (!existsSync(approvalsPath)) {
    failures.push('Painel de aprovacoes nao encontrado.');
    return;
  }

  const approvalsPanel = readFileSync(approvalsPath, 'utf8');
  const requiredSnippets = [
    "supabase.rpc('aprovar_membro'",
    'ministerio_ids: ministerioIds',
    'lista_funcao_ids: funcaoIds'
  ];

  for (const snippet of requiredSnippets) {
    if (!approvalsPanel.includes(snippet)) {
      failures.push(`ApprovalsPanel nao contem contrato esperado do RPC de aprovacao: ${snippet}`);
    }
  }
};

assertNoLegacyOfflineLayer();
assertRlsMigrationExists();
assertNoTemporaryArtifacts();
assertWorkflowRunsCriticalChecks();
assertSupabaseMigrationsAreAllowed();
assertRecentSecurityMigrationsExist();
assertNoPermissiveRlsAfterCorrection();
assertViewRoutingContracts();
assertApprovalRpcContract();

if (failures.length > 0) {
  console.error('Contratos criticos falharam:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Contratos criticos verificados com sucesso.');
