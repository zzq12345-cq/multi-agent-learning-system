/** API 类型定义 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentName?: string
  timestamp: number
}

export interface ChatResponse {
  session_id: string
  reply: string
  agent_name: string | null
  agent_outputs: Record<string, string>
  learning_path: LearningPath | null
  user_profile: StudentProfile | null
  node_states?: Record<string, { status: string; score?: number | null }> | null
}

export interface LearningPath {
  title: string
  description: string
  domain: string
  estimated_hours?: number
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export interface KnowledgeNode {
  id: string
  name: string
  description: string
  difficulty: number
  estimated_minutes?: number
  prerequisites: string[]
  learning_objectives?: string[]
  resource_types?: string[]
}

export interface KnowledgeEdge {
  source: string
  target: string
  relation: 'prerequisite' | 'related' | 'advanced'
}

export interface StudentProfile {
  knowledge_level?: string
  learning_style?: string
  goals?: string[]
  strengths?: string[]
  weaknesses?: string[]
}

export interface AgentInfo {
  name: string
  displayName: string
  description: string
  color: string
  icon: string
}

export const AGENTS: Record<string, AgentInfo> = {
  coordinator: { name: 'coordinator', displayName: '协调者', description: '任务分发与调度', color: '#9C7BB8', icon: '🎯' },
  profiler: { name: 'profiler', displayName: '画像师', description: '能力评估', color: '#7A91B5', icon: '📊' },
  planner: { name: 'planner', displayName: '规划师', description: '路径规划', color: '#7D9D77', icon: '🗺️' },
  generator: { name: 'generator', displayName: '生成器', description: '资源生成', color: '#C2974D', icon: '📝' },
  tutor: { name: 'tutor', displayName: '导师', description: '答疑解惑', color: '#B5697A', icon: '👨‍🏫' },
  assessor: { name: 'assessor', displayName: '评估师', description: '学习评估', color: '#5E9C94', icon: '✅' },
}

// ===== WebSocket 事件 =====

export type WSEventType =
  | 'agent_start'
  | 'agent_end'
  | 'token'
  | 'route'
  | 'done'
  | 'error'
  | 'system_notice'

export interface WSEvent {
  type: WSEventType
  agent?: string
  content?: string
  route_from?: string
  route_to?: string
  reasoning?: string
  agent_outputs?: Record<string, string>
  learning_path?: LearningPath | null
  user_profile?: StudentProfile | null
  node_states?: Record<string, { status: string; score?: number | null }> | null
  mastery_data?: Record<string, { mastery: number; last_review_ts: number; attempts: number }> | null
  error?: string
  timestamp?: number
}

export interface AgentTrace {
  agent: string
  action: 'start' | 'end' | 'route'
  timestamp: number
  detail?: string
  reasoning?: string
}

export type NodeStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export interface NodeState {
  nodeId: string
  status: NodeStatus
  score?: number
}
