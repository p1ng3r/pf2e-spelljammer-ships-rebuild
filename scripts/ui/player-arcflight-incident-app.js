import { MODULE_ID, MODULE_TITLE, STATIONS } from "../config/constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function toText(value, fallback = "None") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function bringToFrontDeferred(app) {
  if (!app) {
    return;
  }

  app.bringToFront();
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => app.bringToFront());
    return;
  }

  setTimeout(() => app.bringToFront(), 0);
}

export class PlayerArcflightIncidentApp extends HandlebarsApplicationMixin(ApplicationV2) {
  #incident = null;
  #onAttemptCheck = null;
  #onRequestHelp = null;

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-player-arcflight-incident`,
    classes: [MODULE_ID, "player-arcflight-incident-app"],
    tag: "section",
    window: {
      title: `${MODULE_TITLE} | Arcflight Incident`,
      resizable: true,
    },
    position: {
      width: 480,
      height: 520,
    },
  };

  static PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/app/player-arcflight-incident-app.hbs`,
    },
  };

  constructor({ incident, onAttemptCheck, onRequestHelp } = {}, options = {}) {
    super(options);
    this.#incident = incident ?? null;
    this.#onAttemptCheck = typeof onAttemptCheck === "function" ? onAttemptCheck : null;
    this.#onRequestHelp = typeof onRequestHelp === "function" ? onRequestHelp : null;
  }

  async _prepareContext() {
    if (!this.#incident) {
      return {
        moduleTitle: MODULE_TITLE,
        hasIncident: false,
      };
    }

    return {
      moduleTitle: MODULE_TITLE,
      hasIncident: true,
      incident: {
        ...this.#incident,
        title: toText(this.#incident.title, "Unnamed incident"),
        publicSummary: toText(this.#incident.publicSummary, "No public details yet."),
        publicOutcome: toText(this.#incident.publicOutcome, "Outcome still uncertain."),
        sourceLabel: toText(this.#incident.sourceLabel, "Unknown"),
        severityText: toText(this.#incident.severityText, "Unknown"),
        recommendedStationLabel: toText(this.#incident.recommendedStationLabel, "Any station"),
        recommendedSkillLabel: toText(this.#incident.recommendedSkillLabel, "Appropriate skill"),
        statusText: toText(this.#incident.statusText, "Open"),
        actingStationOptions: STATIONS.map((station) => ({
          id: station.id,
          label: station.label,
          selected: station.id === this.#incident.recommendedStation,
        })),
      },
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    bringToFrontDeferred(this);

    const attemptButton = this.element.querySelector("[data-player-incident-attempt-check]");
    attemptButton?.addEventListener("click", this.#onAttemptCheckClick.bind(this));

    const requestButton = this.element.querySelector("[data-player-incident-request-help]");
    requestButton?.addEventListener("click", this.#onRequestHelpClick.bind(this));

    const closeButton = this.element.querySelector("[data-player-incident-close]");
    closeButton?.addEventListener("click", this.#onCloseClick.bind(this));
  }

  async #onAttemptCheckClick(event) {
    event.preventDefault();
    if (!this.#incident || !this.#onAttemptCheck) {
      return;
    }

    const actingStationSelect = this.element?.querySelector("[name='actingStationId']");
    const actingStationId = String(actingStationSelect?.value ?? this.#incident.recommendedStation ?? "").trim().toLowerCase();
    await this.#onAttemptCheck(this.#incident, event, actingStationId);
  }

  async #onRequestHelpClick(event) {
    event.preventDefault();
    if (!this.#incident || !this.#onRequestHelp) {
      return;
    }

    await this.#onRequestHelp(this.#incident);
  }

  async #onCloseClick(event) {
    event.preventDefault();
    await this.close({ force: true });
  }
}
