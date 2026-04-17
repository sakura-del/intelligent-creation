-- 提示词工程增强 - 数据库迁移
-- 功能：变量系统统一、评分增强、版本管理、推荐支持

SET NAMES utf8mb4;

-- 创建提示词评分表（正式迁移，替代运行时动态创建）
DROP TABLE IF EXISTS `prompt_ratings`;
CREATE TABLE `prompt_ratings` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '评分ID',
  `prompt_id` INT NOT NULL COMMENT '提示词ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `rating` TINYINT NOT NULL COMMENT '评分(1-5)',
  `feedback` TEXT COMMENT '用户反馈意见',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_prompt_user` (`prompt_id`, `user_id`),
  KEY `idx_prompt_id` (`prompt_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_rating_prompt` FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rating_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词评分表';

-- 为 prompts 表添加版本管理增强字段
ALTER TABLE `prompts`
  ADD COLUMN `change_log` VARCHAR(500) DEFAULT '' COMMENT '版本变更说明' AFTER `version`,
  ADD COLUMN `scene_tags` JSON DEFAULT NULL COMMENT '适用场景标签(JSON数组)' AFTER `tags`,
  ADD COLUMN `difficulty` ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner' COMMENT '使用难度' AFTER `scene_tags`;

-- 统一变量语法：将 {variable} 格式更新为 {{variable}} 格式
-- 注意：仅更新包含单花括号变量但不包含双花括号的记录
UPDATE `prompts`
SET `content` = REPLACE(`content`, '{subject}', '{{subject}}')
WHERE `content` LIKE '%{subject}%' AND `content` NOT LIKE '%{{subject}}%';

UPDATE `prompts`
SET `content` = REPLACE(`content`, '{product/service}', '{{product_or_service}}')
WHERE `content` LIKE '%{product/service}%' AND `content` NOT LIKE '%{{product_or_service}}%';

UPDATE `prompts`
SET `content` = REPLACE(`content`, '{product}', '{{product}}')
WHERE `content` LIKE '%{product}%' AND `content` NOT LIKE '%{{product}}%';

UPDATE `prompts`
SET `content` = REPLACE(`content`, '{style}', '{{style}}')
WHERE `content` LIKE '%{style}%' AND `content` NOT LIKE '%{{style}}%';

-- 为已有提示词添加场景标签
UPDATE `prompts` SET `scene_tags` = '["头像生成", "社交媒体", "职场"]' WHERE `category` = 'avatar' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["人像摄影", "艺术创作"]' WHERE `category` = 'portrait' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["壁纸", "风景摄影", "桌面背景"]' WHERE `category` = 'landscape' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["广告设计", "Banner", "营销推广"]' WHERE `category` = 'ad_horizontal' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["社交媒体", "海报设计", "移动端"]' WHERE `category` = 'ad_vertical' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["UI设计", "图标", "App开发"]' WHERE `category` = 'icon' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["电商", "产品摄影", "营销"]' WHERE `category` = 'design' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["文案写作", "内容创作"]' WHERE `category` = 'text' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["营销推广", "广告文案"]' WHERE `category` = 'marketing' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["社交媒体", "内容运营"]' WHERE `category` = 'social' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["商务沟通", "邮件写作"]' WHERE `category` = 'business' AND `scene_tags` IS NULL;
UPDATE `prompts` SET `scene_tags` = '["创意写作", "灵感激发"]' WHERE `category` = 'creative' AND `scene_tags` IS NULL;

-- 为已有提示词设置变量定义（匹配更新后的 {{variable}} 语法）
UPDATE `prompts`
SET `variables` = '[{"name":"subject","description":"人物或对象描述","default_value":"a professional person","required":true}]'
WHERE `category` IN ('avatar', 'portrait') AND `variables` IS NULL AND `content` LIKE '%{{subject}}%';

UPDATE `prompts`
SET `variables` = '[{"name":"subject","description":"风景或场景描述","default_value":"a beautiful mountain landscape","required":true}]'
WHERE `category` = 'landscape' AND `variables` IS NULL AND `content` LIKE '%{{subject}}%';

UPDATE `prompts`
SET `variables` = '[{"name":"product_or_service","description":"产品或服务名称","default_value":"our product","required":true}]'
WHERE `category` IN ('ad_horizontal', 'ad_vertical') AND `variables` IS NULL AND `content` LIKE '%{{product_or_service}}%';

UPDATE `prompts`
SET `variables` = '[{"name":"subject","description":"图标主题描述","default_value":"a mobile app","required":true}]'
WHERE `category` = 'icon' AND `variables` IS NULL AND `content` LIKE '%{{subject}}%';

UPDATE `prompts`
SET `variables` = '[{"name":"product","description":"产品名称","default_value":"a premium product","required":true}]'
WHERE `category` = 'design' AND `variables` IS NULL AND `content` LIKE '%{{product}}%';
