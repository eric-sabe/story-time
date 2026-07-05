# Story Time — the Anthropic Reading Room

Turn long essays and dense papers into **narrated, scroll-driven listening experiences** and
collect them in one library. Built to publish as a static site at
`eric-sabe.github.io/story-time/`.

Live pieces so far: *Core Views on AI Safety*, *Machines of Loving Grace*, *Constitutional AI*,
*Claude's Constitution*, *Scaling Monosemanticity*, and the Oprah/Amodei interview.

---

## What a reader gets

- A **library** (`index.html`) — one card per work, each with its own signature color, a kind
  chip (Essay / Paper / Interview), an estimated listen time, and a chapter count.
- Per work, an **experience** (`<id>/index.html`) — a full-screen, scene-by-scene reading with:
  - **Real ElevenLabs voiceover**, one clip per scene, that auto-advances.
  - **Karaoke captions** — the current sentence, with each word lighting up in time with the
    audio (driven by ElevenLabs word-level timestamps).
  - A **dawn palette** that shifts hue per section, an ambient "meadow of light" canvas, and
    count-up statistics.
  - A floating player: play/pause, prev/next, **playback speed** (0.85× → 1.5×), volume,
    caption toggle, and a back-link to the library.
  - A graceful **browser-TTS fallback** if the audio files are missing.

---

## Repository layout

```
story-time/
  index.html                     ← generated library landing page
  build.mjs                      ← the whole engine (loader, TTS, renderers)
  .env                           ← ELEVENLABS_API_KEY + VOICE_ID  (git-ignored)
  works/
    machines-of-loving-grace.mjs ← a work authored directly as a module
    data/
      core-views-on-ai-safety.json
      constitutional-ai.json
      ...                        ← works authored as JSON data
  <id>/                          ← generated per work, e.g. machines-of-loving-grace/
    index.html                   ← generated experience
    audio/
      s0.mp3 … sN.mp3            ← generated narration
      captions.json             ← cached word-timing data (single source for captions)
```

Every link is **relative**, so the site works unchanged under any base path (including
`/story-time/`).

---

## Build commands

```bash
node build.mjs                 # synth any missing audio for all works, render everything
node build.mjs <id> [<id>…]    # (re)synth only these works; still renders all HTML + library
node build.mjs --force         # re-synthesize ALL audio even if cached
node build.mjs --html-only     # no API calls — render HTML with browser-TTS fallback
```

Audio is cached: a scene is re-synthesized only when its `.mp3` or caption is missing, or under
`--force`. Editing a scene's narration and re-running regenerates just that clip.

`.env`:
```
ELEVENLABS_API_KEY=…
VOICE_ID=…
# optional: MODEL_ID (default eleven_multilingual_v2), STABILITY, SIMILARITY, STYLE
```

---

## Adding a new work

1. Create `works/data/<id>.json` (or a `works/<id>.mjs` exporting `{ meta, scenes }`).
2. Run `node build.mjs <id>` to synth its audio and render it.
3. It appears in the library automatically, ordered by `meta.order`.

### `meta`

```jsonc
{
  "id": "kebab-case-id",          // also the output folder name
  "order": 3,                      // position in the library
  "title": "...",
  "subtitle": "...",               // optional; shown italic on hero + card
  "author": "...",
  "date": "March 2023",
  "kind": "Essay | Paper | Interview | Blog post",
  "source": "Anthropic",
  "tagline": "one-sentence hook for the library card (≤ ~90 chars)",
  "signature": "steel",            // hue name — the work's identity color
  "hero": {
    "epigraph": { "text": "…", "cite": "…" },   // or null
    "prologueNarration": "spoken intro, ~80–130 words"
  }
}
```

The hero scene (scene 0) is **generated from `meta`** — do not author it yourself.

### `scenes` (content scenes only)

Each scene:
```jsonc
{
  "hue": "steel",                  // section color, from the palette below
  "num": "01",                     // optional section number (omit if not a real sequence)
  "eyebrow": "Short label",        // used for the player's chapter label
  "title": "Scene headline",
  "bodyHtml": "…skimmable on-screen copy…",   // HTML-escaped in JSON; see vocabulary
  "narration": "…the spoken text…",           // the voiceover; see rules
  "stats": [ { "fig": "10", "u": "×", "cap": "…", "countFrom": 0, "countTo": 10 } ]  // optional
}
```

Scenes authored directly as a `.mjs` may instead use `{ hue, sub, body, narration, wide }` with
raw (un-escaped) HTML in `body` — see `works/machines-of-loving-grace.mjs`.

