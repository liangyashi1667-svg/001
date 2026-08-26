const app = document.getElementById("app");

const state = {
  view: "home", // home | list | detail
  sessionId: null,
  analysis: null,
  meetingId: null,
  statusMsg: "",
  statusType: "",
  loading: false,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (!raw) return { view: "home" };
  const parts = raw.split("/");
  if (parts[0] === "s" && parts[1]) {
    if (parts[2] === "m" && parts[3]) {
      return { view: "detail", sessionId: parts[1], meetingId: parts[3] };
    }
    return { view: "list", sessionId: parts[1] };
  }
  return { view: "home" };
}

function navigate(hash) {
  location.hash = hash;
}

function setStatus(message, type = "") {
  state.statusMsg = message;
  state.statusType = type;
}

function progressMeter(percent) {
  const p = typeof percent === "number" ? Math.max(0, Math.min(100, percent)) : 0;
  const label = typeof percent === "number" ? `${p}%` : "未识别";
  return `
    <div class="meter" role="img" aria-label="进度 ${escapeHtml(label)}">
      <div class="meter-track"><div class="meter-fill" style="width:${p}%"></div></div>
      <span class="meter-label">${escapeHtml(label)}</span>
    </div>`;
}

function renderHome() {
  return `
  <header class="hero">
    <nav class="nav">
      <span class="nav-mark">留迹</span>
      <a href="#workspace">开始跟进</a>
    </nav>
    <div class="hero-plane">
      <p class="brand">留迹</p>
      <h1>把会议链接，变成可跟进的遗留点。</h1>
      <p class="lede">粘贴纪要链接、上传文档或粘贴原文，自动识别项目名称、汇报人、议题、进展与遗留点状态。</p>
      <div class="cta-row">
        <a class="btn primary" href="#workspace">开始跟进</a>
        <button type="button" class="btn ghost" id="loadDemo">使用示例纪要</button>
      </div>
    </div>
  </header>

  <main id="workspace" class="workspace shell">
    <section class="compose">
      <h2>识别会议纪要</h2>
      <p class="section-lede">支持公开网页 / Markdown 链接，本地示例路径形如 <code>/samples/meetings/...</code>，也可上传 .md / .txt 文档。</p>

      <label class="field">
        <span>项目名称（可选）</span>
        <input id="projectName" type="text" placeholder="例如：智能客服平台" />
      </label>

      <label class="field">
        <span>链接列表（每行一个）</span>
        <textarea id="links" rows="6" placeholder="/samples/meetings/2026-01-08-kickoff.md&#10;https://example.com/meeting-notes"></textarea>
      </label>

      <label class="field">
        <span>或粘贴会议纪要原文（可选）</span>
        <textarea id="paste" rows="5" placeholder="把单次会议纪要粘贴在这里…"></textarea>
      </label>

      <div class="file-row">
        <label>
          <span class="muted">上传文档</span>
          <input id="files" type="file" accept=".md,.markdown,.txt,.html,.htm" multiple />
        </label>
      </div>

      <div class="actions">
        <button type="button" class="btn primary" id="analyzeBtn" ${state.loading ? "disabled" : ""}>
          ${state.loading ? "识别中…" : "识别并进入跟进"}
        </button>
        <button type="button" class="btn ghost ink" id="clearBtn">清空</button>
      </div>
      <p class="status ${escapeHtml(state.statusType)}" id="status" role="status">${escapeHtml(state.statusMsg)}</p>
    </section>
  </main>

  <footer class="site-footer"><p>留迹 · 会议遗留点跟进</p></footer>`;
}

function renderList() {
  const a = state.analysis;
  if (!a) {
    return `<main class="workspace shell"><p class="status error">会话不存在，请重新识别。</p><a class="btn ghost ink" href="#/">返回首页</a></main>`;
  }
  const p = a.project;
  const meetings = [...a.meetings].sort((x, y) =>
    String(y.date || "").localeCompare(String(x.date || ""))
  );

  const rows = meetings
    .map(
      (m, idx) => `
    <button type="button" class="meeting-row" data-meeting="${escapeHtml(m.id)}" style="animation-delay:${idx * 0.04}s">
      <div>
        <p class="eyebrow">${escapeHtml(m.date || "日期未识别")} · ${escapeHtml(m.phase)} · 汇报人 ${escapeHtml(m.reporter || "未识别")}</p>
        <h3>${escapeHtml(m.title)}</h3>
        <p class="meta">${escapeHtml(m.summary)}</p>
        <div class="badge-row">
          <span class="badge">议题 ${m.agenda.length}</span>
          <span class="badge open">未关闭 ${m.leftoverStats.open}</span>
          <span class="badge doing">跟进中 ${m.leftoverStats.doing}</span>
          <span class="badge done">已完成 ${m.leftoverStats.done}</span>
          ${m.progressPercent != null ? `<span class="badge">进度 ${m.progressPercent}%</span>` : ""}
        </div>
      </div>
      <span class="chev" aria-hidden="true">→</span>
    </button>`
    )
    .join("");

  return `
  <div class="shell topbar">
    <a class="btn ghost ink" href="#/">← 重新识别</a>
    <span class="muted">会话 ${escapeHtml(state.sessionId)}</span>
  </div>
  <main class="workspace shell">
    <h2>${escapeHtml(p.name)}</h2>
    <p class="section-lede">${escapeHtml(p.summary)}</p>
    <div class="summary-strip">
      <div class="cell"><span>当前进度</span><strong>${p.currentProgress == null ? "—" : `${p.currentProgress}%`}</strong></div>
      <div class="cell"><span>会议场次</span><strong>${p.meetingCount}</strong></div>
      <div class="cell"><span>待跟进遗留点</span><strong>${p.leftoverStats.pending}</strong></div>
      <div class="cell"><span>健康度</span><strong>${escapeHtml(p.health)}</strong></div>
    </div>
    <div class="meeting-list">${rows}</div>
  </main>
  <footer class="site-footer"><p>点击会议行进入详情 · 查看议题、进展与遗留点状态</p></footer>`;
}

