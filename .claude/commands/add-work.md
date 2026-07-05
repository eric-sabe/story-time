---
description: Add one work to the Story Time anthology — distill a source into a narrated experience, adversarially fact-check it against the original, fix any issues, then generate audio and rebuild.
argument-hint: <source-url-or-pdf-path> [title | shelf | any hints]  (or leave empty to pull the next item from works/queue.json)
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, WebSearch
---

Add a work to the Story Time anthology at the repo root. The source and any hints: `$ARGUMENTS`

Follow this pipeline exactly. **Do not skip the review gate**, and **do not generate audio until the
work passes fidelity review** — these are Anthropic's own words and must be represented faithfully.

## 1. Resolve the work spec
- If `$ARGUMENTS` is empty, read `works/queue.json` and take the first item whose `status` is not
  `"done"`; use its fields. If the queue is empty, tell the user and stop.
- Otherwise parse the source (a URL or an absolute PDF path) and any hints from `$ARGUMENTS`.
- Determine the meta fields. Look at existing `works/data/*.json` and `works/*.mjs` for conventions.
  - `id`: kebab-case from the title (also the output folder name).
  - `order`: max existing `meta.order` + 1.
  - `title`, `subtitle`, `author`, `date`, `kind` (Essay/Paper/Interview/Policy/Blog post),
    `source`: from the source. Verify the **publication date and canonical URL** with a quick
    WebSearch if unsure — `sortDate` (YYYY-MM-DD) must be accurate for chronological ordering.
  - `shelf`: one of the existing shelves in `build.mjs` (`SHELVES`). If none fits, propose a new one
    and add it to `SHELVES` in the right reading order.
  - `signature`: a hue (gold green sky rose lav amber steel violet teal crimson sage) that suits the
    piece and isn't identical to its shelf-mates where avoidable.
  - `url`: the canonical public source link.
- If a required field is genuinely ambiguous, ask the user once; otherwise choose sensibly and note
  your choice.

## 2. Distill  →  works/data/<id>.json
Spawn the **work-distiller** agent (Task tool, `subagent_type: "work-distiller"`). Give it the
SOURCE and the exact META block you resolved (fixed fields filled; it fills tagline, subtitle,
prologueNarration, and the scenes). It writes `works/data/<id>.json`.

Then sanity-check: `node -e "JSON.parse(require('fs').readFileSync('works/data/<id>.json','utf8'))"`
must succeed. If it doesn't parse, fix the JSON or re-run the distiller.

## 3. Adversarial fidelity review  (the gate)
Spawn the **faithfulness-reviewer** agent (`subagent_type: "faithfulness-reviewer"`). Give it the
data-file path and the SOURCE. It independently re-reads the source and returns a strict JSON verdict
with `findings`.

## 4. Fix and re-review (loop, max 3 rounds)
- If `verdict` is `PASS`: continue.
- If `REVISE`: apply every **critical** finding to `works/data/<id>.json` using its `fix` (edit the
  specific `narration` / `bodyHtml` / `tagline` text; if `fix` is `remove`, delete or replace the
  claim). Address minor findings if cheap. Then spawn a **fresh** faithfulness-reviewer and repeat.
- If still `REVISE` with critical findings after 3 rounds, **stop** and report the remaining findings
  to the user — do not publish a work that failed review.
- If `BLOCKED` (source unreachable): tell the user; do not fabricate — stop.

## 5. Generate audio + render
Once it PASSES: `node build.mjs <id>` (synthesizes ElevenLabs narration for that work and renders
`<id>/index.html`; it also rebuilds the library `index.html`). If the run errors on ElevenLabs quota
or auth, stop and report exactly which scenes were and weren't generated.

## 6. Verify + report
- Confirm `<id>/audio/*.mp3` exist and `<id>/index.html` was written with `(audio)`.
- If a preview server is handy, spot-check the page renders with no console errors and the captions
  sync.
- If the item came from `works/queue.json`, set its `status` to `"done"`.
- Report to the user: the work title, shelf, scene count, listen time, the review verdict (and how
  many findings were fixed), and the character count used.
