# 习径

Vue 3 + Supabase + GitHub Pages 的手机刷题 / 学习系统。样式使用 **Tailwind CSS v4**。

## 功能（MVP）

- 邮箱注册 / 登录 / 退出，以及忘记密码重置（Supabase Auth 邮件）
- 角色：`learner`（默认）→ 管理员升为 `uploader` / `admin` 后才能上传
- 管理员可冻结账号；被冻结用户无法登录
- CSV 导入题库（单选 / 多选 / 判断 / 案例小题），导入前逐行预检
- 题库题目管理：新增、编辑、停用、排序；学习者预览
- 已发布题库对登录用户可见；空题库不能发布，有学习记录的题库不能硬删除
- 刷题（顺序 / 随机 / 仅未做 / 仅错题）、组卷答题、结果逐题复盘
- 错题本掌握状态、收藏、笔记、练习与答题统一历史

> 微信登录已移除。若远程仍部署了 `wechat-auth` Edge Function，请在 Supabase 控制台删除或执行 `supabase functions delete wechat-auth`。

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
| option_a … option_h | 选项，至少 2 个（判断题可省略，固定为正确/错误） |
| answer | 单选如 `B`；多选如 `A;C`；判断如 `TRUE` 或 `FALSE` |
| explanation | 解析（可选） |
| difficulty | 难度（可选，如 easy / medium / hard） |
| tags | 标签（可选，用 `;` 分隔） |
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
4. 在 Supabase Authentication → URL Configuration 加入：
   - Site URL：`https://username.github.io/repo/`
   - Redirect URLs：同上（及本地 `http://localhost:5173/`），用于登录会话与重置密码邮件回跳
5. 在 Authentication → Emails 中确认已启用「Reset password」邮件模板

路由使用 Hash History，避免 Pages 刷新 404。

推送到 `main` 时 GitHub Actions 会先跑 `npm test`，通过后再构建并部署。

## 数据库迁移

上线前需将 `supabase/migrations/` 下**全部**迁移同步到远程，否则对应功能会加载失败：

```bash
supabase link --project-ref <你的项目 ref>
supabase db push
```

若未安装 CLI，也可在 Supabase SQL Editor 中按文件名顺序执行各迁移文件。

本次治理相关迁移：`202609090001_account_governance_and_learning.sql`（账号冻结、审计日志、空库发布保护、删除保护、错题掌握、答题时限字段等）。

邮箱注册仍依赖 Edge Function `email-auth`：

```bash
supabase functions deploy email-auth
```

## DeepSeek 智能分析（P0）

会后薄弱点分析走 Edge Function `ai-proxy`，密钥不得进入前端。配置与部署见 [docs/ai/OPS.md](./docs/ai/OPS.md)：

```bash
supabase db push
supabase secrets set DEEPSEEK_API_KEY=sk-...
supabase functions deploy ai-proxy
```

未配置密钥时，结果页仍显示本地考点统计，智能解读提示暂不可用。

学习者揭晓后单题「AI 点评」、题库 AI 考点打标、考试简答 AI 建议分见 [docs/ai/REQUIREMENTS-AI.md](./docs/ai/REQUIREMENTS-AI.md)；部署需同步迁移并 `supabase functions deploy ai-proxy`。

## 领域说明

见 [CONTEXT.md](./CONTEXT.md)。
