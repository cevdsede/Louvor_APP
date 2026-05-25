import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { SupabaseNovoConvertidoIgreja, SupabaseVisitanteIgreja } from '../../types-supabase';
import { recordChurchAudit } from '../../utils/churchAudit';
import { showError, showSuccess } from '../../utils/toast';

type RegistryMode = 'visitors' | 'converts';

type VisitorForm = {
  data_ficha: string;
  nome: string;
  data_nascimento: string;
  endereco: string;
  bairro: string;
  telefone: string;
  e_cristao: 'sim' | 'nao' | 'nao_informado';
  deseja_oracao_lar: boolean;
  deseja_aconselhamento: boolean;
  deseja_informacoes_igreja: boolean;
  convidado_por: string;
  observacoes: string;
};

type ConvertForm = {
  nome: string;
  endereco: string;
  numero: string;
  bairro: string;
  data_nascimento: string;
  data_conversao: string;
  estado_civil: 'Solteiro(a)' | 'Casado(a)' | 'Viuvo(a)' | 'Divorciado(a)' | 'Concubinato' | '';
  email: string;
  contato: string;
  contato_recado: string;
  nome_contato_recado: string;
  observacoes: string;
};

const visitorInitialForm: VisitorForm = {
  data_ficha: new Date().toISOString().slice(0, 10),
  nome: '',
  data_nascimento: '',
  endereco: '',
  bairro: '',
  telefone: '',
  e_cristao: 'nao_informado',
  deseja_oracao_lar: false,
  deseja_aconselhamento: false,
  deseja_informacoes_igreja: false,
  convidado_por: '',
  observacoes: ''
};

const convertInitialForm: ConvertForm = {
  nome: '',
  endereco: '',
  numero: '',
  bairro: '',
  data_nascimento: '',
  data_conversao: '',
  estado_civil: '',
  email: '',
  contato: '',
  contato_recado: '',
  nome_contato_recado: '',
  observacoes: ''
};

const inputClass =
  'app-input w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10';

const textareaClass = `${inputClass} min-h-[110px] resize-y`;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatMonthLabel = (value: string) => {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
};

const isFutureDate = (value?: string) => Boolean(value) && new Date(`${value}T00:00:00`).getTime() > Date.now();

interface ChurchRegistryViewProps {
  mode: RegistryMode;
  currentUserId?: string | null;
}

