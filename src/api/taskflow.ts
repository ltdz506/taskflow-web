import { get, post, upload } from './request'
import { downloadBlob } from '@/utils/download'
import type {
  CreateTaskflowPayload,
  CreateTaskflowResult,
  TaskflowDetail,
  TaskflowSummary,
} from '@/types/models'

/** 一页任务流（每页 5 条，创建时间降序） */
export interface TaskflowPage {
  total: number
  /** 文档字段名是 taskflows，实际后端返回 list，两者都兼容 */
  taskflows?: TaskflowSummary[]
  list?: TaskflowSummary[]
}

export function getTaskflows(page: number, keyword = ''): Promise<TaskflowPage> {
  const params: Record<string, string> = { page: String(page) }
  if (keyword.trim()) params.keyword = keyword.trim()
  return get<TaskflowPage>('/api/ai/getTaskflows', params)
}

export function getTaskflowDetail(id: string): Promise<TaskflowDetail> {
  return get<TaskflowDetail>('/api/ai/getTaskflowDetailById', { id })
}

export function createTaskflow(payload: CreateTaskflowPayload): Promise<CreateTaskflowResult> {
  return post<CreateTaskflowResult>('/api/ai/createTaskflow', payload)
}

export function deleteTaskflow(id: string): Promise<unknown> {
  return post<unknown>(`/api/ai/deleteTaskflow?id=${encodeURIComponent(id)}`)
}

/** 上传任务附件（multipart，字段名 file） */
export function uploadAsset(taskId: string, file: File): Promise<unknown> {
  const form = new FormData()
  form.append('file', file)
  return upload<unknown>(`/api/ai/uploadAsset?taskId=${encodeURIComponent(taskId)}`, form)
}

/** 通用附件下载（不区分输入文件 / 中间产物 / 最终产物） */
export function downloadAsset(id: string, fallbackName: string): Promise<void> {
  return downloadBlob(`/api/ai/downloadAsset?id=${encodeURIComponent(id)}`, fallbackName)
}
