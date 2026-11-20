import { reactive } from 'vue'

export interface Toast {
  id: number
  text: string
}

let nextId = 1

/** Currently visible toasts (rendered by `ToastHost.vue`). */
export const toasts = reactive<Toast[]>([])

/** Shows a short, non-blocking message at the bottom of the screen. */
export function showToast(text: string, durationMs = 2800): void {
  const id = nextId++
  toasts.push({ id, text })
  setTimeout(() => {
    const index = toasts.findIndex((toast) => toast.id === id)
    if (index >= 0) toasts.splice(index, 1)
  }, durationMs)
}
