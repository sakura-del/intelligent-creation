-- AI智能内容创作平台功能扩展脚本 v2.1 (TiDB兼容版)
-- 修复：移除多列FULLTEXT索引，改用单列索引
-- 兼容 MySQL 5.7+ / TiDB Cloud

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 提示词库表（Prompt Library）- TiDB优化版
-- ----------------------------
DROP TABLE IF EXISTS `prompts`;
CREATE TABLE `prompts` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '提示词ID',
  `user_id` INT NOT NULL COMMENT '创建者用户ID（0表示系统预设）',
  `title` VARCHAR(200) NOT NULL COMMENT '提示词标题',
  `content` TEXT NOT NULL COMMENT '提示词正文',
  `description` TEXT COMMENT '简短描述/用途说明',
  `category` VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '分类',
  `tags` JSON DEFAULT NULL COMMENT '标签数组（JSON）',
  `variables` JSON DEFAULT NULL COMMENT '变量定义（JSON）',
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号',
  `parent_id` INT DEFAULT NULL COMMENT '父版本ID',
  `is_template` TINYINT NOT NULL DEFAULT 0 COMMENT '是否为模板：0否 1是',
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开：0私有 1公开',
  `use_count` INT NOT NULL DEFAULT 0 COMMENT '使用次数',
  `success_rate` DECIMAL(5,2) DEFAULT NULL COMMENT '成功率',
  `avg_rating` DECIMAL(2,1) DEFAULT NULL COMMENT '平均评分',
  `rating_count` INT DEFAULT 0 COMMENT '评分人数',
  `status` ENUM('draft', 'published', 'archived', 'deleted') NOT NULL DEFAULT 'draft' COMMENT '状态',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_category` (`category`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_is_template` (`is_template`),
  KEY `idx_status` (`status`),
  KEY `idx_use_count` (`use_count`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_title` (`title`(191)),
  CONSTRAINT `fk_prompt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词库表';

-- ----------------------------
-- 用户作品库表（User Works Gallery）
-- ----------------------------
DROP TABLE IF EXISTS `user_works`;
CREATE TABLE `user_works` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '作品ID',
  `user_id` INT NOT NULL COMMENT '所属用户ID',
  `type` ENUM('image', 'text', 'edited_image') NOT NULL DEFAULT 'image' COMMENT '作品类型',
  `title` VARCHAR(200) DEFAULT '' COMMENT '作品标题',
  `prompt_id` INT DEFAULT NULL COMMENT '使用的提示词ID',
  `prompt_text` TEXT COMMENT '实际使用的提示词文本',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件存储路径',
  `thumbnail_path` VARCHAR(500) DEFAULT '' COMMENT '缩略图路径',
  `file_size` BIGINT DEFAULT 0 COMMENT '文件大小（字节）',
  `file_format` VARCHAR(10) DEFAULT 'png' COMMENT '文件格式',
  `metadata` JSON DEFAULT NULL COMMENT '元数据（JSON）',
  `edit_history` JSON DEFAULT NULL COMMENT '编辑历史记录（JSON数组）',
  `original_work_id` INT DEFAULT NULL COMMENT '原始作品ID',
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开',
  `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `download_count` INT NOT NULL DEFAULT 0 COMMENT '下载次数',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞数',
  `status` ENUM('processing', 'ready', 'failed', 'archived') DEFAULT 'processing' COMMENT '状态',
  `error_message` TEXT COMMENT '错误信息',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_prompt_id` (`prompt_id`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_original_work` (`original_work_id`),
  CONSTRAINT `fk_work_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_work_prompt` FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_work_original` FOREIGN KEY (`original_work_id`) REFERENCES `user_works`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户作品库表';

-- ----------------------------
-- 初始化系统预设提示词数据（确保UTF-8编码正确）
-- ----------------------------
INSERT INTO `prompts`
  (`user_id`, `title`, `content`, `description`, `category`, `tags`, `is_template`, `is_public`, `status`)
VALUES
  (0, '专业头像生成', 'Professional headshot portrait of {subject}, clean background, studio lighting, high quality, digital art style, suitable for profile picture', '生成专业级头像，适合社交媒体和职场档案', 'avatar', '["头像", "专业", "商务"]', 1, 1, 'published'),
  (0, '创意卡通头像', 'Cute cartoon avatar of {subject}, chibi style, vibrant colors, expressive eyes, kawaii aesthetic, digital illustration', '生成可爱的Q版卡通头像', 'avatar', '["卡通", "Q版", "可爱"]', 1, 1, 'published'),
  (0, '赛博朋克肖像', 'Cyberpunk style portrait of {subject}, neon lights, futuristic city background, holographic elements, synthwave color palette, highly detailed', '赛博朋克风格的人物肖像', 'portrait', '["赛博朋克", "未来", "霓虹"]', 1, 1, 'published'),
  (0, '古风汉服人像', 'Traditional Chinese Hanfu portrait of {subject}, elegant pose, cherry blossoms or bamboo background, soft natural lighting, classical Chinese painting style, serene atmosphere', '古风汉服风格的艺术人像', 'portrait', '["古风", "汉服", "中国风"]', 1, 1, 'published'),
  (0, '电影级风景壁纸', 'Cinematic landscape photograph of {subject}, golden hour lighting, dramatic clouds, ultra-wide angle, 8K resolution, professional photography, depth of field', '电影质感的风景壁纸，适合桌面背景', 'landscape', '["风景", "壁纸", "高清"]', 1, 1, 'published'),
  (0, '极简主义图标', 'Minimalist app icon representing {subject}, flat design, simple geometric shapes, modern UI style, recognizable at small sizes (32x32 to 512x512), solid colors only', '极简风格的App或网站图标', 'icon', '["图标", "UI", "极简"]', 1, 1, 'published'),
  (0, '横版广告Banner', 'Professional horizontal advertisement banner for {product/service}, marketing visual, clean layout, eye-catching headline space, brand-safe, commercial photography style, aspect ratio 16:9', '专业的横版广告图，适合网站Banner', 'ad_horizontal', '["广告", "Banner", "营销"]', 1, 1, 'published'),
  (0, '竖版社交海报', 'Vertical social media poster featuring {subject}, mobile-first design (9:16 ratio), engaging visual hierarchy, trending aesthetics, optimized for Instagram/WeChat moments sharing', '竖版海报，适合移动端传播', 'ad_vertical', '["海报", "社交", "移动端"]', 1, 1, 'published'),
  (0, '产品宣传图', 'Product photography showcase of {product}, studio lighting, white or gradient background, multiple angles mockup, premium quality feel, e-commerce ready', '电商产品宣传图', 'design', '["产品", "电商", "摄影"]', 1, 1, 'published');

SET FOREIGN_KEY_CHECKS = 1;
