<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useKeyboardInset } from '../composables/useKeyboardInset'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    inputId?: string
    label?: string
    placeholder?: string
    /** 键盘收起时，为底部操作栏预留的高度（px） */
    actionBarHeight?: number
  }>(),
  {
    label: '你的作答',
    placeholder: '请输入答案（支持多行）',
    actionBarHeight: 56,
  },
)

const emit = defineEmits<{
  focus: []
  blur: []
}>()

const { insetBottom, keyboardOpen } = useKeyboardInset()
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const focused = ref(false)

const bottomOffset = computed(() => {
  if (keyboardOpen.value) return insetBottom.value
  return props.actionBarHeight
})

const cardStyle = computed(() => ({
  bottom: `calc(${bottomOffset.value}px + env(safe-area-inset-bottom, 0px))`,
}))

function resizeTextarea() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(Math.max(el.scrollHeight, 88), 220)}px`
}

function onFocus() {
  focused.value = true
  emit('focus')
  nextTick(resizeTextarea)
}

function onBlur() {
  focused.value = false
  emit('blur')
}

function dismissKeyboard() {
  textareaRef.value?.blur()
}

watch(model, () => nextTick(resizeTextarea))

defineExpose({ focus: () => textareaRef.value?.focus(), blur: dismissKeyboard })
</script>

<template>
  <Teleport to="body">
    <div
      class="floating-answer-input pointer-events-none fixed inset-x-0 z-40 px-3 transition-[bottom] duration-200 ease-out md:px-6"
      :style="cardStyle"
    >
      <div
        class="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-2xl border border-line/80 bg-surface/95 shadow-lift backdrop-blur-md md:max-w-3xl"
        :class="focused ? 'ring-2 ring-spark/25' : ''"
      >
        <div class="flex justify-center pt-2 pb-0.5" aria-hidden="true">
          <span class="h-1 w-9 rounded-full bg-line/80" />
        </div>

        <div class="flex flex-col gap-2 px-3.5 pb-3 pt-1">
          <label class="text-xs font-medium tracking-wide text-muted" :for="inputId">{{ label }}</label>

          <textarea
            :id="inputId"
            ref="textareaRef"
            v-model="model"
            class="min-h-[5.5rem] w-full resize-none rounded-xl border border-line/70 bg-raise/60 px-3 py-2.5 font-mono text-sm leading-relaxed text-ink placeholder:text-muted/70 focus:border-spark/70 focus:bg-raise focus:outline-none focus:ring-2 focus:ring-spark/20"
            :placeholder="placeholder"
            spellcheck="false"
            rows="3"
            enterkeyhint="done"
            @focus="onFocus"
            @blur="onBlur"
            @input="resizeTextarea"
          />

          <div class="flex items-center justify-between gap-2">
            <p class="m-0 text-xs text-muted">
              {{ model.trim() ? `${model.trim().length} 字` : '支持多行输入' }}
            </p>
            <button
              v-if="keyboardOpen"
              type="button"
              class="btn-secondary !min-h-9 !px-3 !py-1.5 text-sm"
              @mousedown.prevent
              @click="dismissKeyboard"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
