import React, { useState } from 'react';

type LabSection = 'dashboard' | 'scales';

interface DesignLabViewProps {
  onBack: () => void;
}

interface VisualVariant {
  id: string;
  name: string;
  shell: string;
  panel: string;
  subtle: string;
  accent: string;
  accentSoft: string;
  radius: string;
  shadow: string;
  border: string;
}

const stats = [
  { label: 'Cultos no mes', value: '18', meta: '+4% vs. abril', icon: 'fa-calendar-days' },
  { label: 'Membros ativos', value: '42', meta: '7 novos esta semana', icon: 'fa-users' },
  { label: 'Musicas prontas', value: '126', meta: '15 revisadas', icon: 'fa-music' },
  { label: 'Escalas abertas', value: '06', meta: '2 com ajustes', icon: 'fa-layer-group' }
];

const events = [
  { title: 'Culto de Celebracao', date: 'Dom 26 Mai', time: '18:30', team: 'Louvor + Midia', status: 'Confirmado' },
  { title: 'Ensaio Geral', date: 'Qua 29 Mai', time: '19:15', team: 'Banda base', status: 'Revisar repertorio' },
  { title: 'Vigilia Jovem', date: 'Sex 31 Mai', time: '22:00', team: 'Escala parcial', status: '2 vagas' }
];

const members = [
  { name: 'Ana Clara', role: 'Vocal', info: '94% presenca' },
  { name: 'Mateus Lima', role: 'Guitarra', info: '5 escalas seguidas' },
  { name: 'Julia Rocha', role: 'Midia', info: 'Agenda sem conflitos' }
];

const scaleRows = [
  { title: 'Culto de Domingo', date: '26/05', time: '18:30', note: 'Repertorio fechado', status: 'Completa' },
  { title: 'Quarta Profetica', date: '29/05', time: '19:15', note: 'Falta teclado', status: 'Parcial' },
  { title: 'Santa Ceia', date: '02/06', time: '18:30', note: '2 vagas abertas', status: 'Montando' },
  { title: 'Conferencia Jovem', date: '07/06', time: '20:00', note: 'Trocar vocal', status: 'Revisao' }
];

const dashboardVariants: VisualVariant[] = [
  {
    id: 'dash-1',
    name: 'Soft Glass',
    shell: 'bg-gradient-to-br from-sky-100/80 via-white to-cyan-50',
    panel: 'bg-white/82 backdrop-blur-xl',
    subtle: 'bg-white/62 backdrop-blur',
    accent: 'bg-sky-600 text-white',
    accentSoft: 'bg-sky-100 text-sky-700',
    radius: 'rounded-[1.8rem]',
    shadow: 'shadow-[0_25px_60px_-35px_rgba(14,116,144,0.35)]',
    border: 'border border-white/70'
  },
  {
    id: 'dash-2',
    name: 'Warm Premium',
    shell: 'bg-gradient-to-br from-amber-100/80 via-white to-rose-50',
    panel: 'bg-[#fffaf2]',
    subtle: 'bg-white/75',
    accent: 'bg-amber-600 text-white',
    accentSoft: 'bg-amber-100 text-amber-700',
    radius: 'rounded-[1.5rem]',
    shadow: 'shadow-[0_28px_70px_-40px_rgba(180,83,9,0.35)]',
    border: 'border border-amber-100/80'
  },
  {
    id: 'dash-3',
    name: 'Editorial Slate',
    shell: 'bg-gradient-to-br from-slate-200/85 via-slate-100 to-white',
    panel: 'bg-[#f8fafc]',
    subtle: 'bg-white',
    accent: 'bg-slate-900 text-white',
    accentSoft: 'bg-slate-200 text-slate-700',
    radius: 'rounded-[1.2rem]',
    shadow: 'shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]',
    border: 'border border-slate-200/80'
  },
  {
    id: 'dash-4',
    name: 'Emerald Studio',
    shell: 'bg-gradient-to-br from-emerald-100/75 via-white to-lime-50',
    panel: 'bg-white/88 backdrop-blur-md',
    subtle: 'bg-emerald-50/75',
    accent: 'bg-emerald-600 text-white',
    accentSoft: 'bg-emerald-100 text-emerald-700',
    radius: 'rounded-[2.1rem]',
    shadow: 'shadow-[0_25px_65px_-38px_rgba(5,150,105,0.35)]',
    border: 'border border-emerald-100/80'
  },
  {
    id: 'dash-5',
    name: 'Contrast Clean',
    shell: 'bg-gradient-to-br from-zinc-100 via-white to-stone-100',
    panel: 'bg-white',
    subtle: 'bg-zinc-50',
    accent: 'bg-fuchsia-600 text-white',
    accentSoft: 'bg-fuchsia-100 text-fuchsia-700',
    radius: 'rounded-[1.4rem]',
    shadow: 'shadow-[0_28px_70px_-42px_rgba(192,38,211,0.28)]',
    border: 'border border-zinc-200/80'
  }
];

