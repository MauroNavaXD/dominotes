# Implementation Plan — Auto end date on completion + per-task change history log

Worktree root (use absolute paths; never the parent repo):
`/Users/mau/Repositories/xaldigital/voi/capacitacion-kiro/dominotes/frontend/.worktrees/task-enddate-history`

All commands below run from that worktree root.

## Design decisions (made here, grounded in the current code)

- **Where the side effects live.** `TaskDbService.update` already builds `updated = { ...current, ...changes }` and is the single write path for edits. Both the auto-endDate behavior and the log diffing go there, so the UI never has to reason about them. `home.ts` keeps calling `this.db.update(task.id, { ... })` unchanged. Rationale: centralizing avoids duplicated/inconsistent logic across the three `update*` methods in `home.ts`.
- **Local date, not UTC.** `endDate` must match the `<input type="date">` value format (`YYYY-MM-DD`) and the user's local day. `toISOString()` is UTC and can roll a day, so a dedicated `localDateString(date)` helper builds the string from `getFullYear/getMonth/getDate`. Rationale: the task explicitly forbids `toISOString` for "today".
- **Explicit-endDate precedence.** In `update`, if `changes.status === 'done'` and `changes.endDate` is NOT part of `changes`, auto-set `endDate` to today; if the caller passed `endDate` explicitly alongside the status, respect the caller's value. If `changes.status` is present and not `'done'`, force `endDate = null`. Rationale: matches "set automatically on completion, cleared on any non-done status" while leaving a door for explicit values.
- **Log ordering.** Stored chronologically (append to the end). UI renders newest-first by iterating a reversed copy. Rationale: storage stays append-only and simple; display matches the newest-first convention already used for the task list.
- **Missing `log` is `[]`.** Existing IndexedDB records predate the field. Every read path (`update` diff base, UI render) coalesces `current.log ?? []`. Rationale: no DB_VERSION bump, no migration, no crash on old records.
- **History UI = expandable panel below the row**, toggled by a signal `openLogTaskId` holding the open task id (or null). Rationale: a full-row expansion row (`<tr>` with `colspan`) fits the existing table without introducing a dialog/overlay system or new styling primitives; close affordance is the same toggle button plus a close button in the panel.

## Items

- [ ] 1. Extend the model in `src/app/models/task.ts`.
      Add `export interface TaskLogEntry { timestamp: string; message: string }` (timestamp = ISO string). Add `log: TaskLogEntry[]` to `Task` (document it as the chronological change history). Leave `TaskStatus`, `TASK_STATUSES`, `TASK_STATUS_LABELS` unchanged.
      Files: `src/app/models/task.ts`
      Verify: `npm run build` compiles with no type errors (this item alone will surface a compile error in `task-db.service.ts` where `create` builds a `Task` without `log` — that is fixed in item 2, so run the full build after item 2).

- [ ] 2. Implement helper + create-time log in `TaskDbService` (`src/app/services/task-db.service.ts`).
      Import `TaskLogEntry`, `TASK_STATUS_LABELS` from `../models/task`. Add a private helper `private localDateString(date: Date): string` that returns `YYYY-MM-DD` from local `getFullYear()`, `getMonth()+1` (zero-padded), `getDate()` (zero-padded) — NOT `toISOString`. Add a small private `logEntry(message: string): TaskLogEntry` returning `{ timestamp: new Date().toISOString(), message }`. In `create`, initialize `log: [this.logEntry('Tarea creada')]` on the new task object.
      Files: `src/app/services/task-db.service.ts`
      Verify: `npm run build` passes with no errors; by reading the code confirm `localDateString` uses local getters and zero-pads month/day, and `create` seeds the `'Tarea creada'` entry.

- [ ] 3. Implement the diff/log/endDate side effects in `TaskDbService.update`.
      Rework `update(id, changes)` so that, after finding `current`:
      1. Start from `const entries: TaskLogEntry[] = [];` and a mutable copy of `changes` for the endDate side effect: `const effective = { ...changes };`.
      2. **Title**: if `changes.title !== undefined && changes.title !== current.title`, push `` `Título cambiado a "${changes.title}"` ``.
      3. **Status**: if `changes.status !== undefined && changes.status !== current.status`, push `` `Estado cambiado a ${TASK_STATUS_LABELS[changes.status]}` ``.
      4. **Auto endDate from status** (only when `changes.status !== undefined`):
         - If `changes.status === 'done'` and `!('endDate' in changes)`: set `effective.endDate = this.localDateString(new Date())` and push `` `Fecha fin establecida automáticamente a ${effective.endDate}` ``.
         - If `changes.status !== 'done'` and the current `endDate` is not already null: set `effective.endDate = null` and push `'Fecha fin limpiada automáticamente'`.
      5. **Manual endDate** (only when `'endDate' in changes` AND status did NOT drive it — i.e. `changes.status === undefined`): compare `changes.endDate` to `current.endDate`; if changed, push `` `Fecha fin cambiada a ${changes.endDate}` `` when truthy, else `'Fecha fin eliminada'`.
      6. Build `updated: Task = { ...current, ...effective, log: [...(current.log ?? []), ...entries] }`.
      7. Keep the existing `store.put(updated)` and signal update.
      Note the ordering guard in step 5 (`changes.status === undefined`) prevents double-logging the endDate when a status change already produced the automatic entry.
      Files: `src/app/services/task-db.service.ts`
      Verify: `npm run build` passes; by reading the code confirm: (a) setting status to `done` without an explicit endDate yields today's local `YYYY-MM-DD` plus the "establecida automáticamente" entry; (b) setting status to a non-done value sets `endDate = null` plus "limpiada automáticamente" (only if it wasn't already null); (c) a manual endDate change (no status in `changes`) logs "cambiada a"/"eliminada" and is not double-logged; (d) `current.log ?? []` is used as the base so old records don't crash.

