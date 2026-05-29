# React 基础

## 组件与 JSX

React 组件是返回 JSX 的函数：

```jsx
function Welcome({ name }) {
    return <h1>你好，{name}！</h1>
}

// 使用组件
<Welcome name="小明" />
```

JSX 规则：
- 必须有单个根元素（或用 `<>...</>` Fragment）
- class 写成 className
- 内联样式用对象：`style={{ color: 'red' }}`
- 表达式用花括号：`{variable}`

## State 状态

```jsx
import { useState } from 'react'

function Counter() {
    const [count, setCount] = useState(0)

    return (
        <div>
            <p>计数：{count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
        </div>
    )
}
```

## Props 属性

```jsx
function Card({ title, children }) {
    return (
        <div className="card">
            <h2>{title}</h2>
            <div>{children}</div>
        </div>
    )
}

<Card title="标题">
    <p>这是卡片内容</p>
</Card>
```

## 条件渲染与列表

```jsx
function UserList({ users, isLoggedIn }) {
    if (!isLoggedIn) return <p>请先登录</p>

    return (
        <ul>
            {users.map(user => (
                <li key={user.id}>{user.name}</li>
            ))}
        </ul>
    )
}
```

## useEffect 副作用

```jsx
import { useState, useEffect } from 'react'

function DataFetcher({ url }) {
    const [data, setData] = useState(null)

    useEffect(() => {
        fetch(url)
            .then(res => res.json())
            .then(setData)

        return () => { /* 清理函数 */ }
    }, [url])  // 依赖数组

    return data ? <pre>{JSON.stringify(data)}</pre> : <p>加载中...</p>
}
```
