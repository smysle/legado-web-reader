# DD-0003: Legado-Compatible Web Reader

**Status:** Draft
**Author:** Noah (Claude Opus sub-agent)
**Date:** 2026-02-21
**Repo:** legado-web-reader

---

## 1. Background / 背景

[Legado (阅读3.0)](https://github.com/gedoor/legado) 是一款流行的开源 Android 阅读器（44k+ stars），其核心特性是**用户可自定义书源规则**——通过 JSON 描述搜索、详情、目录、正文的提取规则（支持 CSS/XPath/JSONPath/正则/JS），实现从任意网站抓取小说内容。

当前痛点：
- Legado 仅有 Android 客户端，桌面/Web 用户无法使用。
- 已有的 Web 实现 [hectorqin/reader](https://github.com/hectorqin/reader) 使用 Kotlin + Spring Boot 后端，直接复用了 Legado 的 JVM 核心库（Rhino JS 引擎、JsoupXpath 等），**技术栈重、部署复杂**，且核心代码已不再完全开源。
- 我们需要一个**轻量级**的 Web 实现，后端用 Node.js/Python，前端为现代 SPA，便于自部署。

## 2. Goals / 目标

- **G1**: 解析 Legado 书源 JSON 规范，支持核心提取引擎：CSS Selector、XPath、JSONPath、正则替换。
- **G2**: 实现三大核心流程：搜索书籍 → 获取目录 → 阅读正文（含翻页/下一页）。
- **G3**: 前后端分离，定义清晰的 REST API 契约，前端 (Claude) 与后端 (Codex) 可并行开发。
- **G4**: 支持导入本地书源文件（`.json`），并持久化到服务端。
- **G5**: 响应式 Web UI，适配桌面和移动端，提供舒适的阅读体验（字体/主题/排版可调）。

## 3. Non-Goals / 非目标

- **不支持** Legado 的 JavaScript 引擎规则（`@js:`、`<js>...</js>`）。这需要完整的 JS 沙箱运行时，复杂度过高，留作 v2。
- **不支持** webView 加载模式、资源嗅探（`sourceRegex`）。
- **不支持** 书源的登录认证流程（`loginUrl`/`loginUi`）。
- **不支持** 音频源（`bookSourceType: 1`）和图片/漫画源（`bookSourceType: 2`）。仅处理文本类（`type: 0`）。
- **不支持** RSS 订阅源。
- **不做**多用户系统 / 权限管理。单用户自部署场景。
- **不做**书架同步（WebDAV 等）。

## 4. Proposal / 方案

### 4.1 架构概述

```
┌─────────────────────────────────────────────────────┐
│                   Browser (SPA)                      │
│  ┌───────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │ BookSource │ │  Search  │ │   Reader View      │  │
│  │  Manager   │ │  & List  │ │ (Chapter Content)  │  │
│  └─────┬─────┘ └────┬─────┘ └─────────┬──────────┘  │
│        │             │                 │              │
│        └─────────────┴─────────────────┘              │
│                      │ REST API                       │
└──────────────────────┼────────────────────────────────┘
                       │ HTTP (JSON)
┌──────────────────────┼────────────────────────────────┐
│              Backend (Node.js / Python)                │
│  ┌───────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │ BookSource │ │  Rule Engine │ │   HTTP Proxy     │  │
│  │  Storage   │ │  (CSS/XPath/ │ │  (fetch target   │  │
│  │ (SQLite/   │ │  JSONPath/   │ │   sites, bypass  │  │
│  │  JSON file)│ │  Regex)      │ │   CORS)          │  │
│  └───────────┘ └─────────────┘ └──────────────────┘  │
└───────────────────────────────────────────────────────┘
```

**核心分工：**
- **前端**：UI 渲染、用户交互、阅读体验。不直接请求目标网站。
- **后端**：代理网络请求（解决 CORS）、执行规则引擎解析 HTML/JSON 响应、管理书源存储。

### 4.2 方案对比

| 维度 | 方案 A: Node.js 后端 | 方案 B: Python 后端 |
|------|---------------------|---------------------|
| CSS/XPath 解析 | cheerio + xpath (成熟) | lxml + cssselect (极成熟) |
| JSONPath | jsonpath-plus | jsonpath-ng |
| HTTP 请求 | node-fetch / axios | httpx / requests |
| 性能 | 异步 I/O，高并发友好 | 需 async (httpx)，稍逊 |
| 部署 | 单 binary (pkg) 或 Docker | Docker / venv |
| 生态与偏好 | 与前端同语言 | 解析库更强 |

**选择：Node.js**（方案 A）。理由：前后端同语言降低维护成本；cheerio 对 Legado CSS 规则天然兼容（Legado 本身用 Jsoup，cheerio 是 Node 世界的 Jsoup）；异步 I/O 适合大量代理请求。

### 4.3 Legado 书源 JSON 规范（关键字段）

书源是一个 JSON 对象（或对象数组），核心字段：

```typescript
interface BookSource {
  bookSourceUrl: string;      // 唯一标识 & 基础 URL
  bookSourceName: string;     // 源名称
  bookSourceGroup?: string;   // 分组
  bookSourceType: number;     // 0=文本, 1=音频, 2=图片
  header?: string;            // 全局请求头 (JSON string)
  searchUrl?: string;         // 搜索 URL 模板, 含 {{key}} {{page}}
  exploreUrl?: string;        // 发现页 URL
  enabled?: boolean;
  
  ruleSearch?: SearchRule;
  ruleBookInfo?: BookInfoRule;
  ruleToc?: TocRule;
  ruleContent?: ContentRule;
}

interface SearchRule {
  bookList?: string;    // 列表定位规则
  name?: string;        // 书名
  author?: string;      // 作者
  intro?: string;       // 简介
  kind?: string;        // 分类
  lastChapter?: string; // 最新章节
  coverUrl?: string;    // 封面
  bookUrl?: string;     // 详情页 URL
  wordCount?: string;   // 字数
}

interface BookInfoRule {
  init?: string;        // 预处理
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  coverUrl?: string;
  tocUrl?: string;      // 目录页 URL (可能与详情页不同)
  wordCount?: string;
}

interface TocRule {
  chapterList?: string;   // 章节列表定位
  chapterName?: string;   // 章节名
  chapterUrl?: string;    // 章节 URL
  isVip?: string;         // VIP 标识
  nextTocUrl?: string;    // 目录下一页
}

interface ContentRule {
  content?: string;         // 正文提取
  title?: string;           // 标题 (从正文页获取)
  nextContentUrl?: string;  // 正文下一页
  replaceRegex?: string;    // 净化替换
}
```

**规则语法识别（后端实现）：**

| 前缀/特征 | 引擎 | 示例 |
|-----------|------|------|
| `@css:` | CSS Selector | `@css:.book-list > li` |
| `@XPath:` 或 `//` 开头 | XPath | `//div[@class="content"]/text()` |
| `@json:` 或 `$.` 开头 | JSONPath | `$.data.list` |
| 无前缀（含 `@` 分隔） | JSOUP Default | `class.odd.0@tag.a.0@text` |
| `##regex##replacement` 后缀 | 正则净化 | `content##广告文字##` |

### 4.4 REST API 契约（前后端接口）

Base URL: `http://localhost:3001/api`

---

#### 4.4.1 书源管理

**POST /sources/import**
导入书源（上传 JSON 文件或 JSON body）

```
Request:
  Content-Type: multipart/form-data | application/json
  Body: BookSource[] (JSON array)

Response 200:
{
  "imported": 15,
  "duplicates": 2,
  "errors": [{ "index": 3, "reason": "missing bookSourceUrl" }]
}
```

**GET /sources**
获取所有书源列表

```
Query: ?group=<group>&enabled=true&search=<keyword>

Response 200:
{
  "sources": [{
    "bookSourceUrl": "https://www.example.com",
    "bookSourceName": "示例源",
    "bookSourceGroup": "默认",
    "bookSourceType": 0,
    "enabled": true
  }, ...]
}
```

**GET /sources/:id**
获取单个书源详情（id = URL-safe encoded bookSourceUrl）

```
Response 200:
{ ...完整 BookSource 对象 }
```

**PUT /sources/:id**
更新书源

**DELETE /sources/:id**
删除书源

**DELETE /sources**
批量删除

```
Body: { "ids": ["encoded-url-1", "encoded-url-2"] }
```

---

#### 4.4.2 搜索

**GET /search**
搜索书籍

```
Query:
  keyword=<搜索关键词>       (必填)
  sourceId=<bookSourceUrl>  (可选, 指定单个源; 不传则搜所有已启用源)
  page=1                    (可选, 默认 1)

Response 200:
{
  "results": [{
    "sourceId": "https://www.example.com",
    "sourceName": "示例源",
    "name": "斗破苍穹",
    "author": "天蚕土豆",
    "intro": "...",
    "kind": "玄幻",
    "lastChapter": "第1648章 大结局",
    "coverUrl": "https://...",
    "bookUrl": "https://www.example.com/book/123",
    "wordCount": "530万字"
  }, ...],
  "hasMore": false
}
```

多源搜索时后端并发请求，通过 SSE (Server-Sent Events) 流式返回可选。MVP 用普通 JSON 即可。

---

#### 4.4.3 书籍详情

**GET /book/info**

```
Query:
  sourceId=<bookSourceUrl>   (必填)
  bookUrl=<书籍详情页 URL>    (必填)

Response 200:
{
  "name": "斗破苍穹",
  "author": "天蚕土豆",
  "intro": "这里是修炼为尊的世界...",
  "kind": "玄幻",
  "lastChapter": "第1648章",
  "coverUrl": "https://...",
  "tocUrl": "https://www.example.com/book/123/chapters",
  "wordCount": "530万字"
}
```

---

#### 4.4.4 目录

**GET /book/toc**

```
Query:
  sourceId=<bookSourceUrl>   (必填)
  tocUrl=<目录页 URL>        (必填, 通常来自 /book/info 的 tocUrl 或 bookUrl)

Response 200:
{
  "chapters": [
    { "name": "第一章 陨落的天才", "url": "https://.../chapter/1", "isVip": false },
    { "name": "第二章 斗之气三段", "url": "https://.../chapter/2", "isVip": false },
    ...
  ]
}
```

后端自动处理 `nextTocUrl` 分页，一次性返回完整目录。

---

#### 4.4.5 正文

**GET /book/content**

```
Query:
  sourceId=<bookSourceUrl>   (必填)
  chapterUrl=<章节 URL>      (必填)

Response 200:
{
  "title": "第一章 陨落的天才",
  "content": "斗气大陆，没有花俏的魔法...<p>第二段...</p>...",
  "contentType": "html",
  "nextContentUrl": null
}
```

`contentType` 可为 `"html"` 或 `"text"`。后端已执行 `replaceRegex` 净化。
若 `nextContentUrl` 非空，前端可再次请求拼接（长章节分页）。

---

#### 4.4.6 书架（本地）

书架数据存前端 localStorage 即可（MVP）。后端可选提供持久化接口。

**GET /bookshelf**
**POST /bookshelf**
**DELETE /bookshelf/:id**

```typescript
interface BookshelfItem {
  id: string;              // sourceId + bookUrl 的 hash
  sourceId: string;
  bookUrl: string;
  name: string;
  author: string;
  coverUrl?: string;
  lastReadChapter?: string;
  lastReadTime?: number;
}
```

---

### 4.5 规则引擎设计（后端核心）

```
                  ┌─────────────────┐
   HTML/JSON ────►│  Rule Dispatcher │
   Response       │  (识别前缀)      │
                  └───────┬─────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
     ┌────────────┐ ┌──────────┐ ┌───────────┐
     │CSS/Default │ │  XPath   │ │ JSONPath  │
     │ (cheerio)  │ │(xpath    │ │(jsonpath- │
     │            │ │ lib)     │ │ plus)     │
     └─────┬──────┘ └────┬─────┘ └─────┬─────┘
           │              │             │
           └──────────────┴─────────────┘
                          │
                   ┌──────▼──────┐
                   │ Regex Post- │
                   │ processor   │
                   │ (##re##rep) │
                   └─────────────┘
```

**规则分发逻辑（伪代码）：**

```javascript
function applyRule(content, rule, baseUrl) {
  // 1. 分离净化后缀: rule##regex##replace
  const [mainRule, ...regexParts] = splitRegex(rule);
  
  // 2. 识别引擎
  let result;
  if (mainRule.startsWith('@css:')) {
    result = cssEngine(content, mainRule.slice(5));
  } else if (mainRule.startsWith('@XPath:') || mainRule.startsWith('//')) {
    result = xpathEngine(content, mainRule);
  } else if (mainRule.startsWith('@json:') || mainRule.startsWith('$.')) {
    result = jsonPathEngine(content, mainRule);
  } else {
    result = jsoupDefaultEngine(content, mainRule);
  }
  
  // 3. 正则净化
  if (regexParts.length) {
    result = applyRegex(result, regexParts);
  }
  
  // 4. URL 补全
  if (isUrlField) {
    result = resolveUrl(result, baseUrl);
  }
  
  return result;
}
```

**JSOUP Default 引擎**（Legado 独有语法）需要特别实现：
- `@` 分隔符分段
- 每段格式：`type.name.index`（如 `class.odd.0`）
- 最后一段为取值：`text`, `href`, `src`, `html`, `textNodes`, `ownText`, `all`
- `&&`（合并）、`||`（或）、`%%`（交叉）连接符

### 4.6 前端设计

**技术栈：** Vue 3 + Vite + TypeScript + Pinia + TailwindCSS

**页面结构：**

| 页面 | 路由 | 功能 |
|------|------|------|
| 书源管理 | `/sources` | 导入/查看/启禁用/删除书源 |
| 搜索 | `/search` | 输入关键词 → 多源搜索 → 结果列表 |
| 书籍详情 | `/book/:id` | 书名/作者/简介/封面 + 目录列表 |
| 阅读器 | `/reader/:id/:chapter` | 正文显示 + 上下章切换 |
| 书架 | `/` (首页) | 收藏的书籍网格/列表 |

**阅读器特性（MVP）：**
- 滚动模式阅读
- 字体大小 / 行间距 / 页面宽度可调
- 亮色 / 暗色 / 护眼主题
- 上一章 / 下一章导航
- 阅读进度记忆（localStorage）

### 4.7 数据存储

| 数据 | 存储位置 | 说明 |
|------|---------|------|
| 书源列表 | 后端 SQLite (`sources` 表) | bookSourceUrl 为主键 |
| 书架 | 前端 localStorage (MVP) | 后续可迁移到后端 |
| 阅读进度 | 前端 localStorage | chapterIndex + scrollPosition |
| 缓存 (正文) | 后端内存 LRU / Redis (可选) | 减少重复请求 |

### 4.8 搜索URL模板渲染

Legado 的 `searchUrl` 含 `{{key}}`、`{{page}}` 模板变量，也支持复杂 JS 表达式（如 `{{(page-1)*20}}`）。

MVP 实现策略：
- 用正则匹配 `{{...}}`
- 对简单变量直接替换
- 对表达式用 `new Function()` 在沙箱中 eval（仅算术和 key/page 变量）
- 不执行任意 JS 调用（如 `java.base64Encode()`）

### 4.9 项目结构

```
legado-web-reader/
├── docs/
│   └── design/
│       └── 0003-legado-web-reader.md   ← 本文档
├── frontend/                            ← Claude 负责
│   ├── src/
│   │   ├── api/          # API 调用层
│   │   ├── components/   # UI 组件
│   │   ├── views/        # 页面
│   │   ├── stores/       # Pinia stores
│   │   ├── types/        # TypeScript 类型
│   │   └── utils/        # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── backend/                             ← Codex 负责
│   ├── src/
│   │   ├── routes/       # API 路由
│   │   ├── engine/       # 规则引擎
│   │   │   ├── css.ts
│   │   │   ├── xpath.ts
│   │   │   ├── jsonpath.ts
│   │   │   ├── jsoup-default.ts
│   │   │   ├── regex.ts
│   │   │   └── dispatcher.ts
│   │   ├── services/     # 业务逻辑
│   │   ├── models/       # 数据模型
│   │   └── utils/        # HTTP client, URL resolve
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
└── README.md
```

## 5. Risks / 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Legado 规则语法复杂，JSOUP Default 引擎无现成 JS 库 | 部分书源不兼容 | MVP 先支持 CSS/XPath/JSONPath 三大标准引擎；JSOUP Default 分阶段实现 |
| 不支持 JS 规则导致大量书源不可用 | 用户体验 | 导入时标记不兼容规则，UI 提示用户；v2 引入 JS 沙箱 |
| 目标网站反爬（频率限制、验证码） | 请求失败 | 后端实现请求间隔（`concurrentRate`）、UA 伪装、错误重试 |
| 书源规范未有官方文档，靠逆向代码 | 边缘 case 多 | 以 Legado 源码为准，持续测试主流书源 |
| 前后端并行开发，接口理解不一致 | 联调成本 | 本文档锁定 API 契约 + 提供 mock 数据 |

## 6. Test Plan / 测试方案

- [ ] **后端单元测试**：每个规则引擎（CSS/XPath/JSONPath/JSOUP Default/Regex）的独立测试，用固定 HTML/JSON fixtures
- [ ] **后端集成测试**：导入 3-5 个真实书源 JSON，验证 搜索 → 详情 → 目录 → 正文 全流程
- [ ] **前端组件测试**：阅读器视图、书源导入、搜索结果列表
- [ ] **E2E 测试**：Playwright 驱动完整用户流程
- [ ] **手动验证**：至少 10 个不同类型的真实书源（CSS 类、XPath 类、JSONPath 类）

## 7. Rollback Plan / 回滚方案

- 项目为全新开发，无线上环境，无需回滚。
- 若规则引擎实现有严重 bug，可降级为「只支持 CSS Selector」模式，确保核心可用。
- 数据存储使用 SQLite 文件，可直接备份/恢复。

## 8. Decision Log / 决策变更记录

| 日期 | 变更 | 原因 |
|------|------|------|
| 2026-02-21 | 初始设计 | DD-0003 创建 |

---

_Generated by DD workflow · Claude Opus sub-agent_
