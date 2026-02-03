# Cloud Worship - Sistema de Gestão de Louvor

<div align="center">
  <img src="/Cloud Worship.png" alt="Cloud Worship Logo" width="200" />
  
  **Sistema moderno para gestão de equipes de louvor e escalas de culto**
  
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue.svg)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.0-38B2AC.svg)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E.svg)](https://supabase.com/)
  [![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF.svg)](https://vitejs.dev/)
</div>

## 📋 Sobre o Projeto

O Cloud Worship é uma aplicação web moderna desenvolvida para ajudar igrejas a gerenciar suas equipes de louvor, organizar escalas de culto e facilitar a comunicação entre os membros. Com uma interface intuitiva e recursos poderosos, o sistema simplifica a administração do ministério de música.

### ✨ Funcionalidades Principais

- 🎵 **Gestão de Músicas**: Catálogo completo de músicas com letras, cifras e histórico
- 👥 **Gestão de Equipe**: Cadastro de membros, funções e escalonamento automático
- 📅 **Escalas Inteligentes**: Criação e gerenciamento de escalas de culto
- 📊 **Dashboard Analítico**: Visualização de estatísticas e KPIs em tempo real
- 🌙 **Modo Escuro**: Interface adaptável com tema claro/escuro
- 📱 **Design Responsivo**: Experiência otimizada para desktop e mobile
- 🔐 **Autenticação Segura**: Login com Supabase Auth
- ⚡ **Transições Suaves**: Animações fluidas entre páginas

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca principal de UI
- **TypeScript** - Tipagem estática e desenvolvimento seguro
- **React Router DOM** - Sistema de rotas e navegação
- **Framer Motion** - Animações e transições
- **Tailwind CSS** - Framework de estilização
- **Chart.js** - Visualização de dados

### Backend & Database
- **Supabase** - Banco de dados PostgreSQL e autenticação
- **Realtime Subscriptions** - Atualizações em tempo real

### Ferramentas
- **Vite** - Build tool e servidor de desenvolvimento
- **ESLint** - Linting e qualidade de código
- **Prettier** - Formatação de código

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── auth/           # Telas de autenticação
│   ├── dashboard/      # Dashboard principal
│   ├── equipe/         # Gestão de equipe
│   ├── escalas/        # Gestão de escalas
│   ├── layout/         # Componentes de layout
│   ├── musicas/        # Gestão de músicas
│   └── ui/             # Componentes genéricos
├── contexts/           # Contextos React (Auth, Theme)
├── hooks/              # Hooks personalizados
├── routes/             # Configuração de rotas
├── utils/              # Funções utilitárias
├── types/              # Definições de tipos TypeScript
└── App.tsx             # Componente principal
```

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase (para backend)

### Passo 1: Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/cloud-worship.git
cd cloud-worship
```

### Passo 2: Instalar Dependências

```bash
npm install
```

### Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
```

### Passo 4: Executar o Projeto

```bash
# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🔧 Configuração do Supabase

1. Crie um novo projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Configure as tabelas necessárias usando o SQL Editor:
   ```sql
   -- Exemplo de tabelas básicas
   CREATE TABLE members (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL,
     email TEXT UNIQUE,
     role TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE TABLE events (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     title TEXT NOT NULL,
     date TIMESTAMP NOT NULL,
     description TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```
3. Copie a URL e a chave anônima do seu projeto Supabase
4. Adicione ao arquivo `.env.local`

## 📱 Como Usar

### 1. Autenticação
- Acesse a aplicação e faça login com suas credenciais
- Novos usuários podem criar uma conta

### 2. Dashboard
- Visualize estatísticas da equipe e próximos eventos
- Acompanhe KPIs importantes do ministério

### 3. Gestão de Equipe
- Adicione membros à equipe
- Defina funções (vocal, instrumentista, técnico, etc.)
- Visualize informações de contato

### 4. Escalas
- Crie novas escalas para cultos e eventos
- Atribua membros às funções
- Envie notificações automáticas

### 5. Músicas
- Adicione músicas ao catálogo
- Inclua letras e cifras
- Crie repertórios para eventos

## 🎨 Personalização

### Cores da Marca
As cores principais podem ser personalizadas através do CSS:
```css
:root {
  --brand-primary: #1e3a8a;  /* Azul principal */
  --brand-accent: #eab308;   /* Dourado/Amarelo */
}
```

### Tema Escuro
O tema escuro pode ser ativado através do botão na sidebar ou automaticamente seguindo as preferências do sistema.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a MIT License.

## 🆘 Suporte

- 📧 Email: suporte@cloudworship.com
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/cloud-worship/issues)

---

<div align="center">
  **Feito com ❤️ para a glória de Deus**
</div>
