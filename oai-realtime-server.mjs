import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
await loadLocalEnv();

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";
const defaultVoice = process.env.OPENAI_REALTIME_VOICE || "marin";
const allowedVoices = new Set(["marin", "cedar"]);
const safetyId = process.env.OPENAI_SAFETY_IDENTIFIER || "local-preview-user";
const vadThreshold = readNumberEnv("OPENAI_REALTIME_VAD_THRESHOLD", 0.68);
const vadPrefixPaddingMs = readNumberEnv("OPENAI_REALTIME_VAD_PREFIX_PADDING_MS", 500);
const vadSilenceDurationMs = readNumberEnv("OPENAI_REALTIME_VAD_SILENCE_DURATION_MS", 850);
const interruptResponse = process.env.OPENAI_REALTIME_INTERRUPT_RESPONSE !== "false";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

async function loadLocalEnv() {
  try {
    const text = await readFile(join(root, ".env"), "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if (!key || process.env[key]) continue;
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // .env is optional; environment variables still work.
  }
}

function readNumberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function voiceFromRequest(req) {
  const url = new URL(req.url, "http://localhost");
  const requested = url.searchParams.get("voice") || defaultVoice;
  return allowedVoices.has(requested) ? requested : defaultVoice;
}

function realtimeSessionConfig(req) {
  const voice = voiceFromRequest(req);
  return JSON.stringify({
    type: "realtime",
    model,
    instructions:
      "你是 AI 耳机中的语音助手，正在帮助用户完成实验任务。你只能在用户主动提问、追问或确认时回应，不要主动打断用户。回答必须基于当前任务材料，不要编造材料中不存在的信息。用中文、清楚、自然、适合语音收听的方式回答。",
    audio: {
      input: {
        turn_detection: {
          type: "server_vad",
          threshold: vadThreshold,
          prefix_padding_ms: vadPrefixPaddingMs,
          silence_duration_ms: vadSilenceDurationMs,
          create_response: true,
          interrupt_response: interruptResponse,
        },
      },
      output: { voice },
    },
  });
}

async function createRealtimeSession(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 500, { error: "Missing OPENAI_API_KEY" });
    return;
  }

  const sdp = await readBody(req);
  if (!sdp.trim()) {
    sendJson(res, 400, { error: "Missing SDP offer" });
    return;
  }

  const fd = new FormData();
  fd.set("sdp", sdp);
  fd.set("session", realtimeSessionConfig(req));

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "OpenAI-Safety-Identifier": safetyId,
    },
    body: fd,
  });

  const text = await response.text();
  res.writeHead(response.status, {
    "Content-Type": response.headers.get("content-type") || "application/sdp",
  });
  res.end(text);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const cleanPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, cleanPath === "/" ? "index.html" : cleanPath);
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url?.startsWith("/healthz")) {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === "POST" && req.url?.startsWith("/session")) {
      await createRealtimeSession(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server error" });
  }
}).listen(port, host, () => {
  const localUrl = host === "0.0.0.0" ? `http://127.0.0.1:${port}` : `http://${host}:${port}`;
  console.log(`AI voice preview: ${localUrl}`);
});
