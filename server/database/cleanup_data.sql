-- ============================================================
-- AI-Resume 数据清理脚本 v1.0
-- 用途：清除乱码数据并重新初始化提示词库
-- 使用方法：mysql -u your_user -p your_database < cleanup_data.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 第1步：删除所有旧数据（包括乱码数据）
-- ----------------------------
-- DELETE FROM `prompt_ratings`;
DELETE FROM `user_works`;
DELETE FROM `prompts`;

-- 可选：重置自增ID（从1开始）
ALTER TABLE `prompts` AUTO_INCREMENT = 1;
ALTER TABLE `user_works` AUTO_INCREMENT = 1;

-- ----------------------------
-- 第2步：验证表结构（确保字符集正确）
-- ----------------------------
ALTER TABLE `prompts`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN `title` VARCHAR(200) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '提示词标题',
  MODIFY COLUMN `content` TEXT NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '提示词正文',
  MODIFY COLUMN `description` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '简短描述',
  MODIFY COLUMN `category` VARCHAR(50) NOT NULL DEFAULT 'general' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '分类';

ALTER TABLE `user_works`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN `title` VARCHAR(200) DEFAULT '' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '作品标题',
  MODIFY COLUMN `prompt_text` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '提示词文本',
  MODIFY COLUMN `error_message` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '错误信息';

-- ----------------------------
-- 第3步：重新插入干净的预设数据
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

-- ----------------------------
-- 第4步：验证数据完整性
-- ----------------------------
SELECT
  COUNT(*) as total_prompts,
  SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_count,
  SUM(CASE WHEN is_template = 1 THEN 1 ELSE 0 END) as template_count
FROM prompts;

SET FOREIGN_KEY_CHECKS = 1;

-- 输出完成信息
SELECT '✅ 数据清理完成！已重新导入9条预设提示词数据。' as message;
