/** 演示剧本 — 事件时间轴回放（对冲现场 LLM 不可用风险的保底设施）
 *
 * 三个章节：能力评估 → 路径规划 → 学习与测试。
 * 每章节是一段 WSEvent 序列，由 DemoMode 按 delay 间隔通过
 * window.dispatchEvent('demo-ws-event') 喂给 ChatPanel 的事件处理管线；
 * token 事件以 20-40ms 间隔回放，产生与真实 LLM 一致的假流式效果。
 */

import type { WSEvent, LearningPath, StudentProfile } from '../types'

export interface DemoScriptEvent {
  /** 与上一事件的间隔（ms） */
  delay: number
  event: WSEvent
}

export interface DemoChapter {
  id: string
  title: string
  description: string
  userMessage: string
  events: DemoScriptEvent[]
}

const TOKEN_DELAY_MIN = 20
const TOKEN_DELAY_MAX = 40
const TOKEN_CHUNK_MIN = 2
const TOKEN_CHUNK_MAX = 4

/** 把整段文本切成 token 事件序列，模拟 LLM 逐字流式输出 */
function streamTokens(text: string): DemoScriptEvent[] {
  const events: DemoScriptEvent[] = []
  let i = 0
  while (i < text.length) {
    const size = TOKEN_CHUNK_MIN + Math.floor(Math.random() * (TOKEN_CHUNK_MAX - TOKEN_CHUNK_MIN + 1))
    events.push({
      delay: TOKEN_DELAY_MIN + Math.floor(Math.random() * (TOKEN_DELAY_MAX - TOKEN_DELAY_MIN + 1)),
      event: { type: 'token', content: text.slice(i, i + size) },
    })
    i += size
  }
  return events
}

/** 路由事件 — reasoning 为 JSON 字符串，与后端格式一致（AgentFlowViz 据此解析置信度徽章） */
function route(from: string, to: string, reasoning: string, confidence: number): DemoScriptEvent {
  return {
    delay: 1100,
    event: {
      type: 'route',
      route_from: from,
      route_to: to,
      reasoning: JSON.stringify({ reasoning, confidence }),
    },
  }
}

function agentEvent(type: 'agent_start' | 'agent_end', agent: string, delay: number): DemoScriptEvent {
  return { delay, event: { type, agent } }
}

// ===== 章节一：能力评估 =====

const DEMO_PROFILE: StudentProfile = {
  knowledge_level: 'beginner',
  learning_style: 'practical',
  goals: ['从零掌握 Python 编程'],
  strengths: ['学习动机明确，目标清晰', '无旧语言习惯负担'],
  weaknesses: ['零编程基础', '易在环境配置阶段受挫'],
}

const PROFILER_REPLY = `已完成初步能力评估 📋

**评估结论**
- 编程基础：零基础（未接触过任何编程语言）
- 学习风格：实践型 —— 建议以「边写边学」为主
- 数学背景：高中数学即可满足入门需求
- 可投入时间：每周约 6-8 小时

**优势**
- 学习动机明确，目标清晰
- 无旧语言习惯负担，可直接建立 Python 思维

**风险提示**
- 零基础阶段易在环境配置受挫，建议先用在线解释器起步
- 缺乏即时反馈容易放弃，路径中将安排高频小测验

学习画像已建立。接下来可以让规划师定制专属学习路径，对我说「帮我规划学习路径」即可。`

// ===== 章节二：路径规划 =====

