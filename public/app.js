const linksEl = document.getElementById("links");
const pasteEl = document.getElementById("paste");
const projectNameEl = document.getElementById("projectName");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const insightEl = document.getElementById("insight");
const previewEl = document.getElementById("preview");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const loadDemoBtn = document.getElementById("loadDemo");
const openReportBtn = document.getElementById("openReport");
const downloadReportBtn = document.getElementById("downloadReport");

let latestHtml = "";
let latestName = "项目进度报告";

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function parseLinks(raw) {
  return raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadDemo() {
  try {
    const res = await fetch("/api/samples");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "加载示例失败");
    linksEl.value = data.samples.map((s) => s.url).join("\n");
    projectNameEl.value = "智能客服平台";
    pasteEl.value = "";
    setStatus(`已载入 ${data.samples.length} 份示例纪要，点击「识别进度并生成报告」。`, "ok");
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    setStatus(err.message || String(err), "error");
  }
}

function renderInsight(analysis) {
  const p = analysis.project;
  const cells = [
    ["当前进度", p.currentProgress == null ? "—" : `${p.currentProgress}%`],
    ["阶段", p.phase],
    ["会议纪要", `${p.meetingCount} 份`],
    ["未关闭待办", String(p.openActionCount)],
  ];
  insightEl.innerHTML = cells
    .map(
      ([label, value]) =>
        `<div class="cell"><span>${label}</span><strong>${value}</strong></div>`
    )
    .join("");
}

async function analyze() {
  const links = parseLinks(linksEl.value);
  const texts = pasteEl.value.trim() ? [pasteEl.value.trim()] : [];
  const projectName = projectNameEl.value.trim();

  if (!links.length && !texts.length) {
    setStatus("请先填写链接，或粘贴纪要文本。", "error");
    return;
  }

  analyzeBtn.disabled = true;
  setStatus("正在抓取并识别进度…");

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ links, texts, projectName }),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = data.errors?.map((e) => e.error).join("；");
      throw new Error(data.error + (detail ? `（${detail}）` : ""));
    }

    latestHtml = data.html;
    latestName = data.analysis.project.name || "项目进度报告";
    renderInsight(data.analysis);
    previewEl.srcdoc = data.html;
    resultEl.hidden = false;

    const warn =
      data.errors?.length > 0
        ? `（${data.errors.length} 个链接失败已跳过）`
        : "";
    setStatus(
      `已生成报告：${data.analysis.project.summary}${warn}`,
      "ok"
    );
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    setStatus(err.message || String(err), "error");
  } finally {
    analyzeBtn.disabled = false;
  }
}

function clearAll() {
  linksEl.value = "";
  pasteEl.value = "";
  projectNameEl.value = "";
  resultEl.hidden = true;
  previewEl.srcdoc = "";
  latestHtml = "";
  setStatus("");
}

function openReport() {
  if (!latestHtml) return;
  const blob = new Blob([latestHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function downloadReport() {
  if (!latestHtml) return;
  const blob = new Blob([latestHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${latestName.replace(/[\\/:*?"<>|]/g, "_")}-纪脉报告.html`;
  a.click();
  URL.revokeObjectURL(url);
}

analyzeBtn.addEventListener("click", analyze);
clearBtn.addEventListener("click", clearAll);
loadDemoBtn.addEventListener("click", loadDemo);
openReportBtn.addEventListener("click", openReport);
downloadReportBtn.addEventListener("click", downloadReport);
