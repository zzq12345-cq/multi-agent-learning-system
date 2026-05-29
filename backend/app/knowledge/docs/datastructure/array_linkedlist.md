# 数组与链表

## 数组

数组是连续内存中存储相同类型元素的数据结构。

```python
# Python 列表（动态数组）
arr = [1, 2, 3, 4, 5]

# 访问：O(1)
print(arr[2])  # 3

# 插入末尾：O(1) 均摊
arr.append(6)

# 插入中间：O(n)
arr.insert(2, 99)  # [1, 2, 99, 3, 4, 5, 6]

# 删除：O(n)
arr.pop(2)  # 删除索引 2
```

时间复杂度：
- 访问：O(1)
- 搜索：O(n)
- 插入/删除（末尾）：O(1)
- 插入/删除（中间）：O(n)

## 链表

链表通过指针连接节点，不需要连续内存。

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# 创建链表：1 -> 2 -> 3
head = ListNode(1, ListNode(2, ListNode(3)))

# 遍历
current = head
while current:
    print(current.val)
    current = current.next

# 插入节点（在 head 后插入 99）
new_node = ListNode(99)
new_node.next = head.next
head.next = new_node

# 删除节点（删除 head 的下一个）
head.next = head.next.next
```

链表 vs 数组：
- 链表插入/删除 O(1)（已知位置），数组 O(n)
- 数组随机访问 O(1)，链表 O(n)
- 数组缓存友好，链表内存碎片化
