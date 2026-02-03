import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    logger.error('ErrorBoundary caught an error:', { error, errorInfo }, 'error');
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Oops! Algo deu errado
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Ocorreu um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Recarregar página
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <div className="mt-2 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 overflow-auto max-h-48">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier usage
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  fallback,
  onError
}) => {
  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
};

// Specific error boundaries for different sections
export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-semibold">Erro no Dashboard</h3>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              Não foi possível carregar os dados do dashboard. Tente recarregar a página.
            </p>
          </div>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      logger.error('Dashboard error:', { error, errorInfo }, 'error');
    }}
  >
    {children}
  </ErrorBoundary>
);

export const MusicErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <i className="fas fa-music text-red-600 dark:text-red-400 text-xl"></i>
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-semibold">Erro na seção de Músicas</h3>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              Não foi possível carregar os dados de músicas. Tente recarregar a página.
            </p>
          </div>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      logger.error('Music section error:', { error, errorInfo }, 'error');
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ScalesErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <i className="fas fa-calendar text-red-600 dark:text-red-400 text-xl"></i>
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-semibold">Erro na seção de Escalas</h3>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              Não foi possível carregar os dados de escalas. Tente recarregar a página.
            </p>
          </div>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      logger.error('Scales section error:', { error, errorInfo }, 'error');
    }}
  >
    {children}
  </ErrorBoundary>
);
