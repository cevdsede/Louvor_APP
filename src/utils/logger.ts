interface LogContext {
  [key: string]: any;
}

export const logger = {
  info: (message: string, data?: any, context?: LogContext) => {
    console.log(`[INFO] ${message}`, data || '', context || '');
  },
  error: (message: string, error?: any, context?: LogContext) => {
    console.error(`[ERROR] ${message}`, error || '', context || '');
  },
  warn: (message: string, data?: any, context?: LogContext) => {
    console.warn(`[WARN] ${message}`, data || '', context || '');
  },
  debug: (message: string, data?: any, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '', context || '');
    }
  },
  // Método específico para autenticação
  auth: (message: string, data?: any) => {
    console.log(`[AUTH] ${message}`, data || '');
  },
  // Método específico para banco de dados
  database: (message: string, data?: any) => {
    console.log(`[DB] ${message}`, data || '');
  }
};
