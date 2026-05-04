# Next Tasks

Date saved: 2026-05-04

Status: dirty-state workflow implemented; next queued task is desktop workspace compaction.

## Current Product State

T8 is the only source of truth.

Current RC1 baseline:

- A4 preview / detail / setlist / performance use the shared canonical A4 renderer.
- Native Chrome Print / Save as PDF mismatch was fixed and manually verified.
- PWA update flow works on tablet.
- Dirty-state workflow exists and currently maps canonical save to explicit JSON database export.
- Google Drive canonical file memory is deferred to a separate future task.

Critical rule:

If anything breaks A4 truth consistency between editor, song detail, setlist preview, performance, print, or PDF, it is a critical defect.

## Completed Task: Unsaved Canonical Data Warning + Dirty-State Workflow

Priority:

Do this before UI compaction. This protects canonical song/setlist data and prevents a false sense of safety.

Problem:

Peter can edit a song and save it inside the app, but still forget to save/export/publish the canonical database/shared JSON afterward. The song then looks saved in the UI, while the shared/canonical storage may still be outdated.

Product decision:

Do not rely on Peter's memory. The app must clearly distinguish:

1. local/autosaved app state
2. canonical saved/published state

Goal:

Make it impossible to miss that the current app state still has unpublished / unsaved canonical changes.

Core rule:

If the user changes songs, setlists, or canonical metadata, the app must enter a visible dirty state until the canonical database/file is explicitly saved.

Scope guard:

- Do not build cloud sync here.
- Do not build full Google Drive integration here.
- Do not redesign the whole app.
- Do not remove existing local autosave.
- Keep local autosave if present.
- This is warning/status workflow for canonical save, not a new storage architecture.

### Part A: Dirty State

After any canonical change, mark app state as dirty:

- song created
- song edited
- song deleted
- setlist changed
- setlist order changed
- setlist renamed
- canonical metadata changed

Dirty means:

- local state may be saved
- canonical database/file is not yet saved/published

### Part B: Visible Status

Show a clear persistent status in the main header/top bar:

- example: `Neexportované zmeny v databáze`
- warning color
- not tiny
- not hidden in a submenu

When canonical save succeeds, switch status to:

- `Databáza exportovaná`
- include timestamp if possible

### Part C: Canonical Save Action

Add one explicit main action for canonical save:

- `Exportovať databázu`
- or later, when Drive exists: `Uložiť do Drive`

This action clears dirty state only after successful canonical save.

If save fails, dirty state stays active.

Important:

- Do not pretend local save equals canonical save.
- Do not auto-clear dirty state on song save only.
- For current RC1, canonical save may map to the existing backup/export flow if that is the smallest safe path.

### Part D: Before-Leave Protection

If dirty state is active, warn on:

- page reload
- closing tab
- leaving app route if relevant

Use browser `beforeunload` warning where possible.

Do not warn if nothing changed.

### Optional Quality Improvement

Track and show if easy:

- `lastLocalAutosaveAt`
- `lastCanonicalSaveAt`

Example:

- `Lokálne uložené: 15:42`
- `Databáza exportovaná: 15:30`

If that is too much for this pass, implement only:

- dirty / saved canonical status
- clear save button
- leave warning

### Strong UX Rule

The user must always know which of these is true:

- safe locally
- not yet saved to canonical database/file
- fully saved canonically

Do not:

- hide this behind technical wording
- pretend local save equals canonical save
- auto-clear dirty state on song save only
- add broad new persistence systems

### Definition Of Done

1. Editing a song triggers visible dirty state.
2. Changing setlist triggers visible dirty state.
3. Dirty state stays until explicit canonical save succeeds.
4. Header/top bar clearly shows unsaved canonical changes.
5. Leaving/reloading while dirty warns the user.
6. After successful canonical save, status changes to saved.
7. No regression in current local autosave behavior.

### Output Wanted

When this task is implemented, report:

- pass/fail
- exact files changed
- what events now mark dirty state
- where the status is shown
- what action clears dirty state
- what remains manual for Peter to test

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

Keep this out of RC1 compaction work unless Peter explicitly starts the Drive task. This remains important because Vercel/installed PWAs do not sync IndexedDB between PC and tablet.

Goal:

Use one user-chosen Google Drive JSON file as interim canonical storage, remembered by Google Drive file ID, not by folder path.

Scope guard:

If direct Google Drive auth/file access is not already wired, do not build a full OAuth architecture as a side quest. Stop and report that Drive auth is a separate task.
