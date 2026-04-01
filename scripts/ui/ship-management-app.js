import { MODULE_ID, MODULE_TITLE, STATION_ROSTER } from "../config/constants.js";

export class ShipManagementApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-ship-management`,
      classes: [MODULE_ID, "ship-management-app"],
      title: `${MODULE_TITLE} | Ship Management`,
      template: `modules/${MODULE_ID}/templates/app/ship-management-app.hbs`,
      width: 640,
      height: 520,
      resizable: true,
    });
  }

  /** @override */
  getData() {
    const api = game?.[MODULE_ID] ?? null;
    const shipState = api?.state?.getShipState?.() ?? null;

    return {
      moduleTitle: MODULE_TITLE,
      hasShipState: Boolean(shipState),
      shipState,
      stationRoster: STATION_ROSTER,
    };
  }
}
