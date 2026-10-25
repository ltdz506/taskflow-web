import type { TaskStatus, TaskflowStatus } from '@/types/models'

export type StatusTone = 'edit' | 'run' | 'done' | 'danger' | 'wait' | 'idle'

interface StatusMeta {
  label: string
  tone: StatusTone
}

const TASKFLOW_META: Record<TaskflowStatus, StatusMeta> = {
  EDIT: { label: '编辑', tone: 'edit' },
  RUNNING: { label: '启动', tone: 'run' },
  COMPLETED: { label: '完成', tone: 'done' },
  DESTROYED: { label: '销毁', tone: 'danger' },
}

const TASK_META: Record<TaskStatus, StatusMeta> = {
  CREATED: { label: '创建', tone: 'idle' },
  WAITING: { label: '等待', tone: 'wait' },
  RUNNING: { label: '运行', tone: 'run' },
  TERMINATED: { label: '终止', tone: 'done' },
}

/** 任务流状态 → 中文标签 + 色调 */
export function taskflowStatusMeta(status?: string | null): StatusMeta {
  if (status && status in TASKFLOW_META) {
    return TASKFLOW_META[status as TaskflowStatus]
  }
  return { label: status ?? '未知', tone: 'idle' }
}

/** 任务状态 → 中文标签 + 色调 */
export function taskStatusMeta(status?: string | null): StatusMeta {
  if (status && status in TASK_META) {
    return TASK_META[status as TaskStatus]
  }
  return { label: status ?? '未知', tone: 'idle' }
}

/** 状态色调 → 圆点/文字的主题色 */
export function toneColor(tone: StatusTone): string {
  switch (tone) {
    case 'edit':
      return '#a88bff'
    case 'run':
      return '#6fa8ff'
    case 'done':
      return '#6cdf9c'
    case 'danger':
      return '#ff7c87'
    case 'wait':
      return '#e5b567'
    default:
      return '#8b95a5'
  }
}
