// build.mjs — Story Time anthology builder.
//
// Loads every work under works/ (a .mjs module or a data/*.json file), and for each:
//   1. builds a hero scene from its meta, then its content scenes
//   2. synthesizes ElevenLabs narration -> <id>/audio/sN.mp3 (+ word timings)
//   3. renders <id>/index.html (the narrated experience)
// Then renders the library landing page: index.html
//
// Usage:
//   node build.mjs                 build/refresh audio for all works, render everything
//   node build.mjs <id> [<id>...]  synth only those works (still renders all HTML)
//   node build.mjs --force         re-synthesize all audio even if cached
//   node build.mjs --html-only     no API calls; render HTML (browser-TTS fallback)
//
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKS_DIR = path.join(__dirname, "works");
const DATA_DIR = path.join(WORKS_DIR, "data");

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const HTML_ONLY = argv.includes("--html-only");
const ONLY = argv.filter((a) => !a.startsWith("--"));

/* ------------------------------------------------------------------ env */
function loadEnv() {
  const p = path.join(__dirname, ".env");
  const env = {};
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const s = line.trim();
      if (!s || s.startsWith("#")) continue;
      const i = s.indexOf("=");
      if (i === -1) continue;
      let v = s.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[s.slice(0, i).trim()] = v;
    }
  }
  return { ...env, ...process.env };
}

/* ------------------------------------------------------------- load works */
async function loadWorks() {
  const works = [];
  for (const f of fs.readdirSync(WORKS_DIR)) {
    if (f.endsWith(".mjs")) {
      const mod = await import(pathToFileURL(path.join(WORKS_DIR, f)).href);
      const w = mod.default || { meta: mod.meta, scenes: mod.scenes };
      if (w && w.meta) works.push(w);
    }
  }
  if (fs.existsSync(DATA_DIR)) {
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (f.endsWith(".json")) {
        const w = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8"));
        if (w && w.meta) works.push(w);
      }
    }
  }
  works.sort((a, b) => (a.meta.order || 99) - (b.meta.order || 99));
  return works;
}

/* --------------------------------------------------------- normalization */
function decodeEntities(s) {
  // decode structural entities but leave &amp; intact (valid HTML entity)
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function renderStats(stats) {
  if (!stats || !stats.length) return "";
  const items = stats.map((s) => {
    const u = s.u ? '<span class="u">' + s.u + "</span>" : "";
    const figStr = s.fig != null ? String(s.fig) : "";
    const numericFig = figStr !== "" && /^\d+$/.test(figStr);
    let figHtml;
    if (s.countTo != null && (numericFig || s.fig == null)) {
      const cf = s.countFrom != null ? s.countFrom : 0;
      figHtml = '<span data-count-from="' + cf + '" data-count-to="' + s.countTo + '">' + cf + "</span>";
    } else {
      figHtml = "<span>" + (figStr || "—") + "</span>"; // static figure, e.g. "30M", "$2k"
    }
    return '<div class="stat"><div class="fig">' + figHtml + u + '</div><div class="cap">' + (s.cap || "") + "</div></div>";
  });
  return '<div class="stats">' + items.join("") + "</div>";
}

function stripTags(s) {
  return String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// A figure the source paper provides, shown inside a scene. Images live in <id>/img/.
function figureHtml(src, alt, cap) {
  return '<figure class="figure"><a class="figlink" href="img/' + src + '" target="_blank" rel="noopener">' +
    '<img src="img/' + src + '" alt="' + esc(alt || "") + '" loading="lazy"></a>' +
    (cap ? '<figcaption>' + cap + "</figcaption>" : "") + "</figure>";
}

// A content scene may be "native" ({hue,sub,body,narration}) or "data"
// ({hue,eyebrow,title,bodyHtml,narration,stats,num}). Normalize both.
function normContentScene(s) {
  let body = s.body != null ? s.body : decodeEntities(s.bodyHtml || "");
  if (s.stats && s.stats.length && !/class="stats"/.test(body)) body += renderStats(s.stats);
  if (s.img) body += figureHtml(s.img, s.imgAlt, s.imgCaption);
  const sub = s.sub || stripTags(s.eyebrow) || "";
  return { hue: s.hue || "gold", sub, body, narration: s.narration || "", wide: !!s.wide };
}

function heroBody(meta) {
  const h = meta.hero || {};
  let epi = "";
  if (h.epigraph && h.epigraph.text) {
    epi = '<p class="epigraph">' + h.epigraph.text + (h.epigraph.cite ? '\n<cite>' + h.epigraph.cite + "</cite>" : "") + "</p>";
  }
  const kicker = '<p class="kicker">' + [meta.kind, meta.date].filter(Boolean).join(" · ") + "</p>";
  const sub = meta.subtitle ? '<p class="subtitle">' + meta.subtitle + "</p>" : "";
  const showSource = meta.source && !String(meta.author || "").includes(meta.source);
  const byline =
    '<p class="byline">' +
    (meta.author ? "By <b>" + meta.author + "</b>" : "") +
    (showSource ? " · " + meta.source : "") +
    "</p>";
  return (
    epi + kicker + "<h1>" + meta.title + "</h1>" + sub + byline +
    '<button class="begin" id="beginBtn"><span class="tri"></span> Play the reading</button>' +
    '<p class="scrollhint">↓ or scroll to read at your own pace</p>'
  );
}

// Build the full ordered scene list for a work (hero + content), assigning ids.
function buildScenes(work) {
  const meta = work.meta;
  const hero = {
    hue: meta.signature || "gold",
    sub: (meta.hero && meta.hero.sub) || "Prologue",
    body: heroBody(meta),
    narration: (meta.hero && meta.hero.prologueNarration) || "",
    hero: true
  };
  const content = (work.scenes || []).map(normContentScene);
  const all = [hero, ...content];
  all.forEach((s, i) => (s.id = "s" + i));
  return all;
}

/* --------------------------------------------------------- ElevenLabs TTS */
async function synthesize(env, narration, outPath) {
  const url =
    "https://api.elevenlabs.io/v1/text-to-speech/" +
    encodeURIComponent(env.VOICE_ID) +
    "/with-timestamps?output_format=mp3_44100_128";
  const voiceSettings = {
    stability: env.STABILITY ? Number(env.STABILITY) : 0.5,
    similarity_boost: env.SIMILARITY ? Number(env.SIMILARITY) : 0.8,
    style: env.STYLE ? Number(env.STYLE) : 0.1,
    use_speaker_boost: true
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      text: narration,
      model_id: env.MODEL_ID || "eleven_multilingual_v2",
      voice_settings: voiceSettings
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("ElevenLabs " + res.status + ": " + t.slice(0, 300));
  }
  const data = await res.json();
  fs.writeFileSync(outPath, Buffer.from(data.audio_base64, "base64"));
  return wordsFromAlignment(data.alignment || data.normalized_alignment);
}

function wordsFromAlignment(al) {
  if (!al || !al.characters) return null;
  const chars = al.characters;
  const starts = al.character_start_times_seconds || [];
  const words = [];
  let cur = "", curStart = null;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      if (cur) { words.push([Math.round(curStart * 100) / 100, cur]); cur = ""; curStart = null; }
    } else {
      if (curStart === null) curStart = starts[i] != null ? starts[i] : 0;
      cur += c;
    }
  }
  if (cur) words.push([Math.round((curStart || 0) * 100) / 100, cur]);
  return words;
}

/* -------------------------------------------------------- duration helper */
function estimateSeconds(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return words / 2.6 + 0.8;
}
function workDuration(scenes, captions) {
  let total = 0;
  for (const s of scenes) {
    const cap = captions[s.id];
    if (cap && cap.length) total += cap[cap.length - 1][0] + 2.4;
    else total += estimateSeconds(s.narration);
  }
  return total;
}

/* ---------------------------------------------------------------- render */
function renderScene(s) {
  const cls = ["scene"];
  if (s.wide) cls.push("wide");
  if (s.hero) cls.push("hero");
  return '  <section class="' + cls.join(" ") + '" id="' + s.id + '" data-hue="' + s.hue + '">\n' +
    '    <div class="inner">' + s.body + "\n    </div>\n  </section>";
}

