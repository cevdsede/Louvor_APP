import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { buildLocalAvatar } from '../../utils/avatar';
import { compressImageFile } from '../../utils/imageCompression';
import { logger } from '../../utils/logger';

type FormState = {
  nome: string;
  endereco: string;
  numero_casa: string;
  cep: string;
  bairro: string;
  data_nasc: string;
  genero: 'Homem' | 'Mulher';
  nome_pai: string;
  nome_mae: string;
  batizado: boolean;
  data_batismo: string;
  igreja_batismo: string;
  estado_civil: string;
  nome_conjuge: string;
  profissao: string;
  escolaridade: string;
  email: string;
  telefone_celular: string;
  telefone_recados: string;
  posicao_igreja: string;
  ministerio_levita: string;
  nome_discipulador: string;
  esta_em_celula: boolean;
  qual_celula: string;
  senha: string;
  confirmarSenha: string;
  foto: File | null;
};

const INITIAL_FORM: FormState = {
  nome: '',
  endereco: '',
  numero_casa: '',
  cep: '',
  bairro: '',
  data_nasc: '',
  genero: 'Homem',
  nome_pai: '',
  nome_mae: '',
  batizado: false,
  data_batismo: '',
  igreja_batismo: '',
  estado_civil: 'Solteiro(a)',
  nome_conjuge: '',
  profissao: '',
  escolaridade: 'Ensino Médio',
  email: '',
  telefone_celular: '',
  telefone_recados: '',
  posicao_igreja: 'Membro',
  ministerio_levita: '',
  nome_discipulador: '',
  esta_em_celula: false,
  qual_celula: '',
  senha: '',
  confirmarSenha: '',
  foto: null
};

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Viúvo(a)', 'Divorciado(a)', 'Concubinato'];
const ESCOLARIDADES = [
  'Nenhuma',
  'Ensino Fundamental',
  'Ensino Fundamental Incompleto',
  'Ensino Médio',
  'Ensino Médio Incompleto',
  'Superior',
  'Superior Incompleto'
];
const POSICOES_IGREJA = ['Pastor(a)', 'Levita', 'Membro', 'Secretario(a)', 'Tesoureiro(a)', 'Missionário'];
const MINISTERIOS_LEVITA = ['Louvor', 'Coreográfica', 'Mídia', 'Teatro', 'Diácono'];

