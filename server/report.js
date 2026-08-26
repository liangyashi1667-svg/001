function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(isoOrDate) {
  if (!isoOrDate) return "未知日期";
  return String(isoOrDate);
}

function progressBar(percent) {
  const p = typeof percent === "number" ? Math.max(0, Math.min(100, percent)) : 0;
  const label = typeof percent === "number" ? `${p}%` : "未识别";
  return `
    <div class="meter" role="img" aria-label="进度 ${escapeHtml(label)}">
      <div class="meter-track"><div class="meter-fill" style="width:${p}%"></div></div>
      <span class="meter-label">${escapeHtml(label)}</span>
    </div>`;
}

function renderList(items, empty = "暂无") {
  if (!items?.length) return `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function renderStatusItems(items, empty = "暂无") {
  if (!items?.length) return `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<ul class="actions">${items
    .map((a) => {
      const mark = a.done || a.status === "已关闭" ? "done" : "open";
      const status = a.status || (a.done ? "已关闭" : "未关闭");
      const meta = [a.owner, a.due ? `截止 ${a.due}` : null, a.meeting, status]
        .filter(Boolean)
        .join(" · ");
      return `<li class="${mark}"><span class="tick">${mark === "done" ? "✓" : "○"}</span><div><p>${escapeHtml(a.text)}</p>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</div></li>`;
    })
    .join("")}</ul>`;
}

export function renderReportHtml(analysis) {
  const { project, meetings, generatedAt } = analysis;
  const meetingCards = meetings
    .slice()
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((m, idx) => {
      return `
      <article class="meeting" id="m-${idx}">
        <header>
          <div>
            <p class="eyebrow">${escapeHtml(formatDate(m.date))} · ${escapeHtml(m.phase)}${m.reporter ? ` · 汇报人 ${escapeHtml(m.reporter)}` : ""}</p>
            <h3>${escapeHtml(m.title)}</h3>
          </div>
          ${progressBar(m.progressPercent)}
        </header>
        <p class="summary">${escapeHtml(m.summary)}</p>
        <div class="grid-2">
          <section>
            <h4>议题</h4>
            ${renderList(m.agenda, "未识别到议题")}
          </section>
          <section>
            <h4>遗留点状态 · ${escapeHtml(m.leftoverStatus?.label || "无遗留")}</h4>
            ${renderStatusItems(m.leftovers, "暂无遗留点")}
          </section>
        </div>
        <div class="grid-2">
          <section>
            <h4>决议</h4>
            ${renderList(m.decisions, "未识别到决议")}
          </section>
          <section>
            <h4>风险</h4>
            ${renderList(m.risks, "未识别到风险")}
          </section>
        </div>
        <section>
          <h4>行动项</h4>
          ${renderStatusItems(m.actionItems, "暂无行动项")}
        </section>
        <p class="source">来源：${escapeHtml(m.sourceUrl || "本地输入")}</p>
      </article>`;
    })
    .join("\n");

  const timeline = project.timeline
    .map((t) => {
      const delta =
        t.delta == null
          ? ""
          : `<span class="delta ${t.delta >= 0 ? "up" : "down"}">${t.delta >= 0 ? "+" : ""}${t.delta}%</span>`;
      return `
        <li>
          <div class="dot"></div>
          <div>
            <p class="t-date">${escapeHtml(formatDate(t.date))}${t.reporter ? ` · ${escapeHtml(t.reporter)}` : ""}</p>
            <p class="t-title">${escapeHtml(t.title)}</p>
            <p class="t-meta">${escapeHtml(t.phase)}${t.progressPercent != null ? ` · ${t.progressPercent}%` : ""} · ${escapeHtml(t.leftoverLabel || "")} ${delta}</p>
          </div>
        </li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(project.name)} · 纪脉进度报告</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+SC:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ink: #142019;
      --muted: #5b6b61;
      --paper: #f3f6f1;
      --panel: rgba(255,255,255,0.72);
      --line: rgba(20,32,25,0.12);
      --accent: #0f7a5f;
      --accent-2: #d97706;
      --danger: #b42318;
      --shadow: 0 18px 50px rgba(20,32,25,0.08);
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans SC", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(1200px 600px at 10% -10%, rgba(15,122,95,0.18), transparent 55%),
        radial-gradient(900px 500px at 100% 0%, rgba(217,119,6,0.16), transparent 50%),
        linear-gradient(180deg, #e7efe8 0%, var(--paper) 40%, #eef3ea 100%);
      min-height: 100vh;
    }
    .wrap { width: min(1100px, calc(100% - 2rem)); margin: 0 auto; padding: 2.5rem 0 4rem; }
    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 28px;
      padding: 2.4rem 2rem 2rem;
      background:
        linear-gradient(135deg, rgba(15,122,95,0.92), rgba(20,48,38,0.96)),
        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      color: #f5faf7;
      box-shadow: var(--shadow);
      animation: rise 0.7s ease both;
    }
    .brand {
      font-family: Syne, "IBM Plex Sans SC", sans-serif;
      font-size: clamp(2.4rem, 6vw, 4rem);
      line-height: 0.95;
      letter-spacing: -0.03em;
      margin: 0 0 0.6rem;
    }
    .hero h1 {
      font-family: Syne, "IBM Plex Sans SC", sans-serif;
      font-size: clamp(1.4rem, 3vw, 2rem);
      font-weight: 700;
      margin: 0.4rem 0 0.8rem;
      max-width: 18ch;
    }
    .hero p { margin: 0; max-width: 52ch; color: rgba(245,250,247,0.86); line-height: 1.6; }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-top: 1.4rem; }
    .chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.35rem 0.7rem; border: 1px solid rgba(255,255,255,0.22);
      border-radius: 999px; font-size: 0.86rem; background: rgba(255,255,255,0.08);
    }
    .panel {
      margin-top: 1.2rem; background: var(--panel); backdrop-filter: blur(10px);
      border: 1px solid var(--line); border-radius: var(--radius); padding: 1.3rem 1.25rem;
      box-shadow: var(--shadow); animation: rise 0.8s ease both;
    }
    .stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; margin-top: 1.2rem;
    }
    .stat {
      padding: 1rem; border-radius: 16px; background: rgba(255,255,255,0.8);
      border: 1px solid var(--line); animation: rise 0.9s ease both;
    }
    .stat strong {
      display: block; font-family: Syne, sans-serif; font-size: 1.7rem; margin-top: 0.25rem;
    }
    .stat span { color: var(--muted); font-size: 0.9rem; }
    h2, h3, h4 { font-family: Syne, "IBM Plex Sans SC", sans-serif; letter-spacing: -0.02em; }
    h2 { font-size: 1.35rem; margin: 0 0 0.7rem; }
    h3 { font-size: 1.15rem; margin: 0.2rem 0; }
    h4 { font-size: 0.95rem; margin: 0 0 0.45rem; color: var(--accent); }
    .summary { line-height: 1.7; color: #243029; }
    .muted { color: var(--muted); }
    .eyebrow { text-transform: none; color: var(--muted); font-size: 0.85rem; margin: 0; }
    .meter { display: flex; align-items: center; gap: 0.6rem; min-width: 140px; }
    .meter-track { flex: 1; height: 8px; background: rgba(20,32,25,0.08); border-radius: 999px; overflow: hidden; }
    .meter-fill {
      height: 100%; width: 0; background: linear-gradient(90deg, var(--accent), #27a883);
      border-radius: inherit; animation: fill 1.1s ease forwards;
    }
    .meter-label { font-weight: 600; font-variant-numeric: tabular-nums; }
    .layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 1rem; margin-top: 1rem; }
    .timeline { list-style: none; margin: 0; padding: 0; }
    .timeline li { display: grid; grid-template-columns: 18px 1fr; gap: 0.7rem; padding: 0.55rem 0; }
    .dot {
      width: 12px; height: 12px; margin-top: 0.35rem; border-radius: 50%;
      background: var(--accent); box-shadow: 0 0 0 4px rgba(15,122,95,0.15);
    }
    .t-date { margin: 0; font-size: 0.82rem; color: var(--muted); }
    .t-title { margin: 0.15rem 0; font-weight: 600; }
    .t-meta { margin: 0; font-size: 0.86rem; color: var(--muted); }
    .delta.up { color: var(--accent); } .delta.down { color: var(--danger); }
    .meeting { margin-top: 1rem; padding: 1.2rem; border-radius: var(--radius); background: rgba(255,255,255,0.78); border: 1px solid var(--line); animation: rise 1s ease both; }
    .meeting header { display: flex; justify-content: space-between; gap: 1rem; align-items: start; flex-wrap: wrap; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.8rem; }
    ul { margin: 0; padding-left: 1.1rem; line-height: 1.6; }
    .actions { list-style: none; padding: 0; }
    .actions li { display: grid; grid-template-columns: 1.2rem 1fr; gap: 0.55rem; padding: 0.45rem 0; border-bottom: 1px dashed var(--line); }
    .actions li:last-child { border-bottom: 0; }
    .actions p { margin: 0; }
    .actions small { color: var(--muted); }
    .actions .done { opacity: 0.72; }
    .actions .tick { color: var(--accent); font-weight: 700; }
    .source { margin: 1rem 0 0; font-size: 0.82rem; color: var(--muted); word-break: break-all; }
    footer { margin-top: 2rem; color: var(--muted); font-size: 0.85rem; text-align: center; }
    @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @keyframes fill { from { width: 0; } }
    @media (max-width: 820px) {
      .stats, .layout, .grid-2 { grid-template-columns: 1fr 1fr; }
      .layout { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .stats, .grid-2 { grid-template-columns: 1fr; }
      .wrap { width: min(100% - 1.2rem, 1100px); }
      .hero { padding: 1.6rem 1.2rem; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <p class="brand">纪脉</p>
      <h1>${escapeHtml(project.name)}</h1>
      <p>${escapeHtml(project.summary)}</p>
      <div class="hero-meta">
        <span class="chip">阶段 · ${escapeHtml(project.phase)}</span>
        <span class="chip">健康度 · ${escapeHtml(project.health)}</span>
        <span class="chip">纪要 · ${project.meetingCount} 份</span>
        ${project.latestReporter ? `<span class="chip">最新汇报 · ${escapeHtml(project.latestReporter)}</span>` : ""}
        <span class="chip">生成于 · ${escapeHtml(new Date(generatedAt).toLocaleString("zh-CN"))}</span>
      </div>
    </header>

    <section class="stats">
      <div class="stat"><span>当前进度</span><strong>${project.currentProgress == null ? "—" : `${project.currentProgress}%`}</strong></div>
      <div class="stat"><span>关键决议</span><strong>${project.decisionCount}</strong></div>
      <div class="stat"><span>未关闭待办</span><strong>${project.openActionCount}</strong></div>
      <div class="stat"><span>活跃遗留点</span><strong>${project.openLeftoverCount ?? 0}</strong></div>
    </section>

    <div class="layout">
      <section class="panel">
        <h2>项目进度总览</h2>
        ${progressBar(project.currentProgress)}
        <div style="margin-top:1rem">
          <h4>关键决议</h4>
          ${renderList(project.keyDecisions, "暂无决议")}
          <h4 style="margin-top:1rem">活跃风险</h4>
          ${renderList(project.activeRisks, "暂无显著风险")}
        </div>
      </section>
      <section class="panel">
        <h2>进度时间线</h2>
        <ol class="timeline">${timeline}</ol>
      </section>
    </div>

    <section class="panel">
      <h2>优先遗留点</h2>
      ${renderStatusItems(project.priorityLeftovers, "暂无活跃遗留点")}
    </section>

    <section class="panel">
      <h2>优先行动项</h2>
      ${renderStatusItems(project.priorityActions, "暂无行动项")}
    </section>

    <section>
      <div class="panel" style="margin-bottom:0">
        <h2>每次会议纪要总结</h2>
        <p class="muted" style="margin:0">含项目名称、汇报人、议题、进展与遗留点状态。</p>
      </div>
      ${meetingCards}
    </section>

    <footer>由纪脉根据链接/纪要自动识别生成 · 仅供项目协作参考</footer>
  </div>
</body>
</html>`;
}
