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
import { Star, Compass, CheckCircle2, Lock, TrendingUp } from 'lucide-react'
import MemoryCurveModal from './MemoryCurveModal'

// 节点状态样式（CSS 变量随主题切换；#7D9D77 鼠尾草绿为成功语义色，主题不变量）
const STATUS_STYLES: Record<NodeStatus, { border: string; bg: string; iconColor: string; label: string }> = {
  locked: { border: 'rgb(var(--n-200))', bg: 'rgb(var(--surface))', iconColor: 'rgb(var(--n-400))', label: '未解锁' },
  available: { border: 'rgb(var(--p-500))', bg: 'rgb(var(--surface))', iconColor: 'rgb(var(--p-500))', label: '当前' },
  in_progress: { border: 'rgb(var(--p-500))', bg: 'rgb(var(--p-50))', iconColor: 'rgb(var(--p-500))', label: '学习中' },
  completed: { border: 'rgb(var(--n-200))', bg: 'rgb(var(--surface))', iconColor: '#7D9D77', label: '已学' },
}

function CustomKnowledgeNode({ data }: { data: any }) {
  const { name, difficulty, status = 'available', nodeId } = data
  const { masteryData } = useAppStore()
  const [showMemoryCurve, setShowMemoryCurve] = useState(false)
  const style = STATUS_STYLES[status as NodeStatus] || STATUS_STYLES.available

  const handleClick = () => {
    if (status === 'available' || status === 'in_progress') {
      const msg = status === 'available'
        ? `我想学习「${name}」这个知识点，请为我生成学习资料`
        : `继续学习「${name}」，帮我深入讲解`

      // 统一由 ChatPanel 的 graph-send-message 监听器入栈消息并发送，避免双写
      window.dispatchEvent(new CustomEvent('graph-send-message', { detail: { message: msg } }))
    }
  }

  const handleMemoryCurve = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMemoryCurve(true)
  }

  const isClickable = status === 'available' || status === 'in_progress'
  const isCurrent = status === 'available' || status === 'in_progress'
  const hasHistory = (masteryData[nodeId]?.history?.length ?? 0) > 0

  return (
    <>
      <div
        onClick={handleClick}
        className={`relative px-4 py-3 rounded-xl text-left w-[180px] bg-surface group transition-all duration-200 hover:-translate-y-0.5 ${isClickable ? 'cursor-pointer hover:shadow-[0_0_0_3px_rgb(var(--p-500)/0.15)] hover:border-primary-300' : 'cursor-default opacity-75'}`}
        style={{ border: `2px solid ${style.border}` }}
      >
        <Handle type="target" position={Position.Top} className="!bg-stone-300 !border-stone-200 !w-1.5 !h-1.5 !opacity-60" />

        {/* 右上角状态图标 */}
        <div className="absolute top-2 right-2">
          {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {status === 'locked' && <Lock className="w-3.5 h-3.5 text-stone-400" />}
          {isCurrent && (
            <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-stone-900 line-clamp-1 pr-5">{name}</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[1, 2, 3].map((star) => (
                <Star key={star} className={`w-3 h-3 ${star <= difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-stone-200'}`} />
              ))}
            </div>
            <span className={`text-[10px] ml-1 font-medium ${
              status === 'completed' ? 'text-green-500' :
              status === 'locked' ? 'text-stone-400' : 'text-primary-500'
            }`}>
              {style.label}
            </span>
          </div>
        </div>

        {/* 记忆曲线按钮 */}
        {hasHistory && (
          <button
            onClick={handleMemoryCurve}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-md bg-stone-100 hover:bg-primary-100 border border-stone-200 hover:border-primary-300 flex items-center justify-center transition-colors group/btn"
            title="查看记忆曲线"
          >
            <TrendingUp className="w-3.5 h-3.5 text-stone-400 group-hover/btn:text-primary-500" />
          </button>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-stone-300 !border-stone-200 !w-1.5 !h-1.5 !opacity-60" />
      </div>

      {showMemoryCurve && masteryData[nodeId] && (
        <MemoryCurveModal
          nodeId={nodeId}
          nodeName={name}
          masteryData={masteryData[nodeId]}
          onClose={() => setShowMemoryCurve(false)}
        />
      )}
    </>
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
      stroke: nodeStates.get(edge.source) === 'completed' ? '#7D9D77' : 'rgb(var(--n-300))',
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
      <div className="h-full flex items-center justify-center bg-ivory text-stone-400 text-xs">
        <div className="text-center max-w-[200px]">
          <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center mx-auto mb-4 text-primary-500">
            <Compass className="w-5 h-5" />
          </div>
          <p className="font-bold text-stone-800">学习图谱</p>
          <p className="text-xs text-stone-400 mt-1">规划师将为你生成动态知识图谱</p>
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
        <Background color="rgb(var(--n-200))" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* 图例 */}
      <div className="absolute bottom-3 left-3 flex gap-4 text-[10px] text-stone-600 bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-stone-200 shadow-sm">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-500" />当前节点</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />已学</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-stone-300" />未解锁</span>
      </div>
    </div>
  )
}
