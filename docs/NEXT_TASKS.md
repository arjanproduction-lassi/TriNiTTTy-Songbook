# Next Tasks

Date saved: 2026-04-30

Status: not started. Use this as the first task when work resumes.

## Next Task: Google Drive Canonical File Memory + True A4 Print/PDF Fix

Rules:

- Do not add unrelated features.
- Do not redesign UI.
- Do not refactor broadly.
- Do not change song/setlist logic unless required by the task.
- Preserve A4 preview as the only visual truth.
- Keep transpose, zoom and local reading/practice state device-local only.

## Part A: Google Drive Save/Load Memory

Goal:

Use one user-chosen Google Drive JSON file as the interim canonical storage file.

Important rule:

- Do not use a folder path string as the canonical identity.
- Use the chosen Google Drive file ID as the stable identity.

Required behavior:

1. Let the user choose a Google Drive JSON file once.
2. Store locally:
   - `driveFileId`
   - `driveFileName`
   - optional parent/display path only for UI
3. On next app start, use the remembered `driveFileId` for Load from Drive / Save to Drive.
4. Show the remembered file in UI, for example: `Drive file: trinittty-songbook.json`.
5. Allow `Change Drive file` explicitly.
6. Admin flow only:
   - Load from Drive
   - Save to Drive
   - Remember selected file for next use
7. Do not build real-time multi-user sync.
8. Do not treat Google Drive as a live database.
9. Keep transpose / zoom / local reading state device-local only.

Definition of done for Part A:

1. User can choose one Drive JSON file and the app remembers it by file ID.
2. Load from Drive / Save to Drive reuse that remembered file.
3. Remembered file name is visible in the UI.
4. User can explicitly change the Drive file.
5. Canonical song data remains separate from local-only transpose/zoom/reading state.

## Part B: Fix True A4 Print/PDF Mismatch

Problem:

Current PDF print can spill onto 2 A4 pages while the in-app preview looks like 1 page. Last verses can move to a second page. This breaks A4 truth.

Likely cause:

The A4 sheet dimensions are oversized in real print layout, probably because width/height and padding are combined without `box-sizing: border-box`.

Example problem:

- `width: 210mm`
- `min-height: 297mm`
- `padding: 10mm`
- without `box-sizing: border-box`

That makes the real printed box larger than A4:

- `210mm + left/right padding`
- `297mm + top/bottom padding`

Required fix order:

1. Fix the real print surface dimensions first.
2. Use the same canonical A4 renderer for preview and print.
3. Only if needed after that, add an explicit optional `Fit for print/PDF` control.
4. Do not add hidden print-only reflow logic.
5. Do not silently shrink only in PDF.

Concrete implementation guidance:

### A4 Page Box Model

For the main printable A4 sheet element, ensure:

```tsx
style={{
  width: "210mm",
  minHeight: "297mm",
  boxSizing: "border-box",
  padding: "10mm",
  maxWidth: "100%",
  fontFamily: '"Courier New", "Liberation Mono", monospace',
}}
```

### Print Surface Class

Add a dedicated print surface class, for example:

```tsx
className="a4-print-surface"
```

### Print CSS

Add or verify:

```css
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  html,
  body {
    margin: 0;
    padding: 0;
    background: white;
  }

  body * {
    visibility: hidden;
  }

  .print-root,
  .print-root * {
    visibility: visible;
  }

  .print-root {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 0;
    background: white;
  }

  .a4-print-surface {
    width: 210mm !important;
    min-height: 297mm !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 10mm !important;
    box-shadow: none !important;
    border: 0 !important;
    overflow: hidden;
    background: white !important;
  }
}
```

### Print Leakage Check

Ensure outer preview wrappers do not leak into print:

- no scroll container
- no rounded frame
- no gray background
- no app controls
- no parent padding
- no default browser margins
- no shadow/border
- no transform/scale in print mode

Only the real A4 surface should print.

### Preserve Multi-Column Layout

Inside the A4 surface keep:

- `columns: 2`
- `column-gap: 10mm`
- `break-inside: avoid` on sections

These styles must live inside the same canonical A4 component.

Decision rule:

- If songs that already fit in preview now fit in PDF too: done.
- If some songs are genuinely too long: show them as too long, or later add an explicit visible print scale control.
- Do not add hidden print-only shrink logic.

Manual verification set:

- Peniaze neklamú
- Človečina
- Stíchol som / bolesť otcov

Expected result:

If a song fits in the A4 preview, it must fit in Chrome Print Preview / Save as PDF on one A4 page too. If not, treat it as an A4 truth defect.

Definition of done for Part B:

1. PDF print no longer spills to a second A4 for songs that already fit in the A4 preview.
2. Print/PDF uses the same A4 truth as preview.
3. App controls do not appear in print.
4. If a song is truly too long, it is either shown as too long or explicitly fit by a visible user-controlled print scale.
5. No silent PDF-only alteration exists.

## Output Wanted After Implementation

When this task is implemented, report:

- pass/fail
- exact files changed
- exact cause of the 2-page PDF issue
- what remains manual for Peter to test
