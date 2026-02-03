import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { confirmInfo } from '../../utils/confirmModal';

export const CleaningView: React.FC = () => {
  const [cleaningImage, setCleaningImage] = useState("https://picsum.photos/id/160/800/1000");
  const [isZoomed, setIsZoomed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string, roles: string[] } | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar usuário logado e verificar permissões
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (user && user.email) {
          // Buscar dados do membro pelo email (case-insensitive)
          const { data: memberData, error: memberError } = await supabase
            .from('membros')
            .select('id, nome, perfil')
            .ilike('email', user.email)
            .limit(1)
            .single();
          
          if (memberData && !memberError) {
            setCurrentUser({ 
              id: memberData.id, 
              name: memberData.nome || user.email?.split('@')[0] || 'Usuário', 
              roles: memberData.perfil ? [memberData.perfil] : []
            });
            
            // Verificar se tem permissão (Admin ou Líder) baseado no campo perfil
            const hasPermission = memberData.perfil && (
              memberData.perfil.toLowerCase().includes('admin') || 
              memberData.perfil.toLowerCase().includes('líder') ||
              memberData.perfil.toLowerCase().includes('lider')
            );
            
            setCanEdit(hasPermission);
            
            // Se perfil for null, mostrar informação útil
            if (!memberData.perfil) {
              logger.warn('ATENÇÃO: Campo perfil está NULL para o usuário:', { email: user.email }, 'auth');
              logger.warn('Verifique na tabela membros se o campo perfil foi preenchido para este usuário.', {}, 'auth');
            }
          } else {
            // Se não encontrar na tabela membros, verificar metadados como fallback
            const userMetadata = user.user_metadata || {};
            const appMetadata = user.app_metadata || {};
            
            let roles: string[] = [];
            
            if (appMetadata.role) {
              if (Array.isArray(appMetadata.role)) {
                roles = appMetadata.role;
              } else if (typeof appMetadata.role === 'string') {
                roles = [appMetadata.role];
              }
            }
            
            if (roles.length === 0 && userMetadata.roles) {
              if (Array.isArray(userMetadata.roles)) {
                roles = userMetadata.roles;
              } else if (typeof userMetadata.roles === 'string') {
                roles = userMetadata.roles.split(',').map(r => r.trim());
              }
            }
            
            if (roles.length === 0 && user.email) {
              const isAdminEmail = user.email.includes('admin') || 
                                 user.email.includes('lider') || 
                                 user.email.includes('pastor');
              
              if (isAdminEmail) {
                roles = ['admin'];
              }
            }
            
            setCurrentUser({ 
              id: user.id, 
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário', 
              roles 
            });
            
            const hasPermission = roles.some(role => 
              role.toLowerCase().includes('admin') || 
              role.toLowerCase().includes('líder') ||
              role.toLowerCase().includes('lider')
            );
            
            setCanEdit(hasPermission);
          }
        }
      } catch (error) {
        logger.error('Erro ao buscar usuário:', error, 'auth');
      }
    };

    getCurrentUser();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getCurrentUser();
      } else {
        setCurrentUser(null);
        setCanEdit(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carregar foto atual da limpeza
  useEffect(() => {
    const fetchCleaningPhoto = async () => {
      try {
        // Tentar carregar da tabela limpeza
        const { data, error } = await supabase
          .from('limpeza')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          logger.error('Erro ao carregar foto da limpeza:', error, 'database');
          // Se der erro, tentar com query mais simples
          try {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('limpeza')
              .select('foto')
              .limit(1);
            
            if (!fallbackError && fallbackData && fallbackData.length > 0 && fallbackData[0].foto) {
              setCleaningImage(fallbackData[0].foto);
            }
          } catch (fallbackErr) {
            logger.error('Erro no fallback:', fallbackErr, 'database');
          }
        } else if (data && data.length > 0 && data[0].foto) {
          setCleaningImage(data[0].foto);
        }
      } catch (error) {
        logger.error('Erro ao carregar foto da limpeza:', error, 'database');
      }
    };

    fetchCleaningPhoto();
  }, []);

  const handleEditPhoto = async () => {
    if (!canEdit) {
      await confirmInfo('Apenas administradores e líderes podem alterar a foto da escala de limpeza.', 'Acesso Restrito');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!canEdit) {
        showError('Apenas administradores e líderes podem alterar a foto da escala de limpeza.');
        return;
      }

      setLoading(true);
      
      try {
        // Função robusta para atualizar foto da limpeza
        const atualizarFotoLimpeza = async (file: File) => {
          const fileName = `limpeza/status_atual_${Date.now()}.png`; // Pasta limpeza dentro de public-assets

          // 1. Buscar e deletar arquivos antigos da pasta limpeza
          const { data: arquivosAntigos } = await supabase.storage
            .from('public-assets')
            .list('limpeza', {
              limit: 100,
              offset: 0
            });

          if (arquivosAntigos && arquivosAntigos.length > 0) {
            // 2. Deletar todos os arquivos antigos da pasta limpeza
            const caminhosParaDeletar = arquivosAntigos.map(arquivo => `limpeza/${arquivo.name}`);
            
            await supabase.storage
              .from('public-assets')
              .remove(caminhosParaDeletar);
          }

          // 3. Fazer o upload do novo arquivo na pasta limpeza
          const { data, error } = await supabase.storage
            .from('public-assets')
            .upload(fileName, file);

          if (error) {
            throw error;
          }

          // 4. Pegar a URL pública da nova foto
          const { data: { publicUrl } } = supabase.storage
            .from('public-assets')
            .getPublicUrl(fileName);

          // 5. Atualizar a tabela public.limpeza (id 1 como exemplo de registro único)
          const { error: dbError } = await supabase
            .from('limpeza')
            .upsert({ id: 1, foto: publicUrl }); // id 1 garante que sempre teremos apenas uma linha

          if (dbError) {
            throw dbError;
          }

          return publicUrl;
        };

        // Usar a função robusta
        const novaFotoUrl = await atualizarFotoLimpeza(file);
        
        // Atualizar o estado com a nova foto
        setCleaningImage(novaFotoUrl);
        showSuccess('Foto da escala de limpeza atualizada com sucesso!');
        
      } catch (error) {
        logger.error('Erro ao atualizar foto:', error, 'database');
        
        // Fallback: Tentar método base64 se Storage falhar
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (event.target?.result) {
              const base64Image = event.target.result as string;
              
              try {
                const { error: fallbackError } = await supabase
                  .from('limpeza')
                  .upsert({ id: 1, foto: base64Image });
                
                if (fallbackError) {
                  throw fallbackError;
                }
                
                setCleaningImage(base64Image);
                showSuccess('Foto atualizada com sucesso (modo base64)!');
              } catch (dbError) {
                logger.error('Erro no fallback:', dbError, 'database');
                
                setCleaningImage(base64Image);
                showWarning('Foto atualizada localmente. Configure as permissões do Storage ou RLS.');
              }
              
              setLoading(false);
            }
          };
          
          reader.readAsDataURL(file);
          return;
        } catch (fallbackErr) {
          logger.error('Erro no processo fallback:', fallbackErr, 'database');
          showError('Erro ao processar a imagem. Tente novamente.');
        }
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800 text-center relative">
        <div className="mb-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-brand/5 text-brand rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <i className="fas fa-broom text-2xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Escala de Limpeza</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Manutenção e Zeladoria</p>
        </div>

        <div className="relative group overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
          <img 
            src={cleaningImage} 
            alt="Escala de Limpeza" 
            className={`w-full h-auto transition-transform duration-1000 group-hover:scale-105 ${loading ? 'opacity-50' : ''}`}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
              <div className="bg-white rounded-full p-4 shadow-lg">
                <i className="fas fa-spinner fa-spin text-brand text-2xl"></i>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
            <div className="flex gap-4">
              <button 
                onClick={() => setIsZoomed(true)}
                className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-brand hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
              >
                <i className="fas fa-search-plus mr-2"></i> Ampliar
              </button>
              <button 
                onClick={handleEditPhoto}
                disabled={loading}
                className={`bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75 ${
                  loading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-brand-gold hover:text-white'
                }`}
              >
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-edit'} mr-2`}></i> 
                {loading ? 'Processando...' : 'Trocar Foto'}
              </button>
            </div>
            <div className="text-white/60 font-black text-[8px] uppercase tracking-[0.3em] flex items-center gap-2">
              <i className="fas fa-info-circle text-brand"></i> 
              {canEdit ? 'Você pode alterar esta foto' : 'Apenas admin e líderes podem alterar'}
            </div>
          </div>
        </div>
        
        {/* Input Oculto para Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />

        <div className="mt-12 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed max-w-lg mx-auto italic">
            "Pois zelamos pelo que é honesto, não só diante do Senhor, mas também diante dos homens." 
            <span className="block mt-2 font-black not-italic text-brand text-[10px] uppercase tracking-widest">2 Coríntios 8:21</span>
          </p>
        </div>

        <div className="mt-8 flex justify-center">
            <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand transition-all font-black text-[9px] uppercase tracking-widest">
              <i className="fas fa-print"></i> Imprimir Escala
            </button>
        </div>
      </div>

      {/* Modal de Zoom */}
      {isZoomed && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in" onClick={() => setIsZoomed(false)}>
          <button 
            className="absolute top-8 right-8 text-white hover:text-brand transition-colors text-3xl"
            onClick={() => setIsZoomed(false)}
          >
            <i className="fas fa-times"></i>
          </button>
          <img 
            src={cleaningImage} 
            alt="Zoom da Escala" 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default CleaningView;