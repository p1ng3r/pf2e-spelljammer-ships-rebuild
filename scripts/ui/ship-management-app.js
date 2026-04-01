import { API_NAMESPACE, MODULE_ID, MODULE_TITLE, STATIONS } from "../config/constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DEFAULT_POSTURES = Object.freeze(["cautious", "standard", "hard-push", "silent-running"]);

function toLabel(posture) {
  return posture
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parsePositiveNumber(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return numericValue;
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
    const legTarget = parsePositiveNumber(travelState?.legProgressMax, 1);
    const legProgress = Number(travelState?.legProgress ?? 0);
    const legComplete = legTarget > 0 && legProgress >= legTarget;

    return {
      moduleTitle: MODULE_TITLE,
      hasShipState: Boolean(shipState),
      shipState,
      travelState,
      postureOptions,
      stations: STATIONS,
      activeShipId: stateApi?.getActiveShipId?.() ?? null,
      routeStatus: {
        legTarget,
        legProgress,
        legComplete,
      },
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

    const routeForm = root.querySelector("[data-action='route-leg-form']");
    routeForm?.addEventListener("submit", this.#onRouteLegSubmit.bind(this));
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

  async #onRouteLegSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const stateApi = game?.[API_NAMESPACE]?.state;
    if (!form || !stateApi) {
      return;
    }

    const formData = new FormData(form);
    const destination = String(formData.get("destination") ?? "");
    const legDistanceValue = formData.get("legDistance");
    const legProgressMaxValue = formData.get("legProgressMax");

    const currentTravelState = stateApi.getTravelState?.() ?? {};
    const legDistance = parsePositiveNumber(legDistanceValue, currentTravelState.legDistance ?? 1);
    const legProgressMax = parsePositiveNumber(
      legProgressMaxValue,
      currentTravelState.legProgressMax ?? legDistance,
    );

    if (typeof stateApi.setTravelDestination === "function") {
      await stateApi.setTravelDestination(destination);
    } else {
      await stateApi.updateTravelState?.({ destination: destination.trim() || null });
    }

    if (typeof stateApi.setTravelLeg === "function") {
      await stateApi.setTravelLeg({ legDistance, legProgressMax });
    } else {
      await stateApi.updateTravelState?.({ legDistance, legProgressMax });
    }

    this.render({ force: true });
  }
}
