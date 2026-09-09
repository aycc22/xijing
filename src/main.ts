import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import router from './router'
import { initAppRefresh } from './lib/appRefresh'
import { authRedirectPath, hashLooksLikeSupabaseAuth } from './lib/authRecovery'
import { supabase } from './lib/supabase'

initAppRefresh(registerSW({ immediate: true }))

async function bootstrap() {
  const search = window.location.search
  const hash = window.location.hash
  const recoveryPath = authRedirectPath(search, hash)
  if (hashLooksLikeSupabaseAuth(hash) || new URLSearchParams(search).has('code')) {
    await supabase.auth.getSession()
    const base = import.meta.env.BASE_URL || '/'
    window.history.replaceState({}, '', `${window.location.origin}${base}`)
  }

  const app = createApp(App)
  app.use(router)
  app.mount('#app')

  if (recoveryPath) {
    await router.replace(recoveryPath)
  }
}

void bootstrap()
