/**
 * 后端主键是 19 位长整型（如 3760072027503855231），超出 Number.MAX_SAFE_INTEGER，
 * 直接 JSON.parse 会被四舍五入成错误的值（查详情会直接报「任务流不存在」）。
 *
 * 这里在解析前扫描原始文本，把「字符串字面量之外」的超长整数加上引号，
 * 让它们以字符串形式保留完整精度。HTTP 响应与 WebSocket 消息都必须走这里。
 */
export function quoteBigIntegers(text: string): string {
  let out = ''
  let i = 0
  let inString = false

  while (i < text.length) {
    const ch = text[i] as string
    if (inString) {
      out += ch
      if (ch === '\\') {
        out += text[i + 1] ?? ''
        i += 2
        continue
      }
      if (ch === '"') inString = false
      i += 1
      continue
    }
    if (ch === '"') {
      inString = true
      out += ch
      i += 1
      continue
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      let end = i
      if (text[end] === '-') end += 1
      while (end < text.length && text.charCodeAt(end) >= 48 && text.charCodeAt(end) <= 57) end += 1
      const raw = text.slice(i, end)
      if (Math.abs(Number(raw)) > Number.MAX_SAFE_INTEGER) {
        out += `"${raw}"`
      } else {
        out += raw
      }
      i = end
      continue
    }
    out += ch
    i += 1
  }
  return out
}

/** 保留长整型精度的 JSON 解析 */
export function parseJson<T>(text: string): T {
  return JSON.parse(quoteBigIntegers(text)) as T
}
