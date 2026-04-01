import { API_NAMESPACE, MODULE_ID } from "../config/constants.js";
import {
  createEmptyShipStateIndex,
  initializeShipState,
  getShipState,
  setShipState,
  updateShipState,
  getTravelState,
  updateTravelState,
  setTravelDestination,
  setTravelLeg,
  advanceTravelDay,
  getTravelTasks,
  addTravelTask,
  updateTravelTask,
  attemptTravelTask,
  resolveTravelTask,
  getMaintenanceIssues,
  addMaintenanceIssue,
  updateMaintenanceIssue,
  setMaintenanceIssueTask,
  resolveMaintenanceIssue,
  DEFAULT_SHARED_SHIP_ID,
} from "../state/ship-state.js";
import { ShipManagementApp } from "../ui/ship-management-app.js";

let shipStateIndex = createEmptyShipStateIndex();

const TRAVEL_POSTURES = Object.freeze(["cautious", "standard", "hard-push", "silent-running"]);

function initializeDefaultShipState() {
  return initializeShipState(shipStateIndex, { shipId: DEFAULT_SHARED_SHIP_ID });
}

function resolveActor(actorOrId) {
  if (!actorOrId) {
    return null;
  }

  if (typeof actorOrId === "string") {
    return game.actors?.get(actorOrId) ?? null;
  }

  return actorOrId;
}

function isPf2eVehicleActor(actorOrId) {
  const actor = resolveActor(actorOrId);
  return Boolean(actor && game.system?.id === "pf2e" && actor.type === "vehicle");
}

function assertPf2eVehicleActor(actorOrId) {
  const actor = resolveActor(actorOrId);

  if (!actor) {
    throw new Error(`${MODULE_ID} | Vehicle actor integration requires a valid actor or actor id.`);
  }

  if (game.system?.id !== "pf2e") {
    throw new Error(`${MODULE_ID} | Vehicle actor integration only supports the PF2E system.`);
  }

  if (actor.type !== "vehicle") {
    throw new Error(`${MODULE_ID} | Actor "${actor.name}" is type "${actor.type}", expected "vehicle".`);
  }

  return actor;
}

function getActorLaunchErrorMessage(error) {
  const fallback = "Could not open Ship Management for that actor.";
  if (!error?.message) {
    return fallback;
  }

  const separatorIndex = error.message.indexOf("|");
  if (separatorIndex < 0) {
    return error.message;
  }

  return error.message.slice(separatorIndex + 1).trim();
}

function getActiveShipId() {
  return shipStateIndex.activeShipId;
}

function setActiveShipId(shipId) {
  if (!shipStateIndex.shipsById[shipId]) {
    return null;
  }

  shipStateIndex.activeShipId = shipId;
  return shipStateIndex.activeShipId;
}

function resetShipStates() {
  shipStateIndex = createEmptyShipStateIndex();
  return initializeDefaultShipState();
}

