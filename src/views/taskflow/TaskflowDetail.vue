<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useTaskflowStore } from '@/stores/taskflow'
import { useConfigStore } from '@/stores/config'
import { downloadAsset, deleteTaskflow } from '@/api/taskflow'
import { useToast } from '@/composables/useToast'
import { formatClock, formatDuration, parseTime } from '@/utils/format'
import { assetFilename } from '@/utils/download'
import { taskStatusMeta } from '@/utils/status'
import type { AssetItem } from '@/types/models'

const store = useTaskflowStore()
const config = useConfigStore()
const toast = useToast()

const showPending = ref(false)
const showDelete = ref(false)
const deleting = ref(false)
const chatEl = ref<HTMLElement | null>(null)

const summary = computed(() => store.selected)
const detail = computed(() => store.detail)
const tasks = computed(() => detail.value?.taskAndResponses ?? [])
const isEdit = computed(() => summary.value?.status === 'EDIT')
const isRunning = computed(() => summary.value?.status === 'RUNNING')

/** 顶部状态标签文案：运行态在详情里显示「启动中」 */
const statusLabel = computed(() => (isRunning.value ? '启动中' : ''))

/** 当前任务序号：优先取运行中的任务，否则用已终止的数量 */
const currentIndex = computed(() => {
  const running = tasks.value.find(({ task }) => task.status === 'RUNNING')
  if (running) return running.task.order
  return tasks.value.filter(({ task }) => task.status === 'TERMINATED').length
})

/** 销毁态的终止原因 = 最后一条带回复的任务文本 */
const destroyReason = computed(() => {
  const withReply = tasks.value.filter(({ response }) => response?.response)
  const last = withReply[withReply.length - 1]
  return last?.response?.response ?? ''
})

const metaText = computed(() => {
  if (!tasks.value.length) return '暂无任务'
  const base = `${tasks.value.length} 个任务`
  return isRunning.value && currentIndex.value > 0
    ? `${base}  ·  当前任务 ${currentIndex.value} / ${tasks.value.length}`
    : base
})

/* ---------------- 单轮执行计时 ---------------- */
const now = ref(Date.now())
let ticker: number | undefined

const totalSeconds = computed(() => config.agentTimeoutMinutes * 60)

const elapsedSeconds = computed(() => {
  const start = parseTime(summary.value?.startTime)
  if (!start) return 0
  return Math.max(0, (now.value - start.getTime()) / 1000)
})

const remainingSeconds = computed(() => Math.max(0, totalSeconds.value - elapsedSeconds.value))

const progress = computed(() =>
  totalSeconds.value === 0 ? 0 : Math.min(100, (elapsedSeconds.value / totalSeconds.value) * 100),
)

function startTicker(): void {
  stopTicker()
  ticker = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
}

function stopTicker(): void {
  window.clearInterval(ticker)
  ticker = undefined
}

/* ---------------- 交互 ---------------- */
async function onDownload(asset: AssetItem): Promise<void> {
  try {
    await downloadAsset(asset.id, assetFilename(asset.title, asset.suffix))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '附件下载失败')
  }
}

async function onDelete(): Promise<void> {
  if (!summary.value) return
  deleting.value = true
  try {
    await deleteTaskflow(summary.value.id)
    showDelete.value = false
    toast.success('任务流已删除')
    await store.loadList(store.page)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败')
  } finally {
    deleting.value = false
  }
}

/** 任务标签带前缀：任务终止 / 任务运行 / 任务等待 */
function taskLabel(status?: string | null): string {
  return `任务${taskStatusMeta(status).label}`
}

function scrollToBottom(): void {
  const el = chatEl.value
  if (el) el.scrollTop = el.scrollHeight
}