const DEMO_LEARNING_PATH: LearningPath = {
  title: 'Python 零基础入门',
  description: '面向零基础学习者的 Python 入门路径，采用学→测→调闭环',
  domain: 'python',
  estimated_hours: 32,
  nodes: [
    { id: 'py-basics', name: '变量与数据类型', description: '变量赋值、基本类型与类型转换', difficulty: 1, estimated_minutes: 240, prerequisites: [] },
    { id: 'py-control', name: '控制流程', description: 'if 分支与 for/while 循环', difficulty: 1, estimated_minutes: 300, prerequisites: ['py-basics'] },
    { id: 'py-func', name: '函数与模块', description: '函数定义、参数传递与模块导入', difficulty: 2, estimated_minutes: 360, prerequisites: ['py-control'] },
    { id: 'py-ds', name: '数据结构', description: '列表、字典、元组与集合', difficulty: 2, estimated_minutes: 420, prerequisites: ['py-func'] },
    { id: 'py-file', name: '文件与异常处理', description: '文件读写与 try/except', difficulty: 2, estimated_minutes: 300, prerequisites: ['py-ds'] },
    { id: 'py-project', name: '综合小项目：通讯录管理器', description: '综合运用所学完成命令行项目', difficulty: 3, estimated_minutes: 300, prerequisites: ['py-file'] },
  ],
  edges: [
    { source: 'py-basics', target: 'py-control', relation: 'prerequisite' },
    { source: 'py-control', target: 'py-func', relation: 'prerequisite' },
    { source: 'py-func', target: 'py-ds', relation: 'prerequisite' },
    { source: 'py-ds', target: 'py-file', relation: 'prerequisite' },
    { source: 'py-file', target: 'py-project', relation: 'prerequisite' },
  ],
}

const PLANNER_REPLY = `学习路径已生成 🗺️

**「Python 零基础入门」** · 预计 32 小时 · 6 个知识点

| 阶段 | 知识点 | 难度 | 预计用时 |
|------|--------|------|----------|
| 1 | 变量与数据类型 | ★ | 4h |
| 2 | 控制流程 | ★ | 5h |
| 3 | 函数与模块 | ★★ | 6h |
| 4 | 数据结构 | ★★ | 7h |
| 5 | 文件与异常处理 | ★★ | 5h |
| 6 | 综合小项目：通讯录管理器 | ★★★ | 5h |

路径采用「学 → 测 → 调」闭环：每个知识点学完都有小测验，未达标会自动安排补充讲解再测。

右侧知识图谱已同步更新。对我说「开始学习变量与数据类型」即可进入第一站。`

const NODE_STATES_PLANNED = {
  'py-basics': { status: 'available' },
  'py-control': { status: 'locked' },
  'py-func': { status: 'locked' },
  'py-ds': { status: 'locked' },
  'py-file': { status: 'locked' },
  'py-project': { status: 'locked' },
}

// ===== 章节三：学习与测试 =====

const LECTURE_CONTENT = `# 变量与数据类型

变量是给数据贴的「标签」。Python 无需声明类型，直接赋值即可：

\`\`\`python
name = "小明"      # 字符串 str
age = 18           # 整数 int
height = 1.75      # 浮点数 float
is_student = True  # 布尔值 bool
\`\`\`

**核心概念：动态类型**

Python 在运行时根据值自动判断类型，可用 \`type()\` 随时查看：

\`\`\`python
>>> type(age)
<class 'int'>
\`\`\`

**类型之间如何转换？**

\`\`\`mermaid
flowchart LR
    A["输入字符串 '18'"] --> B{"int('18')"}
    B -->|"成功"| C["整数 18"]
    B -->|"失败 (如 'abc')"| D["抛出 ValueError"]
    C --> E["float() → 18.0"]
    C --> F["str() → '18'"]
\`\`\`

记住一条铁律：**\`input()\` 读进来的永远是字符串**，参与算术运算前必须先转换类型——这是新手最常踩的坑。

讲解完毕，接下来评估师会出几道小题检验掌握情况。`

const QUIZ_CONTENT = `📝 **学习检测 · 变量与数据类型**（共 3 题）

**第 1 题** (选择) 执行 \`x = input()\` 并输入 18 后，\`type(x)\` 的结果是？
A. <class 'int'>
B. <class 'str'>
C. <class 'float'>
D. <class 'bool'>

**第 2 题** (选择) 下列哪个变量名是合法的？
A. 2name
B. class
C. user_age
D. user-age

**第 3 题** (选择) 表达式 \`int('3.14')\` 的执行结果是？
A. 3
B. 3.14
C. 抛出 ValueError
D. '3'

答完后点击「提交答案」，我会立即批改并更新你的掌握度。`

