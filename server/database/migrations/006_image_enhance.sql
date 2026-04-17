-- AI图片生成增强 - 数据库迁移
-- 添加图片管理功能：分类、标签、收藏、批量生成支持

SET NAMES utf8mb4;

-- 为 user_works 表添加图片管理字段
ALTER TABLE `user_works`
  ADD COLUMN `category` VARCHAR(50) DEFAULT '' COMMENT '分类' AFTER `type`,
  ADD COLUMN `tags` JSON DEFAULT NULL COMMENT '标签（JSON数组）' AFTER `category`,
  ADD COLUMN `is_favorite` TINYINT DEFAULT 0 COMMENT '是否收藏：1是 0否' AFTER `is_public`;

-- 为 ai_histories 表添加图片相关字段
ALTER TABLE `ai_histories`
  ADD COLUMN `image_count` INT DEFAULT 1 COMMENT '批量生成图片数量' AFTER `generation_time_ms`;

-- 创建图片分类预设数据表
DROP TABLE IF EXISTS `image_categories`;
CREATE TABLE `image_categories` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
  `slug` VARCHAR(50) NOT NULL COMMENT '分类标识',
  `icon` VARCHAR(50) DEFAULT '' COMMENT '图标名称',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1启用 0禁用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图片分类表';

-- 插入预设分类
INSERT INTO `image_categories` (`name`, `slug`, `icon`, `sort_order`) VALUES
('人物肖像', 'portrait', 'UserFilled', 1),
('风景自然', 'landscape', 'Picture', 2),
('商业广告', 'commercial', 'DataBoard', 3),
('设计素材', 'design', 'MagicStick', 4),
('图标Logo', 'icon', 'SetUp', 5),
('其他', 'other', 'More', 99);
