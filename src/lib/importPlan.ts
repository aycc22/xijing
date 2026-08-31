import type { ParsedQuestionRow } from './csv'

export interface ImportStats {
  created: number
  updated: number
  skipped: number
  failed: number
}

export interface ImportPlan {
  inserts: ParsedQuestionRow[]
  updates: { row: ParsedQuestionRow; questionId: string }[]
}

export function planQuestionImport(
  rows: ParsedQuestionRow[],
  existingByExternalId: Map<string, string>,
): ImportPlan {
  const inserts: ParsedQuestionRow[] = []
  const updates: { row: ParsedQuestionRow; questionId: string }[] = []
  for (const r of rows) {
    if (!r.external_id) {
      inserts.push(r)
      continue
    }
    const questionId = existingByExternalId.get(r.external_id)
    if (questionId) updates.push({ row: r, questionId })
    else inserts.push(r)
  }
  return { inserts, updates }
}

export function toImportStats(plan: ImportPlan, failed = 0): ImportStats {
  return {
    created: plan.inserts.length,
    updated: plan.updates.length,
    skipped: 0,
    failed,
  }
}

export function questionPayloadFromRow(row: ParsedQuestionRow, bankId: string, sortOrder: number) {
  return {
    bank_id: bankId,
    external_id: row.external_id,
    qtype: row.qtype,
    stem: row.stem,
    options: row.options,
    answer_keys: row.answer_keys,
    explanation: row.explanation,
    case_id: row.case_id,
    case_material: row.case_material || null,
    sort_order: sortOrder,
    is_active: true,
  }
}
