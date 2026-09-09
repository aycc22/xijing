import { describe, expect, it } from 'vitest'
import { formatErrorMessage } from './errors'

describe('formatErrorMessage', () => {
  it('maps known exam submit errors to Chinese', () => {
    expect(formatErrorMessage(new Error('exam session not found'), 'fallback')).toBe(
      '答题记录不存在，请返回试卷重新开始',
    )
    expect(formatErrorMessage(new Error('not allowed'), 'fallback')).toBe(
      '登录已过期或无权限，请重新登录后再交卷',
    )
  })

  it('reads message from plain supabase-like objects', () => {
    expect(
      formatErrorMessage({ message: 'JWT expired', code: 'PGRST301' }, '交卷失败，请重试'),
    ).toBe('登录已过期，请重新登录后再交卷')
  })

  it('maps paper create foreign key errors to Chinese', () => {
    expect(
      formatErrorMessage(
        new Error('insert violates foreign key constraint "paper_instances_user_id_fkey"'),
        '无法生成试卷',
      ),
    ).toBe('账号资料未就绪，请退出后重新登录；若仍失败请联系管理员')
  })

  it('maps bank governance errors to Chinese', () => {
    expect(
      formatErrorMessage(new Error('empty bank cannot be published'), '发布失败'),
    ).toBe('空题库不能发布，请先导入或新增有效题目')
    expect(
      formatErrorMessage(new Error('bank has learning records'), '删除失败'),
    ).toBe('该题库已有练习、错题或收藏等学习记录，不能删除，请改为下架')
  })

  it('falls back when message is missing', () => {
    expect(formatErrorMessage({ code: 'PGRST301' }, '交卷失败，请重试')).toBe('交卷失败，请重试')
    expect(formatErrorMessage(null, '交卷失败，请重试')).toBe('交卷失败，请重试')
  })
})
