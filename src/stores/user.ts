import { ref } from 'vue'
import { defineStore } from 'pinia'
import { login as loginApi } from '@/api/auth'
import { clearToken, getToken, setToken } from '@/utils/token'

export const useUserStore = defineStore('user', () => {
  /** 当前访问令牌（初始值来自本地存储） */
  const token = ref(getToken())

  /** 用访问密钥登录，成功后保存 token */
  async function login(password: string): Promise<void> {
    const { token: newToken } = await loginApi(password)
    token.value = newToken
    setToken(newToken)
  }

  /** 退出登录：清除本地 token（路由守卫会把用户挡回登录页） */
  function logout(): void {
    token.value = ''
    clearToken()
  }

  return { token, login, logout }
})
