import { STATIONS, TRAVEL_TERM } from "../config/constants.js";

export const DEFAULT_SHARED_SHIP_ID = "shared-default";

function cloneData(data) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data));
}

function applyTravelStatePatch(currentTravelState, updaterOrPartial) {
  if (typeof updaterOrPartial === "function") {
    const nextTravelState = updaterOrPartial(cloneData(currentTravelState));
    return nextTravelState ?? currentTravelState;
  }

  if (updaterOrPartial && typeof updaterOrPartial === "object") {
    return {
      ...currentTravelState,
      ...updaterOrPartial,
    };
  }

  return currentTravelState;
}

function clampPressure(value) {
  return Math.max(0, Math.min(100, value));
}

function normalizePositiveNumber(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return numericValue;
}

function normalizeIssueText(value, fallback) {
  const textValue = typeof value === "string" ? value.trim() : "";
  return textValue || fallback;
}

function normalizeIssueSeverity(value) {
  const severity = normalizeIssueText(value, "minor").toLowerCase();
  const allowedSeverities = ["minor", "moderate", "major", "critical"];
  return allowedSeverities.includes(severity) ? severity : "minor";
}

function normalizeIssueStatus(value) {
  const status = normalizeIssueText(value, "open").toLowerCase();
  const allowedStatuses = ["open", "resolved"];
  return allowedStatuses.includes(status) ? status : "open";
}

function normalizeTaskType(value, fallback = "general") {
  const taskType = normalizeIssueText(value, fallback).toLowerCase();
  const allowedTaskTypes = ["general", "travel", "maintenance", "repair", "navigation", "engineering"];
  return allowedTaskTypes.includes(taskType) ? taskType : fallback;
}

function normalizeCheckType(value) {
  const checkType = normalizeIssueText(value, "skill").toLowerCase();
  const allowedCheckTypes = ["skill", "lore", "save", "other"];
  return allowedCheckTypes.includes(checkType) ? checkType : "skill";
}

function normalizeRecommendedStation(value) {
  const stationText = normalizeIssueText(value, "");
  if (!stationText) {
    return null;
  }

  const normalizedInput = stationText.toLowerCase();
  const stationMatch = STATIONS.find(
    (station) => station.id.toLowerCase() === normalizedInput || station.label.toLowerCase() === normalizedInput,
  );

  return stationMatch?.label ?? null;
}

function normalizeRecommendedSkill(value) {
  const skill = normalizeIssueText(value, "");
  return skill || null;
}

function normalizeTaskNotes(value) {
  const notes = normalizeIssueText(value, "");
  return notes || null;
}

function createMaintenanceIssue(issueOrPartial = {}) {
  const fallbackId = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;

  return {
    id: normalizeIssueText(issueOrPartial.id, generatedId),
    title: normalizeIssueText(issueOrPartial.title, "General Wear"),
    severity: normalizeIssueSeverity(issueOrPartial.severity),
    status: normalizeIssueStatus(issueOrPartial.status),
    source: normalizeIssueText(issueOrPartial.source, "manual"),
    taskType: normalizeTaskType(issueOrPartial.taskType, "maintenance"),
    checkType: normalizeCheckType(issueOrPartial.checkType),
    recommendedStation: normalizeRecommendedStation(issueOrPartial.recommendedStation),
    recommendedSkill: normalizeRecommendedSkill(issueOrPartial.recommendedSkill),
    notes: normalizeTaskNotes(issueOrPartial.notes),
  };
}

