import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue(), tailwindcss()],
    base: env.VITE_BASE || '/',
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
