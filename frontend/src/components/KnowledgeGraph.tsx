import { useEffect, useState } from 'react'
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useAppStore } from '../stores/useAppStore'
import { getPythonGraph } from '../services/api'
import type { LearningPath, NodeStatus } from '../types'
import { Star, Compass, CheckCircle2, Lock } from 'lucide-react'

// 节点状态样式
const STATUS_STYLES: Record<NodeStatus, { border: string; bg: string; iconColor: string; label: string }> = {
  locked: { border: '#e5e7eb', bg: '#ffffff', iconColor: '#9ca3af', label: '未解锁' },
  available: { border: '#3b82f6', bg: '#ffffff', iconColor: '#3b82f6', label: '当前' },
  in_progress: { border: '#3b82f6', bg: '#eff6ff', iconColor: '#3b82f6', label: '学习中' },
  completed: { border: '#e5e7eb', bg: '#ffffff', iconColor: '#22c55e', label: '已学' },
}

function CustomKnowledgeNode({ data }: { data: any }) {
  const { name, difficulty, status = 'available' } = data
  const style = STATUS_STYLES[status as NodeStatus] || STATUS_STYLES.available

  const handleClick = () => {
    if (status === 'available' || status === 'in_progress') {
      const store = useAppStore.getState()
      const msg = status === 'available'
        ? `我想学习「${name}」这个知识点，请为我生成学习资料`
        : `继续学习「${name}」，帮我深入讲解`

      store.addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: msg,
        timestamp: Date.now(),
      })
      store.setLoading(true)
      store.clearTraces()
      store.clearStreamingContent()

      window.dispatchEvent(new CustomEvent('graph-send-message', { detail: { message: msg } }))
    }
  }

  const isClickable = status === 'available' || status === 'in_progress'
  const isCurrent = status === 'available' || status === 'in_progress'

  return (
    <div
      onClick={handleClick}
      className={`relative px-4 py-3 rounded-xl text-left w-[180px] bg-white group transition-all duration-200 hover:-translate-y-0.5 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ border: `2px solid ${style.border}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !border-gray-200 !w-1.5 !h-1.5 !opacity-60" />

      {/* 右上角状态图标 */}
      <div className="absolute top-2 right-2">
        {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {status === 'locked' && <Lock className="w-3.5 h-3.5 text-gray-400" />}
        {isCurrent && (
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-gray-900 line-clamp-1 pr-5">{name}</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {[1, 2, 3].map((star) => (
              <Star key={star} className={`w-3 h-3 ${star <= difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
            ))}
          </div>
          <span className={`text-[10px] ml-1 font-medium ${
            status === 'completed' ? 'text-green-500' :
            status === 'locked' ? 'text-gray-400' : 'text-blue-500'
          }`}>
            {style.label}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !border-gray-200 !w-1.5 !h-1.5 !opacity-60" />
    </div>
  )
}

const nodeTypes = { custom: CustomKnowledgeNode }

function graphToFlow(path: LearningPath, nodeStates: Map<string, NodeStatus>) {
  const nodes: Node[] = path.nodes.map((node, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const status = nodeStates.get(node.id) || (index === 0 ? 'available' : 'locked')

    return {
      id: node.id,
      type: 'custom',
      position: { x: col * 210 + 40, y: row * 120 + 40 },
      data: { name: node.name, difficulty: node.difficulty, description: node.description, status, nodeId: node.id },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }
  })

  const edges: Edge[] = path.edges.map((edge, i) => ({
    id: `e-${i}`,
    source: edge.source,
    target: edge.target,
    animated: nodeStates.get(edge.source) === 'in_progress',
    style: {
      stroke: nodeStates.get(edge.source) === 'completed' ? '#22c55e' : '#d1d5db',
      strokeWidth: 1.5,
    },
  }))

  return { nodes, edges }
}

export default function KnowledgeGraph() {
  const { learningPath, nodeStates } = useAppStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [defaultGraph, setDefaultGraph] = useState<LearningPath | null>(null)

  useEffect(() => {
    getPythonGraph().then((data) => { if (data) setDefaultGraph(data) })
  }, [])

  useEffect(() => {
    const path = learningPath || defaultGraph
    if (!path || !path.nodes?.length) return
    const stateMap = new Map(nodeStates.map((s) => [s.nodeId, s.status]))
    const { nodes: flowNodes, edges: flowEdges } = graphToFlow(path, stateMap)
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [learningPath, defaultGraph, nodeStates, setNodes, setEdges])

  if (!nodes.length) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-gray-400 text-xs">
        <div className="text-center max-w-[200px]">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4 text-blue-500">
            <Compass className="w-5 h-5" />
          </div>
          <p className="font-bold text-gray-800">学习图谱</p>
          <p className="text-xs text-gray-400 mt-1">规划师将为你生成动态知识图谱</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes} fitView attributionPosition="bottom-left"
      >
        <Background color="#e5e7eb" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* 图例 */}
      <div className="absolute bottom-3 left-3 flex gap-4 text-[10px] text-gray-600 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />当前节点</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />已学</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" />未解锁</span>
      </div>
    </div>
  )
}
