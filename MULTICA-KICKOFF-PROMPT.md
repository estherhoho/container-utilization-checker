# Multica Kickoff Prompt — Container Utilization Checker / CBM Calculator

> 复制下面内容给 Multica，用来启动这个新工具项目。

---

你现在是我的 **Multica Product Squad**，请启动新产品：

```text
Container Utilization Checker / CBM Calculator
```

中文名：

```text
装柜利用率检查器 / CBM 计算器
```

## 0. 项目路径

所有文件必须保存在：

```text
/Users/estherho/sc_product/products/container-utilization-checker/
```

不要使用旧路径：

```text
/Users/estherho/Documents/Codex/sc_product/
```

不要把这个产品混进当前 Scanner 原型目录：

```text
/Users/estherho/sc_product/code/snapshot-prototype/
```

## 1. 产品目标

做一个 static website tool，帮助 importer、ecommerce brand、warehouse / ops team 快速判断：

- 货物总 CBM 是多少？
- 20GP / 40GP / 40HQ 是否装得下？
- 体积利用率是多少？
- 重量利用率是多少？
- 是否超 payload？
- 是否应该换柜型、拆柜、调整 carton size、或进一步做 container mix optimization？

第一版必须是简单、可用、可手机 review 的工具。

## 1A. Esther 已确认的 MVP 边界

请按以下已确认决策执行，不要重复询问：

- v0.2 只做 single carton line manual input，一次输入一种箱规和数量。
- CSV upload、multiple SKU/carton lines 放到 v1.1，不阻塞第一版。
- 第一版暂时不做 email capture，也不做 PDF/report download。
- `Download utilization report` 可以作为 future CTA 文案保留，但不要做成 broken button 或假下载。
- Container constants 先使用 DEV-PLAN 里的 planning values：20GP 33 CBM / 28200 KG，40GP 67 CBM / 26700 KG，40HQ 76 CBM / 26500 KG。
- 页面必须清楚说明这些 container constants 是 planning estimates，不是装柜保证。

## 2. AI element 原则

这个工具的核心计算不是 AI。

核心计算必须用 deterministic formula：

- CBM
- volume utilization
- payload utilization
- fit / not fit
- over payload warning
- recommended container type

AI element / recommendation layer 用于：

- 解释为什么利用率低
- 给下一步行动建议
- 生成给 supplier / forwarder 的邮件
- 生成 report summary
- 推荐下一个相关工具

第一版可以先用规则型 recommendation，不一定接 OpenAI API。

## 3. Agent 分工

请按以下 agent squad 执行：

### Product Manager Agent

请输出：

- `PRODUCT-SPEC.md`
- target user
- job-to-be-done
- MVP scope
- out of scope
- success criteria
- monetization path
- website category / URL / CTA

### Supply Chain SME Agent

请输出：

- container specs assumptions
- 20GP / 40GP / 40HQ baseline dimensions and payload
- CBM formula validation
- edge cases
- importer / forwarder / warehouse use cases
- `data/notes/DATA-PLAN.md`

### UX Designer Agent

请输出：

- user flow
- first-screen layout
- input form design
- result page layout
- mobile-first review
- empty/error/loading states

### Developer Agent

请先不要写复杂 app。第一版用 static HTML/CSS/JS。

请输出：

- `code/index.html`
- `code/styles.css`
- `code/app.js`
- deterministic calculation functions
- validation rules
- sample data if needed
- instructions to run locally

### QA Reviewer Agent

请输出：

- `REVIEW-GATE.md`
- P0/P1/P2/P3 findings
- formula sanity checks
- mobile/desktop QA
- placeholder check
- launch readiness

### Launch / Marketing Agent

请输出：

- website tool card copy
- SEO title
- SEO description
- LinkedIn launch draft
- 小红书 launch draft
- Esther review summary

## 4. MVP 输入

第一版支持 manual form input：

- carton length
- carton width
- carton height
- unit: inch / cm
- cartons quantity
- gross weight per carton
- weight unit: lb / kg
- container type: 20GP / 40GP / 40HQ
- stackable: yes / no

可选：

- shipment name
- product category
- shipment value

CSV upload 和 multiple SKU/carton lines 作为 v1.1，不要阻塞第一版。

## 5. MVP 输出

必须输出：

- total CBM
- total gross weight
- selected container max volume
- selected container max payload
- volume utilization %
- payload utilization %
- fit / not fit
- over payload warning
- recommended container type
- wasted space estimate
- action recommendation

结果页优先显示：

1. Can it fit?
2. Best container recommendation
3. Utilization score
4. What to do next
5. Supporting detail / chart

不要先放大图表。

## 6. Website 信息

Website category:

```text
Ocean Freight & Importing
```

URL:

```text
/tools/ocean-import/container-utilization-checker
```

Tool card one-liner:

```text
Check carton CBM, container fit, volume utilization, payload risk, and next-step recommendations before you book freight.
```

Primary CTA:

```text
Check My Container
```

Secondary CTA:

```text
Download utilization report (future CTA; do not implement as a fake download in v0.2)
```

## 7. Review 要求

每次请求 Esther review，必须输出中文摘要：

```markdown
# Esther 快速 Review 摘要

## 当前阶段
PRD Review / UX Review / Launch Review

## 你需要判断的 3 件事
1.
2.
3.

## 本轮主要变化
-
-
-

## 请点击 review
- 手机可打开 Preview URL:
- 本地路径:
- PRODUCT-SPEC:
- REVIEW-GATE:
- Desktop screenshot:
- Mobile screenshot:

## 你的反馈模板
- 保留：
- 必改：
- 可选：
- 新想法：
```

如果没有 Vercel preview URL，不要只给 `file://`。请至少提供 screenshots。

## 8. 请先输出，不要直接写代码

请先输出：

1. 你理解的产品方向。
2. 你准备派出的 agent squad。
3. 推荐 MVP scope。
4. 你要创建/更新的文件列表。
5. 你需要 Esther 确认的问题。

等 Esther 确认后，再开始写文件或代码。
