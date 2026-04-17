-- 011_fix_ai_histories.sql - 修复ai_histories表结构（补充010未生效的字段）

ALTER TABLE ai_histories
  MODIFY COLUMN id BIGINT AUTO_INCREMENT COMMENT '历史ID',
  ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL COMMENT '自动生成标题(基于prompt前50字)' AFTER type,
  ADD COLUMN IF NOT EXISTS style VARCHAR(50) NULL COMMENT '写作风格: professional/casual/academic/creative' AFTER model_used,
  ADD COLUMN IF NOT EXISTS length_type VARCHAR(20) NULL COMMENT '内容长度: short/medium/long' AFTER style,
  ADD COLUMN IF NOT EXISTS word_count INT DEFAULT 0 COMMENT '目标字数' AFTER length_type,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NULL COMMENT 'AI服务提供商' AFTER model_used,
  ADD COLUMN IF NOT EXISTS is_favorite TINYINT(1) DEFAULT 0 COMMENT '是否收藏' AFTER generation_time_ms,
  ADD COLUMN IF NOT EXISTS is_deleted TINYINT(1) DEFAULT 0 COMMENT '软删除标记' AFTER is_favorite,
  MODIFY COLUMN create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  ADD COLUMN IF NOT EXISTS update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- 添加缺失的索引
ALTER TABLE ai_histories
  ADD INDEX IF NOT EXISTS idx_user_type (user_id, type),
  ADD INDEX IF NOT EXISTS idx_user_create (user_id, create_time DESC);
