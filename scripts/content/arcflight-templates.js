export const ARCFLIGHT_TEMPLATE_TYPES = Object.freeze(["event", "task", "issue"]);

export const ARCFLIGHT_STARTER_TEMPLATES = Object.freeze([
  {
    id: "issue-coil-drift",
    type: "issue",
    title: "Coil Drift",
    category: "engine",
    tags: ["maintenance", "arc-core", "stability"],
    severity: "major",
    player: {
      summary: "The arc coils are slipping out of alignment and power flow is wobbling.",
      risk: "If uncorrected, strain spikes can propagate through containment lines.",
      resolutionTexts: {
        criticalSuccess: "You rebalance and over-stabilize the coils; the system runs cleaner than before.",
        success: "You stabilize the drift and keep the coils within safe tolerances.",
        failure: "The drift remains and worsens under load.",
        criticalFailure: "The correction slips; instability surges through the arc lattice.",
      },
    },
    gm: {
      notes: "Use during medium-pressure legs when engineering attention is split.",
    },
    stationRules: {
      recommendedStation: "aetherwright",
      recommendedSkill: "arcana",
      allowedAlternateStations: ["containment-officer", "arc-trimmer"],
      offStationPenalty: -2,
      assistanceAllowed: true,
    },
    check: {
      dc: 20,
      checkType: "skill",
      publicDcVisible: false,
    },
    outcomes: {
      criticalSuccess: {
        summary: "Coils are stabilized with reserve margin.",
        effects: [
          { type: "adjustArcflightValue", key: "maintenancePressure", mode: "add", value: -2 },
          { type: "resolveSelf" },
          { type: "addLogEntry", text: "Coil Drift was fully corrected with reserve margin." },
        ],
        followUps: [],
        logEntry: "Coil Drift critically resolved.",
      },
      success: {
        summary: "Drift is corrected for now.",
        effects: [
          { type: "adjustArcflightValue", key: "maintenancePressure", mode: "add", value: -1 },
          { type: "resolveSelf" },
        ],
        followUps: [],
        logEntry: "Coil Drift resolved.",
      },
      failure: {
        summary: "Drift persists and requires continued attention.",
        effects: [
          { type: "setStatus", status: "attempted" },
          { type: "addLogEntry", text: "Coil Drift correction attempt failed." },
        ],
        followUps: [],
        logEntry: "Coil Drift attempt failed.",
      },
      criticalFailure: {
        summary: "Drift worsens and spawns emergency rerouting work.",
        effects: [
          { type: "adjustArcflightValue", key: "maintenancePressure", mode: "add", value: 2 },
          { type: "spawnTemplate", templateId: "task-reroute-power" },
          { type: "setStatus", status: "attempted" },
        ],
        followUps: ["task-reroute-power"],
        logEntry: "Coil Drift critically failed; emergency reroute required.",
      },
    },
  },
  {
    id: "task-reroute-power",
    type: "task",
    title: "Reroute Power",
    category: "engineering",
    tags: ["stability", "systems", "crew-action"],
    severity: "moderate",
    player: {
      summary: "Critical load must be redirected through alternate conduits.",
      risk: "Poor routing can stall response systems and reduce maneuver reliability.",
      resolutionTexts: {
        criticalSuccess: "Power is cleanly rerouted with extra efficiency.",
        success: "Power flow is rerouted and stable.",
        failure: "Routing is incomplete; stress remains.",
        criticalFailure: "Routing backfeeds and worsens system instability.",
      },
    },
    gm: {
      notes: "Good bridge action when multiple station prompts are active.",
    },
    stationRules: {
      recommendedStation: "arc-trimmer",
      recommendedSkill: "crafting",
      allowedAlternateStations: ["aetherwright", "crew-chief"],
      offStationPenalty: -2,
      assistanceAllowed: true,
    },
    check: {
      dc: 18,
      checkType: "skill",
      publicDcVisible: false,
    },
    outcomes: {
      criticalSuccess: {
        summary: "Reroute completed with optimized throughput.",
        effects: [{ type: "resolveSelf" }],
        followUps: [],
        logEntry: "Reroute Power critically succeeded.",
      },
      success: {
        summary: "Reroute completed.",
        effects: [{ type: "resolveSelf" }],
        followUps: [],
        logEntry: "Reroute Power succeeded.",
      },
      failure: {
        summary: "Reroute attempt failed.",
        effects: [{ type: "setStatus", status: "attempted" }],
        followUps: [],
        logEntry: "Reroute Power failed.",
      },
      criticalFailure: {
        summary: "Backfeed causes additional wear.",
        effects: [
          { type: "adjustArcflightValue", key: "maintenancePressure", mode: "add", value: 1 },
          { type: "setStatus", status: "attempted" },
        ],
        followUps: [],
        logEntry: "Reroute Power critically failed.",
      },
    },
  },
  {
    id: "event-astral-squall",
    type: "event",
    title: "Astral Squall",
    category: "hazard",
    tags: ["weather", "navigation", "anomaly"],
    severity: "critical",
    player: {
      summary: "An astral squall front tears through nearby currents.",
      risk: "The ship can lose route integrity and suffer cascading strain if mishandled.",
      resolutionTexts: {
        criticalSuccess: "You ride the edge of the squall and gain route advantage.",
        success: "You weather the squall with manageable disruption.",
        failure: "The ship is buffeted and pushed off ideal heading.",
        criticalFailure: "The squall slams the ship and triggers emergency instability.",
      },
    },
    gm: {
      notes: "Use to pressure navigation and command teamwork during longer routes.",
    },
    stationRules: {
      recommendedStation: "arcpilot",
      recommendedSkill: "survival",
      allowedAlternateStations: ["sightmaster", "captain"],
      offStationPenalty: -2,
      assistanceAllowed: true,
    },
    check: {
      dc: 21,
      checkType: "skill",
      publicDcVisible: false,
    },
    outcomes: {
      criticalSuccess: {
        summary: "Squall successfully navigated.",
        effects: [
          { type: "adjustArcflightValue", key: "encounterPressure", mode: "add", value: -1 },
          { type: "resolveSelf" },
        ],
        followUps: [],
        logEntry: "Astral Squall critically succeeded.",
      },
      success: {
        summary: "Squall weathered.",
        effects: [{ type: "resolveSelf" }],
        followUps: [],
        logEntry: "Astral Squall succeeded.",
      },
      failure: {
        summary: "Squall remains active and the route destabilizes.",
        effects: [
          { type: "setStatus", status: "attempted" },
          { type: "adjustArcflightValue", key: "encounterPressure", mode: "add", value: 1 },
        ],
        followUps: [],
        logEntry: "Astral Squall failure; route pressure increased.",
      },
      criticalFailure: {
        summary: "Squall breach triggers coil instability.",
        effects: [
          { type: "spawnTemplate", templateId: "issue-coil-drift" },
          { type: "setStatus", status: "attempted" },
        ],
        followUps: ["issue-coil-drift"],
        logEntry: "Astral Squall critical failure spawned Coil Drift.",
      },
    },
  },
]);
