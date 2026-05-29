# Python 函数

## 定义函数

```python
def greet(name):
    """向某人问好"""
    return f"你好，{name}！"

result = greet("小明")  # "你好，小明！"
```

## 参数类型

```python
# 默认参数
def power(base, exp=2):
    return base ** exp

# 关键字参数
def info(name, age, city="北京"):
    print(f"{name}, {age}岁, 来自{city}")

info(name="小红", age=20, city="上海")

# 可变参数
def total(*numbers):
    return sum(numbers)

total(1, 2, 3, 4)  # 10
```

## Lambda 表达式

```python
square = lambda x: x ** 2
numbers = [1, 2, 3, 4, 5]
squared = list(map(square, numbers))  # [1, 4, 9, 16, 25]
```

## 作用域

- **局部变量**: 函数内定义，函数外不可访问
- **全局变量**: 函数外定义，函数内可读取
- **global 关键字**: 在函数内修改全局变量

```python
x = 10  # 全局

def modify():
    global x
    x = 20  # 修改全局变量

modify()
print(x)  # 20
```
