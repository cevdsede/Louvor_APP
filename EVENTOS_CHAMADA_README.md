# 📋 **Funcionalidade de Eventos e Chamada**

## 🎯 **Visão Geral**

Nova funcionalidade completa para gestão de eventos e controle de presença na aba "Chamada" do módulo Equipe.

---

## 🚀 **Funcionalidades Implementadas**

### **1. 📅 Gestão de Eventos**
- **Criar Eventos**: Formulário completo com tema, data e horário
- **Editar Eventos**: Atualização de informações do evento
- **Excluir Eventos**: Remoção segura com confirmação
- **Listagem Visual**: Cards com informações detalhadas
- **Geração Automática**: Lista de presença criada automaticamente

### **2. 📝 Controle de Presença**
- **Lista Automática**: Todos os membros ativos adicionados como "ausente"
- **Status Rápidos**: Botões para Presente/Ausente/Justificado
- **Justificativas**: Campo de texto para ausências justificadas
- **Filtros Inteligentes**: Por status e busca por nome
- **Estatísticas em Tempo Real**: Contadores de presentes/ausentes/justificados

### **3. 🎨 Interface Moderna**
- **Design Responsivo**: Funciona perfeitamente em mobile e desktop
- **Feedback Visual**: Cores diferentes para cada status
- **Navegação Intuitiva**: Voltar/avançar entre eventos e chamada
- **Loading States**: Indicadores de carregamento
- **Toast Notifications**: Feedback de ações

---

## 📁 **Estrutura de Arquivos**

```
├── services/
│   ├── EventService.ts          # Serviço completo para eventos e presenças
│   └── index.ts                 # Exportações
├── components/equipe/
│   ├── EventsView.tsx          # Listagem e gestão de eventos
│   ├── AttendanceView.tsx      # Controle de presença
│   └── TeamView.tsx            # Integração no módulo equipe
└── database/
    └── create_presenca_evento_table.sql  # Script SQL
```

---

## 🗄️ **Banco de Dados**

### **Tabela: eventos**
```sql
CREATE TABLE eventos (
  id_evento TEXT PRIMARY KEY,
  tema TEXT NOT NULL,
  data_evento DATE NOT NULL,
  horario_evento TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Tabela: presenca_evento (ESTRUTURA REAL)**
```sql
CREATE TABLE presenca_evento (
  id_chamada uuid NOT NULL DEFAULT gen_random_uuid(),
  id_evento uuid NULL,
  presenca text NULL,
  justificativa text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  id_membro uuid NULL,
  CONSTRAINT presenca_evento_pkey PRIMARY KEY (id_chamada),
  CONSTRAINT fk_presenca_membros FOREIGN KEY(id_membro) REFERENCES membros(id),
  CONSTRAINT presenca_consagracao_id_evento_fkey FOREIGN KEY(id_evento) REFERENCES eventos(id_evento)
) TABLESPACE pg_default;
```

---

## 🔧 **Como Usar**

### **1. Acessar a Funcionalidade**
1. Vá para aba **Equipe**
2. Clique em **Chamada** no toolbar
3. Você verá a lista de eventos

### **2. Criar um Evento**
1. Clique em **"Novo Evento"**
2. Preencha:
   - **Tema**: Ex: "Culto de Celebração"
   - **Data**: Selecione no calendário
   - **Horário**: Defina o horário
3. Clique em **"Criar Evento"**
4. ✅ Lista de presença gerada automaticamente

### **3. Fazer a Chamada**
1. Na lista de eventos, clique em **"Ver Chamada"**
2. Você verá todos os membros como "ausente"
3. Para cada membro, clique:
   - 🟢 **Presente**: Marca como presente
   - 🔴 **Ausente**: Mantém como ausente
   - 🟡 **Justificado**: Abre campo para justificativa

### **4. Justificar Ausência**
1. Clique em **"Justificado"**
2. Digite o motivo no campo que aparece
3. Pressione **Enter** ou clique no ✅
4. ✅ Justificativa salva

### **5. Gerenciar Eventos**
- **✏️ Editar**: Clique no ícone de editar no card do evento
- **🗑️ Excluir**: Clique no ícone de lixeira (com confirmação)
- **📊 Ver Estatísticas**: Contadores visuais na tela de chamada

---

## 🎯 **Fluxo Completo**

```
1. Criar Evento
   ↓
