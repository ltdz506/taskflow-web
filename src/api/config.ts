import { get, post } from './request'
import type { UserConfig } from '@/types/models'

/** 读取全部设置项 */
export function getUserConfig(): Promise<UserConfig> {
  return get<UserConfig>('/api/config/getUserConfig')
}

/** 保存设置：全量提交当前页的 {id, value}，value 为纯值字符串 */
export function updateUserConfig(configurations: Array<{ id: string; value: string }>): Promise<unknown> {
  return post<unknown>('/api/config/updateUserConfig', { configurations })
}