const scaleVariants: VisualVariant[] = [
  {
    id: 'scale-1',
    name: 'Planner Soft',
    shell: 'bg-gradient-to-br from-indigo-100/80 via-white to-sky-50',
    panel: 'bg-white/88 backdrop-blur-lg',
    subtle: 'bg-indigo-50/70',
    accent: 'bg-indigo-600 text-white',
    accentSoft: 'bg-indigo-100 text-indigo-700',
    radius: 'rounded-[1.8rem]',
    shadow: 'shadow-[0_25px_60px_-35px_rgba(79,70,229,0.35)]',
    border: 'border border-white/70'
  },
  {
    id: 'scale-2',
    name: 'Rose Cards',
    shell: 'bg-gradient-to-br from-rose-100/80 via-white to-orange-50',
    panel: 'bg-[#fff8f8]',
    subtle: 'bg-white/80',
    accent: 'bg-rose-600 text-white',
    accentSoft: 'bg-rose-100 text-rose-700',
    radius: 'rounded-[1.4rem]',
    shadow: 'shadow-[0_26px_66px_-38px_rgba(225,29,72,0.28)]',
    border: 'border border-rose-100/80'
  },
  {
    id: 'scale-3',
    name: 'Slate Dense',
    shell: 'bg-gradient-to-br from-slate-200/85 via-white to-slate-100',
    panel: 'bg-[#f8fafc]',
    subtle: 'bg-white',
    accent: 'bg-slate-900 text-white',
    accentSoft: 'bg-slate-200 text-slate-700',
    radius: 'rounded-[1.15rem]',
    shadow: 'shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]',
    border: 'border border-slate-200/80'
  },
  {
    id: 'scale-4',
    name: 'Cyan Air',
    shell: 'bg-gradient-to-br from-cyan-100/75 via-white to-teal-50',
    panel: 'bg-white/84 backdrop-blur-md',
    subtle: 'bg-cyan-50/75',
    accent: 'bg-cyan-600 text-white',
    accentSoft: 'bg-cyan-100 text-cyan-700',
    radius: 'rounded-[2rem]',
    shadow: 'shadow-[0_25px_65px_-38px_rgba(8,145,178,0.32)]',
    border: 'border border-cyan-100/80'
  },
  {
    id: 'scale-5',
    name: 'Gold Accent',
    shell: 'bg-gradient-to-br from-yellow-50 via-white to-stone-100',
    panel: 'bg-white',
    subtle: 'bg-yellow-50/75',
    accent: 'bg-amber-500 text-slate-950',
    accentSoft: 'bg-amber-100 text-amber-700',
    radius: 'rounded-[1.55rem]',
    shadow: 'shadow-[0_26px_68px_-40px_rgba(217,119,6,0.24)]',
    border: 'border border-yellow-100/80'
  }
];

const sectionPill = (active: boolean) =>
  active ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'app-btn-muted text-app-muted hover:text-app';

