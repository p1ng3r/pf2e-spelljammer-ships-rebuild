# BUILD_PROGRESS

## Project Status
Active rebuild in progress. Arcflight now has a small user-facing control slice in the Ship Management app while remaining intentionally lightweight.

## Current Branch Focus
Deliver the next Arcflight vertical slice by adding a lightweight route-leg / destination placeholder flow wired through the shared state/API model.

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

## Current State of the Module
- Arcflight uses a single shared-state travel model.
- Travel day advancement still uses placeholder progress/pressure behavior.
- Travel posture supports simple state changes via app control.
- Route logic is placeholder-level only (destination + simple leg target fields).
- No travel randomization or encounter tables yet.
- No real combat mechanics yet.
- No upgrades/cargo/reputation systems yet.

## Next Recommended Pass
Keep Arcflight focused and incremental:
- add optional one-click reset for current leg progress once table flow is validated
- add minimal travel summary language for table-facing clarity
- continue deferring navigation engines and route-generation complexity

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
- **Arcflight controls pass**: in-app Advance Day and posture controls wired through shared API/state.
- **Arcflight route-leg placeholder pass**: destination/leg editing plus leg-complete status in Ship Management.
