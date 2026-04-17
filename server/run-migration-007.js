import dotenv from 'dotenv'
dotenv.config()

import { db } from './database/connection.js'

async function runMigration() {
  try {
    console.log('Running 007_prompt_enhance migration...')

    const alterStatements = [
      "ALTER TABLE prompts ADD COLUMN change_log VARCHAR(500) DEFAULT '' COMMENT '版本变更说明' AFTER version",
      'ALTER TABLE prompts ADD COLUMN scene_tags JSON DEFAULT NULL COMMENT ' + "'适用场景标签(JSON数组)' AFTER tags",
      "ALTER TABLE prompts ADD COLUMN difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner' COMMENT '使用难度' AFTER scene_tags",
    ]

    for (const stmt of alterStatements) {
      try {
        await db.query(stmt)
        console.log('OK:', stmt.substring(0, 80))
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log('SKIP (exists):', stmt.substring(0, 80))
        } else {
          console.warn('WARN:', stmt.substring(0, 80), e.message)
        }
      }
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS prompt_ratings (
        id INT NOT NULL AUTO_INCREMENT,
        prompt_id INT NOT NULL,
        user_id INT NOT NULL,
        rating TINYINT NOT NULL,
        feedback TEXT,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_prompt_user (prompt_id, user_id),
        KEY idx_prompt_id (prompt_id),
        KEY idx_user_id (user_id),
        CONSTRAINT fk_rating_prompt FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
        CONSTRAINT fk_rating_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('OK: prompt_ratings table')

    const updateStatements = [
      {
        sql: "UPDATE prompts SET content = REPLACE(content, '{subject}', '{{subject}}') WHERE content LIKE '%{subject}%' AND content NOT LIKE '%{{subject}}%'",
        desc: 'Unify variable syntax: {subject} -> {{subject}}',
      },
      {
        sql: "UPDATE prompts SET content = REPLACE(content, '{product/service}', '{{product_or_service}}') WHERE content LIKE '%{product/service}%' AND content NOT LIKE '%{{product_or_service}}%'",
        desc: 'Unify variable syntax: {product/service} -> {{product_or_service}}',
      },
      {
        sql: "UPDATE prompts SET content = REPLACE(content, '{product}', '{{product}}') WHERE content LIKE '%{product}%' AND content NOT LIKE '%{{product}}%'",
        desc: 'Unify variable syntax: {product} -> {{product}}',
      },
      {
        sql: "UPDATE prompts SET content = REPLACE(content, '{style}', '{{style}}') WHERE content LIKE '%{style}%' AND content NOT LIKE '%{{style}}%'",
        desc: 'Unify variable syntax: {style} -> {{style}}',
      },
    ]

    for (const { sql, desc } of updateStatements) {
      try {
        const result = await db.query(sql)
        console.log(`OK: ${desc} (${result.affectedRows} rows affected)`)
      } catch (e) {
        console.warn('WARN:', desc, e.message)
      }
    }

    const sceneTagUpdates = [
      { category: 'avatar', tags: '["头像生成", "社交媒体", "职场"]' },
      { category: 'portrait', tags: '["人像摄影", "艺术创作"]' },
      { category: 'landscape', tags: '["壁纸", "风景摄影", "桌面背景"]' },
      { category: 'ad_horizontal', tags: '["广告设计", "Banner", "营销推广"]' },
      { category: 'ad_vertical', tags: '["社交媒体", "海报设计", "移动端"]' },
      { category: 'icon', tags: '["UI设计", "图标", "App开发"]' },
      { category: 'design', tags: '["电商", "产品摄影", "营销"]' },
      { category: 'text', tags: '["文案写作", "内容创作"]' },
      { category: 'marketing', tags: '["营销推广", "广告文案"]' },
      { category: 'social', tags: '["社交媒体", "内容运营"]' },
      { category: 'business', tags: '["商务沟通", "邮件写作"]' },
      { category: 'creative', tags: '["创意写作", "灵感激发"]' },
    ]

    for (const { category, tags } of sceneTagUpdates) {
      try {
        const result = await db.query(
          'UPDATE prompts SET scene_tags = ? WHERE category = ? AND scene_tags IS NULL',
          [tags, category],
        )
        if (result.affectedRows > 0) {
          console.log(`OK: Set scene_tags for ${category} (${result.affectedRows} rows)`)
        }
      } catch (e) {
        console.warn(`WARN: scene_tags for ${category}:`, e.message)
      }
    }

    const variableUpdates = [
      {
        sql: `UPDATE prompts SET variables = '[{"name":"subject","description":"人物或对象描述","default_value":"a professional person","required":true}]' WHERE category IN ('avatar', 'portrait') AND variables IS NULL AND content LIKE '%{{subject}}%'`,
        desc: 'Set variables for avatar/portrait prompts',
      },
      {
        sql: `UPDATE prompts SET variables = '[{"name":"subject","description":"风景或场景描述","default_value":"a beautiful mountain landscape","required":true}]' WHERE category = 'landscape' AND variables IS NULL AND content LIKE '%{{subject}}%'`,
        desc: 'Set variables for landscape prompts',
      },
      {
        sql: `UPDATE prompts SET variables = '[{"name":"product_or_service","description":"产品或服务名称","default_value":"our product","required":true}]' WHERE category IN ('ad_horizontal', 'ad_vertical') AND variables IS NULL AND content LIKE '%{{product_or_service}}%'`,
        desc: 'Set variables for ad prompts',
      },
      {
        sql: `UPDATE prompts SET variables = '[{"name":"subject","description":"图标主题描述","default_value":"a mobile app","required":true}]' WHERE category = 'icon' AND variables IS NULL AND content LIKE '%{{subject}}%'`,
        desc: 'Set variables for icon prompts',
      },
      {
        sql: `UPDATE prompts SET variables = '[{"name":"product","description":"产品名称","default_value":"a premium product","required":true}]' WHERE category = 'design' AND variables IS NULL AND content LIKE '%{{product}}%'`,
        desc: 'Set variables for design prompts',
      },
    ]

    for (const { sql, desc } of variableUpdates) {
      try {
        const result = await db.query(sql)
        if (result.affectedRows > 0) {
          console.log(`OK: ${desc} (${result.affectedRows} rows)`)
        }
      } catch (e) {
        console.warn('WARN:', desc, e.message)
      }
    }

    console.log('Migration 007 completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    process.exit(0)
  }
}

runMigration()
