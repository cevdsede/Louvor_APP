// Sistema de Logging Controlado para Louvor CEVD
// Desenvolvimento: mostra logs | Produção: silencioso ou envia para serviço

type LogLevel = 'log' | 'info' | 'warn' | 'error';
type LogContext = 'auth' | 'database' | 'ui' | 'network' | 'general';

// Tipo genérico para dados de log
type LogData = Record<string, unknown> | unknown;

interface LogEntry {
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: LogData;
  timestamp: string;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, context: LogContext, message: string, data?: LogData): LogEntry {
    return {
      level,
      context,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  private output(entry: LogEntry) {
    if (!this.isDevelopment) return;

    const prefix = `[${entry.timestamp}] [${entry.context.toUpperCase()}]`;
    
    switch (entry.level) {
      case 'log':
        console.log(prefix, entry.message, entry.data || '');
        break;
      case 'info':
        console.info(prefix, entry.message, entry.data || '');
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case 'error':
        console.error(prefix, entry.message, entry.data || '');
        // Em produção, poderia enviar para serviço de logging
        if (!this.isDevelopment) {
          this.sendToProductionLogging(entry);
        }
        break;
    }
  }

  private async sendToProductionLogging(entry: LogEntry) {
    // Implementar envio para serviço externo (Sentry, LogRocket, etc)
    // Por enquanto, apenas silencia
  }

  // Métodos públicos
  log(message: string, data?: LogData, context: LogContext = 'general') {
    const entry = this.formatMessage('log', context, message, data);
    this.output(entry);
  }

  info(message: string, data?: LogData, context: LogContext = 'general') {
    const entry = this.formatMessage('info', context, message, data);
    this.output(entry);
  }

  warn(message: string, data?: LogData, context: LogContext = 'general') {
    const entry = this.formatMessage('warn', context, message, data);
    this.output(entry);
  }

  error(message: string, error?: LogData, context: LogContext = 'general') {
    const entry = this.formatMessage('error', context, message, error);
    this.output(entry);
  }

  // Métodos específicos para contexto
  auth(message: string, data?: LogData) {
    this.log(message, data, 'auth');
  }

  database(message: string, data?: LogData) {
    this.log(message, data, 'database');
  }

  ui(message: string, data?: LogData) {
    this.log(message, data, 'ui');
  }

  network(message: string, data?: LogData) {
    this.log(message, data, 'network');
  }
}

// Exportar instância singleton
export const logger = new Logger();

// Exportar padrão
export default logger;
