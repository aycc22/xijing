import { ref } from 'vue'
import {
  invokeAiProxy,
  type AiProxyError,
  type SessionAiReport,
} from '../lib/aiProxy'
import { supabase } from '../lib/supabase'
import {
  computeTagStats,
  filterWeakPointsToKnownTags,
  type SessionAnswerRow,
  type TagStat,
} from '../lib/tagStats'

export type AiSessionType = 'practice' | 'exam'

async function loadQuestionTags(ids: string[]): Promise<Record<string, string[]>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const map: Record<string, string[]> = {}
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100)
    const { data, error } = await supabase.from('questions').select('id, tags').in('id', chunk)
    if (error) throw error
    for (const row of data ?? []) {
      map[row.id] = Array.isArray(row.tags) ? row.tags.map(String) : []
    }
  }
  return map
}

function applyKnownTags(report: SessionAiReport, tagStats: TagStat[]): SessionAiReport {
  return {
    ...report,
    weak_points: filterWeakPointsToKnownTags(report.weak_points ?? [], tagStats),
  }
}

export function useAiSessionAnalysis() {
  const localTagStats = ref<TagStat[]>([])
  const report = ref<SessionAiReport | null>(null)
  const cached = ref(false)
  const loading = ref(false)
  const error = ref<AiProxyError | null>(null)
  let autoKey = ''

  async function prepare(sessionType: AiSessionType, sessionId: string, rows: SessionAnswerRow[]) {
    const tags = await loadQuestionTags(rows.map((row) => row.questionId))
    localTagStats.value = computeTagStats(rows, tags)
    const { data } = await supabase
      .from('session_ai_reports')
      .select('*')
      .eq('session_type', sessionType)
      .eq('session_id', sessionId)
      .eq('status', 'ready')
      .maybeSingle()
    if (data) {
      report.value = applyKnownTags(data as SessionAiReport, localTagStats.value)
    }
  }

  async function analyze(sessionType: AiSessionType, sessionId: string, force = false) {
    loading.value = true
    error.value = null
    const result = await invokeAiProxy({
      action: 'analyze_session',
      session_type: sessionType,
      session_id: sessionId,
      force,
    })
    loading.value = false
    if (!result.ok) {
      error.value = result.error
      return
    }
    const stats =
      localTagStats.value.length > 0 ? localTagStats.value : result.data.report.tag_stats ?? []
    report.value = applyKnownTags(result.data.report, stats)
    cached.value = result.data.cached
  }

  async function autoAnalyzeOnce(
    sessionType: AiSessionType,
    sessionId: string,
    rows: SessionAnswerRow[],
  ) {
    const key = `${sessionType}:${sessionId}`
    if (autoKey === key) return
    autoKey = key
    try {
      await prepare(sessionType, sessionId, rows)
    } catch {
      localTagStats.value = computeTagStats(rows, {})
    }
    await analyze(sessionType, sessionId, false)
  }

  async function regenerate(sessionType: AiSessionType, sessionId: string) {
    await analyze(sessionType, sessionId, true)
  }

  return {
    localTagStats,
    report,
    cached,
    loading,
    error,
    autoAnalyzeOnce,
    regenerate,
  }
}