watch(
  () => [store.selectedId, store.detail],
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

watch(
  () => [isRunning.value, summary.value?.startTime],
  () => {
    if (isRunning.value) startTicker()
    else stopTicker()
  },
  { immediate: true },
)

onMounted(() => {
  void config.load()
  if (isRunning.value) startTicker()
})

onBeforeUnmount(stopTicker)
</script>

<template>
  <section class="detail-panel">
    <header v-if="summary" class="detail-head">
      <div class="head-main">
        <div class="head-info">
          <h2 class="detail-title">{{ summary.title }}</h2>
          <p class="detail-meta">{{ metaText }}</p>
        </div>
        <StatusTag :status="summary.status" :label="statusLabel" dot />
      </div>

      <div class="head-actions">
        <button
          type="button"
          class="ghost-btn"
          :disabled="store.pendingTasks.length === 0"
          @click="showPending = true"
        >
          查看待执行任务
        </button>

        <button v-if="isEdit" type="button" class="danger-btn" @click="showDelete = true">
          删除任务流
        </button>
        <span v-else-if="isRunning" class="hint-chip">启动后不可停止</span>
      </div>
    </header>

    <div v-if="summary" class="divider" />

    <div ref="chatEl" class="chat">
      <p v-if="!summary" class="chat-tip">从左侧选择一条任务流，查看执行过程与产物</p>
      <p v-else-if="store.detailError" class="chat-tip error">
        {{ store.detailError }}
        <button type="button" class="retry" @click="store.reloadDetail()">重试</button>
      </p>
      <p v-else-if="store.detailLoading" class="chat-tip">正在加载对话…</p>

      <template v-else-if="detail">
        <!-- 初始任务要求：只有用户气泡，没有 AI 回复 -->
        <div class="msg-row">
          <span class="msg-time">{{ formatClock(summary?.createTime) }}</span>
          <div class="msg-right">
            <div class="bubble user">
              <p class="bubble-text">{{ detail.startPrompt }}</p>
            </div>
          </div>
        </div>

        <template v-for="item in detail.taskAndResponses" :key="item.task.id">
          <div class="msg-row">
            <span class="msg-time">{{ formatClock(item.task.settleTime) }}</span>
            <div class="msg-right">
              <div class="bubble user">
                <p class="bubble-text">{{ item.task.request }}</p>

                <div v-if="item.task.assets.length" class="asset-row">
                  <button
                    v-for="asset in item.task.assets"
                    :key="`in-${asset.id}`"
                    type="button"
                    class="asset-chip"
                    :title="`下载 ${assetFilename(asset.title, asset.suffix)}`"
                    @click="onDownload(asset)"
                  >
                    <span class="asset-ext">{{ (asset.suffix || 'FILE').toUpperCase() }}</span>
                    <span class="asset-name">{{ asset.title }}</span>
                  </button>
                </div>

                <div class="bubble-foot">
                  <StatusTag kind="task" :status="item.task.status" :label="taskLabel(item.task.status)" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="item.response" class="msg-row">
            <span class="msg-time">{{ formatClock(item.response.respTime) }}</span>
            <div class="msg-left">
              <span class="agent-avatar" aria-hidden="true">A</span>
              <div class="bubble agent">
                <p class="bubble-text">{{ item.response.response }}</p>

                <div v-if="item.response.assets?.length" class="asset-row">
                  <button
                    v-for="asset in item.response.assets"
                    :key="`out-${asset.id}`"
                    type="button"
                    class="asset-chip"
                    :title="`下载 ${assetFilename(asset.title, asset.suffix)}`"
                    @click="onDownload(asset)"
                  >
                    <span class="asset-ext">{{ (asset.suffix || 'FILE').toUpperCase() }}</span>
                    <span class="asset-name">{{ asset.title }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <footer v-if="summary" class="detail-foot" :class="{ compact: !isRunning }">
      <template v-if="isRunning">
        <span class="foot-dot run" aria-hidden="true" />
        <div class="foot-text">
          <p class="foot-title">Agent 正在执行当前任务</p>
          <p class="foot-desc">
            启动后不可手动停止；权限不足或本轮执行超时，系统将自动销毁任务流并记录原因。
          </p>
        </div>
        <div class="timer-card">
          <p class="timer-label">单轮剩余时间</p>
          <p class="timer-value">
            {{ formatDuration(remainingSeconds) }} / {{ formatDuration(totalSeconds) }}
          </p>
          <div class="timer-track">
            <span class="timer-bar" :style="{ width: `${progress}%` }" />
          </div>
        </div>
      </template>

      <template v-else-if="isEdit">
        <span class="foot-dot idle" aria-hidden="true" />
        <div class="foot-text">
          <p class="foot-title">等待 Agent 领取</p>
          <p class="foot-desc">
            任务流创建后进入「编辑」态，Agent 领取后自动开始执行；执行前可整条删除。
          </p>
        </div>
      </template>

      <template v-else-if="summary.status === 'COMPLETED'">
        <span class="foot-dot done" aria-hidden="true" />
        <div class="foot-text">
          <p class="foot-title">任务流已完成</p>
          <p class="foot-desc">全部任务执行结束，产物可在上方 AI 回复中点击下载。</p>
        </div>
      </template>

      <template v-else>
        <span class="foot-dot danger" aria-hidden="true" />
        <div class="foot-text">
          <p class="foot-title">任务流已销毁</p>
          <p class="foot-desc reason">
            {{ destroyReason ? `终止原因：${destroyReason}` : '未记录终止原因；未执行的任务仍保持「等待」。' }}
          </p>
        </div>
      </template>
    </footer>

    <AppModal
      v-model="showPending"
      eyebrow="PENDING TASKS"
      title="待执行任务"
      description="尚未被 Agent 处理的任务，按先后顺序排列"
      :width="560"
    >
      <ul v-if="store.pendingTasks.length" class="pending-list">
        <li v-for="task in store.pendingTasks" :key="task.id" class="pending-row">
          <span class="pending-order">{{ task.order }}</span>
          <span class="pending-title">{{ task.title }}</span>
          <StatusTag kind="task" :status="task.status" />
        </li>
      </ul>
      <p v-else class="pending-empty">当前没有待执行的任务</p>
    </AppModal>

    <AppModal
      v-model="showDelete"
      eyebrow="DELETE WORKFLOW"
      title="删除任务流"
      description="删除后任务流、任务、回复与全部附件都会被物理清除，无法恢复。"
      :width="480"
    >
      <p class="delete-name">{{ summary?.title }}</p>
      <p class="delete-hint">仅「编辑」态的任务流可以删除；启动后将无法再手动删除。</p>
      <template #footer>
        <div class="delete-actions">
          <button type="button" class="btn-ghost" @click="showDelete = false">取消</button>
          <button type="button" class="btn-danger" :disabled="deleting" @click="onDelete">
            {{ deleting ? '删除中…' : '确认删除' }}
          </button>
        </div>
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 20px 32px 32px;
  border-radius: 24px;
  background: rgba(16, 21, 28, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex: none;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
  color: #f1f4f8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 420px;
}

.detail-meta {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: #6f7a89;
}

.head-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  padding-top: 2px;
}

.ghost-btn {
  height: 40px;
  min-width: 150px;
  padding: 0 18px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 500;
  color: #aeb7c3;
  transition: background 0.2s ease;
}

.ghost-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.ghost-btn:disabled {
  color: #5d6775;
  cursor: not-allowed;
}

.danger-btn {
  height: 40px;
  min-width: 164px;
  padding: 0 18px;
  border-radius: 13px;
  background: rgba(255, 109, 122, 0.08);
  border: 1px solid rgba(255, 124, 135, 0.18);
  font-size: 12px;
  font-weight: 500;
  color: #ff8993;
  transition: background 0.2s ease;
}

.danger-btn:hover {
  background: rgba(255, 109, 122, 0.16);
}

.hint-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 164px;
  padding: 0 18px;
  border-radius: 13px;
  background: rgba(127, 182, 255, 0.08);
  border: 1px solid rgba(138, 190, 255, 0.18);
  font-size: 12px;
  font-weight: 500;
  color: #9fc8ff;
  white-space: nowrap;
}

