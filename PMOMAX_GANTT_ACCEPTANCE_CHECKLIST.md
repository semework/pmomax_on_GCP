# PMOMax Gantt Canonical v4.5+ — Repro Steps & Acceptance Checklist

## 1. Layout Contract
- [ ] Gantt always renders visibly (never empty if valid input)
- [ ] Toolbar appears above chart, never below or detached
- [ ] Toolbar has id: `#gantt-controls`, chart has id: `#gantt-fig`

## 2. Inputs & Validation
- [ ] Gantt consumes normalized `GanttTask[]` (id, name, start, end, owner, kind, deps, ...)
- [ ] If tasks < 8: UI error shown, no chart rendered
- [ ] If tasks > 32: truncated to 32, warning shown
- [ ] If any task missing/invalid start/end: UI error shown
- [ ] Dependency parsing: string like "d-2,d-4" → ["d-2","d-4"]

## 3. Presets & Styles
- [ ] 10 canonical presets available (see `lib/ganttPresets.ts`)
- [ ] Style select replaces full preset, scheme select recolors only

## 4. Toolbar Controls
- [ ] Controls in exact order: Style, Scheme, Labels, Grid, Today, Arrows, Weekends, Critical Path, PNG, JPEG, SVG, Bar Height, Background Mode
- [ ] All controls work and persist to localStorage as required

## 5. Rendering & Geometry
- [ ] Bars always visible for valid tasks
- [ ] 10 bar types render as specified (pill, sharp, rounded, outline, striped, gradient, bevel, bracket, minimal, split)
- [ ] Connectors/arrows render per preset and toggle
- [ ] Critical path bars/connectors are solid red (#D32F2F) when enabled
- [ ] Weekends, today, grid, and ticks render per toggles/preset
- [ ] Chart is responsive and performance-safe up to 32 tasks

## 6. Exports
- [ ] PNG, JPEG, SVG export buttons work
- [ ] Exports always include correct background and match on-screen chart
- [ ] SVG export always includes a <rect> background
- [ ] Export failures show a small UI error

## 7. Data Validation (PDF Test)
- [ ] Using the PDF’s page 5 tasks table, all 8 tasks render with correct dates, dependencies, and critical path

## 8. Performance
- [ ] Rendering is debounced and never freezes UI (even with 32 tasks)
- [ ] If rendering >250ms, warning is shown

---

### How to Reproduce
1. Load or paste PID content with a valid Work Breakdown / Tasks table (8+ tasks, with start/end, deps)
2. Confirm Gantt renders, toolbar is above chart, and all controls work
3. Try all 10 styles and schemes; confirm geometry and color changes
4. Toggle all toolbar options and confirm correct chart updates
5. Enable critical path; confirm red bars/connectors and legend
6. Export as PNG, JPEG, SVG; confirm output matches chart and includes background
7. Test with <8 and >32 tasks to confirm error/warning UI
8. Test with missing/invalid dates to confirm error UI
9. Confirm performance is smooth and no UI freeze

---

If all boxes are checked, the implementation is canonically correct.
