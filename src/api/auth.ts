import { get } from './request'

export interface LoginResult {
  token: string
}

/** 登录：用访问密钥换取 token（GET /api/auth/login?password=） */
export function login(password: string): Promise<LoginResult> {
  return get<LoginResult>('/api/auth/login', { password })
}
