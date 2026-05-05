<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg" alt="PRs Welcome">
</p>

<h1 align="center">🚀 Intelligent Creation - AI 智能创作平台</h1>

<p align="center">
  <b>一款融合多种 AI 大模型能力的智能创作平台，支持内容生成、图片创作、代码工坊和无代码应用搭建</b>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> • <a href="#技术栈">技术栈</a> • <a href="#快速开始">快速开始</a> • <a href="#项目结构">项目结构</a> • <a href="#部署指南">部署指南</a> • <a href="#截图预览">截图预览</a>
</p>

---

## ✨ 项目简介

**Intelligent Creation（智能创作平台）** 是一个全栈 AI 驱动的创作平台，集成了多种主流大语言模型（DeepSeek、豆包、通义千问、智谱等），为用户提供一站式的智能创作体验。

无论是撰写文章、生成营销文案、创作 AI 图片、搭建无代码应用，还是编写前端页面代码，都可以在这个平台上轻松完成。

> 🌐 **国际化支持**：内置中英文双语界面，可轻松扩展更多语言。

---

## 🎯 功能特性

### 📝 AI 内容生成
- 支持 **20+ 内容类型**：文章写作、营销文案、社交媒体、报告总结、商务邮件、创意写作等
- 自定义 **写作风格**（专业正式 / 轻松活泼 / 学术严谨 / 富有创意）和 **内容长度**
- **流式实时输出**，生成过程可视化
- 完善的 **历史记录管理**，支持搜索、查看详情、删除

### 🎨 AI 图片生成
- 文字描述生成图片，支持多种尺寸和画质选项
- **局部重绘**、**扩展画布**、**风格迁移**、**生成变体** 等高级功能
- 支持油画、水彩、素描、动漫、赛博朋克、像素风等多种艺术风格
- 作品自动保存到 **作品库**，支持收藏、分享、批量管理

### 💻 代码工坊（Code Studio）
- 集成 **Monaco Editor** 代码编辑器，支持多文件编辑
- **AI 代码生成**：用自然语言描述需求，自动生成完整网页代码
- 内置丰富 **项目模板库**（双11促销页、新品发布页、APP下载页等）
- **实时预览** + **手机扫码预览** + **一键下载 ZIP/HTML**
- **版本历史**管理，支持保存、对比、回滚

### 🏗️ 无代码应用构建器
- **可视化拖拽编辑**，30+ 预设组件（表单、表格、图表、菜单等）
- **AI 智能生成**：描述需求即可自动构建应用界面
- 支持 **桌面端 / 平板 / 手机** 多端预览
- 一键 **导出 Vue 模板代码** 或 **发布上线**

### 📋 提示词工程中心
- 构建、管理和优化 AI 提示词
- 支持 **变量检测**、**模板市场**、**版本历史**、**评分评价**
- **Fork** 他人提示词进行二次创作
- 智能推荐，提升 AI 生成效果

### 🖼️ 作品库
- 统一管理所有 AI 创作成果（图片、代码、应用）
- 支持分类筛选、标签管理、批量操作
- 作品分享功能（链接分享 + 嵌入代码）

### 📊 数据分析面板
- 管理员专属的数据统计仪表盘
- 基于 **ECharts** 的可视化图表

### 🔐 用户系统
- 完整的注册 / 登录 / JWT 认证体系
- Token 自动刷新机制
- 个人中心：使用概览、历史记录、账号设置

---

## 🛠️ 技术栈

