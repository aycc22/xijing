<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { formatErrorMessage } from '../lib/errors'

const auth = useAuth()
const router = useRouter()
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const busy = ref(false)

onMounted(async () => {
  await auth.init()
  if (!auth.user.value) {
    error.value = '重置链接无效或已过期，请重新申请。'
  }
})

async function submit() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = '密码至少 6 位'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  busy.value = true
  try {
    await auth.updatePassword(password.value)
    await router.replace('/banks')
  } catch (e) {
    error.value = formatErrorMessage(e, '更新密码失败')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <section class="py-4 md:py-6">
      <p class="page-kicker">账号</p>
      <h1 class="page-title">设置新密码</h1>
      <p class="page-lede">请输入新密码。完成后将回到题库。请妥善保管密码。</p>
    </section>

    <form class="surface flex flex-col gap-4 md:p-6" @submit.prevent="submit">
      <div class="field">
        <label for="new-password">新密码</label>
        <input
          id="new-password"
          v-model="password"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
        />
      </div>
      <div class="field">
        <label for="new-password-confirm">确认新密码</label>
        <input
          id="new-password-confirm"
          v-model="passwordConfirm"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
        />
      </div>
      <p v-if="error" class="alert-error">{{ error }}</p>
      <button class="btn btn-block" type="submit" :disabled="busy || !auth.user.value">
        {{ busy ? '保存中…' : '更新密码' }}
      </button>
      <button class="btn-ghost btn-block text-sm" type="button" @click="router.push('/login')">
        返回登录
      </button>
    </form>
  </div>
</template>
