import React, { useState, useEffect } from 'react';
import { showSuccess, showError } from '../../utils/toast';
import EventService, { Evento, PresencaEvento } from '../../services/EventService';

interface AttendanceViewProps {
  evento: Evento;
  onBack: () => void;
}

interface Membro {
  id: string;
  nome: string;
  foto?: string;
  ativo: boolean;
}

const AttendanceView: React.FC<AttendanceViewProps> = ({ evento, onBack }) => {
  const [presencas, setPresencas] = useState<PresencaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'presente' | 'ausente' | 'justificado'>('todos');
  const [editingJustificativa, setEditingJustificativa] = useState<string | null>(null);
  const [justificativaText, setJustificativaText] = useState('');
  const [showAddMembro, setShowAddMembro] = useState(false);
  const [allMembros, setAllMembros] = useState<Membro[]>([]);
  const [loadingMembros, setLoadingMembros] = useState(false);

  useEffect(() => {
    fetchPresencas();
  }, [evento.id_evento]);

  const fetchPresencas = async () => {
    try {
      setLoading(true);
      const data = await EventService.getPresencasByEvento(evento.id_evento);
      setPresencas(data);
    } catch (error) {
      console.error('Erro ao buscar presenças:', error);
      showError('Erro ao carregar lista de presença');
    } finally {
      setLoading(false);
    }
  };

  const updatePresenca = async (id_membro: string, presenca: 'presente' | 'ausente' | 'justificado', justificativa?: string) => {
    try {
      await EventService.updatePresenca(evento.id_evento, id_membro, presenca, justificativa);
      
      // Atualizar estado local
      setPresencas(prev => prev.map(p => 
        p.id_membro === id_membro 
          ? { ...p, presenca, justificativa: presenca === 'justificado' ? justificativa : null }
          : p
      ));
      
      showSuccess('Presença atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar presença:', error);
      showError('Erro ao atualizar presença');
    }
  };

  const handlePresencaClick = (id_membro: string, presenca: 'presente' | 'ausente' | 'justificado') => {
    if (presenca === 'justificado') {
      setEditingJustificativa(id_membro);
      setJustificativaText('');
    } else {
      updatePresenca(id_membro, presenca);
    }
  };

  const handleJustificativaSubmit = (id_membro: string) => {
    if (justificativaText.trim()) {
      updatePresenca(id_membro, 'justificado', justificativaText.trim());
      setEditingJustificativa(null);
      setJustificativaText('');
    } else {
      showError('Digite uma justificativa válida');
    }
  };

  // Funções para gerenciar membros
  const fetchAllMembros = async () => {
    try {
      setLoadingMembros(true);
      const data = await EventService.getAllMembros();
      setAllMembros(data);
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      showError('Erro ao carregar lista de membros');
    } finally {
      setLoadingMembros(false);
    }
  };

  const handleAddMembro = async (id_membro: string) => {
    try {
      await EventService.addMembroToEvento(evento.id_evento, id_membro);
      showSuccess('Membro adicionado à chamada com sucesso!');
      fetchPresencas(); // Atualizar lista de presença
      setShowAddMembro(false);
    } catch (error: any) {
      console.error('Erro ao adicionar membro:', error);
      if (error.message === 'Este membro já está na lista de presença deste evento') {
        showError('Este membro já está participando deste evento');
      } else {
        showError('Erro ao adicionar membro à chamada');
      }
    }
  };

  const handleRemoveMembro = async (id_chamada: string) => {
    if (!confirm('Tem certeza que deseja remover este membro da chamada?')) return;
    
    try {
      await EventService.removeMembroFromEvento(id_chamada);
      showSuccess('Membro removido da chamada com sucesso!');
      fetchPresencas(); // Atualizar lista de presença
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      showError('Erro ao remover membro da chamada');
    }
  };

  const openAddMembroModal = () => {
    fetchAllMembros();
    setShowAddMembro(true);
  };

  // Membros disponíveis para adicionar (não estão na chamada atual)
  const membrosNaChamada = presencas.map(p => p.id_membro);
  const membrosDisponiveis = allMembros.filter(m => !membrosNaChamada.includes(m.id));

  const filteredPresencas = presencas.filter(p => {
    const matchesSearch = p.membros?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'todos' || p.presenca === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const estatisticas = {
    total: presencas.length,
    presentes: presencas.filter(p => p.presenca === 'presente').length,
    ausentes: presencas.filter(p => p.presenca === 'ausente').length,
    justificados: presencas.filter(p => p.presenca === 'justificado').length,
  };

  const formatDate = (dateString: string) => {
    // Criar data considerando timezone local
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo' // Forçar timezone brasileiro
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando presenças...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <i className="fas fa-arrow-left text-slate-500"></i>
        </button>
        <div className="flex-1">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            Chamada
          </h2>
          <p className="text-slate-500 mt-2">{evento.tema}</p>
        </div>
        <button
          onClick={openAddMembroModal}
          className="px-4 py-2 bg-brand text-white rounded-xl font-medium hover:bg-brand/600 transition-colors shadow-lg shadow-brand/20 flex items-center gap-2"
        >
          <i className="fas fa-user-plus"></i>
          Adicionar Membro
        </button>
      </div>

      {/* Info do Evento */}
      <div className="bg-gradient-to-r from-brand/5 to-brand-gold/5 rounded-[2rem] p-6 border border-brand/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white text-lg">{evento.tema}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <i className="fas fa-calendar-day"></i>
                {formatDate(evento.data_evento)}
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-clock"></i>
                {formatTime(evento.horario_evento)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="text-2xl font-black text-slate-800 dark:text-white">{estatisticas.total}</div>
          <div className="text-sm text-slate-500">Total</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="text-2xl font-black text-green-600 dark:text-green-400">{estatisticas.presentes}</div>
          <div className="text-sm text-green-600 dark:text-green-400">Presentes</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="text-2xl font-black text-red-600 dark:text-red-400">{estatisticas.ausentes}</div>
          <div className="text-sm text-red-600 dark:text-red-400">Ausentes</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{estatisticas.justificados}</div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">Justificados</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Buscar membro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {(['todos', 'presente', 'ausente', 'justificado'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {status === 'todos' ? 'Todos' : 
               status === 'presente' ? 'Presentes' :
               status === 'ausente' ? 'Ausentes' : 'Justificados'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Presença */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6">
          <h3 className="font-black text-slate-800 dark:text-white text-lg mb-4">Lista de Presença</h3>
          
          {filteredPresencas.length === 0 ? (
            <div className="text-center py-10">
              <i className="fas fa-users text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                {searchTerm ? 'Nenhum membro encontrado' : 'Nenhuma presença registrada'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPresencas.map((presenca) => (
                <div
                  key={presenca.id_membro}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={presenca.membros?.foto || `https://ui-avatars.com/api/?name=${presenca.membros?.nome}&background=random`}
                      alt={presenca.membros?.nome}
                      className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <div className="font-medium text-slate-800 dark:text-white">
                        {presenca.membros?.nome}
                      </div>
                      {presenca.presenca === 'justificado' && presenca.justificativa && (
                        <div className="text-sm text-slate-500 mt-1">
                          <i className="fas fa-exclamation-triangle text-yellow-500 mr-1"></i>
                          {presenca.justificativa}
                        </div>
                      )}
                    </div>
                  </div>

                  {editingJustificativa === presenca.id_membro ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Digite a justificativa..."
                        value={justificativaText}
                        onChange={(e) => setJustificativaText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleJustificativaSubmit(presenca.id_membro);
                          } else if (e.key === 'Escape') {
                            setEditingJustificativa(null);
                            setJustificativaText('');
                          }
                        }}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                        autoFocus
                      />
                      <button
                        onClick={() => handleJustificativaSubmit(presenca.id_membro)}
                        className="px-3 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand/600 transition-colors"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                      <button
                        onClick={() => {
                          setEditingJustificativa(null);
                          setJustificativaText('');
                        }}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePresencaClick(presenca.id_membro, 'presente')}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            presenca.presenca === 'presente'
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                          }`}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          onClick={() => handlePresencaClick(presenca.id_membro, 'ausente')}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            presenca.presenca === 'ausente'
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                          }`}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                        <button
                          onClick={() => handlePresencaClick(presenca.id_membro, 'justificado')}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            presenca.presenca === 'justificado'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                          }`}
                        >
                          <i className="fas fa-exclamation-triangle"></i>
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveMembro(presenca.id_chamada)}
                        className="w-6 h-6 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                        title="Remover da chamada"
                      >
                        <i className="fas fa-trash text-red-500 text-xs group-hover:text-red-600"></i>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Adicionar Membro */}
      {showAddMembro && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                Adicionar Membro à Chamada
              </h3>
              <button
                onClick={() => setShowAddMembro(false)}
                className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingMembros ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-6 h-6 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-3 text-slate-400 text-sm">Carregando membros...</p>
                </div>
              ) : membrosDisponiveis.length === 0 ? (
                <div className="text-center py-10">
                  <i className="fas fa-users text-3xl text-slate-300 mb-3"></i>
                  <p className="text-slate-400 text-sm">Todos os membros já estão na chamada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {membrosDisponiveis.map((membro) => (
                    <div
                      key={membro.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={membro.foto || `https://ui-avatars.com/api/?name=${membro.nome}&background=random`}
                          alt={membro.nome}
                          className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="font-medium text-slate-800 dark:text-white text-sm">
                            {membro.nome}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMembro(membro.id)}
                        className="px-3 py-1 bg-brand text-white rounded-lg text-xs font-medium hover:bg-brand/600 transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowAddMembro(false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
