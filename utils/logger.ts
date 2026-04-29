type LogLevel = 'log' | 'info' | 'warn' | 'error';
type LogContext = 'auth' | 'database' | 'ui' | 'network' | 'general';
type LogData = Record<string, unknown> | unknown;

interface LogEntry {
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: LogData;
  timestamp: string;
}

const RECENT_ERRORS_KEY = 'louvor:recent-errors';
const MAX_RECENT_ERRORS = 50;

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const serializeError = (data: LogData): LogData => {
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack
    };
  }

  return data;
};

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  private formatMessage(level: LogLevel, context: LogContext, message: string, data?: LogData): LogEntry {
    return {
      level,
      context,
      message,
      data: serializeError(data),
      timestamp: new Date().toISOString()
    };
  }

  private output(entry: LogEntry) {
    if (entry.level === 'error') {
      this.storeRecentError(entry);
    }

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
        break;
    }
  }

  private storeRecentError(entry: LogEntry) {
    if (!isBrowser()) return;

    try {
      const current = window.localStorage.getItem(RECENT_ERRORS_KEY);
      const errors = current ? (JSON.parse(current) as LogEntry[]) : [];
      const nextErrors = [entry, ...errors].slice(0, MAX_RECENT_ERRORS);

      window.localStorage.setItem(RECENT_ERRORS_KEY, JSON.stringify(nextErrors));
    } catch {
      // Logging must never break the application flow.
    }
  }

  getRecentErrors(): LogEntry[] {
    if (!isBrowser()) return [];

    try {
      const current = window.localStorage.getItem(RECENT_ERRORS_KEY);
      return current ? (JSON.parse(current) as LogEntry[]) : [];
    } catch {
      return [];
    }
  }

  clearRecentErrors() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(RECENT_ERRORS_KEY);
  }

  log(message: string, data?: LogData, context: LogContext = 'general') {
    this.output(this.formatMessage('log', context, message, data));
  }

  info(message: string, data?: LogData, context: LogContext = 'general') {
    this.output(this.formatMessage('info', context, message, data));
  }

  warn(message: string, data?: LogData, context: LogContext = 'general') {
    this.output(this.formatMessage('warn', context, message, data));
  }

  error(message: string, error?: LogData, context: LogContext = 'general') {
    this.output(this.formatMessage('error', context, message, error));
  }

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

export const logger = new Logger();
export default logger;
