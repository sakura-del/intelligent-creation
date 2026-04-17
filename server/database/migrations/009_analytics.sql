-- 009_analytics.sql - 数据分析相关表

-- 1. 事件追踪表（用于用户行为分析、热力图等）
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  session_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(50) NOT NULL COMMENT '事件类型: page_view, click, scroll, ai_call, etc.',
  event_name VARCHAR(100) NOT NULL,
  properties JSON NULL COMMENT '事件属性',
  url VARCHAR(500) NULL,
  path VARCHAR(255) NULL,
  referrer VARCHAR(500) NULL,
  viewport_width INT NULL,
  viewport_height INT NULL,
  client_x INT NULL COMMENT '点击X坐标(热力图)',
  client_y INT NULL COMMENT '点击Y坐标(热力图)',
  scroll_depth DECIMAL(5,2) NULL COMMENT '滚动深度百分比',
  dwell_time_ms INT NULL COMMENT '停留时间(毫秒)',
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_event_name (event_name),
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at),
  INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='事件追踪表';

-- 2. AI调用统计表
CREATE TABLE IF NOT EXISTS ai_call_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  model VARCHAR(50) NOT NULL COMMENT 'AI模型名称',
  call_type VARCHAR(50) NOT NULL COMMENT '调用类型: text, code, image',
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  duration_ms INT NULL COMMENT '响应时间(毫秒)',
  success TINYINT(1) DEFAULT 1 COMMENT '是否成功',
  error_code VARCHAR(50) NULL,
  error_message TEXT NULL,
  cost_usd DECIMAL(10,6) DEFAULT 0 COMMENT '预估成本(美元)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_model (user_id, model),
  INDEX idx_call_type (call_type),
  INDEX idx_created_at (created_at),
  INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI调用统计表';

-- 3. 用户日活表（预聚合，提升查询性能）
CREATE TABLE IF NOT EXISTS user_daily_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  stat_date DATE NOT NULL COMMENT '统计日期',
  page_views INT DEFAULT 0 COMMENT '页面浏览数',
  sessions INT DEFAULT 0 COMMENT '会话数',
  actions INT DEFAULT 0 COMMENT '操作次数',
  ai_calls INT DEFAULT 0 COMMENT 'AI调用次数',
  duration_seconds INT DEFAULT 0 COMMENT '在线时长(秒)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, stat_date),
  INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户日活统计表';

-- 4. 功能使用统计表
CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  feature_name VARCHAR(100) NOT NULL COMMENT '功能名称',
  stat_date DATE NOT NULL COMMENT '统计日期',
  usage_count INT DEFAULT 0 COMMENT '使用次数',
  unique_users INT DEFAULT 0 COMMENT '独立用户数',
  avg_duration_ms INT NULL COMMENT '平均使用时长',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_feature_date (feature_name, stat_date),
  INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='功能使用统计表';

-- 5. 转化漏斗表
CREATE TABLE IF NOT EXISTS conversion_funnels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  funnel_name VARCHAR(100) NOT NULL COMMENT '漏斗名称',
  step_name VARCHAR(100) NOT NULL COMMENT '步骤名称',
  step_order INT NOT NULL COMMENT '步骤顺序',
  user_id INT NOT NULL,
  converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(100) NULL COMMENT '来源渠道',
  properties JSON NULL,
  UNIQUE KEY uk_funnel_step_user (funnel_name, step_order, user_id),
  INDEX idx_funnel_name (funnel_name),
  INDEX idx_converted_at (converted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='转化漏斗表';
