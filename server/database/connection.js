import dotenv from 'dotenv'
dotenv.config()

import mysql from 'mysql2/promise'
import { logger } from '../utils/logger.js'

const isSSL = process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('tidbcloud')

const sslConfig = isSSL
  ? {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    }
  : false

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || (isSSL ? 4000 : 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || (isSSL ? 'test' : 'ai_resume_db'),
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  idleTimeout: 60000,
  charset: 'utf8mb4',
  timezone: '+08:00',
  ssl: sslConfig,
  connectTimeout: 10000,
}

logger.info('Database Configuration:', {
  host: poolConfig.password ? poolConfig.host.replace(/.*@/, '***@') : poolConfig.host,
  port: poolConfig.port,
  user: poolConfig.user,
  database: poolConfig.database,
  ssl: isSSL ? 'Enabled (TLSv1.2+)' : 'Disabled',
})

const pool = mysql.createPool(poolConfig)

const warmupConnection = async () => {
  try {
    const conn = await pool.getConnection()
    logger.info('Database connection warmed up successfully')
    conn.release()
  } catch (error) {
    logger.warn('Database connection warmup failed (will retry on first query):', error.message)
  }
}

setTimeout(warmupConnection, 2000)

export const db = {
  async query(sql, params = []) {
    const start = Date.now()
    try {
      const [results] = await pool.query(sql, params)
      const duration = Date.now() - start
      if (duration > 1000) {
        logger.warn(`Slow Query (${duration}ms): ${sql.substring(0, 100)}...`)
      }
      return results
    } catch (error) {
      logger.error('Database Query Error:', {
        sql: sql.substring(0, 200),
        error: error.message,
        code: error.code,
        errno: error.errno,
      })

      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `无法连接到数据库 ${poolConfig.host}:${poolConfig.port}，请检查：\n` +
            `1. 数据库服务是否启动\n` +
            `2. 主机地址和端口是否正确\n` +
            `3. 防火墙是否允许连接`,
        )
      }

      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new Error(`数据库认证失败，请检查用户名和密码是否正确`)
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        throw new Error(`无法解析主机名 ${poolConfig.host}，请检查网络连接或DNS配置`)
      }

      if (error.message?.includes("doesn't exist")) {
        throw new Error(
          `数据表不存在: ${error.message}。\n` +
            `解决方案: 运行 'npm run migrate' 创建缺失的数据表`,
        )
      }

      if (error.message?.includes('Cannot read properties of undefined')) {
        logger.error('Undefined access error - possible null database response', {
          sql: sql.substring(0, 100),
          params: JSON.stringify(params).substring(0, 100),
        })
        throw new Error(`数据库查询返回空结果但代码期望有数据。SQL: ${sql.substring(0, 50)}...`)
      }

      throw error
    }
  },

  async transaction(callback) {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const result = await callback(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  },

  getConnection() {
    return pool.getConnection()
  },

  async healthCheck() {
    try {
      const connection = await pool.getConnection()
      await connection.ping()

      const [[result]] = await connection.execute('SELECT VERSION() as version')

      connection.release()

      return {
        status: 'healthy',
        connections: pool.pool?._allConnections?.length || 0,
        version: result?.version,
        host: poolConfig.host,
        port: poolConfig.port,
        database: poolConfig.database,
        ssl: isSSL,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        code: error.code,
        suggestion: this.getTroubleshootingTip(error),
      }
    }
  },

  getTroubleshootingTip(error) {
    const tips = {
      ECONNREFUSED: '请确认数据库服务已启动，端口可访问',
      ER_ACCESS_DENIED_ERROR: '请检查用户名、密码是否正确',
      ENOTFOUND: '请检查主机名是否正确，网络是否通畅',
      ETIMEDOUT: '连接超时，请检查防火墙设置或网络延迟',
      PROTOCOL_CONNECTION_LOST: '连接丢失，可能是网络不稳定或数据库重启',
    }

    return tips[error.code] || '请检查数据库配置和网络连接'
  },

  async testConnection() {
    console.log('\n🔍 测试数据库连接...\n')
    console.log('配置信息:')
    console.log(`  Host: ${poolConfig.host}`)
    console.log(`  Port: ${poolConfig.port}`)
    console.log(`  User: ${poolConfig.user}`)
    console.log(`  Database: ${poolConfig.database}`)
    console.log(`  SSL: ${isSSL ? '✅ 已启用' : '❌ 未启用'}\n`)

    const health = await this.healthCheck()

    if (health.status === 'healthy') {
      console.log('✅ 数据库连接成功！')
      console.log(`   MySQL版本: ${health.version}`)
      console.log(`   活跃连接数: ${health.connections}\n`)
      return true
    } else {
      console.log('❌ 数据库连接失败！')
      console.log(`   错误: ${health.error}`)
      console.log(`   建议: ${health.suggestion}\n`)
      return false
    }
  },

  async close() {
    await pool.end()
    logger.info('Database connection pool closed')
  },
}

process.on('SIGINT', async () => {
  await db.close()
  process.exit(0)
})

export default db
