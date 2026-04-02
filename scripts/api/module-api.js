import { API_NAMESPACE, MODULE_ID } from "../config/constants.js";
import {
  createEmptyShipStateIndex,
  initializeShipState,
  getShipState,
  setShipState,
  updateShipState,
  getTravelState,
  assignStationActor,
  clearStationActor,
  updateTravelState,
  setTravelDestination,
  setTravelLeg,
  advanceTravelDay,
  getTravelTasks,
  addTravelTask,
  updateTravelTask,
  attemptTravelTask,
  resolveTravelTask,
  getTravelEvents,
  addTravelEvent,
  updateTravelEvent,
  attemptTravelEvent,
  resolveTravelEvent,
  linkTravelEventToTask,
  createTravelTaskFromEvent,
  getMaintenanceIssues,
  addMaintenanceIssue,
  updateMaintenanceIssue,
  setMaintenanceIssueTask,
  resolveMaintenanceIssue,
  getStationRequests,
  addStationRequest,
  updateStationRequest,
  getStationRollAttempts,
  getLatestStationRollAttempt,
  recordStationRollAttempt,
  getArcflightTemplates,
  getArcflightTemplateById,
  createArcflightTemplate,
  spawnArcflightTemplateInstance,
  getArcflightLogEntries,
  addArcflightLogEntry,
  executeArcflightOutcomeEffects,
  DEFAULT_SHARED_SHIP_ID,
} from "../state/ship-state.js";
import { ShipManagementApp } from "../ui/ship-management-app.js";
import { PlayerArcflightViewApp } from "../ui/player-arcflight-view.js";

let shipStateIndex = createEmptyShipStateIndex();
const SHIP_STATE_UPDATED_HOOK = `${MODULE_ID}.shipStateUpdated`;

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


