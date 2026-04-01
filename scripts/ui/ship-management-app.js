import { API_NAMESPACE, MODULE_ID, MODULE_TITLE, STATIONS } from "../config/constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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

    return {
      moduleTitle: MODULE_TITLE,
      hasShipState: Boolean(shipState),
      shipState,
      travelState,
      stations: STATIONS,
      activeShipId: stateApi?.getActiveShipId?.() ?? null,
      actorContext: {
        actorId: linkedActorId,
        actorName: linkedActor?.name ?? null,
        actorType: linkedActor?.type ?? null,
        missingActor: Boolean(linkedActorId && !linkedActor),
      },
    };
  }
}
