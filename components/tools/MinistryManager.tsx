import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { SupabaseMinisterio, SupabaseMembroMinisterio } from '../../types-supabase';
import { showError, showSuccess } from '../../utils/toast';

const MODULE_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { id: 'scales', label: 'Escalas', icon: 'fas fa-calendar-check' },
  { id: 'music', label: 'Musicas', icon: 'fas fa-music' },
  { id: 'team', label: 'Equipe', icon: 'fas fa-users' }
];

const defaultModules = ['dashboard', 'scales', 'team'];

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeModules = (value: SupabaseMinisterio['modulos']) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }

  return defaultModules;
};

const isActiveRow = (row?: { ativo?: boolean | null } | null) => row?.ativo !== false;
const formatModuleLabel = (moduleId: string) => MODULE_OPTIONS.find((module) => module.id === moduleId)?.label || moduleId;

const MinistryManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ministerios, setMinisterios] = useState<SupabaseMinisterio[]>([]);
  const [membrosMinisterios, setMembrosMinisterios] = useState<SupabaseMembroMinisterio[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    slug: '',
    descricao: '',
    ativo: true,
    modulos: defaultModules
  });

  const loadMinisterios = async () => {
    try {
      setLoading(true);

      const [{ data: ministeriosData, error: ministeriosError }, { data: membrosMinisteriosData, error: membrosMinisteriosError }] = await Promise.all([
        supabase
          .from('ministerios')
          .select('id, nome, slug, descricao, ativo, modulos, created_at')
          .order('nome'),
        supabase
          .from('membros_ministerios')
          .select('id, membro_id, ministerio_id, principal, ativo, papel, created_at')
      ]);

      if (ministeriosError) throw ministeriosError;
      if (membrosMinisteriosError) throw membrosMinisteriosError;

      setMinisterios(ministeriosData || []);
      setMembrosMinisterios(membrosMinisteriosData || []);
    } catch (error) {
      console.error('Erro ao carregar ministerios:', error);
      showError('Nao foi possivel carregar os ministerios.');
    } finally {
      setLoading(false);
    }
  };

  const syncCaches = async () => {
    await Promise.allSettled([
      LocalStorageFirstService.forceSync('ministerios'),
      LocalStorageFirstService.forceSync('membros_ministerios')
    ]);
  };

  useEffect(() => {
    loadMinisterios();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setPendingDeleteId(null);
    setFormData({
      nome: '',
      slug: '',
      descricao: '',
      ativo: true,
      modulos: defaultModules
    });
  };

  const previewSlug = slugify(formData.slug || formData.nome);

  const memberCountByMinisterio = useMemo(() => {
    return membrosMinisterios.reduce<Record<string, number>>((accumulator, membership) => {
      if (!isActiveRow(membership)) {
        return accumulator;
      }

      accumulator[membership.ministerio_id] = (accumulator[membership.ministerio_id] || 0) + 1;
      return accumulator;
    }, {});
  }, [membrosMinisterios]);

  const activeMinisterios = ministerios.filter((ministerio) => isActiveRow(ministerio));
  const inactiveMinisterios = ministerios.length - activeMinisterios.length;
  const totalLinks = membrosMinisterios.filter((membership) => isActiveRow(membership)).length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nome = formData.nome.trim();
    const slug = slugify(formData.slug || formData.nome);

    if (!nome || !slug) {
      showError('Informe pelo menos o nome do ministerio.');
      return;
    }

    if (formData.modulos.length === 0) {
      showError('Selecione ao menos um modulo para o ministerio.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        nome,
        slug,
        descricao: formData.descricao.trim() || null,
        ativo: formData.ativo,
        modulos: formData.modulos
      };

      if (editingId) {
        const { error } = await supabase
          .from('ministerios')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        showSuccess('Ministerio atualizado com sucesso.');
      } else {
        const { error } = await supabase
          .from('ministerios')
          .insert(payload);

        if (error) throw error;
        showSuccess('Ministerio criado com sucesso.');
      }

      resetForm();
      await syncCaches();
      await loadMinisterios();
    } catch (error) {
      console.error('Erro ao salvar ministerio:', error);
      showError('Nao foi possivel salvar o ministerio.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ministerio: SupabaseMinisterio) => {
    setEditingId(ministerio.id);
    setPendingDeleteId(null);
    setFormData({
      nome: ministerio.nome,
      slug: ministerio.slug,
      descricao: ministerio.descricao || '',
      ativo: ministerio.ativo !== false,
      modulos: normalizeModules(ministerio.modulos)
    });
  };

  const handleToggleActive = async (ministerio: SupabaseMinisterio) => {
    try {
      const { error } = await supabase
        .from('ministerios')
        .update({ ativo: ministerio.ativo === false })
        .eq('id', ministerio.id);

      if (error) throw error;

      showSuccess(ministerio.ativo === false ? 'Ministerio reativado.' : 'Ministerio arquivado.');
      await syncCaches();
      await loadMinisterios();
    } catch (error) {
      console.error('Erro ao alterar status do ministerio:', error);
      showError('Nao foi possivel alterar o status do ministerio.');
    }
  };

  const handleDelete = async (ministerio: SupabaseMinisterio) => {
    try {
      const { error } = await supabase
        .from('ministerios')
        .delete()
        .eq('id', ministerio.id);

      if (error) throw error;

      if (editingId === ministerio.id) {
        resetForm();
      } else {
        setPendingDeleteId(null);
      }

      showSuccess('Ministerio excluido com sucesso.');
      await syncCaches();
      await loadMinisterios();
    } catch (error) {
      console.error('Erro ao excluir ministerio:', error);
      showError('Nao foi possivel excluir este ministerio. Se ele ja estiver em uso, arquive-o primeiro.');
    }
  };

  const toggleModule = (moduleId: string) => {
    setFormData((previous) => ({
      ...previous,
      modulos: previous.modulos.includes(moduleId)
        ? previous.modulos.filter((item) => item !== moduleId)
        : [...previous.modulos, moduleId]
    }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_380px] gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Ministerios Ativos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{activeMinisterios.length}</p>
            <p className="text-xs text-slate-500 mt-1">Prontos para uso no app.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Arquivados</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{inactiveMinisterios}</p>
            <p className="text-xs text-slate-500 mt-1">Historico mantido sem expor no menu.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Vinculos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{totalLinks}</p>
            <p className="text-xs text-slate-500 mt-1">Relacoes entre membros e ministerios.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Ministerios cadastrados</h3>
              <p className="text-sm text-slate-500 mt-1">Edite nome, modulos, status e remocao com um fluxo mais claro.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                syncCaches().then(loadMinisterios).catch(() => showError('Nao foi possivel atualizar os ministerios.'));
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-widest"
            >
              <i className="fas fa-rotate mr-2"></i>
              Atualizar
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Carregando ministerios...
              </div>
            ) : ministerios.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-6 py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-4">
                  <i className="fas fa-layer-group text-lg"></i>
                </div>
                <h4 className="text-lg font-black text-slate-800 dark:text-white">Nenhum ministerio cadastrado</h4>
                <p className="text-sm text-slate-500 mt-2">Crie o primeiro ministerio no painel ao lado para liberar os modulos certos no app.</p>
              </div>
            ) : (
              ministerios.map((ministerio) => {
                const modules = normalizeModules(ministerio.modulos);
                const memberCount = memberCountByMinisterio[ministerio.id] || 0;
                const isEditing = editingId === ministerio.id;
                const isPendingDelete = pendingDeleteId === ministerio.id;

                return (
                  <div
                    key={ministerio.id}
                    className={`rounded-3xl border p-5 transition-all ${
                      isEditing
                        ? 'border-brand/40 bg-brand/5 dark:bg-brand/10'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-black text-slate-800 dark:text-white">{ministerio.nome}</h4>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            ministerio.ativo === false
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                          }`}>
                            {ministerio.ativo === false ? 'Inativo' : 'Ativo'}
                          </span>
                          {isEditing && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-brand text-white">
                              Editando
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-500 mt-2">
                          /{ministerio.slug}
                          {ministerio.descricao ? ` • ${ministerio.descricao}` : ' • Sem descricao curta'}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-4">
                          {modules.map((moduleId) => (
                            <span
                              key={moduleId}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                            >
                              <i className={`${MODULE_OPTIONS.find((module) => module.id === moduleId)?.icon || 'fas fa-square'} text-[10px] opacity-70`}></i>
                              {formatModuleLabel(moduleId)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(ministerio)}
                          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700"
                        >
                          <i className="fas fa-pen mr-2"></i>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(ministerio)}
                          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-widest"
                        >
                          <i className={`fas ${ministerio.ativo === false ? 'fa-rotate-left' : 'fa-box-archive'} mr-2`}></i>
                          {ministerio.ativo === false ? 'Reativar' : 'Arquivar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId((current) => (current === ministerio.id ? null : ministerio.id))}
                          className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-black uppercase tracking-widest"
                        >
                          <i className="fas fa-trash mr-2"></i>
                          Excluir
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-200/70 dark:border-slate-700/70">
                      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Membros</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{memberCount}</p>
                      </div>
                      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Modulos</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{modules.length}</p>
                      </div>
                      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Criado em</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white">
                          {ministerio.created_at ? new Date(ministerio.created_at).toLocaleDateString('pt-BR') : '--'}
                        </p>
                      </div>
                    </div>

                    {isPendingDelete && (
                      <div className="mt-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <p className="text-sm font-black text-red-700 dark:text-red-300">Confirmar exclusao de {ministerio.nome}?</p>
                            <p className="text-xs text-red-600/80 dark:text-red-300/80 mt-1">
                              {memberCount > 0
                                ? 'Este ministerio possui membros vinculados. Se a exclusao falhar, arquive-o primeiro para preservar o historico.'
                                : 'Use esta opcao apenas quando tiver certeza de que nao precisa mais do ministerio.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-widest border border-red-200 dark:border-red-900/40"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ministerio)}
                              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest"
                            >
                              Confirmar exclusao
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand mb-2">
                {editingId ? 'Edicao ativa' : 'Novo ministerio'}
              </p>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                {editingId ? 'Atualizar ministerio' : 'Cadastrar ministerio'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Defina nome, slug, modulos liberados e se o ministerio deve aparecer para os membros.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest"
              >
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(event) => setFormData((previous) => ({ ...previous, nome: event.target.value }))}
                placeholder="Ex.: Midia, Recepcao, Infantil"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(event) => setFormData((previous) => ({ ...previous, slug: event.target.value }))}
                placeholder="gerado-a-partir-do-nome"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="text-xs text-slate-500 mt-2">Preview: /{previewSlug || 'novo-ministerio'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descricao curta</label>
              <textarea
                value={formData.descricao}
                onChange={(event) => setFormData((previous) => ({ ...previous, descricao: event.target.value }))}
                rows={3}
                placeholder="Resumo para ajudar no gerenciamento interno."
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modulos habilitados</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MODULE_OPTIONS.map((module) => {
                  const active = formData.modulos.includes(module.id);

                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left border transition-colors ${
                        active
                          ? 'bg-brand text-white border-brand'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-white/15' : 'bg-white dark:bg-slate-900'}`}>
                        <i className={`${module.icon} text-sm`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-black">{module.label}</p>
                        <p className={`text-[11px] ${active ? 'text-white/80' : 'text-slate-400'}`}>
                          {active ? 'Liberado neste ministerio' : 'Clique para habilitar'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">Ministerio ativo</p>
                <p className="text-xs text-slate-500 mt-1">Quando desligado, ele sai das opcoes de menu para os membros.</p>
              </div>
              <input
                id="ministerio-ativo"
                type="checkbox"
                checked={formData.ativo}
                onChange={(event) => setFormData((previous) => ({ ...previous, ativo: event.target.checked }))}
                className="rounded border-slate-300"
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-5 py-3 bg-brand text-white rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <i className={`fas ${editingId ? 'fa-save' : 'fa-plus'} mr-2`}></i>
                {saving ? 'Salvando...' : editingId ? 'Atualizar ministerio' : 'Criar ministerio'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MinistryManager;
