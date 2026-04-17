import dotenv from 'dotenv'
dotenv.config()

import { db } from './database/connection.js'

async function runMigration() {
  try {
    console.log('Running 005_code_studio_enhance migration...')

    // 创建 code_project_versions 表
    await db.query(`
      CREATE TABLE IF NOT EXISTS code_project_versions (
        id INT NOT NULL AUTO_INCREMENT COMMENT '版本ID',
        project_id INT NOT NULL COMMENT '项目ID',
        user_id INT NOT NULL COMMENT '用户ID',
        version_number INT NOT NULL DEFAULT 1 COMMENT '版本号',
        description VARCHAR(500) DEFAULT '' COMMENT '版本描述',
        files_data LONGTEXT COMMENT '文件数据JSON',
        file_count INT DEFAULT 0 COMMENT '文件数量',
        total_size INT DEFAULT 0 COMMENT '总大小(字节)',
        change_summary VARCHAR(500) DEFAULT '' COMMENT '变更摘要',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        PRIMARY KEY (id),
        KEY idx_project_id (project_id),
        KEY idx_user_id (user_id),
        KEY idx_project_version (project_id, version_number),
        CONSTRAINT fk_version_project FOREIGN KEY (project_id) REFERENCES code_projects (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码项目版本历史表'
    `)
    console.log('OK: code_project_versions table')

    // 创建 code_project_templates 表
    await db.query(`
      CREATE TABLE IF NOT EXISTS code_project_templates (
        id INT NOT NULL AUTO_INCREMENT COMMENT '模板ID',
        name VARCHAR(100) NOT NULL COMMENT '模板名称',
        description VARCHAR(500) DEFAULT '' COMMENT '模板描述',
        category VARCHAR(50) DEFAULT '' COMMENT '分类: landing/business/portfolio/blog/ecommerce/other',
        icon VARCHAR(50) DEFAULT '' COMMENT '图标',
        preview_image VARCHAR(500) DEFAULT '' COMMENT '预览图URL',
        files_data LONGTEXT NOT NULL COMMENT '文件数据JSON',
        customizable_fields JSON COMMENT '可自定义字段定义',
        default_values JSON COMMENT '默认值',
        style VARCHAR(20) DEFAULT 'modern' COMMENT '默认风格',
        features JSON COMMENT '特性标签',
        is_public TINYINT DEFAULT 1 COMMENT '是否公开',
        user_id INT DEFAULT NULL COMMENT '创建者ID',
        usage_count INT DEFAULT 0 COMMENT '使用次数',
        sort_order INT DEFAULT 0 COMMENT '排序权重',
        status TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY idx_category (category),
        KEY idx_status (status),
        KEY idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码项目模板表'
    `)
    console.log('OK: code_project_templates table')

    // 插入预设模板数据（幂等）
    const [countResult] = await db.query('SELECT COUNT(*) as cnt FROM code_project_templates')
    if (countResult.cnt === 0) {
      await db.query(`
        INSERT INTO code_project_templates (name, description, category, icon, files_data, customizable_fields, style, features, sort_order) VALUES
        ('双11狂欢促销页', '电商大促活动页面，含倒计时、商品展示、优惠券', 'ecommerce', 'ShoppingCart', '[{"name":"index.html","content":"<!DOCTYPE html>\\n<html lang=\\"zh-CN\\">\\n<head>\\n  <meta charset=\\"UTF-8\\">\\n  <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">\\n  <title>双11狂欢节</title>\\n  <link rel=\\"stylesheet\\" href=\\"style.css\\">\\n</head>\\n<body>\\n  <div class=\\"hero\\">\\n    <h1>双11狂欢节</h1>\\n    <p class=\\"subtitle\\">全年最低价，限时抢购</p>\\n    <div class=\\"countdown\\">...</div>\\n  </div>\\n  <script src=\\"script.js\\"><\\/script>\\n</body>\\n</html>","language":"html"},{"name":"style.css","content":"/* 双11促销样式 */","language":"css"},{"name":"script.js","content":"// 倒计时逻辑","language":"javascript"}]', '["eventName","eventDate","primaryColor"]', 'luxury', '["countdown","products","coupon"]', 1),
        ('新品发布预热页', '科技产品发布预热页面，含倒计时、特性展示', 'landing', 'Promotion', '[{"name":"index.html","content":"<!DOCTYPE html>\\n<html lang=\\"zh-CN\\"><head>...</head><body>...</body></html>","language":"html"},{"name":"style.css","content":"/* 新品发布样式 */","language":"css"},{"name":"script.js","content":"// 平滑滚动","language":"javascript"}]', '["productName","tagline","gradientStart","gradientEnd"]', 'modern', '["hero","features","smoothScroll"]', 2),
        ('APP下载引导页', '移动应用下载引导页，含特性展示和下载按钮', 'landing', 'Iphone', '[{"name":"index.html","content":"<!DOCTYPE html><html lang=\\"zh-CN\\">...APP下载页...</html>","language":"html"},{"name":"style.css","content":"/* APP下载样式 */","language":"css"},{"name":"script.js","content":"console.log(\\"APP Download Page loaded\\");","language":"javascript"}]', '["appName","appSlogan","primaryColor"]', 'modern', '["phoneMockup","downloadButtons"]', 3),
        ('个人作品集', '创意个人作品集页面，含项目展示和联系方式', 'portfolio', 'User', '[{"name":"index.html","content":"<!DOCTYPE html>\\n<html lang=\\"zh-CN\\">...作品集...</html>","language":"html"},{"name":"style.css","content":"/* 作品集样式 */","language":"css"},{"name":"script.js","content":"console.log(\\"Portfolio loaded\\");","language":"javascript"}]', '["name","role","email","accentColor"]', 'minimal', '["hero","worksGrid","contact"]', 4),
        ('企业官网首页', '企业官网首页模板，含导航、服务、团队、联系', 'business', 'OfficeBuilding', '[{"name":"index.html","content":"<!DOCTYPE html>\\n<html lang=\\"zh-CN\\">...企业官网...</html>","language":"html"},{"name":"style.css","content":"/* 企业官网样式 */","language":"css"},{"name":"script.js","content":"console.log(\\"Business site loaded\\");","language":"javascript"}]', '["companyName","tagline","primaryColor","contactEmail"]', 'corporate', '["navbar","services","team","contact"]', 5)
      `)
      console.log('OK: Inserted default code project templates')
    } else {
      console.log('SKIP: Code project templates already exist')
    }

    // ALTER TABLE code_projects - 添加新列（幂等容错）
    const alterStatements = [
      "ALTER TABLE code_projects ADD COLUMN current_version INT DEFAULT 0 COMMENT '当前版本号'",
      "ALTER TABLE code_projects ADD COLUMN embed_token VARCHAR(32) DEFAULT '' COMMENT '嵌入令牌'",
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

    console.log('Migration 005 completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    process.exit(0)
  }
}

runMigration()
