export interface CaseAttachment {
  type: string
  id?: string
  description?: string
  url?: string
}

export const DEFAULT_EXAM_ASSETS_BASE = '/data/exams/2022-isec/images'

export function resolveAttachmentUrl(
  attachment: CaseAttachment,
  assetsBase = DEFAULT_EXAM_ASSETS_BASE,
): string | null {
  if (attachment.url?.trim()) return attachment.url.trim()
  if (attachment.id?.trim()) return `${assetsBase.replace(/\/$/, '')}/${attachment.id.trim()}.svg`
  return null
}

export function normalizeAttachments(
  raw: unknown,
  assetsBase = DEFAULT_EXAM_ASSETS_BASE,
): CaseAttachment[] {
  if (!Array.isArray(raw)) return []
  const items: CaseAttachment[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const type = typeof row.type === 'string' ? row.type : 'image'
    const id = typeof row.id === 'string' ? row.id : undefined
    const description = typeof row.description === 'string' ? row.description : undefined
    const url = typeof row.url === 'string' ? row.url : undefined
    const normalized: CaseAttachment = { type, id, description, url }
    const resolved = resolveAttachmentUrl(normalized, assetsBase)
    if (resolved) normalized.url = resolved
    items.push(normalized)
  }
  return items
}

/** 兼容旧数据：从 case_material 中移除导入时写入的配图占位文字 */
export function stripAttachmentPlaceholders(material: string | null | undefined): string {
  if (!material) return ''
  return material
    .replace(/\n*【配图\s+[^】]+】[^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
