# BUILD_PROGRESS

## Project Status
Active rebuild in progress. Arcflight now has a small user-facing control slice in the Ship Management app while remaining intentionally lightweight.

## Current Branch Focus
Deliver the next Arcflight travel-task UX polish slice by defaulting Attempt Check attribution inputs from recommendation metadata while preserving manual override.

## Completed So Far
- Foundation constants/config added.
- Module API shell attached to `game`.
- Shared ship-state foundation added and refined.
- Ship Management App shell added and corrected to render reliably.
- PF2E vehicle actor integration added.
- Ship Management header button added for PF2E vehicle actors.
- Station ids normalized to consistent kebab-case where needed.
- Actor context display improved in Ship Management.
- Invalid actor launch now fails gracefully.
- Arcflight travel scaffold added to the shared ship state.
- Travel API helpers added: read, update, and advance-day.
- Ship Management now shows a minimal Arcflight Travel section.
- Ship Management now includes Arcflight travel controls:
  - **Advance Day** button wired to shared travel day progression.
  - **Posture selector** with placeholder options (`cautious`, `standard`, `hard-push`, `silent-running`).
  - Current posture display in the app travel controls.
- Arcflight route-leg placeholder slice added:
  - Travel state now includes `legDistance` and `legProgressMax` fields for current-leg targeting.
  - Lightweight travel helpers added for destination and leg editing (`setTravelDestination`, `setTravelLeg`).
  - Ship Management now has a compact **Route / Destination** form to edit destination + leg target values.
  - Ship Management shows explicit current-leg progress vs target and a simple **Leg Complete** indicator.
- Arcflight compact UX + route reset pass added:
  - Ship Management app content now uses a dedicated scrollable body region so larger content stays usable in a fixed window.
  - Ship metadata and travel readouts are grouped into denser grid summaries to reduce vertical sprawl.
  - Travel controls and route form spacing were tightened for a compact table-facing layout.
  - Added a lightweight **Reset Leg Progress** action that resets placeholder current-leg progress (`legProgress`) and day count (`daysIntoCurrentLeg`) without auto-advancing destination/arrival.
- Arcflight maintenance placeholder pass added:
  - Shared Arcflight travel state now includes a lightweight `maintenanceIssues` list for explicit issue tracking.
  - Added minimal maintenance helpers in shared state/API: `getMaintenanceIssues`, `addMaintenanceIssue`, and `resolveMaintenanceIssue`.
  - Ship Management now includes a compact **Maintenance** section with:
    - open-issue count
    - minimal manual add control (title + severity)
    - per-issue resolve action
  - Day advancement behavior remains deterministic and lightweight; no random maintenance generation added yet.
- Arcflight crew-check scaffold pass added:
  - Shared Arcflight travel state now includes a lightweight `travelTasks` list for manual task tracking.
  - Travel task and maintenance issue records now support future check metadata:
    - `taskType`
    - `checkType`
    - `recommendedStation`
    - `recommendedSkill`
    - `notes` / `summary`
  - Added small state/API helpers for the scaffold direction:
    - `getTravelTasks`
    - `addTravelTask`
    - `updateMaintenanceIssue`
    - `setMaintenanceIssueTask`
  - Ship Management now shows a compact **Travel Tasks / Maintenance Tasks** readout:
    - manual travel task add form
    - manual maintenance issue add form with optional station/skill/task fields
    - open-item rows display recommended station + skill for table adjudication
- Arcflight crew-check polish pass added:
  - Travel task and maintenance issue forms now use compact select controls for:
    - task type
    - check type
    - recommended station (locked rebuild roster)
    - recommended skill (PF2E core skills)
  - Optional minimal custom-skill text fields were added for unusual future cases.
  - Shared-state normalization now stores stable ids/slugs:
    - `recommendedStation` stores station id (`captain`, `aetherwright`, etc.)
    - `recommendedSkill` stores lowercase PF2E skill slug (or custom lowercase slug text)
  - In-app list display now resolves readable labels from stable stored values.
