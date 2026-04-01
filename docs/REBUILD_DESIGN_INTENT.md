# PF2E Spelljammer Ships Rebuild — Design Intent

## Purpose
This document preserves the original rebuild intent for the PF2E Spelljammer Ships module and acts as the design anchor for future implementation.

## Project Reset
- This is a clean rebuild.
- Old work is archived reference only unless explicitly salvaged.
- The new repo is the source of truth.
- Module id: `pf2e-spelljammer-ships-rebuild`

## Core Philosophy
- Keep architecture simple, explicit, and readable.
- Avoid hidden state and unnecessary planner/support-window complexity.
- Build a strong foundation before advanced mechanics.
- Use PF2E-style degree-of-success logic for future action systems.
- Challenge bad complexity early.
- Prefer a smallest stable vertical slice first.

## Module Pillars
### Ship Core
Defines hull identity, levels, stats, stations, upgrade slots, resources, persistent state, and derived values.

### Voyage
Covers Arcflight travel, hex movement, day-based progress, maintenance pressure, encounter pressure, route risk, anomalies, and crew contribution during travel.

### Combat
Covers station-based actions, teamwork-driven ship combat, positioning, range, firing arcs, command support, power routing, strain, and flowing cinematic turns.

## Core Fantasy
The ship should feel like:
- a shared character
- a mobile home base
- a war machine if built that way
- a business / cargo vessel if built that way

The experience should emphasize:
- heroic crew teamwork
- tactical choices
- fun first
- light ship management during combat
- exploration and travel danger during voyages

## Scope Priorities
### First Stable Playable Version
- clean ship state shell
- station framework
- voyage / travel system
- crew stations
- strong flowing UI shell
- clean Foundry load and app shell

### Safe to Defer
- deeper reputation systems
- deeper cargo systems
- advanced economy
- large event catalogs
- advanced combat subsystems
- boarding and other secondary systems

## Complexity Guardrails
Push back against:
- too much simulation
- too much bookkeeping
- too many overlapping bonus rules
- too much UI complexity before system clarity

Allowed to be somewhat crunchy:
- travel decisions
- route pressure
- engine and movement tradeoffs
- station synergy

Should stay lightweight:
- routine bookkeeping
- cargo handling
- upkeep tracking
- install/remove flows
- basic state review in UI

## Ship Identity Direction
- Hulls should have clear base identities.
- Hulls should be moderately distinct.
- Upgrades should do much of the specialization work.
- Higher-level ships should feel like evolved versions of themselves, not completely different vessels.

## Combat Direction
- Combat should be fast, cinematic, tactical, and teamwork-driven.
- Emphasize:
  - positioning / range
  - firing arcs
  - command support
  - power routing
  - engine strain
- Mixed win conditions are preferred over pure damage racing.
- Shared ship AP or similar resource may exist, but should not become oppressive bookkeeping.
- Stations should use 3 core actions plus unlockable advanced options.
- Every station should have a useful fallback action.

## Voyage Direction
- Travel is measured in days.
- The map uses sector hexes.
- Spell engine tier determines days to cross a hex.
- Voyage pressure should come from a hybrid of:
  - maintenance wear
  - hostile encounters
  - fuel / power use
  - crew fatigue
  - supply shortages
  - navigation risk
  - legal / faction trouble
  - the unknown dangers of space
- Maintenance should matter without becoming constant punishment.
- Encounter generation should be a hybrid influenced by route danger and player choices.

## Cargo and Reputation
### Cargo
- Start simple.
- Use slot-based cargo tracking.
- Cargo should support profit, missions, risk, encounters, and faction play.
- Avoid a detailed trade simulator in the initial implementation.

### Reputation
- Important, but can come after the first stable playable version.
- Should be moderately granular.
- Should affect prices, docking access, jobs, inspections, aid, and black market access.

## Universal Station Rule
- All ships use the same station roster.
- Do not merge station roles on smaller ships.
- Smaller ships stay simpler through staffing profiles and NPC coverage, not different station rules.
- NPC crew can fill gaps at reduced effectiveness.
- A PC occupies only one station at a time in combat and travel.

## Locked Station Roster
- Captain
- Sightmaster
- Arcpilot
- Armsmaster
- Crew Chief
- Arc Trimmer
- Containment Officer
- Aetherwright

## Station Identity Summary
- Captain — coordinates the crew and sets tempo
- Sightmaster — detects danger and exposes opportunity
- Arcpilot — controls position and maneuver
- Armsmaster — turns openings into damage
- Crew Chief — keeps the crew efficient under pressure
- Arc Trimmer — improves movement execution and handling
- Containment Officer — stops damage from cascading into disaster
- Aetherwright — controls power, strain, and arcane ship systems

## Naming Direction
- Travel term: Arcflight
- Station names should feel distinct and in-world, with a spellpunk / fantasy-space tone.
- Rules text should be flavorful but readable.

## Implementation Order
1. clean core constants/config
2. module API shell on `game`
3. clean ship state shell
4. basic Ship Management App shell
5. verify clean Foundry load
6. expand voyage systems
7. expand combat systems
8. expand deeper progression/content systems

## Future Design Rule
When facing a design decision, prefer the option that:
- keeps rules readable
- reduces bookkeeping
- preserves clear station identity
- supports long-term upgrade/content growth
- keeps travel and combat connected to one shared ship state
