# 🚀 TiDB Cloud 快速接入指南

## 前置条件

✅ 已拥有 TiDB Cloud 账号（如果没有，请先注册：https://tidbcloud.com）
✅ 已创建 TiDB 集群（免费试用即可）

---

## 步骤 1：获取 TiDB Cloud 连接信息

### 1.1 登录 TiDB Cloud 控制台
访问 https://tidbcloud.com 并登录你的账号

### 1.2 选择或创建集群
- **新用户**：点击 "Create Cluster" → 选择 "Developer Tier"（免费）
- **已有集群**：在 Clusters 列表中点击目标集群

### 1.3 获取连接参数
在集群详情页，点击 **"Connect"** 按钮，你会看到：

```
Endpoint: xxxxxx.prod.aws.tidbcloud.com
Port:     4000
User:     root
Password: (你设置的密码)
```

**⚠️ 重要提示**：
- 复制完整的 Endpoint（包含 .tidbcloud.com 后缀）
- 记住你设置的 Root Password
- 默认数据库名可以是 `test` 或自定义的 `ai_resume_db`

---

## 步骤 2：配置环境变量

### 方法 A：使用模板文件（推荐）

```bash
# 1. 复制TiDB配置模板
cp server/.env.tidb server/.env

# 2. 编辑 .env 文件，填入真实连接信息
# 使用 VSCode 或记事本打开 server/.env
```

**需要修改的关键字段**：
```env
# ======== 必须修改 ========
DB_HOST=your-actual-endpoint.tidbcloud.com  # 替换为你的Endpoint
DB_PASSWORD=your_actual_password_here        # 替换为你的Root Password
DB_NAME=test                                  # 或 ai_resume_db（会自动创建）

# ======== 可选修改 ========
JWT_SECRET=change_this_to_a_random_string    # 生产环境必须修改！
```

### 方法 B：手动创建 .env 文件

在 `server/` 目录下创建 `.env` 文件，内容参考 `.env.tidb`

---

## 步骤 3：初始化数据库表结构

### 3.1 确保后端依赖已安装
```bash
cd server
npm install
```

### 3.2 执行数据库迁移
```bash
npm run migrate
```

**预期输出**：
```
🚀 Starting database migration...
✅ Database migration completed successfully
📊 Created tables: users, templates, resumes, applications, ai_histories
```

如果成功，说明已连接到 TiDB Cloud 并创建了5张表！

---

## 步骤 4：验证连接

### 4.1 启动后端服务
```bash
npm run dev
```

看到以下日志表示成功：
```
🚀 Server is running on port 3000 in development mode
📊 Health check: http://localhost:3000/health
🔗 API Base URL: http://localhost:3000/api
```

### 4.2 测试健康检查接口
浏览器访问或 curl：
```bash
curl http://localhost:3000/health
```

返回：
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "environment": "development"
}
```

### 4.3 测试注册接口
```bash
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"Demo123456","nickname":"演示用户","email":"demo@test.com"}'
```

返回：
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "demo",
      "nickname": "演示用户"
    }
  }
}
```

---

## 🔧 常见问题排查

### Q1: 连接超时 (Connection Timeout)
**原因**：网络防火墙阻止了4000端口
**解决**：
- 检查公司/学校网络是否限制出站端口
- 尝试使用手机热点测试
- 在 TiDB Cloud 控制台确认集群状态为 "Running"

### Q2: Access denied for user 'root'@'%'
**原因**：密码错误或IP白名单限制
**解决**：
- 确认密码正确（注意特殊字符需要URL编码）
- 在 TiDB Cloud 设置中添加当前IP到白名单（Allow List）

### Q3: Table doesn't exist
**原因**：未执行数据库迁移
**解决**：
```bash
cd server
npm run migrate
```

### Q4: SSL certificate error
**原因**：TiDB Cloud 强制要求 SSL 连接
**解决**：代码已内置 SSL 支持，确保 `.env` 中设置 `DB_SSL=true`

---

## 🎯 下一步操作

完成上述步骤后，你已经拥有：

✅ **云端数据库**：TiDB Cloud（自动备份、高可用）  
✅ **后端API服务**：Express + JWT认证  
✅ **前端界面**：Vue3 + Element Plus  

现在可以：
1. 打开浏览器访问 http://localhost:5173
2. 注册/登录账号
3. 测试简历生成、AI内容生成等功能
4. 所有数据都存储在 TiDB Cloud！

---

## 💡 TiDB Cloud 优势

| 特性 | 说明 |
|------|------|
| **MySQL兼容** | 无需修改代码，直接使用mysql2驱动 |
| **水平扩展** | 数据量增长时自动扩容 |
| **高可用** | 99.99% SLA，自动故障转移 |
| **安全加密** | TLS 1.3 + 静态数据加密 |
| **免费额度** | Developer Tier 永久免费（5GB存储） |
| **全球部署** | 可选择 AWS/Azure/GCP 区域 |

---

## 📞 技术支持

如遇到问题：
1. 查看 TiDB Cloud 官方文档：https://docs.pingcap.com/tidb-cloud
2. 提交工单：控制台 → Support → Create Ticket
3. 社区论坛：https://ask.tidb.io

---

**祝你在 TiDB Cloud 上运行顺利！🎉**
