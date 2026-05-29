# Task 10: 补充学科知识图谱

**Files:**
- Create: `backend/app/knowledge/web_graph.py`
- Create: `backend/app/knowledge/datastructure_graph.py`
- Modify: `backend/app/api/learning.py`
- Modify: `backend/app/api/chat.py`（增加图谱 API）

---

- [ ] **Step 1: 创建 Web 前端开发知识图谱**

创建 `backend/app/knowledge/web_graph.py`：

```python
"""预置 Web 前端开发知识图谱"""

WEB_KNOWLEDGE_GRAPH = {
    "title": "Web 前端开发入门到进阶",
    "description": "系统学习 Web 前端开发，从 HTML/CSS 到 React 框架",
    "domain": "web",
    "estimated_hours": 50,
    "nodes": [
        {
            "id": "w1",
            "name": "HTML 基础",
            "description": "HTML 文档结构、常用标签、语义化标签、表单元素",
            "difficulty": 1,
            "estimated_minutes": 90,
            "prerequisites": [],
            "learning_objectives": ["理解 HTML 文档结构", "掌握常用标签", "学会语义化"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w2",
            "name": "CSS 基础",
            "description": "选择器、盒模型、布局基础、颜色与字体",
            "difficulty": 1,
            "estimated_minutes": 120,
            "prerequisites": ["w1"],
            "learning_objectives": ["掌握 CSS 选择器", "理解盒模型", "基础样式编写"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w3",
            "name": "CSS 布局",
            "description": "Flexbox、Grid、定位、响应式设计",
            "difficulty": 2,
            "estimated_minutes": 150,
            "prerequisites": ["w2"],
            "learning_objectives": ["掌握 Flexbox", "掌握 Grid", "响应式布局"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w4",
            "name": "JavaScript 基础",
            "description": "变量、数据类型、运算符、条件、循环、函数",
            "difficulty": 2,
            "estimated_minutes": 180,
            "prerequisites": ["w1"],
            "learning_objectives": ["掌握 JS 基本语法", "理解数据类型", "编写函数"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w5",
            "name": "DOM 操作",
            "description": "DOM 查询、事件处理、动态修改页面",
            "difficulty": 2,
            "estimated_minutes": 120,
            "prerequisites": ["w4", "w2"],
            "learning_objectives": ["DOM 查询与修改", "事件监听", "动态交互"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w6",
            "name": "ES6+ 特性",
            "description": "箭头函数、解构、模块化、Promise、async/await",
            "difficulty": 3,
            "estimated_minutes": 150,
            "prerequisites": ["w4"],
            "learning_objectives": ["掌握 ES6 语法", "理解异步编程", "模块化开发"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w7",
            "name": "React 基础",
            "description": "组件、JSX、Props、State、事件处理",
            "difficulty": 3,
            "estimated_minutes": 180,
            "prerequisites": ["w5", "w6"],
            "learning_objectives": ["理解组件化", "掌握 JSX", "状态管理基础"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w8",
            "name": "React Hooks",
            "description": "useState、useEffect、useRef、自定义 Hook",
            "difficulty": 3,
            "estimated_minutes": 150,
            "prerequisites": ["w7"],
            "learning_objectives": ["掌握常用 Hooks", "理解副作用", "自定义 Hook"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w9",
            "name": "路由与状态管理",
            "description": "React Router、Zustand/Redux、全局状态",
            "difficulty": 4,
            "estimated_minutes": 120,
            "prerequisites": ["w8"],
            "learning_objectives": ["前端路由", "全局状态管理", "数据流设计"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "w10",
            "name": "项目实战",
            "description": "综合项目：Todo App / 博客系统，打包部署",
            "difficulty": 4,
            "estimated_minutes": 240,
            "prerequisites": ["w9", "w3"],
            "learning_objectives": ["独立完成项目", "工程化实践", "部署上线"],
            "resource_types": ["note", "exercise", "code_example"],
        },
    ],
    "edges": [
        {"source": "w1", "target": "w2", "relation": "prerequisite"},
        {"source": "w2", "target": "w3", "relation": "prerequisite"},
        {"source": "w1", "target": "w4", "relation": "prerequisite"},
        {"source": "w4", "target": "w5", "relation": "prerequisite"},
        {"source": "w2", "target": "w5", "relation": "prerequisite"},
        {"source": "w4", "target": "w6", "relation": "prerequisite"},
        {"source": "w5", "target": "w7", "relation": "prerequisite"},
        {"source": "w6", "target": "w7", "relation": "prerequisite"},
        {"source": "w7", "target": "w8", "relation": "prerequisite"},
        {"source": "w8", "target": "w9", "relation": "prerequisite"},
        {"source": "w9", "target": "w10", "relation": "prerequisite"},
        {"source": "w3", "target": "w10", "relation": "prerequisite"},
    ],
}
```

