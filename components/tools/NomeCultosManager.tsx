import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';
import { showConfirmModal } from '../../utils/confirmModal';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';

interface NomeCulto {
  id: string;
  nome_culto: string;
  created_at: string;
}

const NomeCultosManager: React.FC = () => {
  const [nomeCultos, setNomeCultos] = useState<NomeCulto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NomeCulto | null>(null);
  const [formData, setFormData] = useState({ nome_culto: '' });

  // Carregar dados
  useEffect(() => {
    loadNomeCultos();
  }, []);

  const loadNomeCultos = async () => {
    try {
      setLoading(true);
      if (!navigator.onLine) {
        const cachedData = LocalStorageFirstService
          .get<NomeCulto>('nome_cultos')
          .sort((a, b) => (a.nome_culto || '').localeCompare(b.nome_culto || '', 'pt-BR'));
        setNomeCultos(cachedData);
        return;
      }

      const { data, error } = await supabase
        .from('nome_cultos')
        .select('*')
        .order('nome_culto');

      if (error) throw error;
      setNomeCultos(data || []);
    } catch (error) {
      console.error('Erro ao carregar nomes de cultos:', error);
      if (navigator.onLine) {
        showError('Erro ao carregar nomes de cultos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_culto.trim()) {
      showError('O nome do culto é obrigatório');
      return;
    }

    try {
      if (!navigator.onLine) {
        showError('Esta alteracao precisa de internet.');
        return;
      }

      if (editingItem) {
        // Editar
        const { error } = await supabase
          .from('nome_cultos')
          .update({ nome_culto: formData.nome_culto.trim() })
          .eq('id', editingItem.id);

        if (error) throw error;
        showSuccess('Nome do culto atualizado com sucesso!');
      } else {
        // Adicionar
        const { error } = await supabase
          .from('nome_cultos')
          .insert({ nome_culto: formData.nome_culto.trim() });

        if (error) throw error;
        showSuccess('Nome do culto adicionado com sucesso!');
      }

      await loadNomeCultos();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar nome do culto:', error);
      showError('Erro ao salvar nome do culto');
    }
  };

  const handleEdit = (item: NomeCulto) => {
    setEditingItem(item);
    setFormData({ nome_culto: item.nome_culto });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmModal({
      title: 'Excluir nome de culto',
      message: 'Esse nome de culto sera removido permanentemente se nao estiver vinculado a cultos cadastrados.',
      confirmText: 'Excluir',
      cancelText: 'Manter',
      type: 'danger',
      icon: 'fa-trash-alt'
    });

    if (!confirmed) {
      return;
    }

    try {
      if (!navigator.onLine) {
        showError('Esta exclusao precisa de internet.');
        return;
      }

      // Verificar se está sendo usado em algum culto
      const { data: cultosUsing, error: checkError } = await supabase
        .from('cultos')
        .select('id')
        .eq('id_nome_cultos', id);

      if (checkError) throw checkError;

      if (cultosUsing && cultosUsing.length > 0) {
        showError('Não é possível excluir: este nome está sendo usado em cultos cadastrados');
        return;
      }

      // Excluir
      const { error } = await supabase
        .from('nome_cultos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('Nome do culto excluído com sucesso!');
      await loadNomeCultos();
    } catch (error) {
      console.error('Erro ao excluir nome do culto:', error);
      showError('Erro ao excluir nome do culto');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ nome_culto: '' });
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
          Nomes de Cultos
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
                  Nome do Culto
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
              {nomeCultos.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.nome_culto}
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
        
        {nomeCultos.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">
              Nenhum nome de culto cadastrado
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">
              {editingItem ? 'Editar Nome do Culto' : 'Adicionar Nome do Culto'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Culto
                </label>
                <input
                  type="text"
                  value={formData.nome_culto}
                  onChange={(e) => setFormData({ nome_culto: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent dark:bg-slate-800 dark:text-white"
                  placeholder="Ex: Culto de Celebração"
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

export default NomeCultosManager;
