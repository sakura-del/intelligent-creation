# AI-Resume 项目架构文档

## 1. 项目概述

AI-Resume 是一个 AI 智能内容创作平台，提供 AI 内容生成、图片生成、代码工坊、无代码应用等核心功能。

## 2. 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.5.31 | 前端框架 |
| Vite | ^8.0.3 | 构建工具 |
| Pinia | ^3.0.4 | 状态管理 |
| Vue Router | ^5.0.4 | 路由管理 |
| Element Plus | ^2.13.6 | UI组件库 |
| Axios | ^1.14.0 | HTTP客户端 |
| Monaco Editor | ^1.0.5 | 代码编辑器 |
| ECharts | ^6.0.0 | 图表库 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Express.js | ^4.18.2 | Web框架 |
| MySQL2 | ^3.6.5 | 数据库驱动 |
| JWT | ^9.0.2 | 认证授权 |
| bcryptjs | ^2.4.3 | 密码加密 |
| Joi | ^17.11.0 | 数据验证 |
| Winston | ^3.11.0 | 日志管理 |
| OpenAI SDK | ^4.24.0 | AI服务集成 |
| Helmet | ^7.1.0 | 安全头 |

## 3. 项目结构

```
AI-Resume/
├── src/                          # 前端源码
│   ├── api/                      # API接口层
│   │   ├── ai.js                 # AI相关接口
│   │   ├── app.js                # 应用相关接口
│   │   ├── projects.js           # 项目相关接口
│   │   ├── user.js               # 用户相关接口
│   │   └── index.js              # API统一导出
│   ├── components/               # 公共组件
│   ├── layouts/                  # 布局组件
│   │   ├── MainLayout.vue        # 主布局
│   │   └── components/           # 布局子组件
│   ├── router/                   # 路由配置
│   ├── stores/                   # Pinia状态管理
│   │   └── modules/              # 状态模块
│   ├── styles/                   # 全局样式
│   ├── utils/                    # 工具函数
│   │   └── request.js            # Axios封装
│   └── views/                    # 页面视图
│       ├── ai-content/           # AI内容生成
│       ├── ai-image/             # AI图片生成
│       ├── app-builder/          # 无代码应用
│       ├── auth/                 # 认证页面
│       ├── code-studio/          # 代码工坊
│       ├── home/                 # 首页
│       ├── profile/              # 个人中心
│       ├── prompt-library/       # 提示词工程
│       └── user-gallery/         # 作品库
├── server/                       # 后端源码
│   ├── database/                 # 数据库
│   │   ├── migrations/           # 迁移脚本
│   │   └── connection.js         # 连接配置
│   ├── middleware/               # 中间件
│   │   ├── auth.js               # 认证授权
│   │   ├── errorHandler.js       # 错误处理
│   │   ├── rateLimiter.js        # 限流控制
│   │   └── validator.js          # 数据验证
│   ├── routes/                   # 路由
│   │   ├── ai.js                 # AI接口
│   │   ├── app.js                # 应用接口
│   │   ├── codeProjects.js       # 代码项目接口
│   │   ├── gallery.js            # 作品库接口
│   │   ├── prompts.js            # 提示词接口
│   │   └── user.js               # 用户接口
│   ├── services/                 # 业务服务
│   │   ├── aiService.js          # AI服务
│   │   └── fileStorage.js        # 文件存储
│   └── utils/                    # 工具函数
│       ├── logger.js             # 日志工具
│       └── response.js           # 响应工具
└── dist/                         # 构建输出
```

## 4. 认证架构

### JWT Token 机制
- **Access Token**: 有效期 24h，用于API请求认证
- **Refresh Token**: 有效期 7d，用于刷新Access Token
- **Token黑名单**: 登出/改密后旧Token立即失效

### 认证流程
1. 用户登录 → 服务端验证 → 返回 Access Token + Refresh Token
2. 前端存储 Token 到 localStorage
3. 请求拦截器自动附加 Authorization 头
4. Token 过期 → 自动使用 Refresh Token 刷新
5. 刷新失败 → 清除认证信息 → 跳转登录页

### 权限控制
- 角色: `user` (普通用户), `vip` (VIP用户), `admin` (管理员)
- 路由守卫: 检查认证状态和角色权限
- API中间件: `authorize()` 中间件检查角色

## 5. 安全措施

| 措施 | 实现方式 |
|------|----------|
| 密码加密 | bcryptjs, salt rounds = 12 |
| XSS防护 | 输入消毒中间件, Helmet安全头 |
| CSRF防护 | SameSite Cookie, CORS白名单 |
| 限流保护 | express-rate-limit, 分级限流 |
| SQL注入 | 参数化查询 (mysql2) |
| 安全头 | Helmet, X-Frame-Options, CSP |

## 6. 数据库设计

### 核心表
- `users` - 用户表
- `templates` - 模板表
- `resumes` - 简历表
- `applications` - 应用表
- `ai_histories` - AI生成历史表
- `prompts` - 提示词库表
- `user_works` - 用户作品表
- `code_projects` - 代码项目表

## 7. 开发规范

### 代码风格
- ESLint + Prettier 统一代码风格
- oxlint 进行快速代码检查
- 组件使用 `<script setup>` 语法

### 命名规范
- 组件文件: PascalCase (如 `AIContentPage.vue`)
- 工具/服务文件: camelCase (如 `aiService.js`)
- CSS类名: BEM或kebab-case
- API路由: kebab-case (如 `/ai-content`)

### Git规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- refactor: 重构
- test: 测试
- chore: 构建/工具变更

## 8. 部署架构

### 前端
- 构建产物: `dist/` 目录
- 部署方式: 静态文件服务 (Nginx/CDN)
- 环境变量: `.env.development` / `.env.production`

### 后端
- 运行方式: Node.js 进程
- 进程管理: PM2 (推荐)
- 反向代理: Nginx
- 数据库: MySQL / TiDB Cloud

## 9. 监控与日志

### 日志
- Winston 日志框架
- 日志分级: error, warn, info, http, debug
- 日志文件: `server/logs/combined.log`, `server/logs/error.log`
- 日志轮转: 5MB/文件, 保留5个

### 健康检查
- 端点: `GET /health`
- 返回: 服务状态、运行时间、内存使用