const DashboardVariant: React.FC<{ variant: VisualVariant; index: number }> = ({ variant, index }) => (
  <article className={`${variant.shell} ${variant.radius} ${variant.shadow} ${variant.border} overflow-hidden p-4`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Dashboard Modelo {index + 1}</p>
        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">{variant.name}</h3>
        <p className="mt-1 text-sm text-slate-500">Mesmo layout base do dashboard, com variação só na pele visual.</p>
      </div>
      <span className={`${variant.accentSoft} rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]`}>Visual</span>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <div className={`${variant.accent} ${variant.radius} p-5 ${variant.shadow}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] opacity-80">Resumo da semana</p>
              <h4 className="mt-2 text-2xl font-black tracking-tight">Tudo pronto para o domingo</h4>
              <p className="mt-2 max-w-md text-sm opacity-85">Equipe principal confirmada, repertorio revisado e um ajuste pendente no ensaio geral.</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-right backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">Prontidao</p>
              <p className="mt-1 text-3xl font-black">91%</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((item) => (
            <div key={item.label} className={`${variant.panel} ${variant.radius} ${variant.border} p-4`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                <i className={`fas ${item.icon} text-sm text-slate-500`}></i>
              </div>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{item.value}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{item.meta}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className={`${variant.panel} ${variant.radius} ${variant.border} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Proximos eventos</h4>
            <span className={`${variant.accentSoft} rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]`}>Agenda</span>
          </div>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.title} className={`${variant.subtle} ${variant.radius} ${variant.border} p-3`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{event.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{event.date} • {event.time}</p>
                  </div>
                  <span className={`${variant.accentSoft} rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em]`}>{event.status}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{event.team}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`${variant.panel} ${variant.radius} ${variant.border} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Equipe em destaque</h4>
            <span className="text-xs font-semibold text-slate-500">Mesmo bloco base</span>
          </div>
          <div className="space-y-3">
            {members.map((member, memberIndex) => (
              <div key={member.name} className={`${variant.subtle} ${variant.radius} ${variant.border} flex items-center gap-3 px-3 py-2.5`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black ${memberIndex % 2 === 0 ? variant.accent : variant.accentSoft}`}>
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.role} • {member.info}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </article>
);

const ScalesVariant: React.FC<{ variant: VisualVariant; index: number }> = ({ variant, index }) => (
  <article className={`${variant.shell} ${variant.radius} ${variant.shadow} ${variant.border} overflow-hidden p-4`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Escalas Modelo {index + 1}</p>
        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">{variant.name}</h3>
        <p className="mt-1 text-sm text-slate-500">Mesma estrutura de leitura da lista de escalas, só com nova linguagem visual.</p>
      </div>
      <span className={`${variant.accentSoft} rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]`}>Visual</span>
    </div>

    <div className={`${variant.panel} ${variant.radius} ${variant.border} p-4`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={`${variant.accent} rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]`}>Todas</button>
        <button className={`${variant.accentSoft} rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]`}>Pendentes</button>
        <button className={`${variant.accentSoft} rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]`}>Ensaios</button>
        <div className={`${variant.subtle} ${variant.border} ml-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-slate-500`}>
          <i className="fas fa-magnifying-glass"></i>
          Buscar escala
        </div>
      </div>

      <div className="space-y-3">
        {scaleRows.map((item) => (
          <div key={item.title} className={`${variant.subtle} ${variant.radius} ${variant.border} grid gap-3 p-4 lg:grid-cols-[1fr_0.6fr_0.65fr_0.55fr] lg:items-center`}>
            <div>
              <p className="text-sm font-black text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Data</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{item.date} • {item.time}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Status</p>
              <span className={`${variant.accentSoft} mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em]`}>{item.status}</span>
            </div>
            <div className="flex justify-start lg:justify-end">
              <button className={`${variant.accent} rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]`}>Abrir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </article>
);

const DesignLabView: React.FC<DesignLabViewProps> = ({ onBack }) => {
  const [section, setSection] = useState<LabSection>('dashboard');

  return (
    <div className="bg-app-shell min-h-screen">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[2rem] bg-slate-950 px-5 py-5 text-white shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/55">Design Lab</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Comparativo visual fiel ao seu sistema</h1>
              <p className="mt-3 max-w-3xl text-sm text-white/72">
                Aqui o layout base continua o mesmo. O que muda entre os modelos e so a linguagem visual: cor, sombra, borda, raio e formato dos cards.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onBack} className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-white backdrop-blur transition hover:bg-white/15">
                <i className="fas fa-arrow-left mr-2"></i>
                Voltar
              </button>
              <button
                onClick={() => setSection('dashboard')}
                className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] transition ${sectionPill(section === 'dashboard')}`}
              >
                5 dashboards
              </button>
              <button
                onClick={() => setSection('scales')}
                className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] transition ${sectionPill(section === 'scales')}`}
              >
                5 escalas
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="app-card rounded-[1.5rem] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-app-muted">Comparacao</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-app">Mesmo layout</p>
          </div>
          <div className="app-card rounded-[1.5rem] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-app-muted">O que muda</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-app">Cards e cores</p>
          </div>
          <div className="app-card rounded-[1.5rem] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-app-muted">Total</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-app">10 modelos</p>
          </div>
        </div>

        {section === 'dashboard' && (
          <div className="space-y-6">
            {dashboardVariants.map((variant, index) => (
              <DashboardVariant key={variant.id} variant={variant} index={index} />
            ))}
          </div>
        )}

        {section === 'scales' && (
          <div className="space-y-6">
            {scaleVariants.map((variant, index) => (
              <ScalesVariant key={variant.id} variant={variant} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignLabView;
