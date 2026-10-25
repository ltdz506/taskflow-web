/** 任务流状态（读写英文枚举，界面映射中文） */
export type TaskflowStatus = 'EDIT' | 'RUNNING' | 'COMPLETED' | 'DESTROYED'

/** 任务状态 */
export type TaskStatus = 'CREATED' | 'WAITING' | 'RUNNING' | 'TERMINATED'

/** 用户信息（GET /api/user/getUserInfo） */
export interface UserInfo {
  userId: number
  userName: string
  userTitle: string
  userIndexTxt: string
}

/** 列表中的一条任务流（TaskflowVo） */
export interface TaskflowSummary {
  /** 19 位长整型，必须按字符串处理（超出 JS 安全整数） */
  id: string
  title: string
  startPrompt: string
  status: TaskflowStatus
  createTime: string
  startTime: string | null
  endTime: string | null
}

/** 附件（输入文件或 Agent 产物） */
export interface AssetItem {
  id: string
  title: string
  suffix: string
  address?: string
}

/** 任务（详情内的 task 节点） */
export interface TaskDetail {
  id: string
  taskflowId: string
  title: string
  request: string
  order: number
  status: TaskStatus
  settleTime?: string | null
  assets: AssetItem[]
}

/** AI 回复 */
export interface AiReply {
  id: string
  taskId: string
  response: string
  respTime: string
  assets?: AssetItem[]
}

/** 任务 + 回复 */
export interface TaskAndResponse {
  task: TaskDetail
  response?: AiReply | null
}

/** 任务流详情（TaskVo） */
export interface TaskflowDetail {
  taskflowId: string
  startPrompt: string
  taskAndResponses: TaskAndResponse[]
}

/** 新建任务流时的单个任务入参 */
export interface CreateTaskPayload {
  title: string
  request: string
}

/** 新建任务流入参 */
export interface CreateTaskflowPayload {
  title: string
  startPrompt: string
  tasks: CreateTaskPayload[]
}

/** 新建任务流返回 */
export interface CreateTaskflowResult {
  taskflowId: string
  taskIds: string[]
}

/** 一个设置项（ConfigurationPo 的用户视图） */
export interface ConfigItem {
  id: string
  content: string
  description: string
  /** JSON 字符串：{ type, choose, value } */
  value: string
}

/** 设置项 value 反序列化后的结构 */
export interface ConfigValue {
  type: 'TEXT' | 'SELECT' | 'SWITCH' | string
  choose: string[]
  value: string
}

/** 设置接口返回 */
export interface UserConfig {
  userId: number
  configurations: ConfigItem[]
}

/** WebSocket 推送消息 */
export interface RealtimeMessage {
  event:
    | 'taskflow.started'
    | 'task.running'
    | 'task.responded'
    | 'asset.added'
    | 'taskflow.completed'
    | 'taskflow.destroyed'
    | string
  time: string
  data: {
    taskflowId?: string
    taskId?: string
    status?: string
    response?: string
    respTime?: string
    startTime?: string
    endTime?: string
    settleTime?: string
    asset?: { id: string; isInput?: number; title: string; suffix: string }
    updateTime?: string
    [key: string]: unknown
  }
}
