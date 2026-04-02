import { API_NAMESPACE, MODULE_ID, MODULE_TITLE, STATIONS, TRAVEL_TERM } from "../config/constants.js";
import { PF2E_CORE_SKILLS } from "../state/ship-state.js";
import { PlayerArcflightIncidentApp } from "./player-arcflight-incident-app.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function toLabel(value, fallback = "Unknown") {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toText(value, fallback = "None") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function toStatusText(value) {
  const normalized = String(value ?? "open").trim().toLowerCase() || "open";

  if (normalized === "attempted") {
    return "Response underway";
  }

  if (normalized === "resolved") {
    return "Resolved";
  }

  return "Open";
}

function toUrgencyText(value) {
  const normalized = String(value ?? "minor").trim().toLowerCase();

  if (normalized === "critical") {
    return "Critical urgency";
  }

  if (normalized === "major") {
    return "High urgency";
  }

  if (normalized === "moderate") {
    return "Medium urgency";
  }

  return "Low urgency";
}

function toSeverityText(value) {
  const normalized = String(value ?? "minor").trim().toLowerCase();
  if (!normalized) {
    return "Minor";
  }

  return toLabel(normalized, "Minor");
}

function buildStationLabelsById() {
  return STATIONS.reduce((accumulator, station) => {
    accumulator[station.id] = station.label;
    return accumulator;
  }, {});
}

function buildSkillLabelsByValue() {
  return PF2E_CORE_SKILLS.reduce((accumulator, skill) => {
    accumulator[skill.value] = skill.label;
    return accumulator;
  }, {});
}

function mapPrompt(record, stationLabelsById, skillLabelsByValue) {
  const stationLabel = record?.recommendedStation ? stationLabelsById[record.recommendedStation] ?? null : null;
  const skillLabel = record?.recommendedSkill ? skillLabelsByValue[record.recommendedSkill] ?? toLabel(record.recommendedSkill) : null;

  if (!stationLabel && !skillLabel) {
    return "No specific station prompt assigned.";
  }

  if (stationLabel && skillLabel) {
    return `${stationLabel}: ${skillLabel}`;
  }

  if (stationLabel) {
    return `${stationLabel}: Any appropriate check`;
  }

  return `Any station: ${skillLabel}`;
}

function toSourceLabel(source) {
  if (source === "event") {
    return "Situation";
  }

  if (source === "issue") {
    return "Ship problem";
  }

  return "Crew response";
}

function toRequestActionLabel(sourceType) {
  if (sourceType === "event") {
    return "Respond";
  }

  if (sourceType === "issue") {
    return "Take Point";
  }

  return "Request Action";
}

function toRequestStatusText(status) {
  const normalized = String(status ?? "requested").trim().toLowerCase();
  if (normalized === "active") {
    return "In progress";
  }

  if (normalized === "resolved") {
    return "Handled";
  }

  return "Requested";
}

function toSkillCheckLabel(skillSlug, skillLabelsByValue) {
  const normalizedSkill = String(skillSlug ?? "").trim().toLowerCase();
  if (!normalizedSkill) {
    return "appropriate skill";
  }

  return skillLabelsByValue[normalizedSkill] ?? toLabel(normalizedSkill);
}

function toStationLabel(stationId) {
  const normalizedStationId = String(stationId ?? "").trim().toLowerCase();
  if (!normalizedStationId) {
    return "Unknown station";
  }

  return STATIONS.find((station) => station.id === normalizedStationId)?.label ?? toLabel(normalizedStationId);
}

function toDegreeSlug(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("critical") && normalized.includes("success")) {
    return "criticalSuccess";
  }

  if (normalized.includes("critical") && normalized.includes("failure")) {
    return "criticalFailure";
  }

  if (normalized === "success" || normalized.includes("success")) {
    return "success";
  }

  if (normalized === "failure" || normalized.includes("failure")) {
    return "failure";
  }

  return null;
}

function extractTotalFromRollData(rollData) {
  if (!rollData) {
    return null;
  }

  const directTotal = Number(rollData.total);
  if (Number.isFinite(directTotal)) {
    return directTotal;
  }

  const innerRollTotal = Number(rollData.roll?.total);
  if (Number.isFinite(innerRollTotal)) {
    return innerRollTotal;
  }

  const nestedRollTotal = Number(rollData.rolls?.[0]?.total);
  if (Number.isFinite(nestedRollTotal)) {
    return nestedRollTotal;
  }

  return null;
}

function extractDegreeFromRollData(rollData) {
  if (!rollData) {
    return null;
  }

  return toDegreeSlug(
    rollData?.degreeOfSuccess ??
      rollData?.options?.degreeOfSuccess ??
      rollData?.flags?.pf2e?.context?.outcome?.value ??
      rollData?.flags?.pf2e?.context?.outcome ??
      null,
  );
}

function determineIncidentResultTier(total, dc) {
  if (!Number.isFinite(total) || !Number.isFinite(dc)) {
    return null;
  }

  if (total >= dc + 10) {
    return "criticalSuccess";
  }

  if (total >= dc) {
    return "success";
  }

  if (total <= dc - 10) {
    return "criticalFailure";
  }

  return "failure";
}

function toResultTierLabel(resultTier) {
  if (resultTier === "criticalSuccess") {
    return "Critical Success";
  }

  if (resultTier === "criticalFailure") {
    return "Critical Failure";
  }

  if (resultTier === "success") {
    return "Success";
  }

  if (resultTier === "failure") {
    return "Failure";
  }

  return "Unknown";
}

function toArcflightLogResultLabel(result) {
  const normalized = String(result ?? "").trim();
  if (!normalized) {
    return null;
  }

  if (normalized === "criticalSuccess") {
    return "Critical Success";
  }

  if (normalized === "criticalFailure") {
    return "Critical Failure";
  }

  return toLabel(normalized);
}

