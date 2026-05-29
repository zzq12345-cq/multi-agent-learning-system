# 栈与队列

## 栈（Stack）

后进先出（LIFO）的数据结构。

```python
# Python 用 list 实现栈
stack = []
stack.append(1)   # push
stack.append(2)
stack.append(3)
top = stack.pop() # pop -> 3
peek = stack[-1]  # peek -> 2
```

经典应用：
- 括号匹配
- 函数调用栈
- 表达式求值
- 浏览器前进/后退

### 括号匹配示例

```python
def is_valid(s: str) -> bool:
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}

    for char in s:
        if char in '([{':
            stack.append(char)
        elif char in ')]}':
            if not stack or stack[-1] != pairs[char]:
                return False
            stack.pop()

    return len(stack) == 0
```

## 队列（Queue）

先进先出（FIFO）的数据结构。

```python
from collections import deque

queue = deque()
queue.append(1)      # enqueue（入队）
queue.append(2)
queue.append(3)
front = queue.popleft()  # dequeue（出队）-> 1
```

经典应用：
- BFS 广度优先搜索
- 任务调度
- 消息队列
- 打印队列