### 前端
| 技术 | 说明 |
|------|------|
| [Vue 3](https://vuejs.org/) | 渐进式 JavaScript 框架 |
| [Vite 8](https://vite.dev/) | 下一代前端构建工具 |
| [Element Plus](https://element-plus.org/) | Vue 3 UI 组件库 |
| [Pinia](https://pinia.vuejs.org/) | Vue 状态管理 |
| [Vue Router 5](https://router.vuejs.org/) | 路由管理 |
| [Vue I18n](https://vue-i18n.intlify.dev/) | 国际化 |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 代码编辑器 |
| [ECharts](https://echarts.apache.org/) | 数据可视化 |
| [Axios](https://axios-http.com/) | HTTP 请求 |
| [Sass](https://sass-lang.com/) | CSS 预处理器 |

### 后端
| 技术 | 说明 |
|------|------|
| [Express](https://expressjs.com/) | Node.js Web 框架 |
| [MySQL2](https://github.com/sidorares/node-mysql2) | MySQL 数据库驱动 |
| [JWT](https://jwt.io/) | 身份认证 |
| [WebSocket](https://github.com/websockets/ws) | 实时通信 |
| [OpenAI SDK](https://github.com/openai/openai-node) | AI 模型统一接口 |
| [Sharp](https://sharp.pixelplumbing.com/) | 图片处理 |
| [Winston](https://github.com/winstonjs/winston) | 日志管理 |
| [Helmet](https://helmetjs.github.io/) | 安全中间件 |
| [Joi](https://joi.dev/) | 参数校验 |

### AI 模型支持
| 模型 | 提供商 |
|------|--------|
| DeepSeek | 深度求索 |
| 豆包 (Doubao) | 字节跳动 |
| 通义千问 (Qwen) | 阿里云 |
| 智谱 (GLM) | 智谱 AI |

### DevOps & 质量
| 工具 | 说明 |
|------|------|
| [Docker](https://www.docker.com/) | 容器化部署 |
| [GitHub Actions](https://github.com/features/actions) | CI/CD 流水线 |
| [Vitest](https://vitest.dev/) | 前端单元测试 |
| [Jest](https://jestjs.io/) | 后端单元测试 |
| [Playwright](https://playwright.dev/) | E2E 测试 |
| [ESLint + OxLint](https://eslint.org/) | 代码检查 |
| [Prettier](https://prettier.io/) | 代码格式化 |
| [Sentry](https://sentry.io/) | 错误监控 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 20.19.0
- **MySQL** >= 8.0 或 **TiDB Cloud**
- **npm** >= 9.0

### 1. 克隆项目

```bash
git clone https://github.com/sakura-del/intelligent-creation.git
cd intelligent-creation
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp server/.env.example server/.env

# 编辑 .env 文件，填入数据库连接信息和 AI API 密钥
```

主要配置项：

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=intelligent_creation

# AI 模型（至少配置一个）
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# JWT 密钥
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### 4. 初始化数据库

```bash
cd server
npm run migrate
cd ..
```

### 5. 启动开发服务

```bash
# 启动后端服务（端口 3000）
cd server && npm run dev &

# 启动前端开发服务（端口 5173）
npm run dev
```

打开浏览器访问 [http://localhost:5173](http://localhost:5173) 即可使用。

---

## 📁 项目结构

```
intelligent-creation/
├── .github/workflows/       # CI/CD 配置
│   ├── ci.yml               # 持续集成
│   └── deploy.yml           # 部署流程
├── docs/                    # 项目文档
│   ├── API.md               # API 接口文档
│   ├── ARCHITECTURE.md      # 架构设计
│   ├── DEPLOYMENT.md        # 部署指南
│   └── DEVELOPMENT_PLAN.md  # 开发计划
├── e2e/                     # E2E 测试
├── public/                  # 静态资源
├── server/                  # 后端服务
│   ├── database/            # 数据库
│   │   ├── migrations/      # 数据库迁移（11个版本）
│   │   └── connection.js    # 数据库连接
│   ├── middleware/           # 中间件
│   │   ├── auth.js          # JWT 认证
│   │   ├── errorHandler.js  # 错误处理
│   │   ├── rateLimiter.js   # 限流
│   │   ├── validator.js     # 参数校验
│   │   └── performanceMonitor.js  # 性能监控
│   ├── routes/              # API 路由
│   ├── services/            # 业务服务
│   │   ├── aiService.js     # AI 多模型服务
│   │   ├── websocket.js     # WebSocket 服务
│   │   └── fileStorage.js   # 文件存储
│   ├── __tests__/           # 后端测试
│   ├── app.js               # 服务入口
│   ├── Dockerfile           # 后端 Docker
│   └── package.json
├── src/                     # 前端源码
│   ├── api/                 # API 请求层
│   ├── components/          # 公共组件
│   ├── composables/         # 组合式函数
│   ├── i18n/                # 国际化（中/英）
│   ├── layouts/             # 布局组件
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态管理
│   ├── styles/              # 全局样式
│   ├── utils/               # 工具函数
│   ├── views/               # 页面视图
│   │   ├── ai-content/      # AI 内容生成
│   │   ├── ai-image/        # AI 图片生成
│   │   ├── code-studio/     # 代码工坊
│   │   ├── app-builder/     # 无代码应用构建
│   │   ├── prompt-library/  # 提示词工程
│   │   ├── user-gallery/    # 作品库
│   │   ├── analytics/       # 数据分析
│   │   ├── auth/            # 登录注册
│   │   ├── home/            # 首页
│   │   └── profile/         # 个人中心
│   ├── App.vue
│   └── main.js
├── docker-compose.yml       # Docker 编排
├── Dockerfile               # 前端 Docker
├── nginx.conf               # Nginx 配置
├── vite.config.js           # Vite 配置
├── vitest.config.js         # 测试配置
├── playwright.config.js     # E2E 测试配置
├── eslint.config.js         # ESLint 配置
└── package.json
```

---

## 🚢 部署指南

### Docker 部署（推荐）

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

服务启动后：
- 前端：`http://localhost`
- 后端 API：`http://localhost:3006`
- 健康检查：`http://localhost:3006/health`

### 蓝绿部署

项目内置蓝绿部署配置：

```bash
# 蓝色环境
docker-compose -f docker-compose.blue.yml up -d --build

# 绿色环境
docker-compose -f docker-compose.green.yml up -d --build
```

### Render 部署

项目包含 `render.yaml` 配置文件，可直接部署到 [Render](https://render.com/) 平台。

### 环境变量说明

详见 [server/.env.example](server/.env.example)，关键变量：

| 变量 | 说明 | 必填 |
|------|------|------|
| `DB_HOST` | 数据库地址 | ✅ |
| `DB_PORT` | 数据库端口 | ✅ |
| `DB_USER` | 数据库用户名 | ✅ |
| `DB_PASSWORD` | 数据库密码 | ✅ |
| `DB_NAME` | 数据库名称 | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 至少一个 |
| `DOUBAO_API_KEY` | 豆包 API Key | 至少一个 |
| `QWEN_API_KEY` | 通义千问 API Key | 至少一个 |
| `GLM_API_KEY` | 智谱 API Key | 至少一个 |

---

## 🧪 测试

```bash
# 前端单元测试
npm run test

# 前端测试（带覆盖率）
npm run test:coverage

# 后端单元测试
cd server && npm test

# E2E 测试
npm run test:e2e

# 运行所有测试
npm run test:all
```

---

## 📜 开源协议

本项目基于 [MIT License](LICENSE) 开源。

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. **Fork** 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 **Pull Request**

### 开发规范

- 代码风格遵循项目 ESLint + Prettier 配置
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 新功能请附带相应的单元测试

---

## 📞 联系方式

如有问题或建议，欢迎通过 [Issues](https://github.com/sakura-del/intelligent-creation/issues) 反馈。

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/sakura-del">sakura-del</a>
</p>
