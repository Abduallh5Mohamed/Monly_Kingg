import fs from "fs";
import path from "path";

class Logger {
  constructor() {
    this.logFile = path.join(process.cwd(), "app.log"); // يحفظ في root المشروع
  }

  log(level, message) {
    const time = new Date().toISOString();
    const logMessage = `[${time}] [${level.toUpperCase()}]: ${message}\n`;

    console.log(logMessage); // يطبع في الكونسول
    fs.appendFileSync(this.logFile, logMessage); // يكتب في الملف
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
    this.log("debug", message);
  }
}

export default new Logger();
