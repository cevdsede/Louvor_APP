# 🎵 Louvor CEVD - Guia Rápido

## ✅ O que foi implementado

### 1. **Configuração Centralizada**
- Arquivo `config.js` criado com a URL do Google Script
- Agora, para mudar a URL, basta editar **um único arquivo** (`config.js`)
- Todos os 10+ arquivos HTML agora usam essa configuração centralizada

### 2. **Como Mudar a URL do Google Script**

Edite o arquivo `config.js`:
```javascript
const APP_CONFIG = {
  SCRIPT_URL: "SUA_NOVA_URL_AQUI"
};
```

### 3. **Hospedagem Local HTTP**

Consulte o arquivo `HOSPEDAGEM_LOCAL.md` para instruções detalhadas.

**Método Rápido (Python):**
```powershell
cd C:\Users\CBMAC\Desktop\Louvor
python -m http.server 8080
```

Depois acesse: `http://localhost:8080`

---

## 🚀 Para Publicar as Alterações

```powershell
git push origin main
```

---

## 📱 Estrutura do App

```
Louvor CEVD
├── Login (com autenticação via planilha)
├── Menu Principal
│   ├── Escalas (submenu)
│   │   ├── Lista
│   │   └── Calendário (2 meses)
│   ├── Músicas
│   ├── Repertório
│   ├── Equipe
│   ├── Cadastro de Repertório
│   │   └── Link para "Nova Música"
│   └── Acesso a Mesa (Wake Lock ativo)
└── Logout automático (24h)
```

---

## 🔧 Funcionalidades Principais

### ✅ Offline-First
- Todos os dados são baixados em segundo plano ao abrir o app
- Funciona sem internet após primeira sincronização
- Botão "Atualizar Tudo" para forçar atualização manual

### ✅ Autenticação
- Login via nome + senha (coluna "Senha" na planilha "Componentes")
- Sessão expira após 24 horas de inatividade
- Botão "Sair" disponível

### ✅ Navegação
- Todos os botões "Voltar" implementados
- Menu intermediário para Escalas (Lista/Calendário)

### ✅ Acesso a Mesa
- Iframe para `http://10.10.10.2`
- **Wake Lock**: Tela não desliga enquanto estiver nessa página
- Botão "Voltar" flutuante

### ✅ Atualizações Automáticas
- Service Worker detecta novas versões
- Toast de notificação: "Nova versão disponível!"
- Clique para atualizar instantaneamente

---

## 📝 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `config.js` | **Configuração centralizada** (URL do Google Script) |
| `service-worker.js` | Cache offline e detecção de atualizações |
| `manifest.json` | Configuração do PWA (nome, ícones) |
| `index.html` | Tela principal com menu |
| `Login.html` | Autenticação |
| `AcessoMesa.html` | Acesso à mesa de som com Wake Lock |
| `HOSPEDAGEM_LOCAL.md` | Guia de hospedagem HTTP local |

---

## 🐛 Troubleshooting

### "Acesso a Mesa" não carrega o iframe

**Causa**: Mixed Content (HTTPS tentando carregar HTTP)

**Solução**: Hospedar o PWA via HTTP local (veja `HOSPEDAGEM_LOCAL.md`)

### Dados não atualizam

1. Clique em "Atualizar Tudo" na tela principal
2. Verifique a conexão com internet
3. Confirme que a URL do Google Script está correta em `config.js`

### Login não funciona

1. Verifique se a coluna "Senha" existe na planilha "Componentes"
2. Certifique-se que o nome está exatamente igual à planilha
3. Senha é case-sensitive (diferencia maiúsculas/minúsculas)

### App não atualiza após git push

1. Feche completamente o app
2. Reabra
3. Aguarde o toast "Nova versão disponível!"
4. Clique em "Atualizar"

Ou force atualização:
- Chrome: F12 → Application → Service Workers → Unregister
- Recarregue a página (Ctrl+Shift+R)

---

## 📊 Planilhas Google Necessárias

O Google Script deve ter acesso às seguintes abas:

1. **Componentes** (com coluna "Senha" para login)
2. **Transformar** (Escalas)
3. **Repertório**
4. **Musicas**
5. **Tema Músicas**
6. **Historico de Músicas**
7. **Images** (via `?action=getImages`)

---

## 🎨 Personalização

### Mudar Nome do App
Edite `manifest.json`:
```json
{
  "name": "Seu Nome Aqui",
  "short_name": "Nome Curto"
}
```

### Mudar Ícone
Substitua os arquivos:
- `Leão.ico` (ícone do app)
- `backgroud.png` (logo da tela inicial)

### Mudar Timeout de Logout
Edite `index.html`, linha ~230:
```javascript
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas em ms
```

---

## 📞 Suporte

Para dúvidas ou problemas, revise:
1. Este arquivo (`README_GUIA.md`)
2. `HOSPEDAGEM_LOCAL.md` (para problemas com Acesso a Mesa)
3. Console do navegador (F12) para erros técnicos
