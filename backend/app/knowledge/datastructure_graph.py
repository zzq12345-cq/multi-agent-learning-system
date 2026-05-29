"""预置数据结构与算法知识图谱"""

DS_KNOWLEDGE_GRAPH = {
    "title": "数据结构与算法",
    "description": "系统学习常用数据结构与经典算法",
    "domain": "datastructure",
    "estimated_hours": 45,
    "nodes": [
        {"id": "d1", "name": "复杂度分析", "description": "时间复杂度、空间复杂度、大 O 表示法", "difficulty": 1, "estimated_minutes": 60, "prerequisites": [], "learning_objectives": ["理解复杂度概念", "掌握大 O 分析", "常见复杂度对比"], "resource_types": ["note", "exercise"]},
        {"id": "d2", "name": "数组与链表", "description": "数组操作、单链表、双链表、循环链表", "difficulty": 1, "estimated_minutes": 90, "prerequisites": ["d1"], "learning_objectives": ["数组增删查改", "链表实现", "对比优劣"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "d3", "name": "栈与队列", "description": "栈的应用、队列变体、单调栈、优先队列", "difficulty": 2, "estimated_minutes": 90, "prerequisites": ["d2"], "learning_objectives": ["栈的经典应用", "队列实现", "单调栈技巧"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "d4", "name": "哈希表", "description": "哈希函数、冲突解决、HashMap 实现", "difficulty": 2, "estimated_minutes": 75, "prerequisites": ["d2"], "learning_objectives": ["哈希原理", "冲突处理", "实际应用"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "d5", "name": "树与二叉树", "description": "二叉树遍历、BST、AVL、堆", "difficulty": 3, "estimated_minutes": 150, "prerequisites": ["d3"], "learning_objectives": ["树的遍历", "BST 操作", "堆的应用"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "d6", "name": "图论基础", "description": "图的表示、BFS、DFS、拓扑排序", "difficulty": 3, "estimated_minutes": 120, "prerequisites": ["d5", "d3"], "learning_objectives": ["图的存储", "BFS/DFS", "拓扑排序"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "d7", "name": "排序算法", "description": "冒泡、快排、归并、堆排序、计数排序", "difficulty": 2, "estimated_minutes": 120, "prerequisites": ["d2", "d5"], "learning_objectives": ["经典排序实现", "复杂度对比", "稳定性分析"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "d8", "name": "递归与分治", "description": "递归思想、分治策略、经典问题", "difficulty": 3, "estimated_minutes": 90, "prerequisites": ["d7"], "learning_objectives": ["递归设计", "分治模板", "经典应用"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "d9", "name": "动态规划", "description": "DP 思想、状态转移、经典 DP 问题", "difficulty": 4, "estimated_minutes": 180, "prerequisites": ["d8"], "learning_objectives": ["DP 建模", "状态转移方程", "空间优化"], "resource_types": ["note", "exercise", "code_example"]},
        {"id": "d10", "name": "贪心与回溯", "description": "贪心策略、回溯模板、剪枝优化", "difficulty": 4, "estimated_minutes": 120, "prerequisites": ["d8", "d6"], "learning_objectives": ["贪心证明", "回溯框架", "剪枝技巧"], "resource_types": ["note", "exercise", "code_example"]},
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
