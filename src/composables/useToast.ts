import { ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  text: string
  tone: ToastTone
}

const toasts = ref<ToastItem[]>([])
let seed = 0

function push(text: string, tone: ToastTone): void {
  const id = ++seed
  toasts.value = [...toasts.value, { id, text, tone }]
  window.setTimeout(() => dismiss(id), 3600)
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((item) => item.id !== id)
}

/** 轻量提示：success / error / info */
export function useToast() {
  return {
    toasts,
    dismiss,
    success: (text: string) => push(text, 'success'),
    error: (text: string) => push(text, 'error'),
    info: (text: string) => push(text, 'info'),
  }
}
