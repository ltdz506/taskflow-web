<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AddTaskModal from './AddTaskModal.vue'
import { createTaskflow, uploadAsset } from '@/api/taskflow'
import { useToast } from '@/composables/useToast'
import { useConfigStore } from '@/stores/config'
import type { DraftTask } from './types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [taskflowId: string]
}>()

const toast = useToast()
const config = useConfigStore()

const title = ref('')
const startPrompt = ref('')
const tasks = ref<DraftTask[]>([])
const showAddTask = ref(false)
const submitting = ref(false)
const progressText = ref('')

const canSubmit = computed(
  () =>
    !submitting.value &&
    title.value.trim().length > 0 &&
    startPrompt.value.trim().length > 0 &&
    tasks.value.length > 0,
)

const totalFiles = computed(() => tasks.value.reduce((sum, task) => sum + task.files.length, 0))

function openAddTask(): void {
  if (tasks.value.length >= config.maxTasksPerTaskflow) {
    toast.error(`单个任务流最多 ${config.maxTasksPerTaskflow} 个任务`)
    return
  }
  showAddTask.value = true
}

function onTaskAdded(task: DraftTask): void {
  tasks.value = [...tasks.value, task]
}

function removeTask(key: number): void {
  tasks.value = tasks.value.filter((task) => task.key !== key)
}

function reset(): void {
  title.value = ''
  startPrompt.value = ''
  tasks.value = []
  progressText.value = ''
}

async function submit(): Promise<void> {
  if (!canSubmit.value) {
    if (tasks.value.length === 0) toast.error('请至少添加一个后续任务')
    else toast.error('请填写任务流标题和初始任务要求')
    return
  }

  submitting.value = true
  progressText.value = '正在创建任务流…'
  try {
    // 第一步：先创建任务流，拿到 taskflowId 与按顺序对应的 taskIds
    const result = await createTaskflow({
      title: title.value.trim(),
      startPrompt: startPrompt.value.trim(),
      tasks: tasks.value.map((task) => ({ title: task.title, request: task.request })),
    })

    // 第二步：按 taskIds[i] 与第 i 个任务持有的文件，逐个上传
    const jobs = tasks.value.flatMap((task, index) => {
      const taskId = result.taskIds[index]
      if (!taskId) return []
      return task.files.map((file) => ({ taskId, file }))
    })

    let failed = 0
    let finished = 0
    for (const job of jobs) {
      finished += 1
      progressText.value = `正在上传附件 ${finished} / ${jobs.length}`
      try {
        await uploadAsset(job.taskId, job.file)
      } catch {
        failed += 1
      }
    }

    if (failed > 0) {
      toast.error(`任务流已创建，但有 ${failed} 个附件上传失败`)
    } else {
      toast.success('任务流已创建')
    }

    emit('created', result.taskflowId)
    emit('update:modelValue', false)
    reset()
  } catch (error) {
    // 失败时保留弹窗内容，方便直接重试（PRD UC-05 扩展 5a）
    toast.error(error instanceof Error ? error.message : '创建任务流失败')
  } finally {
    submitting.value = false
    progressText.value = ''
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) progressText.value = ''
  },
)
</script>

