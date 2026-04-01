import { API_NAMESPACE, MODULE_ID, MODULE_TITLE, STATIONS } from "../config/constants.js";
import {
  CREW_CHECK_TYPES,
  CREW_TASK_TYPES,
  MANUAL_OUTCOME_TAGS,
  PF2E_CORE_SKILLS,
  TRAVEL_EVENT_TYPES,
} from "../state/ship-state.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DEFAULT_POSTURES = Object.freeze(["cautious", "standard", "hard-push", "silent-running"]);
const CUSTOM_SKILL_OPTION = "custom";
const STATION_REQUEST_STATUS_FLOW = Object.freeze(["requested", "active", "resolved"]);

function toLabel(posture) {
  return posture
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parsePositiveNumber(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return numericValue;
}

function parseOptionalDc(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return Math.floor(numericValue);
}

function toReadableSlugLabel(value) {
  if (!value) {
    return "None";
  }

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toSentenceOrFallback(value, fallback) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function toEventOutcomeSummaryLabel(eventRecord) {
  const resultSummary = String(eventRecord?.resultSummary ?? "").trim();
  if (resultSummary) {
    return resultSummary;
  }

  if ((eventRecord?.status ?? "") === "resolved") {
    return "Resolved manually by GM.";
  }

  return "No outcome recorded yet.";
}

function toOutcomeTagLabel(outcomeTag) {
  const normalizedTag = String(outcomeTag ?? "none").trim().toLowerCase() || "none";
  const match = MANUAL_OUTCOME_TAGS.find((tag) => tag.value === normalizedTag);
  return match?.label ?? "None";
}

function toOutcomeSummaryLabel(record) {
  return toEventOutcomeSummaryLabel(record);
}

function resolveSkillValue(selectedSkill, customSkill) {
  if (selectedSkill === CUSTOM_SKILL_OPTION) {
    return String(customSkill ?? "").trim().toLowerCase();
  }

  return String(selectedSkill ?? "").trim().toLowerCase();
}

function getEffectiveAttemptValue(attemptedValue, recommendedValue) {
  const attempted = String(attemptedValue ?? "").trim();
  if (attempted) {
    return {
      value: attempted,
      usesRecommendedDefault: false,
    };
  }

  const recommended = String(recommendedValue ?? "").trim();
  if (recommended) {
    return {
      value: recommended,
      usesRecommendedDefault: true,
    };
  }

  return {
    value: "",
    usesRecommendedDefault: false,
  };
}

export class ShipManagementApp extends HandlebarsApplicationMixin(ApplicationV2) {
  #pendingBodyScrollState = null;
  #showResolvedTravelTasks = false;
  #showResolvedMaintenanceIssues = false;
  #showResolvedTravelEvents = false;
  #showResolvedStationRequests = false;
  #shipStateUpdatedHookId = null;
  #refreshTimeoutId = null;
  #ignoreNextLiveRefreshCount = 0;
  #viewShipId = null;

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-ship-management`,
    classes: [MODULE_ID, "ship-management-app"],
    tag: "section",
    window: {
      title: `${MODULE_TITLE} | Ship Management`,
      resizable: true,
    },
    position: {
      width: 640,
      height: 520,
    },
  };

  static PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/app/ship-management-app.hbs`,
    },
  };

  async _prepareContext() {
    const api = game?.[API_NAMESPACE] ?? null;
    const stateApi = api?.state ?? null;
    const actorApi = api?.actors ?? null;
    const activeShipId = stateApi?.getActiveShipId?.() ?? null;
    const resolvedViewShipId = this.#viewShipId ?? activeShipId;
    const shipState = resolvedViewShipId
      ? stateApi?.getShipState?.({ shipId: resolvedViewShipId }) ?? null
      : stateApi?.getActiveShipState?.() ?? null;

    if (!this.#viewShipId && shipState?.identity?.shipId) {
      this.#viewShipId = shipState.identity.shipId;
    }

    const viewShipOptions = this.#getViewShipStateOptions();
    const travelState = stateApi?.getTravelState?.(viewShipOptions) ?? shipState?.arcflight ?? null;
    const linkedActorId = shipState?.identity?.actorId ?? null;
    const linkedActor = linkedActorId ? actorApi?.resolveActor?.(linkedActorId) ?? null : null;
    const postureOptions = (stateApi?.travelPostures ?? DEFAULT_POSTURES).map((posture) => ({
      value: posture,
      label: toLabel(posture),
      selected: posture === travelState?.posture,
    }));
    const legTarget = parsePositiveNumber(travelState?.legProgressMax, 1);
    const legProgress = Number(travelState?.legProgress ?? 0);
    const legComplete = legTarget > 0 && legProgress >= legTarget;
    const maintenanceIssues = stateApi?.getMaintenanceIssues?.({
        includeResolved: this.#showResolvedMaintenanceIssues,
      }) ??
      (Array.isArray(travelState?.maintenanceIssues) ? travelState.maintenanceIssues : []);
    const travelTasks = stateApi?.getTravelTasks?.({ includeResolved: this.#showResolvedTravelTasks }) ??
      (Array.isArray(travelState?.travelTasks) ? travelState.travelTasks : []);
    const travelEvents = stateApi?.getTravelEvents?.({ includeResolved: this.#showResolvedTravelEvents }) ??
      (Array.isArray(travelState?.travelEvents) ? travelState.travelEvents : []);
    const stationRequests = stateApi?.getStationRequests?.({ includeResolved: this.#showResolvedStationRequests }) ??
      (Array.isArray(travelState?.stationRequests) ? travelState.stationRequests : []);
    const allMaintenanceIssues = Array.isArray(travelState?.maintenanceIssues) ? travelState.maintenanceIssues : [];
    const allTravelTasks = Array.isArray(travelState?.travelTasks) ? travelState.travelTasks : [];
    const allTravelEvents = Array.isArray(travelState?.travelEvents) ? travelState.travelEvents : [];
    const allStationRequests = Array.isArray(travelState?.stationRequests) ? travelState.stationRequests : [];
    const openMaintenanceIssueCount = allMaintenanceIssues.filter((issue) => issue?.status !== "resolved").length;
    const openTravelTaskCount = allTravelTasks.filter((task) => task?.status !== "resolved").length;
    const openTravelEventCount = allTravelEvents.filter((travelEvent) => travelEvent?.status !== "resolved").length;
    const openStationRequestCount = allStationRequests.filter((request) => request?.status !== "resolved").length;
    const stationOptions = STATIONS.map((station) => ({ value: station.id, label: station.label }));
    const skillOptions = PF2E_CORE_SKILLS.map((skill) => ({ value: skill.value, label: skill.label }));
    const taskTypeOptions = CREW_TASK_TYPES.map((taskType) => ({
      value: taskType.value,
      label: taskType.label,
    }));
    const checkTypeOptions = CREW_CHECK_TYPES.map((checkType) => ({
      value: checkType.value,
      label: checkType.label,
    }));
    const eventTypeOptions = TRAVEL_EVENT_TYPES.map((eventType) => ({
      value: eventType.value,
      label: eventType.label,
    }));
    const outcomeTagOptions = MANUAL_OUTCOME_TAGS.map((outcomeTag) => ({
      value: outcomeTag.value,
      label: outcomeTag.label,
    }));
    const stationLabelsById = STATIONS.reduce((accumulator, station) => {
      accumulator[station.id] = station.label;
      return accumulator;
    }, {});
    const assignableActors = Array.from(game.actors ?? [])
      .filter((actor) => actor?.type === "character")
      .sort((left, right) => String(left?.name ?? "").localeCompare(String(right?.name ?? "")))
      .map((actor) => ({
        id: actor.id,
        name: actor.name ?? actor.id,
      }));
    const stationAssignments = shipState?.crew?.stations ?? {};
    const stationAssignmentRows = STATIONS.map((station) => {
      const stationAssignment = stationAssignments[station.id] ?? { actorId: null, isNpcCrew: false };
      const assignedActorId = String(stationAssignment.actorId ?? "").trim();
      const assignedActor = assignedActorId ? actorApi?.resolveActor?.(assignedActorId) ?? null : null;
      const currentAssignedLabel = assignedActor?.name ??
        (assignedActorId ? "Missing actor document" : "Unassigned");

      return {
        stationId: station.id,
        stationLabel: station.label,
        assignedActorId,
        assignedActorName: currentAssignedLabel,
        isNpcCrew: Boolean(stationAssignment.isNpcCrew),
        isUnassigned: !assignedActorId,
        actorOptions: assignableActors.map((actor) => ({
          value: actor.id,
          label: actor.name,
          selected: actor.id === assignedActorId,
        })),
      };
    });
    const skillLabelsByValue = PF2E_CORE_SKILLS.reduce((accumulator, skill) => {
      accumulator[skill.value] = skill.label;
      return accumulator;
    }, {});
    const stationRequestViewModels = stationRequests.map((request) => {
      const currentStatus = String(request?.status ?? "requested").trim().toLowerCase();
      const nextStatus = STATION_REQUEST_STATUS_FLOW[
        Math.min(
          STATION_REQUEST_STATUS_FLOW.indexOf(currentStatus) + 1,
          STATION_REQUEST_STATUS_FLOW.length - 1,
        )
      ];

      return {
        ...request,
        statusLabel: toReadableSlugLabel(currentStatus),
        sourceTypeLabel: toReadableSlugLabel(request?.sourceType ?? "task"),
        stationLabel: stationLabelsById[request?.stationId] ?? "Unassigned",
        requestTextLabel: toSentenceOrFallback(request?.requestText, "No request text provided."),
        summaryLabel: toSentenceOrFallback(request?.summary, "No summary provided."),
        canAdvanceStatus: currentStatus !== "resolved",
        nextStatus,
        nextStatusLabel: toReadableSlugLabel(nextStatus),
        statusOptions: STATION_REQUEST_STATUS_FLOW.map((statusValue) => ({
          value: statusValue,
          label: toReadableSlugLabel(statusValue),
          selected: statusValue === currentStatus,
        })),
      };
    });
    const travelTaskViewModels = travelTasks.map((task) => {
      const stationAttemptValue = getEffectiveAttemptValue(task.attemptedByStation, task.recommendedStation);
      const skillAttemptValue = getEffectiveAttemptValue(task.attemptedSkill, task.recommendedSkill);

      return {
        ...task,
        statusLabel: toReadableSlugLabel(task.status ?? "open"),
        taskTypeLabel: toReadableSlugLabel(task.taskType),
        checkTypeLabel: toReadableSlugLabel(task.checkType),
        recommendedStationLabel: stationLabelsById[task.recommendedStation] ?? null,
        recommendedSkillLabel: skillLabelsByValue[task.recommendedSkill] ?? toReadableSlugLabel(task.recommendedSkill),
        attemptedByStationLabel: stationLabelsById[task.attemptedByStation] ?? null,
        attemptedSkillLabel: skillLabelsByValue[task.attemptedSkill] ?? toReadableSlugLabel(task.attemptedSkill),
        dcLabel: Number.isFinite(Number(task.dc)) ? Math.floor(Number(task.dc)) : null,
        effectiveAttemptedByStation: stationAttemptValue.value,
        effectiveAttemptedSkill: skillAttemptValue.value,
        attemptUsesRecommendedDefaults: stationAttemptValue.usesRecommendedDefault || skillAttemptValue.usesRecommendedDefault,
        outcomeTagOptions: outcomeTagOptions.map((outcomeTag) => ({
          ...outcomeTag,
          selected: outcomeTag.value === (task.outcomeTag ?? "none"),
        })),
        outcomeTagLabel: toOutcomeTagLabel(task.outcomeTag),
        outcomeSummaryLabel: toOutcomeSummaryLabel(task),
      };
    });
    const travelTasksById = travelTasks.reduce((accumulator, task) => {
      if (task?.id) {
        accumulator[task.id] = task;
      }

      return accumulator;
    }, {});
    const travelEventViewModels = travelEvents.map((travelEvent) => {
      const stationAttemptValue = getEffectiveAttemptValue(
        travelEvent.attemptedByStation,
        travelEvent.recommendedStation,
      );
      const skillAttemptValue = getEffectiveAttemptValue(travelEvent.attemptedSkill, travelEvent.recommendedSkill);

      return {
        ...travelEvent,
        statusLabel: toReadableSlugLabel(travelEvent.status ?? "open"),
        severityLabel: toReadableSlugLabel(travelEvent.severity),
        eventTypeLabel: toReadableSlugLabel(travelEvent.eventType),
        checkTypeLabel: toReadableSlugLabel(travelEvent.checkType),
        recommendedStationLabel: stationLabelsById[travelEvent.recommendedStation] ?? null,
        recommendedSkillLabel: skillLabelsByValue[travelEvent.recommendedSkill] ??
          toReadableSlugLabel(travelEvent.recommendedSkill),
        attemptedByStationLabel: stationLabelsById[travelEvent.attemptedByStation] ?? null,
        attemptedSkillLabel: skillLabelsByValue[travelEvent.attemptedSkill] ??
          toReadableSlugLabel(travelEvent.attemptedSkill),
        effectiveAttemptedByStation: stationAttemptValue.value,
        effectiveAttemptedSkill: skillAttemptValue.value,
        attemptUsesRecommendedDefaults:
          stationAttemptValue.usesRecommendedDefault || skillAttemptValue.usesRecommendedDefault,
        linkedTaskTitle: travelTasksById[travelEvent.linkedTaskId]?.title ?? null,
        dcLabel: Number.isFinite(Number(travelEvent.dc)) ? Math.floor(Number(travelEvent.dc)) : null,
        statusSummaryLabel: `Status: ${toReadableSlugLabel(travelEvent.status ?? "open")}`,
        attemptSummaryLabel: toSentenceOrFallback(
          travelEvent.lastAttemptSummary || travelEvent.summary,
          "No attempt summary recorded yet.",
        ),
        outcomeTagOptions: outcomeTagOptions.map((outcomeTag) => ({
          ...outcomeTag,
          selected: outcomeTag.value === (travelEvent.outcomeTag ?? "none"),
        })),
        outcomeTagLabel: toOutcomeTagLabel(travelEvent.outcomeTag),
        outcomeSummaryLabel: toOutcomeSummaryLabel(travelEvent),
      };
    });

    return {
      moduleTitle: MODULE_TITLE,
      hasShipState: Boolean(shipState),
      shipState,
      travelState,
      postureOptions,
      stations: STATIONS,
      stationAssignments: {
        rows: stationAssignmentRows,
        hasAssignableActors: assignableActors.length > 0,
      },
      activeShipId: this.#viewShipId ?? activeShipId,
      routeStatus: {
        legTarget,
        legProgress,
        legComplete,
      },
      maintenance: {
        issues: maintenanceIssues.map((issue) => ({
          ...issue,
          statusLabel: toReadableSlugLabel(issue.status ?? "open"),
          taskTypeLabel: toReadableSlugLabel(issue.taskType),
          checkTypeLabel: toReadableSlugLabel(issue.checkType),
          recommendedStationLabel: stationLabelsById[issue.recommendedStation] ?? null,
          recommendedSkillLabel: skillLabelsByValue[issue.recommendedSkill] ?? toReadableSlugLabel(issue.recommendedSkill),
          dcLabel: Number.isFinite(Number(issue.dc)) ? Math.floor(Number(issue.dc)) : null,
          outcomeTagOptions: outcomeTagOptions.map((outcomeTag) => ({
            ...outcomeTag,
            selected: outcomeTag.value === (issue.outcomeTag ?? "none"),
          })),
          outcomeTagLabel: toOutcomeTagLabel(issue.outcomeTag),
          outcomeSummaryLabel: toOutcomeSummaryLabel(issue),
        })),
        hasIssues: maintenanceIssues.length > 0,
        showResolved: this.#showResolvedMaintenanceIssues,
        openCount: openMaintenanceIssueCount,
      },
      travelTasks: {
        tasks: travelTaskViewModels,
        hasTasks: travelTasks.length > 0,
        showResolved: this.#showResolvedTravelTasks,
        openCount: openTravelTaskCount,
      },
      travelEvents: {
        events: travelEventViewModels,
        hasEvents: travelEvents.length > 0,
        showResolved: this.#showResolvedTravelEvents,
        openCount: openTravelEventCount,
      },
      stationRequests: {
        requests: stationRequestViewModels,
        hasRequests: stationRequests.length > 0,
        showResolved: this.#showResolvedStationRequests,
        openCount: openStationRequestCount,
      },
      taskTypeOptions,
      checkTypeOptions,
      eventTypeOptions,
      outcomeTagOptions,
      stationOptions,
      skillOptions,
      customSkillOption: CUSTOM_SKILL_OPTION,
      actorContext: {
        actorId: linkedActorId,
        actorName: linkedActor?.name ?? null,
        actorType: linkedActor?.type ?? null,
        missingActor: Boolean(linkedActorId && !linkedActor),
      },
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.#ensureLiveRefreshSubscription();

    const root = this.element;
    if (!root) {
      return;
    }

    this.#restoreBodyScrollPosition(root);
    this.#hydrateTravelTaskAttemptInputs(root);
    this.#hydrateTravelEventAttemptInputs(root);

    const advanceDayButton = root.querySelector("[data-action='advance-day']");
    advanceDayButton?.addEventListener("click", this.#onAdvanceDayClick.bind(this));

    const postureSelect = root.querySelector("[data-action='set-posture']");
    postureSelect?.addEventListener("change", this.#onPostureChange.bind(this));

    const routeForm = root.querySelector("[data-action='route-leg-form']");
    routeForm?.addEventListener("submit", this.#onRouteLegSubmit.bind(this));

    const resetLegButton = root.querySelector("[data-action='reset-leg-progress']");
    resetLegButton?.addEventListener("click", this.#onResetLegProgressClick.bind(this));

    const addIssueForm = root.querySelector("[data-action='maintenance-issue-form']");
    addIssueForm?.addEventListener("submit", this.#onMaintenanceIssueSubmit.bind(this));

    const addTravelTaskForm = root.querySelector("[data-action='travel-task-form']");
    addTravelTaskForm?.addEventListener("submit", this.#onTravelTaskSubmit.bind(this));
    const addTravelEventForm = root.querySelector("[data-action='travel-event-form']");
    addTravelEventForm?.addEventListener("submit", this.#onTravelEventSubmit.bind(this));

    const resolveIssueButtons = root.querySelectorAll("[data-action='resolve-maintenance-issue']");
    for (const button of resolveIssueButtons) {
      button.addEventListener("click", this.#onResolveMaintenanceIssueClick.bind(this));
    }

    const attemptTaskButtons = root.querySelectorAll("[data-action='attempt-travel-task']");
    for (const button of attemptTaskButtons) {
      button.addEventListener("click", this.#onAttemptTravelTaskClick.bind(this));
    }

    const resolveTaskButtons = root.querySelectorAll("[data-action='resolve-travel-task']");
    for (const button of resolveTaskButtons) {
      button.addEventListener("click", this.#onResolveTravelTaskClick.bind(this));
    }

    const resolveEventButtons = root.querySelectorAll("[data-action='resolve-travel-event']");
    for (const button of resolveEventButtons) {
      button.addEventListener("click", this.#onResolveTravelEventClick.bind(this));
    }

    const attemptEventButtons = root.querySelectorAll("[data-action='attempt-travel-event']");
    for (const button of attemptEventButtons) {
      button.addEventListener("click", this.#onAttemptTravelEventClick.bind(this));
    }

    const createTaskFromEventButtons = root.querySelectorAll("[data-action='create-task-from-event']");
    for (const button of createTaskFromEventButtons) {
      button.addEventListener("click", this.#onCreateTaskFromEventClick.bind(this));
    }

    const resolvedToggleInputs = root.querySelectorAll("[data-action='toggle-resolved-visibility']");
    for (const input of resolvedToggleInputs) {
      input.addEventListener("change", this.#onResolvedVisibilityToggle.bind(this));
    }

    const saveTaskOutcomeButtons = root.querySelectorAll("[data-action='save-travel-task-outcome']");
    for (const button of saveTaskOutcomeButtons) {
      button.addEventListener("click", this.#onSaveTravelTaskOutcomeClick.bind(this));
    }

    const saveIssueOutcomeButtons = root.querySelectorAll("[data-action='save-maintenance-issue-outcome']");
    for (const button of saveIssueOutcomeButtons) {
      button.addEventListener("click", this.#onSaveMaintenanceIssueOutcomeClick.bind(this));
    }

    const saveEventOutcomeButtons = root.querySelectorAll("[data-action='save-travel-event-outcome']");
    for (const button of saveEventOutcomeButtons) {
      button.addEventListener("click", this.#onSaveTravelEventOutcomeClick.bind(this));
    }

    const saveEventDcButtons = root.querySelectorAll("[data-action='save-travel-event-dc']");
    for (const button of saveEventDcButtons) {
      button.addEventListener("click", this.#onSaveTravelEventDcClick.bind(this));
    }

    const saveTaskDcButtons = root.querySelectorAll("[data-action='save-travel-task-dc']");
    for (const button of saveTaskDcButtons) {
      button.addEventListener("click", this.#onSaveTravelTaskDcClick.bind(this));
    }

    const saveIssueDcButtons = root.querySelectorAll("[data-action='save-maintenance-issue-dc']");
    for (const button of saveIssueDcButtons) {
      button.addEventListener("click", this.#onSaveMaintenanceIssueDcClick.bind(this));
    }

    const saveStationRequestStatusButtons = root.querySelectorAll("[data-action='save-station-request-status']");
    for (const button of saveStationRequestStatusButtons) {
      button.addEventListener("click", this.#onSaveStationRequestStatusClick.bind(this));
    }

    const advanceStationRequestStatusButtons = root.querySelectorAll("[data-action='advance-station-request-status']");
    for (const button of advanceStationRequestStatusButtons) {
      button.addEventListener("click", this.#onAdvanceStationRequestStatusClick.bind(this));
    }

    const assignStationActorButtons = root.querySelectorAll("[data-action='assign-station-actor']");
    for (const button of assignStationActorButtons) {
      button.addEventListener("click", this.#onAssignStationActorClick.bind(this));
    }

    const clearStationActorButtons = root.querySelectorAll("[data-action='clear-station-actor']");
    for (const button of clearStationActorButtons) {
      button.addEventListener("click", this.#onClearStationActorClick.bind(this));
    }
  }

  async #onAssignStationActorClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const stationId = String(button?.dataset?.stationId ?? "").trim();
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!stationId || !stateApi) {
      return;
    }

    const row = button.closest("[data-station-id]");
    const actorSelect = row?.querySelector("[name='stationAssignedActorId']");
    const assignedActorId = String(actorSelect?.value ?? "").trim();

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.assignStationActor?.(stationId, assignedActorId || null, this.#getViewShipStateOptions());
    }, event.currentTarget);
  }

  async #onClearStationActorClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const stationId = String(button?.dataset?.stationId ?? "").trim();
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!stationId || !stateApi) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.clearStationActor?.(stationId, this.#getViewShipStateOptions());
    }, event.currentTarget);
  }

  async #onAdvanceDayClick(event) {
    event.preventDefault();
    const stateApi = game?.[API_NAMESPACE]?.state;
    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi?.advanceTravelDay?.();
    }, event.currentTarget);
  }

  async #onPostureChange(event) {
    const posture = event.currentTarget?.value;
    const stateApi = game?.[API_NAMESPACE]?.state;

    if (!posture || !stateApi) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      if (typeof stateApi.setTravelPosture === "function") {
        await stateApi.setTravelPosture(posture);
      } else {
        await stateApi.updateTravelState?.({ posture });
      }
    }, event.currentTarget);
  }

  async #onRouteLegSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!form || !stateApi) {
      return;
    }

    const formData = new FormData(form);
    const destination = String(formData.get("destination") ?? "");
    const legDistanceValue = formData.get("legDistance");
    const legProgressMaxValue = formData.get("legProgressMax");

    const currentTravelState = stateApi.getTravelState?.() ?? {};
    const legDistance = parsePositiveNumber(legDistanceValue, currentTravelState.legDistance ?? 1);
    const legProgressMax = parsePositiveNumber(
      legProgressMaxValue,
      currentTravelState.legProgressMax ?? legDistance,
    );

    await this.#rerenderWithPreservedBodyScroll(async () => {
      if (typeof stateApi.setTravelDestination === "function") {
        await stateApi.setTravelDestination(destination);
      } else {
        await stateApi.updateTravelState?.({ destination: destination.trim() || null });
      }

      if (typeof stateApi.setTravelLeg === "function") {
        await stateApi.setTravelLeg({ legDistance, legProgressMax });
      } else {
        await stateApi.updateTravelState?.({ legDistance, legProgressMax });
      }
    }, event.currentTarget);
  }

  async #onResetLegProgressClick(event) {
    event.preventDefault();

    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!stateApi) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateTravelState?.({
        legProgress: 0,
        daysIntoCurrentLeg: 0,
      });
    }, event.currentTarget);
  }

  async #onMaintenanceIssueSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!form || !stateApi) {
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("issueTitle") ?? "").trim();
    const severity = String(formData.get("issueSeverity") ?? "minor").trim();
    const recommendedStation = String(formData.get("issueRecommendedStation") ?? "").trim();
    const recommendedSkill = resolveSkillValue(
      formData.get("issueRecommendedSkill"),
      formData.get("issueRecommendedSkillCustom"),
    );
    const taskType = String(formData.get("issueTaskType") ?? "maintenance").trim();
    const checkType = String(formData.get("issueCheckType") ?? "skill").trim();
    const notes = String(formData.get("issueNotes") ?? "").trim();
    const publicSummary = String(formData.get("issuePublicSummary") ?? "").trim();
    const publicOutcome = String(formData.get("issuePublicOutcome") ?? "").trim();
    const dc = parseOptionalDc(formData.get("issueDc"));

    if (!title) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.addMaintenanceIssue?.({
        title,
        severity,
        source: "manual",
        status: "open",
        taskType,
        checkType,
        recommendedStation,
        recommendedSkill,
        dc,
        notes,
        publicSummary,
        publicOutcome,
      });
    }, event.currentTarget);

    form.reset();
  }

  async #onTravelTaskSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!form || !stateApi) {
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("travelTaskTitle") ?? "").trim();
    const taskType = String(formData.get("travelTaskType") ?? "travel").trim();
    const checkType = String(formData.get("travelTaskCheckType") ?? "skill").trim();
    const recommendedStation = String(formData.get("travelTaskRecommendedStation") ?? "").trim();
    const recommendedSkill = resolveSkillValue(
      formData.get("travelTaskRecommendedSkill"),
      formData.get("travelTaskRecommendedSkillCustom"),
    );
    const summary = String(formData.get("travelTaskSummary") ?? "").trim();
    const publicSummary = String(formData.get("travelTaskPublicSummary") ?? "").trim();
    const publicOutcome = String(formData.get("travelTaskPublicOutcome") ?? "").trim();
    const dc = parseOptionalDc(formData.get("travelTaskDc"));

    if (!title) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.addTravelTask?.({
        title,
        taskType,
        checkType,
        recommendedStation,
        recommendedSkill,
        dc,
        summary,
        publicSummary,
        publicOutcome,
        source: "manual",
        status: "open",
      });
    }, event.currentTarget);

    form.reset();
  }

  async #onResolveMaintenanceIssueClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const issueId = button?.dataset?.issueId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!issueId || !stateApi) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.resolveMaintenanceIssue?.(issueId);
    }, event.currentTarget);
  }

  async #onAttemptTravelTaskClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const taskId = button?.dataset?.taskId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!taskId || !stateApi) {
      return;
    }

    const row = button.closest("[data-travel-task-id]");
    const summaryInput = row?.querySelector("[name='travelTaskAttemptSummary']");
    const attemptedByStationInput = row?.querySelector("[name='travelTaskAttemptedByStation']");
    const attemptedSkillInput = row?.querySelector("[name='travelTaskAttemptedSkill']");
    const lastAttemptSummary = String(summaryInput?.value ?? "").trim();
    const attemptedByStation = String(attemptedByStationInput?.value ?? "").trim();
    const attemptedSkill = String(attemptedSkillInput?.value ?? "").trim().toLowerCase();

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.attemptTravelTask?.(taskId, {
        lastAttemptSummary,
        summary: lastAttemptSummary || undefined,
        attemptedByStation: attemptedByStation || null,
        attemptedSkill: attemptedSkill || null,
      });
    }, event.currentTarget);
  }

  async #onResolveTravelTaskClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const taskId = button?.dataset?.taskId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!taskId || !stateApi) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.resolveTravelTask?.(taskId);
    }, event.currentTarget);
  }

  async #onSaveTravelTaskOutcomeClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const taskId = button?.dataset?.taskId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!taskId || !stateApi) {
      return;
    }

    const row = button.closest("[data-travel-task-id]");
    const outcomeInput = row?.querySelector("[name='travelTaskOutcomeSummary']");
    const outcomeTagInput = row?.querySelector("[name='travelTaskOutcomeTag']");
    const publicSummaryInput = row?.querySelector("[name='travelTaskPublicSummary']");
    const publicOutcomeInput = row?.querySelector("[name='travelTaskPublicOutcome']");
    const resultSummary = String(outcomeInput?.value ?? "").trim();
    const publicSummary = String(publicSummaryInput?.value ?? "").trim();
    const publicOutcome = String(publicOutcomeInput?.value ?? "").trim();
    const outcomeTag = String(outcomeTagInput?.value ?? "none").trim().toLowerCase();

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateTravelTask?.(taskId, {
        resultSummary: resultSummary || null,
        publicSummary: publicSummary || null,
        publicOutcome: publicOutcome || null,
        outcomeTag,
      });
    }, event.currentTarget);
  }

  async #onTravelEventSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!form || !stateApi) {
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("travelEventTitle") ?? "").trim();
    const severity = String(formData.get("travelEventSeverity") ?? "minor").trim();
    const eventType = String(formData.get("travelEventType") ?? "other").trim();
    const checkType = String(formData.get("travelEventCheckType") ?? "skill").trim();
    const dc = parseOptionalDc(formData.get("travelEventDc"));
    const recommendedStation = String(formData.get("travelEventRecommendedStation") ?? "").trim();
    const recommendedSkill = resolveSkillValue(
      formData.get("travelEventRecommendedSkill"),
      formData.get("travelEventRecommendedSkillCustom"),
    );
    const summary = String(formData.get("travelEventSummary") ?? "").trim();
    const notes = String(formData.get("travelEventNotes") ?? "").trim();
    const publicSummary = String(formData.get("travelEventPublicSummary") ?? "").trim();
    const publicOutcome = String(formData.get("travelEventPublicOutcome") ?? "").trim();

    if (!title) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.addTravelEvent?.({
        title,
        severity,
        eventType,
        status: "open",
        recommendedStation,
        recommendedSkill,
        checkType,
        dc,
        summary,
        notes,
        publicSummary,
        publicOutcome,
        source: "manual",
      });
    }, event.currentTarget);

    form.reset();
  }

  async #onAttemptTravelEventClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const eventId = button?.dataset?.eventId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!eventId || !stateApi) {
      return;
    }

    const row = button.closest("[data-travel-event-id]");
    const summaryInput = row?.querySelector("[name='travelEventAttemptSummary']");
    const attemptedByStationInput = row?.querySelector("[name='travelEventAttemptedByStation']");
    const attemptedSkillInput = row?.querySelector("[name='travelEventAttemptedSkill']");
    const lastAttemptSummary = String(summaryInput?.value ?? "").trim();
    const attemptedByStation = String(attemptedByStationInput?.value ?? "").trim();
    const attemptedSkill = String(attemptedSkillInput?.value ?? "").trim().toLowerCase();

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.attemptTravelEvent?.(eventId, {
        lastAttemptSummary,
        summary: lastAttemptSummary || undefined,
        attemptedByStation: attemptedByStation || null,
        attemptedSkill: attemptedSkill || null,
      });
    }, event.currentTarget);
  }

  async #onResolveTravelEventClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const eventId = button?.dataset?.eventId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!eventId || !stateApi) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.resolveTravelEvent?.(eventId);
    }, event.currentTarget);
  }

  async #onSaveTravelEventOutcomeClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const eventId = button?.dataset?.eventId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!eventId || !stateApi) {
      return;
    }

    const row = button.closest("[data-travel-event-id]");
    const outcomeInput = row?.querySelector("[name='travelEventOutcomeSummary']");
    const outcomeTagInput = row?.querySelector("[name='travelEventOutcomeTag']");
    const publicSummaryInput = row?.querySelector("[name='travelEventPublicSummary']");
    const publicOutcomeInput = row?.querySelector("[name='travelEventPublicOutcome']");
    const resultSummary = String(outcomeInput?.value ?? "").trim();
    const publicSummary = String(publicSummaryInput?.value ?? "").trim();
    const publicOutcome = String(publicOutcomeInput?.value ?? "").trim();
    const outcomeTag = String(outcomeTagInput?.value ?? "none").trim().toLowerCase();

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateTravelEvent?.(eventId, {
        resultSummary: resultSummary || null,
        publicSummary: publicSummary || null,
        publicOutcome: publicOutcome || null,
        outcomeTag,
      });
    }, event.currentTarget);
  }

  async #onSaveTravelEventDcClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const eventId = button?.dataset?.eventId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!eventId || !stateApi) {
      return;
    }

    const row = button.closest("[data-travel-event-id]");
    const dcInput = row?.querySelector("[name='travelEventDc']");
    const dc = parseOptionalDc(dcInput?.value);

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateTravelEvent?.(eventId, {
        dc,
      });
    }, event.currentTarget);
  }

  async #onSaveTravelTaskDcClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const taskId = button?.dataset?.taskId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!taskId || !stateApi) {
      return;
    }

    const row = button.closest("[data-travel-task-id]");
    const dcInput = row?.querySelector("[name='travelTaskDc']");
    const dc = parseOptionalDc(dcInput?.value);

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateTravelTask?.(taskId, {
        dc,
      });
    }, event.currentTarget);
  }

  async #onCreateTaskFromEventClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const eventId = button?.dataset?.eventId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!eventId || !stateApi) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.createTravelTaskFromEvent?.(eventId);
    }, event.currentTarget);
  }

  async #onSaveMaintenanceIssueOutcomeClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const issueId = button?.dataset?.issueId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!issueId || !stateApi) {
      return;
    }

    const row = button.closest("[data-maintenance-issue-id]");
    const outcomeInput = row?.querySelector("[name='maintenanceIssueOutcomeSummary']");
    const outcomeTagInput = row?.querySelector("[name='maintenanceIssueOutcomeTag']");
    const publicSummaryInput = row?.querySelector("[name='maintenanceIssuePublicSummary']");
    const publicOutcomeInput = row?.querySelector("[name='maintenanceIssuePublicOutcome']");
    const resultSummary = String(outcomeInput?.value ?? "").trim();
    const publicSummary = String(publicSummaryInput?.value ?? "").trim();
    const publicOutcome = String(publicOutcomeInput?.value ?? "").trim();
    const outcomeTag = String(outcomeTagInput?.value ?? "none").trim().toLowerCase();

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateMaintenanceIssue?.(issueId, {
        resultSummary: resultSummary || null,
        publicSummary: publicSummary || null,
        publicOutcome: publicOutcome || null,
        outcomeTag,
      });
    }, event.currentTarget);
  }

  async #onSaveMaintenanceIssueDcClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const issueId = button?.dataset?.issueId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!issueId || !stateApi) {
      return;
    }

    const row = button.closest("[data-maintenance-issue-id]");
    const dcInput = row?.querySelector("[name='maintenanceIssueDc']");
    const dc = parseOptionalDc(dcInput?.value);

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateMaintenanceIssue?.(issueId, {
        dc,
      });
    }, event.currentTarget);
  }

  async #onResolvedVisibilityToggle(event) {
    const input = event.currentTarget;
    const group = String(input?.dataset?.group ?? "").trim();
    const checked = Boolean(input?.checked);

    if (group === "travel-tasks") {
      this.#showResolvedTravelTasks = checked;
    } else if (group === "maintenance-issues") {
      this.#showResolvedMaintenanceIssues = checked;
    } else if (group === "travel-events") {
      this.#showResolvedTravelEvents = checked;
    } else if (group === "station-requests") {
      this.#showResolvedStationRequests = checked;
    } else {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {}, event.currentTarget);
  }

  async #rerenderWithPreservedBodyScroll(action, sourceElement = null) {
    this.#pendingBodyScrollState = this.#captureBodyScrollState(sourceElement);
    this.#ignoreNextLiveRefreshCount += 1;
    await action?.();
    this.render({ force: true });
  }

  #getViewShipStateOptions() {
    if (!this.#viewShipId) {
      return {};
    }

    return { shipId: this.#viewShipId };
  }

  async close(options) {
    this.#teardownLiveRefreshSubscription();
    return super.close(options);
  }

  #getBodyScrollContainer(root = this.element) {
    return root?.querySelector(".ship-management-body") ?? null;
  }

  #captureBodyScrollState(sourceElement) {
    const scrollContainer = this.#getBodyScrollContainer();
    if (!scrollContainer) {
      return null;
    }

    const state = {
      scrollTop: scrollContainer.scrollTop ?? 0,
      anchorSelector: null,
      anchorOffsetTop: null,
    };

    const anchorRow =
      sourceElement?.closest?.(
        "[data-travel-task-id], [data-travel-event-id], [data-maintenance-issue-id], [data-station-request-id]",
      ) ?? this.#findFirstVisibleTravelRow(scrollContainer);
    if (!anchorRow?.dataset) {
      return state;
    }

    const taskId = String(anchorRow.dataset.travelTaskId ?? "").trim();
    if (taskId) {
      state.anchorSelector = `[data-travel-task-id="${taskId}"]`;
      state.anchorOffsetTop = anchorRow.offsetTop - scrollContainer.scrollTop;
      return state;
    }

    const eventId = String(anchorRow.dataset.travelEventId ?? "").trim();
    if (eventId) {
      state.anchorSelector = `[data-travel-event-id="${eventId}"]`;
      state.anchorOffsetTop = anchorRow.offsetTop - scrollContainer.scrollTop;
      return state;
    }

    const issueId = String(anchorRow.dataset.maintenanceIssueId ?? "").trim();
    if (issueId) {
      state.anchorSelector = `[data-maintenance-issue-id="${issueId}"]`;
      state.anchorOffsetTop = anchorRow.offsetTop - scrollContainer.scrollTop;
      return state;
    }

    const requestId = String(anchorRow.dataset.stationRequestId ?? "").trim();
    if (requestId) {
      state.anchorSelector = `[data-station-request-id="${requestId}"]`;
      state.anchorOffsetTop = anchorRow.offsetTop - scrollContainer.scrollTop;
    }

    return state;
  }

  #findFirstVisibleTravelRow(scrollContainer) {
    const candidateRows = scrollContainer.querySelectorAll(
      "[data-travel-task-id], [data-travel-event-id], [data-maintenance-issue-id], [data-station-request-id]",
    );
    const currentScrollTop = scrollContainer.scrollTop ?? 0;

    for (const row of candidateRows) {
      if (row.offsetTop >= currentScrollTop) {
        return row;
      }
    }

    return candidateRows[candidateRows.length - 1] ?? null;
  }

  #restoreBodyScrollPosition(root) {
    if (!this.#pendingBodyScrollState) {
      return;
    }

    const pendingScrollState = this.#pendingBodyScrollState;
    this.#pendingBodyScrollState = null;
    const scrollContainer = this.#getBodyScrollContainer(root);
    if (!scrollContainer) {
      return;
    }

    requestAnimationFrame(() => {
      if (pendingScrollState.anchorSelector && Number.isFinite(pendingScrollState.anchorOffsetTop)) {
        const anchorRow = scrollContainer.querySelector(pendingScrollState.anchorSelector);
        if (anchorRow) {
          scrollContainer.scrollTop = Math.max(0, anchorRow.offsetTop - pendingScrollState.anchorOffsetTop);
          return;
        }
      }

      scrollContainer.scrollTop = pendingScrollState.scrollTop ?? 0;
      requestAnimationFrame(() => {
        if (Number.isFinite(pendingScrollState.scrollTop)) {
          scrollContainer.scrollTop = pendingScrollState.scrollTop;
        }
      });
    });
  }

  #hydrateTravelTaskAttemptInputs(root) {
    const taskRows = root.querySelectorAll("[data-travel-task-id]");
    for (const row of taskRows) {
      const attemptedByStation = String(row.dataset.effectiveAttemptedByStation ?? "").trim();
      const attemptedSkill = String(row.dataset.effectiveAttemptedSkill ?? "").trim();
      const attemptedByStationSelect = row.querySelector("[name='travelTaskAttemptedByStation']");
      const attemptedSkillSelect = row.querySelector("[name='travelTaskAttemptedSkill']");

      if (attemptedByStationSelect) {
        attemptedByStationSelect.value = attemptedByStation;
      }

      if (attemptedSkillSelect) {
        attemptedSkillSelect.value = attemptedSkill;
      }
    }
  }

  #hydrateTravelEventAttemptInputs(root) {
    const eventRows = root.querySelectorAll("[data-travel-event-id]");
    for (const row of eventRows) {
      const attemptedByStation = String(row.dataset.effectiveAttemptedByStation ?? "").trim();
      const attemptedSkill = String(row.dataset.effectiveAttemptedSkill ?? "").trim();
      const attemptedByStationSelect = row.querySelector("[name='travelEventAttemptedByStation']");
      const attemptedSkillSelect = row.querySelector("[name='travelEventAttemptedSkill']");

      if (attemptedByStationSelect) {
        attemptedByStationSelect.value = attemptedByStation;
      }

      if (attemptedSkillSelect) {
        attemptedSkillSelect.value = attemptedSkill;
      }
    }
  }

  async #onSaveStationRequestStatusClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const requestId = button?.dataset?.requestId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!requestId || !stateApi) {
      return;
    }

    const row = button.closest("[data-station-request-id]");
    const statusInput = row?.querySelector("[name='stationRequestStatus']");
    const status = String(statusInput?.value ?? "requested").trim().toLowerCase();

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateStationRequest?.(requestId, { status });
    }, event.currentTarget);
  }

  async #onAdvanceStationRequestStatusClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const requestId = button?.dataset?.requestId ?? "";
    const nextStatus = String(button?.dataset?.nextStatus ?? "active").trim().toLowerCase();
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!requestId || !stateApi) {
      return;
    }

    await this.#rerenderWithPreservedBodyScroll(async () => {
      await stateApi.updateStationRequest?.(requestId, { status: nextStatus });
    }, event.currentTarget);
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

      const observedShipId = this.#viewShipId;
      const changedShipId = payload?.shipId ?? null;
      if (!observedShipId || changedShipId !== observedShipId) {
        return;
      }

      this.#pendingBodyScrollState = this.#captureBodyScrollState();
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
