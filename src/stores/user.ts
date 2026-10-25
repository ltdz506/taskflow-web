import { ref } from 'vue'
import { defineStore } from 'pinia'
import { login as loginApi } from '@/api/auth'
import { getUserInfo } from '@/api/user'
import { clearToken, getToken, setToken } from '@/utils/token'
import type { UserInfo } from '@/types/models'

export const useUserStore = defineStore('user', () => {
  /** 当前访问令牌（初始值来自本地存储） */
  const token = ref(getToken())

  /** 导航与首页展示的用户信息 */
  const profile = ref<UserInfo | null>(null)
  const profileLoaded = ref(false)
  const profileFailed = ref(false)

  /** 用访问密钥登录，成功后保存 token */
  async function login(password: string): Promise<void> {
    const { token: newToken } = await loginApi(password)
    token.value = newToken
    setToken(newToken)
    profile.value = null
    profileLoaded.value = false
  }

  /** 拉取用户信息；失败时保留 null，由页面展示占位 */
  async function loadProfile(force = false): Promise<void> {
    if (profileLoaded.value && !force) return
    try {
      profile.value = await getUserInfo()
      profileLoaded.value = true
      profileFailed.value = false
    } catch {
      profile.value = null
      profileFailed.value = true
    }
  }

  /** 退出登录：清除本地 token（路由守卫会把用户挡回登录页） */
  function logout(): void {
    token.value = ''
    profile.value = null
    profileLoaded.value = false
    profileFailed.value = false
    clearToken()
  }

  return { token, profile, profileLoaded, profileFailed, login, loadProfile, logout }
})
