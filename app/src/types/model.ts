export type MessageRole = 'user' | 'assistant' | 'system'
export type NodeStatus = 'idle' | 'streaming' | 'error' | 'summarizing'

export interface TreeNode {
  id: string
  treeId: string
  parentId: string | null
  childIds: string[]
  role: MessageRole
  content: string
  summary: string | null
  status: NodeStatus
  collapsed: boolean
  position: { x: number; y: number } | null
  createdAt: number
  updatedAt: number
}

export interface ConversationTree {
  id: string
  projectId: string
  title: string
  rootNodeId: string
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  name: string
  treeIds: string[]
  createdAt: number
  updatedAt: number
}
