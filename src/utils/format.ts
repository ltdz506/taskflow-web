/** 把后端 `yyyy-mm-dd hh:mm:ss` 解析成 Date（Safari 不认这种格式，先替换成 ISO 风格） */
export function parseTime(value?: string | null): Date | null {
  if (!value) return null
  const normalized = value.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 列表里的创建时间：今天显示「今天」，今年显示「9 月 29 日」 */
export function formatListDate(value?: string | null): string {
  const date = parseTime(value)
  if (!date) return ''
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return '今天'
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

/** 气泡左侧的时间：HH:mm */
export function formatClock(value?: string | null): string {
  const date = parseTime(value)
  if (!date) return ''
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 秒数 → mm:ss */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** 文件大小 → 人类可读 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
