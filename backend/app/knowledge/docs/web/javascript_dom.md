# JavaScript DOM 操作

## 查询元素

```javascript
// 单个元素
const el = document.getElementById('app')
const el2 = document.querySelector('.class-name')

// 多个元素
const items = document.querySelectorAll('.item')
items.forEach(item => console.log(item.textContent))
```

## 修改内容和样式

```javascript
const title = document.querySelector('h1')
title.textContent = '新标题'           // 修改文本
title.innerHTML = '<em>斜体</em>'      // 修改 HTML
title.style.color = 'red'             // 修改样式
title.classList.add('active')          // 添加类名
title.classList.toggle('hidden')       // 切换类名
```

## 事件处理

```javascript
const btn = document.querySelector('button')

btn.addEventListener('click', (event) => {
    console.log('按钮被点击', event.target)
})

// 事件委托（处理动态元素）
document.querySelector('.list').addEventListener('click', (e) => {
    if (e.target.matches('.item')) {
        console.log('点击了列表项', e.target.textContent)
    }
})
```

## 创建和插入元素

```javascript
const newDiv = document.createElement('div')
newDiv.textContent = '新元素'
newDiv.className = 'card'

document.body.appendChild(newDiv)           // 末尾插入
parent.insertBefore(newDiv, referenceNode)  // 指定位置插入
element.remove()                            // 删除元素
```
