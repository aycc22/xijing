<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { canChangeAdminRole, canFreezeUser } from '../lib/accountGuard'
import { formatErrorMessage } from '../lib/errors'
import { pageRange, totalPages } from '../lib/pagination'
import { supabase } from '../lib/supabase'
import type { AccountStatus, AppRole, Profile } from '../lib/types'

interface AuditRow {
  id: string
  actor_id: string | null
  action: string
  target_type: string
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

const users = ref<Profile[]>([])
const userTotal = ref(0)
const userPage = ref(1)
const audits = ref<AuditRow[]>([])
const adminRoster = ref<{ id: string; role: string; status?: string | null }[]>([])
const error = ref('')
const savingId = ref<string | null>(null)
const USER_PAGE = 20

const pages = computed(() => totalPages(userTotal.value, USER_PAGE))

async function loadUsers() {
  const { from, to, page } = pageRange(userPage.value, USER_PAGE)
  userPage.value = page
  const { data, error: err, count } = await supabase
    .from('profiles')
    .select('id, display_name, role, status, avatar_url, created_at', { count: 'exact' })
    .order('created_at', { ascending: true })
    .range(from, to)
  if (err) throw err
  users.value = (data ?? []).map((row) => ({
    ...row,
    status: (row.status as AccountStatus) || 'active',
    avatar_url: row.avatar_url ?? null,
  })) as Profile[]
  userTotal.value = count ?? 0
}

async function loadAdmins() {
  const { data, error: err } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('role', 'admin')
  if (err) throw err
  adminRoster.value = data ?? []
}

async function loadAudits() {
  const { data, error: err } = await supabase
    .from('audit_logs')
    .select('id, actor_id, action, target_type, target_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
  if (err) throw err
  audits.value = (data ?? []) as AuditRow[]
}

async function load() {
  error.value = ''
  try {
    await Promise.all([loadUsers(), loadAudits(), loadAdmins()])
  } catch (err) {
    error.value = formatErrorMessage(err, '加载失败')
  }
}

async function setRole(user: Profile, role: AppRole) {
  if (!canChangeAdminRole(adminRoster.value, user.id, role)) {
    error.value = '不能撤销平台最后一名有效管理员'
    return
  }
  savingId.value = user.id
  error.value = ''
  const { error: err } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  savingId.value = null
  if (err) error.value = formatErrorMessage(err, '更新角色失败')
  else await load()
}

async function toggleFreeze(user: Profile) {
  const next: AccountStatus = user.status === 'frozen' ? 'active' : 'frozen'
  if (next === 'frozen' && !canFreezeUser(adminRoster.value, user.id)) {
    error.value = '不能冻结平台最后一名有效管理员'
    return
  }
  savingId.value = user.id
  error.value = ''
  const { error: err } = await supabase
    .from('profiles')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  savingId.value = null
  if (err) error.value = formatErrorMessage(err, '更新账号状态失败')
  else await load()
}

const roleLabel: Record<AppRole, string> = {
  learner: '学员',
  uploader: '上传者',
  admin: '管理员',
}

const actionLabel: Record<string, string> = {
  role_change: '角色变更',
  status_change: '账号状态',
  bank_publish: '发布题库',
  bank_unpublish: '下架题库',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(load)
</script>

<template>
  <div>
    <section class="py-4 md:py-6">
      <p class="page-kicker">管理</p>
      <h1 class="page-title">权限</h1>
      <p class="page-lede">
        把学员升为上传者后，对方才能导入题库。管理员可冻结账号，并查看关键操作审计。
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
            <div class="flex gap-2">
              <span class="chip-lit">{{ roleLabel[u.role] }}</span>
              <span class="chip" :class="u.status === 'frozen' ? 'border-bad/40 bg-bad/10 text-bad' : ''">
                {{ u.status === 'frozen' ? '已冻结' : '正常' }}
              </span>
            </div>
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
              :disabled="savingId === u.id || u.role === 'learner' || !canChangeAdminRole(adminRoster, u.id, 'learner')"
              @click="setRole(u, 'learner')"
            >
              学员
            </button>
            <button
              type="button"
              class="seg-btn text-xs sm:text-sm"
              :class="u.role === 'uploader' ? 'seg-btn-on' : ''"
              :disabled="savingId === u.id || u.role === 'uploader' || !canChangeAdminRole(adminRoster, u.id, 'uploader')"
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
          <button
            class="btn-ghost mt-3 text-sm"
            type="button"
            :disabled="savingId === u.id || (u.status !== 'frozen' && !canFreezeUser(adminRoster, u.id))"
            @click="toggleFreeze(u)"
          >
            {{ u.status === 'frozen' ? '解除冻结' : '冻结账号' }}
          </button>
        </article>
      </li>
    </ul>

    <div v-if="pages > 1" class="mt-4 flex items-center justify-center gap-3">
      <button
        class="btn-secondary"
        type="button"
        :disabled="userPage <= 1"
        @click="userPage -= 1; loadUsers()"
      >
        上一页
      </button>
      <span class="text-sm text-muted tabular-nums">{{ userPage }} / {{ pages }}</span>
      <button
        class="btn-secondary"
        type="button"
        :disabled="userPage >= pages"
        @click="userPage += 1; loadUsers()"
      >
        下一页
      </button>
    </div>

    <section class="mt-8">
      <h2 class="m-0 text-lg font-semibold text-ink">最近审计</h2>
      <p class="mt-1 text-sm text-muted">角色变更、冻结、题库发布与下架会记录在这里。</p>
      <div v-if="!audits.length" class="surface mt-3 py-8 text-center text-sm text-muted">暂无审计记录</div>
      <ul v-else class="mt-3 m-0 flex list-none flex-col gap-2 p-0">
        <li v-for="row in audits" :key="row.id" class="surface px-4 py-3">
          <p class="m-0 text-sm font-medium text-ink">
            {{ actionLabel[row.action] || row.action }}
            <span class="ml-2 text-xs font-normal text-muted">{{ row.target_type }}</span>
          </p>
          <p class="m-0 mt-1 text-xs text-muted">
            {{ fmtDate(row.created_at) }}
            <span v-if="row.metadata && Object.keys(row.metadata).length">
              · {{ JSON.stringify(row.metadata) }}
            </span>
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>
