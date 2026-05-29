"""预置 Web 前端开发知识图谱"""

WEB_KNOWLEDGE_GRAPH = {
    "title": "Web 前端开发入门到进阶",
    "description": "系统学习 Web 前端开发，从 HTML/CSS 到 React 框架",
    "domain": "web",
    "estimated_hours": 50,
    "nodes": [
        {"id": "w1", "name": "HTML 基础", "description": "HTML 文档结构、常用标签、语义化标签、表单元素", "difficulty": 1, "estimated_minutes": 90, "prerequisites": [], "learning_objectives": ["理解 HTML 文档结构", "掌握常用标签", "学会语义化"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w2", "name": "CSS 基础", "description": "选择器、盒模型、布局基础、颜色与字体", "difficulty": 1, "estimated_minutes": 120, "prerequisites": ["w1"], "learning_objectives": ["掌握 CSS 选择器", "理解盒模型", "基础样式编写"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w3", "name": "CSS 布局", "description": "Flexbox、Grid、定位、响应式设计", "difficulty": 2, "estimated_minutes": 150, "prerequisites": ["w2"], "learning_objectives": ["掌握 Flexbox", "掌握 Grid", "响应式布局"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w4", "name": "JavaScript 基础", "description": "变量、数据类型、运算符、条件、循环、函数", "difficulty": 2, "estimated_minutes": 180, "prerequisites": ["w1"], "learning_objectives": ["掌握 JS 基本语法", "理解数据类型", "编写函数"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w5", "name": "DOM 操作", "description": "DOM 查询、事件处理、动态修改页面", "difficulty": 2, "estimated_minutes": 120, "prerequisites": ["w4", "w2"], "learning_objectives": ["DOM 查询与修改", "事件监听", "动态交互"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w6", "name": "ES6+ 特性", "description": "箭头函数、解构、模块化、Promise、async/await", "difficulty": 3, "estimated_minutes": 150, "prerequisites": ["w4"], "learning_objectives": ["掌握 ES6 语法", "理解异步编程", "模块化开发"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w7", "name": "React 基础", "description": "组件、JSX、Props、State、事件处理", "difficulty": 3, "estimated_minutes": 180, "prerequisites": ["w5", "w6"], "learning_objectives": ["理解组件化", "掌握 JSX", "状态管理基础"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w8", "name": "React Hooks", "description": "useState、useEffect、useRef、自定义 Hook", "difficulty": 3, "estimated_minutes": 150, "prerequisites": ["w7"], "learning_objectives": ["掌握常用 Hooks", "理解副作用", "自定义 Hook"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w9", "name": "路由与状态管理", "description": "React Router、Zustand/Redux、全局状态", "difficulty": 4, "estimated_minutes": 120, "prerequisites": ["w8"], "learning_objectives": ["前端路由", "全局状态管理", "数据流设计"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "w10", "name": "项目实战", "description": "综合项目：Todo App / 博客系统，打包部署", "difficulty": 4, "estimated_minutes": 240, "prerequisites": ["w9", "w3"], "learning_objectives": ["独立完成项目", "工程化实践", "部署上线"], "resource_types": ["note", "exercise", "code_example"]},
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
