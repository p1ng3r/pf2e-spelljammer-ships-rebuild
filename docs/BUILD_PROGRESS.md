# BUILD_PROGRESS

## Project Status
Active rebuild in progress. The first Arcflight travel scaffold vertical slice is now in place on top of the clean foundation.

## Current Branch Focus
Establish a minimal, shared-state Arcflight travel loop that the Ship Management app can display and the module API can advance one day at a time.

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

## Tested in Foundry
Confirmed in prior implementation passes:
- Module loads.
- API is available on `game.pf2eSpelljammerShipsRebuild`.
- Ship Management app opens.
- Vehicle actor integration works for **Courier Sloop Test Ship**.
- Invalid actor launch returns `null` and shows a user-facing error instead of breaking flow.

This pass is foundation-only and ready for in-Foundry validation of:
- `state.getTravelState()` reads
- `state.updateTravelState(...)` writes
- `state.advanceTravelDay()` daily progression increments
- Travel section rendering in Ship Management

## Current State of the Module
- Arcflight now has a minimal shared-state travel scaffold.
- Travel day advancement updates placeholder progress and pressure values.
- No travel randomization or encounter tables yet.
- No real combat mechanics yet.
- No upgrades/cargo/reputation systems yet.

## Next Recommended Pass
Build the next Arcflight slice while keeping scope tight:
- add a lightweight route leg definition (still placeholder-level)
- add one explicit user action path from the app to advance a day
- begin validating posture/progress effects without adding heavy subsystem bookkeeping

## Known Issues / Cleanup
- Decide whether sector naming should use `currentSector` in parallel with `currentHex` or stay hex-only for now.
- Keep pressure fields as placeholders until core travel loop behavior is table-tested.
- Keep app UX intentionally lightweight until travel loop behavior is validated.

## Pass History
- **Foundation shell pass**: module scaffolding, constants/config, and initial API surface.
- **Render reliability pass**: Ship Management app rendering fix.
- **State/API refinement pass**: shared ship-state and API cleanup.
- **Vehicle integration pass**: PF2E vehicle actor hook-up and launch path.
- **Polish pass**: station id normalization, actor context display improvements, graceful invalid actor handling.
- **Arcflight scaffold pass**: minimal travel state model, travel API helpers, and Ship Management travel readout.
