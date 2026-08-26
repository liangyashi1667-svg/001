import { load } from "cheerio";
import { marked } from "marked";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractFromHtml(html, sourceUrl = "") {
  const $ = load(html);
  $("script, style, noscript, iframe, svg").remove();

  const title =
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    "未命名文档";

  const main =
    $("article").text() ||
    $("main").text() ||
    $(".markdown-body").text() ||
    $("body").text() ||
    $.root().text();

  return {
    title,
    text: normalizeText(main),
    sourceUrl,
    contentType: "html",
  };
}

async function readLocalSample(urlPath) {
  const rel = urlPath.replace(/^\/samples\//, "");
  const filePath = path.join(ROOT, "samples", rel);
  if (!filePath.startsWith(path.join(ROOT, "samples"))) {
    throw new Error("非法本地样例路径");
  }
  const raw = await fs.readFile(filePath, "utf8");
  if (filePath.endsWith(".md") || filePath.endsWith(".markdown")) {
    const html = marked.parse(raw);
    const doc = extractFromHtml(html, urlPath);
    return { ...doc, text: normalizeText(raw), contentType: "markdown" };
  }
  return extractFromHtml(raw, urlPath);
}

export async function fetchDocument(inputUrl) {
  const url = String(inputUrl || "").trim();
  if (!url) throw new Error("链接不能为空");

  if (url.startsWith("/samples/") || url.startsWith("samples/")) {
    const localPath = url.startsWith("/") ? url : `/${url}`;
    return readLocalSample(localPath);
  }

  if (url.startsWith("text://")) {
    const body = decodeURIComponent(url.slice("text://".length));
    const firstLine = body.split("\n").find((l) => l.trim()) || "粘贴文本";
    return {
      title: firstLine.replace(/^#\s*/, "").slice(0, 80),
      text: normalizeText(body),
      sourceUrl: "pasted://local",
      contentType: "text",
    };
  }

  if (url.startsWith("file://")) {
    const filePath = decodeURIComponent(url.slice("file://".length));
    const uploadsRoot = path.join(ROOT, "uploads");
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(uploadsRoot)) {
      throw new Error("仅允许读取本工具上传目录中的文件");
    }
    const raw = await fs.readFile(resolved, "utf8");
    const name = path.basename(resolved);
    if (/\.(md|markdown|txt)$/i.test(name)) {
      return {
        title: name.replace(/\.(md|markdown|txt)$/i, ""),
        text: normalizeText(raw),
        sourceUrl: `upload://${name}`,
        contentType: name.endsWith(".txt") ? "text" : "markdown",
      };
    }
    return extractFromHtml(raw, `upload://${name}`);
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`无效链接：${url}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("仅支持 http/https 链接，本地样例 /samples/...，或上传文档");
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LiuJiFollowupBot/1.0 (+meeting leftover tracker)",
      Accept: "text/html,text/markdown,text/plain,*/*",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`抓取失败 ${response.status}：${url}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (
    contentType.includes("markdown") ||
    url.endsWith(".md") ||
    url.endsWith(".markdown")
  ) {
    const html = marked.parse(raw);
    const doc = extractFromHtml(html, url);
    return { ...doc, text: normalizeText(raw), contentType: "markdown" };
  }

  if (contentType.includes("text/plain")) {
    const firstLine = raw.split("\n").find((l) => l.trim()) || url;
    return {
      title: firstLine.replace(/^#\s*/, "").slice(0, 80),
      text: normalizeText(raw),
      sourceUrl: url,
      contentType: "text",
    };
  }

  return extractFromHtml(raw, url);
}

export async function listSampleMeetings() {
  const dir = path.join(ROOT, "samples", "meetings");
  const files = await fs.readdir(dir);
  return files
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({
      name: f,
      url: `/samples/meetings/${f}`,
    }));
}