const ChurchRegistryView: React.FC<ChurchRegistryViewProps> = ({ mode, currentUserId }) => {
  const table = mode === 'visitors' ? 'visitantes_igreja' : 'novos_convertidos_igreja';
  const { data: visitorsRaw, loading: visitorsLoading } = useLocalStorageFirst<SupabaseVisitanteIgreja>({
    table: 'visitantes_igreja'
  });
  const { data: convertsRaw, loading: convertsLoading } = useLocalStorageFirst<SupabaseNovoConvertidoIgreja>({
    table: 'novos_convertidos_igreja'
  });
  const [search, setSearch] = useState('');
  const [selectedBairro, setSelectedBairro] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedMonth, setSelectedMonth] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [visitorForm, setVisitorForm] = useState<VisitorForm>(visitorInitialForm);
  const [convertForm, setConvertForm] = useState<ConvertForm>(convertInitialForm);

  const isVisitors = mode === 'visitors';
  const loading = isVisitors ? visitorsLoading : convertsLoading;
  const hasSearch = search.trim().length > 0;
  const sourceItems = isVisitors ? visitorsRaw || [] : convertsRaw || [];
  const bairroOptions = useMemo(() => {
    const bairros = Array.from(
      new Set(
        sourceItems
          .map((item) => ('bairro' in item ? (item.bairro || '').trim() : ''))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return ['todos', ...bairros];
  }, [sourceItems]);

  const monthOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        sourceItems
          .map((item) =>
            isVisitors
              ? (item as SupabaseVisitanteIgreja).data_ficha?.slice(0, 7)
              : (item as SupabaseNovoConvertidoIgreja).data_conversao?.slice(0, 7)
          )
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => b.localeCompare(a));
    return ['todos', ...values];
  }, [isVisitors, sourceItems]);

  const items = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return [...sourceItems]
      .filter((item) => {
        const haystack = isVisitors
          ? `${(item as SupabaseVisitanteIgreja).nome} ${(item as SupabaseVisitanteIgreja).bairro || ''} ${(item as SupabaseVisitanteIgreja).convidado_por || ''} ${(item as SupabaseVisitanteIgreja).telefone || ''}`
          : `${(item as SupabaseNovoConvertidoIgreja).nome} ${(item as SupabaseNovoConvertidoIgreja).bairro || ''} ${(item as SupabaseNovoConvertidoIgreja).contato || ''} ${(item as SupabaseNovoConvertidoIgreja).estado_civil || ''}`;
        const matchesSearch = haystack.toLowerCase().includes(normalizedSearch);
        const matchesBairro =
          selectedBairro === 'todos' || (('bairro' in item ? item.bairro : '') || '').trim() === selectedBairro;
        const matchesMonth =
          selectedMonth === 'todos' ||
          (isVisitors
            ? (item as SupabaseVisitanteIgreja).data_ficha?.slice(0, 7)
            : (item as SupabaseNovoConvertidoIgreja).data_conversao?.slice(0, 7)) === selectedMonth;
        const matchesStatus = isVisitors
          ? selectedStatus === 'todos' ||
            (selectedStatus === 'oracao' && (item as SupabaseVisitanteIgreja).deseja_oracao_lar) ||
            (selectedStatus === 'aconselhamento' && (item as SupabaseVisitanteIgreja).deseja_aconselhamento) ||
            (selectedStatus === 'informacoes' && (item as SupabaseVisitanteIgreja).deseja_informacoes_igreja) ||
            (selectedStatus === 'cristao' && (item as SupabaseVisitanteIgreja).e_cristao === true) ||
            (selectedStatus === 'nao_cristao' && (item as SupabaseVisitanteIgreja).e_cristao === false)
          : selectedStatus === 'todos' ||
            (item as SupabaseNovoConvertidoIgreja).estado_civil === selectedStatus;

        return matchesSearch && matchesBairro && matchesMonth && matchesStatus;
      })
      .sort((a, b) => {
        const left = isVisitors
          ? (a as SupabaseVisitanteIgreja).data_ficha || (a as SupabaseVisitanteIgreja).created_at
          : (a as SupabaseNovoConvertidoIgreja).data_conversao || (a as SupabaseNovoConvertidoIgreja).created_at;
        const right = isVisitors
          ? (b as SupabaseVisitanteIgreja).data_ficha || (b as SupabaseVisitanteIgreja).created_at
          : (b as SupabaseNovoConvertidoIgreja).data_conversao || (b as SupabaseNovoConvertidoIgreja).created_at;
        return new Date(right).getTime() - new Date(left).getTime();
      });
  }, [isVisitors, search, selectedBairro, selectedMonth, selectedStatus, sourceItems]);

  const resetState = () => {
    setEditingId(null);
    setVisitorForm(visitorInitialForm);
    setConvertForm(convertInitialForm);
    setIsModalOpen(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setVisitorForm({ ...visitorInitialForm, data_ficha: new Date().toISOString().slice(0, 10) });
    setConvertForm(convertInitialForm);
    setIsModalOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    if (isVisitors) {
      const item = (visitorsRaw || []).find((entry) => entry.id === id);
      if (!item) return;
      setVisitorForm({
        data_ficha: item.data_ficha || '',
        nome: item.nome || '',
        data_nascimento: item.data_nascimento || '',
        endereco: item.endereco || '',
        bairro: item.bairro || '',
        telefone: item.telefone || '',
        e_cristao: item.e_cristao === true ? 'sim' : item.e_cristao === false ? 'nao' : 'nao_informado',
        deseja_oracao_lar: item.deseja_oracao_lar,
        deseja_aconselhamento: item.deseja_aconselhamento,
        deseja_informacoes_igreja: item.deseja_informacoes_igreja,
        convidado_por: item.convidado_por || '',
        observacoes: item.observacoes || ''
      });
    } else {
      const item = (convertsRaw || []).find((entry) => entry.id === id);
      if (!item) return;
      setConvertForm({
        nome: item.nome || '',
        endereco: item.endereco || '',
        numero: item.numero || '',
        bairro: item.bairro || '',
        data_nascimento: item.data_nascimento || '',
        data_conversao: item.data_conversao || '',
        estado_civil: item.estado_civil || '',
        email: item.email || '',
        contato: item.contato || '',
        contato_recado: item.contato_recado || '',
        nome_contato_recado: item.nome_contato_recado || '',
        observacoes: item.observacoes || ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Excluir o cadastro de "${name}"?`);
    if (!confirmed) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      showError('Erro ao excluir cadastro.');
      return;
    }
    await LocalStorageFirstService.forceSync(table);
    await recordChurchAudit({
      action: 'delete',
      entity: table,
      entityId: id,
      userId: currentUserId,
      description: `Cadastro removido: ${name}`,
      payload: { nome: name }
    });
    showSuccess('Cadastro excluido.');
  };

  const saveVisitor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!visitorForm.nome.trim()) {
      showError('Informe o nome do visitante.');
      return;
    }
    if (!visitorForm.data_ficha) {
      showError('Informe a data da ficha.');
      return;
    }
    if (isFutureDate(visitorForm.data_ficha)) {
      showError('A data da ficha nao pode ser no futuro.');
      return;
    }
    if (visitorForm.data_nascimento && isFutureDate(visitorForm.data_nascimento)) {
      showError('A data de nascimento nao pode ser no futuro.');
      return;
    }
    if (!visitorForm.telefone.trim() && !visitorForm.endereco.trim()) {
      showError('Informe pelo menos um telefone ou endereco do visitante.');
      return;
    }

    setSaving(true);
    try {
      const duplicate = (visitorsRaw || []).find(
        (item) =>
          item.id !== editingId &&
          item.nome.trim().toLowerCase() === visitorForm.nome.trim().toLowerCase() &&
          (item.data_ficha || '') === (visitorForm.data_ficha || '')
      );
      if (duplicate) {
        showError('Ja existe um visitante com este nome nesta mesma data.');
        return;
      }

      const payload = {
        data_ficha: visitorForm.data_ficha || new Date().toISOString().slice(0, 10),
        nome: visitorForm.nome.trim(),
        data_nascimento: visitorForm.data_nascimento || null,
        endereco: visitorForm.endereco.trim() || null,
        bairro: visitorForm.bairro.trim() || null,
        telefone: visitorForm.telefone.trim() || null,
        e_cristao:
          visitorForm.e_cristao === 'sim' ? true : visitorForm.e_cristao === 'nao' ? false : null,
        deseja_oracao_lar: visitorForm.deseja_oracao_lar,
        deseja_aconselhamento: visitorForm.deseja_aconselhamento,
        deseja_informacoes_igreja: visitorForm.deseja_informacoes_igreja,
        convidado_por: visitorForm.convidado_por.trim() || null,
        observacoes: visitorForm.observacoes.trim() || null,
        ...(editingId ? {} : { created_by: currentUserId || null })
      };

      const request = editingId
        ? supabase.from('visitantes_igreja').update(payload).eq('id', editingId)
        : supabase.from('visitantes_igreja').insert(payload);
      const { error } = await request;
      if (error) throw error;
      await LocalStorageFirstService.forceSync('visitantes_igreja');
      await recordChurchAudit({
        action: editingId ? 'update' : 'create',
        entity: 'visitantes_igreja',
        entityId: editingId,
        userId: currentUserId,
        description: editingId ? `Visitante atualizado: ${payload.nome}` : `Visitante cadastrado: ${payload.nome}`,
        payload: {
          nome: payload.nome,
          data_ficha: payload.data_ficha,
          bairro: payload.bairro
        }
      });
      resetState();
      showSuccess(editingId ? 'Visitante atualizado.' : 'Visitante cadastrado.');
    } catch (error) {
      console.error('Erro ao salvar visitante:', error);
      showError('Erro ao salvar visitante.');
    } finally {
      setSaving(false);
    }
  };

  const saveConvert = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!convertForm.nome.trim()) {
      showError('Informe o nome do novo convertido.');
      return;
    }
    if (convertForm.email.trim() && !emailRegex.test(convertForm.email.trim())) {
      showError('Informe um e-mail valido.');
      return;
    }
    if (convertForm.data_nascimento && isFutureDate(convertForm.data_nascimento)) {
      showError('A data de nascimento nao pode ser no futuro.');
      return;
    }
    if (convertForm.data_conversao && isFutureDate(convertForm.data_conversao)) {
      showError('A data da conversao nao pode ser no futuro.');
      return;
    }
    if (!convertForm.contato.trim() && !convertForm.contato_recado.trim() && !convertForm.email.trim()) {
      showError('Informe pelo menos um contato principal do novo convertido.');
      return;
    }

    setSaving(true);
    try {
      const duplicate = (convertsRaw || []).find(
        (item) =>
          item.id !== editingId &&
          item.nome.trim().toLowerCase() === convertForm.nome.trim().toLowerCase() &&
          (item.data_conversao || '') === (convertForm.data_conversao || '')
      );
      if (duplicate) {
        showError('Ja existe um novo convertido com este nome e esta data de conversao.');
        return;
      }

      const payload = {
        nome: convertForm.nome.trim(),
        endereco: convertForm.endereco.trim() || null,
        numero: convertForm.numero.trim() || null,
        bairro: convertForm.bairro.trim() || null,
        data_nascimento: convertForm.data_nascimento || null,
        data_conversao: convertForm.data_conversao || null,
        estado_civil: convertForm.estado_civil || null,
        email: convertForm.email.trim().toLowerCase() || null,
        contato: convertForm.contato.trim() || null,
        contato_recado: convertForm.contato_recado.trim() || null,
        nome_contato_recado: convertForm.nome_contato_recado.trim() || null,
        observacoes: convertForm.observacoes.trim() || null,
        ...(editingId ? {} : { created_by: currentUserId || null })
      };

      const request = editingId
        ? supabase.from('novos_convertidos_igreja').update(payload).eq('id', editingId)
        : supabase.from('novos_convertidos_igreja').insert(payload);
      const { error } = await request;
      if (error) throw error;
      await LocalStorageFirstService.forceSync('novos_convertidos_igreja');
      await recordChurchAudit({
        action: editingId ? 'update' : 'create',
        entity: 'novos_convertidos_igreja',
        entityId: editingId,
        userId: currentUserId,
        description: editingId ? `Novo convertido atualizado: ${payload.nome}` : `Novo convertido cadastrado: ${payload.nome}`,
        payload: {
          nome: payload.nome,
          data_conversao: payload.data_conversao,
          bairro: payload.bairro
        }
      });
      resetState();
      showSuccess(editingId ? 'Cadastro atualizado.' : 'Novo convertido cadastrado.');
    } catch (error) {
      console.error('Erro ao salvar novo convertido:', error);
      showError('Erro ao salvar novo convertido.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">
            {isVisitors ? 'Recepcao' : 'Acompanhamento'}
          </p>
          <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {isVisitors ? 'Cadastro de visitantes' : 'Cadastro de novos convertidos'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-app-muted">
            {isVisitors
              ? 'Registre quem visitou a igreja e acompanhe pedidos de oracao, aconselhamento e interesse em conhecer a igreja.'
              : 'Registre os novos convertidos para acompanhamento pastoral e organizacao dos contatos principais.'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
        >
          <i className="fas fa-plus" />
          {isVisitors ? 'Novo visitante' : 'Novo cadastro'}
        </button>
      </div>

      <div className="app-card rounded-2xl border p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              {isVisitors ? 'Cadastros de visitantes' : 'Cadastros de novos convertidos'}
            </h2>
            <p className="mt-1 text-xs font-medium text-app-muted">
              {loading
                ? 'Sincronizando registros com o banco...'
                : hasSearch
                  ? `${items.length} resultado(s) para a busca atual`
                  : `${items.length} registro(s) encontrado(s)`}
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="relative w-full">
              <i className="fas fa-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-app-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isVisitors ? 'Buscar visitante...' : 'Buscar cadastro...'}
                className="app-input w-full rounded-xl py-3 pl-10 pr-4 text-sm font-semibold"
              />
            </div>
            <select
              value={selectedBairro}
              onChange={(event) => setSelectedBairro(event.target.value)}
              className="app-input w-full rounded-xl px-4 py-3 text-sm font-semibold"
            >
              <option value="todos">Todos os bairros</option>
              {bairroOptions.filter((option) => option !== 'todos').map((bairro) => (
                <option key={bairro} value={bairro}>
                  {bairro}
                </option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="app-input w-full rounded-xl px-4 py-3 text-sm font-semibold"
            >
              <option value="todos">Todos os meses</option>
              {monthOptions.filter((option) => option !== 'todos').map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="app-input w-full rounded-xl px-4 py-3 text-sm font-semibold"
            >
              {isVisitors ? (
                <>
                  <option value="todos">Todos os status</option>
                  <option value="oracao">Com pedido de oracao</option>
                  <option value="aconselhamento">Com aconselhamento</option>
                  <option value="informacoes">Pediu informacoes</option>
                  <option value="cristao">Cristao</option>
                  <option value="nao_cristao">Nao cristao</option>
                </>
              ) : (
                <>
                  <option value="todos">Todos os estados civis</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Viuvo(a)">Viuvo(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Concubinato">Concubinato</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`registry-loading-${index}`}
                className="app-card-muted animate-pulse rounded-2xl border p-5"
              >
                <div className="h-3 w-24 rounded-full bg-app-surface-strong" />
                <div className="mt-4 h-5 w-2/3 rounded-full bg-app-surface-strong" />
                <div className="mt-5 space-y-3">
                  <div className="h-3 w-full rounded-full bg-app-surface-strong" />
                  <div className="h-3 w-5/6 rounded-full bg-app-surface-strong" />
                  <div className="h-3 w-4/6 rounded-full bg-app-surface-strong" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="app-panel-muted rounded-2xl border border-dashed border-app px-5 py-12 text-center lg:col-span-2">
              <i className={`fas ${isVisitors ? 'fa-user-group' : 'fa-seedling'} text-2xl text-app-muted`} />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                {hasSearch
                  ? 'Nenhum cadastro encontrado para esta busca.'
                  : isVisitors
                    ? 'Nenhum visitante cadastrado ainda.'
                    : 'Nenhum novo convertido cadastrado ainda.'}
              </p>
              <p className="mt-1 text-xs font-medium text-app-muted">
                {hasSearch
                  ? 'Tente buscar por outro nome, bairro, telefone ou convite para localizar o cadastro.'
                  : isVisitors
                    ? 'Use o botao acima para registrar a ficha de visitante.'
                    : 'Use o botao acima para registrar a ficha de novo convertido.'}
              </p>
            </div>
          ) : (
            items.map((item) =>
              isVisitors ? (
                <VisitorCard
                  key={(item as SupabaseVisitanteIgreja).id}
                  item={item as SupabaseVisitanteIgreja}
                  onEdit={() => openEdit((item as SupabaseVisitanteIgreja).id)}
                  onDelete={() => handleDelete((item as SupabaseVisitanteIgreja).id, (item as SupabaseVisitanteIgreja).nome)}
                />
              ) : (
                <ConvertCard
                  key={(item as SupabaseNovoConvertidoIgreja).id}
                  item={item as SupabaseNovoConvertidoIgreja}
                  onEdit={() => openEdit((item as SupabaseNovoConvertidoIgreja).id)}
                  onDelete={() =>
                    handleDelete((item as SupabaseNovoConvertidoIgreja).id, (item as SupabaseNovoConvertidoIgreja).nome)
                  }
                />
              )
            )
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[720] overflow-y-auto bg-slate-950/60 px-3 py-4 pb-24 backdrop-blur-sm sm:px-4 sm:py-6">
          <form
            onSubmit={isVisitors ? saveVisitor : saveConvert}
            className="app-card mx-auto max-w-4xl rounded-2xl border shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-app bg-app-surface p-4 sm:p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                  {editingId ? 'Editar cadastro' : 'Novo cadastro'}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {isVisitors ? 'Ficha de visitante' : 'Ficha de novo convertido'}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetState}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-app-surface-strong hover:text-red-500"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              {isVisitors ? (
                <VisitorFormFields form={visitorForm} setForm={setVisitorForm} />
              ) : (
                <ConvertFormFields form={convertForm} setForm={setConvertForm} />
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-app pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetState}
                  className="app-btn-muted rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-brand px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Salvar cadastro'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const VisitorFormFields: React.FC<{
  form: VisitorForm;
  setForm: React.Dispatch<React.SetStateAction<VisitorForm>>;
}> = ({ form, setForm }) => (
  <>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Data da ficha">
        <input
          type="date"
          value={form.data_ficha}
          onChange={(event) => setForm((prev) => ({ ...prev, data_ficha: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Nome">
        <input
          value={form.nome}
          onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Data de nascimento">
        <input
          type="date"
          value={form.data_nascimento}
          onChange={(event) => setForm((prev) => ({ ...prev, data_nascimento: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Telefone">
        <input
          value={form.telefone}
          onChange={(event) => setForm((prev) => ({ ...prev, telefone: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Endereco" className="md:col-span-2">
        <input
          value={form.endereco}
          onChange={(event) => setForm((prev) => ({ ...prev, endereco: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Bairro">
        <input
          value={form.bairro}
          onChange={(event) => setForm((prev) => ({ ...prev, bairro: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Veio a convite de quem?">
        <input
          value={form.convidado_por}
          onChange={(event) => setForm((prev) => ({ ...prev, convidado_por: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Eh cristao?">
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'sim', label: 'Sim' },
            { value: 'nao', label: 'Nao' },
            { value: 'nao_informado', label: 'Nao informou' }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, e_cristao: option.value as VisitorForm['e_cristao'] }))}
              className={`rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition ${
                form.e_cristao === option.value ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'app-btn-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="O que gostaria de receber?" className="md:col-span-2">
        <div className="grid gap-2 sm:grid-cols-3">
          <ChoiceToggle
            label="Oracao no lar"
            checked={form.deseja_oracao_lar}
            onChange={(checked) => setForm((prev) => ({ ...prev, deseja_oracao_lar: checked }))}
          />
          <ChoiceToggle
            label="Aconselhamento"
            checked={form.deseja_aconselhamento}
            onChange={(checked) => setForm((prev) => ({ ...prev, deseja_aconselhamento: checked }))}
          />
          <ChoiceToggle
            label="Informacoes da igreja"
            checked={form.deseja_informacoes_igreja}
            onChange={(checked) => setForm((prev) => ({ ...prev, deseja_informacoes_igreja: checked }))}
          />
        </div>
      </Field>
      <Field label="Observacoes" className="md:col-span-2">
        <textarea
          value={form.observacoes}
          onChange={(event) => setForm((prev) => ({ ...prev, observacoes: event.target.value }))}
          className={textareaClass}
        />
      </Field>
    </div>
  </>
);

const ConvertFormFields: React.FC<{
  form: ConvertForm;
  setForm: React.Dispatch<React.SetStateAction<ConvertForm>>;
}> = ({ form, setForm }) => (
  <div className="grid gap-4 md:grid-cols-2">
    <Field label="Nome">
      <input
        value={form.nome}
        onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Contato">
      <input
        value={form.contato}
        onChange={(event) => setForm((prev) => ({ ...prev, contato: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Endereco">
      <input
        value={form.endereco}
        onChange={(event) => setForm((prev) => ({ ...prev, endereco: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Numero">
      <input
        value={form.numero}
        onChange={(event) => setForm((prev) => ({ ...prev, numero: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Bairro">
      <input
        value={form.bairro}
        onChange={(event) => setForm((prev) => ({ ...prev, bairro: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="E-mail">
      <input
        type="email"
        value={form.email}
        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Data de nascimento">
      <input
        type="date"
        value={form.data_nascimento}
        onChange={(event) => setForm((prev) => ({ ...prev, data_nascimento: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Data da conversao">
      <input
        type="date"
        value={form.data_conversao}
        onChange={(event) => setForm((prev) => ({ ...prev, data_conversao: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Estado civil" className="md:col-span-2">
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {['Solteiro(a)', 'Casado(a)', 'Viuvo(a)', 'Divorciado(a)', 'Concubinato'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, estado_civil: option as ConvertForm['estado_civil'] }))}
            className={`rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest transition ${
              form.estado_civil === option ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'app-btn-muted'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </Field>
    <Field label="Contato para recado">
      <input
        value={form.contato_recado}
        onChange={(event) => setForm((prev) => ({ ...prev, contato_recado: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Nome do contato para recado">
      <input
        value={form.nome_contato_recado}
        onChange={(event) => setForm((prev) => ({ ...prev, nome_contato_recado: event.target.value }))}
        className={inputClass}
      />
    </Field>
    <Field label="Observacoes" className="md:col-span-2">
      <textarea
        value={form.observacoes}
        onChange={(event) => setForm((prev) => ({ ...prev, observacoes: event.target.value }))}
        className={textareaClass}
      />
    </Field>
  </div>
);

const VisitorCard: React.FC<{
  item: SupabaseVisitanteIgreja;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, onEdit, onDelete }) => (
  <div className="app-card-strong rounded-2xl border p-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-black text-slate-900 dark:text-white">{item.nome}</h3>
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
            {formatDate(item.data_ficha)}
          </span>
          {item.e_cristao !== null && item.e_cristao !== undefined && (
            <span className="rounded-full bg-app-surface px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-app-muted">
              {item.e_cristao ? 'Cristao' : 'Nao cristao'}
            </span>
          )}
        </div>
        <div className="grid gap-2 text-sm font-medium text-app-muted sm:grid-cols-2">
          <InfoLine icon="fas fa-phone" label={item.telefone || 'Sem telefone'} />
          <InfoLine icon="fas fa-location-dot" label={item.bairro || 'Sem bairro'} />
          <InfoLine icon="fas fa-cake-candles" label={item.data_nascimento ? formatDate(item.data_nascimento) : 'Nascimento nao informado'} />
          <InfoLine icon="fas fa-user-plus" label={item.convidado_por || 'Convite nao informado'} />
        </div>
        {(item.endereco || item.observacoes) && (
          <div className="app-panel-muted rounded-xl px-4 py-3 text-sm font-medium text-app-muted">
            {item.endereco && <p>{item.endereco}</p>}
            {item.observacoes && <p className={item.endereco ? 'mt-2' : ''}>{item.observacoes}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {item.deseja_oracao_lar && <SmallBadge label="Oracao no lar" />}
          {item.deseja_aconselhamento && <SmallBadge label="Aconselhamento" />}
          {item.deseja_informacoes_igreja && <SmallBadge label="Informacoes da igreja" />}
        </div>
      </div>
      <ActionButtons onEdit={onEdit} onDelete={onDelete} />
    </div>
  </div>
);

const ConvertCard: React.FC<{
  item: SupabaseNovoConvertidoIgreja;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, onEdit, onDelete }) => (
  <div className="app-card-strong rounded-2xl border p-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-black text-slate-900 dark:text-white">{item.nome}</h3>
          {item.data_conversao && (
            <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
              Conversao em {formatDate(item.data_conversao)}
            </span>
          )}
          {item.estado_civil && (
            <span className="rounded-full bg-app-surface px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-app-muted">
              {item.estado_civil}
            </span>
          )}
        </div>
        <div className="grid gap-2 text-sm font-medium text-app-muted sm:grid-cols-2">
          <InfoLine icon="fas fa-phone" label={item.contato || 'Sem contato principal'} />
          <InfoLine icon="fas fa-envelope" label={item.email || 'Sem e-mail'} />
          <InfoLine icon="fas fa-location-dot" label={item.bairro || 'Sem bairro'} />
          <InfoLine icon="fas fa-cake-candles" label={item.data_nascimento ? formatDate(item.data_nascimento) : 'Nascimento nao informado'} />
        </div>
        {(item.endereco || item.numero) && (
          <div className="app-panel-muted rounded-xl px-4 py-3 text-sm font-medium text-app-muted">
            <p>{[item.endereco, item.numero && `nº ${item.numero}`].filter(Boolean).join(', ')}</p>
          </div>
        )}
        {(item.contato_recado || item.nome_contato_recado || item.observacoes) && (
          <div className="app-panel-muted rounded-xl px-4 py-3 text-sm font-medium text-app-muted">
            {item.nome_contato_recado && <p>Recado com: {item.nome_contato_recado}</p>}
            {item.contato_recado && <p className={item.nome_contato_recado ? 'mt-1' : ''}>Telefone para recado: {item.contato_recado}</p>}
            {item.observacoes && <p className={item.contato_recado || item.nome_contato_recado ? 'mt-2' : ''}>{item.observacoes}</p>}
          </div>
        )}
      </div>
      <ActionButtons onEdit={onEdit} onDelete={onDelete} />
    </div>
  </div>
);

const ActionButtons: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => (
  <div className="flex shrink-0 gap-2 self-start">
    <button
      type="button"
      onClick={onEdit}
      className="app-btn-muted rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest"
    >
      Editar
    </button>
    <button
      type="button"
      onClick={onDelete}
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
    >
      Excluir
    </button>
  </div>
);

const Field: React.FC<{
  label: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, className, children }) => (
  <label className={`block space-y-2 ${className || ''}`}>
    <span className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    {children}
  </label>
);

const ChoiceToggle: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({
  label,
  checked,
  onChange
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`rounded-xl border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition ${
      checked ? 'border-brand bg-brand text-white shadow-lg shadow-brand/20' : 'border-app bg-app-surface text-app-muted'
    }`}
  >
    {label}
  </button>
);

const InfoLine: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2">
    <i className={`${icon} text-xs text-brand`} />
    <span>{label}</span>
  </div>
);

const SmallBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="rounded-full bg-app-surface px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-app-muted">
    {label}
  </span>
);

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

export default ChurchRegistryView;
