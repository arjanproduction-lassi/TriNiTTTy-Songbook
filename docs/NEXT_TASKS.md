# Next Tasks

Date saved: 2026-04-30

Status: queued. Do not start until Peter finishes tablet testing and asks to continue.

## Current Product State

T8 is the only source of truth.

Current RC1 baseline:

- A4 preview / detail / setlist / performance use the shared canonical A4 renderer.
- Native Chrome Print / Save as PDF mismatch was fixed and manually verified.
- PWA update flow works on tablet.
- Google Drive canonical file memory is deferred to a separate future task.

Critical rule:

If anything breaks A4 truth consistency between editor, song detail, setlist preview, performance, print, or PDF, it is a critical defect.

## Next Task: UI Compaction Pass For Desktop Admin Workspace

Goal:

Make the existing desktop admin/edit workspace denser, cleaner, and more practical without changing song rendering or product behavior.

Product diagnosis:

The app is functionally moving forward, but the shell has become visually bulky. There is too much vertical chrome, too many nested cards, helper boxes, and large controls. On desktop, important controls can still require unnecessary scrolling even on a wide monitor. On tablet, the same admin shell is not the priority and should not drive this pass.

Core product decision:

- Desktop/PC = admin/edit workspace.
- Tablet = setlist + concert mode first.
- Same A4 renderer everywhere.
- Different shell responsibilities are allowed.
- Different song layout/rendering engines are not allowed.

## Hard Rules

- Do not redesign the whole app.
- Do not change the canonical A4 renderer.
- Do not touch print/PDF logic.
- Do not create a separate tablet/mobile song renderer.
- Do not add unrelated product features.
- Do not refactor broadly.
- Do not create visual polish that increases scrolling.
- Keep A4 preview as the only visual truth.

## Part A: Desktop Admin Workspace Compaction

Observed desktop problems:

1. Top header area is too tall.
2. Helper/info boxes consume too much vertical space.
3. Nested rounded cards create visual noise.
4. Important controls are pushed too far down.
5. A4 preview does not get enough practical space.
6. Wide desktop still involves too much page-level scrolling.
7. Some layouts feel like cards inside cards rather than one working surface.

Required desktop behavior:

1. Reduce top chrome height.
2. Make the top header/nav more compact.
3. Reduce oversized padding, card radius, and helper-box dominance in desktop admin views.
4. Keep the A4 preview visually important and spacious.
5. Minimize unnecessary vertical stacking in desktop mode.
6. Prefer stable split-workspace layout over stacked card layout.
7. Avoid horizontal scrolling unless absolutely necessary.
8. Keep selected-block editor and block list easy to reach.
9. Make desktop admin workspace feel like a tool, not a landing page.

Preferred desktop layout direction:

- one compact top bar
- below it, one main working surface
- block editor view:
  - left = block/section navigation
  - middle = selected block editor
  - right = A4 preview
- each pane may scroll internally
- avoid page-level scrolling as much as possible
- give A4 preview the largest share of width on desktop

Possible implementation direction:

- reduce hero/header height significantly
- reduce card padding in desktop mode
- collapse helper texts into lighter inline hints
- remove redundant repeated info boxes
- make panes height-aware using viewport height
- use sticky compact toolbar where useful
- tune desktop column ratios for real editing, not presentation

## Part B: Tablet Role Separation

Product rule:

Tablet is not the primary place for full editing comfort.

Tablet priority:

1. Setlist
2. Concert/performance mode

Required direction:

- do not optimize full admin editing for tablet in this pass
- allow tablet editing to remain secondary
- prioritize tablet comfort only in setlist and concert mode
- do not spend time making raw/block import perfect on tablet right now

## What Not To Do

- Do not start mobile optimization now.
- Do not rework the A4 layout engine.
- Do not add new features.
- Do not touch Google Drive in this task.
- Do not modify print/PDF unless an actual regression is found.
- Do not reopen pair-anchor transposition unless a regression is found.

## Definition Of Done

1. Desktop admin workspace is visibly denser and more practical.
2. Top area is smaller and cleaner.
3. A4 preview gets more usable space.
4. Important controls are reachable with less scrolling on desktop.
5. Block editor layout feels like a real workspace, not stacked marketing cards.
6. Tablet remains focused on setlist + concert use, not full editor comfort.
7. No regression in A4 truth.

## Manual Verification Wanted

- wide desktop monitor
- import raw mode
- block editor mode
- setlist view
- confirm less vertical hunting for controls
- confirm preview has more space than before
- confirm A4 truth still matches editor/detail/setlist/performance/print/PDF

## Output Wanted

When this task is implemented, report:

- pass/fail
- exact files changed
- what was compacted on desktop
- what was intentionally left alone for tablet
- what should be the next tablet-only task after this

## Deferred Separate Task: Google Drive Canonical File Memory

Keep this out of RC1 compaction work unless Peter explicitly starts the Drive task.

Goal:

Use one user-chosen Google Drive JSON file as interim canonical storage, remembered by Google Drive file ID, not by folder path.

Scope guard:

If direct Google Drive auth/file access is not already wired, do not build a full OAuth architecture as a side quest. Stop and report that Drive auth is a separate task.
