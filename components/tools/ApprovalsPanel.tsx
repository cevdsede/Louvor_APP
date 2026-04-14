import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import MultiSelect from '../equipe/MultiSelect';
import { showError, showSuccess } from '../../utils/toast';
import { SupabaseMinisterio, Funcao } from '../../types-supabase';

interface SolicitacaoPendente {
  id: string;
  nome: string | null;
  email: string;
  status: string;
  created_at: string;
}

const ApprovalsPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPendente[]>([]);
  const [ministerios, setMinisterios] = useState<SupabaseMinisterio[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [selectedMinisterios, setSelectedMinisterios] = useState<Record<string, string[]>>({});
  const [selectedFuncoes, setSelectedFuncoes] = useState<Record<string, string[]>>({});

  const loadData = async () => {
    try {
      setLoading(true);

      const [{ data: solicitacoesData, error: solicitacoesError }, { data: ministeriosData, error: ministeriosError }, { data: funcoesData, error: funcoesError }] = await Promise.all([
        supabase
          .from('solicitacoes_membro')
          .select('id, nome, email, status, created_at')
          .eq('status', 'pendente')
          .order('created_at', { ascending: false }),
        supabase
          .from('ministerios')
          .select('id, nome, slug, ativo, modulos, created_at')
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('funcao')
          .select('id, nome_funcao, ministerio_id, created_at')
          .order('nome_funcao')
      ]);

      if (solicitacoesError) throw solicitacoesError;
      if (ministeriosError) throw ministeriosError;
      if (funcoesError) throw funcoesError;

      const nextMinisterios = ministeriosData || [];
      const nextLouvorMinisterioId = nextMinisterios.find((ministerio) => ministerio.slug?.toLowerCase() === 'louvor')?.id || '';
      const defaultMinisterioIds = nextLouvorMinisterioId
        ? [nextLouvorMinisterioId]
        : nextMinisterios[0]?.id
          ? [nextMinisterios[0].id]
          : [];

      setSolicitacoes(solicitacoesData || []);
      setMinisterios(nextMinisterios);
      setFuncoes((funcoesData || []) as Funcao[]);
      setSelectedMinisterios((prev) => {
        const next = { ...prev };
        (solicitacoesData || []).forEach((solicitacao) => {
          if (!next[solicitacao.id]) {
            next[solicitacao.id] = defaultMinisterioIds;
          }
        });
        return next;
      });
      setSelectedFuncoes((prev) => {
        const next = { ...prev };
        (solicitacoesData || []).forEach((solicitacao) => {
          if (!next[solicitacao.id]) {
            next[solicitacao.id] = [];
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Erro ao carregar aprovacoes:', error);
      showError('Nao foi possivel carregar as solicitacoes pendentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMinisteriosChange = (solicitacaoId: string, ministerioIds: string[]) => {
    setSelectedMinisterios((prev) => ({
      ...prev,
      [solicitacaoId]: ministerioIds
    }));

    setSelectedFuncoes((prev) => {
      const allowedIds = new Set(
        funcoes
          .filter((funcao) => ministerioIds.includes(funcao.ministerio_id || ''))
          .map((funcao) => String(funcao.id))
      );

      return {
        ...prev,
        [solicitacaoId]: (prev[solicitacaoId] || []).filter((funcaoId) => allowedIds.has(funcaoId))
      };
    });
  };

  const handleApprove = async (solicitacao: SolicitacaoPendente) => {
    const ministerioIds = selectedMinisterios[solicitacao.id] || [];
    const funcaoIds = (selectedFuncoes[solicitacao.id] || []).map((id) => Number(id)).filter(Number.isFinite);

    if (ministerioIds.length === 0) {
      showError('Selecione pelo menos um ministerio antes de aprovar.');
      return;
    }

    try {
      setSubmittingId(solicitacao.id);
      const { error } = await supabase.rpc('aprovar_membro', {
        user_id: solicitacao.id,
        ministerio_ids: ministerioIds,
        lista_funcao_ids: funcaoIds
      });

      if (error) throw error;

      showSuccess('Membro aprovado com sucesso.');
      await loadData();
    } catch (error) {
      console.error('Erro ao aprovar membro:', error);
      showError('Nao foi possivel aprovar o membro.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando aprovacoes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Aprovacoes</h2>
            <p className="text-slate-500 text-sm mt-1">Defina os ministerios e as funcoes iniciais de cada pessoa.</p>
          </div>
          <div className="text-sm text-slate-500">
            {solicitacoes.length} solicitacao{solicitacoes.length !== 1 ? 'oes' : ''} pendente{solicitacoes.length !== 1 ? 's' : ''}
          </div>
        </div>

        {solicitacoes.length === 0 ? (
          <div className="text-center py-20">
            <i className="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Nenhuma solicitacao pendente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {solicitacoes.map((solicitacao) => {
              const ministerioIds = selectedMinisterios[solicitacao.id] || [];
              const funcoesDisponiveis = funcoes.filter((funcao) => ministerioIds.includes(funcao.ministerio_id || ''));

              return (
                <div key={solicitacao.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white">{solicitacao.nome || 'Novo membro'}</h3>
                      <p className="text-sm text-slate-500">{solicitacao.email}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Ministerios
                      </label>
                      <MultiSelect
                        options={ministerios.map((ministerio) => ({
                          id: ministerio.id,
                          label: ministerio.nome
                        }))}
                        value={ministerioIds}
                        onChange={(value) => handleMinisteriosChange(solicitacao.id, value)}
                        placeholder="Selecione os ministerios..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Funcoes iniciais
                      </label>
                      <MultiSelect
                        options={funcoesDisponiveis.map((funcao) => ({
                          id: String(funcao.id),
                          label: funcao.nome_funcao
                        }))}
                        value={selectedFuncoes[solicitacao.id] || []}
                        onChange={(value) => setSelectedFuncoes((prev) => ({ ...prev, [solicitacao.id]: value }))}
                        placeholder={ministerioIds.length > 0 ? 'Selecione as funcoes...' : 'Escolha os ministerios primeiro'}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => handleApprove(solicitacao)}
                      disabled={submittingId === solicitacao.id}
                      className="flex-1 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submittingId === solicitacao.id ? 'Aprovando...' : 'Aprovar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalsPanel;
