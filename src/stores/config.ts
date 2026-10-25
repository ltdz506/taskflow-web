import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getUserConfig, updateUserConfig } from '@/api/config'
import type { ConfigItem, ConfigValue } from '@/types/models'

/** value 是 JSON 字符串 `{type, choose, value}`；解析失败时退回纯文本控件 */
export function parseConfigValue(raw: string): ConfigValue {
  try {
    const parsed = JSON.parse(raw) as Partial<ConfigValue>
    return {
      type: parsed.type ?? 'TEXT',
      choose: Array.isArray(parsed.choose) ? parsed.choose.map(String) : [],
      value: parsed.value === undefined || parsed.value === null ? '' : String(parsed.value),
    }
  } catch {
    return { type: 'TEXT', choose: [], value: raw ?? '' }
  }
}

export const useConfigStore = defineStore('config', () => {
  const items = ref<ConfigItem[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')

  /** Agent 单轮操作超时（分钟）：供详情页倒计时使用 */
  const agentTimeoutMinutes = computed(() => {
    const target = items.value.find((item) => item.content.includes('超时'))
    if (!target) return 30
    const minutes = Number(parseConfigValue(target.value).value)
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 30
  })

  async function load(force = false): Promise<void> {
    if (loaded.value && !force) return
    loading.value = true
    error.value = ''
    try {
      const data = await getUserConfig()
      items.value = data.configurations ?? []
      loaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '设置加载失败'
    } finally {
      loading.value = false
    }
  }

  async function save(payload: Array<{ id: string; value: string }>): Promise<void> {
    await updateUserConfig(payload)
  }

  /** 按名称取某个设置项的纯值（找不到时返回兜底值） */
  function valueOf(keyword: string, fallback: string): string {
    const target = items.value.find((item) => item.content.includes(keyword))
    if (!target) return fallback
    const value = parseConfigValue(target.value).value
    return value === '' ? fallback : value
  }

  /** 单任务最大附件数 */
  const maxAssetsPerTask = computed(() => Number(valueOf('附件数', '10')) || 10)
  /** 单文件大小上限（MB） */
  const maxFileSizeMb = computed(() => Number(valueOf('文件大小', '100')) || 100)
  /** 单个任务流最大任务数 */
  const maxTasksPerTaskflow = computed(() => Number(valueOf('最大任务数', '20')) || 20)

  return {
    items,
    loading,
    loaded,
    error,
    agentTimeoutMinutes,
    maxAssetsPerTask,
    maxFileSizeMb,
    maxTasksPerTaskflow,
    load,
    save,
  }
})
