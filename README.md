<div align="center">
  <img src="https://img.shields.io/badge/React-19.2.4-blue.svg" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.8.2-blue.svg" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-6.2.0-yellow.svg" alt="Vite"/>
  <img src="https://img.shields.io/badge/Supabase-2.93.3-green.svg" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.1.18-cyan.svg" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/PWA-Ready-orange.svg" alt="PWA"/>
  <br/>
  <img src="https://img.shields.io/badge/Offline_First-✅-green.svg" alt="Offline First"/>
  <img src="https://img.shields.io/badge/Local_Storage-✅-blue.svg" alt="Local Storage"/>
  <img src="https://img.shields.io/badge/Cross_Platform-✅-purple.svg" alt="Cross Platform"/>
</div>

# 🎵 Sistema de Gestão de Louvor

> **SPA Louvor** - Sistema completo para gestão de equipes de louvor, escalas, repertório musical e presença em cultos. Desenvolvido com arquitetura **Offline-First** para máxima confiabilidade.

## ✨ Características Principais

### 🚀 **Tecnologia de Ponta**
- **React 19** com TypeScript para desenvolvimento moderno
- **Vite** para build ultra-rápido
- **Supabase** como backend escalável
- **Tailwind CSS** para design responsivo e elegante
- **PWA** (Progressive Web App) para instalação nativa

### 📱 **Offline-First Architecture**
- ✅ Funciona 100% offline após primeira sincronização
- ✅ Cache inteligente de dados e imagens
- ✅ Sincronização automática em background
- ✅ Interface responsiva para desktop e mobile

### 🎯 **Funcionalidades Completas**
- 👥 **Gestão de Equipes**: Cadastro e organização de membros
- 📅 **Escalas de Louvor**: Planejamento e controle de escalas
- 🎼 **Repertório Musical**: Catálogo completo de músicas
- 📊 **Presença em Cultos**: Controle de frequência
- 🖼️ **Galeria de Imagens**: Cache automático de fotos
- 🌙 **Modo Escuro**: Interface adaptável
- 🔄 **Sincronização**: Dados sempre atualizados

## 🛠️ Instalação e Configuração

### Pré-requisitos
- **Node.js** 18+
- **npm** ou **yarn**
- Conta no **Supabase** (para backend)

### 1. Clone o Repositório
```bash
git clone <repository-url>
cd spa-louvor
```

### 2. Instale as Dependências
```bash
npm install
```

### 3. Configure o Supabase
1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie as credenciais do projeto
3. Configure as variáveis de ambiente em `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Execute o Sistema
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 🏗️ Arquitetura do Sistema

### **Offline-First Strategy**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Interface     │◄──►│  Cache Local    │◄──►│   Supabase       │
│   React + TS    │    │ LocalStorage    │    │   Database       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   📱 Mobile/Desktop      💾 Dados Offline       ☁️ Sincronização
```

### **Estrutura de Dados**
- **Membros**: Perfil, foto, funções
- **Cultos**: Tipos e configurações
- **Escalas**: Planejamento semanal
- **Músicas**: Repertório com tons
- **Presença**: Controle de frequência
- **Avisos**: Comunicação interna

### **Cache Inteligente**
- **Imagens**: Download automático durante sincronização
- **Dados**: TTL configurável (30min padrão)
- **Sincronização**: Background a cada 2 minutos
- **Quota**: Limite de 500KB por imagem

## 📱 Funcionalidades Detalhadas

### 👥 Gestão de Equipes
- Cadastro completo de membros
- Upload de fotos com cache automático
- Controle de funções e ministérios
- Dashboard de KPIs por equipe

### 📅 Sistema de Escalas
- Interface drag-and-drop
- Visualização calendário/mês
- Controle de conflitos
- Notificações automáticas

### 🎼 Repertório Musical
- Catálogo organizado por temas
- Controle de tons e afinações
- Histórico de execuções
- Sugestões inteligentes

### 📊 Relatórios e Analytics
- Presença por membro/culto
- Performance de equipes
- Estatísticas de repertório
- Exportação de dados

## 🔧 Configuração Avançada

### **Variáveis de Ambiente**
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Cache
VITE_CACHE_TTL=1800000          # 30 minutos
VITE_SYNC_INTERVAL=120000       # 2 minutos
VITE_IMAGE_CACHE_LIMIT=512000   # 500KB
```

### **Personalização**
- **Cores**: Tema customizável via CSS variables
- **Logos**: Substituição fácil de assets
- **Textos**: Internacionalização preparada
- **Layout**: Componentes modulares

## 🚀 Deploy e Produção

### **Vercel (Recomendado)**
```bash
npm install -g vercel
vercel --prod
```

### **Netlify**
```bash
npm run build
# Upload da pasta dist/
```

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview"]
```

## 🧪 Testes e Qualidade

### **Testes Offline**
1. Abra o app online para primeira sincronização
2. Desconecte da internet
3. Verifique funcionamento completo
4. Teste upload de dados (serão sincronizados quando online)

### **Performance**
- **Lighthouse Score**: 95+ em todas as métricas
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 750KB gzipped

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 🙏 Agradecimentos

- **Supabase** por fornecer backend incrível
- **Vite** pela experiência de desenvolvimento excepcional
- **Tailwind CSS** pelo sistema de design intuitivo
- **React** pela melhor biblioteca frontend

## 📞 Suporte

Para suporte técnico ou dúvidas:
- 📧 Email: suporte@louvor.com
- 💬 Discord: [Servidor da Comunidade]
- 📖 Documentação: [Link para docs completas]

---

<div align="center">
  <p>Feito com ❤️ para igrejas e ministérios de louvor</p>
  <p>
    <a href="#instalação-e-configuração">🚀 Começar</a> •
    <a href="#funcionalidades-detalhadas">📱 Funcionalidades</a> •
    <a href="#arquitetura-do-sistema">🏗️ Arquitetura</a> •
    <a href="#suporte">📞 Suporte</a>
  </p>
</div>
