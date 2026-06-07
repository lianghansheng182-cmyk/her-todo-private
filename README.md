# 静茹的 Her Todo

一个使用 React + Vite 制作的私人 Todo App，支持 7 个主题、Supabase 云端保存、Magic Link 登录和基础 PWA 安装。

页面内主要使用展示名“静茹”。完整姓名只放在 `src/userConfig.js`，不要写进公开说明或 meta description。

## 本地启动

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

## Supabase 配置

1. 创建 Supabase 项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 在 Authentication 中开启 Email Magic Link。
4. 在 Authentication URL Configuration 中设置：
   - Site URL：本地开发可用 `http://localhost:5173`
   - Redirect URLs：加入本地地址和 Vercel 部署后的域名
5. 在 Project Settings / API 中复制：
   - Project URL
   - anon public key
6. 在项目根目录创建 `.env`：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

7. 编辑 `src/userConfig.js`，把 `allowedEmails` 改成实际允许登录的邮箱。

注意：不要把 service role key 放进前端或 `.env`。

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

6. 在 Vercel Environment Variables 添加：

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

7. 部署后，把 Vercel 域名加入 Supabase Auth 的 Redirect URLs。

## 女朋友使用

1. 手机打开部署后的链接。
2. 输入白名单邮箱，点击“发送登录链接”。
3. 在邮箱中点击 Magic Link。
4. 进入 App 后可以添加到手机主屏幕，以后像 App 一样打开。

## 文件说明

- `src/App.jsx`：主应用逻辑、登录保护、Todo 增删改查、主题切换。
- `src/App.css`：7 个主题和响应式样式。
- `src/themeConfig.js`：所有主题文案、className、图片配置。
- `src/userConfig.js`：私人用户配置和允许邮箱列表。
- `src/lib/supabaseClient.js`：Supabase 客户端。
- `supabase/schema.sql`：todos 表和 RLS 策略。
- `public/manifest.webmanifest`：PWA manifest。
- `public/icons/`：PWA 图标。

## 安全提醒

- 不要提交 `.env`。
- 不要把 service role key 放到前端。
- 仓库建议 private。
- 如果替换为私人图片，不要公开仓库。
