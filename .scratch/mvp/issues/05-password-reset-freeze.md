# 05: 密码重置与账号冻结

**What to build:** 用户可通过「忘记密码」流程重置邮箱密码；被冻结账号登录时展示可理解提示并禁止进入系统。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 登录页提供忘记密码入口，发送重置邮件（ACC-01）
- [ ] 重置密码流程可用且引导清晰
- [ ] `profiles` 支持冻结状态；冻结账号无法登录（ACC-03）
- [ ] 冻结提示文案对用户友好，非技术错误码
