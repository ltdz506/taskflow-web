<script setup lang="ts">
import { ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { useToast } from '@/composables/useToast'
import { useConfigStore } from '@/stores/config'
import { formatSize } from '@/utils/format'
import type { DraftTask } from './types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  add: [task: DraftTask]
}>()

const toast = useToast()
const config = useConfigStore()

const title = ref('')
const request = ref('')
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

function reset(): void {
  title.value = ''
  request.value = ''
  files.value = []
}

function pickFiles(): void {
  fileInput.value?.click()
}

function onFilesPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  if (!picked.length) return

  const limit = config.maxAssetsPerTask
  const maxSize = config.maxFileSizeMb * 1024 * 1024
  const accepted: File[] = []

  for (const file of picked) {
    if (files.value.length + accepted.length >= limit) {
      toast.error(`单个任务最多 ${limit} 个附件`)
      break
    }
    if (file.size > maxSize) {
      toast.error(`「${file.name}」超过单文件 ${config.maxFileSizeMb} MB 上限`)
      continue
    }
    if (files.value.some((item) => item.name === file.name && item.size === file.size)) continue
    accepted.push(file)
  }

  files.value = [...files.value, ...accepted]
}

function removeFile(index: number): void {
  files.value = files.value.filter((_, i) => i !== index)
}

function submit(): void {
  if (!title.value.trim()) {
    toast.error('请填写任务标题')
    return
  }
  if (!request.value.trim()) {
    toast.error('请填写任务要求')
    return
  }

  emit('add', {
    key: Date.now() + Math.floor(Math.random() * 1000),
    title: title.value.trim(),
    request: request.value.trim(),
    files: [...files.value],
  })
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  },
)
</script>

<template>
  <AppModal
    :model-value="modelValue"
    eyebrow="TASK DETAILS"
    title="添加具体任务"
    description="完成后将按顺序添加到当前任务流"
    :width="600"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="field">
      <label class="label" for="task-title">任务标题</label>
      <input id="task-title" v-model="title" type="text" placeholder="例如：完成接口设计" />
    </div>

    <div class="field">
      <label class="label" for="task-request">任务要求</label>
      <div class="textarea-wrap">
        <textarea
          id="task-request"
          v-model="request"
          maxlength="2000"
          placeholder="描述本任务需要完成的目标、限制和交付物…"
        />
        <span class="counter">{{ request.length }} / 2000</span>
      </div>
    </div>

    <div class="field">
      <label class="label" for="task-files">任务附件</label>
      <button id="task-files" type="button" class="file-picker" @click="pickFiles">
        <span class="picker-icon" aria-hidden="true">＋</span>
        <span class="picker-text">
          <strong>添加附件</strong>
          <small>支持任务所需的文件（单个不超过 {{ config.maxFileSizeMb }} MB）</small>
        </span>
      </button>
      <input ref="fileInput" class="hidden-input" type="file" multiple @change="onFilesPicked" />

      <ul v-if="files.length" class="file-list">
        <li v-for="(file, index) in files" :key="`${file.name}-${file.size}`" class="file-row">
          <span class="file-ext">{{ (file.name.split('.').pop() ?? 'FILE').toUpperCase() }}</span>
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
          <button type="button" class="file-remove" aria-label="移除附件" @click="removeFile(index)">
            ×
          </button>
        </li>
      </ul>
    </div>

    <template #footer>
      <span class="footer-hint">附件在此仅保存于前端，创建任务流后才会上传</span>
      <div class="footer-actions">
        <button type="button" class="btn-ghost" @click="emit('update:modelValue', false)">
          取消
        </button>
        <button type="button" class="btn-primary" @click="submit">添加任务</button>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.field + .field {
  margin-top: 20px;
}

.label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #ced6e1;
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
  height: 122px;
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

.file-picker {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 60px;
  padding: 0 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.file-picker:hover {
  background: rgba(140, 184, 255, 0.06);
  border-color: rgba(140, 184, 255, 0.24);
}

.picker-icon {
  flex: none;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(118, 150, 194, 0.12);
  font-size: 16px;
  color: #7696c2;
}

.picker-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.picker-text strong {
  font-size: 13px;
  font-weight: 500;
  color: #cfd7e2;
}

.picker-text small {
  font-size: 11px;
  color: #5f6b7a;
}

.hidden-input {
  display: none;
}

.file-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.file-ext {
  flex: none;
  font-family: 'Inter', var(--font-sans), sans-serif;
  font-size: 9px;
  letter-spacing: 0.4px;
  color: #8fbcf7;
}

.file-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #c3ccd8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  flex: none;
  font-size: 10px;
  color: #64707f;
}

.file-remove {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  font-size: 14px;
  color: #7d8896;
}

.file-remove:hover {
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

.btn-primary {
  height: 48px;
  min-width: 120px;
  padding: 0 28px;
  border-radius: 15px;
  background: #f4f7fb;
  font-size: 13px;
  font-weight: 500;
  color: #0a0d12;
  box-shadow: 0 10px 24px rgba(106, 169, 255, 0.14);
}
</style>