2. Lista de Presença Gerada Automaticamente
   (todos os membros ativos = "ausente")
   ↓
3. Fazer Chamada
   ↓
4. Atualizar Status (Presente/Ausente/Justificado)
   ↓
5. Salvar Justificativas (se necessário)
   ↓
6. Visualizar Estatísticas em Tempo Real
```

---

## 🔐 **Segurança**

- **RLS Ativo**: Políticas de segurança em todas as tabelas
- **Apenas Autenticados**: Usuários logados podem gerenciar
- **Validações**: Dados validados no frontend e backend
- **SQL Injection**: Protegido pelo Supabase

---

## 📱 **Responsividade**

- **Mobile**: Cards empilhados, botões grandes
- **Tablet**: Grid 2 colunas, interface otimizada
- **Desktop**: Grid 3 colunas, mouse hover effects

---

## 🚀 **Performance**

- **Lazy Loading**: Componentes carregados sob demanda
- **Cache Local**: Estado mantido durante navegação
- **Batch Updates**: Atualizações em lote para melhor performance
- **Índices BD**: Tabelas otimizadas com índices

---

## 🎨 **Cores e Status**

| Status | Cor | Ícone | Significado |
|--------|------|-------|-------------|
| Presente | 🟢 Verde | ✅ | Membro presente |
| Ausente | 🔴 Vermelho | ❌ | Membro ausente |
| Justificado | 🟡 Amarelo | ⚠️ | Ausência justificada |

---

## 📊 **Estatísticas**

Em tempo real, a tela mostra:
- **Total**: Número de membros na lista
- **Presentes**: Membros marcados como presente
- **Ausentes**: Membros marcados como ausente
- **Justificados**: Membros com justificativa

---

## 🔧 **Instalação**

### **1. Verificar Estrutura**
A tabela `presenca_evento` já existe com a estrutura correta:
- `id_chamada` como UUID primary key
- Relacionamentos com `eventos` e `membros`
- Campos `presenca` e `justificativa` como TEXT

### **2. Verificar Permissões**
- Garanta que a tabela `eventos` existe
- Verifique se `membros` tem campo `ativo`
- Confirme RLS policies ativadas

### **3. Testar Funcionalidade**
1. Acesse aba Equipe → Chamada
2. Crie um evento teste
3. Verifique geração automática da lista
4. Teste atualização de presenças

---

## 🐛 **Troubleshooting**

### **Evento não cria lista de presença**
- Verifique se tabela `membros` existe
- Confirme campo `ativo` é boolean
- Check RLS permissions

### **Presença não atualiza**
- Verifique conexão com Supabase
- Confirme RLS policies
- Check console para errors

### **Justificativa não salva**
- Verifique campo `justificativa` na tabela
- Confirme validação do formulário
- Check se texto não está vazio

---

## 🎯 **Próximos Melhorias**

1. **📱 Notificações**: Lembrar eventos próximos
2. **📊 Relatórios**: Exportar lista de presença
3. **🔄 Recorrência**: Eventos recorrentes
4. **📸 Fotos**: Tirar foto da presença
5. **📧 Emails**: Enviar resumo automático

---

## ✅ **Status: PRONTO PARA USO**

- ✅ Interface completa
- ✅ Banco de dados configurado
- ✅ Serviços implementados
- ✅ Testado e funcionando
- ✅ Documentação completa

**A funcionalidade está 100% operacional!** 🎉
