import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createRealtime } from '@/api/ws'
import { getTaskflowDetail, getTaskflows } from '@/api/taskflow'
import type {
  AiReply,
  AssetItem,
  RealtimeMessage,
  TaskflowDetail,
  TaskflowSummary,
} from '@/types/models'

const PAGE_SIZE = 5

export const useTaskflowStore = defineStore('taskflow', () => {
  /* ---------------- 列表 ---------------- */
  const items = ref<TaskflowSummary[]>([])
  const total = ref(0)
  const page = ref(1)
  const keyword = ref('')
  const listLoading = ref(false)
  const listError = ref('')

  /* ---------------- 详情 ---------------- */
  const selectedId = ref<string | null>(null)
  // 必须是深度响应式：WebSocket 事件会直接改 taskAndResponses 里的嵌套对象，
  // shallowRef 下这些修改不会触发渲染，气泡就不会实时冒出来
  const detail = ref<TaskflowDetail | null>(null)
  const detailLoading = ref(false)
  const detailError = ref('')

  const selected = computed(
    () => items.value.find((item) => item.id === selectedId.value) ?? null,
  )
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
  const pendingTasks = computed(() =>
    (detail.value?.taskAndResponses ?? [])
      .filter(({ task }) => task.status === 'CREATED' || task.status === 'WAITING')
      .map(({ task }) => task),
  )

  /* ---------------- 实时连接 ---------------- */
  const connected = ref(false)
  let realtime: { close: () => void } | null = null
  let detailRefreshTimer: number | undefined

  /**
   * 兜底刷新：本地补丁打不上时（详情还没加载完、任务找不到、或状态变化缺少上下文），
   * 合并 400ms 后重拉一次详情，保证界面最终与服务端一致。
   */
  function scheduleDetailRefresh(taskflowId: string): void {
    if (selectedId.value !== taskflowId) return
    window.clearTimeout(detailRefreshTimer)
    detailRefreshTimer = window.setTimeout(() => {
      void refreshDetailQuietly()
    }, 400)
  }

  async function loadList(targetPage = page.value): Promise<void> {
    listLoading.value = true
    listError.value = ''
    try {
      const data = await getTaskflows(targetPage, keyword.value)
      // 文档写的是 taskflows，实际后端返回 list，两种都接
      items.value = data.taskflows ?? data.list ?? []
      total.value = data.total ?? 0
      page.value = targetPage

      // 选中项在刷新后可能已消失（被删除/被筛选掉），回落到第一条
      if (!items.value.some((item) => item.id === selectedId.value)) {
        const first = items.value[0]
        if (first) await select(first.id)
        else {
          selectedId.value = null
          detail.value = null
        }
      }
    } catch (error) {
      listError.value = error instanceof Error ? error.message : '任务流列表加载失败'
    } finally {
      listLoading.value = false
    }
  }

  /** 后端在任务没有附件时不会返回 assets 字段，这里补齐，避免模板取值报错 */
  function normalizeDetail(data: TaskflowDetail): TaskflowDetail {
    for (const item of data.taskAndResponses ?? []) {
      item.task.assets = item.task.assets ?? []
      if (item.response) item.response.assets = item.response.assets ?? []
    }
    return data
  }

  async function select(id: string): Promise<void> {
    selectedId.value = id
    detail.value = null
    detailError.value = ''
    detailLoading.value = true
    try {
      detail.value = normalizeDetail(await getTaskflowDetail(id))
    } catch (error) {
      detailError.value = error instanceof Error ? error.message : '任务流详情加载失败'
    } finally {
      detailLoading.value = false
    }
  }

  async function reloadDetail(): Promise<void> {
    if (selectedId.value !== null) await select(selectedId.value)
  }

  /**
   * 静默刷新：保留当前对话内容，拉到新数据后再整体替换。
   * 用于 WebSocket 事件的兜底校准，避免对话区闪一下「正在加载」。
   */
  async function refreshDetailQuietly(): Promise<void> {
    const id = selectedId.value
    if (id === null) return
    try {
      const data = normalizeDetail(await getTaskflowDetail(id))
      if (selectedId.value === id) detail.value = data
    } catch {
      // 静默失败，等下一次事件或用户手动重试
    }
  }

  /** 在列表里就地更新一条任务流的状态（WebSocket 用，避免整表重拉） */
  function patchSummary(taskflowId: string, patch: Partial<TaskflowSummary>): void {
    const target = items.value.find((item) => item.id === taskflowId)
    if (target) Object.assign(target, patch)
  }

  /** 处理服务端推送的 6 类事件 */
  function applyMessage(message: RealtimeMessage): void {
    const data = message.data ?? {}
    const taskflowId = data.taskflowId
    if (!taskflowId) return

    // ---- 任务流级事件：只更新列表里的状态，不带 taskId，不能再往下走任务匹配 ----
    if (message.event === 'taskflow.started') {
      patchSummary(taskflowId, { status: 'RUNNING', startTime: data.startTime ?? null })
      return
    }
    if (message.event === 'taskflow.completed') {
      patchSummary(taskflowId, { status: 'COMPLETED', endTime: data.endTime ?? null })
      scheduleDetailRefresh(taskflowId)
      return
    }
    if (message.event === 'taskflow.destroyed') {
      patchSummary(taskflowId, { status: 'DESTROYED', endTime: data.endTime ?? null })
      scheduleDetailRefresh(taskflowId)
      return
    }

    // ---- 以下都是任务级事件（task.running / task.responded / asset.added）----
    const current = detail.value
    if (!current || current.taskflowId !== taskflowId || !data.taskId) {
      // 详情还没加载完、或推送的不是当前选中的任务流：稍后校准一次
      scheduleDetailRefresh(taskflowId)
      return
    }

    const target = current.taskAndResponses.find(({ task }) => task.id === data.taskId)
    if (!target) {
      scheduleDetailRefresh(taskflowId)
      return
    }

    if (message.event === 'task.running') {
      target.task.status = 'RUNNING'
      target.task.settleTime = data.settleTime ?? target.task.settleTime
    } else if (message.event === 'task.responded') {
      target.task.status = 'TERMINATED'
      const reply: AiReply = target.response
        ? { ...target.response, response: data.response ?? target.response.response }
        : {
            id: '0',
            taskId: target.task.id,
            response: data.response ?? '',
            respTime: data.respTime ?? message.time,
            assets: [],
          }
      if (data.respTime) reply.respTime = data.respTime
      // 直接替换对象即可触发渲染（detail 是深度响应式）
      target.response = reply
    } else if (message.event === 'asset.added' && data.asset) {
      const asset: AssetItem = {
        id: data.asset.id,
        title: data.asset.title,
        suffix: data.asset.suffix,
      }
      if (data.asset.isInput === 1) {
        target.task.assets.push(asset)
      } else if (target.response) {
        target.response.assets = [...(target.response.assets ?? []), asset]
      } else {
        target.task.assets.push(asset)
      }
    }
  }

  /** 登录后建立实时连接 */
  function connectRealtime(token: string): void {
    disconnectRealtime()
    if (!token) return
    let hasOpened = false
    realtime = createRealtime({
      token,
      onMessage: applyMessage,
      onStatus: (value) => {
        connected.value = value
        // 首次连上不用重复拉取（页面自己会加载）；断线重连成功后校准一次
        if (value && hasOpened) {
          void loadList().then(() => {
            if (selectedId.value !== null) void reloadDetail()
          })
        }
        if (value) hasOpened = true
      },
    })
  }

  function disconnectRealtime(): void {
    window.clearTimeout(detailRefreshTimer)
    realtime?.close()
    realtime = null
    connected.value = false
  }

  return {
    items,
    total,
    page,
    keyword,
    listLoading,
    listError,
    selectedId,
    selected,
    detail,
    detailLoading,
    detailError,
    totalPages,
    pendingTasks,
    connected,
    loadList,
    select,
    reloadDetail,
    applyMessage,
    connectRealtime,
    disconnectRealtime,
  }
})
