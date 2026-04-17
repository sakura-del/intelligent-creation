import dotenv from 'dotenv'
dotenv.config()

import { db } from './database/connection.js'

async function runMigration() {
  try {
    console.log('Running 008_gallery_enhance migration...')

    await db.query(`
      CREATE TABLE IF NOT EXISTS work_shares (
        id INT NOT NULL AUTO_INCREMENT,
        work_id INT NOT NULL,
        user_id INT NOT NULL,
        share_token VARCHAR(64) NOT NULL,
        title VARCHAR(200) DEFAULT '',
        description TEXT,
        allow_download TINYINT DEFAULT 1,
        password VARCHAR(32) DEFAULT '',
        max_views INT DEFAULT 0,
        current_views INT DEFAULT 0,
        expires_at DATETIME DEFAULT NULL,
        is_active TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_share_token (share_token),
        KEY idx_work_id (work_id),
        KEY idx_user_id (user_id),
        KEY idx_is_active (is_active),
        CONSTRAINT fk_share_work FOREIGN KEY (work_id) REFERENCES user_works(id) ON DELETE CASCADE,
        CONSTRAINT fk_share_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('OK: work_shares table')

    const alterStatements = [
      "ALTER TABLE user_works ADD COLUMN description TEXT COMMENT '作品描述' AFTER title",
      "ALTER TABLE user_works ADD COLUMN share_count INT DEFAULT 0 COMMENT '分享次数' AFTER like_count",
      "ALTER TABLE user_works ADD COLUMN text_content LONGTEXT DEFAULT NULL COMMENT '文本类作品正文' AFTER edit_history",
      'ALTER TABLE user_works ADD INDEX idx_category (category)',
      'ALTER TABLE user_works ADD INDEX idx_is_favorite (is_favorite)',
      "ALTER TABLE image_categories ADD COLUMN user_id INT DEFAULT NULL COMMENT '创建者ID' AFTER slug",
      "ALTER TABLE image_categories ADD COLUMN type VARCHAR(20) DEFAULT 'image' COMMENT '适用作品类型' AFTER user_id",
    ]

    for (const stmt of alterStatements) {
      try {
        await db.query(stmt)
        console.log('OK:', stmt.substring(0, 80))
      } catch (e) {
        if (e.message.includes('Duplicate column') || e.message.includes('Duplicate key')) {
          console.log('SKIP (exists):', stmt.substring(0, 80))
        } else {
          console.warn('WARN:', stmt.substring(0, 80), e.message)
        }
      }
    }

    try {
      await db.query(`
        ALTER TABLE user_works
        ADD COLUMN tags_text VARCHAR(500) GENERATED ALWAYS AS (
          JSON_UNQUOTE(JSON_EXTRACT(tags, '$'))
        ) VIRTUAL COMMENT '标签文本(从JSON提取)'
      `)
      console.log('OK: tags_text virtual column')
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('SKIP: tags_text already exists')
      } else {
        console.warn('WARN: tags_text virtual column:', e.message)
      }
    }

    try {
      await db.query('ALTER TABLE user_works ADD INDEX idx_tags_text (tags_text)')
      console.log('OK: idx_tags_text index')
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('SKIP: idx_tags_text already exists')
      } else {
        console.warn('WARN: idx_tags_text index:', e.message)
      }
    }

    console.log('Migration 008 completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    process.exit(0)
  }
}

runMigration()