function toPublicLogText(entry, publicOutcomeBySourceKey) {
  const explicitPublicText = toText(entry?.publicText, "");
  if (explicitPublicText) {
    return explicitPublicText;
  }

  const type = String(entry?.type ?? "").trim().toLowerCase();
  const sourceId = String(entry?.sourceId ?? "").trim();
  const sourceKey = `${type}::${sourceId}`;
  const publicOutcome = toText(publicOutcomeBySourceKey[sourceKey], "");
  if (publicOutcome) {
    return publicOutcome;
  }

  return "Arcflight activity updated.";
}

function toArcflightLogEntriesView(logEntries = [], publicOutcomeBySourceKey = {}) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return [...logEntries]
    .reverse()
    .map((entry, index) => ({
      id: entry.id ?? `arcflight-log-entry-${index}`,
      orderLabel: `#${index + 1}`,
      timestampLabel: Number.isFinite(Number(entry.timestamp))
        ? formatter.format(new Date(Number(entry.timestamp)))
        : "Unknown time",
      sourceTitleLabel: toText(entry.sourceTitle, "Arcflight"),
      resultLabel: toArcflightLogResultLabel(entry.result),
      textLabel: toPublicLogText(entry, publicOutcomeBySourceKey),
    }));
}

function toPriorityWeight(record) {
  const status = String(record?.status ?? "open").trim().toLowerCase();
  const severity = String(record?.severity ?? "minor").trim().toLowerCase();

  const statusWeight = status === "open" ? 0 : status === "attempted" ? 1 : 2;
  const severityWeight = severity === "critical" ? 0 : severity === "major" ? 1 : severity === "moderate" ? 2 : 3;

  return statusWeight * 10 + severityWeight;
}

function toRoleActionLine(record, stationLabel, skillLabel) {
  const summaryText = toText(record.publicSummary, "No public details yet.");

  if (skillLabel) {
    return `${stationLabel} should lead with ${skillLabel} while this is active. ${summaryText}`;
  }

  return `${stationLabel} should take point while this is active. ${summaryText}`;
}

function buildStationPromptItems(record, stationLabelsById, skillLabelsByValue) {
  const stationId = String(record?.recommendedStation ?? "").trim();
  if (!stationId || !stationLabelsById[stationId]) {
    return null;
  }

  const stationLabel = stationLabelsById[stationId];
  const skillLabel = record?.recommendedSkill
    ? skillLabelsByValue[record.recommendedSkill] ?? toLabel(record.recommendedSkill)
    : null;

  return {
    stationId,
    stationLabel,
    item: {
      title: toText(record.title, "Unnamed duty"),
      sourceLabel: toSourceLabel(record.source),
      statusText: toStatusText(record.status),
      urgencyText: toUrgencyText(record.severity),
      happeningText: toText(record.publicSummary, "No public details yet."),
      mattersText: toText(record.publicOutcome, "Outcome still uncertain."),
      roleActionText: toRoleActionLine(record, stationLabel, skillLabel),
      sourceType: record.source,
      sourceId: record.id ?? "",
      recommendedSkill: record.recommendedSkill ?? null,
      recommendedSkillLabel: skillLabel ?? "Appropriate skill",
      requestActionLabel: toRequestActionLabel(record.source),
      priorityWeight: toPriorityWeight(record),
    },
  };
}

function buildStationPrompts(records, stationLabelsById, skillLabelsByValue) {
  const promptsByStation = {};

  for (const record of records) {
    const stationPromptItem = buildStationPromptItems(record, stationLabelsById, skillLabelsByValue);
    if (!stationPromptItem) {
      continue;
    }

    const existing = promptsByStation[stationPromptItem.stationId] ?? {
      stationId: stationPromptItem.stationId,
      stationLabel: stationPromptItem.stationLabel,
      items: [],
    };
    existing.items.push(stationPromptItem.item);
    promptsByStation[stationPromptItem.stationId] = existing;
  }

  return STATIONS.map((station) => promptsByStation[station.id])
    .filter((stationPrompt) => stationPrompt?.items?.length)
    .map((stationPrompt) => ({
      ...stationPrompt,
      items: stationPrompt.items.sort((left, right) => left.priorityWeight - right.priorityWeight),
    }));
}

function hasExplicitShipContext(shipContext) {
  return Boolean(String(shipContext?.shipId ?? "").trim() || String(shipContext?.actorId ?? "").trim());
}

function toVoyageStatus(travelState) {
  const destination = toText(travelState?.destination, "No destination set");
  const posture = toLabel(travelState?.posture ?? "standard", "Standard");
  const currentHex = toText(travelState?.currentHex, "Unknown");
  const legProgress = Number(travelState?.legProgress ?? 0);
  const legTarget = Math.max(1, Number(travelState?.legProgressMax ?? 1));
  const daysElapsed = Number(travelState?.daysElapsed ?? 0);
  const spellEngineTier = Math.max(1, Number(travelState?.spellEngineTier ?? 5));
  const daysPerHex = Math.max(1, Number(travelState?.daysPerHex ?? spellEngineTier));
  const daysIntoCurrentHex = Math.max(0, Number(travelState?.daysIntoCurrentHex ?? 0));
  const daysRemainingInCurrentHex = Math.max(0, Number(travelState?.daysRemainingInCurrentHex ?? daysPerHex - daysIntoCurrentHex));
  const completedHexes = Math.max(0, Number(travelState?.completedHexes ?? 0));
  const remainingGalacticHexes = Math.max(0, Number(travelState?.remainingGalacticHexes ?? 0));
  const estimatedDaysRemaining = Math.max(
    0,
    Number(travelState?.estimatedDaysRemaining ?? (remainingGalacticHexes > 0
      ? ((remainingGalacticHexes - 1) * daysPerHex) + daysRemainingInCurrentHex
      : 0)),
  );
  const etaLabel = String(travelState?.etaLabel ?? "").trim() ||
    (remainingGalacticHexes > 0
      ? `${estimatedDaysRemaining} day${estimatedDaysRemaining === 1 ? "" : "s"} remaining`
      : "Arrived");
  const maintenancePressure = Math.max(0, Number(travelState?.maintenancePressure ?? 0));
  const encounterPressure = Math.max(0, Number(travelState?.encounterPressure ?? 0));
  const voyageInstability = Math.max(0, Number(travelState?.voyageInstability ?? 0));
  const toPressureBand = (value) => {
    if (value >= 5) {
      return "Dangerous";
    }

    if (value >= 3) {
      return "Noticeable";
    }

    return "Calm";
  };

  return {
    term: TRAVEL_TERM,
    destination,
    posture,
    currentHex,
    legProgressLabel: `${legProgress} / ${legTarget}`,
    spellEngineTier,
    daysPerHex,
    currentHexProgressLabel: `${daysIntoCurrentHex} / ${daysPerHex}`,
    daysRemainingInCurrentHex,
    completedHexes,
    remainingGalacticHexes,
    estimatedDaysRemaining,
    etaLabel,
    daysElapsed,
    maintenancePressure,
    maintenancePressureBand: toPressureBand(maintenancePressure),
    encounterPressure,
    encounterPressureBand: toPressureBand(encounterPressure),
    voyageInstability,
    voyageInstabilityBand: toPressureBand(voyageInstability),
    statusText: legProgress >= legTarget ? "Leg complete. Awaiting next heading." : "In transit.",
  };
}

