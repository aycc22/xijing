<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseQuestionCsv } from '../lib/csv'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const router = useRouter()

const title = ref('')
const description = ref('')
const publishNow = ref(true)
const file = ref<File | null>(null)
const previewCount = ref(0)
const error = ref('')
const busy = ref(false)

async function onFileChange(e: Event) {
  error.value = ''
  previewCount.value = 0
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  file.value = f
  if (!f) return
  try {
    const rows = await parseQuestionCsv(f)
    previewCount.value = rows.length
    if (!title.value) title.value = f.name.replace(/\.csv$/i, '')
  } catch (err) {
    file.value = null
    error.value = err instanceof Error ? err.message : 'CSV 无效'
  }
}

async function submit() {
  error.value = ''
  if (!auth.user.value) {
    error.value = '请先登录'
    return
  }
  if (!file.value) {
    error.value = '请选择 CSV 文件'
    return
  }
  busy.value = true
  try {
    const rows = await parseQuestionCsv(file.value)
    const { data: bank, error: bankErr } = await supabase
      .from('question_banks')
      .insert({
        title: title.value.trim() || '未命名题库',
        description: description.value.trim(),
        owner_id: auth.user.value.id,
        is_published: publishNow.value,
      })
      .select('*')
      .single()
    if (bankErr) throw bankErr

    const payload = rows.map((row, i) => ({
      bank_id: bank.id,
      qtype: row.qtype,
      stem: row.stem,
      options: row.options,
      answer_keys: row.answer_keys,
      explanation: row.explanation,
      sort_order: i,
    }))

    const { error: qErr } = await supabase.from('questions').insert(payload)
    if (qErr) {
      await supabase.from('question_banks').delete().eq('id', bank.id)
      throw qErr
    }

    await router.push('/banks')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '上传失败'
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
        CSV 列：type, stem, option_a…option_f, answer, explanation。多选答案用分号，如 A;C。
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
          <span v-if="previewCount" class="chip-lit">已解析 {{ previewCount }} 题</span>
        </label>
      </div>

      <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-raise/50 px-3.5 py-3 text-sm text-muted transition hover:border-spark/40">
        <input
          v-model="publishNow"
          class="mt-0.5 size-4 accent-spark"
          type="checkbox"
        />
        <span>
          <span class="block font-medium text-ink">上传后立即发布</span>
          其他人登录后就能看到并刷这套题。
        </span>
      </label>

      <p class="m-0 text-sm text-muted">
        <a class="font-medium text-spark underline-offset-2 hover:underline" href="./samples/questions.sample.csv" download>
          下载样例 CSV
        </a>
      </p>

      <p v-if="error" class="alert-error">{{ error }}</p>
      <button class="btn btn-block" type="submit" :disabled="busy">
        {{ busy ? '导入中…' : '导入题库' }}
      </button>
    </form>
  </div>
</template>
