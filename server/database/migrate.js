import { db } from './connection.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 去除 SQL 中的单行注释和多余空白
function cleanStatement(sql) {
  return sql
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('--')) return ''
      return line
    })
    .join('\n')
    .trim()
}

export const runMigration = async () => {
  try {
    logger.info('🚀 Starting database migration...')

    const migrationsDir = path.join(__dirname, 'migrations')
    const files = await fs.readdir(migrationsDir)
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()

    let totalExecuted = 0
    let totalSkipped = 0

    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file)
      const sql = await fs.readFile(filePath, 'utf-8')

      logger.info(`\n📄 Processing migration file: ${file}`)

      const rawStatements = sql.split(';')
      let fileExecuted = 0
      let fileSkipped = 0

      for (let i = 0; i < rawStatements.length; i++) {
        const cleaned = cleanStatement(rawStatements[i])
        if (!cleaned) continue

        const preview = cleaned.split('\n')[0].trim().substring(0, 60)

        try {
          await db.query(cleaned)
          fileExecuted++
          logger.info(`  [${fileExecuted + fileSkipped}] ✅ OK: ${preview}...`)
        } catch (err) {
          fileSkipped++
          logger.warn(`  [${fileExecuted + fileSkipped}] ⚠️ SKIP: ${preview}... (${err.message})`)
        }
      }

      totalExecuted += fileExecuted
      totalSkipped += fileSkipped
      logger.info(`  📊 ${file}: ${fileExecuted} executed, ${fileSkipped} skipped`)
    }

    logger.info(`\n✅ All migrations completed: ${totalExecuted} executed, ${totalSkipped} skipped`)

    const tables = await db.query('SHOW TABLES')
    logger.info(`📊 Current tables: ${tables.map((t) => Object.values(t)[0]).join(', ')}`)

    process.exit(0)
  } catch (error) {
    logger.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

const command = process.argv[2]
if (command === 'migrate') {
  runMigration()
}

export default runMigration
