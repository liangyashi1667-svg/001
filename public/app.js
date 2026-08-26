const linksEl = document.getElementById("links");
const pasteEl = document.getElementById("paste");
const filesEl = document.getElementById("files");
const fileHintEl = document.getElementById("fileHint");
const projectNameEl = document.getElementById("projectName");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const insightEl = document.getElementById("insight");
const projectBannerEl = document.getElementById("projectBanner");
const meetingListEl = document.getElementById("meetingList");
const detailPanelEl = document.getElementById("detailPanel");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const loadDemoBtn = document.getElementById("loadDemo");
const openReportBtn = document.getElementById("openReport");
const downloadReportBtn = document.getElementById("downloadReport");

let latestHtml = "";
let latestName = "项目进度报告";
let latestAnalysis = null;
let selectedMeetingId = null;
let uploadedTexts = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function progressLabel(percent) {
  return typeof percent === "number" ? `${percent}%` : "未识别";
}

function statusClass(status) {
  if (status === "已关闭") return "tag closed";
  if (status === "阻塞中") return "tag blocked";
  if (status === "进行中") return "tag progress";
  return "tag open";
}

async function loadDemo() {
  try {
    const res = await fetch("/api/samples");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "加载示例失败");
    linksEl.value = data.samples.map((s) => s.url).join("\n");
    projectNameEl.value = "智能客服平台";
    pasteEl.value = "";
    filesEl.value = "";
    uploadedTexts = [];
    fileHintEl.textContent = "未选择文件";
    setStatus(`已载入 ${data.samples.length} 份示例纪要，点击「识别进度」。`, "ok");
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    setStatus(err.message || String(err), "error");
  }
}

function readFilesAsTexts(fileList) {
  const files = Array.from(fileList || []);
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const text = String(reader.result || "").trim();
            if (!text) {
              reject(new Error(`文件为空：${file.name}`));
              return;
            }
            const headed = text.startsWith("#")
              ? text
              : `# ${file.name.replace(/\.[^.]+$/, "")}\n\n${text}`;
            resolve(headed);
          };
          reader.onerror = () => reject(new Error(`读取失败：${file.name}`));
          reader.readAsText(file, "utf-8");
        })
    )
  );
}

filesEl.addEventListener("change", async () => {
  try {
    uploadedTexts = await readFilesAsTexts(filesEl.files);
    const names = Array.from(filesEl.files || []).map((f) => f.name);
    fileHintEl.textContent = names.length
      ? `已选择 ${names.length} 个：${names.join("、")}`
      : "未选择文件";
  } catch (err) {
    uploadedTexts = [];
    fileHintEl.textContent = "未选择文件";
    setStatus(err.message || String(err), "error");
  }
});

function renderProjectBanner(analysis) {
  const p = analysis.project;
  projectBannerEl.innerHTML = `
    <div class="banner-main">
      <p class="eyebrow">项目</p>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.summary)}</p>
    </div>
    <div class="banner-side">
      <div><span>阶段</span><strong>${escapeHtml(p.phase)}</strong></div>
      <div><span>健康度</span><strong>${escapeHtml(p.health)}</strong></div>
      <div><span>最新汇报人</span><strong>${escapeHtml(p.latestReporter || "—")}</strong></div>
    </div>
  `;
}

function renderInsight(analysis) {
  const p = analysis.project;
  const cells = [
    ["当前进度", progressLabel(p.currentProgress)],
    ["会议纪要", `${p.meetingCount} 份`],
    ["未关闭待办", String(p.openActionCount)],
    ["活跃遗留点", String(p.openLeftoverCount ?? 0)],
  ];
  insightEl.innerHTML = cells
    .map(
      ([label, value]) =>
        `<div class="cell"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`
    )
    .join("");
}

function renderMeetingList(meetings) {
  const sorted = [...meetings].sort((a, b) =>
    String(a.date || "").localeCompare(String(b.date || ""))
  );
  meetingListEl.innerHTML = sorted
    .map((m) => {
      const active = m.id === selectedMeetingId ? "active" : "";
      return `
        <button type="button" class="meeting-item ${active}" data-id="${escapeHtml(m.id)}" role="listitem">
          <div class="meeting-item-top">
            <span class="date">${escapeHtml(m.date || "未知日期")}</span>
            <span class="phase">${escapeHtml(m.phase)}</span>
          </div>
          <strong>${escapeHtml(m.title)}</strong>
          <div class="meeting-item-meta">
            <span>汇报人 ${escapeHtml(m.reporter || "未识别")}</span>
            <span>${escapeHtml(progressLabel(m.progressPercent))}</span>
            <span>${escapeHtml(m.leftoverStatus?.label || "无遗留")}</span>
          </div>
        </button>`;
    })
    .join("");
}

function renderItemList(items, empty) {
  if (!items?.length) return `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<ul class="detail-list">${items
    .map((item) => {
      if (typeof item === "string") {
        return `<li>${escapeHtml(item)}</li>`;
      }
      const status = item.status || (item.done ? "已关闭" : "未关闭");
      const meta = [item.owner, item.due ? `截止 ${item.due}` : null]
        .filter(Boolean)
        .join(" · ");
      return `<li>
        <div class="item-row">
          <span class="${statusClass(status)}">${escapeHtml(status)}</span>
          <span>${escapeHtml(item.text)}</span>
        </div>
        ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
      </li>`;
    })
    .join("")}</ul>`;
}

