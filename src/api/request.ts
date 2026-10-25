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

/** token 失效：清掉本地 token，退回登录页（PRD UC-01 扩展 5a） */
function handleUnauthorized(): never {
  clearToken()
  void router.replace({ name: 'login' })
  throw new ApiError('登录已过期，请重新登录', 401)
}

/**
 * 后端主键是 19 位长整型（如 3760072027503855231），超出 Number.MAX_SAFE_INTEGER，
 * 直接 JSON.parse 会被四舍五入成错误的值。这里在解析前把「字符串外的超长整数」加上引号。
 */
export function quoteBigIntegers(text: string): string {
  let out = ''
  let i = 0
  let inString = false

  while (i < text.length) {
    const ch = text[i] as string
    if (inString) {
      out += ch
      if (ch === '\\') {
        out += text[i + 1] ?? ''
        i += 2
        continue
      }
      if (ch === '"') inString = false
      i += 1
      continue
    }
    if (ch === '"') {
      inString = true
      out += ch
      i += 1
      continue
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      let end = i
      if (text[end] === '-') end += 1
      while (end < text.length && text.charCodeAt(end) >= 48 && text.charCodeAt(end) <= 57) end += 1
      const raw = text.slice(i, end)
      if (Math.abs(Number(raw)) > Number.MAX_SAFE_INTEGER) {
        out += `"${raw}"`
      } else {
        out += raw
      }
      i = end
      continue
    }
    out += ch
    i += 1
  }
  return out
}

/** 解析响应体（保留超长整型精度） */
function parseJson<T>(text: string): T {
  return JSON.parse(quoteBigIntegers(text)) as T
}

/** 发请求并挂上 Bearer token；网络异常统一转成可读错误 */
async function send(path: string, options: RequestInit = {}): Promise<Response> {
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
  if (res.status === 401) handleUnauthorized()
  return res
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await send(path, options)

  let body: ApiResponse<T>
  try {
    body = parseJson<ApiResponse<T>>(await res.text())
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

/** 上传文件（multipart/form-data，浏览器自动补 boundary） */
export function upload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: form })
}

/** 取二进制流（下载文件用） */
export async function fetchBlob(path: string): Promise<{ blob: Blob; headers: Headers }> {
  const res = await send(path)
  if (!res.ok) {
    throw new ApiError(`下载失败（HTTP ${res.status}）`, res.status)
  }
  return { blob: await res.blob(), headers: res.headers }
}
