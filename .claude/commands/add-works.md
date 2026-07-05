---
description: Batch-add works to the Story Time anthology — drains works/queue.json, running the full add-work pipeline (distill → adversarial fidelity review → fix → narrate → rebuild) for each pending item.
argument-hint: (none — reads works/queue.json)  or a JSON array of work specs to enqueue first
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, WebSearch
---

Batch-add works to the Story Time anthology. Optional inline queue: `$ARGUMENTS`

## Setup
- If `$ARGUMENTS` contains a JSON array of work specs, append them to `works/queue.json` (create it
  as `[]` if missing). Each spec: `{ "source": "<url-or-pdf>", "title": "...", "shelf": "...",
  "signature": "...", "kind": "...", "author": "...", "date": "...", "sortDate": "YYYY-MM-DD",
  "url": "...", "status": "pending" }` — any fields you omit will be resolved during add-work.
- Read `works/queue.json`. The pending items are those without `status: "done"`.

## Loop
For each pending item, in order, run the **/add-work pipeline** (see `.claude/commands/add-work.md`)
for that item's source and spec:
1. Distill → `works/data/<id>.json` (work-distiller agent).
2. Adversarial fidelity review (faithfulness-reviewer agent) — the gate.
3. Fix critical findings and re-review, up to 3 rounds.
4. On PASS: `node build.mjs <id>` to narrate + render. Mark the queue item `status: "done"`.
5. On failure (review can't pass in 3 rounds, or ElevenLabs quota/auth error): mark the item
   `status: "blocked"` with a short `note`, **stop the loop**, and report — do not silently skip.

To keep memory bounded, process items one at a time; you may run the distiller and the first review
for the *next* item while narrating the current one, but never generate audio for a work that hasn't
passed review.

## Finish
- After the queue drains (or the loop stops), `node build.mjs --html-only` once to ensure the library
  `index.html` reflects every new work in both Shelves and Chronological views.
- Report a table: each processed work → shelf, scenes, listen time, review verdict, status.
- Note the total ElevenLabs characters used and anything left `pending` or `blocked`.

Tip: for hands-off draining you can also run `/loop /add-work` — with no arguments, `/add-work`
pulls the next pending queue item each iteration.