export function createModuleApi() {
  const openShipManagement = () => {
    const app = new ShipManagementApp();
    app.render({ force: true });
    return app;
  };

  const initializeShipStateForVehicleActor = (actorOrId, options = {}) => {
    const actor = assertPf2eVehicleActor(actorOrId);
    const shipState = initializeShipState(shipStateIndex, {
      ...options,
      shipId: options.shipId ?? actor.id,
      actorId: actor.id,
      name: options.name ?? actor.name,
    });

    if (options.setActive !== false) {
      setActiveShipId(shipState.identity.shipId);
    }

    return shipState;
  };

  const openShipManagementForVehicleActor = (actorOrId, options = {}) => {
    try {
      initializeShipStateForVehicleActor(actorOrId, { ...options, setActive: true });
      return openShipManagement();
    } catch (error) {
      const uiMessage = getActorLaunchErrorMessage(error);
      ui.notifications?.error(uiMessage);
      console.warn(`${MODULE_ID} | ${uiMessage}`, error);
      return null;
    }
  };

  const setTravelPosture = (posture, options) => {
    if (!TRAVEL_POSTURES.includes(posture)) {
      throw new Error(`${MODULE_ID} | Invalid Arcflight posture: "${posture}".`);
    }

    return updateTravelState(shipStateIndex, { posture }, options);
  };

  return {
    moduleId: MODULE_ID,
    apiNamespace: API_NAMESPACE,
    state: {
      initializeShipState: (options) => initializeShipState(shipStateIndex, options),
      initializeShipStateForActor: (actorId, options = {}) =>
        initializeShipState(shipStateIndex, { ...options, actorId }),
      initializeShipStateForVehicleActor,

      getShipState: (options) => getShipState(shipStateIndex, options),
      getShipStateById: (shipId) => getShipState(shipStateIndex, { shipId }),
      getShipStateForActor: (actorId) => getShipState(shipStateIndex, { actorId }),
      getActiveShipState: () => getShipState(shipStateIndex, { shipId: shipStateIndex.activeShipId }),

      setShipState: (nextState, options) => setShipState(shipStateIndex, nextState, options),
      setShipStateById: (shipId, nextState) => setShipState(shipStateIndex, nextState, { shipId }),
      setShipStateForActor: (actorId, nextState) => setShipState(shipStateIndex, nextState, { actorId }),

      updateShipState: (updater, options) => updateShipState(shipStateIndex, updater, options),
      updateShipStateById: (shipId, updater) => updateShipState(shipStateIndex, updater, { shipId }),
      updateShipStateForActor: (actorId, updater) => updateShipState(shipStateIndex, updater, { actorId }),

      getTravelState: (options) => getTravelState(shipStateIndex, options),
      updateTravelState: (updaterOrPartial, options) =>
        updateTravelState(shipStateIndex, updaterOrPartial, options),
      setTravelDestination: (destination, options) =>
        setTravelDestination(shipStateIndex, destination, options),
      setTravelLeg: (legPatch, options) => setTravelLeg(shipStateIndex, legPatch, options),
      advanceTravelDay: (options) => advanceTravelDay(shipStateIndex, options),
      getTravelTasks: (options) => getTravelTasks(shipStateIndex, options),
      addTravelTask: (taskOrPartial, options) => addTravelTask(shipStateIndex, taskOrPartial, options),
      updateTravelTask: (taskId, taskPatch, options) =>
        updateTravelTask(shipStateIndex, taskId, taskPatch, options),
      attemptTravelTask: (taskId, attemptPatch, options) =>
        attemptTravelTask(shipStateIndex, taskId, attemptPatch, options),
      resolveTravelTask: (taskId, options) => resolveTravelTask(shipStateIndex, taskId, options),
      getMaintenanceIssues: (options) => getMaintenanceIssues(shipStateIndex, options),
      addMaintenanceIssue: (issueOrPartial, options) =>
        addMaintenanceIssue(shipStateIndex, issueOrPartial, options),
      updateMaintenanceIssue: (issueId, issuePatch, options) =>
        updateMaintenanceIssue(shipStateIndex, issueId, issuePatch, options),
      setMaintenanceIssueTask: (issueId, taskPatch, options) =>
        setMaintenanceIssueTask(shipStateIndex, issueId, taskPatch, options),
      resolveMaintenanceIssue: (issueId, options) =>
        resolveMaintenanceIssue(shipStateIndex, issueId, options),
      setTravelPosture,
      travelPostures: TRAVEL_POSTURES,

      getActiveShipId,
      setActiveShipId,
      resetShipStates,
    },
    actors: {
      resolveActor,
      isPf2eVehicleActor,
      assertPf2eVehicleActor,
    },
    ui: {
      openShipManagement,
      openShipManagementForVehicleActor,
    },
  };
}

export function attachModuleApi() {
  const api = createModuleApi();

  initializeDefaultShipState();
  game[API_NAMESPACE] = api;

  return api;
}
