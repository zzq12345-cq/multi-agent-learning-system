# Task 7: 知识图谱节点状态联动

**Files:**
- Modify: `frontend/src/components/KnowledgeGraph.tsx`

---

- [ ] **Step 1: 完整替换 KnowledgeGraph.tsx**

```typescript
import { useEffect, useState } from 'react'
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useAppStore } from '../stores/useAppStore'
import { getPythonGraph } from '../services/api'
import type { LearningPath, NodeStatus } from '../types'
import { Star, Compass, CheckCircle2, Lock, Play } from 'lucide-react'

// 节点状态样式
const STATUS_STYLES: Record<NodeStatus, { border: string; bg: string; bar: string }> = {
  locked: { border: '#e4e4e7', bg: '#fafafa', bar: '#d4d4d8' },
  available: { border: '#a1a1aa', bg: '#ffffff', bar: '#3b82f6' },
  in_progress: { border: '#10b981', bg: '#ecfdf5', bar: '#10b981' },
  completed: { border: '#6366f1', bg: '#eef2ff', bar: '#6366f1' },
}

function CustomKnowledgeNode({ data }: { data: any }) {
  const { name, difficulty, status = 'available' } = data
  const style = STATUS_STYLES[status as NodeStatus] || STATUS_STYLES.available

  return (
    <div
      className="relative px-3.5 py-3 rounded-xl text-left w-[170px] shadow-[0_1px_3px_rgba(0,0,0,0.01),0_4px_16px_-8px_rgba(0,0,0,0.02)] group transition-all duration-200 hover:-translate-y-0.5"
      style={{ border: `1px solid ${style.border}`, background: style.bg }}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-300 !border-zinc-200 !w-1 !h-1 !opacity-60" />
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: style.bar }} />

      <div className="flex flex-col gap-1.5 pt-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-900 line-clamp-1 flex-1">{name}</span>
          {status === 'completed' && <CheckCircle2 className="w-3 h-3 text-indigo-500" />}
          {status === 'in_progress' && <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />}
          {status === 'locked' && <Lock className="w-2.5 h-2.5 text-zinc-300" />}
        </div>
        <div className="flex gap-0.5 items-center">
          {[1, 2, 3].map((star) => (
            <Star key={star} className={`w-2.5 h-2.5 ${star <= difficulty ? 'text-zinc-700 fill-zinc-700' : 'text-zinc-200'}`} />
          ))}
          <span className="text-[8px] text-zinc-400 ml-1 font-mono font-bold">难度 {difficulty}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-300 !border-zinc-200 !w-1 !h-1 !opacity-60" />
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
      position: { x: col * 200 + 40, y: row * 110 + 40 },
      data: { name: node.name, difficulty: node.difficulty, description: node.description, status },
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
      stroke: nodeStates.get(edge.source) === 'completed' ? '#6366f1' : '#d4d4d8',
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
      <div className="h-full flex items-center justify-center bg-[#f7f7f5] text-zinc-400 text-xs">
        <div className="text-center max-w-[200px]">
          <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-4 text-zinc-500 shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <p className="font-bold text-zinc-800">学习图谱</p>
          <p className="text-[9px] text-zinc-400 mt-1">规划师将为你生成动态知识图谱</p>
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
        <Background color="#e4e4e7" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap nodeColor="#52525b" maskColor="rgba(0,0,0,0.03)" style={{ height: 70, width: 100 }} />
      </ReactFlow>

      {/* 图例 */}
      <div className="absolute bottom-3 left-3 flex gap-3 text-[8px] text-zinc-500 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-zinc-200/60">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-zinc-200" />未解锁</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400" />可学习</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" />学习中</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-400" />已完成</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/KnowledgeGraph.tsx
git commit -m "feat: 知识图谱节点状态着色与图例"
```
