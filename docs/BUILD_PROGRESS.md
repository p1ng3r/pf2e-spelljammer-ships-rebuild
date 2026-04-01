# BUILD_PROGRESS

## Project Status
Active rebuild in progress. Arcflight now has a small user-facing control slice in the Ship Management app while remaining intentionally lightweight.

## Current Branch Focus
Deliver the first lightweight Arcflight maintenance placeholder pass so upkeep pressure is visible and table-usable without adding simulation complexity.

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

## Current State of the Module
- Arcflight uses a single shared-state travel model.
- Travel day advancement still uses placeholder progress/pressure behavior.
- Maintenance pressure remains a separate placeholder value from explicit maintenance issue entries.
- Travel posture supports simple state changes via app control.
- Route logic is placeholder-level only (destination + simple leg target fields).
- Maintenance issues are manual placeholders only (no procedural generation yet).
- No travel randomization or encounter tables yet.
- No real combat mechanics yet.
- No upgrades/cargo/reputation systems yet.

## Next Recommended Pass
Keep Arcflight focused and incremental:
- table-test whether maintenance issue severity should influence placeholder pressure display (still without deep subsystem rules)
- continue compact readability polish based on live Foundry table testing
- continue deferring navigation engines and route-generation complexity

## Known Issues / Cleanup
- Decide whether sector naming should use `currentSector` in parallel with `currentHex` or stay hex-only for now.
- Keep pressure fields as placeholders until core travel loop behavior is table-tested.
- Decide later whether resolved issues should be archived instead of removed after the first playable validation loop.
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
