import { db } from './database/connection.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  try {
    const sql = readFileSync(join(__dirname, './database/migrations/009_analytics.sql'), 'utf-8')

    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      await db.query(statement)
      console.log(`✅ Executed: ${statement.slice(0, 50)}...`)
    }

    console.log('\n🎉 Migration 009_analytics completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
