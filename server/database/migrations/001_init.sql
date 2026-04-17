-- AI智能内容创作平台数据库初始化脚本
-- 兼容 MySQL 5.7+ / TiDB Cloud

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 用户表
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(20) NOT NULL COMMENT '用户名',
  `password` VARCHAR(100) NOT NULL COMMENT '密码（bcrypt加密）',
  `nickname` VARCHAR(20) DEFAULT '' COMMENT '昵称',
  `email` VARCHAR(50) DEFAULT '' COMMENT '邮箱',
  `avatar` VARCHAR(255) DEFAULT '' COMMENT '头像URL',
  `role` ENUM('user', 'admin', 'vip') DEFAULT 'user' COMMENT '角色',
  `ai_count` INT DEFAULT 100 COMMENT '每日AI调用剩余次数',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1正常 0禁用',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ----------------------------
-- 模板表
-- ----------------------------
DROP TABLE IF EXISTS `templates`;
CREATE TABLE `templates` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `type` ENUM('resume', 'application') NOT NULL COMMENT '模板类型',
  `description` TEXT COMMENT '模板描述',
  `structure` JSON COMMENT '模板结构（JSON）',
  `preview_image` VARCHAR(255) DEFAULT '' COMMENT '预览图URL',
  `is_hot` TINYINT DEFAULT 0 COMMENT '是否热门',
  `is_new` TINYINT DEFAULT 0 COMMENT '是否新品',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `rating` DECIMAL(2,1) DEFAULT 5.0 COMMENT '评分',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1启用 0禁用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板表';

-- ----------------------------
-- 简历表
-- ----------------------------
DROP TABLE IF EXISTS `resumes`;
CREATE TABLE `resumes` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '简历ID',
  `user_id` INT NOT NULL COMMENT '所属用户ID',
  `template_id` INT NOT NULL COMMENT '使用的模板ID',
  `title` VARCHAR(100) DEFAULT '' COMMENT '简历标题',
  `content` LONGTEXT COMMENT '简历内容（JSON格式）',
  `pdf_path` VARCHAR(255) DEFAULT '' COMMENT 'PDF文件路径',
  `view_count` INT DEFAULT 0 COMMENT '浏览次数',
  `download_count` INT DEFAULT 0 COMMENT '下载次数',
  `status` ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_resume_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_resume_template` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简历表';

-- ----------------------------
-- 应用表
-- ----------------------------
DROP TABLE IF EXISTS `applications`;
CREATE TABLE `applications` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '应用ID',
  `user_id` INT NOT NULL COMMENT '所属用户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '应用名称',
  `description` TEXT COMMENT '应用描述',
  `structure` JSON COMMENT '应用结构（JSON）',
  `code` LONGTEXT COMMENT '生成的代码',
  `deploy_url` VARCHAR(255) DEFAULT '' COMMENT '部署地址',
  `status` ENUM('draft', 'generating', 'ready', 'deployed', 'failed') DEFAULT 'draft' COMMENT '状态',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_app_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应用表';

-- ----------------------------
-- AI生成历史表
-- ----------------------------
DROP TABLE IF EXISTS `ai_histories`;
CREATE TABLE `ai_histories` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '历史ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `prompt` TEXT NOT NULL COMMENT '输入指令',
  `result` LONGTEXT COMMENT '生成结果',
  `type` VARCHAR(20) NOT NULL COMMENT '生成类型',
  `model_used` VARCHAR(50) DEFAULT '' COMMENT '使用的AI模型',
  `token_count` INT DEFAULT 0 COMMENT 'Token消耗量',
  `generation_time_ms` INT DEFAULT 0 COMMENT '生成耗时(ms)',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_create_time` (`create_time`),
  CONSTRAINT `fk_history_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI生成历史表';

-- ----------------------------
-- 初始化模板数据
-- ----------------------------
INSERT INTO `templates` (`name`, `type`, `description`, `is_hot`, `is_new`, `rating`, `usage_count`) VALUES
('经典简约', 'resume', '适合大多数求职场景的简洁模板，突出重点信息', 1, 0, 4.9, 15600),
('现代创意', 'resume', '设计感强，适合创意行业求职者', 0, 0, 4.8, 9200),
('商务精英', 'resume', '专业正式风格，适合管理岗位申请', 1, 0, 4.7, 11100),
('科技极客', 'resume', '技术导向设计，适合IT/互联网岗位', 0, 0, 4.8, 7400),
('学术简历', 'resume', '学术规范格式，适合研究生/科研人员', 0, 0, 4.6, 5600),
('清新活力', 'resume', '年轻化设计，适合应届毕业生', 0, 0, 4.7, 7100),
('CRM客户管理', 'application', '完整的客户关系管理系统模板', 0, 0, 4.8, 3200),
('项目管理工具', 'application', '任务分配、进度跟踪、团队协作', 0, 0, 4.7, 2800),
('数据可视化大屏', 'application', '实时数据展示面板模板', 0, 1, 4.9, 4500),
('在线表单收集', 'application', '问卷调查、信息收集系统', 0, 0, 4.6, 3900);

SET FOREIGN_KEY_CHECKS = 1;
