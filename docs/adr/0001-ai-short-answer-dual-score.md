# 主观简答采用双轨得分（规则分与 AI 建议分分离）

考试 `short_answer` 交卷后，正式小题得分与会话总分仍由既有模糊匹配（及未来人工阅卷）写入 `earned` / `exam_sessions.score`；DeepSeek 的建议分、评语与采分点只写入 `ai_score` / `ai_feedback`，默认不覆盖正式分。UI 须标明「AI 辅助评分，仅供参考」。若日后上线人工阅卷，人工分优先于规则分与 AI 分，改写正式 `earned`。

## Considered Options

- AI 分覆盖 `earned` 并重算总分（实现简单，但与「仅供参考」冲突）
- AI 分只展示、完全不落库（难追溯与重试）
- **双轨落库（采纳）**
