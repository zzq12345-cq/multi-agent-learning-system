# Python 变量与数据类型

## 变量赋值

Python 中变量不需要声明类型，直接赋值即可：

```python
name = "Alice"    # 字符串
age = 25          # 整数
height = 1.75     # 浮点数
is_student = True # 布尔值
```

## 数据类型

Python 的基本数据类型包括：
- **int**: 整数，如 1, -5, 100
- **float**: 浮点数，如 3.14, -0.5
- **str**: 字符串，如 "hello", 'world'
- **bool**: 布尔值，True 或 False
- **None**: 空值

## 类型转换

```python
x = int("123")      # 字符串转整数 -> 123
y = float("3.14")   # 字符串转浮点 -> 3.14
z = str(42)         # 整数转字符串 -> "42"
```

## 动态类型

Python 是动态类型语言，变量可以随时改变类型：
```python
x = 10       # x 是 int
x = "hello"  # x 变成 str
```