- [ ] **Step 2: 创建数据结构与算法知识图谱**

创建 `backend/app/knowledge/datastructure_graph.py`：

```python
"""预置数据结构与算法知识图谱"""

DS_KNOWLEDGE_GRAPH = {
    "title": "数据结构与算法",
    "description": "系统学习常用数据结构与经典算法",
    "domain": "datastructure",
    "estimated_hours": 45,
    "nodes": [
        {
            "id": "d1",
            "name": "复杂度分析",
            "description": "时间复杂度、空间复杂度、大 O 表示法",
            "difficulty": 1,
            "estimated_minutes": 60,
            "prerequisites": [],
            "learning_objectives": ["理解复杂度概念", "掌握大 O 分析", "常见复杂度对比"],
            "resource_types": ["note", "exercise"],
        },
        {
            "id": "d2",
            "name": "数组与链表",
            "description": "数组操作、单链表、双链表、循环链表",
            "difficulty": 1,
            "estimated_minutes": 90,
            "prerequisites": ["d1"],
            "learning_objectives": ["数组增删查改", "链表实现", "对比优劣"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "d3",
            "name": "栈与队列",
            "description": "栈的应用、队列变体、单调栈、优先队列",
            "difficulty": 2,
            "estimated_minutes": 90,
            "prerequisites": ["d2"],
            "learning_objectives": ["栈的经典应用", "队列实现", "单调栈技巧"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "d4",
            "name": "哈希表",
            "description": "哈希函数、冲突解决、HashMap 实现",
            "difficulty": 2,
            "estimated_minutes": 75,
            "prerequisites": ["d2"],
            "learning_objectives": ["哈希原理", "冲突处理", "实际应用"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "d5",
            "name": "树与二叉树",
            "description": "二叉树遍历、BST、AVL、堆",
            "difficulty": 3,
            "estimated_minutes": 150,
            "prerequisites": ["d3"],
            "learning_objectives": ["树的遍历", "BST 操作", "堆的应用"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "d6",
            "name": "图论基础",
            "description": "图的表示、BFS、DFS、拓扑排序",
            "difficulty": 3,
            "estimated_minutes": 120,
            "prerequisites": ["d5", "d3"],
            "learning_objectives": ["图的存储", "BFS/DFS", "拓扑排序"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "d7",
            "name": "排序算法",
            "description": "冒泡、快排、归并、堆排序、计数排序",
            "difficulty": 2,
            "estimated_minutes": 120,
            "prerequisites": ["d2", "d5"],
            "learning_objectives": ["经典排序实现", "复杂度对比", "稳定性分析"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "d8",
            "name": "递归与分治",
            "description": "递归思想、分治策略、经典问题",
            "difficulty": 3,
            "estimated_minutes": 90,
            "prerequisites": ["d7"],
            "learning_objectives": ["递归设计", "分治模板", "经典应用"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "d9",
            "name": "动态规划",
            "description": "DP 思想、状态转移、经典 DP 问题",
            "difficulty": 4,
            "estimated_minutes": 180,
            "prerequisites": ["d8"],
            "learning_objectives": ["DP 建模", "状态转移方程", "空间优化"],
            "resource_types": ["note", "exercise", "code_example"],
        },
        {
            "id": "d10",
            "name": "贪心与回溯",
            "description": "贪心策略、回溯模板、剪枝优化",
            "difficulty": 4,
            "estimated_minutes": 120,
            "prerequisites": ["d8", "d6"],
            "learning_objectives": ["贪心证明", "回溯框架", "剪枝技巧"],
            "resource_types": ["note", "exercise", "code_example"],
        },
    ],
    "edges": [
        {"source": "d1", "target": "d2", "relation": "prerequisite"},
        {"source": "d2", "target": "d3", "relation": "prerequisite"},
        {"source": "d2", "target": "d4", "relation": "prerequisite"},
        {"source": "d3", "target": "d5", "relation": "prerequisite"},
        {"source": "d5", "target": "d6", "relation": "prerequisite"},
        {"source": "d3", "target": "d6", "relation": "prerequisite"},
        {"source": "d2", "target": "d7", "relation": "prerequisite"},
        {"source": "d5", "target": "d7", "relation": "prerequisite"},
        {"source": "d7", "target": "d8", "relation": "prerequisite"},
        {"source": "d8", "target": "d9", "relation": "prerequisite"},
        {"source": "d8", "target": "d10", "relation": "prerequisite"},
        {"source": "d6", "target": "d10", "relation": "prerequisite"},
    ],
}
```

