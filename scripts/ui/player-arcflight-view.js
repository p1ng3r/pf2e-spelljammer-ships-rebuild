import { API_NAMESPACE, MODULE_ID, MODULE_TITLE, STATIONS, TRAVEL_TERM } from "../config/constants.js";
import { PF2E_CORE_SKILLS } from "../state/ship-state.js";

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

  return {
    term: TRAVEL_TERM,
    destination,
    posture,
    currentHex,
    legProgressLabel: `${legProgress} / ${legTarget}`,
    daysElapsed,
    statusText: legProgress >= legTarget ? "Leg complete. Awaiting next heading." : "In transit.",
  };
}

export class PlayerArcflightViewApp extends HandlebarsApplicationMixin(ApplicationV2) {
  #shipContext = null;
  #shipStateUpdatedHookId = null;
  #refreshTimeoutId = null;
  #ignoreNextLiveRefreshCount = 0;

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
    const stationPromptSourceRecords = [
      ...openEvents.map((eventRecord) => ({ ...eventRecord, source: "event" })),
      ...openIssues.map((issueRecord) => ({ ...issueRecord, source: "issue" })),
      ...responseTasks.map((taskRecord) => ({ ...taskRecord, source: "task" })),
    ];

    return {
      moduleTitle: MODULE_TITLE,
      hasShipState: true,
      shipName: shipState.identity?.name ?? "Unnamed Ship",
      voyage: toVoyageStatus(travelState),
      activeSituations: openEvents.map((eventRecord) => ({
        title: toText(eventRecord.title, "Unnamed situation"),
        statusText: toStatusText(eventRecord.status),
        urgencyText: toUrgencyText(eventRecord.severity),
        summaryText: toText(eventRecord.publicSummary, "No public details yet."),
        promptText: mapPrompt(eventRecord, stationLabelsById, skillLabelsByValue),
      })),
      shipProblems: openIssues.map((issueRecord) => ({
        title: toText(issueRecord.title, "Unnamed problem"),
        statusText: toStatusText(issueRecord.status),
        urgencyText: toUrgencyText(issueRecord.severity),
        summaryText: toText(issueRecord.publicSummary, "No public details yet."),
        promptText: mapPrompt(issueRecord, stationLabelsById, skillLabelsByValue),
      })),
      crewResponses: responseTasks.map((taskRecord) => ({
        title: toText(taskRecord.title, "Unnamed crew response"),
        statusText: toStatusText(taskRecord.status),
        summaryText: toText(taskRecord.publicSummary, "No public details yet."),
        riskText: toText(taskRecord.publicOutcome, "Outcome still uncertain."),
        promptText: mapPrompt(taskRecord, stationLabelsById, skillLabelsByValue),
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

    this.#ignoreNextLiveRefreshCount += 1;
    stateApi.addStationRequest(
      {
        stationId,
        sourceType,
        sourceId,
        title,
        status: "requested",
        requestText: `${requestActionLabel}: ${title}`,
        summary: "Player station intent recorded.",
      },
      this.#shipContext,
    );
  }

  async close(options) {
    this.#teardownLiveRefreshSubscription();
    return super.close(options);
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
