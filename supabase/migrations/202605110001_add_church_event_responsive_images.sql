alter table public.eventos_igreja
  add column if not exists imagem_url_desktop text,
  add column if not exists imagem_url_mobile text;

update public.eventos_igreja
set
  imagem_url_desktop = coalesce(imagem_url_desktop, imagem_url),
  imagem_url_mobile = coalesce(imagem_url_mobile, imagem_url)
where imagem_url is not null;
