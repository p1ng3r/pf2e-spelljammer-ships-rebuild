# PF2E Spelljammer Ships Rebuild — Design Intent

## Purpose
This document is the design anchor for the clean rebuild of the Foundry VTT PF2E ship module. Its purpose is to preserve original intent, prevent scope drift, and provide a stable reference for future implementation decisions.

## Project Reset
- This is a clean rebuild.
- Old work exists only as archived reference unless explicitly salvaged.
- The new repository is the source of truth.
- The new module id is `pf2e-spelljammer-ships-rebuild`.

## Core Philosophy
- Keep architecture simple, explicit, and readable.
- Avoid hidden state and unnecessary planner/support-window complexity.
- Build a strong foundation before adding advanced mechanics.
- Use consistent PF2E-style degree-of-success logic for future action systems.
- Challenge bad complexity early.
- Prefer a smallest stable vertical slice before large content expansion.

## Module Pillars
The module is built around three primary pillars.

### 1. Ship Core
The persistent ship framework that defines:
- hull identity
- level progression
- base stats
- stations
- upgrade slots
- persistent resources
- current ship state
- conditions and derived values

### 2. Voyage
The day-to-day ship gameplay layer that covers:
- Arcflight travel
- hex-based sector movement
- day-based progress
- maintenance pressure
- encounter pressure
- route risk
- exploration and anomalies
- crew contribution during travel

### 3. Combat
The tactical ship combat layer that covers:
- station-based actions
- teamwork-driven combat
- positioning and range
- firing arcs
- command support
- power routing and strain
- flowing, cinematic turns

## Core Fantasy
The ship should feel like:
- a shared character
- a mobile home base
- a war machine if the crew builds it that way
- a business / cargo vessel if the crew builds it that way

The experience should emphasize:
- heroic crew teamwork
- tactical choices
- fun first
- light ship management during combat
- exploration and travel danger during voyages

## Scope Priorities
### First Stable Playable Version Must Include
- clean ship state shell
- station framework
- voyage/travel system
- crew stations
- a strong, flowing UI shell
- clean Foundry load and app shell

### Safe to Defer
- deeper reputation systems
- deeper cargo systems
- advanced economic play
- large event catalogs
- advanced combat subsystems beyond the core loop
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
- common cargo handling
- upkeep tracking
- install/remove flows
- basic state review in the UI

## Ship Identity Direction
- Hulls should have clear base identities reflecting their intended purpose.
- Hulls should be moderately distinct.
- Upgrades should do much of the specialization work.
- A higher-level ship should feel like an evolved version of itself, not a completely different vessel.

## Combat Model Direction
- Combat should be fast, cinematic, tactical, and teamwork-driven.
- Combat should emphasize:
  - positioning / range
  - firing arcs
  - command support
  - power routing
  - engine strain
- Combat should support mixed win conditions rather than pure damage racing.
- Ship AP or similar shared resource should exist, but it should not become oppressive bookkeeping.
- Stations should use 3 core actions plus unlockable advanced options.
- Every station should have a useful fallback action.

## Voyage Model Direction
- Travel is measured in days.
- The map uses sector hexes.
- Spell engine tier determines how many days it takes to cross a hex.
- Voyage pressure should come from a hybrid of:
  - maintenance wear
  - hostile encounters
  - fuel/power use
  - crew fatigue
  - supply shortages
  - navigation risk
  - legal/faction trouble
  - the unknown and mysterious dangers of space
- Maintenance should be meaningful without becoming constant punishment.
- Encounter generation should be a hybrid model, influenced by both route danger and player choices.

## Cargo and Reputation Direction
### Cargo
- Start simple.
- Use slot-based cargo tracking.
- Cargo should support profit, missions, risk, encounters, and faction play.
- Avoid building a detailed trade simulator in the initial implementation.

### Reputation
- Reputation is important, but can be deferred beyond the first stable playable version.
- When implemented, it should be moderately granular.
- It should affect things like prices, docking access, jobs, inspections, aid, and black market access.

## Universal Station Rule
- All ships use the same station roster.
- Do not merge station roles on smaller ships.
- Smaller ships stay simpler through staffing profiles, NPC coverage, and fewer active priorities, not through different station rules.
- NPC crew can fill gaps at reduced effectiveness.
- A PC occupies only one station at a time in combat and in travel.

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
### Captain
Coordinates the crew and sets tempo.

### Sightmaster
Detects danger and exposes opportunity.

### Arcpilot
Controls position and maneuver.

### Armsmaster
Turns openings into damage.

### Crew Chief
Keeps the crew efficient under pressure.

### Arc Trimmer
Improves movement execution and handling.

### Containment Officer
Stops damage from cascading into disaster.

### Aetherwright
Controls power, strain, and arcane ship systems.

## Naming Direction
- Travel term: **Arcflight**
- Station names should feel distinct and in-world, with a spellpunk / fantasy-space tone.
- Rules text should be flavorful but readable.

## Implementation Order
Build in this order:
1. clean core constants/config
2. module API shell on `game`
3. clean ship state shell
4. basic Ship Management App shell
5. verify clean Foundry load
6. then expand into voyage systems
7. then expand into combat systems
8. then expand into deeper progression/content systems

## Rule for Future Design Work
When facing a design decision, prefer the option that:
- keeps the rules readable
- reduces bookkeeping
- preserves clear station identity
- supports long-term upgrade/content growth
- keeps travel and combat connected to one shared ship state

## Current Design Summary
This module is a persistent PF2E ship gameplay layer where the party commands a shared vessel that:
- travels a hex-based map by day through Arcflight
- grows through hull progression and upgrades
- faces maintenance and encounter pressure during voyages
- fights through station-based combat focused on teamwork, arcs, maneuver, and power management
- functions as both a tactical vehicle and a campaign home base

