import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcryptjs'
import { db } from './database/connection.js'

async function createTestUsers() {
  try {
    console.log('Creating test users...')

    const password = '123456'
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    console.log('Generated password hash:', hashedPassword)

    await db.query(
      `INSERT INTO users (username, password, nickname, email, role, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password), nickname = VALUES(nickname), email = VALUES(email), role = VALUES(role), status = VALUES(status)`,
      ['admin', hashedPassword, '管理员', 'admin@example.com', 'admin', 1],
    )
    console.log('Created/Updated admin user')

    await db.query(
      `INSERT INTO users (username, password, nickname, email, role, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password), nickname = VALUES(nickname), email = VALUES(email), role = VALUES(role), status = VALUES(status)`,
      ['test', hashedPassword, '测试用户', 'test@example.com', 'user', 1],
    )
    console.log('Created/Updated test user')

    const users = await db.query('SELECT id, username, role, status FROM users')
    console.log('Current users in DB:', JSON.stringify(users))

    console.log('Test users created successfully!')
    console.log('Username: admin, Password: 123456')
    console.log('Username: test, Password: 123456')
  } catch (error) {
    console.error('Error creating test users:', error)
  } finally {
    process.exit()
  }
}

createTestUsers()
