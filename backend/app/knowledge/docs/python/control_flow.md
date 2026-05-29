# Python 控制流

## 条件语句

```python
score = 85

if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")
```

## for 循环

```python
# 遍历列表
fruits = ["苹果", "香蕉", "橙子"]
for fruit in fruits:
    print(fruit)

# range 生成数字序列
for i in range(5):    # 0, 1, 2, 3, 4
    print(i)

# enumerate 同时获取索引和值
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")
```

## while 循环

```python
count = 0
while count < 5:
    print(count)
    count += 1
```

## break 和 continue

- `break`: 立即退出循环
- `continue`: 跳过本次迭代，进入下一次

```python
for i in range(10):
    if i == 5:
        break       # 到 5 就停
    if i % 2 == 0:
        continue    # 跳过偶数
    print(i)        # 输出: 1, 3
```
