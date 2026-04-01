import { MODULE_ID } from "../config/constants.js";
import { createDefaultShipState } from "../state/ship-state.js";
import { ShipManagementApp } from "../ui/ship-management-app.js";

let sharedShipState = null;

function ensureState() {
  if (!sharedShipState) {
    sharedShipState = createDefaultShipState();
  }

  return sharedShipState;
}

function resetState() {
  sharedShipState = createDefaultShipState();
  return sharedShipState;
}

export function createModuleApi() {
  return {
    moduleId: MODULE_ID,
    state: {
      getShipState: () => ensureState(),
      resetShipState: () => resetState(),
    },
    ui: {
      openShipManagement: () => {
        const app = new ShipManagementApp();
        app.render(true);
        return app;
      },
    },
  };
}

export function attachModuleApi() {
  const api = createModuleApi();
  game[MODULE_ID] = api;
  return api;
}
