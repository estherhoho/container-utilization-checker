# Container Utilization Checker / CBM Calculator 项目指令

## 项目定位

这是 `/Users/estherho/sc_product/` 下第一个按标准产品流程启动的新工具项目。

目标不是先做完整 SaaS，而是做一个 **static website tool**：

```text
用户输入 carton / shipment 信息
→ 工具计算 CBM、体积利用率、重量利用率
→ 输出推荐柜型、风险提醒、下一步行动建议
→ 用户可下载/留资/预约咨询
```

v0.2 只实现计算器和规则型建议。下载报告、email capture、预约咨询 CTA 是后续转化路径，不要作为第一版必做功能。

## Canonical Path

```text
/Users/estherho/sc_product/products/container-utilization-checker/
```

## Website URL 建议

```text
/tools/ocean-import/container-utilization-checker
```

## 产品阶段

当前阶段：

```text
Project Kickoff / PRD Draft
```

不要直接 public launch。先完成：

1. PRODUCT-SPEC
2. Data Plan
3. UX Flow
4. DEV-PLAN
5. Static MVP
6. REVIEW-GATE
7. Vercel Preview
8. Esther Review

## 核心原则

- 计算必须用确定性公式，不要让 AI 猜。
- AI element 用在解释、建议、行动计划、邮件/报告生成。
- 第一版可以没有真实 LLM API，用规则型 recommendation layer。
- 页面首屏必须是工具体验，不是品牌介绍页。
- 结果页先给可执行建议，再给图表。
- 必须支持手机 review。
- 每次请求 Esther review，都要有中文快速摘要和链接列表。

## 不做范围

第一版不做：

- 3D bin packing
- photo container scan
- login
- saved dashboard
- subscription
- real-time freight rates
- carrier/forwarder API
- complex palletization optimization

## 成功定义

MVP 成功必须满足：

- 用户能输入箱规、数量、重量、柜型。
- 用户能看到 total CBM。
- 用户能看到 volume utilization。
- 用户能看到 weight/payload utilization。
- 用户能看到是否超重或利用率过低。
- 用户能比较 20GP / 40GP / 40HQ。
- 用户能得到一段下一步行动建议。
- 用户能在手机打开 Vercel preview review。
- REVIEW-GATE 没有 P0 blocker。
