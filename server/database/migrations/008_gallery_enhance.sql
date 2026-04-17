-- 作品库增强 - 数据库迁移
-- 功能：分享系统、全文搜索索引、标签搜索支持、下载统计

SET NAMES utf8mb4;

-- 创建作品分享表
CREATE TABLE IF NOT EXISTS `work_shares` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '分享ID',
  `work_id` INT NOT NULL COMMENT '作品ID',
  `user_id` INT NOT NULL COMMENT '分享者ID',
  `share_token` VARCHAR(64) NOT NULL COMMENT '分享令牌',
  `title` VARCHAR(200) DEFAULT '' COMMENT '分享标题',
  `description` TEXT COMMENT '分享描述',
  `allow_download` TINYINT DEFAULT 1 COMMENT '是否允许下载：1允许 0禁止',
  `password` VARCHAR(32) DEFAULT '' COMMENT '访问密码（空表示无需密码）',
  `max_views` INT DEFAULT 0 COMMENT '最大浏览次数（0表示无限）',
  `current_views` INT DEFAULT 0 COMMENT '当前浏览次数',
  `expires_at` DATETIME DEFAULT NULL COMMENT '过期时间（NULL表示永不过期）',
  `is_active` TINYINT DEFAULT 1 COMMENT '是否有效：1有效 0失效',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_share_token` (`share_token`),
  KEY `idx_work_id` (`work_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_share_work` FOREIGN KEY (`work_id`) REFERENCES `user_works`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_share_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品分享表';

-- 为 user_works 添加搜索增强字段
ALTER TABLE `user_works`
  ADD COLUMN `description` TEXT COMMENT '作品描述' AFTER `title`,
  ADD COLUMN `share_count` INT DEFAULT 0 COMMENT '分享次数' AFTER `like_count`,
  ADD COLUMN `text_content` LONGTEXT DEFAULT NULL COMMENT '文本类作品的正文内容（用于全文搜索）' AFTER `edit_history`;

-- 为分类和标签添加索引以提升搜索性能
ALTER TABLE `user_works` ADD INDEX `idx_category` (`category`);
ALTER TABLE `user_works` ADD INDEX `idx_is_favorite` (`is_favorite`);

-- 为 image_categories 添加用户自定义分类支持
ALTER TABLE `image_categories`
  ADD COLUMN `user_id` INT DEFAULT NULL COMMENT '创建者ID（NULL表示系统分类）' AFTER `slug`,
  ADD COLUMN `type` VARCHAR(20) DEFAULT 'image' COMMENT '适用作品类型' AFTER `user_id`;

-- 为作品标签添加全文搜索支持（MySQL 5.7+ / TiDB 兼容的虚拟列）
ALTER TABLE `user_works`
  ADD COLUMN `tags_text` VARCHAR(500) GENERATED ALWAYS AS (
    JSON_UNQUOTE(JSON_EXTRACT(tags, '$'))
  ) VIRTUAL COMMENT '标签文本（从JSON提取，用于搜索）';

ALTER TABLE `user_works` ADD INDEX `idx_tags_text` (`tags_text`);
