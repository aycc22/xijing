# 习径

Vue 3 + Supabase + GitHub Pages 的手机刷题 / 学习系统。样式使用 **Tailwind CSS v4**。

## 功能（MVP）

- 邮箱注册 / 登录
- 角色：`learner`（默认）→ 管理员升为 `uploader` / `admin` 后才能上传
- CSV 导入题库（单选 / 多选 / 判断）
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
   - Redirect URLs：同上（及本地 `http://localhost:5173/`）

路由使用 Hash History，避免 Pages 刷新 404。

## 领域说明

见 [CONTEXT.md](./CONTEXT.md)。
