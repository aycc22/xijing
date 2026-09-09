export const EXAM_DURATION_OPTIONS = [
  { minutes: 0, label: '不限时' },
  { minutes: 30, label: '30 分钟' },
  { minutes: 60, label: '60 分钟' },
  { minutes: 90, label: '90 分钟' },
  { minutes: 120, label: '120 分钟' },
] as const

export function deadlineFromMinutes(minutes: number, from = new Date()): string | null {
  if (!minutes || minutes <= 0) return null
  return new Date(from.getTime() + minutes * 60_000).toISOString()
}

export function remainingMs(deadlineAt: string | null | undefined, now = Date.now()): number | null {
  if (!deadlineAt) return null
  return new Date(deadlineAt).getTime() - now
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function isExamTimedOut(deadlineAt: string | null | undefined, now = Date.now()): boolean {
  const left = remainingMs(deadlineAt, now)
  return left != null && left <= 0
}
