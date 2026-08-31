# 习径 — Domain Context

## Purpose

多人可用的在线学习平台。第一期是「题库上传 + 手机刷题」；后续可挂接闪卡、笔记等其它学习模块。

## Glossary

| Term | Meaning |
|------|---------|
| **Learner** | 默认角色。可浏览已发布题库、刷题、看自己的作答记录 |
| **Uploader** | 由 Admin 授予。可创建题库、CSV 导入题目、发布/下架自己的题库 |
| **Admin** | 可改任何人的角色、管理全部题库 |
| **Question Bank** | 一套题的集合；未发布仅 owner/admin 可见 |
| **Question** | 可作答内容。支持 `single` 单选、`multiple` 多选、`judgement` 判断，以及案例材料下的关联小题 |
| **Case** | 一段公共案例材料及其关联的一个或多个小题 |
| **Practice Session** | 一次刷题过程，逐题提交并即时展示正误与解析 |
| **Exam Session** | 一次答题过程，交卷前不展示答案与解析 |
| **Paper Template** | 随机组卷规则：题型、数量、范围、难度和分值配置 |
| **Paper Instance** | 按模板生成后固化的题目快照与顺序；刷新或换设备不得换题 |
| **Wrong Question Item** | 用户与错题的去重关系，记录错误次数与掌握状态 |
| **Upload Permission** | 不是「登录即可上传」；必须角色为 `uploader` 或 `admin` |

## Key rules

1. 新用户注册后角色固定为 `learner`，需 Admin 提权后才能上传。
2. 题库 CSV 是唯一批量导入格式（MVP），同时允许页面内单题编辑。
3. 已发布题库对所有登录用户可读；未发布仅 owner/admin。
4. 刷题模式即时反馈；答题模式交卷前不得返回答案、解析或单题正误。
5. 随机试卷生成后必须固化题目快照与顺序。
6. 前端只使用 publishable/anon key；权限全部靠 RLS。

## Product requirements

完整产品范围、优先级、业务规则和验收场景见 [REQUIREMENTS.md](./REQUIREMENTS.md)。

## Out of scope (MVP)

主观案例题人工阅卷、组织/班级、课程体系、交易支付、AI 自动评分和非刷题学习模块 UI。
