import dotenv from 'dotenv'
dotenv.config()

import { db } from './database/connection.js'

async function runMigration() {
  try {
    console.log('Running 003_code_projects migration...')

    await db.query(`
      CREATE TABLE IF NOT EXISTS code_projects (
        id INT NOT NULL AUTO_INCREMENT COMMENT '项目ID',
        user_id INT NOT NULL COMMENT '所属用户ID',
        title VARCHAR(200) NOT NULL COMMENT '项目标题',
        description TEXT COMMENT '项目描述',
        source_type ENUM('ai_generated', 'template', 'manual') NOT NULL DEFAULT 'manual' COMMENT '创建方式',
        source_template_id INT DEFAULT NULL COMMENT '使用的模板ID（如果从模板创建）',
        ai_prompt TEXT COMMENT 'AI生成时使用的提示词（如果由AI生成）',
        files_data JSON NOT NULL COMMENT '文件内容 [{name, content, language}]',
        template_values JSON DEFAULT NULL COMMENT '模板变量值（如果使用模板）',
        user_mode ENUM('smart', 'expert') DEFAULT 'expert' COMMENT '创建时的模式',
        file_count INT NOT NULL DEFAULT 0 COMMENT '文件数量',
        total_size BIGINT DEFAULT 0 COMMENT '总字符数',
        is_public TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开: 0私有 1公开',
        share_token VARCHAR(64) DEFAULT NULL COMMENT '分享令牌（唯一）',
        status ENUM('draft', 'saved', 'archived') NOT NULL DEFAULT 'saved' COMMENT '状态',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        PRIMARY KEY (id),
        KEY idx_user_id (user_id),
        KEY idx_source_type (source_type),
        KEY idx_status (status),
        KEY idx_is_public (is_public),
        KEY idx_create_time (create_time),
        KEY idx_share_token (share_token),
        KEY idx_title (title(191)),
        KEY idx_description (description(191)),
        CONSTRAINT fk_project_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户代码项目表'
    `)
    console.log('OK: code_projects table')

    // 复合索引
    const indexStatements = [
      'ALTER TABLE code_projects ADD INDEX idx_user_status (user_id, status)',
      'ALTER TABLE code_projects ADD INDEX idx_user_time (user_id, create_time DESC)',
    ]

    for (const stmt of indexStatements) {
      try {
        await db.query(stmt)
        console.log('OK:', stmt.substring(0, 60))
      } catch (e) {
        if (e.message.includes('Duplicate key')) {
          console.log('SKIP (exists):', stmt.substring(0, 60))
        } else {
          console.warn('WARN:', stmt.substring(0, 60), e.message)
        }
      }
    }

    console.log('Migration 003 completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    process.exit(0)
  }
}

runMigration()
