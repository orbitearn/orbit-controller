import * as winston from "winston";
import * as path from "path";
import * as fs from "fs-extra";
import { LogWatcher } from "../db/requests";
import { rootPath } from "../envs";
import { l } from "../../common/utils";

// Configure log directory and file path
const LOG_DIR = rootPath("./src/backend/services/logs");
const LOG_FILE_PATH = path.join(LOG_DIR, "app.log");

// Create logs directory if it doesn't exist
fs.ensureDirSync(LOG_DIR);

// Create a Winston logger
export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Write to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Write all logs to file
    new winston.transports.File({
      filename: LOG_FILE_PATH,
    }),
  ],
});

// Export a logging utility function
export function le(...args: any[]) {
  logger.info.apply(logger, args as any);
  l(args);
}

// Initialize the log watcher
const logWatcher = new LogWatcher(LOG_FILE_PATH);
logWatcher.initialize();

// Handle application shutdown
process.on("SIGINT", () => {
  logger.info("Application shutting down");
  logWatcher.stop();
  process.exit(0);
});
