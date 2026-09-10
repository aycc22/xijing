# DeepSeek AI 运维（P0）

会后智能分析依赖 Edge Function `ai-proxy`。密钥只放在 Supabase Secrets，**不要**写入前端环境变量或 git。

## 迁移

将 `supabase/migrations/` 同步到远程（含 `202609100001_ai_session_reports.sql`）：

```bash
supabase link --project-ref <你的项目 ref>
supabase db push
```

## Secrets 与部署

```bash
supabase secrets set DEEPSEEK_API_KEY=sk-...
# 可选：
# supabase secrets set DEEPSEEK_BASE_URL=https://api.deepseek.com
# supabase secrets set DEEPSEEK_MODEL=deepseek-chat
# supabase secrets set AI_DAILY_LIMIT_ANALYZE=30

supabase functions deploy ai-proxy
```

未配置 `DEEPSEEK_API_KEY` 时，接口返回 `ai_disabled`；结果页仍展示本地考点聚合。

紧急关闭：清空或删除 `DEEPSEEK_API_KEY` 即可全局禁用模型调用。

P1a `explain_question`、P1b `analyze_question` 与 P2 `grade_short_answer` 尚未实现。