.divider {
  flex: none;
  height: 1px;
  margin-top: 22px;
  background: rgba(255, 255, 255, 0.065);
}

.chat {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 2px 8px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  scrollbar-gutter: stable;
}

.chat-tip {
  margin: auto;
  font-size: 13px;
  color: #6b7688;
  text-align: center;
}

.chat-tip.error {
  color: #ff9aa3;
}

.retry {
  display: block;
  margin: 8px auto 0;
  font-size: 12px;
  color: #8fbcf7;
  text-decoration: underline;
}

.msg-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.msg-time {
  flex: none;
  width: 46px;
  padding-top: 10px;
  font-size: 10px;
  color: #56616f;
}

.msg-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.msg-left {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.agent-avatar {
  flex: none;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(120, 175, 255, 0.16);
  font-family: 'Inter', var(--font-sans), sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #91beff;
  margin-top: 2px;
}

.bubble {
  position: relative;
  padding: 14px 26px;
  border-radius: 19px;
  font-size: 13px;
  line-height: 22px;
  min-width: 0;
}

.bubble.user {
  max-width: 500px;
  background: rgba(234, 242, 255, 0.1);
  border: 1px solid rgba(200, 222, 255, 0.12);
  color: #dce6f3;
}

.bubble.agent {
  max-width: 562px;
  padding: 12px 26px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.075);
  color: #c7d0db;
}

