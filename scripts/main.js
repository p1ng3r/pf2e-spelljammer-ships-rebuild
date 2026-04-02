import { attachModuleApi } from "./api/module-api.js";
import { API_NAMESPACE, MODULE_TITLE } from "./config/constants.js";

Hooks.once("init", () => {
  console.log(`${MODULE_TITLE} | init`);
});

Hooks.once("ready", () => {
  const api = attachModuleApi();
  const activeShipState = api.state.getActiveShipState();

  Hooks.on("getActorSheetHeaderButtons", (application, buttons) => {
    const actor = application.actor;

    if (!api.actors.isPf2eVehicleActor(actor)) {
      return;
    }

    buttons.unshift({
      label: "Arcflight",
      class: "pf2e-spelljammer-ships-open-player-arcflight",
      icon: "fas fa-compass",
      onclick: () => api.ui.openPlayerArcflightView(actor),
    });

    if (game.user?.isGM) {
      buttons.unshift({
        label: "Ship Mgmt",
        class: "pf2e-spelljammer-ships-open-management",
        icon: "fas fa-ship",
        onclick: () => api.ui.openShipManagementForVehicleActor(actor),
      });
    }
  });

  console.log(`${MODULE_TITLE} | ready`);
  console.log(`${MODULE_TITLE} | API attached to game.${API_NAMESPACE}`, api);
  console.log(`${MODULE_TITLE} | Active ship state initialized`, activeShipState);
});
