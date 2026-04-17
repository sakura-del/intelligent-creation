import winston from 'winston'
import { mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const logDir = `${__dirname}/../logs`
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

winston.addColors(colors)

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}${
        info.object ? '\n' + JSON.stringify(info.object, null, 2) : ''
      }`,
  ),
)

const consoleFormat = winston.format.combine(winston.format.colorize(), winston.format.simple())

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
  new winston.transports.File({
    filename: `${logDir}/error.log`,
    level: 'error',
    maxsize: 5242880,
    maxFiles: 5,
    encoding: 'utf8',
  }),
  new winston.transports.File({
    filename: `${logDir}/combined.log`,
    maxsize: 5242880,
    maxFiles: 5,
    encoding: 'utf8',
  }),
]

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
})
