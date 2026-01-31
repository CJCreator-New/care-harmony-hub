type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private log(level: LogLevel, message: string, context?: Record<string, any>, stack?: string) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      stack,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const logFn = console[level] || console.log;
    logFn(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, context || '');
  }

  debug(message: string, context?: Record<string, any>) {
    if (import.meta.env.DEV) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | Record<string, any>) {
    const context = error instanceof Error ? { error: error.message } : error;
    const stack = error instanceof Error ? error.stack : undefined;
    this.log('error', message, context, stack);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logs.filter(l => l.level === level) : this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
