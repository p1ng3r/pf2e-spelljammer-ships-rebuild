import { API_NAMESPACE, MODULE_ID } from "../config/constants.js";
import {
  createEmptyShipStateIndex,
  initializeShipState,
  getShipState,
  setShipState,
  updateShipState,
  DEFAULT_SHARED_SHIP_ID,
} from "../state/ship-state.js";
import { ShipManagementApp } from "../ui/ship-management-app.js";

let shipStateIndex = createEmptyShipStateIndex();

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
    initializeShipStateForVehicleActor(actorOrId, { ...options, setActive: true });
    return openShipManagement();
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
