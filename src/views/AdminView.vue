<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { AppRole, Profile } from '../lib/types'

const users = ref<Profile[]>([])
const error = ref('')
const savingId = ref<string | null>(null)

async function load() {
  error.value = ''
  const { data, error: err } = await supabase
    .from('profiles')
    .select('id, display_name, role, created_at')
    .order('created_at', { ascending: true })
  if (err) error.value = err.message
  else users.value = (data ?? []) as Profile[]
}

async function setRole(user: Profile, role: AppRole) {
  savingId.value = user.id
  error.value = ''
  const { error: err } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  savingId.value = null
  if (err) error.value = err.message
  else await load()
}

const roleLabel: Record<AppRole, string> = {
  learner: '学员',
  uploader: '上传者',
  admin: '管理员',
}

onMounted(load)
</script>

<template>
  <div>
    <section class="py-4 md:py-6">
      <p class="page-kicker">管理</p>
      <h1 class="page-title">权限</h1>
      <p class="page-lede">
        把学员升为上传者后，对方才能导入题库。管理员可管理全部用户。
      </p>
    </section>

    <p v-if="error" class="alert-error mb-4">{{ error }}</p>

    <ul class="m-0 flex list-none flex-col gap-3 p-0">
      <li v-for="u in users" :key="u.id">
        <article class="surface">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="m-0 font-semibold text-ink">{{ u.display_name || '未命名用户' }}</h2>
              <p class="mt-1 font-mono text-xs text-muted tabular-nums">{{ u.id.slice(0, 8) }}…</p>
            </div>
            <span class="chip-lit">{{ roleLabel[u.role] }}</span>
          </div>

          <div
            class="seg mt-4"
            role="group"
            :aria-label="`设置 ${u.display_name || '用户'} 角色`"
          >
            <button
              type="button"
              class="seg-btn text-xs sm:text-sm"
              :class="u.role === 'learner' ? 'seg-btn-on' : ''"
              :disabled="savingId === u.id || u.role === 'learner'"
              @click="setRole(u, 'learner')"
            >
              学员
            </button>
            <button
              type="button"
              class="seg-btn text-xs sm:text-sm"
              :class="u.role === 'uploader' ? 'seg-btn-on' : ''"
              :disabled="savingId === u.id || u.role === 'uploader'"
              @click="setRole(u, 'uploader')"
            >
              上传者
            </button>
            <button
              type="button"
              class="seg-btn text-xs sm:text-sm"
              :class="u.role === 'admin' ? 'seg-btn-gold' : ''"
              :disabled="savingId === u.id || u.role === 'admin'"
              @click="setRole(u, 'admin')"
            >
              管理员
            </button>
          </div>
        </article>
      </li>
    </ul>
  </div>
</template>
