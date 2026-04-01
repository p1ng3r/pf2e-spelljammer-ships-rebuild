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
  return {
    moduleId: MODULE_ID,
    apiNamespace: API_NAMESPACE,
    state: {
      initializeShipState: (options) => initializeShipState(shipStateIndex, options),
      initializeShipStateForActor: (actorId, options = {}) =>
        initializeShipState(shipStateIndex, { ...options, actorId }),

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
    ui: {
      openShipManagement: () => {
        const app = new ShipManagementApp();
        app.render({ force: true });
        return app;
      },
    },
  };
}

export function attachModuleApi() {
  const api = createModuleApi();

  initializeDefaultShipState();
  game[API_NAMESPACE] = api;

  return api;
}
