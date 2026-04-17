# AI-Resume API 文档

## 基础信息

- **Base URL**: `/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 通用响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "错误描述",
  "errors": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 分页响应
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "items": [],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

## 错误码

| 错误码 | 描述 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/Token无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 413 | 文件过大 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 503 | 服务暂不可用 |

---

## 1. 用户模块 `/api/user`

### 1.1 用户注册

**POST** `/api/user/register`

**限流**: 15分钟内同一IP最多5次失败请求

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| username | string | 是 | 用户名(3-20位字母数字) |
| password | string | 是 | 密码(6-100位,含字母和数字) |
| nickname | string | 是 | 昵称(最多20字符) |
| email | string | 是 | 邮箱地址 |

**请求示例**:
```json
{
  "username": "testuser",
  "password": "password123",
  "nickname": "测试用户",
  "email": "test@example.com"
}
```

**响应示例**:
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "testuser",
      "nickname": "测试用户",
      "email": "test@example.com",
      "role": "user"
    }
  }
}
```

### 1.2 用户登录

**POST** `/api/user/login`

**限流**: 15分钟内同一IP最多5次失败请求

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**响应示例**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "testuser",
      "nickname": "测试用户",
      "email": "test@example.com",
      "avatar": "",
      "ai_count": 100,
      "role": "user"
    }
  }
}
```

### 1.3 用户登出

**POST** `/api/user/logout`

**需要认证**: 是

**描述**: 将当前Token加入黑名单，使其立即失效

**响应示例**:
```json
{
  "code": 200,
  "message": "退出登录成功",
  "data": null
}
```

### 1.4 获取用户信息

**GET** `/api/user/info`

**需要认证**: 是

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "nickname": "测试用户",
    "email": "test@example.com",
    "avatar": "",
    "role": "user",
    "ai_count": 100
  }
}
```

### 1.5 更新用户信息

**POST** `/api/user/update`

**需要认证**: 是

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| nickname | string | 否 | 昵称(最多20字符) |
| email | string | 否 | 邮箱地址 |
| avatar | string | 否 | 头像URL |

### 1.6 刷新Token

**POST** `/api/user/refresh-token`

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| refreshToken | string | 是 | 刷新Token |

**响应示例**:
```json
{
  "code": 200,
  "message": "Token刷新成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 1.7 修改密码

**POST** `/api/user/change-password`

**需要认证**: 是
**限流**: 1小时内同一IP最多3次失败请求

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| oldPassword | string | 是 | 原密码 |
| newPassword | string | 是 | 新密码(8位以上,含字母和数字) |

**描述**: 修改成功后当前Token自动失效，需重新登录

---

## 2. AI内容生成模块 `/api/ai`

### 2.1 文本内容生成

**POST** `/api/ai/generate`

**需要认证**: 是
**限流**: 每分钟10次

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| type | string | 是 | 类型: article, marketing, social, summary, business, creative |
| prompt | string | 是 | 提示词(10-2000字符) |
| style | string | 否 | 风格: professional, casual, academic, creative |
| length | string | 否 | 长度: short, medium, long |
| wordCount | number | 否 | 字数: 50-5000 |

### 2.2 图片生成

**POST** `/api/ai/image-generate`

**需要认证**: 是
**限流**: 每分钟5次

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| prompt | string | 是 | 图片描述(3-1000字符) |
| type | string | 否 | 类型: avatar, portrait, landscape等 |
| size | string | 否 | 尺寸: 256x256, 512x512, 1024x1024等 |
| quality | string | 否 | 质量: standard, hd |
| style | string | 否 | 风格: vivid, natural |

### 2.3 代码生成

**POST** `/api/ai/code-generate`

**需要认证**: 是
**限流**: 每分钟10次

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| prompt | string | 是 | 代码需求描述 |
| templateId | number | 否 | 模板ID |
| style | string | 否 | 风格: modern, luxury, minimal, playful, corporate |
| features | string[] | 否 | 特性: animation, responsive, interactive, form |

**响应示例**:
```json
{
  "code": 200,
  "message": "代码生成成功",
  "data": {
    "files": [
      { "name": "index.html", "content": "...", "language": "html" },
      { "name": "style.css", "content": "...", "language": "css" },
      { "name": "script.js", "content": "...", "language": "javascript" }
    ],
    "metadata": {
      "description": "页面描述",
      "model": "glm-4-plus",
      "tokensUsed": 1500,
      "generationTimeMs": 5000,
      "style": "modern",
      "features": ["responsive"]
    }
  }
}
```

---

## 3. 提示词模块 `/api/prompts`

### 3.1 创建提示词

**POST** `/api/prompts`

**需要认证**: 是

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| title | string | 是 | 标题(2-200字符) |
| content | string | 是 | 内容(10-5000字符) |
| description | string | 否 | 描述(最多500字符) |
| category | string | 否 | 分类 |
| tags | string[] | 否 | 标签(最多10个) |
| is_template | boolean | 否 | 是否为模板 |
| is_public | boolean | 否 | 是否公开 |

---

## 4. 作品库模块 `/api/gallery`

### 4.1 获取作品列表

**GET** `/api/gallery`

**需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码(默认1) |
| limit | number | 否 | 每页数量(默认10,最大100) |
| type | string | 否 | 类型筛选 |

---

## 5. 代码项目模块 `/api/projects`

### 5.1 获取项目列表

**GET** `/api/projects`

**需要认证**: 是

### 5.2 创建项目

**POST** `/api/projects`

**需要认证**: 是

### 5.3 保存项目

**PUT** `/api/projects/:id`

**需要认证**: 是

---

## 6. 健康检查

**GET** `/health`

**无需认证**

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 86400,
  "environment": "production",
  "memory": {
    "rss": "50MB",
    "heapUsed": "30MB",
    "heapTotal": "50MB"
  }
}
```
