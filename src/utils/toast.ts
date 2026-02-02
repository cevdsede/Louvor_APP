// Sistema de Toast Global para Louvor CEVD
class ToastManager {
  private static instance: ToastManager;
  private toastContainer: HTMLElement | null = null;

  private constructor() {
    this.createContainer();
  }

  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  private createContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'toast-container';
    this.toastContainer.className = 'fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none';
    document.body.appendChild(this.toastContainer);
  }

  public showToast(
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'success', 
    duration: number = 3000,
    options?: {
      title?: string;
      persistent?: boolean;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) {
    if (!this.toastContainer) {
      this.createContainer();
    }

    const toast = document.createElement('div');
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Definir classes base
    toast.id = toastId;
    toast.className = `pointer-events-auto transform transition-all duration-300 translate-x-full max-w-sm w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden`;
    
    // Definir cor da borda baseada no tipo
    const borderColors = {
      success: 'border-l-4 border-l-green-500',
      error: 'border-l-4 border-l-red-500',
      warning: 'border-l-4 border-l-amber-500',
      info: 'border-l-4 border-l-blue-500'
    };
    
    toast.classList.add(...borderColors[type].split(' '));

    // Ícones para cada tipo
    const icons = {
      success: '<i class="fas fa-check-circle text-green-500"></i>',
      error: '<i class="fas fa-exclamation-circle text-red-500"></i>',
      warning: '<i class="fas fa-exclamation-triangle text-amber-500"></i>',
      info: '<i class="fas fa-info-circle text-blue-500"></i>'
    };

    // Construir conteúdo do toast
    let contentHTML = `
      <div class="p-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            ${icons[type]}
          </div>
          <div class="flex-1 min-w-0">
            ${options?.title ? `<h4 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">${options.title}</h4>` : ''}
            <p class="text-sm text-slate-700 dark:text-slate-300">${message}</p>
            ${options?.action ? `
              <button class="toast-action mt-2 text-sm font-medium text-brand hover:text-brand/80 transition-colors" data-toast-id="${toastId}">
                ${options.action.label}
              </button>
            ` : ''}
          </div>
          ${!options?.persistent ? `
            <button class="toast-close flex-shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors" data-toast-id="${toastId}">
              <i class="fas fa-times text-sm"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    toast.innerHTML = contentHTML;
    this.toastContainer!.appendChild(toast);

    // Adicionar eventos
    const closeBtn = toast.querySelector('.toast-close');
    const actionBtn = toast.querySelector('.toast-action');

    const closeToast = () => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };

    closeBtn?.addEventListener('click', closeToast);

    if (actionBtn && options?.action) {
      actionBtn.addEventListener('click', () => {
        options.action.onClick();
        closeToast();
      });
    }

    // Animar entrada
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
      toast.classList.add('translate-x-0');
    }, 100);

    // Auto-fechar se não for persistente
    if (!options?.persistent) {
      setTimeout(() => {
        closeToast();
      }, duration);
    }

    return toastId;
  }

  // Métodos de conveniência
  public success(message: string, title?: string, duration?: number) {
    return this.showToast(message, 'success', duration, { title });
  }

  public error(message: string, title?: string, duration?: number) {
    return this.showToast(message, 'error', duration, { title });
  }

  public warning(message: string, title?: string, duration?: number) {
    return this.showToast(message, 'warning', duration, { title });
  }

  public info(message: string, title?: string, duration?: number) {
    return this.showToast(message, 'info', duration, { title });
  }

  // Toast com ação
  public persistent(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', options?: { title?: string; action?: { label: string; onClick: () => void } }) {
    return this.showToast(message, type, 0, { ...options, persistent: true });
  }

  // Limpar todos os toasts
  public clearAll() {
    if (this.toastContainer) {
      this.toastContainer.innerHTML = '';
    }
  }
}

// Exportar instância global
export const toast = ToastManager.getInstance();

// Exportar funções de conveniência
export const showSuccess = (message: string, title?: string, duration?: number) => toast.success(message, title, duration);
export const showError = (message: string, title?: string, duration?: number) => toast.error(message, title, duration);
export const showWarning = (message: string, title?: string, duration?: number) => toast.warning(message, title, duration);
export const showInfo = (message: string, title?: string, duration?: number) => toast.info(message, title, duration);

// Exportar padrão
export default toast;
