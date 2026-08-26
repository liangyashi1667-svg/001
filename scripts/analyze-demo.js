import { analyzeDocuments } from "../server/analyzer.js";
import { fetchDocument, listSampleMeetings } from "../server/fetcher.js";

const samples = await listSampleMeetings();
const documents = [];
for (const s of samples) {
  documents.push(await fetchDocument(s.url));
}

const analysis = analyzeDocuments(documents, { projectName: "智能客服平台" });
console.log("项目:", analysis.project.name);
console.log("健康度:", analysis.project.health);
console.log("待跟进:", analysis.project.leftoverStats.pending);
console.log("---");
for (const m of analysis.meetings) {
  console.log(
    `${m.date} | ${m.reporter || "-"} | 议题${m.agenda.length} | 遗留${m.leftoverStats.total}(待${m.leftoverStats.pending}) | ${m.progressPercent ?? "—"}%`
  );
}
