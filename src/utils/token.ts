const TOKEN_KEY = 'taskflow_token'

/** 读取本地保存的访问令牌（不存在时返回空字符串） */
export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

/** 保存访问令牌 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/** 清除访问令牌 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
