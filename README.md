# 习径

Vue 3 + Supabase + GitHub Pages 的手机刷题 / 学习系统。样式使用 **Tailwind CSS v4**。

## 功能（MVP）

- 邮箱注册 / 登录（注册后可直接登录，无需邮箱验证）
- 微信登录（开放平台扫码；可选公众号网页授权），无需填写或验证邮箱
- 角色：`learner`（默认）→ 管理员升为 `uploader` / `admin` 后才能上传
- CSV 导入题库（单选 / 多选 / 判断 / 案例小题），导入前逐行预检
- 题库题目管理：新增、编辑、停用、排序；学习者预览
- 发布题库后其他人可刷题
- 刷题记录与正确率

## 技术栈

- Vue 3 + Vite + TypeScript
- Tailwind CSS v4（`@tailwindcss/vite`，约定见 `.cursor/rules/tailwind-css.mdc`）
- Supabase（Auth / Postgres / RLS）
- GitHub Pages

## 本地启动

```bash
cp .env.example .env.local
# 填入 Supabase URL 与 anon key
npm install
npm run dev
```

## CSV 格式

见 `public/samples/questions.sample.csv`：

| 列 | 说明 |
|----|------|
| type | `single` / `multiple` / `judgement`（也可用「单选」「多选」「判断」） |
| stem | 题干 |
| option_a … option_f | 选项，至少 2 个（判断题可省略，固定为正确/错误） |
| answer | 单选如 `B`；多选如 `A;C`；判断如 `TRUE` 或 `FALSE` |
| explanation | 解析（可选） |
| case_id | 案例标识；同一案例的小题填相同值 |
| case_material | 案例材料；同一案例可在首行填写，会自动同步到组内各行 |

案例小题仍使用 `single` / `multiple` / `judgement` 作为 type，并填写相同的 `case_id`。

## 第一个管理员

注册账号后，在 Supabase SQL Editor 执行（换成你的邮箱对应用户 id，或直接按邮箱更新）：

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = '你的邮箱@example.com'
);
```

然后打开站点 `/#/admin` 给其他人授予 `uploader`。

## GitHub Pages

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**
2. 添加 Secrets：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
3. 若是项目站（`username.github.io/repo/`），设 Variable `VITE_BASE` 为 `/repo/`
4. 可选：Variable `VITE_WECHAT_OPEN_APP_ID`（微信开放平台网站应用 AppID）
5. 在 Supabase Authentication → URL Configuration 加入：
   - Site URL：`https://username.github.io/repo/`
   - Redirect URLs：同上（及本地 `http://localhost:5173/`）

路由使用 Hash History，避免 Pages 刷新 404。

## 微信登录配置

微信不是 Supabase 内置 OAuth，需部署 Edge Function 并用微信开放平台（或公众号）换票。

### 1. 微信开放平台（扫码登录，推荐）

1. 在 [微信开放平台](https://open.weixin.qq.com/) 创建**网站应用**并完成审核
2. 授权回调域填写站点域名（如 `username.github.io`，不要带协议和路径）
3. 前端：`.env.local` / GitHub Variable 设置 `VITE_WECHAT_OPEN_APP_ID`
4. Supabase Edge Function Secrets：

```bash
supabase secrets set WECHAT_OPEN_APP_ID=wx你的AppID
supabase secrets set WECHAT_OPEN_APP_SECRET=你的AppSecret
```

### 2. 可选：公众号（微信内浏览器一键登录）

```bash
supabase secrets set WECHAT_MP_APP_ID=wx公众号AppID
supabase secrets set WECHAT_MP_APP_SECRET=公众号AppSecret
```

公众号需配置网页授权域名，与站点域名一致。

### 3. 部署 Edge Function 与迁移

上线前需将 `supabase/migrations/` 下**全部**迁移同步到远程（含错题本 `202608310006_wrong_question_items.sql` 等），否则对应功能会加载失败：

```bash
supabase link --project-ref <你的项目 ref>
supabase db push
supabase functions deploy wechat-auth
```

若未安装 CLI，也可在 Supabase SQL Editor 中按文件名顺序执行各迁移文件。

登录流程：扫码/授权 → 回调站点根路径 `?code=&state=` → 前端转入 `/#/auth/wechat/callback` → `wechat-auth` 用 Admin API 创建用户（`email_confirm: true`，合成邮箱 `wx_{openid}@wechat.xijing.app`）→ `verifyOtp` 建会话。用户无需输入或验证真实邮箱。

## 领域说明

见 [CONTEXT.md](./CONTEXT.md)。