function renderExperience(meta, scenes, captions, hasAudio) {
  const scenesHtml = scenes.map(renderScene).join("\n\n");
  const clientData = scenes.map((s) => {
    const cap = captions[s.id] || null;
    const dur = cap && cap.length
      ? Math.round((cap[cap.length - 1][0] + 1.8) * 10) / 10
      : Math.round(estimateSeconds(s.narration) * 10) / 10;
    return { id: s.id, sub: s.sub, text: s.narration, cap, dur };
  });
  return EXPERIENCE_TEMPLATE
    .replace(/__TITLE__/g, esc(meta.title))
    .replace(/__WORK_ID__/g, meta.id)
    .replace("__SIGNATURE__", meta.signature || "gold")
    .replace("__SCENES__", scenesHtml)
    .replace("__DATA__", JSON.stringify(clientData))
    .replace("__HAS_AUDIO__", hasAudio ? "true" : "false");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmtMin(sec) {
  const m = Math.max(1, Math.round(sec / 60));
  return "~" + m + " min";
}

// Themed shelves, in reading order. Works are grouped here, then sorted by
// release date within each shelf.
const SHELVES = [
  ["The Safety Case", "Why a lab devoted to safety builds frontier AI at all."],
  ["Reading the Machine", "Interpretability — prying open the black box."],
  ["When Models Misbehave", "Deception, misalignment, and the failures we must catch."],
  ["Teaching Values", "How you give a model a character — and write it down."],
  ["The Future & The Stakes", "What's at stake, and the world worth building."],
  ["The People", "The humans behind the machine."]
];

const byDate = (a, b) => String(a.sortDate).localeCompare(String(b.sortDate));

function cardHtml(c) {
  const src = c.url
    ? '<a class="source" href="' + c.url + '" target="_blank" rel="noopener">Source ↗</a>'
    : "";
  return (
    '<div class="card" data-id="' + c.id + '" data-scenes="' + c.chapters + '" style="--accent: var(--' + c.signature + ')">' +
    '<div class="card-top"><span class="chip">' + esc(c.kind) + "</span>" +
    '<span class="dur">' + c.duration + " · " + c.chapters + " ch</span></div>" +
    '<a class="ttl" href="' + c.id + '/index.html"><h2>' + esc(c.title) + "</h2></a>" +
    (c.subtitle ? '<p class="sub">' + esc(c.subtitle) + "</p>" : "") +
    '<p class="tag">' + esc(c.tagline) + "</p>" +
    '<div class="card-foot"><span class="by">' + esc(c.author) + "</span>" +
    '<span class="foot-right">' + src + '<span class="play"><span class="tri"></span> Listen</span></span></div>' +
    "</div>"
  );
}

function renderLibrary(cards) {
  const shelvesHtml = SHELVES.map(([name, desc]) => {
    const inShelf = cards.filter((c) => c.shelf === name).sort(byDate);
    if (!inShelf.length) return "";
    return (
      '<section class="shelf">\n<div class="shelf-head"><h3>' + esc(name) + "</h3><p>" + esc(desc) + "</p></div>\n" +
      '<div class="grid">\n' + inShelf.map(cardHtml).join("\n") + "\n</div>\n</section>"
    );
  }).filter(Boolean).join("\n\n");

  const byYear = {};
  cards.slice().sort(byDate).forEach((c) => {
    const y = (c.sortDate || "").slice(0, 4) || "—";
    (byYear[y] = byYear[y] || []).push(c);
  });
  const chronoHtml = Object.keys(byYear).sort().map((y) => {
    return '<section class="yeargroup"><h3 class="year">' + y + "</h3>\n" +
      '<div class="grid">\n' + byYear[y].map(cardHtml).join("\n") + "\n</div>\n</section>";
  }).join("\n\n");

  return LIBRARY_TEMPLATE.replace("__SHELVES__", shelvesHtml).replace("__CHRONO__", chronoHtml);
}

/* ------------------------------------------------------------------ main */
async function main() {
  const env = loadEnv();
  const works = await loadWorks();
  const canSynth = !HTML_ONLY && env.ELEVENLABS_API_KEY && env.VOICE_ID;
  if (!HTML_ONLY && !canSynth) {
    console.error("\n  No ELEVENLABS_API_KEY / VOICE_ID in .env — rendering HTML with browser-TTS fallback.\n");
  }

  const cards = [];
  let grandChars = 0;

  for (const work of works) {
    const meta = work.meta;
    const scenes = buildScenes(work);
    const outDir = path.join(__dirname, meta.id);
    const audioDir = path.join(outDir, "audio");
    fs.mkdirSync(audioDir, { recursive: true });

    const capPath = path.join(audioDir, "captions.json");
    let captions = {};
    if (fs.existsSync(capPath)) { try { captions = JSON.parse(fs.readFileSync(capPath, "utf8")); } catch (e) {} }

    const doSynth = canSynth && (ONLY.length === 0 || ONLY.includes(meta.id));
    if (doSynth) {
      let made = 0, chars = 0;
      for (const s of scenes) {
        const mp3 = path.join(audioDir, s.id + ".mp3");
        if (!FORCE && fs.existsSync(mp3) && captions[s.id]) continue;
        if (!s.narration) continue;
        process.stdout.write("  ⋯ " + meta.id + "/" + s.id + " …");
        try {
          captions[s.id] = await synthesize(env, s.narration, mp3);
          fs.writeFileSync(capPath, JSON.stringify(captions));
          chars += s.narration.length; made++;
          process.stdout.write("\r  ✓ " + meta.id + "/" + s.id + "            \n");
        } catch (e) {
          process.stdout.write("\r  ✗ " + meta.id + "/" + s.id + " — " + e.message + "\n");
          throw e;
        }
      }
      grandChars += chars;
      if (made) console.log("    " + meta.title + ": " + made + " clip(s), " + chars + " chars");
    }

    const hasAudio = scenes.every((s) => !s.narration || (fs.existsSync(path.join(audioDir, s.id + ".mp3")) && captions[s.id]));
    fs.writeFileSync(path.join(outDir, "index.html"), renderExperience(meta, scenes, captions, hasAudio));

    cards.push({
      id: meta.id, title: meta.title, subtitle: meta.subtitle, author: meta.author,
      kind: meta.kind, tagline: meta.tagline, signature: meta.signature || "gold",
      url: meta.url || "", sortDate: meta.sortDate || "", shelf: meta.shelf || "Other",
      chapters: scenes.length, duration: fmtMin(workDuration(scenes, captions))
    });
    console.log("  → " + meta.id + "/index.html" + (hasAudio ? "  (audio)" : "  (TTS fallback)"));
  }

  fs.writeFileSync(path.join(__dirname, "index.html"), renderLibrary(cards));
  console.log("\n  → index.html  (library, " + cards.length + " works)");
  if (grandChars) console.log("  Total characters synthesized this run: " + grandChars + "\n");
}

/* ============================ EXPERIENCE TEMPLATE ========================= */
/* client <script> deliberately avoids backticks and ${} */
const EXPERIENCE_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__ — Story Time</title>
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<meta name="theme-color" content="#0B0E14">
<style>
  @property --grad-a { syntax: '<color>'; inherits: true; initial-value: #0B0E14; }
  @property --grad-b { syntax: '<color>'; inherits: true; initial-value: #12172400; }
  @property --grad-c { syntax: '<color>'; inherits: true; initial-value: #0B0E14; }
  :root {
    --ink:#0B0E14; --text:#F4EFE6; --muted:#98A2B4; --faint:#5A6274;
    --gold:#F2C879; --green:#7FC8A0; --sky:#8FB8E8; --rose:#E8927C; --lav:#C4AEE8;
    --amber:#E4A85E; --steel:#86A9CC; --violet:#B49CF0; --teal:#66C6BE; --crimson:#DE8A86; --sage:#A7C08C;
    --accent:var(--__SIGNATURE__);
    --serif:"Hoefler Text","New York","Iowan Old Style",Palatino,Georgia,serif;
    --sans:-apple-system,"SF Pro Text","Helvetica Neue",Inter,system-ui,sans-serif;
    --mono:"SF Mono",ui-monospace,"Menlo","Roboto Mono",monospace;
    --measure:34rem;
  }
  * { box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  @media (prefers-reduced-motion: reduce){ html{scroll-behavior:auto;} }
  body { margin:0; background:var(--ink); color:var(--text); font-family:var(--sans);
    font-size:18px; line-height:1.7; -webkit-font-smoothing:antialiased; overflow-x:hidden; }

  #dawn { position:fixed; inset:0; z-index:-2;
    background:
      radial-gradient(120% 90% at 50% 118%, var(--grad-b) 0%, transparent 60%),
      linear-gradient(180deg, var(--grad-a) 0%, var(--grad-c) 100%);
    transition:--grad-a 1.6s ease,--grad-b 1.6s ease,--grad-c 1.6s ease; }
  #meadow { position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:.9; }
  #grain { position:fixed; inset:0; z-index:0; pointer-events:none; opacity:.035; mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }

  main { position:relative; z-index:1; }
  .scene { min-height:100vh; display:flex; flex-direction:column; justify-content:center;
    padding:14vh clamp(1.5rem,6vw,7rem); max-width:68rem; margin:0 auto; }
  .scene .inner { opacity:0; transform:translateY(26px);
    transition:opacity 1.1s ease, transform 1.1s cubic-bezier(.2,.7,.2,1); max-width:var(--measure); }
  .scene.wide .inner { max-width:52rem; }
  .scene.revealed .inner { opacity:1; transform:none; }
  @media (prefers-reduced-motion: reduce){ .scene .inner{opacity:1;transform:none;transition:none;} }

  .eyebrow { font-family:var(--mono); font-size:.74rem; letter-spacing:.28em; text-transform:uppercase;
    color:var(--accent); display:flex; align-items:center; gap:.8em; margin:0 0 1.6rem; flex-wrap:wrap; }
  .eyebrow .num { color:var(--faint); }
  .eyebrow .dot { width:7px; height:7px; border-radius:50%; background:var(--accent); box-shadow:0 0 14px var(--accent); }

  h1 { font-family:var(--serif); font-weight:500; letter-spacing:-.01em;
    font-size:clamp(2.4rem,7.5vw,5.2rem); line-height:1; margin:0; text-wrap:balance;
    overflow-wrap:break-word; hyphens:auto; }
  h2 { font-family:var(--serif); font-weight:500; letter-spacing:-.005em;
    font-size:clamp(1.7rem,5vw,3.3rem); line-height:1.05; margin:0 0 1.3rem; text-wrap:balance;
    overflow-wrap:break-word; hyphens:auto; }
  .lede { font-size:clamp(1.05rem,2.2vw,1.32rem); color:var(--text); }
  p { color:var(--muted); }
  p .hl { color:var(--text); }
  em { color:var(--text); font-style:italic; }
  code { font-family:var(--mono); font-size:.9em; color:var(--accent); background:rgba(255,255,255,.05); padding:.05em .35em; border-radius:4px; }

  ul.reasons { list-style:none; padding:0; margin:0 0 1.4rem; display:flex; flex-direction:column; gap:.85rem; }
  ul.reasons.tight { gap:.6rem; }
  ul.reasons.two { display:grid; grid-template-columns:1fr 1fr; gap:.7rem 1.6rem; }
  ul.reasons li { position:relative; padding-left:1.3rem; color:var(--muted); font-size:1.02rem; line-height:1.5; }
  ul.reasons li:before { content:""; position:absolute; left:0; top:.62em; width:6px; height:6px;
    border-radius:50%; background:var(--accent); box-shadow:0 0 10px var(--accent); }
  ul.reasons li b { color:var(--text); font-weight:600; }
  @media (max-width:620px){ ul.reasons.two{grid-template-columns:1fr;} }

  .chips { display:flex; flex-wrap:wrap; gap:.55rem; margin:0 0 1.4rem; }
  .chips span { font-family:var(--mono); font-size:.72rem; letter-spacing:.04em; color:var(--accent);
    border:1px solid color-mix(in oklab, var(--accent) 45%, transparent); border-radius:999px; padding:.34rem .8rem; }
  .capnote { font-size:1.06rem; color:var(--text); margin-top:1.2rem; }

  .figure { margin:2.2rem 0 0; background:#F6F3EC; border-radius:16px; padding:1.1rem;
    border:1px solid rgba(0,0,0,.06); box-shadow:0 18px 50px -26px rgba(0,0,0,.85); }
  .figure .figlink { display:block; }
  .figure img { display:block; width:100%; height:auto; border-radius:9px; }
  .figure figcaption { font-family:var(--mono); font-size:.66rem; letter-spacing:.02em; text-transform:none;
    color:#6b665e; margin-top:.75rem; line-height:1.55; }
  .figure figcaption b { color:#2c2a26; font-weight:600; }
  @media (max-width:600px){ .figure{ padding:.7rem; } }

  #s0 .inner { max-width:47rem; }
  .kicker { font-family:var(--mono); font-size:.7rem; letter-spacing:.24em; text-transform:uppercase; color:var(--faint); margin:0 0 1.4rem; }
  .subtitle { font-family:var(--serif); font-style:italic; font-size:clamp(1.1rem,2.6vw,1.6rem); color:var(--accent); margin:1rem 0 0; opacity:.9; }
  .epigraph { font-family:var(--serif); font-style:italic; font-size:clamp(1.05rem,2.4vw,1.45rem);
    line-height:1.5; color:var(--accent); margin:0 0 2.4rem; opacity:.9; white-space:pre-line; }
  .epigraph cite { display:block; font-style:normal; font-family:var(--mono);
    font-size:.72rem; letter-spacing:.22em; text-transform:uppercase; color:var(--faint); margin-top:1.1rem; }
  .byline { font-family:var(--mono); font-size:.76rem; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); margin:1.6rem 0 0; }
  .byline b { color:var(--text); font-weight:600; }
  .begin { margin-top:2.6rem; display:inline-flex; align-items:center; gap:.8rem;
    font-family:var(--sans); font-size:1rem; font-weight:600; color:var(--ink); background:var(--accent);
    border:0; border-radius:999px; padding:.95rem 1.6rem; cursor:pointer;
    transition:transform .25s ease, box-shadow .5s ease, filter .25s; }
  .begin:hover { transform:translateY(-2px); box-shadow:0 12px 40px -8px color-mix(in oklab, var(--accent) 60%, transparent); filter:brightness(1.05); }
  .begin:focus-visible { outline:3px solid var(--accent); outline-offset:4px; }
  .begin .tri { width:0; height:0; border-left:11px solid var(--ink); border-top:7px solid transparent; border-bottom:7px solid transparent; }
  .scrollhint { margin-top:2.2rem; font-family:var(--mono); font-size:.7rem; letter-spacing:.22em; text-transform:uppercase; color:var(--faint); }

  .stats { display:flex; flex-wrap:wrap; gap:clamp(1.4rem,4vw,3rem); margin-top:2.2rem; }
  .stat { min-width:7.5rem; }
  .stat .fig { font-family:var(--serif); font-weight:500; font-size:clamp(2rem,4.4vw,3rem); line-height:1;
    color:var(--accent); font-variant-numeric:tabular-nums; display:flex; align-items:baseline; gap:.1em; }
  .stat .fig .u { font-size:.4em; color:var(--text); font-family:var(--sans); font-weight:600; letter-spacing:.02em; }
  .stat .fig .u.dollar { color:var(--accent); font-family:var(--serif); font-weight:500; font-size:.55em; }
  .stat .cap { font-family:var(--mono); font-size:.64rem; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-top:.7rem; line-height:1.5; }

  .quote { font-family:var(--serif); font-style:italic; font-size:clamp(1.5rem,3.6vw,2.4rem);
    line-height:1.3; color:var(--text); text-wrap:balance; margin:0; }
  .quote .grace { color:var(--accent); }
  .fnote { font-family:var(--mono); font-size:.66rem; letter-spacing:.1em; color:var(--faint); margin-top:2rem; text-transform:uppercase; }

  /* back to library */
  #controls { display:flex; align-items:stretch; gap:.55rem; width:min(94vw,48rem); max-width:100%; }
  #back { display:inline-flex; align-items:center; justify-content:center; gap:.5rem; flex:none; pointer-events:auto;
    font-family:var(--mono); font-size:.66rem; letter-spacing:.14em; text-transform:uppercase; color:var(--muted);
    text-decoration:none; padding:0 1rem; border-radius:999px; border:1px solid rgba(244,239,230,.12);
    background:rgba(14,18,26,.72); backdrop-filter:blur(16px) saturate(1.3); -webkit-backdrop-filter:blur(16px) saturate(1.3);
    box-shadow:0 18px 50px -18px rgba(0,0,0,.8); transition:color .2s, border-color .2s; }
  #back:hover { color:var(--text); border-color:rgba(244,239,230,.3); }
  #back:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  #back .bico { font-size:1.1em; }

  /* caption */
  #capscrim { position:fixed; left:0; right:0; bottom:0; height:16rem; z-index:37; pointer-events:none;
    opacity:0; transition:opacity .5s ease;
    background:linear-gradient(to top, var(--grad-c) 0%, var(--grad-c) 30%,
      color-mix(in oklab, var(--grad-c) 78%, transparent) 54%,
      color-mix(in oklab, var(--grad-c) 28%, transparent) 74%, transparent 100%); }
  #capscrim.show { opacity:1; }
  #caption { display:block; height:1.7em; line-height:1.7; overflow:hidden; white-space:nowrap;
    width:min(92vw,44rem); text-align:center; font-family:var(--serif); font-size:clamp(1rem,2.4vw,1.4rem);
    color:var(--faint); pointer-events:none; opacity:0; transition:opacity .25s ease;
    text-shadow:0 2px 30px rgba(11,14,20,.95); }
  #caption.show { opacity:1; }
  #caption.off { height:0; }
  #caption .w { transition:color .12s ease; }
  #caption .w.spoken { color:var(--muted); }
  #caption .w.active { color:var(--accent); }

  #dock { position:fixed; left:0; right:0; bottom:max(1rem, env(safe-area-inset-bottom)); z-index:40;
    display:flex; flex-direction:column; align-items:center; gap:.75rem; pointer-events:none; padding:0 .8rem; }
  #player { display:flex; align-items:center; gap:.5rem; background:rgba(14,18,26,.72);
    backdrop-filter:blur(16px) saturate(1.3); -webkit-backdrop-filter:blur(16px) saturate(1.3);
    border:1px solid rgba(244,239,230,.12); border-radius:999px; padding:.5rem .55rem;
    box-shadow:0 18px 50px -18px rgba(0,0,0,.8); flex:1 1 auto; min-width:0;
    opacity:0; pointer-events:none; transition:opacity .5s ease; }
  #player.show { opacity:1; pointer-events:auto; }
  .pbtn { flex:none; width:42px; height:42px; border-radius:50%; border:1px solid rgba(244,239,230,.16);
    background:transparent; color:var(--text); cursor:pointer; display:grid; place-items:center;
    transition:background .2s,border-color .2s,transform .15s; padding:0; }
  .pbtn:hover { background:rgba(244,239,230,.08); }
  .pbtn:active { transform:scale(.94); }
  .pbtn:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  .pbtn.primary { background:var(--accent); color:var(--ink); border-color:var(--accent); width:46px; height:46px; }
  .pbtn.primary:hover { filter:brightness(1.06); }
  .pbtn svg { width:17px; height:17px; display:block; }
  .pbtn.primary svg { width:19px; height:19px; }
  .pbtn.speed { width:auto; min-width:46px; padding:0 .7rem; font-family:var(--mono); font-size:.78rem; font-weight:600;
    letter-spacing:.02em; color:var(--accent); border-radius:999px; font-variant-numeric:tabular-nums; }

  .pmeta { display:flex; flex-direction:column; min-width:0; flex:1 1 auto; padding:0 .5rem; }
  .pmeta .now { font-family:var(--mono); font-size:.62rem; letter-spacing:.14em; text-transform:uppercase;
    color:var(--accent); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .pmeta .sub { font-size:.76rem; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .pmeta .rem { color:var(--accent); }
  .pmeta .rem:not(:empty):before { content:"·"; color:var(--faint); margin:0 .45em; }
  .seek { width:100%; height:4px; border-radius:2px; background:rgba(244,239,230,.14); overflow:hidden; margin-top:.4rem; }
  .seek .fill { height:100%; width:0%; background:var(--accent); transition:width .2s linear; }

  .dots { display:none; gap:5px; align-items:center; padding:0 .3rem; flex-wrap:wrap; max-width:16rem; }
  .dots button { width:7px; height:7px; border-radius:50%; border:0; padding:0; cursor:pointer;
    background:rgba(244,239,230,.22); transition:background .3s, transform .3s; }
  .dots button:hover { background:rgba(244,239,230,.5); }
  .dots button.active { background:var(--accent); transform:scale(1.4); box-shadow:0 0 10px var(--accent); }
  .dots button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }

  .voicewrap { position:relative; }
  #voiceMenu { position:absolute; bottom:56px; right:0; background:rgba(16,20,28,.97);
    border:1px solid rgba(244,239,230,.14); border-radius:14px; padding:.7rem; width:16.5rem;
    box-shadow:0 18px 50px -18px rgba(0,0,0,.8); display:none; flex-direction:column; gap:.65rem; }
  #voiceMenu.open { display:flex; }
  #voiceMenu .row { display:flex; align-items:center; justify-content:space-between; gap:.6rem; }
  #voiceMenu label { font-family:var(--mono); font-size:.6rem; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
  #voiceMenu .val { font-family:var(--mono); font-size:.7rem; color:var(--text); }
  #voiceMenu input[type=range] { flex:1; accent-color:var(--accent); }
  .speeds { display:flex; gap:.3rem; }
  .speeds button { flex:1; font-family:var(--mono); font-size:.7rem; color:var(--muted); background:transparent;
    border:1px solid rgba(244,239,230,.16); border-radius:7px; padding:.35rem 0; cursor:pointer; transition:.15s; }
  .speeds button:hover { color:var(--text); }
  .speeds button.on { color:var(--ink); background:var(--accent); border-color:var(--accent); }
  .toggle { display:flex; align-items:center; gap:.5rem; cursor:pointer; }
  .toggle input { accent-color:var(--accent); width:16px; height:16px; }
  .modeflag { font-family:var(--mono); font-size:.58rem; letter-spacing:.1em; text-transform:uppercase; color:var(--faint); }

  #topbar { position:fixed; top:0; left:0; height:2px; width:0%; z-index:50;
    background:linear-gradient(90deg,var(--accent),var(--accent)); transition:width .3s ease, background .8s;
    box-shadow:0 0 12px var(--accent); }

  @media (max-width:600px){
    body{font-size:16px;}
    .pmeta,.dots,.seek{display:none;}
    #controls{ width:auto; }
    #player{ gap:.4rem; padding:.45rem .5rem; flex:0 0 auto; }
    #caption{ font-size:1.05rem; }
    .scene{ padding:12vh clamp(1.3rem,6vw,7rem); }
    #s0 .inner{ max-width:100%; }
    .stat{ min-width:6.5rem; }
    #back{ align-self:center; width:42px; height:42px; padding:0; }
    #back .blbl{ display:none; }
    #back .bico{ font-size:1.2em; }
  }
