# Supabase 部署指南

## 1. 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) 并登录
2. 点击 **New Project**
3. 填写项目名称（如 `baijing-consulting`）、数据库密码、组织信息
4. 点击 **Create new project**

## 2. 执行数据库 Schema

1. 进入项目后，点击左侧菜单 **SQL Editor**
2. 点击 **New Query**
3. 将 `articles/schema.sql` 中的内容粘贴到编辑器中
4. 点击 **Run** 执行

## 3. 获取 API 凭证

1. 进入项目 **Settings** > **API**
2. 复制以下信息：
   - **Project URL**（格式：`https://xxx.supabase.co`）
   - **anon / public** key（用于前端访问）

## 4. 配置前端文件

### 修改 `index.html`

找到以下代码并替换为你的 Supabase 凭证：

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 修改 `admin.html`

同样找到并替换：

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

## 5. 配置 Supabase Row Level Security（可选）

如果需要更严格的权限控制，可以在 Supabase 控制台调整 RLS 策略：

- **SELECT**: 允许所有人读取文章（匿名访问）
- **INSERT/UPDATE/DELETE**: 仅允许认证用户操作

如需启用认证访问，需要在前端添加 Supabase Auth 登录逻辑。

## 6. 部署

将以下文件部署到你的静态托管服务（如 Vercel、Netlify、GitHub Pages 等）：

- `index.html` - 首页
- `admin.html` - 管理后台
- `javascript.js` - 辅助脚本
- `articles/schema.sql` - 数据库结构（仅需在 Supabase 执行一次）

## 文件说明

| 文件 | 说明 |
|------|------|
| `articles/schema.sql` | Supabase 数据库表结构和示例数据 |
| `articles/SUPABASE_SETUP.md` | 本部署指南 |
| `index.html` | 前端首页（含精选文章模块） |
| `admin.html` | 文章管理后台 |
| `javascript.js` | 文章管理辅助函数 |
| `api/` | 现有 API 服务（抖音 Webhook） |