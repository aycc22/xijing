# 01: 判断题端到端支持

**What to build:** 学习者和上传者可以在整套刷题流程中使用判断题：上传者通过 CSV 导入或后续单题编辑维护判断题，学习者在刷题页看到「正确/错误」两选项并获即时判分。同时抽出可复用的作答/计分 composable，供后续刷题与答题模式共用。

**Blocked by:** None (can start immediately)

**Status:** done

- [x] 数据层支持 `judgement` 题型（迁移 + RLS 不变）
- [x] CSV 导入可解析判断题（答案 `TRUE`/`FALSE`），预检报错清晰
- [x] 刷题页正确渲染判断题并即时判分
- [x] 抽出 `useScoring`（或等价 composable），单选/多选/判断共用计分逻辑
- [x] 样例 CSV 与导入模板含判断题示例
