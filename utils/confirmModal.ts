/**
 * Modal de Confirmação Universal
 * Substitui alert() e confirm() por modais modernos
 */

interface ConfirmModalOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: string;
}

export const showConfirmModal = (options: ConfirmModalOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    const {
      title = 'Confirmar Ação',
      message,
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      type = 'danger',
      icon = type === 'danger' ? 'fa-exclamation-triangle' : type === 'warning' ? 'fa-exclamation' : 'fa-info-circle'
    } = options;

    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50';
    modal.style.zIndex = '9999';

    // Cores baseadas no tipo
    const colors = {
      danger: 'bg-red-100 dark:bg-red-900/20 text-red-500',
      warning: 'bg-amber-100 dark:bg-amber-900/20 text-amber-500',
      info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-500'
    };

    const buttonColors = {
      danger: 'bg-red-500 hover:bg-red-600',
      warning: 'bg-amber-500 hover:bg-amber-600',
      info: 'bg-blue-500 hover:bg-blue-600'
    };

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 ${colors[type]} rounded-full flex items-center justify-center">
            <i class="fas ${icon}"></i>
          </div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-white">${title}</h3>
        </div>
        <p class="text-slate-600 dark:text-slate-300 mb-6">${message}</p>
        <div class="flex gap-3">
          <button id="cancelBtn" class="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            ${cancelText}
          </button>
          <button id="confirmBtn" class="flex-1 py-2 ${buttonColors[type]} text-white rounded-lg font-bold transition-colors">
            ${confirmText}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar estilos de animação se não existirem
    if (!document.querySelector('#confirm-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'confirm-modal-styles';
      style.textContent = `
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Adicionar eventos
    const cancelBtn = modal.querySelector('#cancelBtn');
    const confirmBtn = modal.querySelector('#confirmBtn');
    
    const closeModal = (result: boolean) => {
      document.body.removeChild(modal);
      resolve(result);
    };
    
    cancelBtn?.addEventListener('click', () => closeModal(false));
    confirmBtn?.addEventListener('click', () => closeModal(true));
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(false);
      }
    });
    
    // Fechar ao pressionar ESC
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEsc);
        closeModal(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
};

// Funções de conveniência para tipos comuns
export const confirmDelete = (itemName: string = 'este item') => {
  return showConfirmModal({
    title: 'Confirmar Exclusão',
    message: `Tem certeza que deseja excluir ${itemName}?`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    type: 'danger',
    icon: 'fa-trash-alt'
  });
};

export const confirmAction = (action: string, itemName: string = 'esta ação') => {
  return showConfirmModal({
    title: 'Confirmar Ação',
    message: `Tem certeza que deseja ${action} ${itemName}?`,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'warning',
    icon: 'fa-exclamation'
  });
};

export const confirmInfo = (message: string, title: string = 'Informação') => {
  return showConfirmModal({
    title,
    message,
    confirmText: 'OK',
    cancelText: '',
    type: 'info',
    icon: 'fa-info-circle'
  });
};
