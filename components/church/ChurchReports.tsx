import React, { useEffect, useMemo, useState } from 'react';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { supabase } from '../../supabaseClient';
import { SupabaseMembro, SupabaseNovoConvertidoIgreja, SupabaseVisitanteIgreja } from '../../types-supabase';
import { getDisplayName } from '../../utils/displayName';
import { showError } from '../../utils/toast';

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const formatMonthLabel = (value: string) => {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
};

const getMonthInputValue = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

type ReportGroup = 'members-statistics' | 'monthly-consolidation';
type MemberStatisticType = 'total-members' | 'by-neighborhood' | 'by-gender' | 'by-education';
type ReportDetailRow = {
  title: string;
  meta?: string;
  extra?: string;
};
type ReportDetail = {
  title: string;
  subtitle: string;
  columns: string[];
  items: ReportDetailRow[];
};

const reportGroups: Array<{ id: ReportGroup; label: string; icon: string }> = [
  { id: 'members-statistics', label: 'Estatistico de membros', icon: 'fas fa-chart-pie' },
  { id: 'monthly-consolidation', label: 'Consolidacao mensal', icon: 'fas fa-calendar-check' }
];

const statisticOptions: Array<{ id: MemberStatisticType; label: string; icon: string }> = [
  { id: 'total-members', label: 'Total de membros', icon: 'fas fa-users' },
  { id: 'by-neighborhood', label: 'Por bairro', icon: 'fas fa-location-dot' },
  { id: 'by-gender', label: 'Por genero', icon: 'fas fa-venus-mars' },
  { id: 'by-education', label: 'Escolaridade', icon: 'fas fa-graduation-cap' }
];

const hasAnyReportData = (membersCount: number, visitorsCount: number, convertsCount: number) =>
  membersCount > 0 || visitorsCount > 0 || convertsCount > 0;

