# Notificacoes push reais

## Variaveis necessarias

Frontend:

```env
VITE_PUSH_VAPID_PUBLIC_KEY=...
```

Supabase Edge Function:

```env
PUSH_VAPID_SUBJECT=mailto:admin@seudominio.com
PUSH_VAPID_PUBLIC_KEY=...
PUSH_VAPID_PRIVATE_KEY=...
```

## Como funciona

- O app solicita permissao no modal de perfil.
- A subscription do navegador e salva em `push_subscriptions`.
- A Edge Function `send-push-notification` envia a notificacao via Web Push.
- Endpoints expirados ou removidos sao desativados automaticamente.

## Teste

1. Configure as variaveis VAPID.
2. Aplique a migration `202605250001_create_push_subscriptions.sql`.
3. Deploy da function `send-push-notification`.
4. Abra o perfil no app, ative Push real e use o botao Testar.
