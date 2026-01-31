
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Member, ViewType, ScheduleEvent, SongHistoryItem } from '../types';
import AttendanceView from './AttendanceView';

// Componente Multi-select
const MultiSelect: React.FC<{
  options: { id: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}> = ({ options, value, onChange, placeholder = "Selecione as funções..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter(id => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  const removeOption = (optionId: string) => {
    onChange(value.filter(id => id !== optionId));
  };

  return (
    <div className="relative">
      <div 
        className="min-h-[42px] border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 p-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2">
          {value.length === 0 ? (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          ) : (
            value.map(id => {
              const option = options.find(o => o.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-brand text-white rounded-md text-sm"
                >
                  {option?.label}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(id);
                    }}
                    className="hover:bg-brand/80 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </span>
              );
            })
          )}
        </div>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400 text-xs`}></i>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-lg max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Buscar funções..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.map(option => (
              <div
                key={option.id}
                className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 ${
                  value.includes(option.id) ? 'bg-brand/10' : ''
                }`}
                onClick={() => {
                  toggleOption(option.id);
                  setIsOpen(false);
                }}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.id)}
                  onChange={() => {}}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface TeamViewProps {
  currentView: ViewType;
}

const TeamView: React.FC<TeamViewProps> = ({ currentView }) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const genderChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  // Estados para Aprovações
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [funcoes, setFuncoes] = useState<any[]>([]);
  const [loadingAprovacoes, setLoadingAprovacoes] = useState(false);
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState<Record<string, string[]>>({});

  // Mock de eventos para navegação
  const allEvents: ScheduleEvent[] = [];

  // Monitora modais para travar scroll
  useEffect(() => {
    if (selectedMember || viewingEvent) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [selectedMember, viewingEvent]);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
    if (currentView === 'approvals') {
      fetchFuncoes();
      fetchSolicitacoes();
    }
  }, [currentView]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membros')
        .select('*')
        .order('nome');

      if (error) throw error;

      if (data) {
        const mappedMembers: Member[] = await Promise.all(data.map(async (m) => {
          // Buscar próximas escalas do membro
          const upcomingScales = await fetchMemberUpcomingScales(m.id);
          
          // Buscar histórico de músicas do membro
          const songHistory = await fetchMemberSongHistory(m.id);
          
          return {
            id: m.id,
            name: m.nome,
            role: Array.isArray(m.funcoes) ? m.funcoes.join(', ') : (m.funcoes || ''),
            gender: m.genero === 'Homem' ? 'M' : 'F',
            status: m.ativo ? 'confirmed' : 'absent',
            avatar: m.foto || (m.genero === 'Homem'
              ? 'https://img.freepik.com/fotos-gratis/homem-bonito-sorrindo-no-fundo-branco_23-2148213426.jpg' // Default Man
              : 'https://img.freepik.com/fotos-gratis/jovem-mulher-bonita-com-exibicao-natural-de-maquiagem_23-2148810238.jpg'), // Default Woman
            upcomingScales: upcomingScales,
            songHistory: songHistory
          };
        }));
        setMembers(mappedMembers);
      }
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções para Aprovações
  const fetchFuncoes = async () => {
    try {
      const { data, error } = await supabase
        .from('funcao')
        .select('id, nome_funcao')
        .order('nome_funcao');

      if (error) throw error;
      setFuncoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar funções:', error);
    }
  };

  const fetchSolicitacoes = async () => {
    try {
      setLoadingAprovacoes(true);
      const { data, error } = await supabase
        .from('solicitacoes_membro')
        .select(`
          id,
          user_id,
          status,
          created_at,
          membros(id, nome, email, foto, genero)
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSolicitacoes(data || []);
      
      // Inicializar funções selecionadas para cada solicitação
      const inicialFuncoes: Record<string, string[]> = {};
      data?.forEach(solicitacao => {
        inicialFuncoes[solicitacao.id] = [];
      });
      setFuncoesSelecionadas(inicialFuncoes);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
    } finally {
      setLoadingAprovacoes(false);
    }
  };

  const aprovarMembro = async (userId: string, funcoesIds: string[]) => {
    try {
      const { data, error } = await supabase.rpc('aprovar_membro', {
        user_id: userId,
        ids_selecionados: funcoesIds
      });

      if (error) throw error;

      // Atualizar status da solicitação
      await supabase
        .from('solicitacoes_membro')
        .update({ status: 'aprovado' })
        .eq('user_id', userId);

      // Recarregar solicitações
      await fetchSolicitacoes();
      
      // Recarregar membros para incluir o novo membro
      await fetchMembers();
      
      alert('Membro aprovado com sucesso!');
    } catch (error) {
      console.error('Erro ao aprovar membro:', error);
      alert('Erro ao aprovar membro. Tente novamente.');
    }
  };

  const handleFuncoesChange = (solicitacaoId: string, funcoesIds: string[]) => {
    setFuncoesSelecionadas(prev => ({
      ...prev,
      [solicitacaoId]: funcoesIds
    }));
  };

  // Buscar próximas escalas do membro
  const fetchMemberUpcomingScales = async (memberId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Primeiro buscar as escalas do membro
      const { data: escalasData, error: escalasError } = await supabase
        .from('escalas')
        .select(`
          id,
          id_culto,
          id_funcao,
          cultos!inner(
            id,
            data_culto,
            horario,
            nome_cultos(nome_culto)
          ),
          funcao(nome_funcao)
        `)
        .eq('id_membros', memberId)
        .gte('cultos.data_culto', today)
        .limit(5);

      if (escalasError) throw escalasError;

      // Ordenar no cliente
      const sortedData = escalasData?.sort((a: any, b: any) => 
        new Date(a.cultos.data_culto).getTime() - new Date(b.cultos.data_culto).getTime()
      ) || [];

      return sortedData.map((scale: any) => ({
        id: scale.id,
        date: new Date(scale.cultos.data_culto).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        event: scale.cultos.nome_cultos?.nome_culto || 'Culto',
        role: scale.funcao?.nome_funcao || 'Sem função',
        time: scale.cultos.horario
      }));
    } catch (error) {
      console.error('Erro ao buscar escalas do membro:', error);
      return [];
    }
  };

  // Buscar histórico de músicas do membro (como ministro)
  const fetchMemberSongHistory = async (memberId: string) => {
    try {
      // Primeiro buscar o repertório do membro
      const { data: repertorioData, error: repertorioError } = await supabase
        .from('repertorio')
        .select(`
          id,
          id_culto,
          id_musicas,
          id_tons,
          cultos!inner(
            data_culto,
            nome_cultos(nome_culto)
          ),
          musicas(musica, cantor),
          tons(nome_tons)
        `)
        .eq('id_membros', memberId)
        .limit(5);

      if (repertorioError) throw repertorioError;

      // Ordenar no cliente (mais recente primeiro)
      const sortedData = repertorioData?.sort((a: any, b: any) => 
        new Date(b.cultos.data_culto).getTime() - new Date(a.cultos.data_culto).getTime()
      ) || [];

      return sortedData.map((song: any) => ({
        id: song.id,
        song: song.musicas?.musica || 'Sem música',
        singer: song.musicas?.cantor || 'Sem cantor',
        key: song.tons?.nome_tons || 'Ñ',
        date: new Date(song.cultos.data_culto).toLocaleDateString('pt-BR'),
        event: song.cultos.nome_cultos?.nome_culto || 'Culto'
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico de músicas:', error);
      return [];
    }
  };

  // Realtime Subscription
  useEffect(() => {
    const channels = supabase.channel('team-view-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'membros' },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  const kpis = [
    { label: 'Ministro', role: 'Ministro', icon: 'fa-crown' },
    { label: 'Vocal', role: 'Vocal', icon: 'fa-microphone-lines' },
    { label: 'Violão', role: 'Violão', icon: 'fa-guitar' },
    { label: 'Teclado', role: 'Teclado', icon: 'fa-keyboard' },
    { label: 'Guitarra', role: 'Guitarra', icon: 'fa-bolt' },
    { label: 'Baixo', role: 'Baixo', icon: 'fa-music' },
    { label: 'Bateria', role: 'Bateria', icon: 'fa-drum' },
  ];

  const maleCount = members.filter(m => m.gender === 'M').length;
  const femaleCount = members.filter(m => m.gender === 'F').length;

  useEffect(() => {
    if (currentView === 'team' && genderChartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      chartInstance.current = new (window as any).Chart(genderChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['M', 'F'],
          datasets: [{
            data: [maleCount, femaleCount],
            backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#1e3a8a', '#f472b6'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          cutout: '75%',
          maintainAspectRatio: false
        }
      });
    }
  }, [currentView, maleCount, femaleCount, members]);

  const handleFilter = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const filteredMembers = members.filter(m => {
    if (!activeFilter) return true;
    if (activeFilter.startsWith('gender-')) return m.gender === activeFilter.split('-')[1];
    return m.role.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const openScaleDetail = (eventId: string) => {
    const event = allEvents.find(e => e.id === eventId);
    if (event) setViewingEvent(event);
  };

  return (
    <div className="animate-fade-in">
      {currentView === 'approvals' ? (
        <div className="space-y-6 pb-20">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Aprovações</h2>
              <div className="text-sm text-slate-500">
                {solicitacoes.length} solicitação{solicitacoes.length !== 1 ? 's' : ''} pendente{solicitacoes.length !== 1 ? 's' : ''}
              </div>
            </div>

            {loadingAprovacoes ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando solicitações...</p>
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="text-center py-20">
                <i className="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {solicitacoes.map(solicitacao => (
                  <div key={solicitacao.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={solicitacao.membros?.foto || `https://ui-avatars.com/api/?name=${solicitacao.membros?.nome}&background=random`} 
                          alt={solicitacao.membros?.nome}
                          className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-white">{solicitacao.membros?.nome}</h3>
                          <p className="text-sm text-slate-500">{solicitacao.membros?.email}</p>
                          <p className="text-xs text-slate-400">
                            Solicitado em {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                        Pendente
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Selecionar Funções:
                        </label>
                        <MultiSelect
                          options={funcoes.map(f => ({ id: f.id, label: f.nome_funcao }))}
                          value={funcoesSelecionadas[solicitacao.id] || []}
                          onChange={(value) => handleFuncoesChange(solicitacao.id, value)}
                          placeholder="Selecione as funções..."
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja rejeitar esta solicitação?')) {
                              // Implementar rejeição se necessário
                            }
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        >
                          Rejeitar
                        </button>
                        <button
                          onClick={() => aprovarMembro(solicitacao.user_id, funcoesSelecionadas[solicitacao.id] || [])}
                          disabled={!funcoesSelecionadas[solicitacao.id] || funcoesSelecionadas[solicitacao.id]?.length === 0}
                          className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Aprovar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : currentView === 'team' ? (
        <div className="space-y-6 pb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando Equipe...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div onClick={() => setActiveFilter(null)} className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative group cursor-pointer">
                  <h3 className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2 absolute top-4">Gênero</h3>
                  <div className="h-24 w-full relative">
                    <canvas ref={genderChartRef}></canvas>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{members.length}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {kpis.map(kpi => (
                    <button key={kpi.role} onClick={() => handleFilter(kpi.role)} className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${activeFilter === kpi.role ? 'bg-brand text-white border-brand shadow-lg scale-105' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-brand/40'}`}>
                      <div className={`w-7 h-7 ${activeFilter === kpi.role ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'} rounded-lg flex items-center justify-center mb-1.5`}>
                        <i className={`fas ${kpi.icon} text-[10px] ${activeFilter === kpi.role ? 'text-white' : 'text-brand'}`}></i>
                      </div>
                      <span className="text-sm font-black tracking-tighter leading-none">{members.filter(m => m.role.includes(kpi.role)).length}</span>
                      <span className="text-[6px] font-black uppercase tracking-widest mt-1 opacity-60">{kpi.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredMembers.map(member => (
                  <div key={member.id} onClick={() => setSelectedMember(member)} className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group cursor-pointer hover:shadow-xl hover:border-brand/30 transition-all relative">
                    <div className="relative mb-3">
                      <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-full border-2 border-slate-50 dark:border-slate-800 shadow-lg group-hover:scale-110 transition-transform" />
                      <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${member.gender === 'M' ? 'bg-brand' : 'bg-pink-500'} flex items-center justify-center text-[6px] text-white`}><i className={`fas ${member.gender === 'M' ? 'fa-mars' : 'fa-venus'}`}></i></div>
                    </div>
                    <h4 className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight leading-tight truncate w-full">{member.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <i className={`fas ${kpis.find(k => member.role.includes(k.label))?.icon || 'fa-user'} text-[8px] text-slate-300`}></i>
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <AttendanceView />
      )}

      {/* Modal de Membro - AJUSTADO PARA MOBILE (py-20 e max-h) */}
      {selectedMember && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 lg:p-10 py-20 lg:py-10 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/70 dark:bg-slate-950/90 backdrop-blur-md" onClick={() => setSelectedMember(null)}></div>

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-100 dark:border-slate-800 max-h-[75vh] lg:max-h-[85vh] flex flex-col my-auto">
            <div className="p-6 pb-2 flex justify-between items-center bg-white dark:bg-slate-900 z-10 shrink-0">
              <span className="text-[8px] font-black text-brand uppercase tracking-widest bg-brand/5 px-3 py-1 rounded-full">Perfil do Membro</span>
              <button onClick={() => setSelectedMember(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
            </div>

            <div className="p-6 lg:p-8 overflow-y-auto no-scrollbar flex-grow space-y-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <img src={selectedMember.avatar} className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-2xl" />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 ${selectedMember.gender === 'M' ? 'bg-brand' : 'bg-pink-500'} flex items-center justify-center text-[10px] text-white`}>
                    <i className={`fas ${selectedMember.gender === 'M' ? 'fa-mars' : 'fa-venus'}`}></i>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">{selectedMember.name}</h3>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {selectedMember.role.split(',').map(r => (
                    <span key={r} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-full">{r.trim()}</span>
                  ))}
                </div>
              </div>

              {/* Próximas Escalas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-brand rounded-full"></div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Próximas Escalas</h4>
                </div>
                <div className="space-y-2.5">
                  {selectedMember.upcomingScales && selectedMember.upcomingScales.length > 0 ? (
                    selectedMember.upcomingScales.map((s, idx) => (
                      <button key={idx} onClick={() => openScaleDetail(s.id)} className="w-full bg-slate-50 dark:bg-slate-800/50 px-5 py-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 flex justify-between items-center group transition-all hover:border-brand/40 active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-600 shadow-sm">
                            <span className="text-[7px] font-black text-slate-400 leading-none">{s.date.split('/')[1]}</span>
                            <span className="text-sm font-black text-brand leading-none mt-0.5">{s.date.split('/')[0]}</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase block">{s.event}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{s.role}</span>
                          </div>
                        </div>
                        <i className="fas fa-arrow-right text-[10px] text-slate-200 group-hover:text-brand transition-colors"></i>
                      </button>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 font-bold uppercase py-4 text-center">Nenhuma escala programada</p>
                  )}
                </div>
              </div>

              {/* Repertório Recente */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Repertório Recente</h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {selectedMember.songHistory && selectedMember.songHistory.length > 0 ? (
                    selectedMember.songHistory.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-50 dark:border-slate-800 flex-nowrap">
                        <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center text-[8px] flex-shrink-0"><i className="fas fa-music"></i></div>
                        <div className="flex-1 min-w-0 text-left">
                          <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 truncate block">{h.song}</span>
                        </div>
                        <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[9px] flex-shrink-0 p-1">{h.key}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 font-bold uppercase py-4 text-center">Nenhum registro de música</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"><i className="fab fa-whatsapp"></i> WhatsApp</button>
              <button className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[9px]">Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Detalhes do Evento (z-[800] para ficar sobre o outro) */}
      {viewingEvent && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 lg:p-6 py-20 lg:py-10 overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setViewingEvent(null)}></div>
          <div className="relative w-full max-w-2xl bg-[#f4f7fa] dark:bg-[#0b1120] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[75vh] lg:max-h-[85vh] border border-slate-100 dark:border-slate-800 my-auto">

            <div className="p-8 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand text-white flex flex-col items-center justify-center font-black">
                  <span className="text-[9px] uppercase leading-none mb-1">{viewingEvent.dayOfWeek}</span>
                  <span className="text-lg leading-none">{viewingEvent.date.split('/')[0]}</span>
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase leading-none tracking-tighter">{viewingEvent.title}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{viewingEvent.time} • Detalhes do Culto</span>
                </div>
              </div>
              <button onClick={() => setViewingEvent(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors border border-slate-100 dark:border-slate-800 shadow-sm"><i className="fas fa-times"></i></button>
            </div>

            <div className="p-8 pt-4 overflow-y-auto no-scrollbar flex-grow space-y-8">
              {/* Seção Equipe */}
              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Equipe Escalada</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {viewingEvent.members.map(m => (
                    <div key={m.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <img src={m.avatar} className="w-8 h-8 rounded-full" />
                      <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black text-slate-800 dark:text-white truncate leading-none mb-1">{m.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção Músicas */}
              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Repertório</h4>
                <div className="space-y-3">
                  {viewingEvent.repertoire.map(song => (
                    <div key={song.id} className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-brand/5 text-brand rounded-lg flex items-center justify-center"><i className="fas fa-play text-[8px]"></i></div>
                        <div className="min-w-0 text-left">
                          <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-none mb-1.5">{song.song}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{song.singer}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-brand text-white rounded-lg font-black text-[10px]">{song.key}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-white dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
              <button onClick={() => setViewingEvent(null)} className="flex-1 py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand/20">Ok, entendi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
