# Supabase 部署指南（百鲸咨询 精选文章）

项目 URL：`https://mxtxwjprmfstbheiempi.supabase.co`
anon 公钥（已写入代码）：`sb_publishable_2VAasjGlB4ioG-hhCMSnAA_4AdPGD-R`

## 1. 建表（必须，只需一次）

1. 登录 Supabase 控制台 → 打开本项目
2. 左侧 **SQL Editor** → **New Query**
3. 粘贴 `articles/schema.sql` 全部内容 → **Run**
4. 执行后 `articles` 表创建，并写入 10 条示例文章

> 此步骤需要你在控制台手动执行（无数据库写权限的接口可绕过 DDL）。

## 2. 创建后台管理员账号（必须）

1. 左侧 **Authentication** → **Users** → **Add user**
2. 填写邮箱 + 密码（这就是你登录 `admin.html` 的凭据）
3. 勾选 "Auto Confirm User"（跳过邮件验证）
4. 保存

> 仅有此账号能登录后台写文章。请勿开启公开注册。

## 3. 权限说明（RLS，已在 schema.sql 配置）

- **SELECT**：所有人可读（前端 `index.html` 公开展示精选文章）
- **INSERT / UPDATE / DELETE**：仅登录用户可写（`admin.html` 登录后凭用户身份操作）
- `sb_secret_...` 服务密钥**绝不**出现在任何前端文件中

## 4. 部署

代码已推送至 GitHub（`git@github.com:1114991894/baijing.git`），由 GitHub Pages 托管：

- `index.html` — 前端首页（精选文章模块，公开读取）
- `admin.html` — 管理后台（Supabase Auth 登录后管理，URL 同站点 `/admin.html`）
- `javascript.js` — 辅助脚本

## 数据流

```
admin.html 登录(Supabase Auth)
   └─> 写/改/删 articles 表 (Supabase, RLS 鉴权)
          └─> index.html 加载时读取(公开) ──> 精选文章自动同步
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `articles/schema.sql` | Supabase 表结构 + 示例数据 + RLS 策略 |
| `articles/SUPABASE_SETUP.md` | 本部署指南 |
| `index.html` | 前端首页（含精选文章模块，只读） |
| `admin.html` | 文章管理后台（需登录，写库） |
| `javascript.js` | 文章管理辅助函数 |
| `api/` | 现有 API 服务（抖音 Webhook） |
