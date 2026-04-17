-- 010_ai_histories.sql - AI内容生成历史记录表

CREATE TABLE IF NOT EXISTS ai_histories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  type VARCHAR(50) NOT NULL DEFAULT 'article' COMMENT '内容类型: article/marketing/social/summary/business/creative',
  title VARCHAR(255) NULL COMMENT '自动生成标题(基于prompt前50字)',
  prompt TEXT NOT NULL COMMENT '用户输入的完整提示词',
  result LONGTEXT NULL COMMENT 'AI生成的完整结果内容',
  style VARCHAR(50) NULL COMMENT '写作风格: professional/casual/academic/creative',
  length_type VARCHAR(20) NULL COMMENT '内容长度: short/medium/long',
  word_count INT DEFAULT 0 COMMENT '目标字数',
  model_used VARCHAR(100) NULL COMMENT '使用的AI模型',
  provider VARCHAR(50) NULL COMMENT 'AI服务提供商',
  token_count INT DEFAULT 0 COMMENT 'Token消耗量',
  generation_time_ms INT NULL COMMENT '生成耗时(毫秒)',
  is_favorite TINYINT(1) DEFAULT 0 COMMENT '是否收藏',
  is_deleted TINYINT(1) DEFAULT 0 COMMENT '软删除标记',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_user_type (user_id, type),
  INDEX idx_user_create (user_id, create_time DESC),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI内容生成历史记录表';
