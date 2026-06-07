# Delivery Report

## 当前版本功能

- 7 个主题：Obsidian Code、Glass OS、Aurora Dashboard、Command Center、Soft Cyber、Lulu、Karry。
- Supabase Auth Magic Link 登录保护。
- 邮箱白名单限制，非允许邮箱不能进入 Todo 页面。
- Todo 任务支持添加、删除、编辑、勾选完成。
- 今日任务、全部任务、未完成、已完成筛选。
- 今日完成率。
- 主题选择保存到 localStorage，刷新后保持。
- 首次欢迎页只显示一次，状态保存到 localStorage。
- 基础 PWA manifest 和图标，支持添加到主屏幕。

## 数据保存方式

- Todo 任务保存到 Supabase `public.todos` 表。
- `localStorage` 只保存：
  - 当前主题
  - 首次欢迎页状态
  - Supabase 成功读取后的本地缓存
- 如果 Supabase 读取失败，会尝试显示本地缓存，并提示网络恢复后刷新同步。

## 已完成检查

- 已执行 `npm install`。
- 已执行 `npm run build`。
- 已执行 `npm run dev`，本地页面返回 200。
- 已执行 `npm run preview`，生产预览页面返回 200。
- 已确认 preview 中 manifest、PWA 图标、Lulu 图片、Karry 图片资源均返回 200。
- 已新增 `public/manifest.webmanifest`。
- 已新增 192x192 和 512x512 图标。
- 已新增 Supabase SQL：`supabase/schema.sql`。
- 已确认完整姓名只在 `src/userConfig.js` 中配置。
- 已确认没有 service role key。
- 已确认当前主题配置包含 7 个主题。

## 需要人工配置

1. 创建 Supabase 项目。
2. 执行 `supabase/schema.sql`。
3. 开启 Supabase Auth Email Magic Link。
4. 配置 Supabase Site URL 和 Redirect URLs。
5. 创建 `.env` 并填写：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. 修改 `src/userConfig.js` 的 `allowedEmails`，填入你和静茹实际使用的邮箱。
7. 部署到 Vercel 后，在 Vercel 添加同样的环境变量。

## 给静茹使用的步骤

1. 打开部署后的链接。
2. 输入允许邮箱。
3. 点击“发送登录链接”。
4. 在邮箱中点击登录链接。
5. 第一次进入后点击“开始使用”。
6. 手机浏览器菜单中选择添加到主屏幕。

## 备注

- 当前本机没有真实 Supabase 环境变量，因此 Magic Link 和云端 CRUD 需要完成 Supabase 配置后验证。
- 未配置 Supabase 时，页面会显示配置提示，不会进入 Todo 页面。
