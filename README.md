# FIOIU8://PULSE

> FIOIU8 的静态 GitHub 个人主页 — 原生 HTML / CSS / JavaScript 构建，零依赖、零构建步骤，直接读取公开 GitHub 数据并实时展示个人资料、贡献热力图、仓库浏览与 DevInfo 项目专题。

---

## 目录

- [✨ 功能特性](#-功能特性)
- [🎨 设计亮点](#-设计亮点)
- [📁 项目结构](#-项目结构)
- [🔌 数据来源](#-数据来源)
- [🚀 本地运行](#-本地运行)
- [🌐 浏览器兼容性](#-浏览器兼容性)
- [🔧 维护指南](#-维护指南)
- [❓ 常见问题](#-常见问题)
- [📄 License](#-license)

---

## ✨ 功能特性

### 个人主页
- **资料总览** — 头像、昵称、简介与 GitHub 链接，数据从 GitHub API 实时拉取
- **数据概览栏** — 公开仓库数、关注者、获得 Stars、Forks 四项核心指标

### 贡献热力图
- **年度轨迹** — 展示过去 365+ 天的贡献记录，支持悬停 / 键盘聚焦查看日期与贡献次数
- **优雅降级** — 优先使用 `github-contributions-api.jogruber.de`；服务不可用时自动回退到 GitHub Events API 生成可用热力图

### 仓库浏览
- **语言筛选** — 按 Kotlin / Java / JS / TS / Python / Go / Rust 等语言快速过滤
- **关键词搜索** — 实时匹配仓库名称与描述
- **卡片式布局** — 展示仓库名、语言、描述、Stars、Forks、更新时间

### 形变详情层
- **FLIP 动画** — 点击仓库卡片后，详情层从该卡片位置形变展开；关闭时精确回缩到原卡片
- **垂直居中 + 滚动** — 内容自动垂直居中，超出视口时保持可滚动
- **无障碍支持** — `Esc` 键关闭、背景点击关闭、焦点管理与 ARIA 属性齐全

### DevInfo 专题页
- 独立的二级页面 `./DevInfo/`，围绕设备信息工具展开
- 章节涵盖：设备数据采集、实时监控、模块导出、实现策略、构建基线、发布流程
- 事实与应用截图取自 [DevInfo 官方 README](https://github.com/FIOIU8/DevInfo/blob/main/README.md)

---

## 🎨 设计亮点

| 维度 | 说明 |
| --- | --- |
| **配色系统** | 深色界面（`#07090e` 背景 + `#ddb15a` 暖金强调色），设计令牌集中定义于 `styles.css` 的 `:root` |
| **字体排版** | 标题使用 Syne，中文正文 Noto Serif SC，代码数据 DM Mono，三类字体各司其职 |
| **背景纹理** | 24px 间距的细微径向渐变点阵，营造深度感不抢内容注意力 |
| **入场动画** | `IntersectionObserver` 驱动的分段渐显 reveal 动画 |
| **热力图颜色** | 5 级绿色递进，`#16332a` → `#2bd4a6`，直观反映贡献强度 |
| **响应式规则** | 内容最大宽度 1480px，移动端（< 768px）自动压缩间距、单列布局、隐藏次要装饰 |
| **可访问性** | 完整 `aria-label` / `aria-labelledby` / 键盘聚焦可见 / `sr-only` 辅助类 |

---

## 📁 项目结构

零依赖、零构建，纯静态文件即可部署：

```
FIOIU8_My/
├── index.html          # 主页结构：导航栏 + 简介 + 统计 + 热力图 + 仓库
├── styles.css          # 视觉系统：设计令牌 + 响应式 + 动画 + 组件样式
├── app.js              # 交互逻辑：数据请求 + 热力图渲染 + 筛选 + 形变详情层
├── DevInfo/
│   ├── index.html      # DevInfo 专题页
│   └── project.css     # 专题页独立样式
└── README.md
```

### 文件职责速览

| 文件 | 关键职责 |
| --- | --- |
| `index.html` | 语义化结构、ARIA 标注、字体预加载、分区锚点 |
| `styles.css` | CSS 变量（设计令牌）、滚动平滑、容器布局、组件样式、`@media` 断点 |
| `app.js` | `OWNER` / `DEVINFO` 常量、`LANGUAGE_COLORS` 配色、DOM 工具函数、GitHub API 封装、FLIP 动画实现 |
| `DevInfo/index.html` | 项目专题六大章节 + 实时注入仓库数据 |

---

## 🔌 数据来源

所有数据均为公开接口，**无需 Token**：

| 接口 | 用途 | 频率限制 |
| --- | --- | --- |
| `api.github.com/users/{owner}` | 用户资料（昵称、头像、Bio、仓库数、关注者） | 匿名 60 次/小时/IP |
| `api.github.com/users/{owner}/repos` | 仓库列表（含 Stars、Forks、语言、描述） | 同上 |
| `api.github.com/repos/{owner}/{repo}` | 单个仓库详情（含更新时间） | 同上 |
| `api.github.com/users/{owner}/events/public` | 公开事件（热力图回退数据源） | 同上 |
| `github-contributions-api.jogruber.de/v4/{owner}` | 年度贡献数据（热力图首选） | 无公开限制 |

> **降级策略**：当 `jogruber` 接口不可用时（超时 / 4xx / 5xx），`app.js` 会自动切换到 GitHub Events API，仅聚合 Push / PullRequest / Create 事件生成近似热力图。

---

## 🚀 本地运行

项目为纯静态站点，任何静态文件服务器均可：

### 方式 1：Python（推荐，无需额外安装）

```powershell
python -m http.server 4177
```

### 方式 2：Node.js

```powershell
npx serve -l 4177 .
```

### 方式 3：PHP

```powershell
php -S 127.0.0.1:4177
```

### 访问地址

```
主页:     http://127.0.0.1:4177/
DevInfo:  http://127.0.0.1:4177/DevInfo/
```

> 直接双击打开 `index.html` 也能看到大部分内容，但浏览器安全策略可能会阻止部分 `fetch` 请求，建议使用本地服务器。

---

## 🌐 浏览器兼容性

核心特性测试覆盖：

| 浏览器 | 最低版本 | 说明 |
| --- | --- | --- |
| Chrome / Edge | 90+ | 完全支持 |
| Firefox | 88+ | 完全支持 |
| Safari | 14+ | `backdrop-filter` 可能降级 |
| 移动端 Safari | 14+ | 布局与交互已适配 |
| 移动端 Chrome | 90+ | 完全支持 |

使用的现代特性（均有安全回退）：
- CSS 自定义属性（`--token`）
- `IntersectionObserver`
- `requestAnimationFrame` 双帧 FLIP 动画
- ES2020 语法（可选链 `??` / `?.`）

---

## 🔧 维护指南

### 修改用户名 / 项目名

打开 `app.js` 顶部常量：

```js
const OWNER = "FIOIU8";        // ← 改为你的 GitHub 用户名
const DEVINFO = `${OWNER}/DevInfo`;  // ← 改为你的专题仓库（owner/repo）
```

### 自定义主题色 / 设计令牌

所有视觉参数集中在 `styles.css` 的 `:root`：

```css
:root {
  --accent: #ddb15a;           /* 强调色 */
  --content-width: 1480px;     /* 内容最大宽度 */
  --radius: 14px;              /* 圆角半径 */
  --nav-height: 58px;          /* 固定导航栏高度 */
  /* ... 其他变量 */
}
```

### 添加新的语言颜色

在 `app.js` 的 `LANGUAGE_COLORS` 对象中追加：

```js
const LANGUAGE_COLORS = {
  Kotlin: "#a97bff",
  // 新增：
  Vue: "#42b883",
};
```

### 修改形变动画

详情层的展开/回缩依赖 CSS transition + 双帧 rAF。调整尺寸（`--radius`、卡片内边距、详情层宽度）后，请在 **桌面（≥1200px）** 和 **手机（<480px）** 分别验证：

1. 打开 → 形变是否从卡片起点精确对齐
2. 滚动到底 → 关闭后是否回到原卡片
3. 内容超长 → 详情层是否可滚动且不溢出视口

---

## ❓ 常见问题

### Q: 刷新页面后数据不更新，显示旧数据？

GitHub REST API 匿名访问每小时限制 60 次/IP。频繁刷新会触发 403，脚本会缓存上次成功结果。解决方式：
- 稍等 1 小时后重试
- 或在本地清除浏览器缓存后重新访问

### Q: 热力图空白或显示 "无法加载贡献数据"？

可能原因：
1. `jogruber.de` 服务暂时不可用 → 脚本会尝试回退到 Events API
2. 网络拦截（广告屏蔽 / 公司代理）阻止了跨域请求 → 检查浏览器控制台 Network 面板
3. 用户的贡献设为私有 → GitHub 不公开该数据

### Q: 专题页图片不显示？

专题页截图使用 GitHub Raw 公开资源（`raw.githubusercontent.com`），离线环境或网络受限情况下可能无法加载。**文字内容与仓库统计数据不依赖这些图片**，页面功能不受影响。

### Q: 如何部署到 GitHub Pages / Vercel / Netlify？

不需要构建步骤，直接部署根目录即可：
- **GitHub Pages**：Settings → Pages → Source 选择 `main` 分支 `/ (root)`
- **Vercel / Netlify**：拖拽或关联仓库，Build Command 留空，Output Directory 填 `.` 或 `/`

---

## 📄 License

- **本站源码**：**无**。
- **[DevInfo](https://github.com/FIOIU8/DevInfo) 项目**：采用 **GPL-3.0-or-later** — [详见其 LICENSE](https://github.com/FIOIU8/DevInfo/blob/main/LICENSE)
- **第三方 API 数据**：各服务自有条款（GitHub API Terms、jogruber.de 公共服务）
