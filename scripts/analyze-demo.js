import { analyzeDocuments } from "../server/analyzer.js";
import { fetchDocument, listSampleMeetings } from "../server/fetcher.js";
import { renderReportHtml } from "../server/report.js";
import fs from "node:fs/promises";
import path from "node:path";

const samples = await listSampleMeetings();
const docs = [];
for (const s of samples) {
  docs.push(await fetchDocument(s.url));
}
const analysis = analyzeDocuments(docs, { projectName: "智能客服平台" });
const html = renderReportHtml(analysis);
const out = path.resolve("output/demo-report.html");
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, html, "utf8");
console.log(JSON.stringify(analysis.project, null, 2));
console.log(`报告已写入 ${out}`);
