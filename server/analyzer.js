const SECTION_HINTS = {
  decisions: ["决议", "决定", "结论", "decision", "resolved", "共识"],
  leftovers: [
    "遗留点",
    "遗留项",
    "遗留问题",
    "行动项",
    "待办",
    "跟进",
    "action",
    "todo",
    "下一步",
    "任务",
  ],
  progress: ["进度", "进展", "status", "完成度", "里程碑"],
  risks: ["风险", "问题", "阻塞", "blocker", "risk", "障碍"],
  agenda: ["议题", "议程", "agenda", "讨论"],
};

const STATUS = {
  open: "未关闭",
  doing: "跟进中",
  done: "已完成",
};

function splitLines(text) {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function matchSection(line) {
  const normalized = line.replace(/^#+\s*/, "").replace(/[*_]/g, "").trim();
  for (const [key, hints] of Object.entries(SECTION_HINTS)) {
    if (hints.some((h) => normalized.toLowerCase().includes(h.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

function cleanBullet(line) {
  return line
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+[\.\)、]\s*/, "")
    .replace(/^\[[ xX\-~]\]\s*/, "")
    .trim();
}

function isBullet(line) {
  return /^(-|\*|•|\d+[\.\)、]|\[[ xX\-~]\])\s+/.test(line);
}

function fieldValue(text, labels) {
  const label = labels.join("|");
  const re = new RegExp(
    `(?:${label})\\s*[*_]*\\s*[：:]\\s*[*_]*\\s*([^\\n*]+)`,
    "i"
  );
  const m = text.match(re);
  return m?.[1]?.trim() || null;
}

function extractMeta(text, fallbackTitle) {
  const lines = splitLines(text);
  const title =
    lines.find((l) => l.startsWith("# "))?.replace(/^#\s*/, "") ||
    fallbackTitle ||
    "未命名会议";

  const dateRaw = fieldValue(text, ["日期", "时间", "Date"]);
  const dateMatch = dateRaw?.match(
    /([0-9]{4}[-/.年][0-9]{1,2}[-/.月][0-9]{1,2}日?|[0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4})/
  );
  const reporterMatch = fieldValue(text, [
    "汇报人",
    "报告人",
    "主讲",
    "Presenter",
    "Reporter",
  ]);
  const hostMatch = fieldValue(text, ["主持人", "Host"]);
  const attendeesMatch = fieldValue(text, ["参会人", "出席", "Attendees", "Attendee"]);
  const projectMatch = fieldValue(text, ["项目名称", "项目", "Project"]);

  let date = dateMatch?.[1]?.replace(/[年月]/g, "-").replace(/日/g, "") || null;
  if (!date) {
    const loose = text.match(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}/);
    date = loose?.[0]?.replace(/\./g, "-") || null;
  }

  const titleProject = title.split(/[·|丨—-]/)[0]?.trim() || null;

  return {
    title: title.trim(),
    projectName: projectMatch || titleProject,
    date,
    reporter: (reporterMatch || hostMatch || "").trim() || null,
    host: hostMatch || null,
    attendees: attendeesMatch
      ? attendeesMatch
          .split(/[、,，;；]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  };
}

function extractPercent(text) {
  const patterns = [
    /整体进度\s*(?:约|大约|为)?\s*(\d{1,3})\s*%/,
    /进度\s*(?:约|大约|为|：|:)?\s*(\d{1,3})\s*%/,
    /completion[^\d]{0,12}(\d{1,3})\s*%/i,
    /(\d{1,3})\s*%\s*(?:完成|进度)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 0 && n <= 100) return n;
    }
  }
  return null;
}

function looksLikeLeftover(line) {
  if (/^#{1,6}\s*/.test(line)) return false;
  if (matchSection(line)) return false;
  const hasCheckbox = /\[[ xX\-~]\]/.test(line);
  const hasOwnerDue =
    /^[-*•]\s*[\u4e00-\u9fa5A-Za-z·]{1,12}\s*[：:].+/.test(line) &&
    /(截止|due|负责|owner|跟进)/i.test(line);
  const hasOwnerTask = /^[-*•]\s*[\u4e00-\u9fa5A-Za-z·]{1,12}\s*[：:]/.test(
    line
  );
  const hasStatusHint = /（?(未关闭|跟进中|进行中|已完成|待办|阻塞)）?/.test(line);
  return hasCheckbox || hasOwnerDue || hasOwnerTask || hasStatusHint;
}

function inferStatus(line, text) {
  if (/\[[xX]\]/.test(line) || /（已完成）|\(已完成\)|已完成|done|closed/i.test(text)) {
    return "done";
  }
  if (/\[[\-~]\]/.test(line) || /跟进中|进行中|处理中|in\s*progress/i.test(text)) {
    return "doing";
  }
  return "open";
}

function extractLeftovers(lines, scopedLines = []) {
  const source = scopedLines.length ? scopedLines : lines;
  const items = [];
  for (const line of source) {
    if (!looksLikeLeftover(line) && !(scopedLines.length && isBullet(line))) {
      continue;
    }
    if (scopedLines.length && !isBullet(line) && !/\[[ xX\-~]\]/.test(line)) {
      continue;
    }

    const text = cleanBullet(line);
    if (!text || text.length < 2) continue;
    if (/^(决议|行动项|遗留|进度|风险|议题|议程)/.test(text)) continue;

    const ownerMatch = text.match(
      /^([\u4e00-\u9fa5A-Za-z·]{2,12})\s*[：:]/
    );
    const dueMatch = text.match(
      /截止\s*([0-9]{1,2}[-/.月][0-9]{1,2}日?|[0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2})/
    );
    const status = inferStatus(line, text);

    items.push({
      id: `lf-${items.length + 1}`,
      text,
      status,
      statusLabel: STATUS[status],
      owner: ownerMatch?.[1] || null,
      due: dueMatch?.[1] || null,
    });
  }
  return items;
}

function parseSections(text) {
  const lines = splitLines(text);
  const buckets = {
    decisions: [],
    leftovers: [],
    progress: [],
    risks: [],
    agenda: [],
    other: [],
  };
  const rawBuckets = {
    decisions: [],
    leftovers: [],
    progress: [],
    risks: [],
    agenda: [],
    other: [],
  };

  let current = "other";
  for (const line of lines) {
    if (
      /^#+\s*/.test(line) ||
      /^(决议|行动项|遗留点|遗留项|进度|风险|议题|议程)\b/.test(line)
    ) {
      const section = matchSection(line);
      if (section) {
        current = section;
        continue;
      }
    }

    rawBuckets[current].push(line);
    if (isBullet(line) || current !== "other") {
      const cleaned = cleanBullet(line);
      if (cleaned) buckets[current].push(cleaned);
    }
  }

  return { buckets, rawBuckets };
}

function inferPhase(percent, text) {
  if (percent == null) {
    if (/启动|kickoff|立项/i.test(text)) return "启动期";
    if (/需求|评审/i.test(text)) return "需求期";
    if (/开发|联调|迭代/i.test(text)) return "开发期";
    if (/上线|发布|验收/i.test(text)) return "上线冲刺";
    return "进行中";
  }
  if (percent < 15) return "启动期";
  if (percent < 35) return "需求期";
  if (percent < 70) return "开发期";
  if (percent < 90) return "上线冲刺";
  return "收尾/运维";
}

function leftoverStats(items) {
  const open = items.filter((i) => i.status === "open").length;
  const doing = items.filter((i) => i.status === "doing").length;
  const done = items.filter((i) => i.status === "done").length;
  return {
    total: items.length,
    open,
    doing,
    done,
    pending: open + doing,
  };
}

function summarizeMeeting(doc, index) {
  const meta = extractMeta(doc.text, doc.title);
  const { buckets, rawBuckets } = parseSections(doc.text);
  const leftovers = extractLeftovers(
    splitLines(doc.text),
    rawBuckets.leftovers
  ).map((item, i) => ({
    ...item,
    id: `m${index + 1}-lf-${i + 1}`,
  }));
  const percent = extractPercent(doc.text);
  const phase = inferPhase(percent, doc.text);
  const stats = leftoverStats(leftovers);

  const progressNotes =
    buckets.progress.length > 0
      ? buckets.progress
      : percent != null
        ? [`整体进度约 ${percent}%`]
        : [];

  const highlights = [];
  if (stats.pending > 0) {
    const firstPending = leftovers.find((l) => l.status !== "done");
    highlights.push(`待跟进 ${stats.pending} 项`);
    if (firstPending) highlights.push(firstPending.text);
  } else if (stats.total > 0) {
    highlights.push("遗留点已全部关闭");
  }
  if (percent != null) highlights.push(`进度 ${percent}%`);

  return {
    id: `meeting-${index + 1}`,
    title: meta.title,
    projectName: meta.projectName,
    date: meta.date,
    reporter: meta.reporter,
    host: meta.host,
    attendees: meta.attendees,
    sourceUrl: doc.sourceUrl,
    phase,
    progressPercent: percent,
    progressNotes: progressNotes.slice(0, 8),
    agenda: buckets.agenda.slice(0, 12),
    decisions: buckets.decisions.slice(0, 8),
    risks: buckets.risks.slice(0, 6),
    leftovers,
    leftoverStats: stats,
    highlights: highlights.slice(0, 4),
    summary: buildMeetingSummary(meta, phase, percent, stats, progressNotes),
  };
}

function buildMeetingSummary(meta, phase, percent, stats, progressNotes) {
  const parts = [];
  parts.push(`${meta.date || "日期未识别"}「${meta.title}」`);
  if (meta.reporter) parts.push(`汇报人 ${meta.reporter}`);
  parts.push(`阶段 ${phase}`);
  if (percent != null) parts.push(`进度约 ${percent}%`);
  else if (progressNotes[0]) parts.push(progressNotes[0]);
  parts.push(
    `遗留点 ${stats.total} 项（未关闭 ${stats.open}，跟进中 ${stats.doing}，已完成 ${stats.done}）`
  );
  return parts.join(" · ");
}

function uniqueStrings(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function aggregateProject(meetings, projectName) {
  const sorted = [...meetings].sort((a, b) =>
    String(a.date || "").localeCompare(String(b.date || ""))
  );
  const latest = sorted[sorted.length - 1];
  const percents = sorted
    .map((m) => m.progressPercent)
    .filter((n) => typeof n === "number");
  const currentProgress =
    percents.length > 0 ? percents[percents.length - 1] : null;

  const allLeftovers = sorted.flatMap((m) =>
    m.leftovers.map((l) => ({
      ...l,
      meetingId: m.id,
      meetingTitle: m.title,
      meetingDate: m.date,
    }))
  );
  const stats = leftoverStats(allLeftovers);
  const pending = allLeftovers.filter((l) => l.status !== "done");
  const reporters = uniqueStrings(
    sorted.map((m) => m.reporter).filter(Boolean)
  );

  const name =
    projectName ||
    latest?.projectName ||
    latest?.title?.split(/[·|丨]/)[0]?.trim() ||
    "未命名项目";

  const health =
    stats.pending === 0 && stats.total > 0
      ? "清零"
      : stats.open >= 5
        ? "积压"
        : stats.doing > 0 && stats.open <= 2
          ? "推进中"
          : currentProgress != null && currentProgress >= 80
            ? "冲刺跟进"
            : "正常";

  return {
    name,
    currentProgress,
    phase: latest?.phase || "进行中",
    health,
    meetingCount: sorted.length,
    reporters,
    leftoverStats: stats,
    pendingLeftovers: pending.slice(0, 12),
    latestMeetingId: latest?.id || null,
    latestMeetingTitle: latest?.title || null,
    latestMeetingDate: latest?.date || null,
    summary: `项目「${name}」共 ${sorted.length} 场会议，遗留点 ${stats.total} 项，待跟进 ${stats.pending} 项，健康度「${health}」。`,
  };
}

export function analyzeDocuments(documents, options = {}) {
  const meetings = documents.map((doc, index) => summarizeMeeting(doc, index));
  const project = aggregateProject(meetings, options.projectName);
  return {
    generatedAt: new Date().toISOString(),
    project,
    meetings,
  };
}

export function applyLeftoverStatus(analysis, meetingId, leftoverId, status) {
  if (!["open", "doing", "done"].includes(status)) {
    throw new Error("状态仅支持 open / doing / done");
  }
  const meeting = analysis.meetings.find((m) => m.id === meetingId);
  if (!meeting) throw new Error("未找到该会议");
  const item = meeting.leftovers.find((l) => l.id === leftoverId);
  if (!item) throw new Error("未找到该遗留点");

  item.status = status;
  item.statusLabel = STATUS[status];
  meeting.leftoverStats = leftoverStats(meeting.leftovers);
  meeting.summary = buildMeetingSummary(
    {
      title: meeting.title,
      date: meeting.date,
      reporter: meeting.reporter,
    },
    meeting.phase,
    meeting.progressPercent,
    meeting.leftoverStats,
    meeting.progressNotes
  );

  analysis.project = aggregateProject(analysis.meetings, analysis.project.name);
  analysis.updatedAt = new Date().toISOString();
  return analysis;
}

export { STATUS };