function renderDetail() {
  const a = state.analysis;
  const meeting = a?.meetings?.find((m) => m.id === state.meetingId);
  if (!meeting) {
    return `<main class="workspace shell"><p class="status error">未找到该会议。</p><a class="btn ghost ink" href="#/s/${escapeHtml(state.sessionId)}">返回列表</a></main>`;
  }

  const agenda =
    meeting.agenda.length > 0
      ? `<ol class="plain-list">${meeting.agenda.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ol>`
      : `<p class="muted">未识别到议题</p>`;

  const progressNotes =
    meeting.progressNotes.length > 0
      ? `<ul class="plain-list">${meeting.progressNotes.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
      : `<p class="muted">未识别到进展说明</p>`;

  const leftovers =
    meeting.leftovers.length > 0
      ? `<ul class="leftover-list">${meeting.leftovers
          .map((l) => {
            const meta = [l.owner ? `负责人 ${l.owner}` : null, l.due ? `截止 ${l.due}` : null]
              .filter(Boolean)
              .join(" · ");
            return `
          <li class="leftover-item">
            <div>
              <p>${escapeHtml(l.text)}</p>
              ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
            </div>
            <select class="status-select ${escapeHtml(l.status)}" data-leftover="${escapeHtml(l.id)}" aria-label="遗留点状态">
              <option value="open" ${l.status === "open" ? "selected" : ""}>未关闭</option>
              <option value="doing" ${l.status === "doing" ? "selected" : ""}>跟进中</option>
              <option value="done" ${l.status === "done" ? "selected" : ""}>已完成</option>
            </select>
          </li>`;
          })
          .join("")}</ul>`
      : `<p class="muted">本场会议未识别到遗留点</p>`;

  return `
  <div class="shell topbar">
    <a class="btn ghost ink" href="#/s/${escapeHtml(state.sessionId)}">← 返回列表</a>
    <span class="muted">${escapeHtml(meeting.date || "")}</span>
  </div>
  <main class="detail shell">
    <header class="detail-hero">
      <p class="brand-inline">${escapeHtml(meeting.projectName || a.project.name)}</p>
      <h1>${escapeHtml(meeting.title)}</h1>
      <p class="lede">${escapeHtml(meeting.summary)}</p>
    </header>

    <div class="detail-grid">
      <section class="panel">
        <h2>会议信息</h2>
        <dl class="kv">
          <div><dt>项目名称</dt><dd>${escapeHtml(meeting.projectName || a.project.name)}</dd></div>
          <div><dt>汇报人</dt><dd>${escapeHtml(meeting.reporter || "未识别")}</dd></div>
          <div><dt>主持人</dt><dd>${escapeHtml(meeting.host || "—")}</dd></div>
          <div><dt>日期</dt><dd>${escapeHtml(meeting.date || "未识别")}</dd></div>
          <div><dt>阶段</dt><dd>${escapeHtml(meeting.phase)}</dd></div>
          <div><dt>参会人</dt><dd>${escapeHtml(meeting.attendees.join("、") || "—")}</dd></div>
          <div><dt>来源</dt><dd>${escapeHtml(meeting.sourceUrl || "本地输入")}</dd></div>
        </dl>
      </section>

      <section class="panel">
        <h2>进展</h2>
        ${progressMeter(meeting.progressPercent)}
        <div style="margin-top:1rem">${progressNotes}</div>
        <div class="badge-row" style="margin-top:1rem">
          <span class="badge open">未关闭 ${meeting.leftoverStats.open}</span>
          <span class="badge doing">跟进中 ${meeting.leftoverStats.doing}</span>
          <span class="badge done">已完成 ${meeting.leftoverStats.done}</span>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-bottom:1rem">
      <h2>议题</h2>
      ${agenda}
    </section>

    <section class="panel">
      <h2>遗留点状态</h2>
      <p class="section-lede" style="margin-bottom:1rem">可直接改状态；项目汇总会同步更新。</p>
      ${leftovers}
    </section>
  </main>
  <footer class="site-footer"><p>留迹 · 会议详情</p></footer>`;
}

function render() {
  if (state.view === "list") app.innerHTML = renderList();
  else if (state.view === "detail") app.innerHTML = renderDetail();
  else app.innerHTML = renderHome();
  bindEvents();
}

async function loadSession(sessionId) {
  const res = await fetch(`/api/sessions/${sessionId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "加载会话失败");
  state.sessionId = sessionId;
  state.analysis = data.analysis;
}

