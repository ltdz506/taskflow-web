import type { RealtimeMessage } from '@/types/models'
import { parseJson } from '@/utils/json'

interface RealtimeOptions {
  token: string
  onMessage: (message: RealtimeMessage) => void
  onStatus?: (connected: boolean) => void
}

/** 由 HTTP 地址推导 WebSocket 地址：ws(s)://host/ws?token= */
function buildUrl(token: string): string {
  const explicit = import.meta.env.VITE_WS_URL
  if (explicit) return `${explicit}${explicit.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`

  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin
  const url = new URL('/ws', base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('token', token)
  return url.toString()
}

/**
 * 建立实时连接：断线按指数退避重连（1s → 2s → 4s …，上限 15s），
 * 返回的 close() 会停止重连。
 */
export function createRealtime(options: RealtimeOptions): { close: () => void } {
  let socket: WebSocket | null = null
  let retry = 0
  let timer: number | undefined
  let disposed = false

  const connect = () => {
    if (disposed) return
    socket = new WebSocket(buildUrl(options.token))

    socket.onopen = () => {
      retry = 0
      options.onStatus?.(true)
    }

    socket.onmessage = (event) => {
      try {
        // 与 HTTP 响应一样必须走长整型保护，否则 taskflowId/taskId 会被四舍五入
        options.onMessage(parseJson<RealtimeMessage>(String(event.data)))
      } catch {
        // 非 JSON 消息直接忽略，不影响连接
      }
    }

    socket.onclose = () => {
      options.onStatus?.(false)
      if (disposed) return
      const delay = Math.min(1000 * 2 ** retry, 15000)
      retry += 1
      timer = window.setTimeout(connect, delay)
    }

    socket.onerror = () => {
      socket?.close()
    }
  }

  connect()

  return {
    close() {
      disposed = true
      window.clearTimeout(timer)
      socket?.close()
      socket = null
    },
  }
}