</style>
</head>
<body>
<div id="dawn"></div>
<canvas id="meadow"></canvas>
<div id="grain"></div>
<div id="topbar"></div>

<main>
__SCENES__
</main>

<div id="capscrim" aria-hidden="true"></div>
<audio id="narrator" preload="none"></audio>

<div id="dock">
<div id="controls">
<a id="back" href="../index.html" aria-label="Back to Story Time"><span class="bico">&larr;</span><span class="blbl">Story Time</span></a>
<div id="player" aria-label="Narration controls">
  <button class="pbtn" id="prevBtn" title="Previous" aria-label="Previous scene">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 6v12l-8.5-6L18 6zM7 6h2v12H7z"/></svg></button>
  <button class="pbtn primary" id="playBtn" title="Play" aria-label="Play narration">
    <svg id="playIcon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
    <svg id="pauseIcon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg></button>
  <button class="pbtn" id="nextBtn" title="Next" aria-label="Next scene">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6l8.5 6L6 18V6zm9 0h2v12h-2z"/></svg></button>
  <button class="pbtn speed" id="speedBtn" title="Playback speed" aria-label="Playback speed">1&times;</button>
  <div class="pmeta">
    <span class="now" id="nowTitle">Prologue</span>
    <span class="sub"><span id="nowSub">Press play to begin</span><span class="rem" id="remain"></span></span>
    <div class="seek"><div class="fill" id="seekFill"></div></div>
  </div>
  <div class="dots" id="dots" aria-hidden="true"></div>
  <div class="voicewrap">
    <button class="pbtn" id="voiceToggle" title="Settings" aria-label="Settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg></button>
    <div id="voiceMenu">
      <div class="row"><label>Narrator</label><span class="val modeflag" id="modeFlag">—</span></div>
      <div><label style="display:block;margin-bottom:.4rem">Speed</label>
        <div class="speeds" id="speeds"></div></div>
      <div class="row"><label>Volume</label><input type="range" id="vol" min="0" max="1" step="0.05" value="1"></div>
      <label class="toggle"><input type="checkbox" id="capToggle" checked> <span class="val">Show captions</span></label>
      <div class="row" id="ttsRow" style="display:none"><label>Voice</label><select id="voiceSelect" style="max-width:9rem"></select></div>
    </div>
  </div>
