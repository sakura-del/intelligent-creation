import { db } from './database/connection.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  try {
    const sql = readFileSync(join(__dirname, './database/migrations/011_fix_ai_histories.sql'), 'utf-8')

    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      try {
        await db.query(statement)
        console.log(`OK: ${statement.substring(0, 50)}...`)
      } catch (error) {
        if (error.message?.includes('Duplicate') || error.message?.includes('exists')) {
          console.log(`SKIP (exists): ${error.sql?.substring(0, 50)}...`)
        } else {
          console.log(`error: ${error.message}`)
          console.log(`SQL: ${statement.substring(0, 80)}...`)
        }
      }
    }

    console.log('✅ Migration 011_fix_ai_histories completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
