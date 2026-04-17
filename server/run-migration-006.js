import dotenv from 'dotenv'
dotenv.config()

import { db } from './database/connection.js'

async function runMigration() {
  try {
    console.log('Running 006_image_enhance migration...')

    const alterStatements = [
      "ALTER TABLE user_works ADD COLUMN category VARCHAR(50) DEFAULT '' AFTER type",
      'ALTER TABLE user_works ADD COLUMN tags JSON DEFAULT NULL AFTER category',
      'ALTER TABLE user_works ADD COLUMN is_favorite TINYINT DEFAULT 0 AFTER is_public',
    ]

    for (const stmt of alterStatements) {
      try {
        await db.query(stmt)
        console.log('OK:', stmt.substring(0, 60))
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log('SKIP (exists):', stmt.substring(0, 60))
        } else {
          console.warn('WARN:', stmt.substring(0, 60), e.message)
        }
      }
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS image_categories (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        slug VARCHAR(50) NOT NULL,
        icon VARCHAR(50) DEFAULT '',
        sort_order INT DEFAULT 0,
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('OK: image_categories table')

    const [countResult] = await db.query('SELECT COUNT(*) as cnt FROM image_categories')
    if (countResult.cnt === 0) {
      await db.query(`
        INSERT INTO image_categories (name, slug, icon, sort_order) VALUES
        ('人物肖像', 'portrait', 'UserFilled', 1),
        ('风景自然', 'landscape', 'Picture', 2),
        ('商业广告', 'commercial', 'DataBoard', 3),
        ('设计素材', 'design', 'MagicStick', 4),
        ('图标Logo', 'icon', 'SetUp', 5),
        ('其他', 'other', 'More', 99)
      `)
      console.log('OK: Inserted default categories')
    } else {
      console.log('SKIP: Categories already exist')
    }

    console.log('Migration 006 completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    process.exit(0)
  }
}

runMigration()
