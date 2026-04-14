import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';

interface Ministerio {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  ativo: boolean;
  modulos?: string[] | Record<string, boolean> | null;
  created_at: string;
}

const MODULE_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { id: 'scales', label: 'Escalas', icon: 'fas fa-calendar-check' },
  { id: 'music', label: 'Músicas', icon: 'fas fa-music' },
  { id: 'team', label: 'Equipe', icon: 'fas fa-users' }
];

const defaultModules = ['dashboard', 'scales', 'team'];

const normalizeModules = (modulos: string[] | Record<string, boolean> | null): string[] => {
  if (Array.isArray(modulos)) {
    return modulos;
  }
  
  if (modulos && typeof modulos === 'object') {
    return Object.entries(modulos)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }
  
  return defaultModules;
};

const MinisterioManager: React.FC = () => {
  const [ministerios, setMinisterios] = useState<Ministerio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Ministerio | null>(null);
  const [formData, setFormData] = useState({ 
    nome: '', 
    slug: '',
    descricao: '',
    ativo: true,
    modulos: defaultModules
  });

  // Carregar dados
  useEffect(() => {
    loadMinisterios();
  }, []);

  const loadMinisterios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ministerios')
        .select('*')
        .order('nome');

      if (error) throw error;
      setMinisterios(data || []);
    } catch (error) {
      console.error('Erro ao carregar ministérios:', error);
      showError('Erro ao carregar ministérios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      showError('O nome do ministério é obrigatório');
      return;
    }

    try {
      const ministerioData = {
        nome: formData.nome.trim(),
        slug: formData.slug.trim() || formData.nome.trim().toLowerCase().replace(/\s+/g, '-'),
        descricao: formData.descricao.trim() || null,
        ativo: formData.ativo,
        modulos: formData.modulos
      };

      if (editingItem) {
        // Editar
        const { error } = await supabase
          .from('ministerios')
          .update(ministerioData)
          .eq('id', editingItem.id);

        if (error) throw error;
        showSuccess('Ministério atualizado com sucesso!');
      } else {
        // Adicionar
        const { error } = await supabase
          .from('ministerios')
          .insert(ministerioData);

        if (error) throw error;
        showSuccess('Ministério adicionado com sucesso!');
      }

      await loadMinisterios();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar ministério:', error);
      showError('Erro ao salvar ministério');
    }
  };

  const handleEdit = (item: Ministerio) => {
    setEditingItem(item);
    setFormData({ 
      nome: item.nome,
      slug: item.slug,
      descricao: item.descricao || '',
      ativo: item.ativo,
      modulos: normalizeModules(item.modulos)
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ministério?')) {
      return;
    }

    try {
      // Verificar se está sendo usado por membros
      const { data: membrosUsing, error: checkError } = await supabase
        .from('membros_ministerios')
        .select('id')
        .eq('ministerio_id', id);

      if (checkError) throw checkError;

      if (membrosUsing && membrosUsing.length > 0) {
        showError('Não é possível excluir: este ministério está sendo usado por membros cadastrados');
        return;
      }

      // Excluir
      const { error } = await supabase
        .from('ministerios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('Ministério excluído com sucesso!');
      await loadMinisterios();
    } catch (error) {
      console.error('Erro ao excluir ministério:', error);
      showError('Erro ao excluir ministério');
    }
  };

  const toggleStatus = async (item: Ministerio) => {
    try {
      const { error } = await supabase
        .from('ministerios')
        .update({ ativo: !item.ativo })
        .eq('id', item.id);

      if (error) throw error;
      
      showSuccess(`Ministério ${!item.ativo ? 'ativado' : 'desativado'} com sucesso!`);
      await loadMinisterios();
    } catch (error) {
      console.error('Erro ao alterar status do ministério:', error);
      showError('Erro ao alterar status do ministério');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ 
      nome: '', 
      slug: '',
      descricao: '',
      ativo: true,
      modulos: defaultModules
    });
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
          Ministérios
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
                  Nome do Ministério
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Módulos
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
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
              {ministerios.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.nome}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {item.slug}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {item.descricao || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {normalizeModules(item.modulos).map((modulo) => {
                        const moduleOption = MODULE_OPTIONS.find(m => m.id === modulo);
                        return (
                          <span
                            key={modulo}
                            className="inline-flex items-center px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
                            title={moduleOption?.label}
                          >
                            <i className={`${moduleOption?.icon || 'fas fa-cog'} mr-1`}></i>
                            {moduleOption?.label || modulo}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.ativo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => toggleStatus(item)}
                      className={`mr-3 ${
                        item.ativo
                          ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300'
                          : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                      }`}
                      title={item.ativo ? 'Desativar' : 'Ativar'}
                    >
                      <i className={`fas fa-${item.ativo ? 'pause' : 'play'}`}></i>
                    </button>
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
        
        {ministerios.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">
              Nenhum ministério cadastrado
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">
              {editingItem ? 'Editar Ministério' : 'Adicionar Ministério'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Ministério
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent dark:bg-slate-800 dark:text-white"
                  placeholder="Ex: Louvor, Intercessão, Acolhimento"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Slug (URL Amigável)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent dark:bg-slate-800 dark:text-white"
                  placeholder="Ex: louvor, ministerio-de-adoracao"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Usado para URLs. Apenas letras minúsculas, números e hífens.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent dark:bg-slate-800 dark:text-white"
                  placeholder="Descreva o propósito e atividades deste ministério..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Módulos Disponíveis
                </label>
                <div className="space-y-2">
                  {MODULE_OPTIONS.map((module) => (
                    <label key={module.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.modulos.includes(module.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ 
                              ...formData, 
                              modulos: [...formData.modulos, module.id] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              modulos: formData.modulos.filter(m => m !== module.id) 
                            });
                          }
                        }}
                        className="h-4 w-4 text-brand focus:ring-brand border-slate-300 rounded"
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                        <i className={`${module.icon} mr-1`}></i>
                        {module.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="h-4 w-4 text-brand focus:ring-brand border-slate-300 rounded"
                />
                <label htmlFor="ativo" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Ministério ativo
                </label>
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

export default MinisterioManager;
