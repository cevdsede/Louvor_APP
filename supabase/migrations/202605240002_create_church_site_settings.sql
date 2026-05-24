create table if not exists public.configuracoes_site_igreja (
  key text primary key default 'principal',
  church_name text not null default 'Comunidade Evangelica Valentes de Davi',
  logo_text text not null default 'CV',
  logo_image text not null default '',
  hero_title text not null default 'Uma igreja para viver fe, familia e proposito.',
  hero_subtitle text not null default 'Cultos inspiradores, comunhao verdadeira e uma casa preparada para receber voce e sua familia.',
  hero_image text not null default 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1800&q=85',
  service_info text not null default 'Domingo 18h30 | Quarta 19h30',
  whatsapp text not null default '(68) 99999-9999',
  address text not null default 'Rua Mamed Saad, 210 - Wanderley Dantas',
  map_url text not null default 'https://maps.app.goo.gl/HWcfFfHUZ3xukKsL9',
  instagram text not null default '@cevdsedeoficial',
  instagram_url text not null default 'https://www.instagram.com/cevdsedeoficial/',
  instagram_posts jsonb not null default '[]'::jsonb,
  pix_key text not null default '23604144000152',
  pix_qr_image text not null default '',
  primary_color text not null default '#09090b',
  gold_color text not null default '#d6a84f',
  events jsonb not null default '[]'::jsonb,
  ministries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.configuracoes_site_igreja enable row level security;

create or replace function public.touch_configuracoes_site_igreja_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_touch_configuracoes_site_igreja_updated_at on public.configuracoes_site_igreja;
create trigger tr_touch_configuracoes_site_igreja_updated_at
before update on public.configuracoes_site_igreja
for each row
execute function public.touch_configuracoes_site_igreja_updated_at();

drop policy if exists "Public can read church site settings" on public.configuracoes_site_igreja;
create policy "Public can read church site settings"
on public.configuracoes_site_igreja
for select
using (true);

drop policy if exists "Managers can insert church site settings" on public.configuracoes_site_igreja;
create policy "Managers can insert church site settings"
on public.configuracoes_site_igreja
for insert
with check (private.can_manage_church_site());

drop policy if exists "Managers can update church site settings" on public.configuracoes_site_igreja;
create policy "Managers can update church site settings"
on public.configuracoes_site_igreja
for update
using (private.can_manage_church_site())
with check (private.can_manage_church_site());

insert into public.configuracoes_site_igreja (
  key,
  church_name,
  logo_text,
  hero_title,
  hero_subtitle,
  hero_image,
  service_info,
  whatsapp,
  address,
  map_url,
  instagram,
  instagram_url,
  instagram_posts,
  pix_key,
  pix_qr_image,
  primary_color,
  gold_color,
  events,
  ministries
)
values (
  'principal',
  'Comunidade Evangelica Valentes de Davi',
  'CV',
  'Uma igreja para viver fe, familia e proposito.',
  'Cultos inspiradores, comunhao verdadeira e uma casa preparada para receber voce e sua familia.',
  'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1800&q=85',
  'Domingo 18h30 | Quarta 19h30',
  '(68) 99999-9999',
  'Rua Mamed Saad, 210 - Wanderley Dantas',
  'https://maps.app.goo.gl/HWcfFfHUZ3xukKsL9',
  '@cevdsedeoficial',
  'https://www.instagram.com/cevdsedeoficial/',
  '[
    {"title":"Culto de celebracao","image":"https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=80","url":"https://www.instagram.com/cevdsedeoficial/"},
    {"title":"Comunhao e familia","image":"https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80","url":"https://www.instagram.com/cevdsedeoficial/"},
    {"title":"Noite de louvor","image":"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80","url":"https://www.instagram.com/cevdsedeoficial/"}
  ]'::jsonb,
  '23604144000152',
  '',
  '#09090b',
  '#d6a84f',
  '[
    {"date":"Dom 18h30","title":"Culto de Celebracao","location":"Templo principal","category":"Cultos","image":"https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80"},
    {"date":"Sex 20h","title":"Noite dos Jovens","location":"Auditorio","category":"Jovens","image":"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80"},
    {"date":"Sab 16h","title":"Encontro de Familias","location":"Sala multiuso","category":"Familia","image":"https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=900&q=80"}
  ]'::jsonb,
  '[
    {"name":"Jovens","icon":"fa-bolt"},
    {"name":"Infantil","icon":"fa-child-reaching"},
    {"name":"Louvor","icon":"fa-music"},
    {"name":"Mulheres","icon":"fa-heart"},
    {"name":"Homens","icon":"fa-shield-halved"},
    {"name":"Casais","icon":"fa-ring"},
    {"name":"Missoes","icon":"fa-globe"}
  ]'::jsonb
)
on conflict (key) do nothing;
