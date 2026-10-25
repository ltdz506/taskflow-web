import { computed, ref, shallowRef } from 'vue'
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
  const detail = shallowRef<TaskflowDetail | null>(null)
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

  async function select(id: string): Promise<void> {
    selectedId.value = id
    detail.value = null
    detailError.value = ''
    detailLoading.value = true
    try {
      const data = await getTaskflowDetail(id)
      // 后端在任务没有附件时不会返回 assets 字段，这里补齐，避免模板取值报错
      for (const item of data.taskAndResponses ?? []) {
        item.task.assets = item.task.assets ?? []
        if (item.response) item.response.assets = item.response.assets ?? []
      }
      detail.value = data
    } catch (error) {
      detailError.value = error instanceof Error ? error.message : '任务流详情加载失败'
    } finally {
      detailLoading.value = false
    }
  }

  async function reloadDetail(): Promise<void> {
    if (selectedId.value !== null) await select(selectedId.value)
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

    if (message.event === 'taskflow.started') {
      patchSummary(taskflowId, { status: 'RUNNING', startTime: data.startTime ?? null })
    } else if (message.event === 'taskflow.completed') {
      patchSummary(taskflowId, { status: 'COMPLETED', endTime: data.endTime ?? null })
    } else if (message.event === 'taskflow.destroyed') {
      patchSummary(taskflowId, { status: 'DESTROYED', endTime: data.endTime ?? null })
    }

    const current = detail.value
    if (!current || current.taskflowId !== taskflowId) return

    const target = current.taskAndResponses.find(({ task }) => task.id === data.taskId)
    if (!target) return

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