.bubble-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.asset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.asset-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  height: 30px;
  padding: 0 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  color: #c2ccda;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.asset-chip:hover {
  background: rgba(140, 184, 255, 0.12);
  border-color: rgba(140, 184, 255, 0.24);
}

.asset-ext {
  flex: none;
  font-family: 'Inter', var(--font-sans), sans-serif;
  font-size: 9px;
  letter-spacing: 0.4px;
  color: #8fbcf7;
}

.asset-name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 16px;
  padding: 18px 24px;
  border-radius: 18px;
  background: rgba(8, 16, 26, 0.82);
  border: 1px solid rgba(139, 184, 247, 0.12);
}

.detail-foot.compact {
  padding: 16px 24px;
  background: rgba(8, 12, 17, 0.66);
  border-color: rgba(255, 255, 255, 0.06);
}

.foot-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.foot-dot.run {
  background: #67a9ff;
}

.foot-dot.idle {
  background: #8b95a5;
}

.foot-dot.done {
  background: #6cdf9c;
}

.foot-dot.danger {
  background: #ff7c87;
}

.foot-text {
  flex: 1;
  min-width: 0;
}

.foot-title {
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  color: #8fbcf7;
}

.detail-foot.compact .foot-title {
  color: #aeb7c3;
}

.foot-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 20px;
  color: #b8c3d0;
}

.foot-desc.reason {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.timer-card {
  flex: none;
  width: 200px;
  padding: 12px 16px 14px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(139, 184, 247, 0.14);
}

.timer-label {
  font-size: 11px;
  line-height: 18px;
  color: #afc6e6;
}

.timer-value {
  margin-top: 2px;
  font-family: 'Inter', var(--font-sans), sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.4px;
  color: #dfe9f7;
}

.timer-track {
  position: relative;
  height: 4px;
  margin-top: 10px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.09);
  overflow: hidden;
}

.timer-bar {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 2px;
  background: #6aa8ff;
  transition: width 0.6s linear;
}

.pending-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pending-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.pending-order {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  font-size: 11px;
  color: #9aa6b6;
}

.pending-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #d5dce6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-empty {
  padding: 20px 0;
  text-align: center;
  font-size: 13px;
  color: #6b7688;
}

.delete-name {
  padding: 14px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 14px;
  color: #e2e8f0;
}

.delete-hint {
  margin-top: 10px;
  font-size: 11px;
  line-height: 18px;
  color: #5c6776;
}

.delete-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.btn-ghost {
  height: 48px;
  min-width: 112px;
  padding: 0 22px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 13px;
  color: #9ea8b5;
}

.btn-danger {
  height: 48px;
  min-width: 120px;
  padding: 0 22px;
  border-radius: 14px;
  background: rgba(255, 109, 122, 0.16);
  border: 1px solid rgba(255, 124, 135, 0.28);
  font-size: 13px;
  font-weight: 500;
  color: #ff9aa3;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
