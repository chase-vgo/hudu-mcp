import type { Logger, LogLevel } from './logger.js';

/**
 * A minimal, dependency-free logger for the Cloudflare Workers runtime.
 *
 * The default `Logger` is backed by winston, which depends on Node stream
 * internals that do not run on `workerd`. This logger implements the same
 * public surface (`error`/`warn`/`info`/`debug`/`setLevel`) using the global
 * `console`, so it can be passed anywhere a `Logger` is expected.
 *
 * It is declared `implements Logger` only structurally — the concrete `Logger`
 * class has a private winston field, so we expose the shared shape via a cast
 * at the call site (see `worker.ts`).
 */
export class WorkerLogger {
  private level: LogLevel;
  private readonly order: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private enabled(level: LogLevel): boolean {
    return this.order[level] <= this.order[this.level];
  }

  error(message: string, meta?: unknown): void {
    if (this.enabled('error')) console.error(message, meta ?? '');
  }

  warn(message: string, meta?: unknown): void {
    if (this.enabled('warn')) console.warn(message, meta ?? '');
  }

  info(message: string, meta?: unknown): void {
    if (this.enabled('info')) console.info(message, meta ?? '');
  }

  debug(message: string, meta?: unknown): void {
    if (this.enabled('debug')) console.debug(message, meta ?? '');
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

/** Construct a WorkerLogger typed as the shared `Logger` shape. */
export function createWorkerLogger(level: LogLevel = 'info'): Logger {
  return new WorkerLogger(level) as unknown as Logger;
}
