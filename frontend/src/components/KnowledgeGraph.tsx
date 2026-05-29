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
import type { LearningPath } from '../types'
import { Star, Compass } from 'lucide-react'

// 自定义知识节点组件 (便签卡片风格)
function CustomKnowledgeNode({ data }: { data: any }) {
  const { name, difficulty } = data

  return (
    <div className="relative px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-left w-[170px] shadow-[0_1px_3px_rgba(0,0,0,0.01),0_4px_16px_-8px_rgba(0,0,0,0.02)] group hover:border-zinc-400 transition-all duration-200">
      {/* 隐藏的 ReactFlow 端口 */}
      <Handle type="target" position={Position.Top} className="!bg-zinc-300 !border-zinc-200 !w-1 !h-1 !opacity-60" />
      
      {/* 精致极简墨黑顶小指示条 */}
      <div 
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" 
        style={{
          background: difficulty > 2 ? '#3f3f46' : '#a1a1aa'
        }}
      />

      <div className="flex flex-col gap-1.5 pt-0.5">
        <span className="text-[10px] font-bold text-zinc-900 line-clamp-1 group-hover:text-black transition-colors">
          {name}
        </span>
        
        {/* 难度星级与标注 */}
        <div className="flex gap-0.5 items-center">
          {[1, 2, 3].map((star) => (
            <Star 
              key={star} 
              className={`w-2.5 h-2.5 ${star <= difficulty ? 'text-zinc-700 fill-zinc-700' : 'text-zinc-200'}`} 
            />
          ))}
          <span className="text-[8px] text-zinc-400 ml-1 font-mono font-bold">难度 {difficulty}</span>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-300 !border-zinc-200 !w-1 !h-1 !opacity-60" />
    </div>
  )
}

const nodeTypes = {
  custom: CustomKnowledgeNode,
}

// 将知识图谱数据转换为 ReactFlow 节点和边
function graphToFlow(path: LearningPath) {
  const nodes: Node[] = path.nodes.map((node, index) => {
    // 优化的分层布局
    const col = index % 3
    const row = Math.floor(index / 3)

    return {
      id: node.id,
      type: 'custom',
      position: { x: col * 190 + 40, y: row * 100 + 40 },
      data: {
        name: node.name,
        difficulty: node.difficulty,
        description: node.description,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }
  })

  const edges: Edge[] = path.edges.map((edge, i) => ({
    id: `e-${i}`,
    source: edge.source,
    target: edge.target,
    animated: false, // 移去流光数据动画，回归纯净插图质感
    style: { stroke: '#d4d4d8', strokeWidth: 1 },
  }))

  return { nodes, edges }
}

export default function KnowledgeGraph() {
  const { learningPath } = useAppStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [defaultGraph, setDefaultGraph] = useState<LearningPath | null>(null)

  // 加载预置图谱作为默认展示
  useEffect(() => {
    getPythonGraph().then((data) => {
      if (data) setDefaultGraph(data)
    })
  }, [])

  // 当学习路径更新时，重新渲染图谱
  useEffect(() => {
    const path = learningPath || defaultGraph
    if (!path || !path.nodes?.length) return

    const { nodes: flowNodes, edges: flowEdges } = graphToFlow(path)
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [learningPath, defaultGraph, setNodes, setEdges])

  if (!nodes.length) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f7f7f5] text-zinc-400 text-xs">
        <div className="text-center max-w-[200px]">
          <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-4 text-zinc-500 shadow-sm">
            <Compass className="w-4.5 h-4.5 animate-spin-slow" />
          </div>
          <p className="font-bold text-zinc-800">学习图谱加载中</p>
          <p className="text-[9px] text-zinc-400 mt-1 leading-relaxed">规划师将在这里为你搭建动态知识神经图谱。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#e4e4e7" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor="#52525b"
          maskColor="rgba(0,0,0,0.03)"
          style={{ height: 70, width: 100 }}
        />
      </ReactFlow>
    </div>
  )
}
