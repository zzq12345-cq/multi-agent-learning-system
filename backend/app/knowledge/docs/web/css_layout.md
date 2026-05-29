# CSS 布局

## Flexbox 弹性布局

Flexbox 是一维布局模型，适合行或列方向的排列。

```css
.container {
    display: flex;
    justify-content: center;    /* 主轴对齐 */
    align-items: center;        /* 交叉轴对齐 */
    gap: 16px;                  /* 子项间距 */
}

.item {
    flex: 1;                    /* 等分剩余空间 */
    flex-shrink: 0;             /* 不缩小 */
}
```

主轴对齐（justify-content）：
- `flex-start`: 起点对齐
- `center`: 居中
- `space-between`: 两端对齐，中间等分
- `space-around`: 等距环绕

## Grid 网格布局

Grid 是二维布局模型，同时控制行和列。

```css
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);  /* 3 等分列 */
    grid-template-rows: auto;
    gap: 20px;
}

.span-2 {
    grid-column: span 2;  /* 跨 2 列 */
}
```

## 响应式设计

```css
/* 移动优先 */
.container { padding: 16px; }

/* 平板 */
@media (min-width: 768px) {
    .container { padding: 32px; max-width: 720px; }
}

/* 桌面 */
@media (min-width: 1024px) {
    .container { max-width: 960px; }
}
```
