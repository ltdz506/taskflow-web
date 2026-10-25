<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    eyebrow?: string
    title?: string
    description?: string
    width?: number
  }>(),
  { eyebrow: '', title: '', description: '', width: 644 },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close(): void {
  emit('update:modelValue', false)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-mask" @mousedown.self="close">
        <section
          class="modal-card"
          :style="{ width: `${width}px` }"
          role="dialog"
          aria-modal="true"
        >
          <header class="modal-head">
            <div class="modal-heading">
              <p v-if="eyebrow" class="modal-eyebrow">{{ eyebrow }}</p>
              <h2 v-if="title" class="modal-title">{{ title }}</h2>
              <p v-if="description" class="modal-desc">{{ description }}</p>
            </div>
            <button type="button" class="modal-close" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="modal-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(7, 16, 27, 0.56);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.modal-card {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: calc(100vh - 48px);
  padding: 34px 40px 32px;
  border-radius: 30px;
  background: rgba(17, 25, 35, 0.88);
  border: 1px solid rgba(230, 241, 255, 0.14);
  backdrop-filter: blur(34px);
  -webkit-backdrop-filter: blur(34px);
  box-shadow:
    0 34px 90px rgba(0, 0, 0, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex: none;
}

.modal-eyebrow {
  font-family: 'Inter', var(--font-sans), sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1.4px;
  color: #7295c7;
  text-transform: uppercase;
}

.modal-title {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 38px;
  color: #f4f7fb;
}

.modal-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 20px;
  color: #818c9c;
}

.modal-close {
  flex: none;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 22px;
  line-height: 28px;
  color: #aab4c1;
  transition: background 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 22px;
}

.modal-footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s ease;
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition:
    transform 0.24s cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 0.24s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  opacity: 0;
  transform: translateY(12px) scale(0.985);
}
</style>
