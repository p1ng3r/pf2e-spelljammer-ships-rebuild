import { API_NAMESPACE, MODULE_ID, MODULE_TITLE, STATIONS } from "../config/constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DEFAULT_POSTURES = Object.freeze(["cautious", "standard", "hard-push", "silent-running"]);

function toLabel(posture) {
  return posture
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

    return {
      moduleTitle: MODULE_TITLE,
      hasShipState: Boolean(shipState),
      shipState,
      travelState,
      postureOptions,
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
}