function renderDetail(meeting) {
  if (!meeting) {
    detailPanelEl.innerHTML =
      '<p class="detail-empty">选择左侧会议，查看项目名称、汇报人、议题、进展与遗留点状态。</p>';
    return;
  }

  const progressNotes = meeting.progressNotes?.length
    ? meeting.progressNotes
    : meeting.progressPercent != null
      ? [`整体进度约 ${meeting.progressPercent}%（${meeting.phase}）`]
      : [];

  detailPanelEl.innerHTML = `
    <div class="detail-head">
      <p class="eyebrow">${escapeHtml(meeting.date || "未知日期")} · ${escapeHtml(meeting.phase)}</p>
      <h3>${escapeHtml(meeting.title)}</h3>
      <p class="detail-summary">${escapeHtml(meeting.summary)}</p>
    </div>

    <div class="detail-grid">
      <div class="detail-field">
        <span>项目名称</span>
        <strong>${escapeHtml(meeting.projectName || "—")}</strong>
      </div>
      <div class="detail-field">
        <span>汇报人</span>
        <strong>${escapeHtml(meeting.reporter || "未识别")}</strong>
      </div>
      <div class="detail-field">
        <span>进展</span>
        <strong>${escapeHtml(progressLabel(meeting.progressPercent))}</strong>
        <div class="meter mini"><div class="meter-fill" style="width:${typeof meeting.progressPercent === "number" ? meeting.progressPercent : 0}%"></div></div>
      </div>
      <div class="detail-field">
        <span>遗留点状态</span>
        <strong>${escapeHtml(meeting.leftoverStatus?.label || "无遗留")}</strong>
      </div>
    </div>

    <section class="detail-section">
      <h4>议题</h4>
      ${renderItemList(meeting.agenda, "未识别到议题")}
    </section>

    <section class="detail-section">
      <h4>进展说明</h4>
      ${renderItemList(progressNotes, "未识别到进展说明")}
    </section>

    <section class="detail-section">
      <h4>遗留点</h4>
      ${renderItemList(meeting.leftovers, "暂无遗留点")}
    </section>

    <section class="detail-section">
      <h4>决议</h4>
      ${renderItemList(meeting.decisions, "未识别到决议")}
    </section>

    <section class="detail-section">
      <h4>行动项</h4>
      ${renderItemList(meeting.actionItems, "暂无行动项")}
    </section>

    <section class="detail-section">
      <h4>风险</h4>
      ${renderItemList(meeting.risks, "未识别到风险")}
    </section>

    <p class="source">来源：${escapeHtml(meeting.sourceUrl || "本地输入")}</p>
  `;

  detailPanelEl.scrollTop = 0;
}

function selectMeeting(id) {
  selectedMeetingId = id;
  const meeting = latestAnalysis?.meetings?.find((m) => m.id === id) || null;
  renderMeetingList(latestAnalysis.meetings);
  renderDetail(meeting);
}

async function analyze() {
  const links = parseLinks(linksEl.value);
  const texts = [
    ...(pasteEl.value.trim() ? [pasteEl.value.trim()] : []),
    ...uploadedTexts,
  ];
  const projectName = projectNameEl.value.trim();

  if (!links.length && !texts.length) {
    setStatus("请先填写链接、上传文档，或粘贴纪要文本。", "error");
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
    latestAnalysis = data.analysis;
    latestName = data.analysis.project.name || "项目进度报告";

    const sorted = [...data.analysis.meetings].sort((a, b) =>
      String(a.date || "").localeCompare(String(b.date || ""))
    );
    selectedMeetingId = sorted[sorted.length - 1]?.id || sorted[0]?.id || null;

    renderProjectBanner(data.analysis);
    renderInsight(data.analysis);
    renderMeetingList(data.analysis.meetings);
    renderDetail(
      data.analysis.meetings.find((m) => m.id === selectedMeetingId) || null
    );
    resultEl.hidden = false;

    const warn =
      data.errors?.length > 0
        ? `（${data.errors.length} 个链接失败已跳过）`
        : "";
    setStatus(`已识别 ${data.analysis.meetings.length} 场会议，点击列表查看详情。${warn}`, "ok");
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
  filesEl.value = "";
  uploadedTexts = [];
  fileHintEl.textContent = "未选择文件";
  resultEl.hidden = true;
  latestHtml = "";
  latestAnalysis = null;
  selectedMeetingId = null;
  detailPanelEl.innerHTML =
    '<p class="detail-empty">选择左侧会议，查看项目名称、汇报人、议题、进展与遗留点状态。</p>';
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

meetingListEl.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-id]");
  if (!btn || !latestAnalysis) return;
  selectMeeting(btn.getAttribute("data-id"));
});

analyzeBtn.addEventListener("click", analyze);
clearBtn.addEventListener("click", clearAll);
loadDemoBtn.addEventListener("click", loadDemo);
openReportBtn.addEventListener("click", openReport);
downloadReportBtn.addEventListener("click", downloadReport);