### On-screen copy vocabulary (`bodyHtml`)

Keep it **skimmable — not a transcript of the narration.** Allowed:

- `<p class="eyebrow"><span class="num">01</span><span class="dot"></span> LABEL</p>` (num optional)
- `<h2>headline</h2>`
- `<p class="lede">… <span class="hl">highlight</span> …</p>`
- `<p>… <em>italic</em> …</p>`
- `<ul class="reasons">` / `reasons two` (2-col) / `reasons tight`, with `<li><b>Lead.</b> detail</li>`
- `<p class="chips"><span>A</span><span>B</span></p>`
- `<div class="stats">…</div>` (or use the `stats` field instead)
- `<p class="capnote">closing note</p>`
- `<p class="quote">pull quote with <span class="grace">accent</span></p>`
- `<code>…</code>`

Start each scene's `bodyHtml` with the eyebrow, then the `<h2>`.

---

## Narration rules (this text is read aloud by ElevenLabs)

These matter — they're the difference between a natural read and a robotic one.

- **Write "AI", never "A.I."** Periods make the model say "ay-ee." Same for other initialisms:
  write plain caps (`RLHF`, `GDP`, `PTSD`, `mRNA`), and **expand** them on first use when a bare
  acronym would sound cryptic ("reinforcement learning from AI feedback — RLAIF").
- **Never "10x"** → write "ten times." Spell numbers where it helps the read
  ("two thousand," "nineteen ninety-one," "thirty-four million").
- **Control pauses with punctuation.** Short sentences. Em-dashes (—) for a medium beat.
  Ellipses (…) sparingly, for suspense or a trailing thought. Commas for small beats. One idea
  per sentence. This — not tags — is how the pacing is shaped.
- **Voice:** warm, intelligent, documentary. Faithful to the source; no hype it doesn't support.
  Original distillation in your own words — short quoted phrases only, never long verbatim
  passages.
- **Length:** ~60–150 words per scene; ~14–20 scenes for a full essay/paper.

Captions are derived from the audio's word timestamps and windowed **one sentence at a time**, so
sentence punctuation also controls what the reader sees.

---

## Automated pipeline: `/add-work` and `/add-works`

Adding works by hand is fine, but the repo also ships a Claude Code pipeline that does it end to
end — and, crucially, **fact-checks the result against the original before it publishes.**

Two custom subagents (`.claude/agents/`):
- **`work-distiller`** — reads the full source and writes `works/data/<id>.json` following the schema
  and the narration rules above.
- **`faithfulness-reviewer`** — an *independent, adversarial* fact-checker. It re-reads the source
  itself and checks every spoken and on-screen claim, flagging any hallucinated fact, wrong number,
  invented quote, dropped caveat, or overclaim, and returns a strict JSON verdict (`PASS` /
  `REVISE` / `BLOCKED`) with concrete fixes. **A work is never narrated until it passes.**

Two slash commands (`.claude/commands/`):
- **`/add-work <source-url-or-pdf> [hints]`** — the full pipeline for one work:
  1. resolve meta (id, shelf, signature, accurate `sortDate` + canonical `url`),
  2. distill → `works/data/<id>.json`,
  3. **adversarial fidelity review** (the gate),
  4. apply critical fixes and re-review, up to 3 rounds (stop and report if it can't pass),
  5. `node build.mjs <id>` to narrate + render,
  6. verify and report.
  With no arguments it pulls the next pending item from `works/queue.json`.
- **`/add-works`** — drains `works/queue.json`, running the `/add-work` pipeline per item and
  stopping (not skipping) on any failure. For hands-off draining you can also run
  `/loop /add-work`. See `works/queue.example.json` for the queue format.

The review gate exists because these are Anthropic's own essays and papers: the bar is 100%
faithful, and "close enough" is a bug.

## Palette (hue names)

`gold · green · sky · rose · lav · amber · steel · violet · teal · crimson · sage`

Grounds are derived automatically from the accent (a tinted near-black), so any hue "just works."
Give each work a `signature` hue for its hero and library card, and vary scene `hue`s to match the
emotional arc of each section (e.g. crimson for danger, sky for discovery, rose for the intimate).

---

## Deploying to GitHub Pages

1. `node build.mjs` (make sure every work has audio).
2. Commit everything **except `.env`** (already git-ignored).
3. Push to the `story-time` repo; enable Pages on the default branch, root folder.
4. Visit `https://eric-sabe.github.io/story-time/`.

Audio is committed to the repo (a work is ~15–20 MB of MP3). That's well within Pages limits.