const Field = ({
  label,
  children,
  className = ''
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
      {label}
    </span>
    {children}
  </label>
);

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatCep = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const formatCellphone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const PublicMemberRegistration: React.FC = () => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const validate = () => {
    if (
      !form.nome.trim() ||
      !form.email.trim() ||
      !form.data_nasc ||
      !form.senha ||
      !form.endereco.trim() ||
      !form.numero_casa.trim() ||
      !form.bairro.trim() ||
      !form.nome_pai.trim() ||
      !form.nome_mae.trim() ||
      !form.estado_civil ||
      !form.escolaridade ||
      !form.telefone_celular.trim()
    ) {
      return 'Preencha todos os campos obrigatorios.';
    }

    if (form.senha.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }

    if (form.senha !== form.confirmarSenha) {
      return 'As senhas não coincidem.';
    }

    if (form.posicao_igreja === 'Levita' && !form.ministerio_levita) {
      return 'Informe o ministério quando a posição for Levita.';
    }

    if (form.batizado && (!form.data_batismo || !form.igreja_batismo.trim())) {
      return 'Informe data do batismo e igreja onde foi batizado.';
    }

    if (form.estado_civil === 'Casado(a)' && !form.nome_conjuge.trim()) {
      return 'Informe o nome do conjuge.';
    }

    if (form.esta_em_celula && !form.qual_celula.trim()) {
      return 'Informe qual é a célula.';
    }

    return '';
  };

  const uploadPhoto = async () => {
    if (!form.foto) {
      return buildLocalAvatar(form.nome);
    }

    const compressedPhoto = await compressImageFile(form.foto, {
      maxWidth: 720,
      maxHeight: 720,
      quality: 0.72
    });
    const photoId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const filePath = `membros/cadastros/${photoId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(filePath, compressedPhoto, {
        cacheControl: '31536000',
        contentType: compressedPhoto.type,
        upsert: false
      });

    if (uploadError) {
      logger.warn('Erro ao enviar foto do cadastro publico:', uploadError, 'database');
      return buildLocalAvatar(form.nome);
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from('public-assets').getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const email = form.email.trim().toLowerCase();
      const fotoUrl = await uploadPhoto();
      const profilePayload = {
        nome: form.nome.trim(),
        display_name: form.nome.trim(),
        nome_planilha: form.nome.trim(),
        email,
        endereco: form.endereco.trim() || null,
        numero_casa: form.numero_casa.trim() || null,
        cep: form.cep.trim() || null,
        bairro: form.bairro.trim() || null,
        data_nasc: form.data_nasc || null,
        genero: form.genero,
        nome_pai: form.nome_pai.trim() || null,
        nome_mae: form.nome_mae.trim() || null,
        data_batismo: form.batizado ? form.data_batismo || null : null,
        igreja_batismo: form.batizado ? form.igreja_batismo.trim() || null : null,
        estado_civil: form.estado_civil || null,
        nome_conjuge: form.estado_civil === 'Casado(a)' ? form.nome_conjuge.trim() || null : null,
        profissao: form.profissao.trim() || null,
        escolaridade: form.escolaridade || null,
        telefone: form.telefone_celular || null,
        telefone_celular: form.telefone_celular.trim() || null,
        telefone_recados: form.telefone_recados.trim() || null,
        posicao_igreja: form.posicao_igreja,
        ministerio_levita: form.posicao_igreja === 'Levita' ? form.ministerio_levita || null : null,
        nome_discipulador: form.nome_discipulador.trim() || null,
        esta_em_celula: form.esta_em_celula,
        qual_celula: form.esta_em_celula ? form.qual_celula.trim() || null : null,
        foto: fotoUrl,
        perfil: 'user',
        ativo: true
      };
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: form.senha,
        options: {
          data: profilePayload
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este e-mail já está cadastrado. Tente fazer login.');
        } else {
          setError(`Erro ao criar cadastro: ${authError.message}`);
        }
        return;
      }

      if (!authData.user) {
        setError('Cadastro criado, mas não foi possível localizar o usuário.');
        return;
      }

      const payload = {
        ...profilePayload,
        nome: form.nome.trim(),
        display_name: form.nome.trim(),
        nome_planilha: form.nome.trim(),
        email,
        endereco: form.endereco.trim() || null,
        numero_casa: form.numero_casa.trim() || null,
        cep: form.cep.trim() || null,
        bairro: form.bairro.trim() || null,
        data_nasc: form.data_nasc || null,
        genero: form.genero,
        nome_pai: form.nome_pai.trim() || null,
        nome_mae: form.nome_mae.trim() || null,
        data_batismo: form.batizado ? form.data_batismo || null : null,
        igreja_batismo: form.batizado ? form.igreja_batismo.trim() || null : null,
        estado_civil: form.estado_civil || null,
        nome_conjuge: form.estado_civil === 'Casado(a)' ? form.nome_conjuge.trim() || null : null,
        profissao: form.profissao.trim() || null,
        escolaridade: form.escolaridade || null,
        telefone: form.telefone_celular || null,
        telefone_celular: form.telefone_celular.trim() || null,
        telefone_recados: form.telefone_recados.trim() || null,
        posicao_igreja: form.posicao_igreja,
        ministerio_levita: form.posicao_igreja === 'Levita' ? form.ministerio_levita || null : null,
        nome_discipulador: form.nome_discipulador.trim() || null,
        esta_em_celula: form.esta_em_celula,
        qual_celula: form.esta_em_celula ? form.qual_celula.trim() || null : null,
        perfil: 'user',
        ativo: true
      };

      const { error: updateError } = await supabase.from('membros').update(payload).eq('id', authData.user.id);

      if (updateError) {
        logger.warn('Ficha completa sera mantida pelo trigger de cadastro:', updateError, 'database');
      }

      setSuccess(true);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      logger.error('Erro inesperado no cadastro publico:', submitError, 'auth');
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
              <i className="fas fa-check text-2xl" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Cadastro Realizado
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              Seu acesso foi criado. Agora você já pode entrar no sistema com seu e-mail e senha.
            </p>
            <a
              href="/"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-brand px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition hover:brightness-110"
            >
              Ir para o Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Valentes Connected</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Cadastro de Membro
            </h1>
          </div>
          <a href="/" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand">
            Já tenho acesso
          </a>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome completo" className="md:col-span-2">
              <input className={inputClass} value={form.nome} onChange={(event) => updateForm('nome', event.target.value)} required />
            </Field>

            <Field label="E-mail">
              <input type="email" className={inputClass} value={form.email} onChange={(event) => updateForm('email', event.target.value)} required />
            </Field>

            <Field label="Data de nascimento">
              <input type="date" className={inputClass} value={form.data_nasc} onChange={(event) => updateForm('data_nasc', event.target.value)} required />
            </Field>

            <Field label="Senha">
              <input type="password" className={inputClass} value={form.senha} onChange={(event) => updateForm('senha', event.target.value)} required />
            </Field>

            <Field label="Confirmar senha">
              <input type="password" className={inputClass} value={form.confirmarSenha} onChange={(event) => updateForm('confirmarSenha', event.target.value)} required />
            </Field>

            <Field label="Sexo">
              <select className={inputClass} value={form.genero} onChange={(event) => updateForm('genero', event.target.value as FormState['genero'])} required>
                <option value="Homem">Masculino</option>
                <option value="Mulher">Feminino</option>
              </select>
            </Field>

            <Field label="Posição na igreja">
              <select className={inputClass} value={form.posicao_igreja} onChange={(event) => updateForm('posicao_igreja', event.target.value)} required>
                {POSICOES_IGREJA.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>

            {form.posicao_igreja === 'Levita' && (
              <Field label="Se Levita, qual ministério?">
                <select className={inputClass} value={form.ministerio_levita} onChange={(event) => updateForm('ministerio_levita', event.target.value)}>
                  <option value="">Selecione</option>
                  {MINISTERIOS_LEVITA.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            )}

            <Field label="Endereço">
              <input className={inputClass} value={form.endereco} onChange={(event) => updateForm('endereco', event.target.value)} required />
            </Field>

            <Field label="Nº da casa">
              <input className={inputClass} value={form.numero_casa} onChange={(event) => updateForm('numero_casa', event.target.value)} required />
            </Field>

            <Field label="CEP">
              <input className={inputClass} inputMode="numeric" value={form.cep} onChange={(event) => updateForm('cep', formatCep(event.target.value))} placeholder="00000-000" />
            </Field>

            <Field label="Bairro">
              <input className={inputClass} value={form.bairro} onChange={(event) => updateForm('bairro', event.target.value)} required />
            </Field>

            <Field label="Nome do pai">
              <input className={inputClass} value={form.nome_pai} onChange={(event) => updateForm('nome_pai', event.target.value)} required />
            </Field>

            <Field label="Nome da mãe">
              <input className={inputClass} value={form.nome_mae} onChange={(event) => updateForm('nome_mae', event.target.value)} required />
            </Field>

            <Field label="E batizado?">
              <select className={inputClass} value={form.batizado ? 'sim' : 'nao'} onChange={(event) => updateForm('batizado', event.target.value === 'sim')}>
                <option value="nao">Nao</option>
                <option value="sim">Sim</option>
              </select>
            </Field>

            {form.batizado && (
              <>
                <Field label="Data do batismo">
                  <input type="date" className={inputClass} value={form.data_batismo} onChange={(event) => updateForm('data_batismo', event.target.value)} required />
                </Field>

                <Field label="Igreja que foi batizado">
                  <input className={inputClass} value={form.igreja_batismo} onChange={(event) => updateForm('igreja_batismo', event.target.value)} required />
                </Field>
              </>
            )}

            <Field label="Estado civil">
              <select className={inputClass} value={form.estado_civil} onChange={(event) => updateForm('estado_civil', event.target.value)} required>
                {ESTADOS_CIVIS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>

            <Field label="Nome do conjuge" className={form.estado_civil === 'Casado(a)' ? '' : 'hidden'}>
              <input className={inputClass} value={form.nome_conjuge} onChange={(event) => updateForm('nome_conjuge', event.target.value)} required={form.estado_civil === 'Casado(a)'} />
            </Field>

            <Field label="Profissão">
              <input className={inputClass} value={form.profissao} onChange={(event) => updateForm('profissao', event.target.value)} />
            </Field>

            <Field label="Escolaridade">
              <select className={inputClass} value={form.escolaridade} onChange={(event) => updateForm('escolaridade', event.target.value)} required>
                {ESCOLARIDADES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>

            <Field label="Telefone celular">
              <input className={inputClass} inputMode="tel" value={form.telefone_celular} onChange={(event) => updateForm('telefone_celular', formatCellphone(event.target.value))} placeholder="(00) 00000-0000" required />
            </Field>

            <Field label="Telefone para recados">
              <input className={inputClass} value={form.telefone_recados} onChange={(event) => updateForm('telefone_recados', event.target.value)} />
            </Field>

            <Field label="Nome discipulador">
              <input className={inputClass} value={form.nome_discipulador} onChange={(event) => updateForm('nome_discipulador', event.target.value)} />
            </Field>

            <Field label="Está em célula?">
              <select className={inputClass} value={form.esta_em_celula ? 'sim' : 'nao'} onChange={(event) => updateForm('esta_em_celula', event.target.value === 'sim')}>
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </Field>

            {form.esta_em_celula && (
              <Field label="Qual a célula?">
                <input className={inputClass} value={form.qual_celula} onChange={(event) => updateForm('qual_celula', event.target.value)} />
              </Field>
            )}

            <Field label="Foto">
              <input type="file" accept="image/*" className={inputClass} onChange={(event) => updateForm('foto', event.target.files?.[0] || null)} />
            </Field>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <a href="/" className="rounded-xl border border-slate-200 px-5 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              Cancelar
            </a>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-brand px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Enviando...' : 'Finalizar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicMemberRegistration;
