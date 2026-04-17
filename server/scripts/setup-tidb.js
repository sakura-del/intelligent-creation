#!/usr/bin/env node

/**
 * AI Resume Platform - TiDB Cloud 快速配置工具
 * 
 * 使用方法：
 *   node scripts/setup-tidb.js
 */

import dotenv from 'dotenv'
import fs from 'fs/promises'
import { createInterface } from 'readline'
import { db } from '../database/connection.js'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function main() {
  console.log('\n')
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║     🚀 AI创作平台 - TiDB Cloud 配置向导                    ║')
  console.log('╚═══════════════════════════════════════════════════════════╝\n')

  console.log('📋 本向导将帮助你：')
  console.log('   1️⃣  配置 TiDB Cloud 连接参数')
  console.log('   2️⃣  测试数据库连接')
  console.log('   3️⃣  初始化数据库表结构\n')

  const config = {}

  // 收集连接信息
  config.host = await question('请输入 TiDB Cloud Endpoint (例如: xxx.tidbcloud.com): ')
  config.port = await question('请输入端口 (默认 4000): ') || '4000'
  config.user = await question('请输入用户名 (默认 root): ') || 'root'
  config.password = await question('请输入密码: ')
  config.database = await question('请输入数据库名 (默认 test): ') || 'test'

  // 生成.env文件
  const envContent = `# TiDB Cloud Configuration
PORT=3000
NODE_ENV=development

# Database - TiDB Cloud
DB_HOST=${config.host}
DB_PORT=${config.port}
DB_USER=${config.user}
DB_PASSWORD=${config.password}
DB_NAME=${config.database}
DB_CONNECTION_LIMIT=10
DB_SSL=true

# JWT
JWT_SECRET=ai_resume_${Date.now()}_secure_key
JWT_EXPIRES_IN=7d

# AI Service (Mock mode for testing)
AI_PRIMARY_PROVIDER=mock
AI_FALLBACK_PROVIDER=mock

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`

  try {
    await fs.writeFile('.env', envContent, 'utf-8')
    console.log('\n✅ .env 配置文件已生成！\n')
  } catch (error) {
    console.error('❌ 写入配置文件失败:', error.message)
    process.exit(1)
  }

  // 测试连接
  console.log('🔍 正在测试 TiDB Cloud 连接...\n')
  
  // 重新加载环境变量
  dotenv.config({ override: true })
  
  // 需要重新创建连接池（因为环境变量已更改）
  const isConnected = await db.testConnection()

  if (!isConnected) {
    console.log('\n⚠️  连接失败，请检查：')
    console.log('   1. Endpoint 是否正确（包含完整域名）')
    console.log('   2. 密码是否正确（注意特殊字符）')
    console.log('   3. IP是否在TiDB Cloud白名单中')
    console.log('   4. 网络是否能访问外部服务\n')
    
    const retry = await question('是否重试？(y/n): ')
    if (retry.toLowerCase() === 'y') {
      main()
      return
    }
    
    rl.close()
    process.exit(1)
  }

  // 初始化数据库
  console.log('📦 正在初始化数据库表结构...\n')
  
  try {
    const { execSync } = await import('child_process')
    execSync('node database/migrate.js', { stdio: 'inherit' })
    console.log('\n✅ 数据库初始化完成！\n')
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message)
    rl.close()
    process.exit(1)
  }

  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║     🎉 配置完成！你现在可以启动服务器了                      ║')
  console.log('╠═══════════════════════════════════════════════════════════╣')
  console.log('║                                                             ║')
  console.log('║   启动后端: npm run dev                                       ║')
  console.log('║   启动前端: (在另一个终端) npm run dev                       ║')
  console.log('║                                                             ║')
  console.log('║   后端地址: http://localhost:3000                            ║')
  console.log('║   前端地址: http://localhost:5173                            ║')
  console.log('║                                                             ║')
  console.log('╚═══════════════════════════════════════════════════════════╝\n')

  rl.close()
}

main().catch(error => {
  console.error('❌ 配置过程出错:', error)
  process.exit(1)
})