- Arcflight travel-task attempt/resolve scaffold pass added:
  - Travel tasks now support a lightweight status flow: `open` -> `attempted` -> `resolved`.
  - Travel tasks now support lightweight attempt/result fields:
    - `lastAttemptSummary`
    - `attemptedByStation`
    - `attemptedSkill`
    - `resultSummary`
  - Added explicit travel-task API helpers in shared state/API:
    - `updateTravelTask(taskId, taskPatch, options?)`
    - `attemptTravelTask(taskId, attemptPatch, options?)`
    - `resolveTravelTask(taskId, options?)`
  - Ship Management now includes compact per-task actions:
    - **Attempt Check** (manual placeholder write)
    - **Resolve** (manual completion)
    - inline attempt/result summary input
  - Maintenance issue resolution flow remains unchanged and separate from travel-task completion flow.
- Arcflight travel-task UX pass added:
  - Ship Management inline actions now preserve scroll position across forced rerenders (instead of jumping to the top of the scroll body).
  - A shared app rerender helper now captures/restores `.ship-management-body` scroll state for current inline action handlers.
  - Travel task rows now include compact manual Attempt Check attribution inputs for:
    - attempted-by station (locked station roster ids)
    - attempted skill (PF2E core skill slugs)
  - Attempt Check now records:
    - `attemptedByStation`
    - `attemptedSkill`
    - `lastAttemptSummary`
  - Travel task rows now display readable attempted-by station/skill labels while persisting stable ids/slugs.

## Tested in Foundry
Confirmed in prior implementation passes:
- Module loads.
- API is available on `game.pf2eSpelljammerShipsRebuild`.
- Ship Management app opens.
- Vehicle actor integration works for **Courier Sloop Test Ship**.
- Invalid actor launch returns `null` and shows a user-facing error instead of breaking flow.

This pass is a light vertical slice and is ready for in-Foundry validation of:
- `state.setTravelDestination(...)` writes destination placeholder values.
- `state.setTravelLeg(...)` writes route-leg target values.
- `state.advanceTravelDay()` continues incrementing leg progress.
- Route status in-app flips to **Leg Complete** when `legProgress >= legProgressMax`.
- `Reset Leg Progress` in-app action zeroes `legProgress` and `daysIntoCurrentLeg` while keeping destination and leg target values intact.
- `state.addMaintenanceIssue(...)` appends a simple open maintenance issue (`id`, `title`, `severity`, `status`, `source`) to Arcflight shared state.
- `state.getMaintenanceIssues()` returns currently open maintenance issues.
- `state.resolveMaintenanceIssue(issueId)` removes/resolves a selected issue from the list.
- In-app Maintenance controls support manual issue creation and one-click issue resolution.
- `state.addTravelTask(...)` appends a simple open travel task to Arcflight shared state.
- `state.getTravelTasks()` returns currently open travel tasks.
- `state.setMaintenanceIssueTask(issueId, taskPatch)` updates only task/check recommendation metadata for an issue.
- In-app task controls support manual station/skill recommendations while issue resolution remains manual.
- Travel Task and Maintenance Issue forms accept recommended station/skill/task/check values through select controls instead of free text.
- Added tasks/issues persist stable station ids and skill slugs in shared state while displaying readable labels in the app.
- `state.attemptTravelTask(taskId, { lastAttemptSummary })` marks a task `attempted` and records a lightweight manual summary.
- `state.resolveTravelTask(taskId)` marks a task `resolved`.
- In-app travel task rows support compact manual **Attempt Check** and **Resolve** actions without roll/DC automation.
- In-app inline actions (**Attempt Check**, **Resolve**, **Reset Leg Progress**, **Advance Day**) keep Ship Management scroll position stable after rerender.
  - `state.attemptTravelTask(taskId, { attemptedByStation, attemptedSkill, lastAttemptSummary })` persists attempt attribution metadata with stable station ids and PF2E skill slugs.
