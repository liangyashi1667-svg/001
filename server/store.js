import { randomUUID } from "node:crypto";

const sessions = new Map();
const TTL_MS = 1000 * 60 * 60 * 12;

function prune() {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.touchedAt > TTL_MS) sessions.delete(id);
  }
}

export function saveAnalysis(analysis) {
  prune();
  const id = randomUUID().slice(0, 8);
  const entry = {
    id,
    analysis,
    createdAt: Date.now(),
    touchedAt: Date.now(),
  };
  sessions.set(id, entry);
  return id;
}

export function getAnalysis(id) {
  prune();
  const entry = sessions.get(id);
  if (!entry) return null;
  entry.touchedAt = Date.now();
  return entry.analysis;
}

export function updateAnalysis(id, analysis) {
  const entry = sessions.get(id);
  if (!entry) return false;
  entry.analysis = analysis;
  entry.touchedAt = Date.now();
  return true;
}

export function listSessions() {
  prune();
  return [...sessions.values()].map((s) => ({
    id: s.id,
    projectName: s.analysis.project?.name,
    meetingCount: s.analysis.meetings?.length || 0,
    pending: s.analysis.project?.leftoverStats?.pending ?? 0,
    createdAt: new Date(s.createdAt).toISOString(),
  }));
}
