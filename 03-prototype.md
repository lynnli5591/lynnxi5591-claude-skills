# 原型构建规范

## 技术选型

**单文件 HTML**：所有 CSS、JS 内联在一个 .html 文件中，无需构建工具，直接在浏览器打开即可演示。

**设计语言**：Ant Design（企业管理系统首选），通过 CSS 变量实现 Design Token。

## AntD CSS Token（必须在文件顶部定义）

```css
:root {
  --ant-primary: #1677FF;
  --ant-primary-hover: #4096FF;
  --ant-primary-active: #0958D9;
  --ant-primary-bg: #E6F4FF;
  --ant-primary-border: #91CAFF;
  --ant-success: #52C41A;
  --ant-success-bg: #F6FFED;
  --ant-success-border: #B7EB8F;
  --ant-warning: #FAAD14;
  --ant-warning-bg: #FFFBE6;
  --ant-warning-border: #FFE58F;
  --ant-error: #FF4D4F;
  --ant-error-bg: #FFF2F0;
  --ant-error-border: #FFCCC7;
  --ant-text-primary: rgba(0,0,0,.88);
  --ant-text-secondary: rgba(0,0,0,.65);
  --ant-text-tertiary: rgba(0,0,0,.45);
  --ant-border: #D9D9D9;
  --ant-border-secondary: #F0F0F0;
  --ant-fill: #F5F5F5;
  --ant-fill-secondary: #FAFAFA;
  --ant-bg: #FFFFFF;
  --ant-layout-bg: #F5F5F5;
  --ant-layout-header-bg: #001529;
  --ant-radius: 6px;
  --ant-radius-lg: 8px;
  --ant-shadow: 0 1px 2px 0 rgba(0,0,0,.03), 0 1px 6px -1px rgba(0,0,0,.02);
  --ant-font: 'PingFang SC','Microsoft YaHei',system-ui,sans-serif;
}
```

## 页面布局结构

```html
<div class="app">
  <!-- 顶部导航 64px 高，深色背景 -->
  <div class="topbar">...</div>

  <div class="main">
    <!-- 左侧边栏 220px，白色背景 -->
    <aside class="sidebar" id="sidebar-admin">...</aside>
    <aside class="sidebar" id="sidebar-hr" style="display:none">...</aside>

    <!-- 内容区，flex:1，padding:24px -->
    <div class="content">
      <!-- 每个页面一个 div.page，默认 display:none -->
      <div id="page-xxx" class="page">...</div>
    </div>
  </div>
</div>
```

## 组件规范

### 按钮
```html
<button class="btn btn-primary">主操作</button>
<button class="btn btn-ghost">次操作</button>
<button class="btn btn-danger">危险操作</button>
<button class="btn btn-sm">小尺寸</button>
```

### 徽章（状态标签）
```html
<span class="badge badge-green">生效</span>   <!-- 成功/正常 -->
<span class="badge badge-amber">草稿</span>   <!-- 待处理/警告 -->
<span class="badge badge-red">阻断</span>     <!-- 错误/阻断 -->
<span class="badge badge-gray">禁用</span>    <!-- 停用/灰色 -->
<span class="badge badge-blue">AI</span>      <!-- 信息/标注 -->
```

### 卡片
```html
<div class="card">
  <div class="card-title">
    <span>标题</span>
    <button class="btn btn-ghost btn-sm">操作</button>
  </div>
  <!-- 内容 -->
</div>
```

无内边距表格卡片：`<div class="card" style="padding:0">`

### 表格
```html
<div class="table-wrap">
  <table>
    <thead><tr><th>列名</th>...</tr></thead>
    <tbody id="xxx-tbody"></tbody>
  </table>
</div>
```
**永远用 JS 渲染 tbody**，不要在 HTML 里写死数据行。

### 提示条
```html
<div class="notice notice-info">...</div>   <!-- 蓝色信息 -->
<div class="notice notice-warn">...</div>   <!-- 黄色警告 -->
<div class="notice notice-err">...</div>    <!-- 红色错误 -->
```

### 右侧抽屉
```html
<!-- 遮罩 -->
<div class="drawer-mask" id="xxx-mask" onclick="closeXxxDrawer()"></div>
<!-- 抽屉 -->
<div class="drawer" id="xxx-drawer">
  <div class="drawer-header">
    <div class="drawer-title" id="xxx-title">标题</div>
    <button class="drawer-close" onclick="closeXxxDrawer()">×</button>
  </div>
  <div class="drawer-body">...</div>
  <div class="drawer-footer">
    <button class="btn btn-ghost" onclick="closeXxxDrawer()">取消</button>
    <button class="btn btn-primary" onclick="saveXxx()">保存</button>
  </div>
</div>
```

打开/关闭：
```javascript
function openXxxDrawer() {
  document.getElementById('xxx-mask').classList.add('open');
  document.getElementById('xxx-drawer').classList.add('open');
}
function closeXxxDrawer() {
  document.getElementById('xxx-mask').classList.remove('open');
  document.getElementById('xxx-drawer').classList.remove('open');
}
```

### 弹窗 Modal
```html
<div class="modal-overlay" id="xxx-modal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">标题</div>
      <button class="modal-close" onclick="closeXxxModal()">×</button>
    </div>
    <div class="modal-body">...</div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeXxxModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmXxx()">确认</button>
    </div>
  </div>
</div>
```

## 数据与渲染规范

### 数据定义（文件顶部 JS 区）
```javascript
// 用 const 定义静态数据，let 定义可变数据
const gradeData = [
  { name: 'P3', level: '算法工程师', range: '¥800–¥1,500', count: 128, status: '生效' },
  ...
];
```

### 渲染函数
```javascript
function renderGradeTable() {
  document.getElementById('grade-tbody').innerHTML = gradeData.map((r, i) => `
    <tr>
      <td>${r.name}</td>
      <td><button onclick="openEdit(${i})">编辑</button></td>
    </tr>`).join('');
}
```

### 初始化
```javascript
// 文件末尾统一调用所有 render 函数
renderGradeTable();
renderMatchTable();
renderBudget();
// ...
```

## 导航系统

```javascript
// 声明各端页面列表
const adminPages = ['grade', 'match', 'validate'];
const hrPages = ['dashboard', 'review', 'budget'];

// 侧边栏高亮索引（只计 .sidebar-item，不计 section 和 divider）
const adminSidebarMap = { grade: 0, match: 1, validate: 2 };
const hrSidebarMap = { dashboard: 0, review: 1, budget: 2 };

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const isHR = hrPages.includes(id);
  const sidebar = isHR ? document.getElementById('sidebar-hr') : document.getElementById('sidebar-admin');
  const map = isHR ? hrSidebarMap : adminSidebarMap;
  sidebar.querySelectorAll('.sidebar-item').forEach((el, i) =>
    el.classList.toggle('active', map[id] === i));
}
```

**常见 Bug**：侧边栏索引算错，导致菜单高亮跑偏。
**解决**：数 `.sidebar-item` 的 DOM 顺序，`.sidebar-section` 和 `.divider` 不算。

## 文件组织顺序

```
1. <!DOCTYPE html> + <head> + CSS
2. <body> + 顶部导航
3. 侧边栏（管理员）
4. 侧边栏（HR）
5. 内容区（所有 page div）
6. 弹窗 Modal（按功能顺序）
7. 抽屉 Drawer（按功能顺序）
8. <script>
   - DATA（所有数据）
   - RENDER（所有渲染函数）
   - 功能模块函数（按模块分组）
   - NAVIGATION（showPage / switchModule / switchTab）
   - INIT（所有 render 调用）
```
