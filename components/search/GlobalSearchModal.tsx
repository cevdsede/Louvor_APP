import React, { useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { ViewType } from '../../types';
import { getDisplayName } from '../../utils/displayName';
import { SupabaseEventoIgreja, SupabaseMembro, SupabaseNovoConvertidoIgreja, SupabaseVisitanteIgreja } from '../../types-supabase';
import { ChurchView } from '../church/ChurchShell';

type SearchTarget =
  | { area: 'church'; view: ChurchView }
  | { area: 'ministry'; view: ViewType };

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  target: SearchTarget;
};

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

interface GlobalSearchModalProps {
  onClose: () => void;
  onNavigate: (target: SearchTarget) => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ onClose, onNavigate }) => {
  const { data: membersRaw } = useLocalStorageFirst<SupabaseMembro>({ table: 'membros' });
  const { data: visitorsRaw } = useLocalStorageFirst<SupabaseVisitanteIgreja>({ table: 'visitantes_igreja' });
  const { data: convertsRaw } = useLocalStorageFirst<SupabaseNovoConvertidoIgreja>({ table: 'novos_convertidos_igreja' });
  const { data: churchEventsRaw } = useLocalStorageFirst<SupabaseEventoIgreja>({ table: 'eventos_igreja' });
  const { data: cultosRaw } = useLocalStorageFirst<any>({ table: 'cultos' });
  const { data: nomeCultosRaw } = useLocalStorageFirst<any>({ table: 'nome_cultos' });
  const { data: musicasRaw } = useLocalStorageFirst<any>({ table: 'musicas' });
  const [query, setQuery] = useState('');

  const cultoNamesById = useMemo(
    () =>
      new Map<string, string>(
        (nomeCultosRaw || []).map((item: any) => [String(item.id), item.nome_culto || 'Culto sem nome'])
      ),
    [nomeCultosRaw]
  );

  const results = useMemo(() => {
    const search = normalize(query);
    if (!search) return [] as SearchResult[];

    const memberResults: SearchResult[] = (membersRaw || [])
      .filter((member) =>
        [getDisplayName(member), member.nome, member.email, member.bairro, member.telefone_celular, member.posicao_igreja]
          .some((value) => normalize(String(value || '')).includes(search))
      )
      .slice(0, 8)
      .map((member) => ({
        id: `member-${member.id}`,
        title: getDisplayName(member),
        subtitle: [member.bairro || 'Sem bairro', member.posicao_igreja || 'Membro'].join(' • '),
        tag: 'Membro',
        target: { area: 'church', view: 'members' }
      }));

    const visitorResults: SearchResult[] = (visitorsRaw || [])
      .filter((item) =>
        [item.nome, item.bairro, item.telefone, item.convidado_por, item.endereco]
          .some((value) => normalize(value).includes(search))
      )
      .slice(0, 8)
      .map((item) => ({
        id: `visitor-${item.id}`,
        title: item.nome || 'Visitante sem nome',
        subtitle: [item.bairro || 'Sem bairro', item.telefone || 'Sem telefone'].join(' • '),
        tag: 'Visitante',
        target: { area: 'church', view: 'visitors' }
      }));

    const convertResults: SearchResult[] = (convertsRaw || [])
      .filter((item) =>
        [item.nome, item.bairro, item.contato, item.email, item.estado_civil]
          .some((value) => normalize(value).includes(search))
      )
      .slice(0, 8)
      .map((item) => ({
        id: `convert-${item.id}`,
        title: item.nome || 'Novo convertido sem nome',
        subtitle: [item.bairro || 'Sem bairro', item.estado_civil || 'Sem estado civil'].join(' • '),
        tag: 'Novo convertido',
        target: { area: 'church', view: 'converts' }
      }));

    const churchEventResults: SearchResult[] = (churchEventsRaw || [])
      .filter((item) =>
        [item.titulo, item.categoria, item.local, item.data_inicio, item.horario_inicio]
          .some((value) => normalize(String(value || '')).includes(search))
      )
      .slice(0, 8)
      .map((item) => ({
        id: `church-event-${item.id}`,
        title: item.titulo || 'Evento sem titulo',
        subtitle: [item.data_inicio || 'Sem data', item.local || 'Sem local'].join(' • '),
        tag: 'Evento da igreja',
        target: { area: 'church', view: 'church-events' }
      }));

    const scheduleResults: SearchResult[] = (cultosRaw || [])
      .filter((item: any) => {
        const title = cultoNamesById.get(String(item.id_nome_culto || item.nome_culto_id || item.nome_culto)) || '';
        return [title, item.data_culto, item.horario].some((value) => normalize(String(value || '')).includes(search));
      })
      .slice(0, 8)
      .map((item: any) => {
        const title = cultoNamesById.get(String(item.id_nome_culto || item.nome_culto_id || item.nome_culto)) || 'Culto sem nome';
        return {
          id: `schedule-${item.id}`,
          title,
          subtitle: [item.data_culto || 'Sem data', item.horario || 'Sem horario'].join(' • '),
          tag: 'Escala',
          target: { area: 'ministry', view: 'list' as ViewType }
        };
      });

    const musicResults: SearchResult[] = (musicasRaw || [])
      .filter((item: any) =>
        [item.musica, item.cantor, item.estilo, item.tema].some((value) => normalize(String(value || '')).includes(search))
      )
      .slice(0, 8)
      .map((item: any) => ({
        id: `song-${item.id}`,
        title: item.musica || 'Musica sem nome',
        subtitle: [item.cantor || 'Sem cantor', item.tema || 'Sem tema'].join(' • '),
        tag: 'Musica',
        target: { area: 'ministry', view: 'music-list' as ViewType }
      }));

    return [
      ...memberResults,
      ...visitorResults,
      ...convertResults,
      ...churchEventResults,
      ...scheduleResults,
      ...musicResults
    ].slice(0, 30);
  }, [churchEventsRaw, convertsRaw, cultoNamesById, cultosRaw, membersRaw, musicasRaw, query, visitorsRaw]);

  const groupedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    results.forEach((result) => {
      const existing = map.get(result.tag) || [];
      existing.push(result);
      map.set(result.tag, existing);
    });
    return Array.from(map.entries());
  }, [results]);

  return (
    <div className="fixed inset-0 z-[950] overflow-y-auto px-3 py-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative mx-auto max-w-4xl">
        <div className="app-card rounded-[2rem] border p-4 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Busca global</p>
              <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">Membros, cadastros, eventos, escalas e musicas</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="app-btn-muted rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest"
            >
              Fechar
            </button>
          </div>

          <div className="relative mt-5">
            <i className="fas fa-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-app-muted" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar membros, visitantes, convertidos, eventos, escalas ou musicas..."
              className="app-input w-full rounded-2xl py-4 pl-11 pr-4 text-sm font-semibold"
            />
          </div>

          <div className="mt-5 max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            {!query.trim() ? (
              <div className="app-panel-muted rounded-2xl border border-dashed border-app px-6 py-12 text-center">
                <i className="fas fa-magnifying-glass text-3xl text-app-muted" />
                <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">Digite para pesquisar em todo o sistema</p>
                <p className="mt-1 text-xs font-medium text-app-muted">
                  A busca cobre membros, visitantes, novos convertidos, eventos da igreja, escalas e musicas.
                </p>
              </div>
            ) : groupedResults.length === 0 ? (
              <div className="app-panel-muted rounded-2xl border border-dashed border-app px-6 py-12 text-center">
                <i className="fas fa-circle-exclamation text-3xl text-app-muted" />
                <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">Nenhum resultado encontrado</p>
                <p className="mt-1 text-xs font-medium text-app-muted">
                  Tente outro nome, bairro, telefone, titulo de evento ou nome de musica.
                </p>
              </div>
            ) : (
              groupedResults.map(([group, items]) => (
                <section key={group} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{group}</p>
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
                      {items.length}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate(item.target)}
                        className="app-panel rounded-2xl p-4 text-left transition hover:scale-[1.01]"
                      >
                        <p className="text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                        <p className="mt-1 text-xs font-medium text-app-muted">{item.subtitle}</p>
                        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-brand">
                          Abrir {item.target.area === 'church' ? 'modulo igreja' : 'modulo ministerio'}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
