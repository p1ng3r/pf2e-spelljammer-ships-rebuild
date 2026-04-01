# BUILD_PROGRESS

## Project Status
Active rebuild in progress. The current implementation has completed the initial foundation and actor-integration milestones and is ready to begin the first voyage scaffolding pass.

## Current Branch Focus
Stabilize and document the clean foundation so future passes can safely build Arcflight travel mechanics without reworking core state or app wiring.

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

## Tested in Foundry
Confirmed in prior implementation passes:
- Module loads.
- API is available on `game.pf2eSpelljammerShipsRebuild`.
- Ship Management app opens.
- Vehicle actor integration works for **Courier Sloop Test Ship**.
- Invalid actor launch returns `null` and shows a user-facing error instead of breaking flow.

## Current State of the Module
- No real travel mechanics yet.
- No real combat mechanics yet.
- No upgrades/cargo/reputation systems yet.
- Current focus has been establishing a clean foundation and solid actor integration.

## Next Recommended Pass
Implement the first **Arcflight** travel scaffold as a small vertical slice:
- add minimal travel state fields to the shared ship state
- add a basic travel panel/section in Ship Management
- implement one simple day/hex progress action

Keep scope small and avoid combat work in this pass.

## Known Issues / Cleanup
- Confirm final naming consistency for any remaining station-id references as new travel features are added.
- Keep app UX intentionally lightweight until travel loop behavior is validated.

## Pass History
- **Foundation shell pass**: module scaffolding, constants/config, and initial API surface.
- **Render reliability pass**: Ship Management app rendering fix.
- **State/API refinement pass**: shared ship-state and API cleanup.
- **Vehicle integration pass**: PF2E vehicle actor hook-up and launch path.
- **Polish pass**: station id normalization, actor context display improvements, graceful invalid actor handling.
