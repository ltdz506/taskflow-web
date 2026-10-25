export interface DraftTask {
  /** 前端本地唯一 key，仅用于列表渲染 */
  key: number
  title: string
  request: string
  /** 只在前端持有的文件引用，创建任务流后才真正上传 */
  files: File[]
}
