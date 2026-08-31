import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guest: true } },
    { path: '/banks', name: 'banks', component: () => import('../views/BanksView.vue'), meta: { auth: true } },
    { path: '/wrong-book', name: 'wrong-book', component: () => import('../views/WrongBookView.vue'), meta: { auth: true } },
    { path: '/history', name: 'history', component: () => import('../views/HistoryView.vue'), meta: { auth: true } },
    {
      path: '/banks/:bankId/manage',
      name: 'bank-manage',
      component: () => import('../views/BankManageView.vue'),
      meta: { auth: true, upload: true },
    },
    {
      path: '/banks/:bankId/preview',
      name: 'bank-preview',
      component: () => import('../views/BankPreviewView.vue'),
      meta: { auth: true, upload: true },
    },
    { path: '/upload', name: 'upload', component: () => import('../views/UploadView.vue'), meta: { auth: true, upload: true } },
    {
      path: '/banks/:bankId/paper',
      name: 'paper-compose',
      component: () => import('../views/PaperComposeView.vue'),
      meta: { auth: true },
    },
    {
      path: '/papers/:paperId',
      name: 'paper-detail',
      component: () => import('../views/PaperDetailView.vue'),
      meta: { auth: true },
    },
    { path: '/quiz/:bankId', name: 'quiz', component: () => import('../views/QuizView.vue'), meta: { auth: true } },
    { path: '/result/:sessionId', name: 'result', component: () => import('../views/ResultView.vue'), meta: { auth: true } },
    { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue'), meta: { auth: true, admin: true } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  await auth.init()
  if (auth.loading.value) return true

  if (to.meta.auth && !auth.user.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && auth.user.value) {
    return { name: 'banks' }
  }
  if (to.meta.upload && !auth.hasUpload.value) {
    return { name: 'banks', query: { need: 'upload' } }
  }
  if (to.meta.admin && !auth.admin.value) {
    return { name: 'banks' }
  }
  return true
})

export default router
