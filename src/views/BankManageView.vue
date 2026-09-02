<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScoring } from '../composables/useScoring'
import { JUDGEMENT_OPTIONS } from '../lib/scoring'
import { lintQuestionCsv } from '../lib/csv'
import { lintQuestionJson } from '../lib/questionJson'
import { QUESTION_JSON_SAMPLE } from '../lib/questionJsonSample'
import {
  planQuestionImport,
  questionPayloadFromRow,
  toImportStats,
  type ImportStats,
} from '../lib/importPlan'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import type { CsvLintResult } from '../lib/csv'
import type { Question, QuestionBank, QuestionOption, QuestionType } from '../lib/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { questionTypeLabel } = useScoring()

const bankId = computed(() => String(route.params.bankId))
const bank = ref<QuestionBank | null>(null)
const questions = ref<Question[]>([])
const loading = ref(true)
const error = ref('')
const busy = ref(false)

const editingId = ref<string | null>(null)
const showForm = ref(false)
const draft = ref(emptyDraft())

type ImportMode = 'csv' | 'json'

const importMode = ref<ImportMode>('csv')
const importFile = ref<File | null>(null)
const jsonText = ref('')
const lintResult = ref<CsvLintResult | null>(null)
const issueUnit = ref<'行' | '题'>('行')
const importStats = ref<ImportStats | null>(null)
const importBusy = ref(false)
const sampleCopied = ref(false)

function emptyDraft() {
  return {
    external_id: '',
    qtype: 'single' as QuestionType,
    stem: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    answer: '',
    explanation: '',
    case_id: '',
    case_material: '',
  }
}

function normalizeOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => o as QuestionOption)
}

function draftToOptions(): QuestionOption[] {
  if (draft.value.qtype === 'judgement') return [...JUDGEMENT_OPTIONS]
  const pairs = [
    ['A', draft.value.optionA],
    ['B', draft.value.optionB],
    ['C', draft.value.optionC],
    ['D', draft.value.optionD],
  ] as const
  return pairs.filter(([, text]) => text.trim()).map(([key, text]) => ({ key, text: text.trim() }))
}

