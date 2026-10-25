<script setup lang="ts">
import { useToast, type ToastTone } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const TONE_COLOR: Record<ToastTone, string> = {
  success: '#6cdf9c',
  error: '#ff7c87',
  info: '#6fa8ff',
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-host">
      <TransitionGroup name="toast">
        <button
          v-for="toast in toasts"
          :key="toast.id"
          type="button"
          class="toast"
          @click="dismiss(toast.id)"
        >
          <span class="toast-dot" :style="{ background: TONE_COLOR[toast.tone] }" />
          {{ toast.text }}
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 520px;
  padding: 12px 20px;
  border-radius: 14px;
  background: rgba(17, 23, 32, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  font-size: 13px;
  color: #dfe6ef;
  backdrop-filter: blur(18px);
}

.toast-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.24s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
