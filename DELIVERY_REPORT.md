# Delivery Report

## 当前版本状态

Her Todo 已整理为可交付版本，支持本地交付模式和 Supabase 云端正式模式。没有 Supabase 环境变量时不会白屏，会直接进入 localStorage 本地保存模式；配置 Supabase 后会自动启用 Magic Link 登录和云端保存。

## 已完成功能

- 7 个主题：Obsidian Code、Glass OS、Aurora Dashboard、Command Center、Soft Cyber、Lulu、Karry。
- 静茹专属文案和首次欢迎页。
- 添加、删除、编辑、勾选完成任务。
- 今日任务、全部任务、未完成、已完成筛选。
- 今日完成率。
- 主题选择保存到 localStorage。
- 首次欢迎页状态保存到 localStorage。
- 本地模式使用 localStorage 保存任务。
- 云端模式使用 Supabase 保存任务。
- Supabase Auth Magic Link 登录保护。
- allowedEmails 白名单限制。
- Supabase 读取成功后的本地缓存。
- Supabase 读取失败时可显示缓存并提示。
- 备份导出 JSON。
- 备份导入 JSON。
- 基础 PWA manifest 和 192/512 图标。

## 本地模式

本地模式可用。未配置 `VITE_SUPABASE_URL` 或 `VITE_SUPABASE_ANON_KEY` 时，App 会显示提示：

```text
当前为本地保存模式，任务会保存在当前设备。
```

本地模式可以直接给静茹体验，但任务只保存在当前浏览器。

## 云端模式

云端模式代码已完成。配置真实 Supabase 环境变量后会启用：

- Magic Link 登录页。
- allowedEmails 白名单。
- 当前用户只能读取和修改自己的任务。
- Todo 增删改查写入 Supabase。
- 本地缓存作为简单降级。

当前本机没有真实 Supabase key，因此云端发送 Magic Link、登录回跳和云端 CRUD 仍需配置后实测。

## 登录保护

登录保护已完成。未登录不能进入云端 Todo 主页面。非白名单邮箱会看到：

```text
这个小 Todo 只开放给静茹使用。
```

如果 `allowedEmails` 仍是占位内容，页面会提示先配置允许登录的邮箱。

## Supabase schema

`supabase/schema.sql` 已包含：

- `public.todos` 表。
- `id uuid primary key default gen_random_uuid()`。
- `user_id uuid references auth.users(id) on delete cascade`。
- `title`、`category`、`priority`、`due_date`、`completed`、`created_at`、`updated_at` 字段。
- Row Level Security。
- SELECT / INSERT / UPDATE / DELETE 策略：`auth.uid() = user_id`。
- `updated_at` 自动更新时间触发器。
- `user_id, due_date` 索引。

匿名用户没有读写策略，不能读写任务。

## PWA

PWA 基础配置已完成：

- `public/manifest.webmanifest` 存在。
- `index.html` 已引用 manifest。
- `name` 是 `静茹的 Her Todo`。
- `short_name` 是 `Her Todo`。
- `display` 是 `standalone`。
- `start_url` 和 `scope` 是 `/`。
- 图标包含 192x192 和 512x512。

部署后手机浏览器可以添加到主屏幕。

## 主题完整性

主题配置包含 7 个主题，Lulu 使用 `/images/lulu.jpg` 和 `/images/lulu-2.jpg`，Karry 使用 `/images/karry.jpg`。图片加载失败时会隐藏图片并使用卡片 fallback，不会白屏。

## 已完成检查

- `npm run build`：通过。
- `npm run preview`：可启动。
- 2026-06-08 最终检查：`npm run build` 通过，`npm run preview` 可启动。
- 2026-06-08 Supabase 配置后检查：`npm run build` 通过，`npm run dev` 可启动，首页和 PWA manifest 返回 200。
- dist 已生成。
- manifest 和图标路径可访问。
- 主题图片路径可访问。
- 完整姓名只在 `src/userConfig.js` 中配置。
- 未发现 `service_role` key。
- `.env` 已被 `.gitignore` 忽略。

## 需要人工配置

1. 创建 Supabase 项目。
2. 执行 `supabase/schema.sql`。
3. 开启 Supabase Auth Email / Magic Link。
4. 配置 Supabase Site URL。
5. 在 `Authentication -> URL Configuration` 配置 Supabase Redirect URLs：
   - `http://localhost:5173`
   - `http://localhost:5173/`
   - `https://你的项目名.vercel.app`
   - `https://你的项目名.vercel.app/`
6. 在 `.env` 填写：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. 修改 `src/userConfig.js` 的 `allowedEmails`，填入真实邮箱。
8. 在 Vercel Environment Variables 添加同样的两个变量。

Supabase Project URL 位置：

```text
Project Settings -> API -> Project URL
```

Supabase anon key 位置：

```text
Project Settings -> API -> anon public key
```

不要使用 `service_role` key。

## Supabase 配置进度

- Supabase 项目已创建。
- `todos` 表已创建。
- `supabase/schema.sql` 已执行成功。
- `.env` 已配置，并且未被 git 跟踪。
- `allowedEmails` 已包含 `lianghansheng182@gmail.com`。
- `allowedEmails` 已包含 `1402074567@qq.com`，还需要你确认这是否是女朋友实际登录邮箱。
- 还需要确认 Supabase Redirect URLs 是否已经包含本地地址和尾斜杠地址。
- 还需要手动完成 Magic Link 邮件点击登录实测。
- 部署到 Vercel 后，需要在 Vercel 配置相同环境变量，并把 Vercel 域名加入 Supabase Redirect URLs。

## Magic Link 手动验证

自动检查已确认 dev server 能启动，但真实 Magic Link 需要进入邮箱点击登录链接，不能由本地脚本代替。请手动打开 `http://localhost:5173`，输入白名单邮箱，点击“发送登录链接”，再到邮箱中点击 Supabase 登录邮件完成验证。

## 如何交付给静茹使用

短期体验：不配置 Supabase，直接部署或本地打开，本地模式会保存到当前设备。

正式长期使用：配置 Supabase 和 Vercel 环境变量，设置 allowedEmails，部署到 Vercel，再把链接发给静茹。她通过邮箱 Magic Link 登录后，任务会保存到云端。

## 已知限制

- 本地模式不能跨设备同步。
- 云端模式需要真实 Supabase 配置后才能端到端验证。
- 备份导入是简单追加任务，不做复杂冲突合并。
- 第一版没有复杂离线同步。