- [ ] 4. Add the history toggle state + helpers in `src/app/pages/home/home.ts`.
      Import `TaskLogEntry` from the model. Add `protected readonly openLogTaskId = signal<string | null>(null);`. Add `protected toggleLog(task: Task): void` that sets the signal to `task.id` if currently different, else `null`. Add `protected closeLog(): void { this.openLogTaskId.set(null); }`. Add `protected logEntriesNewestFirst(task: Task): TaskLogEntry[] { return [...(task.log ?? [])].reverse(); }`. Add `protected formatLogTimestamp(iso: string): string` returning a localized `es-MX` date+time (e.g. `toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })`). Leave existing `update*` methods untouched — they already route through `db.update`.
      Files: `src/app/pages/home/home.ts`
      Verify: `npm run build` passes; by reading the code confirm the signal defaults to `null`, `toggleLog` flips open/closed for the same id, and `logEntriesNewestFirst` reverses a copy (does not mutate `task.log`).

- [ ] 5. Add the history button + expandable log panel in `src/app/pages/home/home.html`.
      In the task-row actions `<td>` (the one holding the ✕ delete button), add a history button BEFORE the delete button: `type="button"`, `(click)="toggleLog(task)"`, `aria-label="Ver historial de la tarea"`, `title="Historial"`, slate styling matching the delete button (`rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700`), label a clock glyph `🕑` (or text `Log`). Immediately after the task `<tr>`, add a conditional expansion row inside the same `@for`:
      ```
      @if (openLogTaskId() === task.id) {
        <tr class="bg-slate-50/80">
          <td colspan="5" class="px-4 py-3">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Historial</h3>
              <button type="button" (click)="closeLog()" aria-label="Cerrar historial" class="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>
            @for (entry of logEntriesNewestFirst(task); track entry.timestamp) {
              <div class="flex gap-3 py-1 text-sm">
                <span class="w-40 shrink-0 text-slate-400">{{ formatLogTimestamp(entry.timestamp) }}</span>
                <span class="text-slate-700">{{ entry.message }}</span>
              </div>
            } @empty {
              <p class="text-sm text-slate-400">Sin cambios registrados.</p>
            }
          </td>
        </tr>
      }
      ```
      Keep the existing `colspan="5"` empty-state row and the 5-column header consistent (no new column added — the button lives in the existing actions column, so column count stays 5).
      Files: `src/app/pages/home/home.html`
      Verify: `npm run build` passes (Angular template type-checking covers the new bindings); by reading the markup confirm the history button has `type="button"` and an `aria-label`, the panel uses `colspan="5"`, renders newest-first via `logEntriesNewestFirst`, and offers a close button.

## Verification (final, whole-task)

1. From the worktree root run the production build:
   `npm run build`
   Expected: completes with no TypeScript or Angular template errors (exit 0). This is the authoritative gate — it type-checks the model, service, component, and template together.
2. Read-the-code logic checks (no runtime harness exists; `ng test`/vitest has no specs for these modules):
   - `localDateString` builds `YYYY-MM-DD` from LOCAL date parts, zero-padded, and is used for the auto endDate — not `toISOString`.
   - `update`: status→`done` sets today's endDate and logs "establecida automáticamente" (unless `endDate` passed explicitly); status→non-done sets `endDate=null` and logs "limpiada automáticamente" only when it wasn't already null.
   - Manual endDate edits (no status in `changes`) still work and log "cambiada a <fecha>"/"eliminada", with no double-logging when a status change drove the endDate.
   - `create` seeds `log: ['Tarea creada']`; every log read uses `current.log ?? []` / `task.log ?? []`.
   - All new user-facing strings are Spanish; 2-space indent, single quotes, TS strict preserved; `DB_VERSION` unchanged (still `1`).
   - History UI: button has `type` + `aria-label`, panel toggles via `openLogTaskId`, shows newest-first, has a close affordance, keeps the table at 5 columns.

## Verification note (evidence)

Ran `npm run build` (= `ng build`) from the worktree root on 2026-10-15. Result: SUCCESS, exit 0, no TypeScript or Angular template errors. Output:

```
Application bundle generation complete. [0.718 seconds]
Output location: .../.worktrees/task-enddate-history/dist/frontend
main-*.js  264.13 kB (70.53 kB transfer)
```

Read-the-code checks confirmed:
- `localDateString` builds `YYYY-MM-DD` from local `getFullYear/getMonth+1/getDate`, zero-padded; used for the auto endDate (no `toISOString`).
- `update`: status→`done` without explicit `endDate` sets today's local date and logs "establecida automáticamente"; status→non-done sets `endDate=null` and logs "limpiada automáticamente" only when it wasn't already null; manual endDate (no status) logs "cambiada a"/"eliminada" with no double-logging.
- `create` seeds `log: ['Tarea creada']`; all log reads coalesce `?? []`; `DB_VERSION` unchanged (still `1`).
- History UI: per-row button (`type=button`, `aria-label`), expandable `colspan="5"` panel, newest-first, close button; table stays at 5 columns.

## Notes / assumptions

- No `ng test` specs cover these modules and the task's stated gate is the production build, so verification is `npm run build` plus the read-the-code checks above. If a reviewer wants runtime coverage, a follow-up could add vitest specs for `TaskDbService.update`, but that is out of scope here.
- `track entry.timestamp` assumes timestamps are distinct per entry; since entries are appended one change at a time with `new Date().toISOString()`, collisions are not a practical concern for this local-first UI.
