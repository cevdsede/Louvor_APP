# Sistema de Toast Global - Louvor CEVD

## Como usar

### Importação básica
```typescript
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';
```

### Exemplos de uso

```typescript
// Sucesso simples
showSuccess('Operação realizada com sucesso!');

// Sucesso com título
showSuccess('Dados salvos', 'Informações atualizadas com sucesso!');

// Erro
showError('Erro ao conectar ao servidor');

// Erro com título
showError('Falha na autenticação', 'Usuário ou senha incorretos.');

// Aviso
showWarning('Campo obrigatório', 'Preencha todos os campos obrigatórios.');

// Informação
showInfo('Dica', 'Use as setas para navegar entre os campos.');
```

### Uso avançado com a instância direta

```typescript
import { toast } from '../utils/toast';

// Toast com ação customizada
toast.showToast(
  'Deseja salvar as alterações?',
  'info',
  0, // persistente (não fecha automaticamente)
  {
    title: 'Alterações não salvas',
    action: {
      label: 'Salvar',
      onClick: () => {
        // lógica de salvar
        console.log('Salvando...');
      }
    }
  }
);

// Toast com duração customizada
toast.showToast('Mensagem rápida', 'success', 1500);

// Limpar todos os toasts
toast.clearAll();
```

## Características

- ✅ **Design moderno**: Cards com bordas coloridas e ícones
- ✅ **Tipos**: success (verde), error (vermelho), warning (âmbar), info (azul)
- ✅ **Animações suaves**: Slide in/out com fade
- ✅ **Dark mode**: Suporte completo para tema escuro
- ✅ **Responsivo**: Funciona bem em mobile e desktop
- ✅ **Persistentes**: Opção para toasts que não fecham automaticamente
- ✅ **Ações customizadas**: Botões de ação dentro do toast
- ✅ **Auto-close**: Fecha automaticamente após 3 segundos (padrão)
- ✅ **Múltiplos toasts**: Suporta vários toasts simultâneos
- ✅ **Z-index alto**: Aparece sobre outros elementos

## Integração

Para usar em outros componentes:

1. Importe as funções necessárias
2. Substitua `alert()` por `showError()` ou `showSuccess()`
3. Use `showWarning()` para validações
4. Use `showInfo()` para dicas e informações

### Exemplo de migração

**Antes:**
```typescript
alert('Erro ao salvar dados!');
alert('Dados salvos com sucesso!');
```

**Depois:**
```typescript
showError('Erro ao salvar dados!');
showSuccess('Dados salvos com sucesso!');
```

## Benefícios

- 🎨 **UX melhorada**: Feedback visual mais profissional
- 📱 **Mobile-friendly**: Funciona bem em todos os dispositivos
- 🌙 **Dark mode**: Adapta-se ao tema do sistema
- ⚡ **Performance**: Leve e rápido
- 🔧 **Flexível**: Altamente customizável
- 🚀 **Fácil uso**: API simples e intuitiva
