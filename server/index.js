import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { analyzeDocuments, applyLeftoverStatus } from "./analyzer.js";
import { fetchDocument, listSampleMeetings } from "./fetcher.js";
import { saveAnalysis, getAnalysis, updateAnalysis, listSessions } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const UPLOADS = path.join(ROOT, "uploads");
const PORT = Number(process.env.PORT || 3790);

await fs.mkdir(UPLOADS, { recursive: true });

const upload = multer({
  dest: UPLOADS,
  limits: { fileSize: 2 * 1024 * 1024, files: 8 },
  fileFilter(_req, file, cb) {
    const ok = /\.(md|markdown|txt|html?)$/i.test(file.originalname);
    if (!ok) return cb(new Error("仅支持 .md / .txt / .html 文档"));
    cb(null, true);
  },
});

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/samples", express.static(path.join(ROOT, "samples")));
app.use(express.static(path.join(ROOT, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "留迹", port: PORT });
});

app.get("/api/samples", async (_req, res) => {
  try {
    const samples = await listSampleMeetings();
    res.json({ samples });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/api/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

async function collectDocuments({ links = [], texts = [], files = [] }) {
  const documents = [];
  const errors = [];

  for (const link of links) {
    const value = String(link || "").trim();
    if (!value) continue;
    try {
      documents.push(await fetchDocument(value));
    } catch (err) {
      errors.push({ input: value, error: err.message || String(err) });
    }
  }

  for (const text of texts) {
    const value = String(text || "").trim();
    if (!value) continue;
    try {
      documents.push(
        await fetchDocument(`text://${encodeURIComponent(value)}`)
      );
    } catch (err) {
      errors.push({ input: "[粘贴文本]", error: err.message || String(err) });
    }
  }

  for (const file of files) {
    try {
      documents.push(await fetchDocument(`file://${file.path}`));
    } catch (err) {
      errors.push({
        input: file.originalname || "[上传文件]",
        error: err.message || String(err),
      });
    }
  }

  return { documents, errors };
}

app.post("/api/analyze", upload.array("files", 8), async (req, res) => {
  try {
    let links = [];
    let texts = [];
    let projectName = "";

    if (req.is("multipart/form-data") || req.files?.length) {
      links = String(req.body.links || "")
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (req.body.text?.trim()) texts = [req.body.text.trim()];
      projectName = String(req.body.projectName || "").trim();
    } else {
      links = req.body?.links || [];
      texts = req.body?.texts || [];
      projectName = String(req.body?.projectName || "").trim();
    }

    const { documents, errors } = await collectDocuments({
      links,
      texts,
      files: req.files || [],
    });

    if (!documents.length) {
      return res.status(422).json({
        error: "未能识别任何纪要，请检查链接、粘贴文本或上传文档",
        errors,
      });
    }

    const analysis = analyzeDocuments(documents, { projectName });
    const sessionId = saveAnalysis(analysis);

    res.json({
      sessionId,
      analysis,
      errors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/api/sessions/:id", (req, res) => {
  const analysis = getAnalysis(req.params.id);
  if (!analysis) return res.status(404).json({ error: "会话不存在或已过期" });
  res.json({ sessionId: req.params.id, analysis });
});

app.get("/api/sessions/:id/meetings/:meetingId", (req, res) => {
  const analysis = getAnalysis(req.params.id);
  if (!analysis) return res.status(404).json({ error: "会话不存在或已过期" });
  const meeting = analysis.meetings.find((m) => m.id === req.params.meetingId);
  if (!meeting) return res.status(404).json({ error: "未找到该会议" });
  res.json({
    sessionId: req.params.id,
    project: analysis.project,
    meeting,
  });
});

app.patch("/api/sessions/:id/leftovers", (req, res) => {
  try {
    const analysis = getAnalysis(req.params.id);
    if (!analysis) return res.status(404).json({ error: "会话不存在或已过期" });
    const { meetingId, leftoverId, status } = req.body || {};
    if (!meetingId || !leftoverId || !status) {
      return res.status(400).json({ error: "需要 meetingId、leftoverId、status" });
    }
    const updated = applyLeftoverStatus(analysis, meetingId, leftoverId, status);
    updateAnalysis(req.params.id, updated);
    const meeting = updated.meetings.find((m) => m.id === meetingId);
    res.json({
      sessionId: req.params.id,
      project: updated.project,
      meeting,
      analysis: updated,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/samples/")) {
    return next();
  }
  res.sendFile(path.join(ROOT, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`留迹已启动：http://localhost:${PORT}`);
});
