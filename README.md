# 静茹的 Her Todo

一个使用 React + Vite 制作的私人 Todo App。它支持 7 个主题、本地保存模式、Supabase 云端正式模式、Magic Link 登录保护、备份导入导出和基础 PWA 安装。

页面内主要使用展示名“静茹”。完整姓名只放在 `src/userConfig.js`，不要写进公开说明或 meta description。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 预览

```bash
npm run preview
```

## 两种使用模式

### 本地交付模式

不配置 Supabase 也可以直接打开使用。任务会保存在当前浏览器的 `localStorage` 中，适合先给静茹体验。

本地模式保留：

- 添加、删除、编辑、勾选完成任务
- 今日任务、全部任务、未完成、已完成筛选
- 今日完成率
- 7 个主题切换
- 首次欢迎页
- 备份导入导出
- PWA 添加到主屏幕

### 云端正式模式

配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 后，App 会自动进入 Supabase 云端模式。

云端模式会启用：

- Supabase Auth Magic Link 登录
- `allowedEmails` 白名单限制
- Todo 数据保存到 Supabase
- 数据绑定当前登录用户的 `user_id`
- Supabase 读取成功后的本地缓存

## Supabase 配置步骤

1. 打开 Supabase。
2. 新建项目。
3. 进入 SQL Editor。
4. 打开本项目的 `supabase/schema.sql`。
5. 复制全部 SQL，粘贴到 Supabase SQL Editor。
6. 点击 Run。
7. 进入 Authentication。
8. 开启 Email 登录 / Magic Link。
9. 进入 Supabase 控制台：

```text
Authentication -> URL Configuration
```

10. 配置 Site URL：

```text
http://localhost:5173
```

11. 配置 Redirect URLs，至少加入：

```text
http://localhost:5173
http://localhost:5173/
https://你的项目名.vercel.app
https://你的项目名.vercel.app/
```

如果使用 Vercel preview 域名，也可以加进去。

12. 找到 Supabase Project URL：

```text
Project Settings -> API -> Project URL
```

13. 找到 Supabase anon key：

```text
Project Settings -> API -> anon public key
```

14. 在项目根目录创建或编辑 `.env`：

```env
VITE_SUPABASE_URL=你的 Project URL
VITE_SUPABASE_ANON_KEY=你的 anon public key
```

15. 编辑 `src/userConfig.js`，把 `allowedEmails` 改成实际允许登录的邮箱。

不要使用 `service_role` key，也不要把它放进任何前端代码。

## Vercel 部署

1. 建议把 GitHub 仓库设为 private。
2. 在 Vercel 导入项目。
3. Framework Preset 选择 `Vite`。
4. Build Command 使用：

```bash
npm run build
```

5. Output Directory 使用：

```bash
dist
```

6. 在 Vercel 添加环境变量：

```text
Vercel -> Project -> Settings -> Environment Variables
```

添加：

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

7. 重新部署。
8. 部署后，把 Vercel 正式地址加入 Supabase Auth Redirect URLs：

```text
Authentication -> URL Configuration -> Redirect URLs
```

## 手机添加到主屏幕

1. 用手机浏览器打开部署后的链接。
2. 登录或进入本地模式。
3. 打开浏览器菜单。
4. 选择“添加到主屏幕”。
5. 之后可以像 App 一样打开。

## 备份与恢复

- 点击“导出备份”会下载 JSON 文件。
- 点击“导入备份”可以选择之前导出的 JSON。
- 备份内容包括 `tasks`、`theme`、`exportedAt`、`appName`。
- 本地模式导入后会写入 localStorage。
- 云端模式导入后会写入 Supabase。

## 文件说明

- `src/App.jsx`：主应用逻辑、双模式保存、登录保护、Todo 增删改查、备份导入导出。
- `src/App.css`：7 个主题和响应式样式。
- `src/themeConfig.js`：所有主题文案、className、图片配置。
- `src/userConfig.js`：私人用户配置和允许邮箱列表。
- `src/lib/supabaseClient.js`：Supabase 客户端。
- `supabase/schema.sql`：todos 表、RLS 策略、updated_at 触发器。
- `public/manifest.webmanifest`：PWA manifest。
- `public/icons/`：PWA 图标。
- `.env.example`：环境变量示例。

## 安全提醒

- 不要提交 `.env`。
- 不要把 `service_role` key 放到前端。
- 仓库建议 private。
- 如果替换为私人图片，不要公开仓库。
