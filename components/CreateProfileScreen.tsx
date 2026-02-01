import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface CreateProfileScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

const CreateProfileScreen: React.FC<CreateProfileScreenProps> = ({ onBack, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    genero: 'Masculino',
    telefone: '',
    foto: null as File | null
  });
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Dados básicos, 2: Foto, 3: Confirmação

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar cooldown de 30 segundos
    const now = Date.now();
    if (now - lastSubmitTime < 30000) {
      const remainingTime = Math.ceil((30000 - (now - lastSubmitTime)) / 1000);
      setError(`Aguarde ${remainingTime} segundos antes de tentar novamente.`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setLastSubmitTime(now);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome,
            genero: formData.genero
          }
        }
      });

      if (authError) {
        if (authError.status === 429) {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else if (authError.message.includes('already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else if (authError.message.includes('invalid')) {
          setError('Email inválido. Verifique o formato e tente novamente.');
        } else {
          setError('Erro ao criar conta: ' + authError.message);
        }
        setIsLoading(false); // Garantir que o loading seja desativado
        return;
      }

      // 2. Criar solicitação de membro com a estrutura correta
      if (authData.user) {
        const { error: solicitacaoError } = await supabase
          .from('solicitacoes_membro')
          .insert({
            id: authData.user.id,
            email: formData.email,
            nome: formData.nome,
            aprovado: false
          });

        if (solicitacaoError) {
          console.error('Erro ao criar solicitação:', solicitacaoError);
          setError('Erro ao registrar solicitação. Tente novamente.');
          setIsLoading(false);
          return;
        }

        // 3. Upload da foto se existir
        let fotoUrl = '';
        if (formData.foto) {
          const fileExt = formData.foto.name.split('.').pop();
          const fileName = `${authData.user.id}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('profile-photos')
            .upload(fileName, formData.foto);

          if (uploadError) {
            console.warn('Erro ao fazer upload da foto:', uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('profile-photos')
              .getPublicUrl(fileName);
            fotoUrl = publicUrl;
          }
        }

        // 4. Criar registro básico na tabela membros (inativo)
        const { error: membroError } = await supabase
          .from('membros')
          .insert({
            id: authData.user.id,
            nome: formData.nome,
            email: formData.email,
            genero: formData.genero,
            telefone: formData.telefone,
            foto: fotoUrl || `https://ui-avatars.com/api/?name=${formData.nome}&background=random`,
            funcoes: [], // Será definido pelo admin na aprovação
            ativo: false // Apenas será ativado após aprovação
          });

        if (membroError) {
          console.error('Erro ao criar membro:', membroError);
          setError('Erro ao criar perfil. Tente novamente.');
          setIsLoading(false);
          return;
        }

        // Se chegou aqui, o perfil foi criado com sucesso
        setStep(3); // Mostrar tela de sucesso
        setLastSubmitTime(0); // Resetar cooldown em caso de sucesso
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, foto: e.target.files[0] });
    }
  };

  const nextStep = () => {
    if (step === 1) {
      // Validar dados básicos
      if (!formData.nome || !formData.email || !formData.senha || !formData.confirmarSenha) {
        setError('Preencha todos os campos obrigatórios.');
        return;
      }
      
      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Email inválido. Verifique o formato e tente novamente.');
        return;
      }
      
      if (formData.senha !== formData.confirmarSenha) {
        setError('As senhas não coincidem.');
        return;
      }
      
      if (formData.senha.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6 relative transition-colors duration-300">
        {/* Background Decor */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-brand/5 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-brand-gold/5 rounded-full blur-[80px]"></div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 lg:p-14 animate-fade-in text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-check text-green-500 text-3xl"></i>
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter text-center leading-none mb-4">
              Perfil Criado!
            </h2>
            <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-6">
              Sua solicitação foi enviada para aprovação
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Aguarde a aprovação de um administrador para acessar o sistema. Você receberá um email quando sua conta for ativada.
              </p>
            </div>
          </div>

          <button
            onClick={onSuccess}
            className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-2xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6 relative transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-brand/5 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-brand-gold/5 rounded-full blur-[80px]"></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 lg:p-14 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="flex flex-col items-center">
            <i className="fas fa-cloud text-brand text-3xl"></i>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter text-center leading-none mt-2">
              Criar Perfil
            </h2>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                s <= step 
                  ? 'bg-brand text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {s < step ? <i className="fas fa-check"></i> : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-0.5 transition-all ${
                  s < step ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-800'
                }`}></div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center shrink-0">
              <i className="fas fa-exclamation-triangle text-red-500 dark:text-red-400 text-xs"></i>
            </div>
            <p className="text-[10px] font-bold text-red-600 dark:text-red-300 uppercase tracking-wide leading-relaxed flex-1">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
          {step === 1 && (
            <>
              {/* Dados Básicos */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors">
                    <i className="fas fa-user text-sm"></i>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Seu nome completo"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-14 pr-6 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors">
                    <i className="fas fa-envelope text-sm"></i>
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-14 pr-6 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors">
                    <i className="fas fa-phone text-sm"></i>
                  </div>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-14 pr-6 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Gênero</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, genero: 'Masculino' })}
                    className={`py-3 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${
                      formData.genero === 'Masculino'
                        ? 'border-brand bg-brand text-white'
                        : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-brand/40'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, genero: 'Feminino' })}
                    className={`py-3 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${
                      formData.genero === 'Feminino'
                        ? 'border-brand bg-brand text-white'
                        : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-brand/40'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors">
                    <i className="fas fa-lock text-sm"></i>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-14 pr-14 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Confirmar Senha</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors">
                    <i className="fas fa-lock text-sm"></i>
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmarSenha}
                    onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-14 pr-14 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  >
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Upload de Foto */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Foto de Perfil (opcional)
                </label>
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center mb-4 overflow-hidden">
                    {formData.foto ? (
                      <img 
                        src={URL.createObjectURL(formData.foto)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <i className="fas fa-camera text-3xl text-slate-400 mb-2"></i>
                        <p className="text-[9px] text-slate-400">Sem foto</p>
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="px-6 py-3 bg-brand text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand/90 transition-colors">
                      {formData.foto ? 'Trocar Foto' : 'Adicionar Foto'}
                    </div>
                  </label>
                  {formData.foto && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, foto: null })}
                      className="text-[9px] text-red-500 hover:text-red-600 font-black uppercase tracking-widest mt-2"
                    >
                      Remover Foto
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Voltar
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-5 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-2xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {step === 2 ? 'Finalizar Cadastro' : 'Próximo'} 
                  <i className={`fas ${step === 2 ? 'fa-check' : 'fa-arrow-right'} text-[10px]`}></i>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProfileScreen;
