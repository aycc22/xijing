<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { lintQuestionCsv, type CsvLintResult } from '../lib/csv'
import { lintExamPaperJson, type ExamPaperLintResult } from '../lib/examPaperJson'
import { examBankDescription, examBankTitle, examMetaPayload } from '../lib/examPaperImport'
import { lintQuestionJson } from '../lib/questionJson'
import { QUESTION_JSON_SAMPLE } from '../lib/questionJsonSample'
import { questionPayloadFromRow, toImportStats, type ImportStats } from '../lib/importPlan'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

type ImportMode = 'csv' | 'json' | 'exam'

const auth = useAuth()
const router = useRouter()

const importMode = ref<ImportMode>('csv')
const title = ref('')
const description = ref('')
const publishNow = ref(true)
const file = ref<File | null>(null)
const jsonText = ref('')
const lintResult = ref<CsvLintResult | null>(null)
const examLint = ref<ExamPaperLintResult | null>(null)
const issueUnit = ref<'行' | '题'>('行')
const importStats = ref<ImportStats | null>(null)
const error = ref('')
const busy = ref(false)
const confirmed = ref(false)
const sampleCopied = ref(false)

function resetLint() {
  lintResult.value = null
  examLint.value = null
  importStats.value = null
  confirmed.value = false
  error.value = ''
}

function switchMode(mode: ImportMode) {
  if (importMode.value === mode) return
  importMode.value = mode
  file.value = null
  jsonText.value = ''
  issueUnit.value = mode === 'csv' ? '行' : '题'
  resetLint()
}

async function onFileChange(e: Event) {
  resetLint()
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  file.value = f
  if (!f) return
  try {
    if (importMode.value === 'exam') {
      const text = await f.text()
      jsonText.value = text
      lintExam()
      if (!title.value) title.value = f.name.replace(/\.json$/i, '')
      return
    }
    lintResult.value = await lintQuestionCsv(f)
    issueUnit.value = '行'
    if (!title.value) title.value = f.name.replace(/\.csv$/i, '')
    if (!lintResult.value.valid) error.value = `预检发现 ${lintResult.value.issues.length} 处错误`
  } catch (err) {
    file.value = null
    error.value = err instanceof Error ? err.message : '文件无效'
  }
}

function lintJson() {
  resetLint()
  if (!jsonText.value.trim()) {
    error.value = '请粘贴 JSON 文本'
    return
  }
  const result = lintQuestionJson(jsonText.value)
  lintResult.value = result
  issueUnit.value = '题'
  if (result.meta?.title && !title.value) title.value = result.meta.title
  if (result.meta?.description && !description.value) description.value = result.meta.description
  if (!result.valid) error.value = `预检发现 ${result.issues.length} 处错误`
}

function lintExam() {
  resetLint()
  if (!jsonText.value.trim()) {
    error.value = '请粘贴或选择试卷 JSON'
    return
  }
  const result = lintExamPaperJson(jsonText.value)
  examLint.value = result
  issueUnit.value = '题'
  if (result.bundle) {
    if (!title.value) title.value = examBankTitle(result.bundle)
    if (!description.value) description.value = examBankDescription(result.bundle)
  }
  if (!result.valid) error.value = `预检发现 ${result.issues.length} 处错误`
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
  resetLint()
}

const examPreviewValid = () => examLint.value?.valid
const questionPreviewValid = () => lintResult.value?.valid

async function ensureLinted() {
  if (importMode.value === 'csv') return lintResult.value?.valid
  if (importMode.value === 'exam') {
    if (examLint.value?.valid) return true
    lintExam()
    return examLint.value?.valid
  }
  if (lintResult.value?.valid) return true
  lintJson()
  return lintResult.value?.valid
}

