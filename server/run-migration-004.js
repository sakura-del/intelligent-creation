import dotenv from 'dotenv'
dotenv.config()

import { db } from './database/connection.js'

async function runMigration() {
  try {
    console.log('Running 004_content_templates migration...')

    // 创建 content_templates 表
    await db.query(`
      CREATE TABLE IF NOT EXISTS content_templates (
        id INT NOT NULL AUTO_INCREMENT COMMENT '模板ID',
        name VARCHAR(100) NOT NULL COMMENT '模板名称',
        type VARCHAR(20) NOT NULL COMMENT '内容类型: article/marketing/social/summary/business/creative',
        description VARCHAR(500) DEFAULT '' COMMENT '模板描述',
        prompt_template TEXT NOT NULL COMMENT '提示词模板，支持{{变量}}占位符',
        variables JSON COMMENT '模板变量定义',
        style VARCHAR(20) DEFAULT 'professional' COMMENT '默认风格',
        length VARCHAR(20) DEFAULT 'medium' COMMENT '默认长度',
        icon VARCHAR(50) DEFAULT '' COMMENT '图标名称',
        category VARCHAR(50) DEFAULT '' COMMENT '分类标签',
        is_public TINYINT DEFAULT 1 COMMENT '是否公开: 1公开 0私有',
        user_id INT DEFAULT NULL COMMENT '创建者ID，NULL表示系统模板',
        usage_count INT DEFAULT 0 COMMENT '使用次数',
        sort_order INT DEFAULT 0 COMMENT '排序权重',
        status TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY idx_type (type),
        KEY idx_category (category),
        KEY idx_status (status),
        KEY idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容模板表'
    `)
    console.log('OK: content_templates table')

    // 插入预设模板数据（幂等：检查是否已有数据）
    const [countResult] = await db.query('SELECT COUNT(*) as cnt FROM content_templates')
    if (countResult.cnt === 0) {
      await db.query(`
        INSERT INTO content_templates (name, type, description, prompt_template, variables, style, length, icon, category, sort_order) VALUES
        ('科技趋势分析', 'article', '深度分析科技行业趋势的专业文章模板', '请撰写一篇关于{{topic}}的深度分析文章。要求：\n1. 聚焦{{time_range}}的发展趋势\n2. 引用至少{{case_count}}个实际案例\n3. 面向{{audience}}读者群体\n4. 包含数据支撑和专家观点\n5. 给出未来{{forecast_years}}年的发展预测', '["topic","time_range","case_count","audience","forecast_years"]', 'professional', 'long', 'TrendCharts', '科技', 1),
        ('产品营销文案', 'marketing', '高转化率的营销文案模板', '为{{product_name}}撰写营销文案：\n\n产品核心卖点：{{core_selling_points}}\n目标用户：{{target_audience}}\n使用场景：{{use_scenarios}}\n\n要求：\n1. 标题吸引眼球，包含数字或痛点\n2. 开头3秒抓住注意力\n3. 中间展示3-5个核心优势\n4. 结尾包含明确的行动号召(CTA)\n5. 适合{{platform}}平台发布', '["product_name","core_selling_points","target_audience","use_scenarios","platform"]', 'casual', 'medium', 'ShoppingCart', '营销', 2),
        ('小红书种草笔记', 'social', '小红书风格种草笔记模板', '写一篇小红书种草笔记：\n\n产品/服务：{{product}}\n使用体验：{{experience}}\n推荐理由：{{reasons}}\n\n要求：\n1. 标题带emoji，15字以内\n2. 开头设置悬念或共鸣\n3. 正文分段清晰，每段2-3句\n4. 适当使用emoji装饰\n5. 结尾互动引导\n6. 添加5-8个相关话题标签', '["product","experience","reasons"]', 'casual', 'short', 'ChatDotRound', '社交媒体', 3),
        ('工作周报', 'summary', '结构化的工作周报模板', '撰写本周工作总结报告：\n\n本周主要工作：\n{{main_tasks}}\n\n关键成果：\n{{key_results}}\n\n遇到的问题：\n{{problems}}\n\n下周计划：\n{{next_week_plan}}\n\n要求：\n1. 用数据说话，量化工作成果\n2. 问题部分附带解决方案\n3. 下周计划明确时间节点\n4. 整体语气专业简洁', '["main_tasks","key_results","problems","next_week_plan"]', 'professional', 'medium', 'Calendar', '工作', 4),
        ('商务合作邮件', 'business', '正式的商务合作邮件模板', '撰写一封商务合作邮件：\n\n收件方：{{recipient_company}}\n合作类型：{{cooperation_type}}\n我方优势：{{our_advantages}}\n合作提议：{{proposal}}\n\n要求：\n1. 邮件主题简洁明确\n2. 开头礼貌自我介绍\n3. 清晰阐述合作价值和双赢点\n4. 提出具体的下一步行动\n5. 结尾专业得体', '["recipient_company","cooperation_type","our_advantages","proposal"]', 'professional', 'medium', 'Message', '商务', 5),
        ('创意故事', 'creative', '富有想象力的创意故事模板', '创作一个{{genre}}风格的短篇故事：\n\n主角：{{protagonist}}\n背景设定：{{setting}}\n核心冲突：{{conflict}}\n\n要求：\n1. 开头制造悬念\n2. 情节跌宕起伏，至少2个转折\n3. 人物形象鲜明立体\n4. 结局出人意料又合情合理\n5. 字数约{{word_count}}字', '["genre","protagonist","setting","conflict","word_count"]', 'creative', 'long', 'MagicStick', '创意', 6)
      `)
      console.log('OK: Inserted default templates')
    } else {
      console.log('SKIP: Templates already exist')
    }

    // ALTER TABLE ai_histories - 添加新列（幂等容错）
    const alterStatements = [
      "ALTER TABLE ai_histories ADD COLUMN title VARCHAR(200) DEFAULT '' COMMENT '历史记录标题' AFTER type",
      "ALTER TABLE ai_histories ADD COLUMN template_id INT DEFAULT NULL COMMENT '使用的模板ID' AFTER model_used",
      "ALTER TABLE ai_histories ADD COLUMN style VARCHAR(20) DEFAULT '' COMMENT '写作风格' AFTER template_id",
      "ALTER TABLE ai_histories ADD COLUMN is_favorite TINYINT DEFAULT 0 COMMENT '是否收藏: 1是 0否' AFTER generation_time_ms",
    ]

    for (const stmt of alterStatements) {
      try {
        await db.query(stmt)
        console.log('OK:', stmt.substring(0, 60))
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log('SKIP (exists):', stmt.substring(0, 60))
        } else {
          console.warn('WARN:', stmt.substring(0, 60), e.message)
        }
      }
    }

    console.log('Migration 004 completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    process.exit(0)
  }
}

runMigration()
