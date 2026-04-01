# AGENTS.md

## Purpose
This repository is a clean rebuild of the PF2E Spelljammer Ships module for Foundry VTT.

Use this file as the working implementation guide for Codex and other coding agents.
For broader design intent, see `docs/REBUILD_DESIGN_INTENT.md`.

## Project Identity
- Repo: `p1ng3r/pf2e-spelljammer-ships-rebuild`
- Module ID: `pf2e-spelljammer-ships-rebuild`
- Platform: Foundry VTT module for PF2E
- Goal: rebuild the module from a clean, simple, extensible foundation

## Hard Rules
- Treat old combat/state code as archived reference only unless the user explicitly asks to salvage from it.
- Do not recreate old planner/support-window complexity unless explicitly requested.
- Prefer simple, explicit, readable state over clever abstractions.
- Keep travel and combat tied to one shared ship state model.
- Challenge complexity early. If a design adds bookkeeping, edge cases, or hidden state, prefer the simpler alternative.
- Build the smallest stable vertical slice first.

## Current Build Order
Implement in this order unless the user explicitly changes priorities:
1. clean core constants/config
2. module API shell on `game`
3. clean ship state shell
4. basic Ship Management App shell
5. verify clean Foundry load
6. voyage systems
7. combat systems
8. deeper progression/content systems

## Architecture Guidance
- Keep modules/files small and focused.
- Split files before they grow too large; target roughly 1000 lines or less.
- Prefer explicit functions and data flow over large generic managers.
- Avoid premature abstraction.
- Avoid storing duplicate derived state unless there is a strong runtime reason.
- Keep permanent ship data separate from mutable live ship state.
- Design hulls, upgrades, travel, and combat so they can expand later without rewrites.

## User Preferences For Code Responses
- When rewriting files, provide full rewritten files.
- Group output by file path.
- Keep changes scoped and deliberate.
- Do not update more files than necessary in one pass.
- When a pass is complete, include practical test steps.

## Foundry / PF2E Guidance
- Prefer current Foundry VTT patterns compatible with modern Foundry versions.
- Prefer current PF2E-friendly patterns where relevant.
- Avoid deprecated Foundry APIs when practical.
- Keep the module load clean before adding heavy mechanics.
- Build UI and app shells that are stable and readable before layering in advanced behavior.

## Design Guardrails
### Core Fantasy
The ship should feel like:
- a shared character
- a mobile home base
- a war machine if built that way
- a business/cargo vessel if built that way

### Pillars
The module has three pillars:
1. Ship Core
2. Voyage
3. Combat

### Travel Term
- Use `Arcflight` as the current default travel term.

### Station Roster
Use this universal station roster unless the user explicitly changes it:
- Captain
- Sightmaster
- Arcpilot
- Armsmaster
- Crew Chief
- Arc Trimmer
- Containment Officer
- Aetherwright

Do not merge station roles on smaller ships.
Smaller ships stay simpler through staffing profiles and NPC coverage, not different station rules.

### Station Rules
- A PC occupies one station at a time in combat and in travel.
- NPC crew can fill empty stations at reduced effectiveness.
- Station identity must stay distinct.
- Default model: 3 core actions per station plus unlockable advanced actions.
- Every station should have a useful fallback action.

### Combat Direction
Combat should be:
- fast
- cinematic
- tactical
- teamwork-driven

Emphasize:
- positioning and range
- firing arcs
- command support
- power routing
- engine strain

Avoid heavy bookkeeping and unnecessary subsystem sprawl.

### Voyage Direction
Travel should:
- be measured in days
- use sector hexes
- use spell engine tier to determine days per hex
- include meaningful but manageable pressure from wear, encounters, fuel/power, fatigue, supplies, navigation risk, faction/legal trouble, and space hazards

Keep voyage meaningful without turning it into constant punishment or accounting work.

### Cargo / Reputation
- Cargo starts simple and slot-based.
- Reputation matters, but deeper reputation systems can come after the first stable playable version.
- Avoid building a detailed trade simulator early.

## Modifier / Resolution Guidance
- Future action systems should use PF2E-style degree-of-success logic.
- Default assumptions:
  - critical success = nat 20 upgrade or 10 over DC
  - success = meet/exceed DC
  - failure = below DC
  - critical failure = nat 1 downgrade or 10 under DC
- Prefer a readable modifier language that can scale cleanly with upgrades and station actions.
- Avoid bonus-rule chaos.

## First Stable Playable Version
Must include:
- clean ship state shell
- station framework
- voyage/travel system
- crew stations
- strong flowing UI shell
- clean Foundry load and app shell

Safe to defer:
- deeper reputation systems
- deeper cargo systems
- advanced economic play
- large event catalogs
- advanced combat subsystems beyond the core loop
- boarding and other secondary systems

## When Unsure
If several options are possible, choose the one that:
- reduces bookkeeping
- preserves clear station identity
- keeps the system readable at the table
- supports long-term content growth
- avoids recreating the complexity of the old implementation