function createTravelTask(taskOrPartial = {}) {
  const fallbackId = `travel-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;

  return {
    id: normalizeIssueText(taskOrPartial.id, generatedId),
    title: normalizeIssueText(taskOrPartial.title, "General Arcflight Task"),
    status: normalizeIssueStatus(taskOrPartial.status),
    source: normalizeIssueText(taskOrPartial.source, "manual"),
    taskType: normalizeTaskType(taskOrPartial.taskType, "travel"),
    checkType: normalizeCheckType(taskOrPartial.checkType),
    recommendedStation: normalizeRecommendedStation(taskOrPartial.recommendedStation),
    recommendedSkill: normalizeRecommendedSkill(taskOrPartial.recommendedSkill),
    notes: normalizeTaskNotes(taskOrPartial.notes),
    summary: normalizeTaskNotes(taskOrPartial.summary),
  };
}

export function isTravelLegComplete(travelState) {
  const legProgressMax = normalizePositiveNumber(travelState?.legProgressMax, 0);
  if (legProgressMax <= 0) {
    return false;
  }

  return (travelState?.legProgress ?? 0) >= legProgressMax;
}

function createDefaultArcflightState() {
  return {
    term: TRAVEL_TERM,
    posture: "standard",
    currentHex: null,
    destination: null,
    legDistance: 1,
    legProgressMax: 1,
    daysElapsed: 0,
    daysIntoCurrentLeg: 0,
    progressPerDay: 1,
    legProgress: 0,
    travelTasks: [],
    maintenancePressure: 0,
    maintenanceIssues: [],
    encounterPressure: 0,
  };
}

/**
 * Creates the container used by the module API to hold multiple ship states.
 * Actor-linking is supported through shipIdByActorId without introducing
 * persistence complexity yet.
 */
export function createEmptyShipStateIndex() {
  return {
    activeShipId: null,
    shipsById: {},
    shipIdByActorId: {},
  };
}

/**
 * Create a default shared ship state.
 * This is intentionally minimal and remains the single state direction for
 * future voyage and combat systems.
 */
export function createDefaultShipState({
  shipId = DEFAULT_SHARED_SHIP_ID,
  actorId = null,
  name = "New Spelljammer",
} = {}) {
  const now = Date.now();

  return {
    identity: {
      shipId,
      actorId,
      name,
      hull: null,
      level: 1,
    },
    crew: {
      stations: createDefaultStationAssignments(),
    },
    arcflight: createDefaultArcflightState(),
    combat: {
      active: false,
      encounterId: null,
    },
    resources: {
      hullPoints: null,
      power: null,
      strain: 0,
      supplies: null,
      cargoSlotsUsed: 0,
      cargoSlotsMax: null,
    },
    flags: {},
    meta: {
      initializedAt: now,
      updatedAt: now,
      source: "api",
    },
  };
}

export function createDefaultStationAssignments() {
  const assignments = {};

  for (const station of STATIONS) {
    assignments[station.id] = {
      actorId: null,
      isNpcCrew: false,
    };
  }

  return assignments;
}

export function initializeShipState(index, { shipId, actorId, name } = {}) {
  const resolvedShipId = shipId ?? actorId ?? DEFAULT_SHARED_SHIP_ID;

  if (!index.shipsById[resolvedShipId]) {
    index.shipsById[resolvedShipId] = createDefaultShipState({
      shipId: resolvedShipId,
      actorId: actorId ?? null,
      name,
    });
  }

  if (actorId) {
    index.shipIdByActorId[actorId] = resolvedShipId;
    index.shipsById[resolvedShipId].identity.actorId = actorId;
  }

  if (!index.activeShipId) {
    index.activeShipId = resolvedShipId;
  }

  return index.shipsById[resolvedShipId];
}

export function getShipState(index, { shipId, actorId } = {}) {
  const resolvedShipId = shipId ?? index.shipIdByActorId[actorId] ?? index.activeShipId;

  if (!resolvedShipId) {
    return null;
  }

  return index.shipsById[resolvedShipId] ?? null;
}

export function setShipState(index, nextState, { shipId, actorId, setActive = true } = {}) {
  const resolvedShipId = shipId ?? actorId ?? nextState?.identity?.shipId ?? DEFAULT_SHARED_SHIP_ID;
  const safeState = cloneData(nextState);

  safeState.identity ??= {};
  safeState.identity.shipId = resolvedShipId;
  safeState.identity.actorId ??= actorId ?? null;
  safeState.meta ??= {};
  safeState.meta.updatedAt = Date.now();

  index.shipsById[resolvedShipId] = safeState;

  if (safeState.identity.actorId) {
    index.shipIdByActorId[safeState.identity.actorId] = resolvedShipId;
  }

  if (setActive) {
    index.activeShipId = resolvedShipId;
  }

  return index.shipsById[resolvedShipId];
}

export function updateShipState(index, updater, { shipId, actorId } = {}) {
  const currentState = getShipState(index, { shipId, actorId });

  if (!currentState) {
    return null;
  }

  const nextState = updater(cloneData(currentState));
  return setShipState(index, nextState, {
    shipId: currentState.identity.shipId,
    actorId: currentState.identity.actorId,
    setActive: true,
  });
}

export function getTravelState(index, options = {}) {
  const shipState = getShipState(index, options);
  return shipState?.arcflight ?? null;
}

export function updateTravelState(index, updaterOrPartial, options = {}) {
  return updateShipState(
    index,
    (nextState) => {
      const currentTravelState = nextState.arcflight ?? createDefaultArcflightState();
      nextState.arcflight = applyTravelStatePatch(currentTravelState, updaterOrPartial);
      return nextState;
    },
    options,
  );
}

export function setTravelDestination(index, destination, options = {}) {
  const nextDestination = typeof destination === "string" ? destination.trim() : "";

  return updateTravelState(
    index,
    {
      destination: nextDestination || null,
    },
    options,
  );
}

export function setTravelLeg(index, { legDistance, legProgressMax } = {}, options = {}) {
  return updateTravelState(
    index,
    (travelState) => ({
      ...travelState,
      legDistance: normalizePositiveNumber(legDistance, normalizePositiveNumber(travelState.legDistance, 1)),
      legProgressMax: normalizePositiveNumber(
        legProgressMax,
        normalizePositiveNumber(travelState.legProgressMax, 1),
      ),
    }),
    options,
  );
}

export function advanceTravelDay(index, options = {}) {
  return updateShipState(index, (nextState) => {
    const travelState = nextState.arcflight ?? createDefaultArcflightState();

    const progressPerDay = Number.isFinite(travelState.progressPerDay)
      ? travelState.progressPerDay
      : 1;

    nextState.arcflight = {
      ...travelState,
      daysElapsed: (travelState.daysElapsed ?? 0) + 1,
      daysIntoCurrentLeg: (travelState.daysIntoCurrentLeg ?? 0) + 1,
      legProgress: (travelState.legProgress ?? 0) + progressPerDay,
      maintenancePressure: clampPressure((travelState.maintenancePressure ?? 0) + 1),
      encounterPressure: clampPressure((travelState.encounterPressure ?? 0) + 1),
    };

    return nextState;
  }, options);
}

export function getMaintenanceIssues(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return [];
  }

  const issues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];
  return issues.filter((issue) => normalizeIssueStatus(issue?.status) !== "resolved");
}

export function getTravelTasks(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return [];
  }

  const tasks = Array.isArray(travelState.travelTasks) ? travelState.travelTasks : [];
  return tasks.filter((task) => normalizeIssueStatus(task?.status) !== "resolved");
}

export function addTravelTask(index, taskOrPartial = {}, options = {}) {
  return updateTravelState(
    index,
    (travelState) => {
      const travelTasks = Array.isArray(travelState.travelTasks) ? travelState.travelTasks : [];
      const nextTask = createTravelTask(taskOrPartial);

      return {
        ...travelState,
        travelTasks: [...travelTasks, nextTask],
      };
    },
    options,
  );
}

export function addMaintenanceIssue(index, issueOrPartial = {}, options = {}) {
  return updateTravelState(
    index,
    (travelState) => {
      const maintenanceIssues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];
      const nextIssue = createMaintenanceIssue(issueOrPartial);

      return {
        ...travelState,
        maintenanceIssues: [...maintenanceIssues, nextIssue],
      };
    },
    options,
  );
}

export function updateMaintenanceIssue(index, issueId, issuePatch = {}, options = {}) {
  const normalizedIssueId = normalizeIssueText(issueId, "");
  if (!normalizedIssueId) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const maintenanceIssues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];
      return {
        ...travelState,
        maintenanceIssues: maintenanceIssues.map((issue) => {
          if (issue?.id !== normalizedIssueId) {
            return issue;
          }

          return createMaintenanceIssue({
            ...issue,
            ...issuePatch,
            id: issue.id,
          });
        }),
      };
    },
    options,
  );
}

export function setMaintenanceIssueTask(index, issueId, taskPatch = {}, options = {}) {
  return updateMaintenanceIssue(
    index,
    issueId,
    {
      taskType: taskPatch.taskType,
      checkType: taskPatch.checkType,
      recommendedStation: taskPatch.recommendedStation,
      recommendedSkill: taskPatch.recommendedSkill,
      notes: taskPatch.notes,
    },
    options,
  );
}

export function resolveMaintenanceIssue(index, issueId, options = {}) {
  const normalizedIssueId = normalizeIssueText(issueId, "");
  if (!normalizedIssueId) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const maintenanceIssues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];
      return {
        ...travelState,
        maintenanceIssues: maintenanceIssues.filter((issue) => issue?.id !== normalizedIssueId),
      };
    },
    options,
  );
}
