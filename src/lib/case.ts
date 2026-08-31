export interface CsvRowIssue {
  line: number
  message: string
}

export interface CaseRow {
  case_id: string | null
  case_material: string | null
  stem: string
}

export function resolveCaseMaterial<T extends CaseRow>(questions: T[], index: number): string | null {
  const q = questions[index]
  if (!q?.case_id) return null
  if (q.case_material) return q.case_material
  return questions.find((x) => x.case_id === q.case_id && x.case_material)?.case_material ?? null
}

export function shouldShowCaseMaterial<T extends CaseRow>(questions: T[], index: number): boolean {
  const q = questions[index]
  if (!q?.case_id) return false
  const prev = questions[index - 1]
  return prev?.case_id !== q.case_id
}

export function finalizeCaseGroups<T extends CaseRow>(rows: T[]): T[] {
  const issues = validateCaseGroups(rows as (CaseRow & { line?: number })[])
  if (issues.length) {
    throw new Error(issues[0].message)
  }
  const materialByCase = new Map<string, string>()
  for (const row of rows) {
    if (!row.case_id) continue
    const material = (row.case_material ?? '').trim()
    if (material) materialByCase.set(row.case_id, material)
  }
  return rows.map((row) => {
    if (!row.case_id) return row
    return { ...row, case_material: materialByCase.get(row.case_id) ?? row.case_material }
  })
}

export function validateCaseGroups(rows: (CaseRow & { line?: number })[]): CsvRowIssue[] {
  const materialByCase = new Map<string, string>()
  const firstLineByCase = new Map<string, number>()
  for (const row of rows) {
    if (!row.case_id) continue
    const line = row.line ?? 0
    if (!firstLineByCase.has(row.case_id)) firstLineByCase.set(row.case_id, line)
    const material = (row.case_material ?? '').trim()
    if (material) materialByCase.set(row.case_id, material)
  }
  const issues: CsvRowIssue[] = []
  for (const caseId of new Set(rows.map((r) => r.case_id).filter(Boolean) as string[])) {
    if (!materialByCase.has(caseId)) {
      issues.push({
        line: firstLineByCase.get(caseId) ?? 0,
        message: `案例 ${caseId} 缺少 case_material（案例材料）`,
      })
    }
  }
  return issues
}
