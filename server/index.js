import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeDocuments } from "./analyzer.js";
import { fetchDocument, listSampleMeetings } from "./fetcher.js";
import { renderReportHtml } from "./report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 3780);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/samples", express.static(path.join(ROOT, "samples")));
app.use(express.static(path.join(ROOT, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "纪脉", port: PORT });
});

app.get("/api/samples", async (_req, res) => {
  try {
    const samples = await listSampleMeetings();
    res.json({ samples });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { links = [], texts = [], projectName = "" } = req.body || {};
    const inputs = [];

    for (const link of links) {
      if (String(link || "").trim()) inputs.push({ type: "url", value: String(link).trim() });
    }
    for (const text of texts) {
      if (String(text || "").trim()) {
        inputs.push({
          type: "url",
          value: `text://${encodeURIComponent(String(text).trim())}`,
        });
      }
    }

    if (!inputs.length) {
      return res.status(400).json({ error: "请至少提供一个链接或一段纪要文本" });
    }

    const documents = [];
    const errors = [];
    for (const item of inputs) {
      try {
        documents.push(await fetchDocument(item.value));
      } catch (err) {
        errors.push({ input: item.value.startsWith("text://") ? "[粘贴文本]" : item.value, error: err.message || String(err) });
      }
    }

    if (!documents.length) {
      return res.status(422).json({ error: "全部链接抓取失败", errors });
    }

    const analysis = analyzeDocuments(documents, { projectName });
    const html = renderReportHtml(analysis);

    res.json({
      analysis,
      html,
      errors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post("/api/report.html", async (req, res) => {
  try {
    const { links = [], texts = [], projectName = "" } = req.body || {};
    const documents = [];
    for (const link of links) {
      if (String(link || "").trim()) documents.push(await fetchDocument(String(link).trim()));
    }
    for (const text of texts) {
      if (String(text || "").trim()) {
        documents.push(
          await fetchDocument(`text://${encodeURIComponent(String(text).trim())}`)
        );
      }
    }
    if (!documents.length) {
      return res.status(400).type("html").send("<h1>请提供链接或文本</h1>");
    }
    const analysis = analyzeDocuments(documents, { projectName });
    res.type("html").send(renderReportHtml(analysis));
  } catch (err) {
    res.status(500).type("html").send(`<h1>生成失败</h1><p>${err.message || err}</p>`);
  }
});

app.listen(PORT, () => {
  console.log(`纪脉已启动：http://localhost:${PORT}`);
});
