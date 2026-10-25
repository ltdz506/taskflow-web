import { get } from './request'
import type { UserInfo } from '@/types/models'

/** 获取登录用户信息（首页大字与导航用户信息） */
export function getUserInfo(): Promise<UserInfo> {
  return get<UserInfo>('/api/user/getUserInfo')
}
