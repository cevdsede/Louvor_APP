import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';
import { showConfirmModal } from '../../utils/confirmModal';

interface Tema {
  id: string;
  nome_tema: string;
  created_at: string;
}

const TemasManager: React.FC = () => {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Tema | null>(null);
  const [formData, setFormData] = useState({ nome_tema: '' });

  // Carregar dados
  useEffect(() => {
    loadTemas();
  }, []);

  const loadTemas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .order('nome_tema');

      if (error) throw error;
      setTemas(data || []);
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
      showError('Erro ao carregar temas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_tema.trim()) {
      showError('O nome do tema é obrigatório');
      return;
    }

    try {
      if (editingItem) {
        // Editar
        const { error } = await supabase
          .from('temas')
          .update({ nome_tema: formData.nome_tema.trim() })
          .eq('id', editingItem.id);

        if (error) throw error;
        showSuccess('Tema atualizado com sucesso!');
      } else {
        // Adicionar
        const { error } = await supabase
          .from('temas')
          .insert({ nome_tema: formData.nome_tema.trim() });

        if (error) throw error;
        showSuccess('Tema adicionado com sucesso!');
      }

      await loadTemas();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
      showError('Erro ao salvar tema');
    }
  };

  const handleEdit = (item: Tema) => {
    setEditingItem(item);
    setFormData({ nome_tema: item.nome_tema });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmModal({
      title: 'Excluir tema',
      message: 'Esse tema sera removido permanentemente se nao estiver vinculado a musicas cadastradas.',
      confirmText: 'Excluir',
      cancelText: 'Manter',
      type: 'danger',
      icon: 'fa-trash-alt'
    });

    if (!confirmed) {
      return;
    }

    try {
      // Verificar se está sendo usado em alguma música
      const { data: musicasUsing, error: checkError } = await supabase
        .from('musicas')
        .select('id')
        .eq('id_temas', id);

      if (checkError) throw checkError;

      if (musicasUsing && musicasUsing.length > 0) {
        showError('Não é possível excluir: este tema está sendo usado em músicas cadastradas');
        return;
      }

      // Excluir
      const { error } = await supabase
        .from('temas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('Tema excluído com sucesso!');
      await loadTemas();
    } catch (error) {
      console.error('Erro ao excluir tema:', error);
      showError('Erro ao excluir tema');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ nome_tema: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">
          Temas de Músicas
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand text-white rounded-lg font-black text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
        >
          <i className="fas fa-plus mr-2"></i> Adicionar
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nome do Tema
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Data de Criação
                </th>
                <th className="px-6 py-3 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {temas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.nome_tema}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {temas.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">
              Nenhum tema cadastrado
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">
              {editingItem ? 'Editar Tema' : 'Adicionar Tema'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Tema
                </label>
                <input
                  type="text"
                  value={formData.nome_tema}
                  onChange={(e) => setFormData({ nome_tema: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent dark:bg-slate-800 dark:text-white"
                  placeholder="Ex: Adoração, Louvor, Comunhão"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand text-white rounded-lg font-black text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
                >
                  {editingItem ? 'Atualizar' : 'Adicionar'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemasManager;
