alter table public.configuracoes_site_igreja
  add column if not exists about_title text not null default 'Uma casa organizada para servir pessoas.',
  add column if not exists about_body text not null default 'Acolhemos familias, discipulamos pessoas e criamos ambientes onde fe, comunidade e excelencia caminham juntos.',
  add column if not exists highlights jsonb not null default '[
    {"title":"Comunidade","description":"Relacoes saudaveis e uma igreja presente na vida real das pessoas.","icon":"fa-people-group"},
    {"title":"Louvor","description":"Cultos preparados com excelencia, sensibilidade e reverencia.","icon":"fa-music"},
    {"title":"Cuidado","description":"Acompanhamento pastoral e consolidacao para quem chega e para quem caminha.","icon":"fa-hand-holding-heart"}
  ]'::jsonb,
  add column if not exists prayer_title text not null default 'Queremos orar por voce.',
  add column if not exists prayer_subtitle text not null default 'Envie seu pedido e nossa equipe pastoral vai receber sua mensagem.',
  add column if not exists giving_title text not null default 'Contribua com seguranca via PIX.',
  add column if not exists giving_subtitle text not null default 'Use a chave abaixo ou aponte a camera para o QR Code.',
  add column if not exists footer_text text not null default 'Fe, comunidade e proposito em uma experiencia acolhedora e organizada.';
