import fs from "fs";
import path from "path";

class Logger {
  constructor() {
    this.logFile = path.join(process.cwd(), "app.log");
    this.maxLogSize = 50 * 1024 * 1024; // 50MB
    this.buffer = [];
    this.bufferSize = 20; // Flush every 20 messages
    this.flushInterval = 5000; // Or every 5 seconds
    this.isProduction = process.env.NODE_ENV === 'production';

    // Auto-flush periodically
    this._timer = setInterval(() => this.flush(), this.flushInterval);

    // Flush on process exit
    process.on('beforeExit', () => this.flush());
  }

  flush() {
    if (this.buffer.length === 0) return;
    try {
      const data = this.buffer.join('');
      this.buffer = [];
      // SECURITY FIX: [LOW-01] Rotate log file when it exceeds max size.
      fs.stat(this.logFile, (err, stats) => {
        if (!err && stats.size > this.maxLogSize) {
          const rotated = this.logFile.replace('.log', `.${Date.now()}.log`);
          fs.rename(this.logFile, rotated, () => {
            fs.appendFile(this.logFile, data, () => { });
          });
        } else {
          fs.appendFile(this.logFile, data, () => { });
        }
      });
    } catch (_) {
      this.buffer = [];
    }
  }

  formatArg(arg) {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }

    if (typeof arg === "string") {
      return arg;
    }

    try {
      return JSON.stringify(arg);
    } catch (_err) {
      return String(arg);
    }
  }

  log(level, message, ...args) {
    const time = new Date().toISOString();
    const extra = args.length ? ` ${args.map((arg) => this.formatArg(arg)).join(" ")}` : "";
    const logMessage = `[${time}] [${level.toUpperCase()}]: ${this.formatArg(message)}${extra}\n`;

    // In production, only log warnings and errors to console
    if (!this.isProduction || level === 'warn' || level === 'error') {
      console.log(logMessage.trim());
    }

    // Buffer writes instead of sync I/O
    this.buffer.push(logMessage);
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  info(...args) {
    this.log("info", ...args);
  }

  warn(...args) {
    this.log("warn", ...args);
  }

  error(...args) {
    this.log("error", ...args);
  }

  debug(...args) {
    if (!this.isProduction) {
      this.log("debug", ...args);
    }
  }
}

export default new Logger();
