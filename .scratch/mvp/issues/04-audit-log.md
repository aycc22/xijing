# 04: 基础审计日志

**What to build:** 关键管理操作写入审计日志，管理员可查看。首期覆盖角色变更、题库发布/下架和批量删除。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 审计日志表：操作者、时间、对象、操作类型、原因/备注
- [ ] 角色变更写入日志（AUTH-07, AC-12）
- [ ] 题库发布/下架写入日志
- [ ] 管理员页面可浏览审计记录（分页）
- [ ] RLS：仅 admin 可读审计日志