async function syncFromRoute() {
  const route = parseHash();
  try {
    if (route.view === "home") {
      state.view = "home";
      state.meetingId = null;
      render();
      return;
    }

    if (!state.analysis || state.sessionId !== route.sessionId) {
      await loadSession(route.sessionId);
    }
    state.sessionId = route.sessionId;
    state.view = route.view;
    state.meetingId = route.meetingId || null;
    render();
  } catch (err) {
    state.view = "home";
    setStatus(err.message || String(err), "error");
    render();
  }
}

async function loadDemo() {
  try {
    const res = await fetch("/api/samples");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "加载示例失败");
    setStatus(`已载入 ${data.samples.length} 份示例纪要，点击「识别并进入跟进」。`, "ok");
    if (state.view !== "home") {
      state.view = "home";
    }
    render();
    const links = document.getElementById("links");
    const projectName = document.getElementById("projectName");
    const paste = document.getElementById("paste");
    if (links) links.value = data.samples.map((s) => s.url).join("\n");
    if (projectName) projectName.value = "智能客服平台";
    if (paste) paste.value = "";
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    setStatus(err.message || String(err), "error");
    render();
  }
}

async function analyze() {
  const linksEl = document.getElementById("links");
  const pasteEl = document.getElementById("paste");
  const projectNameEl = document.getElementById("projectName");
  const filesEl = document.getElementById("files");

  const links = (linksEl?.value || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const text = pasteEl?.value?.trim() || "";
  const files = filesEl?.files ? [...filesEl.files] : [];
  const projectName = projectNameEl?.value?.trim() || "";

  if (!links.length && !text && !files.length) {
    setStatus("请先填写链接、粘贴纪要，或上传文档。", "error");
    render();
    return;
  }

  state.loading = true;
  setStatus("正在抓取并识别遗留点…");
  render();

  // re-get after re-render - need to restore form values
  document.getElementById("links").value = links.join("\n");
  document.getElementById("paste").value = text;
  document.getElementById("projectName").value = projectName;

  try {
    const form = new FormData();
    form.append("links", links.join("\n"));
    form.append("projectName", projectName);
    if (text) form.append("text", text);
    for (const f of files) form.append("files", f);

    const res = await fetch("/api/analyze", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      const detail = data.errors?.map((e) => e.error).join("；");
      throw new Error((data.error || "识别失败") + (detail ? `（${detail}）` : ""));
    }

    state.sessionId = data.sessionId;
    state.analysis = data.analysis;
    state.loading = false;
    const warn =
      data.errors?.length > 0 ? `（${data.errors.length} 个输入失败已跳过）` : "";
    setStatus(`识别完成：${data.analysis.project.summary}${warn}`, "ok");
    navigate(`#/s/${data.sessionId}`);
  } catch (err) {
    state.loading = false;
    setStatus(err.message || String(err), "error");
    render();
  }
}

function clearForm() {
  setStatus("");
  state.statusType = "";
  render();
}

async function updateLeftoverStatus(leftoverId, status) {
  const res = await fetch(`/api/sessions/${state.sessionId}/leftovers`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meetingId: state.meetingId,
      leftoverId,
      status,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "更新失败");
  state.analysis = data.analysis;
  render();
}

function bindEvents() {
  document.getElementById("loadDemo")?.addEventListener("click", loadDemo);
  document.getElementById("analyzeBtn")?.addEventListener("click", analyze);
  document.getElementById("clearBtn")?.addEventListener("click", clearForm);

  document.querySelectorAll("[data-meeting]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-meeting");
      navigate(`#/s/${state.sessionId}/m/${id}`);
    });
  });

  document.querySelectorAll("[data-leftover]").forEach((el) => {
    el.addEventListener("change", async () => {
      try {
        await updateLeftoverStatus(el.getAttribute("data-leftover"), el.value);
      } catch (err) {
        alert(err.message || String(err));
      }
    });
  });
}

window.addEventListener("hashchange", syncFromRoute);
syncFromRoute();
