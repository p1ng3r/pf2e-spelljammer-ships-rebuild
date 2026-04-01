import { API_NAMESPACE, MODULE_ID, MODULE_TITLE, STATIONS } from "../config/constants.js";
import { CREW_CHECK_TYPES, CREW_TASK_TYPES, PF2E_CORE_SKILLS } from "../state/ship-state.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DEFAULT_POSTURES = Object.freeze(["cautious", "standard", "hard-push", "silent-running"]);
const CUSTOM_SKILL_OPTION = "custom";

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

function toReadableSlugLabel(value) {
  if (!value) {
    return "None";
  }

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveSkillValue(selectedSkill, customSkill) {
  if (selectedSkill === CUSTOM_SKILL_OPTION) {
    return String(customSkill ?? "").trim().toLowerCase();
  }

  return String(selectedSkill ?? "").trim().toLowerCase();
}

export class ShipManagementApp extends HandlebarsApplicationMixin(ApplicationV2) {
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
    const shipState = stateApi?.getActiveShipState?.() ?? null;
    const travelState = stateApi?.getTravelState?.() ?? shipState?.arcflight ?? null;
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
    const maintenanceIssues = stateApi?.getMaintenanceIssues?.() ??
      (Array.isArray(travelState?.maintenanceIssues) ? travelState.maintenanceIssues : []);
    const travelTasks = stateApi?.getTravelTasks?.() ??
      (Array.isArray(travelState?.travelTasks) ? travelState.travelTasks : []);
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
    const stationLabelsById = STATIONS.reduce((accumulator, station) => {
      accumulator[station.id] = station.label;
      return accumulator;
    }, {});
    const skillLabelsByValue = PF2E_CORE_SKILLS.reduce((accumulator, skill) => {
      accumulator[skill.value] = skill.label;
      return accumulator;
    }, {});

    return {
      moduleTitle: MODULE_TITLE,
      hasShipState: Boolean(shipState),
      shipState,
      travelState,
      postureOptions,
      stations: STATIONS,
      activeShipId: stateApi?.getActiveShipId?.() ?? null,
      routeStatus: {
        legTarget,
        legProgress,
        legComplete,
      },
      maintenance: {
        issues: maintenanceIssues.map((issue) => ({
          ...issue,
          taskTypeLabel: toReadableSlugLabel(issue.taskType),
          checkTypeLabel: toReadableSlugLabel(issue.checkType),
          recommendedStationLabel: stationLabelsById[issue.recommendedStation] ?? null,
          recommendedSkillLabel: skillLabelsByValue[issue.recommendedSkill] ?? toReadableSlugLabel(issue.recommendedSkill),
        })),
        hasIssues: maintenanceIssues.length > 0,
      },
      travelTasks: {
        tasks: travelTasks.map((task) => ({
          ...task,
          taskTypeLabel: toReadableSlugLabel(task.taskType),
          checkTypeLabel: toReadableSlugLabel(task.checkType),
          recommendedStationLabel: stationLabelsById[task.recommendedStation] ?? null,
          recommendedSkillLabel: skillLabelsByValue[task.recommendedSkill] ?? toReadableSlugLabel(task.recommendedSkill),
        })),
        hasTasks: travelTasks.length > 0,
      },
      taskTypeOptions,
      checkTypeOptions,
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

    const root = this.element;
    if (!root) {
      return;
    }

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

    const resolveIssueButtons = root.querySelectorAll("[data-action='resolve-maintenance-issue']");
    for (const button of resolveIssueButtons) {
      button.addEventListener("click", this.#onResolveMaintenanceIssueClick.bind(this));
    }
  }

  async #onAdvanceDayClick(event) {
    event.preventDefault();
    const stateApi = game?.[API_NAMESPACE]?.state;
    await stateApi?.advanceTravelDay?.();
    this.render({ force: true });
  }

  async #onPostureChange(event) {
    const posture = event.currentTarget?.value;
    const stateApi = game?.[API_NAMESPACE]?.state;

    if (!posture || !stateApi) {
      return;
    }

    if (typeof stateApi.setTravelPosture === "function") {
      await stateApi.setTravelPosture(posture);
    } else {
      await stateApi.updateTravelState?.({ posture });
    }

    this.render({ force: true });
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

    this.render({ force: true });
  }

  async #onResetLegProgressClick(event) {
    event.preventDefault();

    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!stateApi) {
      return;
    }

    await stateApi.updateTravelState?.({
      legProgress: 0,
      daysIntoCurrentLeg: 0,
    });

    this.render({ force: true });
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

    if (!title) {
      return;
    }

    await stateApi.addMaintenanceIssue?.({
      title,
      severity,
      source: "manual",
      status: "open",
      taskType,
      checkType,
      recommendedStation,
      recommendedSkill,
      notes,
    });

    form.reset();
    this.render({ force: true });
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

    if (!title) {
      return;
    }

    await stateApi.addTravelTask?.({
      title,
      taskType,
      checkType,
      recommendedStation,
      recommendedSkill,
      summary,
      source: "manual",
      status: "open",
    });

    form.reset();
    this.render({ force: true });
  }

  async #onResolveMaintenanceIssueClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const issueId = button?.dataset?.issueId ?? "";
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!issueId || !stateApi) {
      return;
    }

    await stateApi.resolveMaintenanceIssue?.(issueId);
    this.render({ force: true });
  }
}
