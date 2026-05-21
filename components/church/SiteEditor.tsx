import React, { useState } from 'react';
import { ChurchSiteContent, defaultSiteContent, loadSiteContent, saveSiteContent } from './siteContent';

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400';

const SiteEditor: React.FC = () => {
  const [content, setContent] = useState<ChurchSiteContent>(() => loadSiteContent());
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof ChurchSiteContent>(key: K, value: ChurchSiteContent[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSiteContent(content);
    setSaved(true);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-[2rem] bg-white p-6 shadow-sm dark:bg-slate-900 lg:flex-row lg:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Site publico</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar pagina principal</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Altere textos, imagens, cores, ministerios e dados de contato.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <i className="fas fa-up-right-from-square" />
            Ver Site
          </a>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
          >
            <i className="fas fa-floppy-disk" />
            {saved ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </div>

      <section className="grid gap-5 rounded-[2rem] bg-white p-6 shadow-sm dark:bg-slate-900 lg:grid-cols-2">
        <label>
          <span className={labelClass}>Nome da igreja</span>
          <input className={inputClass} value={content.churchName} onChange={(event) => update('churchName', event.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Texto da logo</span>
          <input className={inputClass} value={content.logoText} onChange={(event) => update('logoText', event.target.value)} />
        </label>
        <label className="lg:col-span-2">
          <span className={labelClass}>Imagem da logo</span>
          {content.logoImage && <img src={content.logoImage} alt="" className="mb-3 h-24 w-24 rounded-2xl object-cover" />}
          <input className={inputClass} value={content.logoImage} onChange={(event) => update('logoImage', event.target.value)} placeholder="URL da logo" />
          <input
            type="file"
            accept="image/*"
            className="mt-3 w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) readImageFile(file, (dataUrl) => update('logoImage', dataUrl));
            }}
          />
        </label>
        <label className="lg:col-span-2">
          <span className={labelClass}>Titulo principal</span>
          <input className={inputClass} value={content.heroTitle} onChange={(event) => update('heroTitle', event.target.value)} />
        </label>
        <label className="lg:col-span-2">
          <span className={labelClass}>Frase inspiradora</span>
          <textarea className={`${inputClass} min-h-28`} value={content.heroSubtitle} onChange={(event) => update('heroSubtitle', event.target.value)} />
        </label>
        <label className="lg:col-span-2">
          <span className={labelClass}>Imagem principal URL</span>
          <input className={inputClass} value={content.heroImage} onChange={(event) => update('heroImage', event.target.value)} />
          <input
            type="file"
            accept="image/*"
            className="mt-3 w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) readImageFile(file, (dataUrl) => update('heroImage', dataUrl));
            }}
          />
        </label>
        <label>
          <span className={labelClass}>Cor principal</span>
          <input type="color" className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" value={content.primaryColor} onChange={(event) => update('primaryColor', event.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Dourado</span>
          <input type="color" className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" value={content.goldColor} onChange={(event) => update('goldColor', event.target.value)} />
        </label>
      </section>

      <section className="grid gap-5 rounded-[2rem] bg-white p-6 shadow-sm dark:bg-slate-900 lg:grid-cols-2">
        <label>
          <span className={labelClass}>Horarios dos cultos</span>
          <input className={inputClass} value={content.serviceInfo} onChange={(event) => update('serviceInfo', event.target.value)} />
        </label>
        <label>
          <span className={labelClass}>WhatsApp</span>
          <input className={inputClass} value={content.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Endereco</span>
          <input className={inputClass} value={content.address} onChange={(event) => update('address', event.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Google Maps URL</span>
          <input className={inputClass} value={content.mapUrl} onChange={(event) => update('mapUrl', event.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Instagram</span>
          <input className={inputClass} value={content.instagram} onChange={(event) => update('instagram', event.target.value)} />
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
          <span className={labelClass}>QR Code PIX URL</span>
          <input className={inputClass} value={content.pixQrImage} onChange={(event) => update('pixQrImage', event.target.value)} />
          <input
            type="file"
            accept="image/*"
            className="mt-3 w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) readImageFile(file, (dataUrl) => update('pixQrImage', dataUrl));
            }}
          />
        </label>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-slate-900">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Eventos do site</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
          Os cards de eventos da homepage agora usam automaticamente os eventos cadastrados em Administracao &gt; Agenda e cards da igreja.
          Para aparecer no site, mantenha o evento ativo e marque Mostrar no inicio.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Ministerios</h2>
          <button
            type="button"
            onClick={() => update('ministries', [...content.ministries, { name: 'Novo Ministerio', icon: 'fa-cross', image: '' }])}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Adicionar
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.ministries.map((ministry, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Ministerio {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => update('ministries', content.ministries.filter((_, itemIndex) => itemIndex !== index))}
                  className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Excluir
                </button>
              </div>
              {ministry.image && <img src={ministry.image} alt="" className="mb-3 h-28 w-full rounded-2xl object-cover" />}
              <input
                className={inputClass}
                value={ministry.name}
                onChange={(event) => {
                  const next = [...content.ministries];
                  next[index] = { ...next[index], name: event.target.value };
                  update('ministries', next);
                }}
              />
              <div className="mt-3 grid grid-cols-[1fr_0.9fr] gap-3">
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
                  className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800"
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
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Postagens do Instagram</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Sem API oficial conectada, cadastre aqui os links e imagens das ultimas postagens.
            </p>
          </div>
          <button
            type="button"
            onClick={() => update('instagramPosts', [...content.instagramPosts, { title: '', image: '', url: '' }])}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Adicionar
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {content.instagramPosts.map((post, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              {post.image ? (
                <img src={post.image} alt="" className="mb-3 h-40 w-full rounded-2xl object-cover" />
              ) : (
                <div className="mb-3 flex h-40 w-full items-center justify-center rounded-2xl bg-slate-100 text-xs font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800">
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
                    next[index] = {
                      ...next[index],
                      url: event.target.value,
                      title: next[index].title || 'Postagem no Instagram'
                    };
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
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800"
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
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={handleReset} className="text-xs font-black uppercase tracking-widest text-red-500">
          Restaurar conteudo padrao
        </button>
      </div>
    </div>
  );
};

export default SiteEditor;