- [ ] **Step 3: 修改 learning.py 暴露多学科图谱**

完整替换 `backend/app/api/learning.py`：

```python
"""学习相关 API"""

from fastapi import APIRouter
from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH
from app.knowledge.web_graph import WEB_KNOWLEDGE_GRAPH
from app.knowledge.datastructure_graph import DS_KNOWLEDGE_GRAPH

router = APIRouter(prefix="/api/learning", tags=["learning"])

GRAPHS = {
    "python": PYTHON_KNOWLEDGE_GRAPH,
    "web": WEB_KNOWLEDGE_GRAPH,
    "datastructure": DS_KNOWLEDGE_GRAPH,
}


@router.get("/graphs/{domain}")
async def get_knowledge_graph(domain: str):
    """获取指定学科的知识图谱"""
    graph = GRAPHS.get(domain)
    if not graph:
        return {"error": f"未找到 {domain} 学科图谱", "available": list(GRAPHS.keys())}
    return graph


@router.get("/graphs")
async def list_graphs():
    """列出所有可用学科图谱"""
    return {
        "graphs": [
            {"domain": k, "title": v["title"], "nodes_count": len(v["nodes"])}
            for k, v in GRAPHS.items()
        ]
    }


@router.get("/path/{session_id}")
async def get_learning_path(session_id: str):
    """获取用户学习路径（从会话中读取）"""
    from app.api.chat import sessions
    state = sessions.get(session_id)
    if not state:
        return {"session_id": session_id, "path": None}
    return {"session_id": session_id, "path": state.get("learning_path")}


@router.get("/profile/{session_id}")
async def get_profile(session_id: str):
    """获取用户画像"""
    from app.api.chat import sessions
    state = sessions.get(session_id)
    if not state:
        return {"session_id": session_id, "profile": None}
    return {"session_id": session_id, "profile": state.get("user_profile")}
```

- [ ] **Step 4: 验证**

```bash
cd backend && source venv/bin/activate
python -c "from app.knowledge.web_graph import WEB_KNOWLEDGE_GRAPH; from app.knowledge.datastructure_graph import DS_KNOWLEDGE_GRAPH; print(f'Web: {len(WEB_KNOWLEDGE_GRAPH[\"nodes\"])} nodes, DS: {len(DS_KNOWLEDGE_GRAPH[\"nodes\"])} nodes')"
```

Expected: `Web: 10 nodes, DS: 10 nodes`

- [ ] **Step 5: 提交**

```bash
git add backend/app/knowledge/web_graph.py backend/app/knowledge/datastructure_graph.py backend/app/api/learning.py
git commit -m "feat: 补充 Web 前端 + 数据结构与算法知识图谱，多学科 API"
```
