interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

type ConfirmCallback = () => void | Promise<void>;

export const confirmModal = {
  show: (options: ConfirmOptions, onConfirm: ConfirmCallback, onCancel?: ConfirmCallback): Promise<boolean> => {
    return new Promise((resolve) => {
      const { title = 'Confirmar', message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'info' } = options;
      
      // Em um ambiente real, isso abriria um modal customizado
      // Por enquanto, usando o confirm nativo do navegador
      const confirmMessage = `${title}\n\n${message}`;
      
      if (window.confirm(confirmMessage)) {
        onConfirm();
        resolve(true);
      } else {
        if (onCancel) {
          onCancel();
        }
        resolve(false);
      }
    });
  },
  
  confirmInfo: (message: string, onConfirm: ConfirmCallback, onCancel?: ConfirmCallback): Promise<boolean> => {
    return confirmModal.show(
      { 
        title: 'Informação', 
        message, 
        confirmText: 'OK', 
        cancelText: 'Cancelar',
        type: 'info' 
      },
      onConfirm,
      onCancel
    );
  },
  
  confirmWarning: (message: string, onConfirm: ConfirmCallback, onCancel?: ConfirmCallback): Promise<boolean> => {
    return confirmModal.show(
      { 
        title: 'Atenção', 
        message, 
        confirmText: 'Continuar', 
        cancelText: 'Cancelar',
        type: 'warning' 
      },
      onConfirm,
      onCancel
    );
  },
  
  confirmDanger: (message: string, onConfirm: ConfirmCallback, onCancel?: ConfirmCallback): Promise<boolean> => {
    return confirmModal.show(
      { 
        title: 'Confirmar Ação', 
        message, 
        confirmText: 'Sim', 
        cancelText: 'Não',
        type: 'danger' 
      },
      onConfirm,
      onCancel
    );
  }
};

export const confirmInfo = confirmModal.confirmInfo;
export const confirmWarning = confirmModal.confirmWarning;
export const confirmDanger = confirmModal.confirmDanger;
