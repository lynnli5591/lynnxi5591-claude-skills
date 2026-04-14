# 迭代优化规范

## 迭代前必做

**在任何改动前，先读当前文件的相关区域**，不要依赖记忆：

```bash
# 用 grep 快速定位
grep -n "目标关键词" filename.html

# 查看上下文
view filename.html 行号范围
```

## 改动类型分类

### 类型1：字段/文案调整（最简单）
定位到具体字符串，精确替换，影响范围极小。

```
"适用岗位级别" → "适用标准岗位"
```

只需 `str_replace` 精确替换，**不要重写整块**。

### 类型2：列增删（中等）
同时修改两处：HTML 表头 + JS 渲染函数。

```
删除「司龄要求」列：
1. 找 <thead><tr> 删除对应 <th>
2. 找 renderXxxTable() 删除对应 ${r.exp}
3. 找 xxxData 数组删除 exp 字段
```

### 类型3：菜单重组（需更新导航映射）
步骤：
1. 修改侧边栏 HTML（增删 sidebar-item）
2. 更新 adminPages / hrPages 数组
3. 更新 adminSidebarMap / hrSidebarMap（重新数 DOM 索引）
4. 检查是否有其他地方引用了被改动的 page ID

**最容易出 Bug 的地方**：忘记重新数索引，导致菜单高亮错位。

### 类型4：新增页面（完整流程）
1. 侧边栏加菜单项
2. 内容区加 `<div id="page-xxx" class="page">` HTML
3. 添加对应的数据和渲染函数
4. 更新 adminPages/hrPages 和 SidebarMap
5. 在 INIT 区调用新的 render 函数

### 类型5：交互联动（最复杂）
涉及两个模块之间的数据流转或状态同步。

**标准做法**：
1. 明确「谁是数据源」「谁是消费方」
2. 数据源操作完成后调用消费方的 render 函数
3. 不要在消费方存副本，始终从数据源读

例：校验异常处理完 → 申请放行到复核队列
```javascript
function handleException(i) {
  hrValidateData[i].status = '已处理';
  // 重新渲染校验列表
  renderAdminValidate();
  // 将对应申请加入复核队列
  reviewData.push(resolvedItem);
  renderReview();
}
```

## 抽屉/弹窗开发规范

### 详情抽屉（只读）
- 点击列表中的名称/链接触发
- 展示：基本信息 + 历史记录 + AI 备注
- 底部操作：关闭 / 快捷跳转编辑

### 编辑抽屉（读写）
- 点击「编辑」按钮触发，传入 index
- 表单预填当前数据
- 保存后：更新数据数组 + 关闭抽屉 + 重新渲染列表

```javascript
let editIndex = -1;
function openEditDrawer(i) {
  editIndex = i;
  const r = dataArray[i];
  document.getElementById('ed-name').value = r.name;
  // ... 填充其他字段
  document.getElementById('edit-mask').classList.add('open');
  document.getElementById('edit-drawer').classList.add('open');
}
function saveEdit() {
  dataArray[editIndex].name = document.getElementById('ed-name').value;
  closeEditDrawer();
  renderTable();
}
```

### 关联抽屉（多对多）
适用于：档次关联薪资项目、规则关联场景等。

关键：用 pendingXxx 暂存操作，保存时才写入数据。
```javascript
let pendingLinked = [];
function openLinkDrawer(i) {
  pendingLinked = [...dataArray[i].linkedItems]; // 复制，不引用
  renderLinkedList();
  renderPicker();
}
function link(code) {
  if (!pendingLinked.includes(code)) pendingLinked.push(code);
  renderLinkedList(); renderPicker();
}
function unlink(code) {
  pendingLinked = pendingLinked.filter(c => c !== code);
  renderLinkedList(); renderPicker();
}
function saveLink() {
  dataArray[currentIndex].linkedItems = [...pendingLinked];
  closeDrawer(); renderTable();
}
```

## 语法验证（每次改动后必做）

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('filename.html','utf8');
const m=html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
fs.writeFileSync('/tmp/t.js',m[1]);
" && node --check /tmp/t.js 2>&1 && echo "✓ 语法正常"
```

**常见语法错误**：
- 模板字符串内的三元表达式中混入多余的 `;`
  - 错误：`${x ? 'a' : 'b';}` → 正确：`${x ? 'a' : 'b'}`
- 模板字符串嵌套引号冲突
  - 在 template literal 里的 onclick 用单引号，属性用双引号

## 版本管理

每次重大功能迭代后更新版本号：
```html
<!-- title -->
<title>系统名称 v2.0</title>

<!-- topbar logo 旁 -->
<span style="font-size:11px;color:rgba(255,255,255,.45);background:rgba(255,255,255,.1);
  padding:2px 7px;border-radius:10px;margin-left:4px">v2.0</span>
```

版本号规则：
- 小改动（字段、文案）：不更新
- 功能新增/删除：小版本 +0.1
- 架构调整/角色重组：大版本 +1.0

## 输出文件

改动完成后：
1. 语法验证通过
2. `present_files` 呈现文件给用户
3. 告知改动摘要（不超过 5 条，每条一句话）
