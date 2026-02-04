import React, { useState, useEffect } from 'react';
import { showSuccess, showError } from '../../utils/toast';
import EventService, { Evento, PresencaEvento } from '../../services/EventService';

interface EventsViewProps {
  onEventClick: (evento: Evento) => void;
}

const EventsView: React.FC<EventsViewProps> = ({ onEventClick }) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
  const [formData, setFormData] = useState({
    tema: '',
    data_evento: '',
    horario_evento: '',
  });

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      const data = await EventService.getEventos();
      setEventos(data);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      showError('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEvento) {
        await EventService.updateEvento(editingEvento.id_evento, formData);
        showSuccess('Evento atualizado com sucesso!');
      } else {
        await EventService.createEvento(formData);
        showSuccess('Evento criado com sucesso! Lista de presença gerada automaticamente.');
      }
      
      setShowModal(false);
      setEditingEvento(null);
      setFormData({ tema: '', data_evento: '', horario_evento: '' });
      fetchEventos();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      showError('Erro ao salvar evento');
    }
  };

  const handleEdit = (evento: Evento) => {
    setEditingEvento(evento);
    setFormData({
      tema: evento.tema,
      data_evento: evento.data_evento,
      horario_evento: evento.horario_evento,
    });
    setShowModal(true);
  };

  const handleDelete = async (evento: Evento) => {
    if (!confirm(`Tem certeza que deseja excluir o evento "${evento.tema}"?`)) return;
    
    try {
      await EventService.deleteEvento(evento.id_evento);
      showSuccess('Evento excluído com sucesso!');
      fetchEventos();
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      showError('Erro ao excluir evento');
    }
  };

  const formatDate = (dateString: string) => {
    // Criar data considerando timezone local
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
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
        <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando eventos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            Chamada
          </h2>
          <p className="text-slate-500 mt-2">Gerencie eventos e controle de presença</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-brand text-white rounded-xl font-medium hover:bg-brand/600 transition-colors shadow-lg shadow-brand/20 flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Novo Evento
        </button>
      </div>

      {/* Eventos Grid */}
      {eventos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <i className="fas fa-calendar-alt text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Nenhum evento encontrado</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand/600 transition-colors"
          >
            Criar primeiro evento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventos.map((evento) => (
            <div
              key={evento.id_evento}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onEventClick(evento)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center">
                  <i className="fas fa-calendar text-brand text-lg"></i>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(evento);
                    }}
                    className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <i className="fas fa-edit text-slate-500 text-xs"></i>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(evento);
                    }}
                    className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <i className="fas fa-trash text-red-500 text-xs"></i>
                  </button>
                </div>
              </div>

              <h3 className="font-black text-slate-800 dark:text-white text-lg mb-2 line-clamp-2">
                {evento.tema}
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <i className="fas fa-calendar-day w-4"></i>
                  {formatDate(evento.data_evento)}
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <i className="fas fa-clock w-4"></i>
                  {formatTime(evento.horario_evento)}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button className="w-full py-2 bg-brand/5 text-brand rounded-lg font-medium hover:bg-brand/10 transition-colors text-sm">
                  <i className="fas fa-users mr-2"></i>
                  Ver Chamada
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar Evento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                {editingEvento ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEvento(null);
                  setFormData({ tema: '', data_evento: '', horario_evento: '' });
                }}
                className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tema do Evento
                </label>
                <input
                  type="text"
                  required
                  value={formData.tema}
                  onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  placeholder="Ex: Culto de Celebração"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Data do Evento
                </label>
                <input
                  type="date"
                  required
                  value={formData.data_evento}
                  onChange={(e) => setFormData({ ...formData, data_evento: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Horário do Evento
                </label>
                <input
                  type="time"
                  required
                  value={formData.horario_evento}
                  onChange={(e) => setFormData({ ...formData, horario_evento: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEvento(null);
                    setFormData({ tema: '', data_evento: '', horario_evento: '' });
                  }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand text-white rounded-xl font-medium hover:bg-brand/600 transition-colors shadow-lg shadow-brand/20"
                >
                  {editingEvento ? 'Atualizar' : 'Criar'} Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;
