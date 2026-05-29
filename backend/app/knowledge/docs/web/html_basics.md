# HTML 基础与语义化

## 文档结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面标题</title>
</head>
<body>
    <header>页头</header>
    <main>主要内容</main>
    <footer>页脚</footer>
</body>
</html>
```

## 语义化标签

语义化标签让 HTML 更有意义：
- `<header>`: 页头或区块头部
- `<nav>`: 导航链接
- `<main>`: 页面主要内容（唯一）
- `<article>`: 独立的内容块
- `<section>`: 主题分组
- `<aside>`: 侧边栏内容
- `<footer>`: 页脚

## 常用标签

- 标题：`<h1>` 到 `<h6>`
- 段落：`<p>`
- 链接：`<a href="url">文本</a>`
- 图片：`<img src="url" alt="描述">`
- 列表：`<ul>/<ol>` + `<li>`
- 表格：`<table>` + `<thead>/<tbody>` + `<tr>/<th>/<td>`

## 表单元素

```html
<form action="/submit" method="POST">
    <label for="name">姓名</label>
    <input type="text" id="name" name="name" required>

    <label for="email">邮箱</label>
    <input type="email" id="email" name="email">

    <select name="city">
        <option value="beijing">北京</option>
        <option value="shanghai">上海</option>
    </select>

    <button type="submit">提交</button>
</form>
```
