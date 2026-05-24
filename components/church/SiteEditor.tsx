import React, { useMemo, useState } from 'react';
import { showError, showSuccess } from '../../utils/toast';
import { ChurchSiteContent, defaultSiteContent, fetchSiteContent, loadSiteContent, saveSiteContent } from './siteContent';

const inputClass =
  'app-input w-full rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10';

const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400';

type EditorTab = 'branding' | 'hero' | 'contact' | 'content';

const tabs: Array<{ id: EditorTab; label: string; icon: string }> = [
  { id: 'branding', label: 'Identidade', icon: 'fas fa-palette' },
  { id: 'hero', label: 'Destaque', icon: 'fas fa-image' },
  { id: 'contact', label: 'Contato', icon: 'fas fa-address-card' },
  { id: 'content', label: 'Conteudo', icon: 'fas fa-layer-group' }
];

const SiteEditor: React.FC = () => {
  const [content, setContent] = useState<ChurchSiteContent>(() => loadSiteContent());
  const [saved, setSaved] = useState(true);
  const [activeTab, setActiveTab] = useState<EditorTab>('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    let mounted = true;

    const loadFromDatabase = async () => {
      setLoading(true);
      try {
        const remoteContent = await fetchSiteContent();
        if (!mounted) return;
        setContent(remoteContent);
        setSaved(true);
      } catch (error) {
        console.error('Erro ao carregar configuracoes do site:', error);
        showError('Nao foi possivel carregar o conteudo mais recente do site. Usando cache local.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadFromDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  const update = <K extends keyof ChurchSiteContent>(key: K, value: ChurchSiteContent[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextContent = await saveSiteContent(content);
      setContent(nextContent);
      setSaved(true);
      showSuccess('Conteudo do site salvo no banco com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar configuracoes do site:', error);
      showError('Nao foi possivel salvar o conteudo do site agora.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setContent(defaultSiteContent);
    setSaved(false);
  };

  const readImageFile = (file: File, onLoad: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => onLoad(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const statusCards = useMemo(
    () => [
      { label: 'Ministerios', value: String(content.ministries.length), icon: 'fas fa-cross' },
      { label: 'Posts Instagram', value: String(content.instagramPosts.length), icon: 'fab fa-instagram' },
      { label: 'WhatsApp', value: content.whatsapp ? 'OK' : 'Pendente', icon: 'fab fa-whatsapp' },
      { label: 'PIX', value: content.pixKey ? 'OK' : 'Pendente', icon: 'fas fa-qrcode' }
    ],
    [content.instagramPosts.length, content.ministries.length, content.pixKey, content.whatsapp]
  );

  const sectionTitle =
    activeTab === 'branding'
      ? 'Identidade e marca'
      : activeTab === 'hero'
        ? 'Primeira dobra do site'
        : activeTab === 'contact'
          ? 'Canais e localizacao'
          : 'Blocos de conteudo';

  if (loading) {
    return (
      <div className="app-card rounded-[2rem] border p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-5 text-sm font-bold text-slate-700 dark:text-slate-200">Carregando configuracoes do site</p>
          <p className="mt-1 max-w-xl text-xs font-medium text-app-muted">
            Estamos sincronizando o editor com o conteudo oficial salvo no banco.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="app-card grid gap-5 rounded-[2rem] border p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Site publico</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editor completo da pagina principal</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-app-muted">
            Organize a identidade, os textos, os blocos visuais e os contatos do site em uma area mais clara e mais completa.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                  activeTab === tab.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'app-btn-muted'
                }`}
              >
                <i className={`${tab.icon} mr-2`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="app-panel rounded-[1.75rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Resumo rapido</h2>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${saved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
              {saved ? 'Salvo' : 'Edicoes pendentes'}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {statusCards.map((card) => (
              <div key={card.label} className="app-card-muted rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</span>
                  <i className={`${card.icon} text-brand`} />
                </div>
                <p className="mt-3 text-xl font-black text-slate-900 dark:text-white">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="app-btn-muted inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-widest"
            >
              <i className="fas fa-up-right-from-square" />
              Ver site
            </a>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 disabled:opacity-60"
            >
              <i className={`fas ${saving ? 'fa-spinner animate-spin' : 'fa-floppy-disk'}`} />
              {saving ? 'Salvando...' : saved ? 'Salvo' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="app-card rounded-[2rem] border p-6">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Secao ativa</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">{sectionTitle}</h2>
            </div>

            {activeTab === 'branding' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <label>
                  <span className={labelClass}>Nome da igreja</span>
                  <input className={inputClass} value={content.churchName} onChange={(event) => update('churchName', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Texto da logo</span>
                  <input className={inputClass} value={content.logoText} onChange={(event) => update('logoText', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Cor principal</span>
                  <input type="color" className="app-input h-12 w-full rounded-2xl p-1" value={content.primaryColor} onChange={(event) => update('primaryColor', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Cor de destaque</span>
                  <input type="color" className="app-input h-12 w-full rounded-2xl p-1" value={content.goldColor} onChange={(event) => update('goldColor', event.target.value)} />
                </label>
                <label className="lg:col-span-2">
                  <span className={labelClass}>Imagem da logo</span>
                  {content.logoImage && <img src={content.logoImage} alt="" className="mb-3 h-24 w-24 rounded-2xl object-cover" />}
                  <input className={inputClass} value={content.logoImage} onChange={(event) => update('logoImage', event.target.value)} placeholder="URL da logo" />
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-3 w-full rounded-2xl border border-app bg-app-surface-strong px-4 py-3 text-sm font-bold text-app-muted"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) readImageFile(file, (dataUrl) => update('logoImage', dataUrl));
                    }}
                  />
                </label>
              </div>
            )}

            {activeTab === 'hero' && (
              <div className="grid gap-5">
                <label>
                  <span className={labelClass}>Horarios em destaque</span>
                  <input className={inputClass} value={content.serviceInfo} onChange={(event) => update('serviceInfo', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Titulo principal</span>
                  <input className={inputClass} value={content.heroTitle} onChange={(event) => update('heroTitle', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Texto de impacto</span>
                  <textarea className={`${inputClass} min-h-32`} value={content.heroSubtitle} onChange={(event) => update('heroSubtitle', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Imagem principal</span>
                  <input className={inputClass} value={content.heroImage} onChange={(event) => update('heroImage', event.target.value)} placeholder="URL da imagem principal" />
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-3 w-full rounded-2xl border border-app bg-app-surface-strong px-4 py-3 text-sm font-bold text-app-muted"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) readImageFile(file, (dataUrl) => update('heroImage', dataUrl));
                    }}
                  />
                </label>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <label>
                  <span className={labelClass}>WhatsApp</span>
                  <input className={inputClass} value={content.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Instagram</span>
                  <input className={inputClass} value={content.instagram} onChange={(event) => update('instagram', event.target.value)} />
                </label>
                <label className="lg:col-span-2">
                  <span className={labelClass}>Endereco</span>
                  <input className={inputClass} value={content.address} onChange={(event) => update('address', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Google Maps URL</span>
                  <input className={inputClass} value={content.mapUrl} onChange={(event) => update('mapUrl', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Link do Instagram</span>
                  <input className={inputClass} value={content.instagramUrl} onChange={(event) => update('instagramUrl', event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Chave PIX</span>
                  <input className={inputClass} value={content.pixKey} onChange={(event) => update('pixKey', event.target.value)} />
                </label>
                <label className="lg:col-span-2">
                  <span className={labelClass}>QR Code PIX</span>
                  <input className={inputClass} value={content.pixQrImage} onChange={(event) => update('pixQrImage', event.target.value)} placeholder="URL da imagem do QR Code" />
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-3 w-full rounded-2xl border border-app bg-app-surface-strong px-4 py-3 text-sm font-bold text-app-muted"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) readImageFile(file, (dataUrl) => update('pixQrImage', dataUrl));
                    }}
                  />
                </label>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-6">
                <div className="rounded-[1.5rem] border border-app p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Ministerios</h3>
                      <p className="mt-1 text-sm font-medium text-app-muted">Cards da secao “Encontre seu lugar”.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => update('ministries', [...content.ministries, { name: 'Novo Ministerio', icon: 'fa-cross', image: '' }])}
                      className="app-btn-muted rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {content.ministries.map((ministry, index) => (
                      <div key={index} className="app-card-muted rounded-2xl border p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ministerio {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => update('ministries', content.ministries.filter((_, itemIndex) => itemIndex !== index))}
                            className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            Excluir
                          </button>
                        </div>
                        {ministry.image && <img src={ministry.image} alt="" className="mb-3 h-28 w-full rounded-2xl object-cover" />}
                        <div className="space-y-3">
                          <input
                            className={inputClass}
                            value={ministry.name}
                            onChange={(event) => {
                              const next = [...content.ministries];
                              next[index] = { ...next[index], name: event.target.value };
                              update('ministries', next);
                            }}
                          />
                          <input
                            className={inputClass}
                            placeholder="Icone FontAwesome"
                            value={ministry.icon}
                            onChange={(event) => {
                              const next = [...content.ministries];
                              next[index] = { ...next[index], icon: event.target.value };
                              update('ministries', next);
                            }}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="w-full rounded-2xl border border-app bg-app-surface-muted px-3 py-2 text-xs font-bold text-app-muted"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              readImageFile(file, (dataUrl) => {
                                const next = [...content.ministries];
                                next[index] = { ...next[index], image: dataUrl };
                                update('ministries', next);
                              });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-app p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Postagens do Instagram</h3>
                      <p className="mt-1 text-sm font-medium text-app-muted">Cards exibidos no bloco social do site.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => update('instagramPosts', [...content.instagramPosts, { title: '', image: '', url: '' }])}
                      className="app-btn-muted rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {content.instagramPosts.map((post, index) => (
                      <div key={index} className="app-card-muted rounded-2xl border p-4">
                        {post.image ? (
                          <img src={post.image} alt="" className="mb-3 h-40 w-full rounded-2xl object-cover" />
                        ) : (
                          <div className="mb-3 flex h-40 w-full items-center justify-center rounded-2xl bg-app-surface-muted text-xs font-black uppercase tracking-widest text-app-muted">
                            Sem imagem
                          </div>
                        )}
                        <div className="space-y-3">
                          <input
                            className={inputClass}
                            placeholder="Titulo"
                            value={post.title}
                            onChange={(event) => {
                              const next = [...content.instagramPosts];
                              next[index] = { ...next[index], title: event.target.value };
                              update('instagramPosts', next);
                            }}
                          />
                          <input
                            className={inputClass}
                            placeholder="Link da postagem"
                            value={post.url}
                            onChange={(event) => {
                              const next = [...content.instagramPosts];
                              next[index] = { ...next[index], url: event.target.value };
                              update('instagramPosts', next);
                            }}
                          />
                          <input
                            className={inputClass}
                            placeholder="URL da imagem"
                            value={post.image}
                            onChange={(event) => {
                              const next = [...content.instagramPosts];
                              next[index] = { ...next[index], image: event.target.value };
                              update('instagramPosts', next);
                            }}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              className="w-full rounded-2xl border border-app bg-app-surface-muted px-4 py-3 text-sm font-bold text-app-muted"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                readImageFile(file, (dataUrl) => {
                                  const next = [...content.instagramPosts];
                                  next[index] = { ...next[index], image: dataUrl };
                                  update('instagramPosts', next);
                                });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => update('instagramPosts', content.instagramPosts.filter((_, itemIndex) => itemIndex !== index))}
                              className="rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="app-panel-muted rounded-[1.5rem] border border-app p-5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Eventos do site</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-app-muted">
                    Os cards de eventos da homepage usam automaticamente os eventos cadastrados em <strong>Cadastros &gt; Eventos</strong>.
                    Para aparecer no site, mantenha o evento ativo e marque <strong>Mostrar no inicio</strong>.
                  </p>
                </div>
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <button type="button" onClick={handleReset} className="text-xs font-black uppercase tracking-widest text-red-500">
              Restaurar conteudo padrao
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="app-card rounded-[2rem] border p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Preview rapido</p>
            <div className="mt-4 overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/10">
              <div className="relative min-h-[240px]" style={{ backgroundColor: content.primaryColor }}>
                {content.heroImage && <img src={content.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/85" />
                <div className="relative flex h-full min-h-[240px] flex-col justify-end p-5 text-white">
                  <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: content.goldColor }} />
                    {content.serviceInfo}
                  </div>
                  <h3 className="text-2xl font-black leading-tight">{content.heroTitle}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-white/75">{content.heroSubtitle}</p>
                </div>
              </div>
              <div className="bg-app-surface p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-sm font-black text-black" style={{ backgroundColor: content.goldColor }}>
                    {content.logoImage ? <img src={content.logoImage} alt="" className="h-full w-full object-cover" /> : content.logoText}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{content.churchName}</p>
                    <p className="text-xs font-medium text-app-muted">{content.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="app-card rounded-[2rem] border p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Checklist</h2>
            <div className="mt-4 space-y-3">
              <ChecklistItem label="Logo configurada" ok={Boolean(content.logoImage || content.logoText)} />
              <ChecklistItem label="Hero com imagem" ok={Boolean(content.heroImage)} />
              <ChecklistItem label="WhatsApp preenchido" ok={Boolean(content.whatsapp)} />
              <ChecklistItem label="Endereco preenchido" ok={Boolean(content.address)} />
              <ChecklistItem label="Instagram preenchido" ok={Boolean(content.instagram && content.instagramUrl)} />
              <ChecklistItem label="PIX pronto" ok={Boolean(content.pixKey && content.pixQrImage)} />
            </div>
          </section>

          <section className="app-card rounded-[2rem] border p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Dicas rapidas</h2>
            <div className="mt-4 space-y-3 text-sm font-medium leading-6 text-app-muted">
              <p>Use imagens horizontais mais escuras no hero para o texto principal ficar mais legível.</p>
              <p>Mantenha o nome da igreja curto no topo para evitar quebra no cabeçalho do site.</p>
              <p>Se quiser mais impacto visual, use a cor principal mais escura e a cor de destaque mais quente.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const ChecklistItem = ({ label, ok }: { label: string; ok: boolean }) => (
  <div className="app-panel-muted flex items-center justify-between rounded-2xl px-4 py-3">
    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
      {ok ? 'OK' : 'Ajustar'}
    </span>
  </div>
);

export default SiteEditor;
