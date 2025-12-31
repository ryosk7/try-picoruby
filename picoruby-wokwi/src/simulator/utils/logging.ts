/**
 * Local implementation of logging utilities
 * Replaces rp2040js internal logging to avoid import issues
 */

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warning = 2,
  Error = 3
}

export interface Logger {
  log(level: LogLevel, message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export class ConsoleLogger implements Logger {
  constructor(private logLevel: LogLevel = LogLevel.Info) {}

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const prefix = `[RP2040:${LogLevel[level]}]`;
    switch (level) {
      case LogLevel.Debug:
        console.debug(prefix, message, ...args);
        break;
      case LogLevel.Info:
        console.info(prefix, message, ...args);
        break;
      case LogLevel.Warning:
        console.warn(prefix, message, ...args);
        break;
      case LogLevel.Error:
        console.error(prefix, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Debug, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Info, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Warning, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.Error, message, ...args);
  }
}

/**
 * Create a logger instance with specified log level
 */
export function createLogger(logLevel: LogLevel = LogLevel.Info): Logger {
  return new ConsoleLogger(logLevel);
}