const ChurchReports: React.FC<{ canExport?: boolean }> = ({ canExport = false }) => {
  const { currentMember } = useMinistryContext();
  const [membersRaw, setMembersRaw] = useState<SupabaseMembro[]>([]);
  const [visitorsRaw, setVisitorsRaw] = useState<SupabaseVisitanteIgreja[]>([]);
  const [convertsRaw, setConvertsRaw] = useState<SupabaseNovoConvertidoIgreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getMonthInputValue);
  const [selectedGroup, setSelectedGroup] = useState<ReportGroup>('members-statistics');
  const [selectedStatistic, setSelectedStatistic] = useState<MemberStatisticType>('total-members');
  const [selectedDetail, setSelectedDetail] = useState<ReportDetail | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingSheet, setExportingSheet] = useState(false);
  const [copyingText, setCopyingText] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadReportData = async (showLoadingState = true) => {
      if (showLoadingState) setLoading(true);
      else setRefreshing(true);
      try {
        const [membersResponse, visitorsResponse, convertsResponse] = await Promise.all([
          supabase
            .from('membros')
            .select('id, nome, display_name, nome_planilha, email, genero, perfil, bairro, escolaridade, created_at'),
          supabase
            .from('visitantes_igreja')
            .select('id, data_ficha, nome, data_nascimento, endereco, bairro, telefone, e_cristao, deseja_oracao_lar, deseja_aconselhamento, deseja_informacoes_igreja, convidado_por, observacoes, created_by, created_at, updated_at'),
          supabase
            .from('novos_convertidos_igreja')
            .select('id, nome, endereco, numero, bairro, data_nascimento, data_conversao, estado_civil, email, contato, contato_recado, nome_contato_recado, observacoes, created_by, created_at, updated_at')
        ]);

        if (membersResponse.error) throw membersResponse.error;
        if (visitorsResponse.error) throw visitorsResponse.error;
        if (convertsResponse.error) throw convertsResponse.error;

        if (!mounted) return;
        setMembersRaw((membersResponse.data || []) as SupabaseMembro[]);
        setVisitorsRaw((visitorsResponse.data || []) as SupabaseVisitanteIgreja[]);
        setConvertsRaw((convertsResponse.data || []) as SupabaseNovoConvertidoIgreja[]);
      } catch (error) {
        console.error('Erro ao carregar relatorios do banco:', error);
        showError('Erro ao carregar dados dos relatorios.');
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadReportData();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshReportData = async () => {
    setSelectedDetail(null);
    setRefreshing(true);
    try {
      const [membersResponse, visitorsResponse, convertsResponse] = await Promise.all([
        supabase
          .from('membros')
          .select('id, nome, display_name, nome_planilha, email, genero, perfil, bairro, escolaridade, created_at'),
        supabase
          .from('visitantes_igreja')
          .select('id, data_ficha, nome, data_nascimento, endereco, bairro, telefone, e_cristao, deseja_oracao_lar, deseja_aconselhamento, deseja_informacoes_igreja, convidado_por, observacoes, created_by, created_at, updated_at'),
        supabase
          .from('novos_convertidos_igreja')
          .select('id, nome, endereco, numero, bairro, data_nascimento, data_conversao, estado_civil, email, contato, contato_recado, nome_contato_recado, observacoes, created_by, created_at, updated_at')
      ]);

      if (membersResponse.error) throw membersResponse.error;
      if (visitorsResponse.error) throw visitorsResponse.error;
      if (convertsResponse.error) throw convertsResponse.error;

      setMembersRaw((membersResponse.data || []) as SupabaseMembro[]);
      setVisitorsRaw((visitorsResponse.data || []) as SupabaseVisitanteIgreja[]);
      setConvertsRaw((convertsResponse.data || []) as SupabaseNovoConvertidoIgreja[]);
      showSuccess('Relatorios atualizados com os dados mais recentes do banco.');
    } catch (error) {
      console.error('Erro ao atualizar relatorios do banco:', error);
      showError('Nao foi possivel atualizar os relatorios agora.');
    } finally {
      setRefreshing(false);
    }
  };

  const members = membersRaw || [];
  const visitors = visitorsRaw || [];
  const converts = convertsRaw || [];
  const memberName = (member: SupabaseMembro) => getDisplayName(member) || member.nome || 'Membro sem nome';

  const totalMembers = members.length;
  const reportHasData = hasAnyReportData(members.length, visitors.length, converts.length);

  const neighborhoodDistribution = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((member) => {
      const bairro = member.bairro?.trim() || 'Nao Informado';
      map.set(bairro, (map.get(bairro) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
  }, [members]);

  const genderSummary = useMemo(() => {
    const feminino = members.filter((member) => normalize(member.genero) === 'mulher').length;
    const masculino = members.filter((member) => normalize(member.genero) === 'homem').length;
    const naoInformado = Math.max(0, totalMembers - feminino - masculino);
    return { feminino, masculino, naoInformado };
  }, [members, totalMembers]);

  const educationSummary = useMemo(() => {
    const summary = {
      medioCompleto: 0,
      medioIncompleto: 0,
      superiorCompleto: 0,
      superiorIncompleto: 0,
      fundamental: 0,
      nenhuma: 0,
      naoInformado: 0
    };

    members.forEach((member) => {
      const escolaridade = normalize(member.escolaridade);
      if (!escolaridade) summary.naoInformado += 1;
      else if (escolaridade === 'nenhuma') summary.nenhuma += 1;
      else if (escolaridade.includes('ensino medio incompleto')) summary.medioIncompleto += 1;
      else if (escolaridade.includes('ensino medio')) summary.medioCompleto += 1;
      else if (escolaridade.includes('superior incompleto')) summary.superiorIncompleto += 1;
      else if (escolaridade.includes('superior')) summary.superiorCompleto += 1;
      else if (escolaridade.includes('fundamental')) summary.fundamental += 1;
      else summary.naoInformado += 1;
    });

    return summary;
  }, [members]);

  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number);
  const isInSelectedMonth = (value?: string | null) => {
    if (!value) return false;
    const date = new Date(`${value}T00:00:00`);
    return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonthNumber;
  };

  const monthlyConvertsList = useMemo(
    () => converts.filter((item) => isInSelectedMonth(item.data_conversao)),
    [converts, selectedMonth]
  );
  const monthlyVisitorsList = useMemo(
    () => visitors.filter((item) => isInSelectedMonth(item.data_ficha)),
    [visitors, selectedMonth]
  );

  const monthlySummary = useMemo(
    () => ({
      newConverts: monthlyConvertsList.length,
      totalVisitors: monthlyVisitorsList.length,
      homePrayerRequests: monthlyVisitorsList.filter((item) => item.deseja_oracao_lar).length,
      counselingRequests: monthlyVisitorsList.filter((item) => item.deseja_aconselhamento).length,
      infoRequests: monthlyVisitorsList.filter((item) => item.deseja_informacoes_igreja).length
    }),
    [monthlyConvertsList, monthlyVisitorsList]
  );

  const selectedReportLabel =
    selectedGroup === 'monthly-consolidation'
      ? 'Consolidacao mensal'
      : statisticOptions.find((item) => item.id === selectedStatistic)?.label || '';
  const issuerName = getDisplayName((currentMember as SupabaseMembro | null) || null) || 'Usuario do sistema';

  const openDetail = (title: string, subtitle: string, columns: string[], items: ReportDetailRow[]) => {
    setSelectedDetail({
      title,
      subtitle,
      columns,
      items: [...items].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    });
  };

  const getMembersByNeighborhood = (bairro: string) =>
    members
      .filter((member) => (member.bairro?.trim() || 'Nao Informado') === bairro)
      .map((member) => ({
        title: memberName(member),
        meta: member.bairro?.trim() || 'Nao Informado',
        extra: member.email || ''
      }));

  const getMembersByGender = (gender: 'feminino' | 'masculino' | 'naoInformado') =>
    members
      .filter((member) => {
        const normalized = normalize(member.genero);
        if (gender === 'feminino') return normalized === 'mulher';
        if (gender === 'masculino') return normalized === 'homem';
        return normalized !== 'mulher' && normalized !== 'homem';
      })
      .map((member) => ({
        title: memberName(member),
        meta: member.genero || 'Nao informado',
        extra: member.bairro?.trim() || 'Sem bairro'
      }));

  const getMembersByEducation = (bucket: keyof typeof educationSummary) =>
    members
      .filter((member) => {
        const escolaridade = normalize(member.escolaridade);
        if (bucket === 'naoInformado') {
          return (
            !escolaridade ||
            (!escolaridade.includes('fundamental') &&
              !escolaridade.includes('medio') &&
              !escolaridade.includes('superior') &&
              escolaridade !== 'nenhuma')
          );
        }
        if (bucket === 'nenhuma') return escolaridade === 'nenhuma';
        if (bucket === 'medioIncompleto') return escolaridade.includes('ensino medio incompleto');
        if (bucket === 'medioCompleto') return escolaridade.includes('ensino medio') && !escolaridade.includes('incompleto');
        if (bucket === 'superiorIncompleto') return escolaridade.includes('superior incompleto');
        if (bucket === 'superiorCompleto') return escolaridade.includes('superior') && !escolaridade.includes('incompleto');
        if (bucket === 'fundamental') return escolaridade.includes('fundamental');
        return false;
      })
      .map((member) => ({
        title: memberName(member),
        meta: member.escolaridade || 'Nao informada',
        extra: member.bairro?.trim() || 'Sem bairro'
      }));

  const exportToPdf = async () => {
    setExporting(true);
    try {
      const printWindow = window.open('', '_blank', 'width=1024,height=768');
      if (!printWindow) {
        showError('Nao foi possivel abrir a janela de exportacao.');
        return;
      }

      const title = `Relatorio - ${selectedReportLabel}`;
      const reportHtml = buildPrintableReport({
        selectedGroup,
        selectedStatistic,
        selectedMonth,
        totalMembers,
        neighborhoodDistribution,
        genderSummary,
        educationSummary,
        monthlySummary,
        selectedDetail
      });
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { margin: 0; padding: 24px; font-family: Arial, sans-serif; background: #fff; color: #111827; }
              .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #dbeafe; }
              .logo { width: 56px; height: 56px; border-radius: 16px; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; }
              .church { font-size: 12px; text-transform: uppercase; letter-spacing: 0.22em; color: #2563eb; margin-bottom: 6px; font-weight: 800; }
              h1 { font-size: 22px; margin: 0 0 8px; }
              h2 { font-size: 18px; margin: 0 0 16px; }
              p { margin: 0 0 12px; line-height: 1.5; }
              .eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #2563eb; margin-bottom: 12px; }
              .card { border: 1px solid #d1d5db; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
              .metric { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .metric:last-child { border-bottom: 0; }
              .label { font-weight: 700; }
              .value { font-weight: 800; color: #1d4ed8; }
              .quote { margin-top: 20px; padding: 16px; border-left: 4px solid #2563eb; background: #eff6ff; border-radius: 8px; }
              .meta { display: flex; justify-content: space-between; gap: 16px; margin: 18px 0 22px; font-size: 12px; color: #4b5563; }
              .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #d1d5db; font-size: 12px; color: #4b5563; }
              .signature { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
              .signature-line { padding-top: 32px; border-top: 1px solid #9ca3af; text-align: center; font-size: 12px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">VD</div>
              <div>
                <div class="church">Valentes de Davi</div>
                <h1>${title}</h1>
                <p>Comunidade Evangelica Valentes de Davi</p>
              </div>
            </div>
            <div class="meta">
              <span>Emitido em: ${new Date().toLocaleString('pt-BR')}</span>
              <span>Tipo: ${selectedReportLabel}</span>
            </div>
            ${reportHtml}
            <div class="signature">
              <div class="signature-line">${issuerName}<br />Responsavel pela emissao</div>
              <div class="signature-line">Lideranca / Secretaria</div>
            </div>
            <div class="footer">
              Documento gerado pelo sistema interno da igreja para acompanhamento administrativo e ministerial.
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    } catch (error) {
      console.error('Erro ao exportar relatorio:', error);
      showError('Erro ao exportar relatorio em PDF.');
    } finally {
      setExporting(false);
    }
  };

  const exportToSpreadsheet = () => {
    setExportingSheet(true);
    try {
      const rows = buildSpreadsheetRows({
        selectedGroup,
        selectedStatistic,
        selectedMonth,
        totalMembers,
        neighborhoodDistribution,
        genderSummary,
        educationSummary,
        monthlySummary,
        issuerName,
        selectedDetail
      });

      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';'))
        .join('\n');

      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-${slugify(selectedReportLabel)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar planilha:', error);
      showError('Erro ao exportar planilha.');
    } finally {
      setExportingSheet(false);
    }
  };

  const copyReportText = async () => {
    setCopyingText(true);
    try {
      const text = buildTextReport({
        selectedGroup,
        selectedStatistic,
        selectedMonth,
        totalMembers,
        neighborhoodDistribution,
        genderSummary,
        educationSummary,
        monthlySummary,
        selectedDetail,
        issuerName
      });
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Erro ao copiar relatorio:', error);
      showError('Erro ao copiar relatorio.');
    } finally {
      setCopyingText(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Relatorios</p>
          <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Central de relatorios
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-app-muted">
            Escolha qual relatorio deseja visualizar. Ao clicar nos dados, voce ve as pessoas ligadas a eles.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:w-auto sm:items-end">
          {selectedGroup === 'monthly-consolidation' && (
            <label className="block sm:w-[220px]">
              <span className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Mes do consolidado</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setSelectedDetail(null);
                }}
                className="app-input w-full rounded-2xl px-4 py-3 text-sm font-semibold"
              />
            </label>
          )}
          <button
            type="button"
            onClick={refreshReportData}
            disabled={loading || refreshing}
            className="app-btn-muted inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
          >
            <i className={`fas ${refreshing ? 'fa-spinner animate-spin' : 'fa-rotate-right'}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar dados'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {reportGroups.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setSelectedGroup(option.id);
              setSelectedDetail(null);
            }}
            className={`rounded-[1.5rem] border p-4 text-left transition ${
              selectedGroup === option.id ? 'border-brand bg-brand text-white shadow-xl shadow-brand/20' : 'app-card text-app'
            }`}
          >
            <i className={`${option.icon} text-lg`} />
            <p className="mt-3 text-sm font-black uppercase tracking-widest">{option.label}</p>
          </button>
        ))}
      </div>

      {selectedGroup === 'members-statistics' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statisticOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSelectedStatistic(option.id);
                setSelectedDetail(null);
              }}
              className={`rounded-[1.5rem] border p-4 text-left transition ${
                selectedStatistic === option.id ? 'border-brand bg-brand/10 text-brand shadow-lg shadow-brand/10' : 'app-card text-app'
              }`}
            >
              <i className={`${option.icon} text-lg`} />
              <p className="mt-3 text-sm font-black uppercase tracking-widest">{option.label}</p>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="app-card rounded-[2rem] border p-6">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <p className="mt-5 text-sm font-bold text-slate-700 dark:text-slate-200">Carregando dados dos relatorios</p>
            <p className="mt-1 max-w-md text-xs font-medium text-app-muted">
              Estamos consultando membros, visitantes e novos convertidos no banco para montar os indicadores.
            </p>
          </div>
        </div>
      ) : !reportHasData ? (
        <div className="app-card rounded-[2rem] border p-6">
          <div className="app-panel-muted rounded-[1.75rem] border border-dashed border-app px-6 py-14 text-center">
            <i className="fas fa-folder-open text-3xl text-app-muted" />
            <p className="mt-4 text-base font-black text-slate-900 dark:text-white">Ainda nao ha dados suficientes para montar relatorios.</p>
            <p className="mt-2 max-w-2xl text-sm font-medium text-app-muted mx-auto">
              Assim que houver membros cadastrados ou registros de visitantes e novos convertidos, esta central vai preencher os dados automaticamente.
            </p>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              Dica: cadastre membros, visitantes ou novos convertidos e depois toque em atualizar dados.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={copyReportText}
                disabled={copyingText || !canExport}
                className="app-btn-muted inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                <i className="fas fa-copy" />
                {copyingText ? 'Copiando texto...' : 'Copiar relatorio'}
              </button>
              <button
                type="button"
                onClick={exportToSpreadsheet}
                disabled={exportingSheet || !canExport}
                className="app-btn-muted inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                <i className="fas fa-file-excel" />
                {exportingSheet ? 'Preparando planilha...' : 'Exportar planilha'}
              </button>
              <button
                type="button"
                onClick={exportToPdf}
                disabled={exporting || !canExport}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 disabled:opacity-60"
              >
                <i className="fas fa-file-pdf" />
                {exporting ? 'Preparando PDF...' : 'Exportar em PDF'}
              </button>
            </div>
          </div>
          {!canExport && (
            <p className="text-left text-xs font-bold text-app-muted sm:text-right">
              Seu acesso permite visualizar os relatorios, mas nao exportar.
            </p>
          )}

          <div className="space-y-6">
            {selectedGroup === 'members-statistics' && selectedStatistic === 'total-members' && (
              <ReportCard eyebrow="Relatorio estatistico" title="Total geral de membros cadastrados" description="Total de registros no cadastro atual da igreja.">
                <button
                  type="button"
                  onClick={() =>
                    openDetail(
                      'Total geral de membros',
                      'Todos os membros cadastrados na base.',
                      ['Nome', 'Bairro', 'Contato'],
                      members.map((member) => ({
                        title: memberName(member),
                        meta: member.bairro?.trim() || 'Nao Informado',
                        extra: member.email || ''
                      }))
                    )
                  }
                  className="app-panel block w-full rounded-2xl px-5 py-8 text-center transition hover:scale-[1.01]"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total geral de membros</p>
                  <p className="mt-4 text-5xl font-black text-slate-900 dark:text-white">{totalMembers}</p>
                </button>
              </ReportCard>
            )}

            {selectedGroup === 'members-statistics' && selectedStatistic === 'by-neighborhood' && (
              <ReportCard eyebrow="Relatorio estatistico" title="Distribuicao por bairro" description="Quantidade de membros cadastrados agrupados por bairro.">
                <div className="app-card-muted rounded-2xl border p-5">
                  <div className="space-y-3">
                    {neighborhoodDistribution.map(([bairro, total]) => (
                      <button
                        type="button"
                        key={bairro}
                        onClick={() =>
                          openDetail(`Bairro: ${bairro}`, 'Membros encontrados neste bairro.', ['Nome', 'Bairro', 'Contato'], getMembersByNeighborhood(bairro))
                        }
                        className="flex w-full items-center justify-between gap-4 rounded-2xl px-2 py-2 text-left transition hover:bg-brand/5"
                      >
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{bairro}</span>
                        <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
                          {total}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </ReportCard>
            )}

            {selectedGroup === 'members-statistics' && selectedStatistic === 'by-gender' && (
              <ReportCard eyebrow="Relatorio estatistico" title="Perfil por genero" description="Distribuicao atual dos membros cadastrados por genero.">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard label="Feminino" value={genderSummary.feminino} onClick={() => openDetail('Genero: Feminino', 'Membros classificados como feminino.', ['Nome', 'Genero', 'Bairro'], getMembersByGender('feminino'))} />
                  <MetricCard label="Masculino" value={genderSummary.masculino} onClick={() => openDetail('Genero: Masculino', 'Membros classificados como masculino.', ['Nome', 'Genero', 'Bairro'], getMembersByGender('masculino'))} />
                  <MetricCard label="Nao informado" value={genderSummary.naoInformado} onClick={() => openDetail('Genero: Nao informado', 'Membros sem genero informado.', ['Nome', 'Genero', 'Bairro'], getMembersByGender('naoInformado'))} />
                </div>
              </ReportCard>
            )}

            {selectedGroup === 'members-statistics' && selectedStatistic === 'by-education' && (
              <ReportCard eyebrow="Relatorio estatistico" title="Nivel de escolaridade" description="Resumo dos membros cadastrados por escolaridade.">
                <div className="app-card-muted rounded-2xl border p-5 space-y-3">
                  <SummaryLine label="Ensino Medio Completo" value={educationSummary.medioCompleto} onClick={() => openDetail('Escolaridade: Ensino Medio Completo', 'Membros nesta faixa de escolaridade.', ['Nome', 'Escolaridade', 'Bairro'], getMembersByEducation('medioCompleto'))} />
                  <SummaryLine label="Ensino Medio Incompleto" value={educationSummary.medioIncompleto} onClick={() => openDetail('Escolaridade: Ensino Medio Incompleto', 'Membros nesta faixa de escolaridade.', ['Nome', 'Escolaridade', 'Bairro'], getMembersByEducation('medioIncompleto'))} />
                  <SummaryLine label="Ensino Superior Completo" value={educationSummary.superiorCompleto} onClick={() => openDetail('Escolaridade: Ensino Superior Completo', 'Membros nesta faixa de escolaridade.', ['Nome', 'Escolaridade', 'Bairro'], getMembersByEducation('superiorCompleto'))} />
                  <SummaryLine label="Ensino Superior Incompleto" value={educationSummary.superiorIncompleto} onClick={() => openDetail('Escolaridade: Ensino Superior Incompleto', 'Membros nesta faixa de escolaridade.', ['Nome', 'Escolaridade', 'Bairro'], getMembersByEducation('superiorIncompleto'))} />
                  <SummaryLine label="Ensino Fundamental (In)completo" value={educationSummary.fundamental} onClick={() => openDetail('Escolaridade: Ensino Fundamental', 'Membros nesta faixa de escolaridade.', ['Nome', 'Escolaridade', 'Bairro'], getMembersByEducation('fundamental'))} />
                  <SummaryLine label="Nenhuma" value={educationSummary.nenhuma} onClick={() => openDetail('Escolaridade: Nenhuma', 'Membros sem escolaridade informada como nenhuma.', ['Nome', 'Escolaridade', 'Bairro'], getMembersByEducation('nenhuma'))} />
                  <SummaryLine label="Nao Informado" value={educationSummary.naoInformado} onClick={() => openDetail('Escolaridade: Nao informada', 'Membros sem escolaridade definida.', ['Nome', 'Escolaridade', 'Bairro'], getMembersByEducation('naoInformado'))} />
                </div>
              </ReportCard>
            )}

            {selectedGroup === 'monthly-consolidation' && (
              <ReportCard eyebrow="Relatorio mensal de consolidacao" title={formatMonthLabel(selectedMonth)} description="Balanco das atividades de recepcao e integracao de novos membros e visitantes.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Novas conversoes" value={monthlySummary.newConverts} onClick={() => openDetail('Novas conversoes', `Registros de ${formatMonthLabel(selectedMonth)}.`, ['Nome', 'Bairro', 'Data'], monthlyConvertsList.map((item) => ({ title: item.nome || 'Novo convertido sem nome', meta: item.bairro || 'Sem bairro', extra: item.data_conversao || '' })))} />
                  <MetricCard label="Total de visitantes" value={monthlySummary.totalVisitors} onClick={() => openDetail('Total de visitantes', `Visitantes de ${formatMonthLabel(selectedMonth)}.`, ['Nome', 'Telefone', 'Data'], monthlyVisitorsList.map((item) => ({ title: item.nome || 'Visitante sem nome', meta: item.telefone || 'Sem telefone', extra: item.data_ficha || '' })))} />
                  <MetricCard label="Pedidos de oracao no lar" value={monthlySummary.homePrayerRequests} onClick={() => openDetail('Pedidos de oracao no lar', `Visitantes que pediram oracao em ${formatMonthLabel(selectedMonth)}.`, ['Nome', 'Telefone', 'Convidado por'], monthlyVisitorsList.filter((item) => item.deseja_oracao_lar).map((item) => ({ title: item.nome || 'Visitante sem nome', meta: item.telefone || 'Sem telefone', extra: item.convidado_por || '' })))} />
                  <MetricCard label="Solicitacoes de aconselhamento" value={monthlySummary.counselingRequests} onClick={() => openDetail('Solicitacoes de aconselhamento', `Visitantes que pediram aconselhamento em ${formatMonthLabel(selectedMonth)}.`, ['Nome', 'Telefone', 'Bairro'], monthlyVisitorsList.filter((item) => item.deseja_aconselhamento).map((item) => ({ title: item.nome || 'Visitante sem nome', meta: item.telefone || 'Sem telefone', extra: item.bairro || '' })))} />
                  <MetricCard label="Busca por informacoes" value={monthlySummary.infoRequests} onClick={() => openDetail('Busca por informacoes', `Visitantes que pediram informacoes em ${formatMonthLabel(selectedMonth)}.`, ['Nome', 'Telefone', 'Endereco'], monthlyVisitorsList.filter((item) => item.deseja_informacoes_igreja).map((item) => ({ title: item.nome || 'Visitante sem nome', meta: item.telefone || 'Sem telefone', extra: item.endereco || '' })))} />
                </div>
                <div className="app-panel mt-6 rounded-2xl p-5">
                  <p className="text-sm font-bold italic text-slate-700 dark:text-slate-200">Equipe de Consolidacao</p>
                  <p className="mt-2 text-sm font-medium text-app-muted">
                    "Consolidar e cuidar com amor daqueles que o Senhor nos enviou."
                  </p>
                </div>
              </ReportCard>
            )}

            {selectedDetail && (
              <ReportCard eyebrow="Detalhamento do relatorio" title={selectedDetail.title} description={selectedDetail.subtitle}>
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(null)}
                    className="app-btn-muted rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    Fechar detalhes
                  </button>
                </div>
                <div className="app-card-muted rounded-2xl border p-5">
                  {selectedDetail.items.length === 0 ? (
                    <p className="text-sm font-medium text-app-muted">Nenhuma pessoa encontrada neste agrupamento.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className={`hidden gap-3 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 md:grid ${selectedDetail.columns.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                        {selectedDetail.columns.map((column) => (
                          <span key={column}>{column}</span>
                        ))}
                      </div>
                      {selectedDetail.items.map((item) => (
                        <div key={`${item.title}-${item.meta}-${item.extra}`} className={`app-panel rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 md:grid md:gap-3 ${selectedDetail.columns.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                          <div className="space-y-1 md:space-y-0">
                            <span className="block md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {selectedDetail.columns[0]}
                            </span>
                            <span>{item.title}</span>
                          </div>
                          {selectedDetail.columns[1] && (
                            <div className="space-y-1 md:space-y-0">
                              <span className="block md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {selectedDetail.columns[1]}
                              </span>
                              <span>{item.meta || '-'}</span>
                            </div>
                          )}
                          {selectedDetail.columns[2] && (
                            <div className="space-y-1 md:space-y-0">
                              <span className="block md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {selectedDetail.columns[2]}
                              </span>
                              <span>{item.extra || '-'}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ReportCard>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const ReportCard = ({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section className="app-card rounded-[2rem] border p-6">
    <div className="mb-6">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm font-medium text-app-muted">{description}</p>
    </div>
    {children}
  </section>
);

const MetricCard = ({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) => (
  <button type="button" onClick={onClick} className="app-panel rounded-2xl p-5 text-left transition hover:scale-[1.01]">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
  </button>
);

const SummaryLine = ({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-brand/5">
    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
    <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
      {value}
    </span>
  </button>
);

export default ChurchReports;

function buildSpreadsheetRows({
  selectedGroup,
  selectedStatistic,
  selectedMonth,
  totalMembers,
  neighborhoodDistribution,
  genderSummary,
  educationSummary,
  monthlySummary,
  issuerName,
  selectedDetail
}: {
  selectedGroup: ReportGroup;
  selectedStatistic: MemberStatisticType;
  selectedMonth: string;
  totalMembers: number;
  neighborhoodDistribution: Array<[string, number]>;
  genderSummary: { feminino: number; masculino: number; naoInformado: number };
  educationSummary: {
    medioCompleto: number;
    medioIncompleto: number;
    superiorCompleto: number;
    superiorIncompleto: number;
    fundamental: number;
    nenhuma: number;
    naoInformado: number;
  };
  monthlySummary: {
    newConverts: number;
    totalVisitors: number;
    homePrayerRequests: number;
    counselingRequests: number;
    infoRequests: number;
  };
  issuerName: string;
  selectedDetail: ReportDetail | null;
}) {
  const headerRows = [
    ['Comunidade Evangelica Valentes de Davi'],
    ['Relatorio', selectedGroup === 'monthly-consolidation' ? 'Consolidacao mensal' : 'Estatistico de membros'],
    ['Emitido em', new Date().toLocaleString('pt-BR')],
    ['Responsavel pela emissao', issuerName],
    []
  ];

  if (selectedGroup === 'monthly-consolidation') {
    const rows = [
      ...headerRows,
      ['Mes de referencia', formatMonthLabel(selectedMonth)],
      ['Indicador', 'Valor'],
      ['Novas conversoes', monthlySummary.newConverts],
      ['Total de visitantes', monthlySummary.totalVisitors],
      ['Pedidos de oracao no lar', monthlySummary.homePrayerRequests],
      ['Solicitacoes de aconselhamento', monthlySummary.counselingRequests],
      ['Busca por informacoes', monthlySummary.infoRequests]
    ];
    return appendDetailRows(rows, selectedDetail);
  }

  if (selectedStatistic === 'total-members') {
    return appendDetailRows([...headerRows, ['Indicador', 'Valor'], ['Total geral de membros', totalMembers]], selectedDetail);
  }

  if (selectedStatistic === 'by-neighborhood') {
    return appendDetailRows([...headerRows, ['Bairro', 'Total'], ...neighborhoodDistribution.map(([bairro, total]) => [bairro, total])], selectedDetail);
  }

  if (selectedStatistic === 'by-gender') {
    return appendDetailRows([
      ...headerRows,
      ['Genero', 'Total'],
      ['Feminino', genderSummary.feminino],
      ['Masculino', genderSummary.masculino],
      ['Nao informado', genderSummary.naoInformado]
    ], selectedDetail);
  }

  return appendDetailRows([
    ...headerRows,
    ['Escolaridade', 'Total'],
    ['Ensino Medio Completo', educationSummary.medioCompleto],
    ['Ensino Medio Incompleto', educationSummary.medioIncompleto],
    ['Ensino Superior Completo', educationSummary.superiorCompleto],
    ['Ensino Superior Incompleto', educationSummary.superiorIncompleto],
    ['Ensino Fundamental (In)completo', educationSummary.fundamental],
    ['Nenhuma', educationSummary.nenhuma],
    ['Nao Informado', educationSummary.naoInformado]
  ], selectedDetail);
}

function slugify(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'relatorio';
}

function buildPrintableReport({
  selectedGroup,
  selectedStatistic,
  selectedMonth,
  totalMembers,
  neighborhoodDistribution,
  genderSummary,
  educationSummary,
  monthlySummary,
  selectedDetail
}: {
  selectedGroup: ReportGroup;
  selectedStatistic: MemberStatisticType;
  selectedMonth: string;
  totalMembers: number;
  neighborhoodDistribution: Array<[string, number]>;
  genderSummary: { feminino: number; masculino: number; naoInformado: number };
  educationSummary: {
    medioCompleto: number;
    medioIncompleto: number;
    superiorCompleto: number;
    superiorIncompleto: number;
    fundamental: number;
    nenhuma: number;
    naoInformado: number;
  };
  monthlySummary: {
    newConverts: number;
    totalVisitors: number;
    homePrayerRequests: number;
    counselingRequests: number;
    infoRequests: number;
  };
  selectedDetail: ReportDetail | null;
}) {
  if (selectedGroup === 'monthly-consolidation') {
    return appendDetailHtml(`
      <div class="eyebrow">Relatorio mensal de consolidacao</div>
      <h2>${formatMonthLabel(selectedMonth)}</h2>
      <p>Este relatorio apresenta o balanco das atividades de recepcao e integracao de novos membros e visitantes.</p>
      <div class="card">
        <div class="metric"><span class="label">Novas conversoes</span><span class="value">${monthlySummary.newConverts}</span></div>
        <div class="metric"><span class="label">Total de visitantes</span><span class="value">${monthlySummary.totalVisitors}</span></div>
        <div class="metric"><span class="label">Pedidos de oracao no lar</span><span class="value">${monthlySummary.homePrayerRequests}</span></div>
        <div class="metric"><span class="label">Solicitacoes de aconselhamento</span><span class="value">${monthlySummary.counselingRequests}</span></div>
        <div class="metric"><span class="label">Busca por informacoes</span><span class="value">${monthlySummary.infoRequests}</span></div>
      </div>
      <div class="quote">
        <strong>Equipe de Consolidacao</strong><br />
        "Consolidar e cuidar com amor daqueles que o Senhor nos enviou."
      </div>
    `, selectedDetail);
  }

  if (selectedStatistic === 'total-members') {
    return appendDetailHtml(`
      <div class="eyebrow">Relatorio estatistico de membros</div>
      <h2>Total geral de membros cadastrados</h2>
      <p>Total de registros no cadastro atual da igreja.</p>
      <div class="card">
        <div class="metric"><span class="label">Total geral de membros</span><span class="value">${totalMembers}</span></div>
      </div>
    `, selectedDetail);
  }

  if (selectedStatistic === 'by-neighborhood') {
    return appendDetailHtml(`
      <div class="eyebrow">Relatorio estatistico de membros</div>
      <h2>Distribuicao por bairro</h2>
      <p>Quantidade de membros cadastrados agrupados por bairro.</p>
      <div class="card">
        ${neighborhoodDistribution
          .map(([bairro, total]) => `<div class="metric"><span class="label">${escapeHtml(bairro)}</span><span class="value">${total}</span></div>`)
          .join('')}
      </div>
    `, selectedDetail);
  }

  if (selectedStatistic === 'by-gender') {
    return appendDetailHtml(`
      <div class="eyebrow">Relatorio estatistico de membros</div>
      <h2>Perfil por genero</h2>
      <p>Distribuicao atual dos membros cadastrados por genero.</p>
      <div class="card">
        <div class="metric"><span class="label">Feminino</span><span class="value">${genderSummary.feminino}</span></div>
        <div class="metric"><span class="label">Masculino</span><span class="value">${genderSummary.masculino}</span></div>
        <div class="metric"><span class="label">Nao informado</span><span class="value">${genderSummary.naoInformado}</span></div>
      </div>
    `, selectedDetail);
  }

  return appendDetailHtml(`
    <div class="eyebrow">Relatorio estatistico de membros</div>
    <h2>Nivel de escolaridade</h2>
    <p>Resumo dos membros cadastrados por escolaridade.</p>
    <div class="card">
      <div class="metric"><span class="label">Ensino Medio Completo</span><span class="value">${educationSummary.medioCompleto}</span></div>
      <div class="metric"><span class="label">Ensino Medio Incompleto</span><span class="value">${educationSummary.medioIncompleto}</span></div>
      <div class="metric"><span class="label">Ensino Superior Completo</span><span class="value">${educationSummary.superiorCompleto}</span></div>
      <div class="metric"><span class="label">Ensino Superior Incompleto</span><span class="value">${educationSummary.superiorIncompleto}</span></div>
      <div class="metric"><span class="label">Ensino Fundamental (In)completo</span><span class="value">${educationSummary.fundamental}</span></div>
      <div class="metric"><span class="label">Nenhuma</span><span class="value">${educationSummary.nenhuma}</span></div>
      <div class="metric"><span class="label">Nao informado</span><span class="value">${educationSummary.naoInformado}</span></div>
    </div>
  `, selectedDetail);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function appendDetailRows(rows: Array<Array<string | number>>, selectedDetail: ReportDetail | null) {
  if (!selectedDetail) return rows;
  return [
    ...rows,
    [],
    ['Detalhamento aberto'],
    ['Titulo', selectedDetail.title],
    ['Descricao', selectedDetail.subtitle],
    selectedDetail.columns,
    ...selectedDetail.items.map((item) => [item.title, item.meta || '', item.extra || ''])
  ];
}

function appendDetailHtml(baseHtml: string, selectedDetail: ReportDetail | null) {
  if (!selectedDetail) return baseHtml;
  return `${baseHtml}
    <div class="eyebrow">Detalhamento aberto</div>
    <h2>${escapeHtml(selectedDetail.title)}</h2>
    <p>${escapeHtml(selectedDetail.subtitle)}</p>
    <div class="card">
      ${selectedDetail.items.length === 0
        ? `<div class="metric"><span class="label">Nenhuma pessoa encontrada</span><span class="value">0</span></div>`
        : selectedDetail.items
            .map(
              (item) => `
                <div class="metric">
                  <span class="label">${escapeHtml(item.title)}</span>
                  <span class="value">${escapeHtml(item.meta || '-')}</span>
                </div>
                ${item.extra ? `<div style="margin:-4px 0 12px; font-size:12px; color:#6b7280;">${escapeHtml(item.extra)}</div>` : ''}`
            )
            .join('')}
    </div>`;
}

function buildTextReport({
  selectedGroup,
  selectedStatistic,
  selectedMonth,
  totalMembers,
  neighborhoodDistribution,
  genderSummary,
  educationSummary,
  monthlySummary,
  selectedDetail,
  issuerName
}: {
  selectedGroup: ReportGroup;
  selectedStatistic: MemberStatisticType;
  selectedMonth: string;
  totalMembers: number;
  neighborhoodDistribution: Array<[string, number]>;
  genderSummary: { feminino: number; masculino: number; naoInformado: number };
  educationSummary: {
    medioCompleto: number;
    medioIncompleto: number;
    superiorCompleto: number;
    superiorIncompleto: number;
    fundamental: number;
    nenhuma: number;
    naoInformado: number;
  };
  monthlySummary: {
    newConverts: number;
    totalVisitors: number;
    homePrayerRequests: number;
    counselingRequests: number;
    infoRequests: number;
  };
  selectedDetail: ReportDetail | null;
  issuerName: string;
}) {
  const lines: string[] = [
    'Comunidade Evangelica Valentes de Davi',
    `Emitido em: ${new Date().toLocaleString('pt-BR')}`,
    `Responsavel pela emissao: ${issuerName}`,
    ''
  ];

  if (selectedGroup === 'monthly-consolidation') {
    lines.push(
      `Relatorio Mensal de Consolidacao - ${formatMonthLabel(selectedMonth)}`,
      '',
      `Novas conversoes: ${monthlySummary.newConverts}`,
      `Total de visitantes: ${monthlySummary.totalVisitors}`,
      `Pedidos de oracao no lar: ${monthlySummary.homePrayerRequests}`,
      `Solicitacoes de aconselhamento: ${monthlySummary.counselingRequests}`,
      `Busca por informacoes: ${monthlySummary.infoRequests}`
    );
  } else if (selectedStatistic === 'total-members') {
    lines.push('Relatorio Estatistico de Membros', '', `Total geral de membros: ${totalMembers}`);
  } else if (selectedStatistic === 'by-neighborhood') {
    lines.push('Relatorio Estatistico de Membros - Por bairro', '');
    neighborhoodDistribution.forEach(([bairro, total]) => lines.push(`${bairro}: ${total}`));
  } else if (selectedStatistic === 'by-gender') {
    lines.push(
      'Relatorio Estatistico de Membros - Por genero',
      '',
      `Feminino: ${genderSummary.feminino}`,
      `Masculino: ${genderSummary.masculino}`,
      `Nao informado: ${genderSummary.naoInformado}`
    );
  } else {
    lines.push(
      'Relatorio Estatistico de Membros - Escolaridade',
      '',
      `Ensino Medio Completo: ${educationSummary.medioCompleto}`,
      `Ensino Medio Incompleto: ${educationSummary.medioIncompleto}`,
      `Ensino Superior Completo: ${educationSummary.superiorCompleto}`,
      `Ensino Superior Incompleto: ${educationSummary.superiorIncompleto}`,
      `Ensino Fundamental (In)completo: ${educationSummary.fundamental}`,
      `Nenhuma: ${educationSummary.nenhuma}`,
      `Nao informado: ${educationSummary.naoInformado}`
    );
  }

  if (selectedDetail) {
    lines.push('', `Detalhamento aberto: ${selectedDetail.title}`, selectedDetail.subtitle, '');
    lines.push(selectedDetail.columns.join(' | '));
    selectedDetail.items.forEach((item) => {
      lines.push([item.title, item.meta || '-', item.extra || '-'].join(' | '));
    });
  }

  return lines.join('\n');
}
