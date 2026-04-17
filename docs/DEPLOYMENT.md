# AI-Resume 部署方案

## 📋 目录
- [1. 架构概览](#1-架构概览)
- [2. 环境要求](#2-环境要求)
- [3. 部署前准备](#3-部署前准备)
- [4. 部署步骤](#4-部署步骤)
- [5. 回滚策略](#5-回滚策略)
- [6. 部署后验证](#6-部署后验证)
- [7. 监控与运维](#7-监控与运维)

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     用户浏览器                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS :443
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx 反向代理                           │
│              (SSL终止 + 静态资源 + API代理)                 │
└─────────┬───────────────────────────┬──────────────────────┘
          │ :80                       │ /api → :3006
          ▼                           ▼
┌──────────────────┐      ┌──────────────────────────┐
│   Frontend       │      │   Backend                │
│   (Vue3+Vite)    │      │   (Node.js+Express)      │
│   Port: 80       │      │   Port: 3006             │
└──────────────────┘      └──────────┬───────────────┘
                                     │
                                     ▼
                          ┌──────────────────────────┐
                          │   TiDB Cloud             │
                          │   (MySQL兼容)            │
                          └──────────────────────────┘
```

### 技术栈
| 组件 | 技术 | 版本 |
|------|------|------|
| 前端 | Vue 3 + Vite + Element Plus | ^3.4 |
| 后端 | Node.js + Express | ^20 |
| 数据库 | **TiDB Cloud** (非本地MySQL) | - |
| 容器化 | Docker + Docker Compose | latest |
| CI/CD | GitHub Actions | - |
| 反向代理 | Nginx Alpine | stable |

---

## 2. 环境要求

### 服务器配置（最低）
| 资源 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 1核 | 2核+ |
| 内存 | 1GB | 4GB+ |
| 硬盘 | 20GB | 50GB SSD |
| 系统 | Ubuntu 22.04 LTS | Debian 12 / CentOS 9 |

### 必须安装的软件
```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Git
sudo apt-get install git -y
```

---

## 3. 部署前准备

### 3.1 GitHub Secrets 配置

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret名称 | 说明 | 示例值 |
|-----------|------|--------|
| `DEPLOY_HOST` | 服务器IP地址 | `47.96.xxx.xxx` |
| `DEPLOY_USER` | SSH登录用户名 | `root` 或 `ubuntu` |
| `DEPLOY_SSH_KEY` | SSH私钥内容 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_PATH` | 项目部署路径 | `/opt/ai-resume` |

### 3.2 服务器环境变量

在服务器上创建 `.env.production` 文件：

```bash
# /opt/ai-resume/server/.env.production
NODE_ENV=production
PORT=3006

# JWT密钥 (必须修改！)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-change-this
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# TiDB Cloud数据库连接
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=your-tidb-user
DB_PASSWORD=your-tidb-password
DB_NAME=test
DB_SSL=true
DB_TIMEZONE=+08:00

# AI服务配置 (可选)
GLM_API_KEY=your-glm-api-key
OPENAI_API_KEY=your-openai-api-key

# 文件上传限制
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# 日志级别
LOG_LEVEL=info
```

### 3.3 数据库准备

由于使用 **TiDB Cloud**，无需本地MySQL：
1. 登录 [TiDB Cloud Console](https://tidbcloud.com/)
2. 确认集群运行状态正常
3. 执行迁移脚本创建表结构：
```bash
cd server
for f in run-migration-*.js; do node "$f"; done
```

---

## 4. 部署步骤

### 方式A：GitHub Actions自动部署（推荐）

#### 4.1 触发条件
- **自动**: push到 `main` 分支
- **手动**: GitHub Actions页面点击"Run workflow"

#### 4.2 流程图
```
代码提交 → CI测试通过 → 构建Docker镜像 → 推送到GHCR 
    → SSH连接服务器 → 拉取最新镜像 → 重启容器 → 健康检查
```

#### 4.3 手动触发
```
GitHub仓库 → Actions → Deploy → Run workflow
→ 选择 environment: production/staging → Run workflow
```

### 方式B：手动部署

#### 步骤1：克隆代码
```bash
git clone https://github.com/YOUR_USERNAME/AI-Resume.git
cd AI-Resume
```

#### 步骤2：配置环境变量
```bash
cp server/.env.example server/.env.production
nano server/.env.production  # 填入实际值
```

#### 步骤3：构建并启动
```bash
docker compose build
docker compose up -d
```

#### 步骤4：验证服务状态
```bash
docker compose ps          # 查看容器状态
docker compose logs -f     # 查看实时日志
curl http://localhost/health  # 健康检查
```

---

## 5. 回滚策略

### 5.1 快速回滚（推荐）
```bash
# 查看历史版本
docker compose images

# 回滚到指定版本（使用SHA标签）
docker compose pull frontend:<SHA_SHORT> backend:<SHA_SHORT>
docker compose up -d
```

### 5.2 GitHub Actions回滚
1. 进入 GitHub Actions → Deploy
2. 找到成功的旧版本run
3. 点击 "Re-run all jobs"

### 5.3 蓝绿部署（高级）
项目已配置蓝绿部署支持：
```bash
# 切换到蓝色环境
docker compose -f docker-compose.blue.yml up -d

# 验证后切换流量
./deploy.sh switch blue

# 如有问题立即回滚
./deploy.sh rollback
```

### 5.4 紧急回滚流程
```
发现问题 → 停止新版本(30s) → 恢复旧镜像(1min) → 验证功能(2min) 
→ 发布事故报告 → 根因分析
```

---

## 6. 部署后验证

### 6.1 自动健康检查清单

| 检查项 | 方法 | 预期结果 |
|-------|------|---------|
| 前端可访问 | `curl -sf https://your-domain.com` | HTTP 200 |
| API可用 | `curl -sf https://your-domain.com/api/health` | `{"status":"ok"}` |
| 数据库连接 | 检查后端日志 | 无连接错误 |
| 静态资源 | 浏览器DevTools Network | 无404错误 |
| PWA Service Worker | Application面板 | 已注册激活 |

### 6.2 功能验证脚本
```bash
#!/bin/bash
echo "=== 部署后验证 ==="

# 基础连通性
curl -sf https://your-domain.com && echo "✅ 前端正常" || echo "❌ 前端异常"

# API健康检查
curl -sf https://your-domain.com/api/health && echo "✅ API正常" || echo "❌ API异常"

# 登录接口测试
TOKEN=$(curl -sf -X POST https://your-domain.com/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
[ -n "$TOKEN" ] && echo "✅ 登录正常" || echo "❌ 登录异常"

# 个人中心API测试
curl -sf -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/user/statistics && echo "✅ 统计API正常" || echo "❌ 统计API异常"

echo "=== 验证完成 ==="
```

### 6.3 性能基准
| 指标 | 目标值 | 检测工具 |
|------|--------|---------|
| TTFB | <500ms | Lighthouse/WebPageTest |
| FCP | <1.5s | Chrome DevTools |
| LCP | <2.5s | Lighthouse |
| CLS | <0.1 | Lighthouse |

---

## 7. 监控与运维

### 7.1 日志管理
```bash
# 查看实时日志
docker compose logs -f frontend
docker compose logs -f backend

# 导出日志（用于问题排查）
docker compose logs --tail=1000 backend > backend_$(date +%Y%m%d).log
```

### 7.2 常用运维命令
```bash
# 重启单个服务
docker compose restart backend

# 更新到最新版本
docker compose pull && docker compose up -d

# 查看资源占用
docker stats

# 清理无用镜像
docker image prune -f

# 备份数据库（TiDB Cloud自动备份，无需手动操作）
```

### 7.3 故障排查速查表
| 问题现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| 502 Bad Gateway | 后端未启动 | `docker compose up -d backend` |
| 504 Gateway Timeout | 后端响应慢 | 检查日志，优化查询 |
| ERR_CONNECTION_REFUSED | 端口未开放 | 检查防火墙规则 |
| 数据库连接失败 | 凭据错误或网络不通 | 检查.env中的DB配置 |
| 静态资源404 | nginx配置错误 | 检查nginx.conf |

---

## 📞 紧急联系

- **技术负责人**: [你的联系方式]
- **TiDB Cloud支持**: https://tidbcloud.com/support
- **GitHub Status**: https://www.githubstatus.com/

---

**文档版本**: v1.0  
**最后更新**: 2026-04-15  
**维护者**: AI-Resume Team
