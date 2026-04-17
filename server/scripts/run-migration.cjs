const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('🔗 连接TiDB数据库...');
  
  const pool = await mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '4Hy5RcbPvLCppKj.root',
    password: 'EUPgX6Pl5QmUMrQK',
    database: 'test',
    ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
  });
  
  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '003_code_projects.sql');
    console.log('📂 SQL文件路径:', sqlPath);
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 读取SQL文件成功，开始执行迁移...\n');
    
    // 按语句分割并执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SET') && s.length > 10);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          await pool.execute(stmt + ';');
          console.log(`✅ [${i+1}/${statements.length}] ${stmt.substring(0, 60)}...`);
        } catch (err) {
          console.warn(`⚠️ [${i+1}] 跳过: ${err.message.substring(0, 80)}`);
        }
      }
    }
    
    // 验证表是否创建
    console.log('\n🔍 验证表创建状态...');
    const [rows] = await pool.query('SHOW TABLES LIKE "code_projects"');
    
    if (rows.length > 0) {
      console.log('\n🎉 数据库迁移完成！code_projects 表已创建\n');
      
      const [cols] = await pool.query('DESCRIBE code_projects');
      console.log(`📋 表结构（共 ${cols.length} 个字段）:`);
      cols.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
      
      console.log('\n✅ 迁移成功！可以启动后端服务器了');
    } else {
      console.log('❌ 表未找到，可能创建失败');
    }
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  提示：表已存在，跳过迁移即可');
    }
  } finally {
    await pool.end();
  }
}

migrate();