async function submit() {
  error.value = ''
  if (!auth.user.value) {
    error.value = '请先登录'
    return
  }
  const ready = await ensureLinted()
  if (!ready) {
    error.value =
      importMode.value === 'csv'
        ? '请先选择通过预检的 CSV 文件'
        : importMode.value === 'exam'
          ? '请先粘贴并通过预检的试卷 JSON'
          : '请先粘贴并通过预检的 JSON'
    return
  }
  if (!confirmed.value) {
    confirmed.value = true
    return
  }
  busy.value = true
  try {
    const isExam = importMode.value === 'exam'
    const rows = isExam ? (examLint.value?.rows ?? []) : (lintResult.value?.rows ?? [])
    const bundle = examLint.value?.bundle

    const { data: bank, error: bankErr } = await supabase
      .from('question_banks')
      .insert({
        title: title.value.trim() || (isExam && bundle ? examBankTitle(bundle) : '未命名题库'),
        description:
          description.value.trim() ||
          (isExam && bundle ? examBankDescription(bundle) : ''),
        owner_id: auth.user.value.id,
        is_published: publishNow.value,
        bank_kind: isExam ? 'exam' : 'pool',
        exam_meta: isExam && bundle ? examMetaPayload(bundle) : null,
      })
      .select('*')
      .single()
    if (bankErr) throw bankErr

    for (let i = 0; i < rows.length; i++) {
      const { error: qErr } = await supabase
        .from('questions')
        .insert(questionPayloadFromRow(rows[i], bank.id, i))
      if (qErr) {
        await supabase.from('question_banks').delete().eq('id', bank.id)
        throw qErr
      }
    }

    importStats.value = toImportStats({ inserts: rows, updates: [] })
    await router.push(isExam ? `/banks/${bank.id}/exam` : '/banks')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '上传失败'
    confirmed.value = false
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <section class="py-4 md:py-6">
      <p class="page-kicker">导入</p>
      <h1 class="page-title">上传题库</h1>
      <p class="page-lede">
        支持 CSV、题库 JSON 或完整试卷 JSON（xijing-exam-paper）；导入前预检，通过后确认导入。
      </p>
    </section>

    <form class="surface flex flex-col gap-4 md:p-6" @submit.prevent="submit">
      <div class="field">
        <label for="title">题库标题</label>
        <input id="title" v-model="title" required maxlength="80" />
      </div>
      <div class="field">
        <label for="desc">简介</label>
        <textarea id="desc" v-model="description" maxlength="500" placeholder="这套题适合谁、考什么" />
      </div>

      <div class="field">
        <span class="field-caption">导入方式</span>
        <div class="grid grid-cols-3 gap-2 rounded-xl border border-line bg-raise/40 p-1">
          <button
            class="rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="importMode === 'csv' ? 'bg-card text-ink shadow-soft' : 'text-muted hover:text-ink'"
            type="button"
            @click="switchMode('csv')"
          >
            CSV
          </button>
          <button
            class="rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="importMode === 'json' ? 'bg-card text-ink shadow-soft' : 'text-muted hover:text-ink'"
            type="button"
            @click="switchMode('json')"
          >
            题库 JSON
          </button>
          <button
            class="rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="importMode === 'exam' ? 'bg-card text-ink shadow-soft' : 'text-muted hover:text-ink'"
            type="button"
            @click="switchMode('exam')"
          >
            试卷 JSON
          </button>
        </div>
      </div>

      <div v-if="importMode === 'csv'" class="field">
        <span class="field-caption">CSV 文件</span>
        <label
          class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-raise/40 px-4 py-8 text-center transition hover:border-spark/50 hover:bg-raise/70"
        >
          <input type="file" class="sr-only" accept=".csv,text/csv" @change="onFileChange" />
          <svg class="size-6 text-spark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 16V5m0 0 4 4M12 5 8 9M5 19h14"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span v-if="file" class="text-sm font-medium text-ink">{{ file.name }}</span>
          <span v-else class="text-sm text-muted">点击选择 CSV 文件</span>
          <span v-if="lintResult?.valid" class="chip-lit">预检通过 {{ lintResult.rows.length }} 题</span>
        </label>
      </div>

      <div v-else-if="importMode === 'exam'" class="field">
        <span class="field-caption">试卷 JSON（xijing-exam-paper）</span>
        <label
          class="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-raise/40 px-4 py-6 text-center transition hover:border-spark/50 hover:bg-raise/70"
        >
          <input type="file" class="sr-only" accept=".json,application/json" @change="onFileChange" />
          <span v-if="file" class="text-sm font-medium text-ink">{{ file.name }}</span>
          <span v-else class="text-sm text-muted">点击选择试卷 JSON 文件</span>
        </label>
        <textarea
          v-model="jsonText"
          class="min-h-48 font-mono text-sm"
          placeholder='粘贴 xijing-exam-paper 格式 JSON，例如 public/data/exams/2022-isec-engineer.json'
          spellcheck="false"
        />
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button class="btn-secondary !min-h-9 text-sm" type="button" @click="lintExam">预检试卷</button>
          <span v-if="examPreviewValid()" class="chip-lit">
            预检通过 {{ examLint?.stats?.total }} 题（上午 {{ examLint?.stats?.morning }} · 下午
            {{ examLint?.stats?.afternoon }}）
          </span>
        </div>
        <p class="m-0 mt-2 text-xs text-muted">
          样例文件：
          <a class="text-spark underline-offset-2 hover:underline" href="./data/exams/2022-isec-engineer.json" download>
            2022-isec-engineer.json
          </a>
        </p>
      </div>

      <div v-else class="field">
        <span class="field-caption">JSON 文本</span>
        <textarea
          v-model="jsonText"
          class="min-h-48 font-mono text-sm"
          placeholder='粘贴题目 JSON 数组，例如 [{ "type": "single", "stem": "...", "options": { "A": "...", "B": "..." }, "answer": "B" }]'
          spellcheck="false"
        />
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button class="btn-secondary !min-h-9 text-sm" type="button" @click="lintJson">预检 JSON</button>
          <button class="btn-ghost !min-h-9 text-sm" type="button" @click="fillSampleJson">填入样例</button>
          <button class="btn-ghost !min-h-9 text-sm" type="button" @click="copySampleJson">
            {{ sampleCopied ? '已复制' : '复制样例' }}
          </button>
          <span v-if="lintResult?.valid" class="chip-lit">预检通过 {{ lintResult.rows.length }} 题</span>
        </div>
        <details class="rounded-xl border border-line bg-raise/40 px-3.5 py-3 text-sm" open>
          <summary class="cursor-pointer font-medium text-ink">样例 JSON（可直接选中复制）</summary>
          <pre class="mt-3 max-h-64 overflow-auto rounded-lg border border-line bg-card p-3 font-mono text-xs leading-relaxed text-ink whitespace-pre-wrap break-words">{{ QUESTION_JSON_SAMPLE }}</pre>
        </details>
      </div>

      <ul
        v-if="(importMode === 'exam' ? examLint : lintResult) && (importMode === 'exam' ? examLint!.issues : lintResult!.issues).length"
        class="m-0 max-h-48 list-none space-y-1 overflow-y-auto rounded-xl border border-bad/30 bg-bad/5 p-3 text-sm"
      >
        <li
          v-for="(issue, i) in importMode === 'exam' ? examLint!.issues : lintResult!.issues"
          :key="i"
          class="text-bad"
        >
          <template v-if="issue.line > 0">第 {{ issue.line }} {{ issueUnit }}：{{ issue.message }}</template>
          <template v-else>{{ issue.message }}</template>
        </li>
      </ul>

      <details class="rounded-xl border border-line bg-raise/40 px-3.5 py-3 text-sm text-muted">
        <summary class="cursor-pointer font-medium text-ink">字段说明</summary>
        <template v-if="importMode === 'csv'">
          <ul class="mt-2 space-y-1 pl-4">
            <li>type：single / multiple / judgement</li>
            <li>stem、option_a…f、answer、explanation</li>
            <li>case_id、case_material（案例小题）</li>
            <li>external_id（可选，用于重复导入更新）</li>
          </ul>
        </template>
        <template v-else-if="importMode === 'exam'">
          <ul class="mt-2 space-y-1 pl-4">
            <li>format: xijing-exam-paper，含 exam 与 papers</li>
            <li>上午 choice 支持 single / cloze；下午 case 支持 short_answer</li>
            <li>导入后生成真题题库，可固定组卷模考</li>
          </ul>
        </template>
        <template v-else>
          <ul class="mt-2 space-y-1 pl-4">
            <li>根节点：题目数组，或 <code class="text-ink">{ "questions": [...] }</code></li>
            <li>type、stem、answer 必填；options 支持对象、字符串数组或 key/text 数组</li>
            <li>判断题可省略 options；案例题填写 case_id、case_material</li>
            <li>external_id（可选，用于重复导入更新）</li>
          </ul>
        </template>
      </details>

      <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-raise/50 px-3.5 py-3 text-sm text-muted transition hover:border-spark/40">
        <input v-model="publishNow" class="mt-0.5 size-4 accent-spark" type="checkbox" />
        <span>
          <span class="block font-medium text-ink">上传后立即发布</span>
          其他人登录后就能看到并刷这套题。
        </span>
      </label>

      <p v-if="importMode === 'csv'" class="m-0 text-sm text-muted">
        <a class="mr-3 font-medium text-spark underline-offset-2 hover:underline" href="./samples/questions.template.csv" download>
          下载 CSV 模板
        </a>
        <a class="font-medium text-spark underline-offset-2 hover:underline" href="./samples/questions.sample.csv" download>
          样例 CSV
        </a>
      </p>

      <p v-if="confirmed && (importMode === 'exam' ? examPreviewValid() : questionPreviewValid())" class="alert-warn m-0">
        即将导入
        {{ importMode === 'exam' ? examLint?.stats?.total : lintResult?.rows.length }}
        题到{{ importMode === 'exam' ? '真题试卷' : '新题库' }}，请再次点击确认。
      </p>

      <p v-if="error" class="alert-error">{{ error }}</p>
      <button
        class="btn btn-block"
        type="submit"
        :disabled="
          busy ||
          (importMode === 'csv'
            ? !questionPreviewValid()
            : importMode === 'exam'
              ? !jsonText.trim()
              : !jsonText.trim())
        "
      >
        {{
          busy
            ? '导入中…'
            : confirmed
              ? '确认导入'
              : '预检通过，继续'
        }}
      </button>
    </form>
  </div>
</template>