const NODE_STATES_LEARNING = {
  ...NODE_STATES_PLANNED,
  'py-basics': { status: 'in_progress' },
}

// ===== 完整剧本 =====

export const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: 'assess',
    title: '能力评估',
    description: '画像师评估零基础学习者并建立学习画像',
    userMessage: '你好，我是一名大一学生，完全没有编程经验，想从零开始学 Python，请先评估一下我的水平。',
    events: [
      agentEvent('agent_start', 'coordinator', 500),
      route('coordinator', 'profiler', '用户为新学习者且请求能力评估，无历史画像，转交画像师建档', 0.92),
      agentEvent('agent_end', 'coordinator', 300),
      agentEvent('agent_start', 'profiler', 250),
      ...streamTokens(PROFILER_REPLY),
      {
        delay: 500,
        event: {
          type: 'done',
          agent: 'profiler',
          user_profile: DEMO_PROFILE,
          agent_outputs: {
            coordinator: JSON.stringify({ reasoning: '意图识别：能力评估 → profiler', confidence: 0.92 }),
            profiler: '完成零基础学习者画像：实践型 / 每周 6-8 小时',
          },
        },
      },
      agentEvent('agent_end', 'profiler', 120),
    ],
  },
  {
    id: 'plan',
    title: '路径规划',
    description: '规划师基于画像生成六节点学习路径',
    userMessage: '请根据我的画像，帮我规划一条零基础 Python 学习路径。',
    events: [
      agentEvent('agent_start', 'coordinator', 500),
      route('coordinator', 'planner', '画像已建立且用户请求路径规划，转交规划师生成知识图谱', 0.95),
      agentEvent('agent_end', 'coordinator', 300),
      agentEvent('agent_start', 'planner', 250),
      ...streamTokens(PLANNER_REPLY),
      {
        delay: 500,
        event: {
          type: 'done',
          agent: 'planner',
          learning_path: DEMO_LEARNING_PATH,
          node_states: NODE_STATES_PLANNED,
          agent_outputs: {
            coordinator: JSON.stringify({ reasoning: '意图识别：路径规划 → planner', confidence: 0.95 }),
            planner: '生成「Python 零基础入门」路径：6 节点 / 32 小时',
          },
        },
      },
      agentEvent('agent_end', 'planner', 120),
    ],
  },
  {
    id: 'learn',
    title: '学习与测试',
    description: '生成器讲解知识点，评估师出题并经审查层互审',
    userMessage: '开始学习第一个知识点：变量与数据类型。',
    events: [
      agentEvent('agent_start', 'coordinator', 500),
      route('coordinator', 'generator', '学习请求命中路径节点「变量与数据类型」，转交生成器产出讲义', 0.9),
      agentEvent('agent_end', 'coordinator', 300),
      agentEvent('agent_start', 'generator', 250),
      ...streamTokens(LECTURE_CONTENT),
      { delay: 500, event: { type: 'done', agent: 'generator' } },
      agentEvent('agent_end', 'generator', 150),
      // 学→测闭环：讲义完成后评估师接管出题，先经审查层互审
      route('generator', 'assessor', '讲义已生成，按学→测闭环触发评估师出题', 0.88),
      agentEvent('agent_start', 'assessor', 250),
      {
        delay: 1600,
        event: {
          type: 'review_verdict',
          verdict: 'revise',
          issues: ['第 2 题选项 B 与 D 考点重复，区分度不足', '第 3 题答案在题干中直接出现，难度低于节点要求'],
          round: 1,
        },
      },
      { delay: 1800, event: { type: 'review_verdict', verdict: 'pass', issues: [], round: 2 } },
      ...streamTokens(QUIZ_CONTENT),
      {
        delay: 500,
        event: {
          type: 'done',
          agent: 'assessor',
          node_states: NODE_STATES_LEARNING,
          agent_outputs: {
            generator: '生成「变量与数据类型」讲义（含类型转换流程图）',
            assessor: '出题 3 道，经互审第 2 轮通过',
          },
        },
      },
      agentEvent('agent_end', 'assessor', 120),
    ],
  },
]