function resolveActorOrOptions(actorOrOptions) {
  if (!actorOrOptions) {
    return {};
  }

  if (typeof actorOrOptions === "string") {
    return { actor: resolveActor(actorOrOptions) };
  }

  if (actorOrOptions?.id && actorOrOptions?.type) {
    return { actor: actorOrOptions };
  }

  const options = actorOrOptions && typeof actorOrOptions === "object" ? actorOrOptions : {};
  return {
    actor: resolveActor(options.actor ?? options.actorId ?? null),
    actorId: options.actorId ?? null,
    shipId: options.shipId ?? null,
  };
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
  const notifyShipStateUpdated = (nextShipState, context = {}) => {
    if (!nextShipState) {
      return nextShipState;
    }

    Hooks.callAll(SHIP_STATE_UPDATED_HOOK, {
      shipId: nextShipState.identity?.shipId ?? null,
      actorId: nextShipState.identity?.actorId ?? null,
      updatedAt: nextShipState.meta?.updatedAt ?? Date.now(),
      context,
    });

    return nextShipState;
  };

  const wrapStateMutation = (mutator, context) => (...args) =>
    notifyShipStateUpdated(mutator(...args), context);

  const openShipManagement = () => {
    const app = new ShipManagementApp();
    app.render({ force: true });
    return app;
  };

  const getPlayerFacingArcflightView = (actorOrOptions) => {
    const { actor, actorId, shipId } = resolveActorOrOptions(actorOrOptions);
    const resolvedActorId = actor?.id ?? actorId ?? null;

    return new PlayerArcflightViewApp({
      actorId: resolvedActorId,
      shipId: shipId ?? null,
    });
  };

  const openPlayerArcflightView = (actorOrOptions) => {
    try {
      const { actor } = resolveActorOrOptions(actorOrOptions);
      if (actor) {
        initializeShipStateForVehicleActor(actor, { setActive: true });
      }

      const app = getPlayerFacingArcflightView(actorOrOptions);
      app.render({ force: true });
      return app;
    } catch (error) {
      const uiMessage = getActorLaunchErrorMessage(error);
      ui.notifications?.error(uiMessage);
      console.warn(`${MODULE_ID} | ${uiMessage}`, error);
      return null;
    }
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
    hooks: {
      shipStateUpdated: SHIP_STATE_UPDATED_HOOK,
    },
    state: {
      initializeShipState: (options) => initializeShipState(shipStateIndex, options),
      initializeShipStateForActor: (actorId, options = {}) =>
        initializeShipState(shipStateIndex, { ...options, actorId }),
      initializeShipStateForVehicleActor,

      getShipState: (options) => getShipState(shipStateIndex, options),
      getShipStateById: (shipId) => getShipState(shipStateIndex, { shipId }),
      getShipStateForActor: (actorId) => getShipState(shipStateIndex, { actorId }),
      getActiveShipState: () => getShipState(shipStateIndex, { shipId: shipStateIndex.activeShipId }),

      setShipState: wrapStateMutation(
        (nextState, options) => setShipState(shipStateIndex, nextState, options),
        { source: "setShipState" },
      ),
      setShipStateById: wrapStateMutation(
        (shipId, nextState) => setShipState(shipStateIndex, nextState, { shipId }),
        { source: "setShipStateById" },
      ),
      setShipStateForActor: wrapStateMutation(
        (actorId, nextState) => setShipState(shipStateIndex, nextState, { actorId }),
        { source: "setShipStateForActor" },
      ),

      updateShipState: wrapStateMutation(
        (updater, options) => updateShipState(shipStateIndex, updater, options),
        { source: "updateShipState" },
      ),
      updateShipStateById: wrapStateMutation(
        (shipId, updater) => updateShipState(shipStateIndex, updater, { shipId }),
        { source: "updateShipStateById" },
      ),
      updateShipStateForActor: wrapStateMutation(
        (actorId, updater) => updateShipState(shipStateIndex, updater, { actorId }),
        { source: "updateShipStateForActor" },
      ),

      getTravelState: (options) => getTravelState(shipStateIndex, options),
      assignStationActor: wrapStateMutation(
        (stationId, actorId, options) => assignStationActor(shipStateIndex, stationId, actorId, options),
        { source: "assignStationActor" },
      ),
      clearStationActor: wrapStateMutation(
        (stationId, options) => clearStationActor(shipStateIndex, stationId, options),
        { source: "clearStationActor" },
      ),
      updateTravelState: wrapStateMutation(
        (updaterOrPartial, options) => updateTravelState(shipStateIndex, updaterOrPartial, options),
        { source: "updateTravelState" },
      ),
      setTravelDestination: wrapStateMutation(
        (destination, options) => setTravelDestination(shipStateIndex, destination, options),
        { source: "setTravelDestination" },
      ),
      setTravelLeg: wrapStateMutation(
        (legPatch, options) => setTravelLeg(shipStateIndex, legPatch, options),
        { source: "setTravelLeg" },
      ),
      advanceTravelDay: wrapStateMutation(
        (options) => advanceTravelDay(shipStateIndex, options),
        { source: "advanceTravelDay" },
      ),
      getTravelTasks: (options) => getTravelTasks(shipStateIndex, options),
      addTravelTask: wrapStateMutation(
        (taskOrPartial, options) => addTravelTask(shipStateIndex, taskOrPartial, options),
        { source: "addTravelTask" },
      ),
      updateTravelTask: wrapStateMutation(
        (taskId, taskPatch, options) => updateTravelTask(shipStateIndex, taskId, taskPatch, options),
        { source: "updateTravelTask" },
      ),
      attemptTravelTask: wrapStateMutation(
        (taskId, attemptPatch, options) => attemptTravelTask(shipStateIndex, taskId, attemptPatch, options),
        { source: "attemptTravelTask" },
      ),
      resolveTravelTask: wrapStateMutation(
        (taskId, options) => resolveTravelTask(shipStateIndex, taskId, options),
        { source: "resolveTravelTask" },
      ),
      getTravelEvents: (options) => getTravelEvents(shipStateIndex, options),
      addTravelEvent: wrapStateMutation(
        (eventOrPartial, options) => addTravelEvent(shipStateIndex, eventOrPartial, options),
        { source: "addTravelEvent" },
      ),
      updateTravelEvent: wrapStateMutation(
        (eventId, eventPatch, options) => updateTravelEvent(shipStateIndex, eventId, eventPatch, options),
        { source: "updateTravelEvent" },
      ),
      attemptTravelEvent: wrapStateMutation(
        (eventId, attemptPatch, options) => attemptTravelEvent(shipStateIndex, eventId, attemptPatch, options),
        { source: "attemptTravelEvent" },
      ),
      resolveTravelEvent: wrapStateMutation(
        (eventId, options) => resolveTravelEvent(shipStateIndex, eventId, options),
        { source: "resolveTravelEvent" },
      ),
      linkTravelEventToTask: wrapStateMutation(
        (eventId, taskId, options) => linkTravelEventToTask(shipStateIndex, eventId, taskId, options),
        { source: "linkTravelEventToTask" },
      ),
      createTravelTaskFromEvent: wrapStateMutation(
        (eventId, taskOptions, options) => createTravelTaskFromEvent(shipStateIndex, eventId, taskOptions, options),
        { source: "createTravelTaskFromEvent" },
      ),
      getMaintenanceIssues: (options) => getMaintenanceIssues(shipStateIndex, options),
      addMaintenanceIssue: wrapStateMutation(
        (issueOrPartial, options) => addMaintenanceIssue(shipStateIndex, issueOrPartial, options),
        { source: "addMaintenanceIssue" },
      ),
      updateMaintenanceIssue: wrapStateMutation(
        (issueId, issuePatch, options) => updateMaintenanceIssue(shipStateIndex, issueId, issuePatch, options),
        { source: "updateMaintenanceIssue" },
      ),
      setMaintenanceIssueTask: wrapStateMutation(
        (issueId, taskPatch, options) => setMaintenanceIssueTask(shipStateIndex, issueId, taskPatch, options),
        { source: "setMaintenanceIssueTask" },
      ),
      resolveMaintenanceIssue: wrapStateMutation(
        (issueId, options) => resolveMaintenanceIssue(shipStateIndex, issueId, options),
        { source: "resolveMaintenanceIssue" },
      ),
      getStationRequests: (options) => getStationRequests(shipStateIndex, options),
      addStationRequest: wrapStateMutation(
        (requestOrPartial, options) => addStationRequest(shipStateIndex, requestOrPartial, options),
        { source: "addStationRequest" },
      ),
      updateStationRequest: wrapStateMutation(
        (requestId, requestPatch, options) =>
          updateStationRequest(shipStateIndex, requestId, requestPatch, options),
        { source: "updateStationRequest" },
      ),
      getStationRollAttempts: (options) => getStationRollAttempts(shipStateIndex, options),
      getLatestStationRollAttempt: (filter, options) => getLatestStationRollAttempt(shipStateIndex, filter, options),
      recordStationRollAttempt: wrapStateMutation(
        (attemptOrPartial, options) => recordStationRollAttempt(shipStateIndex, attemptOrPartial, options),
        { source: "recordStationRollAttempt" },
      ),
      getArcflightTemplates: (options) => getArcflightTemplates(shipStateIndex, options),
      getArcflightTemplateById: (templateId, options) =>
        getArcflightTemplateById(shipStateIndex, templateId, options),
      createArcflightTemplate,
      spawnArcflightTemplateInstance: wrapStateMutation(
        (templateOrId, instancePatch, options) =>
          spawnArcflightTemplateInstance(shipStateIndex, templateOrId, instancePatch, options),
        { source: "spawnArcflightTemplateInstance" },
      ),
      getArcflightLogEntries: (options) => getArcflightLogEntries(shipStateIndex, options),
      addArcflightLogEntry: wrapStateMutation(
        (entryOrPartial, options) => addArcflightLogEntry(shipStateIndex, entryOrPartial, options),
        { source: "addArcflightLogEntry" },
      ),
      executeArcflightOutcomeEffects: wrapStateMutation(
        (effectContext, options) => executeArcflightOutcomeEffects(shipStateIndex, effectContext, options),
        { source: "executeArcflightOutcomeEffects" },
      ),
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
      getPlayerFacingArcflightView,
      openPlayerArcflightView,
    },
  };
}

export function attachModuleApi() {
  const api = createModuleApi();

  initializeDefaultShipState();
  game[API_NAMESPACE] = api;

  return api;
}
