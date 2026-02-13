import fs from "fs";
import path from "path";

class Logger {
  constructor() {
    this.logFile = path.join(process.cwd(), "app.log");
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
      fs.appendFile(this.logFile, data, () => { }); // Async, non-blocking
    } catch (_) {
      this.buffer = [];
    }
  }

  log(level, message) {
    const time = new Date().toISOString();
    const logMessage = `[${time}] [${level.toUpperCase()}]: ${message}\n`;

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

  info(message) {
    this.log("info", message);
  }

  warn(message) {
    this.log("warn", message);
  }

  error(message) {
    this.log("error", message);
  }

  debug(message) {
    if (!this.isProduction) {
      this.log("debug", message);
    }
  }
}

export default new Logger();
