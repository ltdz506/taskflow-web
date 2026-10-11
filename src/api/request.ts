import router from '@/router'
import { clearToken, getToken } from '@/utils/token'
import type { ApiResponse } from '@/types/api'

/** 后端地址：默认同源；联调时可通过环境变量 VITE_API_BASE_URL 指向后端 */
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

/** 后端约定：status 为 HTTP 状态，200 表示成功 */
const SUCCESS = 200

/** 请求失败时抛出的错误（message 可直接展示给用户） */
export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('无法连接服务器，请稍后重试')
  }

  // token 失效：清掉本地 token，退回登录页（PRD UC-01 扩展 5a）
  if (res.status === 401) {
    clearToken()
    void router.replace({ name: 'login' })
    throw new ApiError('登录已过期，请重新登录', 401)
  }

  let body: ApiResponse<T>
  try {
    body = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiError(`服务器返回了非预期内容（HTTP ${res.status}）`, res.status)
  }

  if (!res.ok || body.status !== SUCCESS) {
    throw new ApiError(body.message || `请求失败（HTTP ${res.status}）`, res.status)
  }
  return body.data
}

/** GET 请求；params 会自动拼成 ?a=1&b=2 */
export function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : ''
  return request<T>(`${path}${query}`)
}

/** POST 请求；data 会被序列化为 JSON */
export function post<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: data === undefined ? undefined : JSON.stringify(data),
  })
}
