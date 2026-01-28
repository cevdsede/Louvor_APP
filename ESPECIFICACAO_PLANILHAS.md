# Especificação de Planilhas e Colunas - Sistema Louvor

Este documento especifica todas as planilhas do Google Sheets utilizadas pelo sistema e suas respectivas colunas.

---

## 📊 PLANILHAS UTILIZADAS

### 1. **Acesso** (Login/Autenticação)
**Arquivo:** `Login.html`  
**Endpoint:** `?sheet=Acesso`

#### Colunas:
- `User` - Login do usuário (string)
- `Senha` - Senha de acesso (string/number)
- `Nome` - Nome completo do usuário
- `Perfil` - Perfil de acesso (Admin, Lider, User, etc.)

#### Uso:
- Autenticação de usuários
- Controle de permissões por perfil

---

### 2. **Transformar** (Escalas)
**Arquivos:** `index_logic.js`, `Escalas.html`, `Escala Calendario.html`, `Cadastro de Repertorio.html`  
**Endpoint:** `?sheet=Transformar`

#### Colunas:
- `Data` - Data da escala (formato ISO: YYYY-MM-DD)
- `Nome` - Nome do componente escalado
- `Cultos` - ID/código do culto
- `Nome dos Cultos` - Nome descritivo do culto
- `Função` - Função do componente (Ministro, Back, Violão, Guitarra, Teclado, Baixo, Bateria, etc.)
- `User` (opcional) - User ID para matching com login

#### Uso:
- Dashboard principal (gráfico de participações)
- Calendário de escalas
- Notificações de escalas
- KPI "Sua Próxima Escala"
- Cadastro de repertório

---

### 3. **Repertório**
**Arquivos:** `index_logic.js`, `Repertorio.html`, `Escalas.html`, `Escala Calendario.html`, `MenuMusicas.html`  
**Endpoint:** `?sheet=Repertório`

#### Colunas:
- `Culto+Data` - Chave composta: "Nome do Culto (DD/MM)"
- `Músicas` - Lista de músicas do repertório (separadas por vírgula ou quebra de linha)

#### Uso:
- Visualização de repertórios por culto
- Notificações de repertório definido
- Integração com escalas

---

### 4. **Musicas** (Biblioteca de Músicas)
**Arquivos:** `index_logic.js`, `Musicas.html`, `MenuMusicas.html`, `Cadastro de Repertorio.html`  
**Endpoint:** `?sheet=Musicas`

#### Colunas:
- `Músicas` - Nome da música
- `Cantor` - Artista/cantor
- `Tema` - Tema/categoria (Adoração, Louvor, etc.)
- `Estilo` - Estilo musical (Contemporâneo, Gospel, etc.)

#### Uso:
- Biblioteca completa de músicas
- Busca e filtros por tema/estilo
- Links automáticos (YouTube, Spotify, Cifra Club, Letras)
- Cadastro de repertório

---

### 5. **Componentes** (Membros da Equipe)
**Arquivos:** `index_logic.js`, `Componentes.html`, `Chamada.html`  
**Endpoint:** `?sheet=Componentes`

#### Colunas:
- `Nome` - Nome do componente
- `Função` - Função principal (Ministro, Back, Violão, etc.)
- `Ativo` - Status (SIM/NÃO)
- `Genero` / `Gênero` / `Sexo` - Gênero (MASCULINO/FEMININO, MASC/FEM, M/F, HOMEM/MULHER)
- `Foto` - Caminho/nome do arquivo de foto
- `Tel sem Espaço` - Telefone sem formatação
- `Whatsapp` (objeto com `link`) - Link do WhatsApp

#### Uso:
- Dashboard de componentes
- Gráficos de gênero
- KPIs por função
- Perfis detalhados
- Chamada de consagração

---

### 6. **Tema Músicas**
**Arquivos:** `index_logic.js`, `Cadastro de Musicas.html`  
**Endpoint:** `?sheet=Tema Músicas` (com encodeURIComponent)

#### Colunas:
- (Estrutura não especificada nos arquivos, mas usada para temas de músicas)

#### Uso:
- Categorização de músicas por tema
- Cadastro de novas músicas

---

### 7. **Lembretes** (Avisos)
**Arquivos:** `index_logic.js`, `Escalas.html`, `Escala Calendario.html`  
**Endpoint:** `?sheet=Lembretes`

#### Colunas:
- `id_Lembrete` - ID único do lembrete
- `Culto` - Culto relacionado OU "AVISO_LIDER" para avisos gerais
- `Info` - Texto do aviso/lembrete
- `Componente` - Nome de quem criou o aviso
- `Data` - Data do aviso (formato ISO)

#### Uso:
- Avisos por culto
- Avisos para líderes (visível apenas para Lider/Admin/Autor)
- Notificações push
- Exclusão de avisos (server-side)

---

### 8. **Historico de Músicas**
**Arquivos:** `index_logic.js`, `Historico de Musicas.html`  
**Endpoint:** `?sheet=Historico de Músicas` (com encodeURIComponent)

#### Colunas:
- `Cantor` - Nome do cantor/ministro
- `Músicas` / `Musica` / `Música` - Nome da música cantada
- `Tom` / `Tons` - Tom em que foi cantada
- (Outras colunas possíveis: Data, Culto, etc.)

