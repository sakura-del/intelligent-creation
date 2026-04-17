-- AI-Code Studio Phase 2 数据库扩展脚本
-- 用途：添加code_projects表用于用户作品持久化存储

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 用户代码项目表
-- ----------------------------
DROP TABLE IF EXISTS `code_projects`;
CREATE TABLE `code_projects` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '项目ID',
  `user_id` INT NOT NULL COMMENT '所属用户ID',
  `title` VARCHAR(200) NOT NULL COMMENT '项目标题',
  `description` TEXT COMMENT '项目描述',

  -- 项目类型来源
  `source_type` ENUM('ai_generated', 'template', 'manual') NOT NULL DEFAULT 'manual' COMMENT '创建方式',
  `source_template_id` INT DEFAULT NULL COMMENT '使用的模板ID（如果从模板创建）',
  `ai_prompt` TEXT COMMENT 'AI生成时使用的提示词（如果由AI生成）',

  -- 文件数据（JSON数组）
  `files_data` JSON NOT NULL COMMENT '文件内容 [{name, content, language}]',

  -- 项目配置
  `template_values` JSON DEFAULT NULL COMMENT '模板变量值（如果使用模板）',
  `user_mode` ENUM('smart', 'expert') DEFAULT 'expert' COMMENT '创建时的模式',

  -- 统计信息
  `file_count` INT NOT NULL DEFAULT 0 COMMENT '文件数量',
  `total_size` BIGINT DEFAULT 0 COMMENT '总字符数',

  -- 访问控制
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开: 0私有 1公开',
  `share_token` VARCHAR(64) DEFAULT NULL COMMENT '分享令牌（唯一）',

  -- 状态
  `status` ENUM('draft', 'saved', 'archived') NOT NULL DEFAULT 'saved' COMMENT '状态',

  -- 时间戳
  `last_modified` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_source_type` (`source_type`),
  KEY `idx_status` (`status`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_share_token` (`share_token`),
  KEY `idx_title` (`title`(191)),
  KEY `idx_description` (`description`(191)),

  CONSTRAINT `fk_project_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户代码项目表';

-- ----------------------------
-- 初始化索引优化查询性能
-- ----------------------------
ALTER TABLE `code_projects`
  ADD INDEX `idx_user_status` (`user_id`, `status`),
  ADD INDEX `idx_user_time` (`user_id`, `create_time` DESC);

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ code_projects 表创建成功！' as message;
