<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- 签名元素：夜色里一盏提灯走出的路 -->
    <svg
      class="pointer-events-none absolute -right-10 top-4 h-44 w-64 opacity-90 md:-right-4 md:top-8 md:h-56 md:w-80"
      viewBox="0 0 220 160"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-trail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="var(--spark-deep)" stop-opacity="0" />
          <stop offset="0.55" stop-color="var(--spark-deep)" stop-opacity="0.6" />
          <stop offset="1" stop-color="var(--spark)" />
        </linearGradient>
      </defs>
      <path
        d="M12 128 C 48 40, 90 148, 128 72 C 152 28, 176 48, 204 38"
        stroke="url(#hero-trail)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-dasharray="260"
        style="--dash-len: 260; animation: path-draw 1.6s 0.2s ease-out both"
      />
      <circle
        cx="204"
        cy="38"
        r="4"
        fill="var(--spark-bright)"
        style="animation: soft-pulse 2.8s ease-in-out infinite; filter: drop-shadow(0 0 6px var(--lantern-halo))"
      />
    </svg>

    <section class="relative flex min-h-[66dvh] flex-col justify-center py-10 md:min-h-[58dvh] md:py-14">
      <p class="page-kicker">移动端刷题</p>
      <h1 class="font-display m-0 text-[clamp(3rem,16vw,5rem)] leading-none tracking-wide text-ink">
        习径
      </h1>
      <p class="page-lede mt-5 max-w-md">
        把题库装进手机。一题一答，灯火所至，即是路径。
      </p>

      <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <RouterLink v-if="auth.user.value" class="btn btn-block sm:w-auto" to="/banks">
          进入题库
        </RouterLink>
        <RouterLink v-else class="btn btn-block sm:w-auto" to="/login">
          登录开始
        </RouterLink>
        <a class="btn-secondary btn-block sm:w-auto" href="./samples/questions.sample.csv" download>
          下载 CSV 样例
        </a>
      </div>
    </section>

    <section class="border-t border-line/60 py-9 md:py-12">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="font-display m-0 text-xl text-ink">三步入径</h2>
        <p class="m-0 text-sm text-muted">登录即可刷题，上传由管理员开通</p>
      </div>

      <ol class="m-0 mt-2 list-none p-0">
        <li class="flex gap-4 border-t border-line/60 py-5">
          <span class="font-display w-9 shrink-0 pt-0.5 text-2xl leading-none text-spark/70">一</span>
          <div>
            <p class="m-0 font-semibold text-ink">登录账号</p>
            <p class="mt-1 text-sm leading-relaxed text-muted">新用户默认是学员，可浏览并刷所有已发布题库。</p>
          </div>
        </li>
        <li class="flex gap-4 border-t border-line/60 py-5">
          <span class="font-display w-9 shrink-0 pt-0.5 text-2xl leading-none text-spark/70">二</span>
          <div>
            <p class="m-0 font-semibold text-ink">挑一套题</p>
            <p class="mt-1 text-sm leading-relaxed text-muted">已发布题库对所有人可见，未发布仅自己可见。</p>
          </div>
        </li>
        <li class="flex gap-4 border-t border-line/60 py-5">
          <span class="font-display w-9 shrink-0 pt-0.5 text-2xl leading-none text-spark/70">三</span>
          <div>
            <p class="m-0 font-semibold text-ink">逐题推进</p>
            <p class="mt-1 text-sm leading-relaxed text-muted">单选 / 多选即时反馈并展示解析，结束看正确率。</p>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>
