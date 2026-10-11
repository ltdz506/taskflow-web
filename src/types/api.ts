/** 后端统一响应结构：{ status, message, data } */
export interface ApiResponse<T = unknown> {
  /** HTTP 返回状态，200 表示成功 */
  status: number
  message: string
  data: T
}
