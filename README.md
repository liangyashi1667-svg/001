# 纪脉

根据会议纪要链接，自动识别项目进度、总结每次会议，并生成可分享的 HTML 进度报告。

## 功能

- 输入多个纪要链接（公开网页 / Markdown），或粘贴原文
- 抽取会议日期、决议、行动项、风险与进度百分比
- 汇总项目阶段、健康度、时间线与优先待办
- 生成独立 HTML 报告（可预览 / 新窗口打开 / 下载）

## 快速开始

```bash
npm install
npm start
```

浏览器打开 [http://localhost:3780](http://localhost:3780)，点击「使用示例纪要」即可体验。

## API

### `POST /api/analyze`

```json
{
  "projectName": "智能客服平台",
  "links": [
    "/samples/meetings/2026-01-08-kickoff.md",
    "/samples/meetings/2026-01-22-requirement.md"
  ],
  "texts": []
}
```

返回 `analysis`（结构化结果）与 `html`（完整报告页）。

### `GET /api/samples`

列出内置示例纪要路径。

## 本地示例

仓库内 `samples/meetings/` 提供 4 份中文示例纪要，覆盖启动会 → 需求评审 → 开发同步 → 上线前评审。

也可命令行生成演示报告：

```bash
npm run analyze:demo
```

输出文件：`output/demo-report.html`。

## 说明

- 外链需可公开访问；受站点反爬 / 登录墙限制时，请改用粘贴原文。
- 进度识别基于纪要中的结构化章节与百分比表述，适合中文会议纪要模板。
