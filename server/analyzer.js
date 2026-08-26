const SECTION_HINTS = {
  decisions: ["决议", "决定", "结论", "decision", "resolved", "共识"],
  actions: ["行动项", "待办", "action", "todo", "下一步", "任务"],
  progress: ["进度", "进展", "status", "完成度", "里程碑"],
  risks: ["风险", "问题", "阻塞", "blocker", "risk", "障碍"],
  agenda: ["议题", "议程", "agenda", "讨论"],
  leftovers: ["遗留", "遗留点", "open issue", "follow-up", "跟进项", "未决"],
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
    .replace(/^\[[ xX]\]\s*/, "")
    .trim();
}

function isBullet(line) {
  return /^(-|\*|•|\d+[\.\)、]|\[[ xX]\])\s+/.test(line);
}

function stripInlineMarkdown(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .trim();
}

function extractMeta(text, fallbackTitle) {
  const plain = stripInlineMarkdown(text);
  const lines = splitLines(text);
  const title =
    lines.find((l) => l.startsWith("# "))?.replace(/^#\s*/, "") ||
    fallbackTitle ||
    "未命名会议";

  const dateMatch = plain.match(
    /(?:日期|时间|Date)\s*[：:]\s*([0-9]{4}[-/.年][0-9]{1,2}[-/.月][0-9]{1,2}日?|[0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4})/i
  );
  const reporterMatch = plain.match(
    /(?:汇报人|报告人|主讲人|汇报者|Presenter|Reporter)\s*[：:]\s*([^\n]+)/i
  );
  const hostMatch = plain.match(/(?:主持人|Host)\s*[：:]\s*([^\n]+)/i);
  const attendeesMatch = plain.match(
    /(?:参会人|出席|Attendees?)\s*[：:]\s*([^\n]+)/i
  );
  const projectMatch = plain.match(
    /(?:项目名称|所属项目|Project)\s*[：:]\s*([^\n]+)/i
  );

  let date = dateMatch?.[1]?.replace(/[年月]/g, "-").replace(/日/g, "") || null;
  if (!date) {
    const loose = text.match(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}/);
    date = loose?.[0]?.replace(/\./g, "-") || null;
  }

  const projectFromTitle = title.split(/[·|丨]/)[0]?.trim() || null;

  return {
    title: title.trim(),
    date,
    reporter: reporterMatch?.[1]?.trim() || hostMatch?.[1]?.trim() || null,
    host: hostMatch?.[1]?.trim() || null,
    attendees: attendeesMatch
      ? attendeesMatch[1]
          .split(/[、,，;；]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    projectNameHint: projectMatch?.[1]?.trim() || projectFromTitle,
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

function looksLikeAction(line) {
  if (/^#{1,6}\s*/.test(line)) return false;
  if (matchSection(line)) return false;
  const hasCheckbox = /\[[ xX]\]/.test(line);
  const hasOwnerDue =
    /^[-*•]\s*[\u4e00-\u9fa5A-Za-z·]{1,12}\s*[：:].+/.test(line) &&
    /(截止|due|负责|owner)/i.test(line);
  const hasOwnerTask = /^[-*•]\s*[\u4e00-\u9fa5A-Za-z·]{1,12}\s*[：:]/.test(
    line
  );
  return hasCheckbox || hasOwnerDue || hasOwnerTask;
}

function parseItemStatus(line, text) {
  const done =
    /\[[xX]\]/.test(line) ||
    /（已完成）|\(已完成\)|已完成$|done|已关闭|已解决/i.test(text);
  const blocked = /阻塞|blocked|卡住|待外部/i.test(text);
  const inProgress = /进行中|处理中|in progress/i.test(text);
  if (done) return "已关闭";
  if (blocked) return "阻塞中";
  if (inProgress) return "进行中";
  return "未关闭";
}

function extractActionItems(lines, scopedLines = []) {
  const source = scopedLines.length ? scopedLines : lines;
  const items = [];
  for (const line of source) {
    if (!looksLikeAction(line) && !(scopedLines.length && isBullet(line))) {
      continue;
    }
    if (scopedLines.length && !isBullet(line) && !/\[[ xX]\]/.test(line)) {
      continue;
    }

    const text = cleanBullet(line);
    if (!text || text.length < 2) continue;
    if (/^(决议|行动项|进度|风险|议题|议程|遗留)/.test(text)) continue;

    const ownerMatch = text.match(
      /^([\u4e00-\u9fa5A-Za-z·]{2,12})\s*[：:]/
    );
    const dueMatch = text.match(
      /截止\s*([0-9]{1,2}[-/.月][0-9]{1,2}日?|[0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2})/
    );
    const status = parseItemStatus(line, text);

    items.push({
      text,
      done: status === "已关闭",
      status,
      owner: ownerMatch?.[1] || null,
      due: dueMatch?.[1] || null,
    });
  }
  return items;
}

function extractLeftovers(rawLines, actionItems) {
  const leftovers = [];
  for (const line of rawLines) {
    if (!isBullet(line) && !/\[[ xX]\]/.test(line)) continue;
    const text = cleanBullet(line);
    if (!text || text.length < 2) continue;
    const status = parseItemStatus(line, text);
    leftovers.push({
      text,
      status,
      done: status === "已关闭",
      owner:
        text.match(/^([\u4e00-\u9fa5A-Za-z·]{2,12})\s*[：:]/)?.[1] || null,
      due:
        text.match(
          /截止\s*([0-9]{1,2}[-/.月][0-9]{1,2}日?|[0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2})/
        )?.[1] || null,
    });
  }

  if (leftovers.length) return leftovers;

  // 无独立「遗留点」章节时，用未关闭行动项作为遗留点
  return actionItems
    .filter((a) => !a.done)
    .map((a) => ({
      text: a.text,
      status: a.status || "未关闭",
      done: false,
      owner: a.owner,
      due: a.due,
    }));
}

function parseSections(text) {
  const lines = splitLines(text);
  const buckets = {
    decisions: [],
    actions: [],
    progress: [],
    risks: [],
    agenda: [],
    leftovers: [],
    other: [],
  };
  const rawBuckets = {
    decisions: [],
    actions: [],
    progress: [],
    risks: [],
    agenda: [],
    leftovers: [],
    other: [],
  };

  let current = "other";
  for (const line of lines) {
    if (
      /^#+\s*/.test(line) ||
      /^(决议|行动项|进度|风险|议题|议程|遗留|遗留点)\b/.test(line)
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

function leftoverStatusSummary(leftovers) {
  const total = leftovers.length;
  const closed = leftovers.filter((l) => l.done || l.status === "已关闭").length;
  const blocked = leftovers.filter((l) => l.status === "阻塞中").length;
  const open = total - closed;
  let label = "无遗留";
  if (total === 0) label = "无遗留";
  else if (open === 0) label = "全部关闭";
  else if (blocked > 0) label = `${open} 项未关闭（含阻塞）`;
  else label = `${open} 项未关闭`;
  return { total, closed, open, blocked, label };
}

function summarizeMeeting(doc) {
  const meta = extractMeta(doc.text, doc.title);
  const { buckets, rawBuckets } = parseSections(doc.text);
  const actionItems = extractActionItems(
    splitLines(doc.text),
    rawBuckets.actions
  );
  const leftovers = extractLeftovers(rawBuckets.leftovers, actionItems);
  const leftoverStats = leftoverStatusSummary(leftovers);
  const percent = extractPercent(doc.text);
  const phase = inferPhase(percent, doc.text);

  const openActions = actionItems.filter((a) => !a.done);
  const doneActions = actionItems.filter((a) => a.done);

  const highlights = [];
  if (buckets.decisions[0]) highlights.push(`决议：${buckets.decisions[0]}`);
  if (percent != null) highlights.push(`进度约 ${percent}%（${phase}）`);
  if (leftovers.find((l) => !l.done)) {
    highlights.push(`遗留：${leftovers.find((l) => !l.done).text}`);
  } else if (openActions[0]) {
    highlights.push(`待办：${openActions[0].text}`);
  }
  if (buckets.risks[0]) highlights.push(`风险：${buckets.risks[0]}`);

  const summaryParts = [];
  summaryParts.push(`${meta.date || "日期未识别"}召开「${meta.title}」`);
  if (meta.reporter) summaryParts.push(`汇报人 ${meta.reporter}`);
  if (buckets.agenda.length) {
    summaryParts.push(`议题 ${buckets.agenda.length} 项`);
  }
  if (buckets.decisions.length) {
    summaryParts.push(
      `形成 ${buckets.decisions.length} 项决议，重点为「${buckets.decisions[0]}」`
    );
  }
  if (actionItems.length) {
    summaryParts.push(
      `行动项 ${actionItems.length} 项（已完成 ${doneActions.length}，未完成 ${openActions.length}）`
    );
  }
  if (percent != null) {
    summaryParts.push(`纪要记载整体进度约 ${percent}%，阶段判断为${phase}`);
  } else if (buckets.progress[0]) {
    summaryParts.push(`进展摘要：${buckets.progress[0]}`);
  }
  if (leftoverStats.total) {
    summaryParts.push(`遗留点 ${leftoverStats.label}`);
  }
  if (buckets.risks.length) {
    summaryParts.push(`主要风险：${buckets.risks[0]}`);
  }

  return {
    id: null,
    title: meta.title,
    projectName: meta.projectNameHint,
    date: meta.date,
    reporter: meta.reporter,
    host: meta.host,
    attendees: meta.attendees,
    sourceUrl: doc.sourceUrl,
    phase,
    progressPercent: percent,
    agenda: buckets.agenda.slice(0, 12),
    decisions: buckets.decisions.slice(0, 8),
    risks: buckets.risks.slice(0, 6),
    progressNotes: buckets.progress.slice(0, 6),
    actionItems: actionItems.slice(0, 20),
    leftovers: leftovers.slice(0, 20),
    leftoverStatus: leftoverStats,
    openActionCount: openActions.length,
    doneActionCount: doneActions.length,
    highlights: highlights.slice(0, 4),
    summary: summaryParts.join("；") + "。",
  };
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

function buildTimeline(meetings) {
  return [...meetings]
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((m, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1].progressPercent : null;
      const curr = m.progressPercent;
      let delta = null;
      if (prev != null && curr != null) delta = curr - prev;
      return {
        date: m.date,
        title: m.title,
        reporter: m.reporter,
        phase: m.phase,
        progressPercent: curr,
        delta,
        leftoverLabel: m.leftoverStatus?.label || "无遗留",
        summary: m.summary,
      };
    });
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
  const startProgress = percents.length > 0 ? percents[0] : null;

  const allDecisions = uniqueStrings(sorted.flatMap((m) => m.decisions));
  const recent = sorted.slice(-2);
  const allRisks = uniqueStrings(recent.flatMap((m) => m.risks));
  const openActions = recent
    .flatMap((m) =>
      m.actionItems.map((a) => ({ ...a, meeting: m.title, date: m.date }))
    )
    .filter((a) => !a.done);
  const doneActions = sorted
    .flatMap((m) => m.actionItems)
    .filter((a) => a.done);
  const openLeftovers = recent
    .flatMap((m) =>
      (m.leftovers || []).map((l) => ({
        ...l,
        meeting: m.title,
        date: m.date,
      }))
    )
    .filter((l) => !l.done);

  const name =
    projectName ||
    latest?.projectName ||
    latest?.title?.split(/[·|丨]/)[0]?.trim() ||
    "未命名项目";

  const reporters = uniqueStrings(
    sorted.map((m) => m.reporter).filter(Boolean)
  );

  const narrative = [];
  narrative.push(
    `基于 ${sorted.length} 份会议纪要，识别项目「${name}」当前处于「${latest?.phase || "进行中"}」`
  );
  if (currentProgress != null) {
    narrative.push(`最新整体进度约 ${currentProgress}%`);
    if (startProgress != null && startProgress !== currentProgress) {
      narrative.push(
        `较首份纪要（${startProgress}%）提升 ${Math.max(0, currentProgress - startProgress)} 个百分点`
      );
    }
  }
  narrative.push(
    `累计决议 ${allDecisions.length} 项，未关闭行动项 ${openActions.length} 项，活跃遗留点 ${openLeftovers.length} 项`
  );
  if (allRisks[0]) narrative.push(`当前需关注风险：${allRisks[0]}`);
  if (openLeftovers[0]) narrative.push(`优先遗留：${openLeftovers[0].text}`);
  else if (openActions[0]) narrative.push(`优先待办：${openActions[0].text}`);

  const health =
    currentProgress == null
      ? "信息不足"
      : allRisks.length >= 3 && currentProgress < 50
        ? "偏黄"
        : openActions.length > 8 || openLeftovers.length > 5
          ? "承压"
          : currentProgress >= 80
            ? "冲刺良好"
            : "稳健推进";

  return {
    name,
    reporters,
    latestReporter: latest?.reporter || null,
    currentProgress,
    phase: latest?.phase || "进行中",
    health,
    meetingCount: sorted.length,
    decisionCount: allDecisions.length,
    openActionCount: openActions.length,
    doneActionCount: doneActions.length,
    openLeftoverCount: openLeftovers.length,
    keyDecisions: allDecisions.slice(0, 8),
    activeRisks: allRisks.slice(0, 6),
    priorityActions: openActions.slice(0, 8),
    priorityLeftovers: openLeftovers.slice(0, 8),
    timeline: buildTimeline(sorted),
    summary: narrative.join("；") + "。",
    latestMeetingTitle: latest?.title || null,
    latestMeetingDate: latest?.date || null,
  };
}

export function analyzeDocuments(documents, options = {}) {
  const meetings = documents.map((doc, index) => {
    const meeting = summarizeMeeting(doc);
    meeting.id = `m-${index}`;
    return meeting;
  });
  const project = aggregateProject(meetings, options.projectName);
  // 回填统一项目名，便于详情页展示
  for (const m of meetings) {
    m.projectName = project.name;
  }
  return {
    generatedAt: new Date().toISOString(),
    project,
    meetings,
  };
}