#### Uso:
- Histórico de músicas cantadas por pessoa
- Modal de detalhes do componente
- Análise de repertório pessoal

---

### 9. **Consagração** (Aulas de Consagração)
**Arquivos:** `sync.js`, `Chamada.html`  
**Endpoint:** `?sheet=Consagração`

#### Colunas:
- `ID_AULA` / `ID` - ID único da aula
- `TEMA` / `Tema` - Tema da aula
- `DATA` / `Data` - Data da aula (formato ISO)
- `STATUS` - Status da aula (FECHADO, etc.)

#### Uso:
- Gestão de aulas de consagração
- Lista de eventos
- Chamada de presença

---

### 10. **Comp_Cons** (Presença em Consagração)
**Arquivos:** `sync.js`, `Chamada.html`  
**Endpoint:** `?sheet=Comp_Cons`

#### Colunas:
- `ID_AULA` - ID da aula (FK)
- `NOME` - Nome do componente
- `PRESENÇA` - Status (PRESENTE, AUSENTE, JUSTIFICADO)
- `COMPONENTES` / `Justificativa` - Texto de justificativa (se aplicável)

#### Uso:
- Registro de presença em aulas
- Relatórios de frequência
- Justificativas de ausência

---

## 🔄 AÇÕES DO SISTEMA (POST)

### Ações Disponíveis:
1. **`action=addRow`** - Adiciona linha em qualquer planilha
2. **`action=delete`** - Deleta registro (usado em Lembretes e Musicas)
3. **`action=saveAttendance`** - Salva chamada de presença
4. **`action=deleteEvent`** - Deleta evento de consagração
5. **`action=getImages`** - Retorna banco de imagens

---

## 📁 ARMAZENAMENTO LOCAL (LocalStorage)

### Chaves utilizadas:
- `offline_escala` - Cache da planilha Transformar
- `offline_repertorio` - Cache da planilha Repertório
- `offline_musicas` - Cache da planilha Musicas
- `offline_componentes` - Cache da planilha Componentes
- `offline_temas` - Cache da planilha Tema Músicas
- `offline_lembretes` - Cache da planilha Lembretes
- `offline_historico` - Cache da planilha Historico de Músicas
- `offline_imagens` - Cache do banco de imagens
- `offline_consagracao` - Cache da planilha Consagração
- `offline_chamada` - Cache da planilha Comp_Cons
- `user_token` - Token do usuário logado
- `last_user_name` - Último nome de usuário
- `user_notificacoes` - Notificações do usuário
- `notificacoes_conhecidas_ids` - IDs de notificações já vistas
- `last_full_sync` - Data/hora da última sincronização completa
- `sync_queue` - Fila de sincronização offline
- `tema_escolhido_id` - ID do tema visual escolhido

---

## 🎨 OBSERVAÇÕES IMPORTANTES

### Filtros Globais:
- **Convidados são excluídos** de todos os gráficos, KPIs e listagens
- Filtro aplicado quando:
  - `Nome` contém "CONVIDADO" (case-insensitive)
  - `Função` contém "CONVIDADO" (case-insensitive)

### Normalização de Texto:
- Sistema remove acentos para comparações
- Conversão para lowercase para matching
- Usado em: notificações, busca de componentes, filtros

### Formatos de Data:
- **Entrada:** ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ)
- **Exibição:** DD/MM/AAAA (pt-BR)
- **Comparações:** Sempre em objetos Date do JavaScript

### Sincronização:
- **Automática:** A cada 5 minutos (background)
- **Manual:** Botão de sincronização em cada página
- **Offline:** Fila de sincronização (sync_queue)
- **Periodic Sync:** A cada 12 horas (quando suportado)

---

## 🔐 PERFIS DE ACESSO

### Tipos de Perfil:
1. **SuperAdmin** - Acesso total
2. **Admin** - Acesso administrativo
3. **Lider** - Acesso de liderança (vê avisos especiais)
4. **User** - Acesso padrão

### Permissões Especiais:
- **Avisos Lider:** Visível apenas para Lider, Admin, SuperAdmin e autor
- **Exclusão de Avisos:** Apenas Lider, Admin, SuperAdmin e autor
- **Acesso Mesa:** Controlado por permissões específicas

---

## 📱 ENDPOINTS DA API

### URL Base:
```
https://script.google.com/macros/s/AKfycbwjwn6-sdv8f4BLLwaqQWPc4yNI8CS40gO8J77GrJDqLncENJncWIfAV-FBkZuZP6k/exec
```

### Formato de Requisição GET:
```
{URL_BASE}?sheet={NOME_DA_PLANILHA}
```

### Formato de Requisição POST:
```javascript
{
  action: "addRow" | "delete" | "saveAttendance" | "deleteEvent",
  sheet: "Nome da Planilha",
  data: { /* dados específicos */ }
}
```

---

## 📊 RESUMO QUANTITATIVO

- **Total de Planilhas:** 10
- **Total de Arquivos HTML:** 19
- **Total de Arquivos JS:** 6 (principais)
- **Colunas Únicas Identificadas:** ~40+
- **Ações POST:** 5
- **Chaves LocalStorage:** 15+

---

**Última Atualização:** Janeiro 2026  
**Versão do Sistema:** 2.4
