# AI创作平台 - 后端服务

基于 Node.js + Express 的企业级后端服务，为AI智能内容创作平台提供API支持。

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: MySQL / TiDB Cloud (mysql2)
- **认证**: JWT (jsonwebtoken)
- **安全**: Helmet + CORS + Rate Limiting
- **日志**: Winston
- **验证**: Joi
- **AI服务**: OpenAI SDK (兼容多模型)

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 5.7 或 TiDB Cloud
- npm >= 9.0.0

### 安装依赖

```bash
cd server
npm install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入实际配置
```

### 初始化数据库

```bash
npm run migrate
```

### 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动

## API 接口文档

### 用户模块 (`/api/user`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | ❌ |
| POST | `/login` | 用户登录 | ❌ |
| GET | `/info` | 获取用户信息 | ✅ |
| POST | `/update` | 更新用户信息 | ✅ |
| POST | `/refresh-token` | 刷新Token | ❌ |
| POST | `/change-password` | 修改密码 | ✅ |

### 简历模块 (`/api/resume`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/template/list` | 获取模板列表 | ❌ |
| GET | `/list` | 获取简历列表 | ✅ |
| POST | `/add` | 创建简历 | ✅ |
| GET | `/detail/:id` | 获取简历详情 | ✅ |
| POST | `/update` | 更新简历 | ✅ |
| DELETE | `/delete/:id` | 删除简历 | ✅ |
| GET | `/export/:id` | 导出PDF | ✅ |

### AI内容生成 (`/api/ai`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/generate` | AI生成内容（SSE流式） | ✅ |
| GET | `/history` | 获取历史记录 | ✅ |
| GET | `/count` | 获取调用次数 | ✅ |
| DELETE | `/history/:id` | 删除历史记录 | ✅ |

### 应用管理 (`/api/app`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/list` | 获取应用列表 | ✅ |
| POST | `/add` | 创建应用 | ✅ |
| GET | `/detail/:id` | 应用详情 | ✅ |
| POST | `/update` | 更新应用 | ✅ |
| DELETE | `/delete/:id` | 删除应用 | ✅ |
| POST | `/generate` | AI生成应用代码 | ✅ |
| POST | `/deploy/:id` | 部署应用 | ✅ |

## 项目结构

```
server/
├── app.js                 # Express应用入口
├── package.json           # 项目依赖
├── .env                   # 环境变量（不提交到Git）
├── .env.example           # 环境变量示例
│
├── config/                # 配置文件
│   └── (自动读取.env)
│
├── database/              # 数据库相关
│   ├── connection.js      # 连接池管理
│   └── migrations/        # 数据库迁移脚本
│       └── 001_init.sql   # 初始化脚本
│
├── middleware/            # 中间件
│   ├── auth.js            # JWT认证
│   ├── errorHandler.js    # 错误处理
│   ├── rateLimiter.js     # 限流
│   └── validator.js       # 数据验证
│
├── routes/                # 路由定义
│   ├── index.js           # 路由汇总
│   ├── user.js            # 用户路由
│   ├── resume.js          # 简历路由
│   ├── ai.js              # AI路由
│   └── app.js             # 应用路由
│
├── services/              # 业务服务层
│   └── aiService.js       # AI调用服务（多模型策略）
│
├── utils/                 # 工具函数
│   ├── logger.js          # 日志系统
│   └── response.js        # 统一响应格式
│
└── logs/                  # 日志目录（运行时创建）
    ├── error.log          # 错误日志
    └── combined.log       # 综合日志
```

## 核心特性

### 🔐 安全机制

- **JWT认证**：无状态Token，支持刷新机制
- **bcrypt加密**：密码哈希存储（salt rounds: 10）
- **Rate Limiting**：分级限流（全局/AI接口/登录）
- **Helmet**：HTTP安全头设置
- **CORS**：跨域请求控制
- **Joi验证**：请求数据校验

### 🤖 AI多模型策略

支持多个AI供应商的自动切换和熔断：

1. **DeepSeek**（主模型）- 性价比高
2. **字节豆包**（备用）- 中文优化
3. **阿里通义千问**（兜底）- 稳定可靠

特性：
- 自动降级（熔断器模式）
- 流式输出（Server-Sent Events）
- Token计数统计
- 响应时间监控

### 📊 数据库设计

采用MySQL/TiDB兼容设计：
- 连接池管理（默认10连接）
- 事务支持
- 查询性能日志
- 慢查询告警

## 部署指南

### Railway 部署

1. Fork本项目到GitHub
2. 在Railway中导入仓库
3. 设置环境变量（参考 `.env.example`）
4. 执行数据库迁移
5. 启动服务

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t ai-resume-server .
docker run -p 3000:3000 --env-file .env ai-resume-server
```

## 开发指南

### 添加新的API端点

1. 在 `routes/` 下创建或编辑路由文件
2. 使用 `validate(schemas.xxx)` 进行参数验证
3. 使用 `authenticate` 中间件保护需要认证的接口
4. 使用 `successResponse()` / `errorResponse()` 统一响应格式

### 添加新的中间件

在 `middleware/` 目录下创建新文件，然后在 `app.js` 中引入。

### 错误处理

使用自定义的 `AppError` 类抛出业务错误：

```javascript
import { AppError } from '../middleware/errorHandler.js'

if (!user) {
  throw new AppError('用户不存在', 404)
}
```

## 监控与日志

### 健康检查

访问 `/health` 端点查看服务器状态：

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### 日志级别

- `error`: 错误信息 → error.log + combined.log
- `warn`: 警告信息 → combined.log
- `info`: 一般信息 → combined.log
- `http`: HTTP请求 → combined.log（开发环境）

## 性能优化建议

1. **Redis缓存**：热点数据缓存（模板列表、用户信息）
2. **CDN加速**：静态资源分发
3. **数据库索引**：确保查询字段有适当索引
4. **连接池调优**：根据负载调整连接数
5. **Gzip压缩**：启用响应压缩

## License

MIT
