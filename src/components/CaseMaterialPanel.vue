<script setup lang="ts">
import { computed } from 'vue'
import {
  normalizeAttachments,
  stripAttachmentPlaceholders,
  toAbsoluteAssetUrl,
  type CaseAttachment,
} from '../lib/attachments'

const props = defineProps<{
  material?: string | null
  attachments?: unknown[] | null
  assetsBase?: string
}>()

const text = computed(() => stripAttachmentPlaceholders(props.material))
const images = computed(() => normalizeAttachments(props.attachments, props.assetsBase))

function imageAttachments(items: CaseAttachment[]) {
  return items.filter((item) => item.type === 'image' && item.url)
}

function imageSrc(item: CaseAttachment): string {
  return toAbsoluteAssetUrl(item.url ?? '')
}

function onImgError(event: Event, item: CaseAttachment) {
  const img = event.target as HTMLImageElement
  if (img.dataset.fallback === '1') return
  img.dataset.fallback = '1'

  const src = img.src
  if (src.endsWith('.svg')) {
    img.src = src.replace(/\.svg(?=($|\?))/, '.png')
    return
  }

  const raw = item.url?.trim()
  if (raw && src !== toAbsoluteAssetUrl(raw)) {
    img.src = toAbsoluteAssetUrl(raw)
  }
}
</script>

<template>
  <section
    v-if="text || imageAttachments(images).length"
    class="rounded-xl border border-line bg-raise/60 px-3.5 py-3 text-sm leading-relaxed"
  >
    <p class="m-0 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">案例材料</p>
    <p v-if="text" class="m-0 whitespace-pre-wrap">{{ text }}</p>
    <div v-if="imageAttachments(images).length" class="mt-3 flex flex-col gap-3">
      <figure
        v-for="(item, idx) in imageAttachments(images)"
        :key="item.id ?? item.url ?? idx"
        class="m-0 overflow-hidden rounded-lg border border-line/80 bg-card"
      >
        <img
          :src="imageSrc(item)"
          :alt="item.description || item.id || '案例配图'"
          class="block h-auto w-full max-w-full"
          loading="eager"
          decoding="async"
          @error="onImgError($event, item)"
        />
        <figcaption v-if="item.description" class="border-t border-line/60 px-3 py-2 text-xs text-muted">
          <span v-if="item.id" class="mr-1 font-medium text-ink">{{ item.id }}</span>
          {{ item.description }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>