function buildAssignableActorOptions() {
  return Array.from(game.actors ?? [])
    .filter((actor) => actor?.type === "character")
    .sort((left, right) => String(left?.name ?? "").localeCompare(String(right?.name ?? "")))
    .map((actor) => ({
      value: actor.id,
      label: actor.name ?? actor.id,
    }));
}

function toStationAssignmentRows(shipState, actorApi, assignableActorOptions) {
  const stationAssignments = shipState?.crew?.stations ?? {};

  return STATIONS.map((station) => {
    const stationAssignment = stationAssignments[station.id] ?? { actorId: null, isNpcCrew: false };
    const assignedActorId = String(stationAssignment.actorId ?? "").trim();
    const assignedActor = assignedActorId ? actorApi?.resolveActor?.(assignedActorId) ?? null : null;

    return {
      stationId: station.id,
      stationLabel: station.label,
      assignedActorId,
      assignedActorName: assignedActor?.name ?? (assignedActorId ? "Missing actor document" : "Unassigned"),
      actorOptions: assignableActorOptions.map((option) => ({
        ...option,
        selected: option.value === assignedActorId,
      })),
    };
  });
}

export class PlayerArcflightViewApp extends HandlebarsApplicationMixin(ApplicationV2) {
  #shipContext = null;
  #shipStateUpdatedHookId = null;
  #refreshTimeoutId = null;
  #ignoreNextLiveRefreshCount = 0;
  #incidentAppsByKey = new Map();

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-player-arcflight-view`,
    classes: [MODULE_ID, "player-arcflight-view-app"],
    tag: "section",
    window: {
      title: `${MODULE_TITLE} | Arcflight Status`,
      resizable: true,
    },
    position: {
      width: 560,
      height: 560,
    },
  };

  static PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/app/player-arcflight-view.hbs`,
    },
  };

  constructor(options = {}) {
    super(options);
    this.#shipContext = {
      shipId: options.shipId ?? null,
      actorId: options.actorId ?? null,
    };
  }

  async _prepareContext() {
    const api = game?.[API_NAMESPACE] ?? null;
    const stateApi = api?.state ?? null;
    const actorApi = api?.actors ?? null;

    const explicitTarget = hasExplicitShipContext(this.#shipContext);
    const targetShipState = stateApi?.getShipState?.(this.#shipContext) ?? null;
    const shipState = targetShipState ?? (explicitTarget ? null : stateApi?.getActiveShipState?.() ?? null);
    const travelState = shipState?.arcflight ?? null;

    if (!shipState || !travelState) {
      return {
        moduleTitle: MODULE_TITLE,
        hasShipState: false,
      };
    }

    const stationLabelsById = buildStationLabelsById();
    const skillLabelsByValue = buildSkillLabelsByValue();
    const assignableActorOptions = buildAssignableActorOptions();
    const stationAssignmentRows = toStationAssignmentRows(shipState, actorApi, assignableActorOptions);
    const arcflightLogEntries = stateApi?.getArcflightLogEntries?.(this.#shipContext) ??
      (Array.isArray(travelState.logEntries) ? travelState.logEntries : []);
    const stationRequests = stateApi?.getStationRequests?.() ?? (Array.isArray(travelState.stationRequests) ? travelState.stationRequests : []);
    const stationRequestByPromptKey = stationRequests.reduce((accumulator, request) => {
      const stationId = String(request?.stationId ?? "").trim();
      const sourceType = String(request?.sourceType ?? "").trim();
      const sourceId = String(request?.sourceId ?? "").trim();
      if (!stationId || !sourceType || !sourceId) {
        return accumulator;
      }

      accumulator[`${stationId}::${sourceType}::${sourceId}`] = request;
      return accumulator;
    }, {});

    const openEvents = (Array.isArray(travelState.travelEvents) ? travelState.travelEvents : []).filter(
      (eventRecord) => eventRecord?.status !== "resolved",
    );
    const openIssues = (Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : []).filter(
      (issueRecord) => issueRecord?.status !== "resolved",
    );
    const responseTasks = (Array.isArray(travelState.travelTasks) ? travelState.travelTasks : []).filter(
      (taskRecord) => taskRecord?.status === "open" || taskRecord?.status === "attempted",
    );
    const publicOutcomeBySourceKey = [
      ...(Array.isArray(travelState.travelEvents) ? travelState.travelEvents : []).map((record) => ({ ...record, sourceType: "event" })),
      ...(Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : []).map((record) => ({
        ...record,
        sourceType: "issue",
      })),
      ...(Array.isArray(travelState.travelTasks) ? travelState.travelTasks : []).map((record) => ({ ...record, sourceType: "task" })),
    ].reduce((accumulator, record) => {
      const sourceType = String(record?.sourceType ?? "").trim();
      const sourceId = String(record?.id ?? "").trim();
      if (!sourceType || !sourceId) {
        return accumulator;
      }

      accumulator[`${sourceType}::${sourceId}`] = toText(record.publicOutcome, "");
      return accumulator;
    }, {});
    const stationPromptSourceRecords = [
      ...openEvents.map((eventRecord) => ({ ...eventRecord, source: "event" })),
      ...openIssues.map((issueRecord) => ({ ...issueRecord, source: "issue" })),
      ...responseTasks.map((taskRecord) => ({ ...taskRecord, source: "task" })),
    ];

    return {
      moduleTitle: MODULE_TITLE,
      hasShipState: true,
      isGm: Boolean(game.user?.isGM),
      shipName: shipState.identity?.name ?? "Unnamed Ship",
      stationAssignments: {
        rows: stationAssignmentRows,
        hasAssignableActors: assignableActorOptions.length > 0,
      },
      voyage: toVoyageStatus(travelState),
      arcflightLog: {
        entries: toArcflightLogEntriesView(arcflightLogEntries, publicOutcomeBySourceKey),
        hasEntries: arcflightLogEntries.length > 0,
      },
      activeSituations: openEvents.map((eventRecord) => ({
        title: toText(eventRecord.title, "Unnamed situation"),
        statusText: toStatusText(eventRecord.status),
        urgencyText: toUrgencyText(eventRecord.severity),
        summaryText: toText(eventRecord.publicSummary, "No public details yet."),
        promptText: mapPrompt(eventRecord, stationLabelsById, skillLabelsByValue),
        sourceType: "event",
        sourceId: eventRecord.id ?? "",
      })),
      shipProblems: openIssues.map((issueRecord) => ({
        title: toText(issueRecord.title, "Unnamed problem"),
        statusText: toStatusText(issueRecord.status),
        urgencyText: toUrgencyText(issueRecord.severity),
        summaryText: toText(issueRecord.publicSummary, "No public details yet."),
        promptText: mapPrompt(issueRecord, stationLabelsById, skillLabelsByValue),
        sourceType: "issue",
        sourceId: issueRecord.id ?? "",
      })),
      crewResponses: responseTasks.map((taskRecord) => ({
        title: toText(taskRecord.title, "Unnamed crew response"),
        statusText: toStatusText(taskRecord.status),
        summaryText: toText(taskRecord.publicSummary, "No public details yet."),
        riskText: toText(taskRecord.publicOutcome, "Outcome still uncertain."),
        promptText: mapPrompt(taskRecord, stationLabelsById, skillLabelsByValue),
        sourceType: "task",
        sourceId: taskRecord.id ?? "",
      })),
      stationPrompts: buildStationPrompts(stationPromptSourceRecords, stationLabelsById, skillLabelsByValue).map(
        (stationPrompt) => ({
          ...stationPrompt,
          items: stationPrompt.items.map((item) => {
            const requestKey = `${stationPrompt.stationId}::${item.sourceType}::${item.sourceId}`;
            const existingRequest = stationRequestByPromptKey[requestKey] ?? null;

            return {
              ...item,
              hasStationRequest: Boolean(existingRequest),
              requestStatusText: existingRequest ? toRequestStatusText(existingRequest.status) : null,
              requestSummaryText: existingRequest?.requestText ?? null,
            };
          }),
        }),
      ),
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.#ensureLiveRefreshSubscription();

    const requestForms = this.element.querySelectorAll("[data-player-station-request-form]");
    for (const form of requestForms) {
      form.addEventListener("submit", this.#onStationRequestSubmit.bind(this));
    }

    const rollButtons = this.element.querySelectorAll("[data-player-station-roll-check]");
    for (const button of rollButtons) {
      button.addEventListener("click", this.#onStationRollCheckClick.bind(this));
    }

    const incidentOpenButtons = this.element.querySelectorAll("[data-player-open-incident]");
    for (const button of incidentOpenButtons) {
      button.addEventListener("click", this.#onOpenIncidentClick.bind(this));
    }

    if (game.user?.isGM) {
      const assignStationButtons = this.element.querySelectorAll("[data-player-assign-station-actor]");
      for (const button of assignStationButtons) {
        button.addEventListener("click", this.#onAssignStationActorClick.bind(this));
      }

      const clearStationButtons = this.element.querySelectorAll("[data-player-clear-station-actor]");
      for (const button of clearStationButtons) {
        button.addEventListener("click", this.#onClearStationActorClick.bind(this));
      }
    }
  }

  async #onAssignStationActorClick(event) {
    event.preventDefault();

    if (!game.user?.isGM) {
      ui.notifications?.warn("Only the GM can edit station assignments.");
      return;
    }

    const stateApi = game?.[API_NAMESPACE]?.state ?? null;
    const button = event.currentTarget;
    const row = button?.closest?.("[data-station-id]") ?? null;
    const stationId = String(button?.dataset?.stationId ?? "").trim().toLowerCase();
    const actorSelect = row?.querySelector?.("select[name='stationAssignedActorId']") ?? null;
    const assignedActorId = String(actorSelect?.value ?? "").trim();

    if (!stationId || !stateApi?.assignStationActor) {
      return;
    }

    this.#ignoreNextLiveRefreshCount += 1;
    await stateApi.assignStationActor(stationId, assignedActorId || null, this.#shipContext);
    this.#renderAfterLocalStateWrite();
  }

  async #onClearStationActorClick(event) {
    event.preventDefault();

    if (!game.user?.isGM) {
      ui.notifications?.warn("Only the GM can edit station assignments.");
      return;
    }

    const stateApi = game?.[API_NAMESPACE]?.state ?? null;
    const button = event.currentTarget;
    const stationId = String(button?.dataset?.stationId ?? "").trim().toLowerCase();

    if (!stationId || !stateApi?.clearStationActor) {
      return;
    }

    this.#ignoreNextLiveRefreshCount += 1;
    await stateApi.clearStationActor(stationId, this.#shipContext);
    this.#renderAfterLocalStateWrite();
  }

  async #onStationRequestSubmit(event) {
    event.preventDefault();

    const api = game?.[API_NAMESPACE] ?? null;
    const stateApi = api?.state ?? null;
    if (!stateApi?.addStationRequest) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const stationId = String(formData.get("stationId") ?? "").trim();
    const sourceType = String(formData.get("sourceType") ?? "").trim();
    const sourceId = String(formData.get("sourceId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const requestActionLabel = String(formData.get("requestActionLabel") ?? "").trim();

    if (!stationId || !sourceType || !sourceId) {
      return;
    }

    await this.#submitStationRequest({
      stationId,
      sourceType,
      sourceId,
      title,
      requestActionLabel: requestActionLabel || "Request Help",
    });
  }

  async #onStationRollCheckClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    if (!button || button.dataset?.rollCheckInProgress === "true") {
      return;
    }

    button.dataset.rollCheckInProgress = "true";
    button.disabled = true;

    const stationId = String(button?.dataset?.stationId ?? "").trim().toLowerCase();
    const sourceType = String(button?.dataset?.sourceType ?? "").trim().toLowerCase();
    const sourceId = String(button?.dataset?.sourceId ?? "").trim();
    const recommendedSkill = String(button?.dataset?.recommendedSkill ?? "").trim().toLowerCase();
    const title = String(button?.dataset?.title ?? "").trim() || "Station task";
    const incident = this.#resolveIncidentForPopup(sourceType, sourceId);

    try {
      if (incident) {
        await this.#attemptIncidentResolution(incident, event, stationId);
        return;
      }

      await this.#runStationRollCheck({
        stationId,
        sourceType,
        sourceId,
        title,
        recommendedSkill,
        event,
      });
    } finally {
      button.disabled = false;
      delete button.dataset.rollCheckInProgress;
    }
  }

  async #runStationRollCheck({ stationId, sourceType, sourceId, title, recommendedSkill, event = null, shipContext = null }) {
    if (!stationId || !sourceType || !sourceId || !recommendedSkill) {
      ui.notifications?.warn("This station briefing does not have a recommended skill to roll yet.");
      return null;
    }

    const actingActor = this.#resolveAssignedStationActor(stationId, shipContext);
    if (!actingActor) {
      ui.notifications?.warn("No assigned character was found for this station. Ask the GM to set station crew.");
      return null;
    }

    const skillLabelsByValue = buildSkillLabelsByValue();
    const skillLabel = toSkillCheckLabel(recommendedSkill, skillLabelsByValue);
    const stationLabel = STATIONS.find((station) => station.id === stationId)?.label ?? toLabel(stationId);
    const sourceLabel = toSourceLabel(sourceType);
    const chatFlavor =
      `<strong>Arcflight Station Check</strong><br>` +
      `<strong>Station:</strong> ${stationLabel}<br>` +
      `<strong>Acting Character:</strong> ${actingActor.name}<br>` +
      `<strong>Prompt:</strong> ${title}<br>` +
      `<strong>Skill:</strong> ${skillLabel}<br>` +
      `<strong>Source:</strong> ${sourceLabel}`;

    const legacySkillData = actingActor.system?.skills?.[recommendedSkill] ?? null;
    const modifier = Number(
      legacySkillData?.modifier ??
        legacySkillData?.mod ??
        legacySkillData?.value ??
        0,
    );

    if (actingActor.skills?.[recommendedSkill]?.check?.roll) {
      const checkResult = await actingActor.skills[recommendedSkill].check.roll({
        event,
        skill: recommendedSkill,
        flavor: chatFlavor,
      });

      const checkResultTotal = extractTotalFromRollData(checkResult);
      const checkResultDegree = extractDegreeFromRollData(checkResult);
      return this.#recordStationRollAttempt({
        stationId,
        sourceType,
        sourceId,
        actingActor,
        recommendedSkill,
        total: checkResultTotal,
        degree: checkResultDegree,
        shipContext,
      });
    }

    const roll = await new Roll(`1d20 + ${modifier}`).evaluate();
    const fallbackRollMessage = await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actingActor }),
      flavor: chatFlavor,
    });

    return this.#recordStationRollAttempt({
      stationId,
      sourceType,
      sourceId,
      actingActor,
      recommendedSkill,
      total: extractTotalFromRollData(roll) ?? extractTotalFromRollData(fallbackRollMessage),
      degree: extractDegreeFromRollData(roll) ?? extractDegreeFromRollData(fallbackRollMessage),
      shipContext,
    });
  }

  async #submitStationRequest({ stationId, sourceType, sourceId, title, requestActionLabel }) {
    const stateApi = game?.[API_NAMESPACE]?.state ?? null;
    if (!stateApi?.addStationRequest) {
      return;
    }

    if (!stationId || !sourceType || !sourceId) {
      ui.notifications?.warn("This incident does not have a recommended station yet. Ask your GM for assignment guidance.");
      return;
    }

    this.#ignoreNextLiveRefreshCount += 1;
    stateApi.addStationRequest(
      {
        stationId,
        sourceType,
        sourceId,
        title: title || "Station request",
        status: "requested",
        requestText: `${requestActionLabel}: ${title || "Station request"}`,
        summary: "Player station intent recorded.",
      },
      this.#shipContext,
    );
  }

  async #onOpenIncidentClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const sourceType = String(button?.dataset?.sourceType ?? "").trim().toLowerCase();
    const sourceId = String(button?.dataset?.sourceId ?? "").trim();
    this.#openIncidentPopup(sourceType, sourceId);
  }

  #openIncidentPopup(sourceType, sourceId) {
    const incident = this.#resolveIncidentForPopup(sourceType, sourceId);
    if (!incident) {
      ui.notifications?.warn("Could not find that Arcflight incident in the current ship state.");
      return;
    }

    const popupKey = `${incident.sourceType}::${incident.sourceId}`;
    const existingApp = this.#incidentAppsByKey.get(popupKey) ?? null;
    if (existingApp?.rendered) {
      existingApp.bringToFront();
      return;
    }

    const popupApp = new PlayerArcflightIncidentApp({
      incident,
      onAttemptCheck: async (popupIncident, clickEvent, actingStationId) =>
        this.#attemptIncidentResolution(popupIncident, clickEvent, actingStationId),
      onRequestHelp: async (popupIncident) =>
        this.#submitStationRequest({
          stationId: popupIncident.recommendedStation,
          sourceType: popupIncident.sourceType,
          sourceId: popupIncident.sourceId,
          title: popupIncident.title,
          requestActionLabel: "Request Help",
        }),
    });

    const originalClose = popupApp.close.bind(popupApp);
    popupApp.close = async (...closeArgs) => {
      this.#incidentAppsByKey.delete(popupKey);
      return originalClose(...closeArgs);
    };

    this.#incidentAppsByKey.set(popupKey, popupApp);
    popupApp.render({ force: true });
  }

  #resolveIncidentForPopup(sourceType, sourceId) {
    const normalizedSourceType = String(sourceType ?? "").trim().toLowerCase();
    const normalizedSourceId = String(sourceId ?? "").trim();
    if (!normalizedSourceType || !normalizedSourceId) {
      return null;
    }

    const stateApi = game?.[API_NAMESPACE]?.state ?? null;
    const explicitTarget = hasExplicitShipContext(this.#shipContext);
    const targetShipState = stateApi?.getShipState?.(this.#shipContext) ?? null;
    const shipState = targetShipState ?? (explicitTarget ? null : stateApi?.getActiveShipState?.() ?? null);
    const travelState = shipState?.arcflight ?? null;
    if (!travelState) {
      return null;
    }

    const stationLabelsById = buildStationLabelsById();
    const skillLabelsByValue = buildSkillLabelsByValue();
    const sourceCollection =
      normalizedSourceType === "event"
        ? Array.isArray(travelState.travelEvents)
          ? travelState.travelEvents
          : []
        : normalizedSourceType === "issue"
          ? Array.isArray(travelState.maintenanceIssues)
            ? travelState.maintenanceIssues
            : []
          : Array.isArray(travelState.travelTasks)
            ? travelState.travelTasks
            : [];

    const sourceRecord = sourceCollection.find((record) => String(record?.id ?? "").trim() === normalizedSourceId) ?? null;
    if (!sourceRecord) {
      return null;
    }

    const recommendedStation = String(sourceRecord.recommendedStation ?? "").trim().toLowerCase();
    const recommendedSkill = String(sourceRecord.recommendedSkill ?? "").trim().toLowerCase();
    const sourceTemplateId = String(sourceRecord.sourceTemplateId ?? "").trim();
    const sourceTemplate = sourceTemplateId ? stateApi?.getArcflightTemplateById?.(sourceTemplateId, this.#shipContext) ?? null : null;
    const sourceTemplateResolutionTexts = sourceRecord.sourceTemplateResolutionTexts ?? sourceTemplate?.player?.resolutionTexts ?? {};
    const sourceTemplateOffStationPenalty = Number.isFinite(Number(sourceRecord.offStationPenalty))
      ? Math.floor(Number(sourceRecord.offStationPenalty))
      : Number.isFinite(Number(sourceTemplate?.stationRules?.offStationPenalty))
        ? Math.floor(Number(sourceTemplate.stationRules.offStationPenalty))
        : -2;

    return {
      sourceType: normalizedSourceType,
      sourceId: normalizedSourceId,
      shipContext: {
        shipId: shipState.identity?.shipId ?? null,
        actorId: shipState.identity?.actorId ?? null,
      },
      sourceLabel: toSourceLabel(normalizedSourceType),
      title: toText(sourceRecord.title, "Unnamed incident"),
      publicSummary: toText(sourceRecord.publicSummary, "No public details yet."),
      publicOutcome: toText(sourceRecord.publicOutcome, "Outcome still uncertain."),
      severityText: toSeverityText(sourceRecord.severity),
      status: String(sourceRecord.status ?? "open").trim().toLowerCase() || "open",
      statusText: toStatusText(sourceRecord.status),
      recommendedStation: recommendedStation || "",
      recommendedStationLabel: stationLabelsById[recommendedStation] ?? "Any station",
      recommendedSkill: recommendedSkill || "",
      recommendedSkillLabel: recommendedSkill ? toSkillCheckLabel(recommendedSkill, skillLabelsByValue) : "Appropriate skill",
      dc: Number.isFinite(Number(sourceRecord.dc)) ? Number(sourceRecord.dc) : null,
      sourceTemplateResolutionTexts,
      offStationPenalty: sourceTemplateOffStationPenalty,
      hasOffStationPenaltyNote: Boolean(recommendedStation),
    };
  }

  async #attemptIncidentResolution(popupIncident, clickEvent = null, selectedStationId = null) {
    if (String(popupIncident?.status ?? "open").trim().toLowerCase() === "resolved") {
      ui.notifications?.info("This incident is already resolved.");
      return;
    }

    const dc = Number(popupIncident?.dc);
    if (!Number.isFinite(dc) || dc <= 0) {
      ui.notifications?.warn("This incident does not have a valid DC yet. Ask the GM to set one first.");
      return;
    }

    if (!popupIncident?.recommendedSkill) {
      ui.notifications?.warn("This incident does not have a recommended skill yet.");
      return;
    }

    if (!popupIncident?.recommendedStation) {
      ui.notifications?.warn("This incident does not have a recommended station yet. Ask the GM for station guidance.");
      return;
    }

    const actingStationId = String(selectedStationId ?? popupIncident.recommendedStation ?? "").trim().toLowerCase();
    if (!actingStationId) {
      ui.notifications?.warn("Choose an acting station before attempting this incident.");
      return;
    }

    const rollAttempt = await this.#runStationRollCheck({
      stationId: actingStationId,
      sourceType: popupIncident.sourceType,
      sourceId: popupIncident.sourceId,
      title: popupIncident.title,
      recommendedSkill: popupIncident.recommendedSkill,
      event: clickEvent,
      shipContext: popupIncident.shipContext,
    });
    if (!rollAttempt || !Number.isFinite(rollAttempt.total)) {
      ui.notifications?.warn("Could not resolve this incident because the roll total was unavailable.");
      return;
    }

    const recommendedStationId = String(popupIncident.recommendedStation ?? "").trim().toLowerCase();
    const offStationPenalty = Number.isFinite(Number(popupIncident.offStationPenalty))
      ? Math.floor(Number(popupIncident.offStationPenalty))
      : -2;
    const isOffStation = Boolean(actingStationId && recommendedStationId && actingStationId !== recommendedStationId);
    const adjustedTotal = rollAttempt.total + (isOffStation ? offStationPenalty : 0);
    const resultTier = determineIncidentResultTier(adjustedTotal, dc);
    const resultTierLabel = toResultTierLabel(resultTier);
    const resolutionText = toText(
      popupIncident?.sourceTemplateResolutionTexts?.[resultTier],
      popupIncident?.publicOutcome ?? "Outcome still uncertain.",
    );

    await this.#writeIncidentResolution({
      popupIncident,
      rollAttempt,
      adjustedTotal,
      dc,
      resultTier,
      resultTierLabel,
      resolutionText,
      isOffStation,
      offStationPenalty,
      recommendedStationId,
      shipContext: popupIncident.shipContext,
    });
  }

  async #writeIncidentResolution({
    popupIncident,
    rollAttempt,
    adjustedTotal,
    dc,
    resultTier,
    resultTierLabel,
    resolutionText,
    isOffStation,
    offStationPenalty,
    recommendedStationId,
    shipContext,
  }) {
    const stateApi = game?.[API_NAMESPACE]?.state ?? null;
    if (!stateApi) {
      return;
    }

    const attemptSummary = isOffStation
      ? `${rollAttempt.actorName} rolled ${rollAttempt.recommendedSkill} ${rollAttempt.total} (${offStationPenalty} off-station) => ${adjustedTotal} vs DC ${dc}.`
      : `${rollAttempt.actorName} rolled ${rollAttempt.recommendedSkill} ${rollAttempt.total} vs DC ${dc}.`;
    const resultSummary = `${resultTierLabel}: ${resolutionText}`;
    const updatePatch = {
      attemptedByStation: rollAttempt.stationId,
      attemptedSkill: rollAttempt.recommendedSkill,
      lastAttemptSummary: attemptSummary,
      resultSummary,
      status: resultTier === "success" || resultTier === "criticalSuccess" ? "resolved" : "attempted",
    };

    this.#ignoreNextLiveRefreshCount += 1;
    if (popupIncident.sourceType === "event") {
      stateApi.updateTravelEvent?.(popupIncident.sourceId, updatePatch, shipContext ?? this.#shipContext);
    } else if (popupIncident.sourceType === "task") {
      stateApi.updateTravelTask?.(popupIncident.sourceId, updatePatch, shipContext ?? this.#shipContext);
    } else if (popupIncident.sourceType === "issue") {
      stateApi.updateMaintenanceIssue?.(popupIncident.sourceId, updatePatch, shipContext ?? this.#shipContext);
    }

    this.#ignoreNextLiveRefreshCount += 1;
    stateApi.executeArcflightOutcomeEffects?.(
      {
        sourceType: popupIncident.sourceType,
        sourceId: popupIncident.sourceId,
        resultTier,
        summaryText: resolutionText,
        logContext: {
          stationId: rollAttempt.stationId,
          actorId: rollAttempt.actorId,
          actorName: rollAttempt.actorName,
          skill: rollAttempt.recommendedSkill,
          total: adjustedTotal,
        },
      },
      shipContext ?? this.#shipContext,
    );

    this.#renderAfterLocalStateWrite();

    this.#showIncidentResolutionMessage({
      title: popupIncident.title,
      adjustedTotal,
      rolledTotal: rollAttempt.total,
      dc,
      resultTierLabel,
      resolutionText,
      actingStationId: rollAttempt.stationId,
      recommendedStationId,
      isOffStation,
      offStationPenalty,
    });
  }

  #showIncidentResolutionMessage({
    title,
    adjustedTotal,
    rolledTotal,
    dc,
    resultTierLabel,
    resolutionText,
    actingStationId,
    recommendedStationId,
    isOffStation,
    offStationPenalty,
  }) {
    const actingStationLabel = toStationLabel(actingStationId);
    const recommendedStationLabel = toStationLabel(recommendedStationId);
    const totalLine = isOffStation
      ? `<strong>Total:</strong> ${adjustedTotal} (<strong>Roll:</strong> ${rolledTotal}, <strong>Off-station:</strong> ${offStationPenalty}) vs <strong>DC:</strong> ${dc}`
      : `<strong>Total:</strong> ${adjustedTotal} vs <strong>DC:</strong> ${dc}`;
    const stationLine = isOffStation
      ? `<strong>Station:</strong> ${actingStationLabel} (off-station from ${recommendedStationLabel})`
      : `<strong>Station:</strong> ${actingStationLabel}`;
    const content =
      `<p><strong>${title}</strong></p>` +
      `<p>${stationLine}</p>` +
      `<p>${totalLine}</p>` +
      `<p><strong>Result:</strong> ${resultTierLabel}</p>` +
      `<p>${resolutionText}</p>`;

    const dialogClass = foundry?.applications?.api?.DialogV2 ?? null;
    if (dialogClass?.prompt) {
      dialogClass.prompt({
        window: { title: `${TRAVEL_TERM} Incident Result` },
        content,
        ok: {
          label: "OK",
        },
      });
      return;
    }

    const totalSummary = isOffStation
      ? `Total ${adjustedTotal} (roll ${rolledTotal}, off-station ${offStationPenalty}) vs DC ${dc}`
      : `Total ${adjustedTotal} vs DC ${dc}`;
    ui.notifications?.info(`${title}: ${resultTierLabel}. ${totalSummary}. ${resolutionText}`);
  }

  #renderAfterLocalStateWrite() {
    if (!this.rendered) {
      return;
    }

    if (this.#refreshTimeoutId) {
      clearTimeout(this.#refreshTimeoutId);
      this.#refreshTimeoutId = null;
    }

    this.render({ force: true });
  }

  async #recordStationRollAttempt({
    stationId,
    sourceType,
    sourceId,
    actingActor,
    recommendedSkill,
    total,
    degree,
    shipContext = null,
  }) {
    const stateApi = game?.[API_NAMESPACE]?.state ?? null;
    if (!stateApi?.recordStationRollAttempt) {
      return null;
    }

    const attemptRecord = {
      stationId,
      sourceType,
      sourceId,
      actorId: actingActor?.id ?? null,
      actorName: actingActor?.name ?? "Unknown Actor",
      recommendedSkill,
      total: Number.isFinite(total) ? total : null,
      degree: degree ?? null,
    };

    this.#ignoreNextLiveRefreshCount += 1;
    stateApi.recordStationRollAttempt(
      {
        stationId: attemptRecord.stationId,
        sourceType: attemptRecord.sourceType,
        sourceId: attemptRecord.sourceId,
        actorId: attemptRecord.actorId,
        actorName: attemptRecord.actorName,
        skill: recommendedSkill,
        total: attemptRecord.total,
        degree: attemptRecord.degree,
        createdAt: Date.now(),
      },
      shipContext ?? this.#shipContext,
    );

    return attemptRecord;
  }

  #resolveAssignedStationActor(stationId, shipContext = null) {
    const normalizedStationId = String(stationId ?? "").trim().toLowerCase();
    if (!normalizedStationId) {
      return null;
    }

    const stateApi = game?.[API_NAMESPACE]?.state ?? null;
    const effectiveShipContext = shipContext ?? this.#shipContext;
    const explicitTarget = hasExplicitShipContext(effectiveShipContext);
    const targetShipState = stateApi?.getShipState?.(effectiveShipContext) ?? null;
    const shipState = targetShipState ?? (explicitTarget ? null : stateApi?.getActiveShipState?.() ?? null);
    const assignedActorId = shipState?.crew?.stations?.[normalizedStationId]?.actorId ?? null;
    if (!assignedActorId) {
      return null;
    }

    return game.actors?.get(assignedActorId) ?? null;
  }

  async close(options) {
    for (const incidentApp of this.#incidentAppsByKey.values()) {
      if (incidentApp?.rendered) {
        await incidentApp.close({ force: true });
      }
    }
    this.#incidentAppsByKey.clear();
    this.#teardownLiveRefreshSubscription();
    return super.close(options);
  }

  openIncidentFromSource(sourceType, sourceId) {
    const normalizedSourceType = String(sourceType ?? "").trim().toLowerCase();
    const normalizedSourceId = String(sourceId ?? "").trim();
    if (!normalizedSourceType || !normalizedSourceId) {
      return;
    }

    this.#openIncidentPopup(normalizedSourceType, normalizedSourceId);
  }

  #ensureLiveRefreshSubscription() {
    if (this.#shipStateUpdatedHookId !== null) {
      return;
    }

    const hookName = game?.[API_NAMESPACE]?.hooks?.shipStateUpdated;
    if (!hookName) {
      return;
    }

    this.#shipStateUpdatedHookId = Hooks.on(hookName, (payload) => {
      if (this.#ignoreNextLiveRefreshCount > 0) {
        this.#ignoreNextLiveRefreshCount -= 1;
        return;
      }

      const changedShipId = payload?.shipId ?? null;
      if (!this.#isRelevantShipUpdate(changedShipId)) {
        return;
      }

      if (this.#refreshTimeoutId) {
        clearTimeout(this.#refreshTimeoutId);
      }

      this.#refreshTimeoutId = setTimeout(() => {
        this.#refreshTimeoutId = null;
        if (!this.rendered) {
          return;
        }

        this.render({ force: true });
      }, 50);
    });
  }

  #isRelevantShipUpdate(changedShipId) {
    if (!changedShipId) {
      return false;
    }

    const stateApi = game?.[API_NAMESPACE]?.state ?? null;
    const explicitShipState = stateApi?.getShipState?.(this.#shipContext) ?? null;
    const explicitShipId = explicitShipState?.identity?.shipId ?? null;
    if (explicitShipId) {
      return explicitShipId === changedShipId;
    }

    const activeShipId = stateApi?.getActiveShipState?.()?.identity?.shipId ?? null;
    return activeShipId === changedShipId;
  }

  #teardownLiveRefreshSubscription() {
    if (this.#refreshTimeoutId) {
      clearTimeout(this.#refreshTimeoutId);
      this.#refreshTimeoutId = null;
    }

    const hookName = game?.[API_NAMESPACE]?.hooks?.shipStateUpdated;
    if (hookName && this.#shipStateUpdatedHookId !== null) {
      Hooks.off(hookName, this.#shipStateUpdatedHookId);
    }

    this.#shipStateUpdatedHookId = null;
    this.#ignoreNextLiveRefreshCount = 0;
  }
}
