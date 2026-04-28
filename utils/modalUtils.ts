import React from 'react';
import { showSuccess, showError, showWarning } from './toast';

export interface ModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const ModalUtils = {
  /**
   * Modal de confirmação personalizado
   */
  confirm: (options: ModalOptions): Promise<boolean> => {
    const {
      title,
      message,
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      type = 'info',
      onConfirm,
      onCancel
    } = options;

    // Criar modal customizado usando HTML/CSS
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
      <div class="custom-modal">
        <div class="custom-modal-header">
          <div class="custom-modal-icon ${type}">
            ${ModalUtils.getIcon(type)}
          </div>
          <h3 class="custom-modal-title">${title}</h3>
        </div>
        <div class="custom-modal-body">
          <div class="custom-modal-message">${message}</div>
        </div>
        <div class="custom-modal-footer">
          <button class="custom-modal-btn cancel" data-action="cancel">
            ${cancelText}
          </button>
          <button class="custom-modal-btn confirm ${type}" data-action="confirm">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    // Adicionar estilos
    ModalUtils.addModalStyles();

    // Adicionar ao DOM
    document.body.appendChild(modal);

    // Adicionar animação de entrada
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Adicionar event listeners
    return new Promise<boolean>((resolve) => {
      const handleAction = (action: string) => {
        modal.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(modal);
          if (action === 'confirm') {
            onConfirm?.();
            resolve(true);
          } else {
            onCancel?.();
            resolve(false);
          }
        }, 300);
      };

      modal.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.action) {
          handleAction(target.dataset.action);
        } else if (target === modal) {
          handleAction('cancel');
        }
      });

      // Suporte a teclas
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleAction('cancel');
        if (e.key === 'Enter') handleAction('confirm');
      };

      document.addEventListener('keydown', handleKeydown);
      
      // Limpar listener
      setTimeout(() => {
        document.removeEventListener('keydown', handleKeydown);
      }, 10000); // Timeout de segurança
    });
  },

  /**
   * Modal de confirmação de exclusão
   */
  confirmDelete: (itemName: string, details?: string): Promise<boolean> => {
    return ModalUtils.confirm({
      title: 'Confirmar Exclusão',
      message: details 
        ? `Tem certeza que deseja excluir "${itemName}"?\n\n${details}`
        : `Tem certeza que deseja excluir "${itemName}"?\n\nEsta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });
  },

  /**
   * Modal de conflito de culto
   */
  confirmCultoConflict: (
    existingCulto: string,
    newCulto: string,
    date: string,
    time: string
  ): Promise<boolean> => {
    return ModalUtils.confirm({
      title: 'Conflito de Agendamento',
      message: `Já existe um culto agendado para este dia e horário:\n\n` +
        `• Culto existente: <strong>${existingCulto}</strong>\n` +
        `• Novo culto: <strong>${newCulto}</strong>\n` +
        `• Data: ${date}\n` +
        `• Horário: ${time}\n\n` +
        `Deseja substituir o nome do culto existente?`,
      confirmText: 'Substituir',
      cancelText: 'Cancelar',
      type: 'warning'
    });
  },

  /**
   * Obter ícone baseado no tipo
   */
  getIcon: (type: string): string => {
    const icons = {
      info: '<i class="fas fa-info-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      danger: '<i class="fas fa-trash-alt"></i>',
      success: '<i class="fas fa-check-circle"></i>'
    };
    return icons[type as keyof typeof icons] || icons.info;
  },

  /**
   * Adicionar estilos CSS ao documento
   */
  addModalStyles: () => {
    // Verificar se já existe
    if (document.getElementById('custom-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'custom-modal-styles';
    styles.textContent = `
      .custom-modal-overlay {
        position: fixed;
        top: 0;
        left: 256px;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .custom-modal-overlay::before {
        content: '';
        position: absolute;
        top: 0;
        left: -256px;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .custom-modal-overlay.show {
        opacity: 1;
      }

      .custom-modal {
        background: white;
        border-radius: 1.5rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        transform: scale(0.9);
        transition: transform 0.3s ease;
        position: relative;
        z-index: 1;
      }

      .custom-modal-overlay.show .custom-modal {
        transform: scale(1);
      }

      .custom-modal-header {
        padding: 2rem 2rem 1rem;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
      }

      .custom-modal-icon {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
        font-size: 1.5rem;
        color: white;
      }

      .custom-modal-icon.info {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      }

      .custom-modal-icon.warning {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }

      .custom-modal-icon.danger {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }

      .custom-modal-icon.success {
        background: linear-gradient(135deg, #10b981, #059669);
      }

      .custom-modal-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0;
        line-height: 1.2;
      }

      .custom-modal-body {
        padding: 1.5rem 2rem;
      }

      .custom-modal-message {
        font-size: 1rem;
        line-height: 1.6;
        color: #4b5563;
        white-space: pre-line;
      }

      .custom-modal-message strong {
        color: #1f2937;
        font-weight: 600;
      }

      .custom-modal-footer {
        padding: 1rem 2rem 2rem;
        display: flex;
        gap: 1rem;
        justify-content: center;
        border-top: 1px solid #e5e7eb;
      }

      .custom-modal-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.75rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        min-width: 100px;
      }

      .custom-modal-btn.cancel {
        background: #f3f4f6;
        color: #6b7280;
      }

      .custom-modal-btn.cancel:hover {
        background: #e5e7eb;
        color: #4b5563;
      }

      .custom-modal-btn.confirm {
        background: #3b82f6;
        color: white;
      }

      .custom-modal-btn.confirm.info:hover {
        background: #2563eb;
      }

      .custom-modal-btn.confirm.warning:hover {
        background: #f59e0b;
      }

      .custom-modal-btn.confirm.danger:hover {
        background: #ef4444;
      }

      .custom-modal-btn.confirm.success:hover {
        background: #10b981;
      }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .custom-modal {
          background: #1f2937;
          color: #f9fafb;
        }

        .custom-modal-header {
          border-bottom-color: #374151;
        }

        .custom-modal-title {
          color: #f9fafb;
        }

        .custom-modal-message {
          color: #d1d5db;
        }

        .custom-modal-message strong {
          color: #f9fafb;
        }

        .custom-modal-footer {
          border-top-color: #374151;
        }

        .custom-modal-btn.cancel {
          background: #374151;
          color: #d1d5db;
        }

        .custom-modal-btn.cancel:hover {
          background: #4b5563;
          color: #e5e7eb;
        }
      }

      /* Responsive */
      @media (max-width: 640px) {
        .custom-modal-overlay {
          left: 0;
        }

        .custom-modal-overlay::before {
          display: none;
        }

        .custom-modal {
          width: 95%;
          margin: 1rem;
        }

        .custom-modal-header,
        .custom-modal-body,
        .custom-modal-footer {
          padding-left: 1.5rem;
          padding-right: 1.5rem;
        }

        .custom-modal-title {
          font-size: 1.25rem;
        }

        .custom-modal-footer {
          flex-direction: column;
        }

        .custom-modal-btn {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(styles);
  }
};

export default ModalUtils;