- Arcflight travel-task Attempt Check defaulting polish pass added:
  - Ship Management now centralizes Attempt Check input defaults in app view-model prep:
    - attempted station/skill is used first when already set
    - recommended station/skill is used as default only when attempted values are empty
  - Travel-task rows now hydrate Attempt Check select inputs from those effective values, reducing duplicate GM data entry in the common case.
  - Manual override behavior is unchanged: GM can still change attempted station/skill before clicking **Attempt Check**.
  - Rerender behavior remains stable: selected attempted values continue to display correctly after inline actions, and scroll preservation remains unchanged.

## Current State of the Module
- Arcflight uses a single shared-state travel model.
- Travel day advancement still uses placeholder progress/pressure behavior.
- Maintenance pressure remains a separate placeholder value from explicit maintenance issue entries.
- Travel and maintenance records now carry lightweight crew-check recommendation metadata only (no automated rolling).
- Crew-check recommendation entry is now select-driven for cleaner GM data entry and reduced typo cleanup.
- Travel tasks now also support lightweight manual attempt/result tracking with explicit status progression.
- Travel-task manual Attempt Check now captures who attempted a check (station + skill) in compact row-level controls.
- Travel-task Attempt Check attribution now defaults from recommended station/skill when attempted values are unset, while preserving the state distinction between recommendation and actual attempt metadata.
- Travel posture supports simple state changes via app control.
- Route logic is placeholder-level only (destination + simple leg target fields).
- Travel tasks and maintenance issues are manual placeholders only (no procedural generation yet).
- No travel randomization or encounter tables yet.
- No real combat mechanics yet.
- No upgrades/cargo/reputation systems yet.

## Next Recommended Pass
Keep Arcflight focused and incremental:
- table-test whether select-driven station/skill/task/check fields are sufficient for GM adjudication before adding check execution helpers
- table-test whether open/attempted/resolved status flow is sufficient before adding archive/history UX
- continue deferring automation-heavy subsystems (rolling, event generation, deep maintenance simulation)

## Known Issues / Cleanup
- Decide whether sector naming should use `currentSector` in parallel with `currentHex` or stay hex-only for now.
- Keep pressure fields as placeholders until core travel loop behavior is table-tested.
- Decide later whether resolved issues should be archived instead of removed after the first playable validation loop.
- Decide later whether resolved travel tasks should be shown via a compact archive toggle.
- Keep app UX intentionally lightweight until travel loop behavior is validated.

## Pass History
- **Foundation shell pass**: module scaffolding, constants/config, and initial API surface.
- **Render reliability pass**: Ship Management app rendering fix.
- **State/API refinement pass**: shared ship-state and API cleanup.
- **Vehicle integration pass**: PF2E vehicle actor hook-up and launch path.
- **Polish pass**: station id normalization, actor context display improvements, graceful invalid actor handling.
- **Arcflight scaffold pass**: minimal travel state model, travel API helpers, and Ship Management travel readout.
- **Arcflight controls pass**: in-app Advance Day and posture controls wired through shared API/state.
- **Arcflight route-leg placeholder pass**: destination/leg editing plus leg-complete status in Ship Management.
- **Arcflight compact UX pass**: scroll-friendly app body, denser travel summary layout, and in-app Reset Leg Progress action.
- **Arcflight maintenance placeholder pass**: shared maintenance issue list + simple API helpers + compact Ship Management maintenance controls.
- **Arcflight crew-check scaffold pass**: travel task list + maintenance task metadata + compact station/skill guidance readout in Ship Management.
- **Arcflight crew-check polish pass**: compact select controls for station/skill/task/check metadata with stable station-id and skill-slug storage.
- **Arcflight travel-task attempt/resolve scaffold pass**: manual travel-task Attempt Check + Resolve controls with lightweight attempted-status tracking.
- **Arcflight travel-task UX pass**: scroll-position preservation for inline rerenders plus compact attempted-by station/skill capture in Attempt Check flow.