</div>
</div>
<div id="caption" aria-live="off"></div>
</div>

<script>
(function(){
  "use strict";
  var SC = __DATA__;
  var HAS_AUDIO = __HAS_AUDIO__;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));

  var ACCENTS = {gold:"#F2C879",green:"#7FC8A0",sky:"#8FB8E8",rose:"#E8927C",lav:"#C4AEE8",
    amber:"#E4A85E",steel:"#86A9CC",violet:"#B49CF0",teal:"#66C6BE",crimson:"#DE8A86",sage:"#A7C08C"};
  function hexRgb(h){ h=h.replace("#",""); if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return {r:parseInt(h.substr(0,2),16),g:parseInt(h.substr(2,2),16),b:parseInt(h.substr(4,2),16)}; }
  function mix(a,b,t){ return "rgb("+Math.round(a.r+(b.r-a.r)*t)+","+Math.round(a.g+(b.g-a.g)*t)+","+Math.round(a.b+(b.b-a.b)*t)+")"; }
  var DARK1={r:9,g:10,b:14}, DARK2={r:11,g:13,b:18};
  function hueFor(name){ var acc=ACCENTS[name]||ACCENTS.gold, rgb=hexRgb(acc);
    return {accent:acc, a:mix(rgb,DARK1,0.90), b:"rgba("+rgb.r+","+rgb.g+","+rgb.b+",0.15)", c:mix(rgb,DARK2,0.83)}; }
  var root=document.documentElement;
  function applyHue(name){ var h=hueFor(name); root.style.setProperty("--accent",h.accent);
    root.style.setProperty("--grad-a",h.a); root.style.setProperty("--grad-b",h.b); root.style.setProperty("--grad-c",h.c); }
  applyHue(scenes[0]?scenes[0].getAttribute("data-hue"):"gold");

  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) e.target.classList.add("revealed"); }); },{threshold:0.18});
  scenes.forEach(function(s){ io.observe(s); });

  function animateCount(el){ var from=parseFloat(el.getAttribute("data-count-from")), to=parseFloat(el.getAttribute("data-count-to"));
    if(reduced){ el.textContent=to; return; } var dur=1400,start=null;
    function step(ts){ if(start===null)start=ts; var p=Math.min((ts-start)/dur,1); var e=1-Math.pow(1-p,3);
      el.textContent=Math.round(from+(to-from)*e); if(p<1) requestAnimationFrame(step); } requestAnimationFrame(step); }
  var countIO=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ animateCount(e.target); countIO.unobserve(e.target); } }); },{threshold:0.6});
  document.querySelectorAll("[data-count-to]").forEach(function(el){ countIO.observe(el); });

  var canvas=document.getElementById("meadow"), ctx=canvas.getContext("2d"), W,H,pts=[],raf=null;
  function size(){ var dpr=window.devicePixelRatio||1; W=canvas.width=innerWidth*dpr; H=canvas.height=innerHeight*dpr;
    canvas.style.width=innerWidth+"px"; canvas.style.height=innerHeight+"px"; }
  function seed(){ var dpr=window.devicePixelRatio||1, n=Math.min(90,Math.floor(innerWidth/14)); pts=[];
    for(var i=0;i<n;i++) pts.push({x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.6+0.4)*dpr,
      vx:(Math.random()-0.5)*0.12, vy:-(Math.random()*0.18+0.03), a:Math.random()*0.5+0.15, tw:Math.random()*6.28}); }
  function accentRGB(){ var c=getComputedStyle(root).getPropertyValue("--accent").trim()||"#F2C879";
    if(c[0]==="#"){ var m=hexRgb(c); return m.r+","+m.g+","+m.b; } return c.replace(/rgba?\\(|\\)/g,""); }
  function draw(){ ctx.clearRect(0,0,W,H); var rgb=accentRGB();
    for(var i=0;i<pts.length;i++){ var p=pts[i]; p.x+=p.vx; p.y+=p.vy; p.tw+=0.02;
      if(p.y<-10){p.y=H+10;p.x=Math.random()*W;} if(p.x<-10)p.x=W+10; if(p.x>W+10)p.x=-10;
      var f=p.a*(0.6+0.4*Math.sin(p.tw)); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.2832);
      ctx.fillStyle="rgba("+rgb+","+f.toFixed(3)+")"; ctx.fill(); }
    raf=requestAnimationFrame(draw); }
  function startMeadow(){ size(); seed(); if(!reduced){ if(raf)cancelAnimationFrame(raf); draw(); }
    else { ctx.clearRect(0,0,W,H); var rgb=accentRGB(); pts.forEach(function(p){ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.2832);
      ctx.fillStyle="rgba("+rgb+","+p.a.toFixed(3)+")"; ctx.fill(); }); } }
  addEventListener("resize",function(){ size(); seed(); }); startMeadow();

  /* ---- narration engine ---- */
  var audio=document.getElementById("narrator");
  var synth=window.speechSynthesis, ttsOK=!!synth && typeof SpeechSynthesisUtterance!=="undefined";
  var playing=false, paused=false, mode="idle", chosenVoice=null, voices=[];
  var SPEEDS=[0.85,1,1.15,1.3,1.5], speed=parseFloat(localStorage.getItem("st-speed")||"1.3");
  if(SPEEDS.indexOf(speed)===-1) speed=1.3;

  var playBtn=document.getElementById("playBtn"), playIcon=document.getElementById("playIcon"), pauseIcon=document.getElementById("pauseIcon");
  var nowTitle=document.getElementById("nowTitle"), nowSub=document.getElementById("nowSub"), seekFill=document.getElementById("seekFill");
  var dotsWrap=document.getElementById("dots"), player=document.getElementById("player");
  var capEl=document.getElementById("caption"), capScrim=document.getElementById("capscrim"), modeFlag=document.getElementById("modeFlag");
  function showCap(on){ capEl.classList.toggle("show",on); capScrim.classList.toggle("show",on); }
  var speedBtn=document.getElementById("speedBtn"), remEl=document.getElementById("remain"), showCaptions=true, activeIndex=0;

  // per-work resume + time-left
  var WORK_ID="__WORK_ID__", PKEY="st-progress-"+WORK_ID, pendingSeek=0, lastSave=0, resumeSeek=0, savedProg=null, autoArm=false;
  try{ savedProg=JSON.parse(localStorage.getItem(PKEY)||"null"); }catch(e){}
  function saveProgress(scene,t,done){ try{ localStorage.setItem(PKEY, JSON.stringify({scene:scene,t:Math.round(t||0),done:!!done,total:scenes.length,at:Date.now()})); }catch(e){} }
  function clearProgress(){ try{ localStorage.removeItem(PKEY); }catch(e){} }
  function fmtLeft(sec){ if(!(sec>1)) return ""; if(sec<60) return "under a minute left"; return "about "+Math.round(sec/60)+" min left"; }
  function updateRemaining(){ if(!playing){ remEl.textContent=""; return; }
    var elapsed=(mode==="audio"&&isFinite(audio.currentTime))?audio.currentTime:0;
    var rem=(SC[activeIndex].dur||0)-elapsed; for(var i=activeIndex+1;i<SC.length;i++) rem+=(SC[i].dur||0);
    remEl.textContent=fmtLeft(rem/(speed||1)); }

  SC.forEach(function(s,i){ var b=document.createElement("button"); b.setAttribute("aria-label","Go to "+s.sub);
    b.addEventListener("click",function(){ jumpTo(i,playing); }); dotsWrap.appendChild(b); });
  var dotEls=Array.prototype.slice.call(dotsWrap.children);

  function updateDots(){ dotEls.forEach(function(d,i){ d.classList.toggle("active",i===activeIndex); });
    document.getElementById("topbar").style.width=(scenes.length>1?(activeIndex/(scenes.length-1))*100:0)+"%"; }
  function setActive(idx,doScroll){ activeIndex=Math.max(0,Math.min(scenes.length-1,idx)); var s=scenes[activeIndex];
    applyHue(s.getAttribute("data-hue")); nowTitle.textContent=SC[activeIndex].sub; nowSub.textContent=(activeIndex+1)+" / "+scenes.length;
    updateDots(); updateRemaining(); if(doScroll) s.scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"}); }
  function setPlayIcon(on){ playIcon.style.display=on?"none":"block"; pauseIcon.style.display=on?"block":"none";
    playBtn.setAttribute("aria-label",on?"Pause narration":"Play narration"); }

  /* captions: one sentence window */
  // caption shows ONE active line at a time (a fixed-height ticker), so the dock never moves
  var capTokens=[], capLines=[], capLineOf=[], capCurLine=-1, capSpans=[], LINE_MAX=38;
  function buildCaption(i){ capEl.innerHTML=""; capSpans=[]; capCurLine=-1;
    var data=SC[i]; if(!showCaptions){ showCap(false); return; }
    capTokens = data.cap ? data.cap.map(function(p){ return {t:p[0],w:p[1]}; })
                         : data.text.split(/\\s+/).map(function(w){ return {t:null,w:w}; });
    capLines=[]; capLineOf=[]; var cur=[], len=0;
    for(var k=0;k<capTokens.length;k++){ var wl=capTokens[k].w.length+1;
      if(cur.length && len+wl>LINE_MAX){ capLines.push(cur); cur=[]; len=0; }
      cur.push(k); capLineOf[k]=capLines.length; len+=wl;
      if(/[.!?]["')]?$/.test(capTokens[k].w)){ capLines.push(cur); cur=[]; len=0; } }
    if(cur.length){ for(var m=0;m<cur.length;m++) capLineOf[cur[m]]=capLines.length; capLines.push(cur); }
    showCap(true); renderLine(0); }
  function renderLine(li){ capCurLine=li; capEl.innerHTML=""; capSpans=[];
    (capLines[li]||[]).forEach(function(gi){ var sp=document.createElement("span"); sp.className="w";
      sp.setAttribute("data-gi",gi); sp.textContent=capTokens[gi].w+" "; capEl.appendChild(sp); capSpans.push(sp); }); }
  function markToken(gi){ var li=capLineOf[gi]; if(li===undefined)return; if(li!==capCurLine) renderLine(li);
    for(var j=0;j<capSpans.length;j++){ var g=+capSpans[j].getAttribute("data-gi"); capSpans[j].className="w"+(g<gi?" spoken":g===gi?" active":""); } }
  function highlightByTime(t){ if(!capTokens.length)return; var idx=0;
    for(var i=0;i<capTokens.length;i++){ if(capTokens[i].t!==null&&capTokens[i].t<=t) idx=i; else if(capTokens[i].t!==null) break; } markToken(idx); }
  function highlightByWordIndex(k){ if(k<capTokens.length) markToken(k); }

  function srcFor(i){ return "audio/"+SC[i].id+".mp3"; }
  function applySeek(){ if(pendingSeek>0){ try{ audio.currentTime=(isFinite(audio.duration)&&audio.duration>0)?Math.min(pendingSeek,audio.duration-0.3):pendingSeek; }catch(e){} pendingSeek=0; } }
  function playScene(i,seek){ setActive(i,true); playing=true; paused=false; setPlayIcon(true); buildCaption(i);
    var useAudio=HAS_AUDIO && SC[i].cap;
    if(useAudio){ mode="audio"; modeFlag.textContent="ElevenLabs"; audio.src=srcFor(i);
      pendingSeek=(seek&&seek>0)?seek:0;
      audio.playbackRate=speed; audio.volume=parseFloat(document.getElementById("vol").value);
      var p=audio.play();
      if(p&&p.then){ p.then(function(){ applySeek(); }).catch(function(){ if(autoArm){ autoArm=false; paused=true; setPlayIcon(false); } else ttsSpeak(i); }); }
      else applySeek(); }
    else { ttsSpeak(i); }
    saveProgress(i, seek||0, false); updateRemaining(); }
  function advance(){ if(activeIndex<scenes.length-1) playScene(activeIndex+1); else { saveProgress(activeIndex,0,true); stopNarration(); } }
  audio.addEventListener("ended",function(){ if(playing&&mode==="audio") advance(); });
  audio.addEventListener("error",function(){ if(playing&&mode==="audio") ttsSpeak(activeIndex); });
  audio.addEventListener("loadedmetadata",function(){ applySeek(); });
  audio.addEventListener("timeupdate",function(){ if(mode!=="audio")return;
    if(audio.duration) seekFill.style.width=(audio.currentTime/audio.duration*100)+"%"; highlightByTime(audio.currentTime); updateRemaining();
    var now=Date.now(); if(now-lastSave>4000){ lastSave=now; saveProgress(activeIndex, audio.currentTime, false); } });

  function ttsSpeak(i){ mode="tts"; modeFlag.textContent=ttsOK?"Browser voice":"unavailable"; if(!ttsOK)return; synth.cancel();
    var u=new SpeechSynthesisUtterance(SC[i].text); u.rate=0.98*speed; u.pitch=1.0;
    u.volume=parseFloat(document.getElementById("vol").value); if(chosenVoice)u.voice=chosenVoice;
    var wIdx=0; u.onboundary=function(ev){ if(ev.name==="word"||ev.charIndex!==undefined) highlightByWordIndex(wIdx++); };
    u.onend=function(){ if(playing&&mode==="tts") advance(); };
    setTimeout(function(){ if(playing) synth.speak(u); }, reduced?40:420); }

  function startNarration(i,seek){ playScene(typeof i==="number"?i:activeIndex, seek); player.classList.add("show"); }
  function stopNarration(){ playing=false; paused=false; setPlayIcon(false); try{ audio.pause(); }catch(e){}
    if(ttsOK) synth.cancel(); showCap(false); seekFill.style.width="0%"; remEl.textContent=""; }

  playBtn.addEventListener("click",function(){
    if(!playing){ startNarration(activeIndex); return; }
    if(!paused){ paused=true; setPlayIcon(false); if(mode==="audio"){ audio.pause(); saveProgress(activeIndex,audio.currentTime,false); } else if(ttsOK)synth.pause(); }
    else { paused=false; setPlayIcon(true); if(mode==="audio")audio.play(); else if(ttsOK)synth.resume(); } });
  document.getElementById("nextBtn").addEventListener("click",function(){ jumpTo(activeIndex+1,playing); });
  document.getElementById("prevBtn").addEventListener("click",function(){ jumpTo(activeIndex-1,playing); });
  function jumpTo(i,keep){ i=Math.max(0,Math.min(scenes.length-1,i));
    if(mode==="audio"){ try{audio.pause();}catch(e){} } if(ttsOK) synth.cancel();
    if(keep){ playScene(i); } else { stopNarration(); setActive(i,true); } }

  var beginBtn=document.getElementById("beginBtn");
  if(beginBtn){
    if(savedProg && !savedProg.done && savedProg.scene>0){ resumeSeek=savedProg.t||0;
      beginBtn.innerHTML='<span class="tri"></span> Resume &middot; '+Math.min(99,Math.round(savedProg.scene/scenes.length*100))+'%'; }
    else if(savedProg && savedProg.done){ beginBtn.innerHTML='<span class="tri"></span> Play again'; }
    beginBtn.addEventListener("click",function(){ player.classList.add("show"); if(ttsOK){ try{ synth.resume(); }catch(e){} }
      if(savedProg && savedProg.done){ clearProgress(); savedProg=null; startNarration(0,0); }
      else if(savedProg && !savedProg.done && savedProg.scene>0){ startNarration(savedProg.scene, resumeSeek); }
      else { startNarration(0,0); } });
  }
  addEventListener("scroll",function(){ if(scrollY>innerHeight*0.5) player.classList.add("show"); },{passive:true});

  var centerIO=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){
    var idx=scenes.indexOf(e.target); if(idx!==activeIndex&&!playing) setActive(idx,false); } }); },{rootMargin:"-45% 0px -45% 0px",threshold:0});
  scenes.forEach(function(s){ centerIO.observe(s); });

  /* speed */
  var speedsWrap=document.getElementById("speeds");
  function applySpeed(v){ speed=v; localStorage.setItem("st-speed",String(v));
    speedBtn.innerHTML=(v%1===0?v:v.toFixed(2).replace(/0$/,""))+"&times;";
    if(mode==="audio") audio.playbackRate=v;
    Array.prototype.forEach.call(speedsWrap.children,function(b){ b.classList.toggle("on",parseFloat(b.dataset.v)===v); }); updateRemaining(); }
  SPEEDS.forEach(function(v){ var b=document.createElement("button"); b.dataset.v=v;
    b.textContent=(v%1===0?v:v.toFixed(2).replace(/0$/,""))+"\\u00d7";
    b.addEventListener("click",function(){ applySpeed(v); }); speedsWrap.appendChild(b); });
  speedBtn.addEventListener("click",function(){ var i=SPEEDS.indexOf(speed); applySpeed(SPEEDS[(i+1)%SPEEDS.length]); });
  applySpeed(speed);

  /* settings menu */
  var voiceMenu=document.getElementById("voiceMenu");
  document.getElementById("voiceToggle").addEventListener("click",function(e){ e.stopPropagation(); voiceMenu.classList.toggle("open"); });
  document.addEventListener("click",function(e){ if(!voiceMenu.contains(e.target)&&e.target.id!=="voiceToggle") voiceMenu.classList.remove("open"); });
  document.getElementById("vol").addEventListener("input",function(){ audio.volume=parseFloat(this.value); });
  document.getElementById("capToggle").addEventListener("change",function(){ showCaptions=this.checked;
    capEl.classList.toggle("off",!showCaptions);
    if(!showCaptions) showCap(false); else if(playing) buildCaption(activeIndex); });

  var voiceSelect=document.getElementById("voiceSelect"), ttsRow=document.getElementById("ttsRow");
  var PREF=["Samantha","Serena","Allison","Ava","Daniel","Karen","Moira","Google UK English Female","Google US English","Microsoft Aria"];
  function pickDefault(list){ for(var i=0;i<PREF.length;i++)for(var j=0;j<list.length;j++) if(list[j].name.indexOf(PREF[i])!==-1) return list[j];
    for(var k=0;k<list.length;k++) if(/^en/i.test(list[k].lang)) return list[k]; return list[0]||null; }
  function loadVoices(){ if(!ttsOK)return; voices=synth.getVoices().filter(function(v){return /^en/i.test(v.lang);}); if(!voices.length)voices=synth.getVoices();
    voiceSelect.innerHTML=""; voices.forEach(function(v,i){ var o=document.createElement("option"); o.value=i; o.textContent=v.name; voiceSelect.appendChild(o); });
    if(!chosenVoice)chosenVoice=pickDefault(voices); if(chosenVoice){ var ci=voices.indexOf(chosenVoice); if(ci>=0)voiceSelect.value=ci; } }
  voiceSelect.addEventListener("change",function(){ chosenVoice=voices[parseInt(voiceSelect.value,10)]||chosenVoice; });
  if(ttsOK){ loadVoices(); if(synth.onvoiceschanged!==undefined) synth.onvoiceschanged=loadVoices;
    setInterval(function(){ if(playing&&!paused&&mode==="tts"&&synth.speaking){ synth.pause(); synth.resume(); } },12000); }
  if(!HAS_AUDIO){ ttsRow.style.display="flex"; modeFlag.textContent=ttsOK?"Browser voice":"unavailable"; }
  else { modeFlag.textContent="ElevenLabs"; }

  addEventListener("beforeunload",function(){ if(playing&&mode==="audio") saveProgress(activeIndex,audio.currentTime,false); if(ttsOK) synth.cancel(); try{audio.pause();}catch(e){} });
  document.addEventListener("keydown",function(e){ if(e.code==="Space"&&player.classList.contains("show")&&e.target===document.body){ e.preventDefault(); playBtn.click(); } });
  setActive(0,false);

  // arrived here from a "resume" link on the library card -> jump straight in
  try{ var _q=new URLSearchParams(location.search);
    if(_q.has("at") && savedProg && !savedProg.done && savedProg.scene>0){
      autoArm=true; startNarration(savedProg.scene, savedProg.t||0); }
  }catch(e){}
})();
</script>
</body>
</html>`;

/* ============================== LIBRARY TEMPLATE ========================= */
const LIBRARY_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Story Time — Anthropic, read aloud</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<meta name="theme-color" content="#0B0E14">
<style>
  :root {
    --ink:#0B0E14; --ink2:#0E1219; --text:#F4EFE6; --muted:#98A2B4; --faint:#5A6274;
    --gold:#F2C879; --green:#7FC8A0; --sky:#8FB8E8; --rose:#E8927C; --lav:#C4AEE8;
    --amber:#E4A85E; --steel:#86A9CC; --violet:#B49CF0; --teal:#66C6BE; --crimson:#DE8A86; --sage:#A7C08C;
    --serif:"Hoefler Text","New York","Iowan Old Style",Palatino,Georgia,serif;
    --sans:-apple-system,"SF Pro Text","Helvetica Neue",Inter,system-ui,sans-serif;
    --mono:"SF Mono",ui-monospace,"Menlo","Roboto Mono",monospace;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ink); color:var(--text); font-family:var(--sans); font-size:18px;
    line-height:1.7; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
  #dawn { position:fixed; inset:0; z-index:-2;
    background:radial-gradient(120% 80% at 50% -10%, rgba(242,200,121,0.10) 0%, transparent 55%), linear-gradient(180deg,#0C0F16 0%,#0B0E14 100%); }
  #meadow { position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:.85; }
  .wrap { max-width:74rem; margin:0 auto; padding:clamp(3rem,9vh,7rem) clamp(1.5rem,5vw,4rem) 6rem; position:relative; z-index:1; }

  header { max-width:46rem; margin-bottom:clamp(2.6rem,6vw,4.5rem); }
  .mark { font-family:var(--mono); font-size:.72rem; letter-spacing:.34em; text-transform:uppercase; color:var(--gold); margin:0 0 1.6rem; }
  h1 { font-family:var(--serif); font-weight:500; font-size:clamp(2.6rem,9vw,5.8rem); line-height:.98; margin:0; letter-spacing:-.015em; text-wrap:balance; overflow-wrap:break-word; }
  .lede { font-size:clamp(1.05rem,2.4vw,1.35rem); color:var(--muted); margin:1.6rem 0 0; max-width:34rem; }
  .lede b { color:var(--text); font-weight:600; }
  .credit { font-family:var(--mono); font-size:.66rem; letter-spacing:.16em; text-transform:uppercase; color:var(--faint); margin:1.8rem 0 0; }
  .credit b { color:var(--muted); font-weight:600; }

  /* view switch */
  .switch { display:inline-flex; gap:.2rem; background:rgba(255,255,255,.04); border:1px solid rgba(244,239,230,.1);
    border-radius:999px; padding:.25rem; margin:2.2rem 0 2.6rem; }
  .switch button { font-family:var(--mono); font-size:.66rem; letter-spacing:.14em; text-transform:uppercase;
    color:var(--muted); background:transparent; border:0; border-radius:999px; padding:.5rem 1.1rem; cursor:pointer; transition:.2s; }
  .switch button.on { color:var(--ink); background:var(--gold); }
  .switch button:hover:not(.on){ color:var(--text); }
  .view[hidden]{ display:none; }

  .shelf { margin-bottom:2.8rem; }
  .shelf-head { margin-bottom:1.2rem; display:flex; align-items:baseline; gap:.9rem; flex-wrap:wrap;
    border-bottom:1px solid rgba(244,239,230,.08); padding-bottom:.8rem; }
  .shelf-head h3 { font-family:var(--serif); font-weight:500; font-size:1.55rem; margin:0; letter-spacing:-.01em; color:var(--text); }
  .shelf-head p { font-size:.9rem; color:var(--faint); margin:0; }
  .yeargroup { margin-bottom:2.4rem; }
  .year { font-family:var(--mono); font-weight:500; font-size:1.4rem; color:var(--muted); margin:0 0 1.1rem;
    letter-spacing:.02em; font-variant-numeric:tabular-nums; }

  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(19rem,100%),1fr)); gap:1.1rem; }
  .card { position:relative; min-width:0; display:flex; flex-direction:column;
    background:linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012));
    border:1px solid rgba(244,239,230,.10); border-radius:18px; padding:1.5rem 1.5rem 1.3rem; min-height:15rem;
    transition:transform .3s cubic-bezier(.2,.7,.2,1), border-color .3s, background .3s; }
  .card:before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--accent);
    opacity:.8; border-radius:18px 0 0 18px; transition:width .3s, opacity .3s; }
  .card:hover { transform:translateY(-5px); border-color:color-mix(in oklab, var(--accent) 40%, transparent);
    background:linear-gradient(180deg, color-mix(in oklab, var(--accent) 9%, transparent), rgba(255,255,255,.012)); }
  .card:hover:before { width:5px; opacity:1; }
  .ttl { text-decoration:none; color:inherit; display:block; }
  .ttl::after { content:""; position:absolute; inset:0; z-index:1; border-radius:18px; }
  .ttl:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }

  .card-top { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1.1rem; }
  .chip { font-family:var(--mono); font-size:.6rem; letter-spacing:.16em; text-transform:uppercase; color:var(--accent);
    border:1px solid color-mix(in oklab, var(--accent) 45%, transparent); border-radius:999px; padding:.3rem .7rem; }
  .dur { font-family:var(--mono); font-size:.62rem; letter-spacing:.06em; color:var(--faint); white-space:nowrap; }
  .card h2 { font-family:var(--serif); font-weight:500; font-size:1.7rem; line-height:1.1; margin:0 0 .5rem; letter-spacing:-.01em; text-wrap:balance; overflow-wrap:break-word; }
  .card .sub { font-size:.86rem; color:var(--muted); margin:0 0 .9rem; font-style:italic; font-family:var(--serif); }
  .card .tag { font-size:.96rem; color:var(--muted); margin:0; flex:1; }
  .card-foot { display:flex; align-items:center; justify-content:space-between; gap:.7rem 1rem; margin-top:1.4rem;
    padding-top:1rem; border-top:1px solid rgba(244,239,230,.08); pointer-events:none; flex-wrap:wrap; min-width:0; }
  .card .by { font-family:var(--mono); font-size:.64rem; letter-spacing:.06em; color:var(--faint);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; flex:1 1 auto; }
  .foot-right { display:inline-flex; align-items:center; gap:1rem; }
  .source { position:relative; z-index:2; pointer-events:auto; font-family:var(--mono); font-size:.6rem;
    letter-spacing:.1em; text-transform:uppercase; color:var(--muted); text-decoration:none; border-bottom:1px solid transparent; white-space:nowrap; }
  .source:hover { color:var(--text); border-color:var(--muted); }
  .card .play { display:inline-flex; align-items:center; gap:.5rem; font-family:var(--mono); font-size:.64rem;
    letter-spacing:.16em; text-transform:uppercase; color:var(--accent); white-space:nowrap; }
  .card .play .tri { width:0; height:0; border-left:8px solid var(--accent); border-top:5px solid transparent; border-bottom:5px solid transparent; }
  .card .stbadge { position:absolute; top:-9px; right:16px; z-index:4; font-family:var(--mono); font-size:.54rem;
    letter-spacing:.1em; text-transform:uppercase; padding:.24rem .6rem; border-radius:999px; background:var(--accent);
    color:var(--ink); font-weight:700; text-decoration:none; cursor:pointer; white-space:nowrap;
    box-shadow:0 4px 14px -4px rgba(0,0,0,.65); transition:transform .15s ease, filter .15s ease; }
  .card .stbadge:hover { transform:translateY(-1px); filter:brightness(1.08); }
  .card .stbadge:focus-visible { outline:2px solid var(--text); outline-offset:2px; }
  .card .stbadge.fin { background:var(--sage); }
  .card .pbar { position:absolute; left:0; bottom:0; height:3px; width:0; background:var(--accent);
    border-radius:0 2px 2px 18px; z-index:2; transition:width .6s ease; }
  .card.done .pbar { background:var(--sage); opacity:.75; }

  footer { margin-top:4rem; font-family:var(--mono); font-size:.66rem; letter-spacing:.1em; color:var(--faint); text-transform:uppercase; }
  footer a { color:var(--muted); text-decoration:none; border-bottom:1px solid transparent; }
  footer a:hover { border-color:var(--muted); }

  @media (max-width:560px){
    body{ font-size:16px; }
    .grid{ grid-template-columns:minmax(0,1fr); }
    .wrap{ padding:clamp(2.2rem,7vh,3.5rem) 1.2rem 4rem; }
    .card{ min-height:0; padding:1.3rem 1.3rem 1.15rem; }
    .card h2{ font-size:1.5rem; }
    header{ margin-bottom:2.2rem; }
  }
</style>
</head>
<body>
<div id="dawn"></div>
<canvas id="meadow"></canvas>
<div class="wrap">
  <header>
    <p class="mark">Story Time</p>
    <h1>The Anthropic Reading Room</h1>
    <p class="lede">Long essays and dense papers on AI — the safety case, the science, and the future worth fighting for — <b>turned into short, narrated listening experiences.</b> Pick one and press play.</p>
    <p class="credit">Designed by <b>Opus</b> &nbsp;·&nbsp; Narrated by <b>ElevenLabs</b></p>
  </header>

  <div class="switch" role="tablist" aria-label="Library view">
    <button id="tabShelves" class="on" role="tab" aria-selected="true">Shelves</button>
    <button id="tabChrono" role="tab" aria-selected="false">Chronological</button>
  </div>

  <div class="view" id="viewShelves">
__SHELVES__
  </div>
  <div class="view" id="viewChrono" hidden>
__CHRONO__
  </div>

  <footer>Machines of Loving Grace · Core Views · Constitutional AI · Interpretability · and more — read aloud.</footer>
</div>
<script>
(function(){
  var tS=document.getElementById("tabShelves"), tC=document.getElementById("tabChrono");
  var vS=document.getElementById("viewShelves"), vC=document.getElementById("viewChrono");
  function show(shelves){ vS.hidden=!shelves; vC.hidden=shelves;
    tS.classList.toggle("on",shelves); tC.classList.toggle("on",!shelves);
    tS.setAttribute("aria-selected",shelves); tC.setAttribute("aria-selected",!shelves);
    try{ localStorage.setItem("st-view", shelves?"shelves":"chrono"); }catch(e){} }
  tS.addEventListener("click",function(){ show(true); });
  tC.addEventListener("click",function(){ show(false); });
  try{ if(localStorage.getItem("st-view")==="chrono") show(false); }catch(e){}
})();
(function(){
  // decorate cards with this visitor's listening progress
  function pget(id){ try{ return JSON.parse(localStorage.getItem("st-progress-"+id)||"null"); }catch(e){ return null; } }
  Array.prototype.forEach.call(document.querySelectorAll(".card"),function(card){
    var id=card.getAttribute("data-id"), total=+card.getAttribute("data-scenes")||1, p=pget(id);
    if(!p) return;
    var playEl=card.querySelector(".play");
    var badge=document.createElement("a"); badge.className="stbadge";
    badge.href=id+"/index.html"+(p.done?"":"?at="+p.scene);
    var bar=document.createElement("div"); bar.className="pbar"; card.appendChild(bar);
    if(p.done){ card.classList.add("done"); badge.className="stbadge fin"; badge.textContent="\\u2713 Done";
      badge.setAttribute("aria-label","Finished — open to replay");
      if(playEl) playEl.innerHTML="\\u2713 Replay"; card.appendChild(badge);
      setTimeout(function(){ bar.style.width="100%"; },30); }
    else { var pct=Math.max(3,Math.min(97,Math.round(p.scene/total*100)));
      badge.textContent="\\u25B8 Resume "+pct+"%"; badge.title="Resume from "+pct+"%"; badge.setAttribute("aria-label","Resume from "+pct+" percent");
      if(playEl) playEl.innerHTML='<span class="tri"></span> Resume'; card.appendChild(badge);
      setTimeout(function(){ bar.style.width=pct+"%"; },30); }
  });
})();
(function(){
  var c=document.getElementById("meadow"), x=c.getContext("2d"), W,H,pts=[],raf;
  var reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  function size(){ var d=devicePixelRatio||1; W=c.width=innerWidth*d; H=c.height=innerHeight*d; c.style.width=innerWidth+"px"; c.style.height=innerHeight+"px"; }
  function seed(){ var d=devicePixelRatio||1,n=Math.min(80,Math.floor(innerWidth/16)); pts=[];
    for(var i=0;i<n;i++) pts.push({x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.5+0.4)*d,vx:(Math.random()-0.5)*0.1,vy:-(Math.random()*0.16+0.03),a:Math.random()*0.45+0.12,tw:Math.random()*6.28}); }
  function draw(){ x.clearRect(0,0,W,H);
    for(var i=0;i<pts.length;i++){ var p=pts[i]; p.x+=p.vx; p.y+=p.vy; p.tw+=0.02; if(p.y<-10){p.y=H+10;p.x=Math.random()*W;}
      var f=p.a*(0.6+0.4*Math.sin(p.tw)); x.beginPath(); x.arc(p.x,p.y,p.r,0,6.2832); x.fillStyle="rgba(242,200,121,"+f.toFixed(3)+")"; x.fill(); }
    raf=requestAnimationFrame(draw); }
  size(); seed(); if(!reduced) draw(); addEventListener("resize",function(){ size(); seed(); });
})();
</script>
</body>
</html>`;

main().catch((e) => { console.error(e); process.exit(1); });