<template>
  <AppModal
    :model-value="modelValue"
    eyebrow="NEW WORKFLOW"
    title="新建任务流"
    description="任务将按照添加顺序依次交给 Agent 执行"
    :width="644"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="field">
      <div class="label-row">
        <label class="label" for="flow-title">任务流标题</label>
        <span class="label-hint">用于在任务列表中识别</span>
      </div>
      <input id="flow-title" v-model="title" type="text" placeholder="输入一个便于识别的任务流标题" />
    </div>

    <div class="field">
      <div class="label-row">
        <label class="label" for="flow-start">初始任务要求</label>
        <span class="label-hint">将作为任务流中的第一个提示词</span>
      </div>
      <div class="textarea-wrap">
        <textarea
          id="flow-start"
          v-model="startPrompt"
          maxlength="2000"
          placeholder="描述你希望 Agent 首先完成的工作…"
        />
        <span class="counter">{{ startPrompt.length }} / 2000</span>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <span class="label">后续任务</span>
        <button type="button" class="add-task-btn" :disabled="submitting" @click="openAddTask">
          <span class="plus" aria-hidden="true">＋</span>
          添加任务
        </button>
      </div>

      <div v-if="tasks.length === 0" class="empty-state">
        <span class="empty-icon" aria-hidden="true">＋</span>
        <div class="empty-text">
          <p class="empty-title">尚未添加后续任务</p>
          <p class="empty-desc">点击「添加任务」建立顺序执行的下一步</p>
        </div>
      </div>

      <ul v-else class="task-list">
        <li v-for="(task, index) in tasks" :key="task.key" class="task-row">
          <span class="task-order">{{ index + 1 }}</span>
          <div class="task-main">
            <p class="task-title">{{ task.title }}</p>
            <p class="task-meta">
              <template v-if="task.files.length">
                {{ task.files.length }} 个附件 ·
                {{ task.files.map((file) => file.name).join('、') }}
              </template>
              <template v-else>无附件</template>
            </p>
          </div>
          <button
            type="button"
            class="task-remove"
            aria-label="移除任务"
            :disabled="submitting"
            @click="removeTask(task.key)"
          >
            ×
          </button>
        </li>
      </ul>
    </div>

    <template #footer>
      <span class="footer-hint">
        {{ progressText || (tasks.length ? `共 ${tasks.length} 个任务 · ${totalFiles} 个附件` : '需填写标题、初始要求并至少添加一个任务') }}
      </span>
      <div class="footer-actions">
        <button
          type="button"
          class="btn-ghost"
          :disabled="submitting"
          @click="emit('update:modelValue', false)"
        >
          取消
        </button>
        <button type="button" class="btn-primary" :disabled="!canSubmit" @click="submit">
          {{ submitting ? '创建中…' : '创建任务流' }}
        </button>
      </div>
    </template>
  </AppModal>

  <AddTaskModal v-model="showAddTask" @add="onTaskAdded" />
</template>

<style scoped>
.field + .field,
.field + .section {
  margin-top: 20px;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #ced6e1;
}

.label-hint {
  font-size: 11px;
  color: #657180;
}

input[type='text'],
textarea {
  width: 100%;
  border-radius: 14px;
  background: rgba(8, 13, 20, 0.74);
  border: 1px solid rgba(199, 219, 245, 0.1);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.28);
  font-size: 13px;
  line-height: 22px;
  color: #e9eef5;
  outline: none;
  transition: border-color 0.2s ease;
}

input[type='text'] {
  height: 48px;
  padding: 0 20px;
}

input[type='text']::placeholder,
textarea::placeholder {
  color: #596575;
}

input[type='text']:focus,
textarea:focus {
  border-color: rgba(140, 184, 255, 0.42);
}

.textarea-wrap {
  position: relative;
}

textarea {
  height: 104px;
  padding: 12px 20px 26px;
  border-radius: 18px;
  resize: none;
}

.counter {
  position: absolute;
  right: 18px;
  bottom: 10px;
  font-size: 10px;
  color: #4f5b69;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.add-task-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.065);
  border: 1px solid rgba(175, 207, 255, 0.12);
  font-size: 12px;
  font-weight: 500;
  color: #b7c7dc;
  transition: background 0.2s ease;
}

.add-task-btn:hover:not(:disabled) {
  background: rgba(140, 184, 255, 0.12);
}

.add-task-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.plus {
  font-size: 17px;
  line-height: 1;
  color: #8cb8f9;
}

.empty-state {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 88px;
  padding: 0 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.055);
}

.empty-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(118, 150, 194, 0.12);
  font-size: 16px;
  color: #7696c2;
}

.empty-title {
  font-size: 13px;
  font-weight: 500;
  color: #8f9aaa;
}

.empty-desc {
  margin-top: 2px;
  font-size: 11px;
  color: #5f6b7a;
}

.task-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 168px;
  overflow-y: auto;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.task-order {
  flex: none;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(140, 184, 255, 0.14);
  font-size: 11px;
  font-weight: 500;
  color: #8fbcf7;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 13px;
  font-weight: 500;
  color: #d5dce6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  margin-top: 2px;
  font-size: 11px;
  color: #626e7d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-remove {
  flex: none;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-size: 14px;
  color: #7d8896;
}

.task-remove:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #ffb3ba;
}

.footer-hint {
  font-size: 11px;
  color: #5c6776;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.btn-ghost {
  height: 48px;
  min-width: 112px;
  padding: 0 26px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 13px;
  font-weight: 500;
  color: #9ea8b5;
}

.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  height: 48px;
  min-width: 120px;
  padding: 0 26px;
  border-radius: 15px;
  background: #f4f7fb;
  font-size: 13px;
  font-weight: 500;
  color: #0a0d12;
  box-shadow: 0 10px 24px rgba(106, 169, 255, 0.14);
  transition: opacity 0.2s ease;
}

.btn-primary:disabled {
  background: rgba(244, 247, 251, 0.28);
  color: #737e8b;
  box-shadow: none;
  cursor: not-allowed;
}
</style>