function draftToAnswerKeys(): string[] {
  if (draft.value.qtype === 'judgement') {
    return [draft.value.answer.trim().toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE']
  }
  return draft.value.answer
    .split(/[;；,，\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

function canManage() {
  if (!bank.value || !auth.user.value) return false
  return bank.value.owner_id === auth.user.value.id || auth.admin.value
}

async function load() {
  loading.value = true
  error.value = ''
  const { data: bankData, error: bankErr } = await supabase
    .from('question_banks')
    .select('*')
    .eq('id', bankId.value)
    .maybeSingle()
  if (bankErr || !bankData) {
    error.value = bankErr?.message ?? '题库不存在'
    loading.value = false
    return
  }
  bank.value = bankData as QuestionBank
  if (!canManage()) {
    error.value = '无权管理此题库'
    loading.value = false
    return
  }
  const { data, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId.value)
    .order('sort_order', { ascending: true })
  if (qErr) error.value = qErr.message
  else {
    questions.value = (data ?? []).map((q) => ({
      ...q,
      options: normalizeOptions(q.options),
      is_active: q.is_active ?? true,
    })) as Question[]
  }
  loading.value = false
}

function openCreate() {
  editingId.value = null
  draft.value = emptyDraft()
  showForm.value = true
}

function openEdit(q: Question) {
  editingId.value = q.id
  draft.value = {
    external_id: q.external_id ?? '',
    qtype: q.qtype === 'case_analysis' ? 'single' : q.qtype,
    stem: q.stem,
    optionA: q.options.find((o) => o.key === 'A')?.text ?? '',
    optionB: q.options.find((o) => o.key === 'B')?.text ?? '',
    optionC: q.options.find((o) => o.key === 'C')?.text ?? '',
    optionD: q.options.find((o) => o.key === 'D')?.text ?? '',
    answer: q.qtype === 'judgement' ? q.answer_keys[0] ?? 'TRUE' : q.answer_keys.join(';'),
    explanation: q.explanation,
    case_id: q.case_id ?? '',
    case_material: q.case_material ?? '',
  }
  showForm.value = true
}

async function saveQuestion() {
  error.value = ''
  if (!draft.value.stem.trim()) {
    error.value = '请填写题干'
    return
  }
  const options = draftToOptions()
  const answer_keys = draftToAnswerKeys()
  if (draft.value.qtype !== 'judgement' && options.length < 2) {
    error.value = '至少需要 2 个选项'
    return
  }
  busy.value = true
  const payload = {
    qtype: draft.value.qtype,
    stem: draft.value.stem.trim(),
    options,
    answer_keys,
    explanation: draft.value.explanation.trim(),
    external_id: draft.value.external_id.trim() || null,
    case_id: draft.value.case_id.trim() || null,
    case_material: draft.value.case_material.trim() || null,
  }
  if (editingId.value) {
    const { error: err } = await supabase.from('questions').update(payload).eq('id', editingId.value)
    if (err) error.value = err.message
  } else {
    const sort_order = questions.value.length
      ? Math.max(...questions.value.map((q) => q.sort_order)) + 1
      : 0
    const { error: err } = await supabase.from('questions').insert({
      bank_id: bankId.value,
      sort_order,
      is_active: true,
      ...payload,
    })
    if (err) error.value = err.message
  }
  busy.value = false
  if (!error.value) {
    showForm.value = false
    await load()
  }
}

async function toggleActive(q: Question) {
  const { error: err } = await supabase
    .from('questions')
    .update({ is_active: !q.is_active })
    .eq('id', q.id)
  if (err) error.value = err.message
  else await load()
}

async function moveQuestion(q: Question, dir: -1 | 1) {
  const idx = questions.value.findIndex((x) => x.id === q.id)
  const other = questions.value[idx + dir]
  if (!other) return
  busy.value = true
  await supabase.from('questions').update({ sort_order: other.sort_order }).eq('id', q.id)
  await supabase.from('questions').update({ sort_order: q.sort_order }).eq('id', other.id)
  busy.value = false
  await load()
}

function resetImportLint() {
  lintResult.value = null
  importStats.value = null
}

function switchImportMode(mode: ImportMode) {
  if (importMode.value === mode) return
  importMode.value = mode
  importFile.value = null
  jsonText.value = ''
  issueUnit.value = mode === 'csv' ? '行' : '题'
  resetImportLint()
}

async function onImportFile(e: Event) {
  resetImportLint()
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  importFile.value = f
  if (!f) return
  lintResult.value = await lintQuestionCsv(f)
  issueUnit.value = '行'
}

function lintJsonImport() {
  resetImportLint()
  if (!jsonText.value.trim()) return
  lintResult.value = lintQuestionJson(jsonText.value)
  issueUnit.value = '题'
}

async function copySampleJson() {
  try {
    await navigator.clipboard.writeText(QUESTION_JSON_SAMPLE)
    sampleCopied.value = true
    window.setTimeout(() => {
      sampleCopied.value = false
    }, 2000)
  } catch {
    error.value = '复制失败，请手动选中下方样例文本'
  }
}

function fillSampleJson() {
  jsonText.value = QUESTION_JSON_SAMPLE
  resetImportLint()
}

async function confirmImport() {
  if (importMode.value === 'json' && !lintResult.value?.valid) {
    lintJsonImport()
  }
  if (!lintResult.value?.valid) return
  importBusy.value = true
  error.value = ''
  try {
    const existing = new Map<string, string>()
    for (const q of questions.value) {
      if (q.external_id) existing.set(q.external_id, q.id)
    }
    const plan = planQuestionImport(lintResult.value.rows, existing)
    let sortBase = questions.value.length
      ? Math.max(...questions.value.map((q) => q.sort_order)) + 1
      : 0
    for (const row of plan.inserts) {
      const { error: err } = await supabase
        .from('questions')
        .insert(questionPayloadFromRow(row, bankId.value, sortBase++))
      if (err) throw err
    }
    for (const { row, questionId } of plan.updates) {
      const { error: err } = await supabase
        .from('questions')
        .update(questionPayloadFromRow(row, bankId.value, 0))
        .eq('id', questionId)
      if (err) throw err
    }
    importStats.value = toImportStats(plan)
    importFile.value = null
    jsonText.value = ''
    lintResult.value = null
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '导入失败'
  } finally {
    importBusy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <section class="flex flex-wrap items-end justify-between gap-3 py-4 md:py-6">
      <div>
        <p class="page-kicker">管理</p>
        <h1 class="page-title">{{ bank?.title ?? '题库题目' }}</h1>
        <p class="page-lede">新增、编辑、停用题目；批量导入前会逐题预检。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary" type="button" @click="router.push(`/banks/${bankId}/preview`)">
          学习者预览
        </button>
        <button class="btn-secondary" type="button" @click="router.push('/banks')">返回</button>
      </div>
    </section>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</p>
    <p v-else-if="error && !bank" class="alert-error">{{ error }}</p>

    <template v-else-if="bank">
      <p v-if="error" class="alert-error mb-4">{{ error }}</p>

      <div class="mb-4 flex flex-wrap gap-2">
        <button class="btn" type="button" @click="openCreate">新增题目</button>
      </div>

      <form v-if="showForm" class="surface mb-6 flex flex-col gap-3 md:p-6" @submit.prevent="saveQuestion">
        <h2 class="m-0 text-lg font-semibold text-ink">{{ editingId ? '编辑题目' : '新增题目' }}</h2>
        <div class="field">
          <label for="qtype">题型</label>
          <select id="qtype" v-model="draft.qtype" class="w-full">
            <option value="single">单选</option>
            <option value="multiple">多选</option>
            <option value="judgement">判断</option>
          </select>
        </div>
        <div class="field">
          <label for="stem">题干</label>
          <textarea id="stem" v-model="draft.stem" required rows="3" />
        </div>
        <template v-if="draft.qtype !== 'judgement'">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="field"><label>选项 A</label><input v-model="draft.optionA" /></div>
            <div class="field"><label>选项 B</label><input v-model="draft.optionB" /></div>
            <div class="field"><label>选项 C</label><input v-model="draft.optionC" /></div>
            <div class="field"><label>选项 D</label><input v-model="draft.optionD" /></div>
          </div>
        </template>
        <div class="field">
          <label for="answer">答案</label>
          <input
            id="answer"
            v-model="draft.answer"
            :placeholder="draft.qtype === 'judgement' ? 'TRUE 或 FALSE' : '如 B 或 A;C'"
          />
        </div>
        <div class="field">
          <label for="explanation">解析</label>
          <textarea id="explanation" v-model="draft.explanation" rows="2" />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="field"><label>external_id（可选）</label><input v-model="draft.external_id" /></div>
          <div class="field"><label>case_id（可选）</label><input v-model="draft.case_id" /></div>
        </div>
        <div class="field">
          <label>case_material（可选）</label>
          <textarea v-model="draft.case_material" rows="2" />
        </div>
        <div class="flex gap-2">
          <button class="btn" type="submit" :disabled="busy">{{ busy ? '保存中…' : '保存' }}</button>
          <button class="btn-secondary" type="button" @click="showForm = false">取消</button>
        </div>
      </form>

      <ul v-if="questions.length" class="m-0 flex list-none flex-col gap-2 p-0">
        <li
          v-for="(q, idx) in questions"
          :key="q.id"
          class="surface flex flex-col gap-2 px-3.5 py-3 md:px-4"
          :class="!q.is_active ? 'opacity-60' : ''"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="m-0 text-xs text-muted">
                #{{ idx + 1 }} · {{ questionTypeLabel(q.qtype) }}
                <span v-if="!q.is_active" class="text-bad"> · 已停用</span>
              </p>
              <p class="m-0 mt-1 line-clamp-2 text-sm font-medium text-ink">{{ q.stem }}</p>
            </div>
            <div class="flex shrink-0 flex-col gap-1">
              <button class="btn-ghost !min-h-8 !px-2 text-xs" type="button" :disabled="idx === 0" @click="moveQuestion(q, -1)">↑</button>
              <button
                class="btn-ghost !min-h-8 !px-2 text-xs"
                type="button"
                :disabled="idx === questions.length - 1"
                @click="moveQuestion(q, 1)"
              >↓</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary !min-h-9 text-sm" type="button" @click="openEdit(q)">编辑</button>
            <button class="btn-ghost !min-h-9 text-sm" type="button" @click="toggleActive(q)">
              {{ q.is_active ? '停用' : '启用' }}
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="surface py-10 text-center text-sm text-muted">还没有题目，可新增或导入题目。</p>

      <section class="surface mt-6 flex flex-col gap-4 md:p-6">
        <div>
          <h2 class="m-0 text-lg font-semibold text-ink">批量导入</h2>
          <p class="mt-1 text-sm text-muted">支持 CSV 文件或 JSON 粘贴，预检通过后确认导入。</p>
        </div>

        <div class="grid grid-cols-2 gap-2 rounded-xl border border-line bg-raise/40 p-1">
          <button
            class="rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="importMode === 'csv' ? 'bg-card text-ink shadow-soft' : 'text-muted hover:text-ink'"
            type="button"
            @click="switchImportMode('csv')"
          >
            CSV 文件
          </button>
          <button
            class="rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="importMode === 'json' ? 'bg-card text-ink shadow-soft' : 'text-muted hover:text-ink'"
            type="button"
            @click="switchImportMode('json')"
          >
            JSON 粘贴
          </button>
        </div>

        <template v-if="importMode === 'csv'">
          <label class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-raise/40 px-4 py-6 text-center">
            <input type="file" class="sr-only" accept=".csv,text/csv" @change="onImportFile" />
            <span class="text-sm text-muted">{{ importFile ? importFile.name : '选择 CSV 文件' }}</span>
          </label>
          <p class="m-0 text-sm text-muted">
            <a class="font-medium text-spark underline-offset-2 hover:underline" href="./samples/questions.template.csv" download>
              下载 CSV 模板
            </a>
          </p>
        </template>

        <template v-else>
          <textarea
            v-model="jsonText"
            class="min-h-40 font-mono text-sm"
            placeholder='粘贴题目 JSON 数组'
            spellcheck="false"
          />
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary !min-h-9 text-sm" type="button" @click="lintJsonImport">
              预检 JSON
            </button>
            <button class="btn-ghost !min-h-9 text-sm" type="button" @click="fillSampleJson">填入样例</button>
            <button class="btn-ghost !min-h-9 text-sm" type="button" @click="copySampleJson">
              {{ sampleCopied ? '已复制' : '复制样例' }}
            </button>
          </div>
          <details class="rounded-xl border border-line bg-raise/40 px-3.5 py-3 text-sm" open>
            <summary class="cursor-pointer font-medium text-ink">样例 JSON（可直接选中复制）</summary>
            <pre class="mt-3 max-h-64 overflow-auto rounded-lg border border-line bg-card p-3 font-mono text-xs leading-relaxed text-ink whitespace-pre-wrap break-words">{{ QUESTION_JSON_SAMPLE }}</pre>
          </details>
        </template>

        <ul v-if="lintResult && lintResult.issues.length" class="m-0 list-none space-y-1 rounded-xl border border-bad/30 bg-bad/5 p-3 text-sm">
          <li v-for="(issue, i) in lintResult.issues" :key="i" class="text-bad">
            <template v-if="issue.line > 0">第 {{ issue.line }} {{ issueUnit }}：{{ issue.message }}</template>
            <template v-else>{{ issue.message }}</template>
          </li>
        </ul>

        <p v-else-if="lintResult?.valid" class="alert-info m-0">
          预检通过，共 {{ lintResult.rows.length }} 题可导入。
        </p>

        <button
          v-if="lintResult?.valid"
          class="btn btn-block"
          type="button"
          :disabled="importBusy"
          @click="confirmImport"
        >
          {{ importBusy ? '导入中…' : '确认导入' }}
        </button>

        <div v-if="importStats" class="rounded-xl border border-line bg-raise/50 p-3 text-sm">
          <p class="m-0 font-medium text-ink">导入完成</p>
          <p class="m-0 mt-1 text-muted">
            新增 {{ importStats.created }} · 更新 {{ importStats.updated }} · 跳过 {{ importStats.skipped }} · 失败 {{ importStats.failed }}
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
