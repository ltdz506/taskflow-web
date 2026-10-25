import { fetchBlob } from '@/api/request'

/** 从 Content-Disposition 里解析文件名（后端可能给 URL 编码或 filename*） */
function parseFilename(header: string | null): string {
  if (!header) return ''
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8?.[1]) return decodeURIComponent(utf8[1])
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? ''
}

/** 下载二进制文件：带上 token，转成 Blob 后触发浏览器保存 */
export async function downloadBlob(path: string, fallbackName: string): Promise<void> {
  const res = await fetchBlob(path)
  const filename = parseFilename(res.headers.get('Content-Disposition')) || fallbackName
  const blobUrl = URL.createObjectURL(res.blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
}

/** 拼接完整文件名（title + 后缀） */
export function assetFilename(title: string, suffix: string): string {
  if (!suffix) return title
  return title.toLowerCase().endsWith(`.${suffix.toLowerCase()}`) ? title : `${title}.${suffix}`
}
