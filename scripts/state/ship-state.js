import { STATIONS, TRAVEL_TERM } from "../config/constants.js";
import { ARCFLIGHT_STARTER_TEMPLATES, ARCFLIGHT_TEMPLATE_TYPES } from "../content/arcflight-templates.js";

export const DEFAULT_SHARED_SHIP_ID = "shared-default";
export const PF2E_CORE_SKILLS = Object.freeze([
  { value: "acrobatics", label: "Acrobatics" },
  { value: "arcana", label: "Arcana" },
  { value: "athletics", label: "Athletics" },
  { value: "crafting", label: "Crafting" },
  { value: "deception", label: "Deception" },
  { value: "diplomacy", label: "Diplomacy" },
  { value: "intimidation", label: "Intimidation" },
  { value: "medicine", label: "Medicine" },
  { value: "nature", label: "Nature" },
  { value: "occultism", label: "Occultism" },
  { value: "performance", label: "Performance" },
  { value: "religion", label: "Religion" },
  { value: "society", label: "Society" },
  { value: "stealth", label: "Stealth" },
  { value: "survival", label: "Survival" },
  { value: "thievery", label: "Thievery" },
]);
export const CREW_TASK_TYPES = Object.freeze([
  { value: "travel", label: "Travel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "navigation", label: "Navigation" },
  { value: "engineering", label: "Engineering" },
  { value: "repair", label: "Repair" },
  { value: "general", label: "General" },
]);
export const CREW_CHECK_TYPES = Object.freeze([
  { value: "skill", label: "Skill" },
  { value: "lore", label: "Lore" },
  { value: "save", label: "Save" },
  { value: "other", label: "Other" },
]);
export const TRAVEL_EVENT_TYPES = Object.freeze([
  { value: "hazard", label: "Hazard" },
  { value: "encounter", label: "Encounter" },
  { value: "faction", label: "Faction" },
  { value: "navigation", label: "Navigation" },
  { value: "anomaly", label: "Anomaly" },
  { value: "other", label: "Other" },
]);
export const MANUAL_OUTCOME_TAGS = Object.freeze([
  { value: "none", label: "None" },
  { value: "success", label: "Success" },
  { value: "failure", label: "Failure" },
  { value: "mixed", label: "Mixed" },
  { value: "unresolved", label: "Unresolved" },
]);

export const ARCFLIGHT_EFFECT_TYPES = Object.freeze([
  "adjustResource",
  "adjustArcflightValue",
  "resolveSelf",
  "setStatus",
  "spawnTemplate",
  "addLogEntry",
]);

const ARCFLIGHT_TEMPLATE_OUTCOME_KEYS = Object.freeze([
  "criticalSuccess",
  "success",
  "failure",
  "criticalFailure",
]);

const ARCFLIGHT_LOG_ENTRY_MAX = 5;


function cloneData(data) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data));
}

function applyTravelStatePatch(currentTravelState, updaterOrPartial) {
  if (typeof updaterOrPartial === "function") {
    const nextTravelState = updaterOrPartial(cloneData(currentTravelState));
    return nextTravelState ?? currentTravelState;
  }

  if (updaterOrPartial && typeof updaterOrPartial === "object") {
    return {
      ...currentTravelState,
      ...updaterOrPartial,
    };
  }

  return currentTravelState;
}

function clampPressure(value) {
  return Math.max(0, Math.min(100, value));
}

function normalizePositiveNumber(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return numericValue;
}

function normalizeIssueText(value, fallback) {
  const textValue = typeof value === "string" ? value.trim() : "";
  return textValue || fallback;
}

function normalizeIssueSeverity(value) {
  const severity = normalizeIssueText(value, "minor").toLowerCase();
  const allowedSeverities = ["minor", "moderate", "major", "critical"];
  return allowedSeverities.includes(severity) ? severity : "minor";
}

function normalizeIssueStatus(value) {
  const status = normalizeIssueText(value, "open").toLowerCase();
  const allowedStatuses = ["open", "attempted", "resolved"];
  return allowedStatuses.includes(status) ? status : "open";
}

function normalizeTravelTaskStatus(value) {
  const status = normalizeIssueText(value, "open").toLowerCase();
  const allowedStatuses = ["open", "attempted", "resolved"];
  return allowedStatuses.includes(status) ? status : "open";
}

function normalizeTravelEventStatus(value) {
  const status = normalizeIssueText(value, "open").toLowerCase();
  const allowedStatuses = ["open", "attempted", "resolved"];
  return allowedStatuses.includes(status) ? status : "open";
}

function normalizeTravelEventType(value) {
  const eventType = normalizeIssueText(value, "other").toLowerCase();
  const allowedEventTypes = ["hazard", "encounter", "faction", "navigation", "anomaly", "other"];
  return allowedEventTypes.includes(eventType) ? eventType : "other";
}

function normalizeLinkedTaskId(value) {
  const linkedTaskId = normalizeIssueText(value, "");
  return linkedTaskId || null;
}

function normalizeTaskType(value, fallback = "general") {
  const taskType = normalizeIssueText(value, fallback).toLowerCase();
  const allowedTaskTypes = ["general", "travel", "maintenance", "repair", "navigation", "engineering"];
  return allowedTaskTypes.includes(taskType) ? taskType : fallback;
}

function normalizeCheckType(value) {
  const checkType = normalizeIssueText(value, "skill").toLowerCase();
  const allowedCheckTypes = ["skill", "lore", "save", "other"];
  return allowedCheckTypes.includes(checkType) ? checkType : "skill";
}

function normalizeRecommendedStation(value) {
  const stationText = normalizeIssueText(value, "");
  if (!stationText) {
    return null;
  }

  const normalizedInput = stationText.toLowerCase();
  const stationMatch = STATIONS.find(
    (station) => station.id.toLowerCase() === normalizedInput || station.label.toLowerCase() === normalizedInput,
  );

  return stationMatch?.id ?? null;
}

function normalizeRecommendedSkill(value) {
  const skill = normalizeIssueText(value, "").toLowerCase();
  if (!skill) {
    return null;
  }

  const knownSkill = PF2E_CORE_SKILLS.find((entry) => entry.value === skill);
  return knownSkill?.value ?? skill;
}

function normalizeTaskNotes(value) {
  const notes = normalizeIssueText(value, "");
  return notes || null;
}

function normalizePublicBriefingText(value) {
  const text = normalizeIssueText(value, "");
  return text || null;
}

function normalizeOutcomeTag(value) {
  const outcomeTag = normalizeIssueText(value, "none").toLowerCase();
  const allowedOutcomeTags = ["none", "success", "failure", "mixed", "unresolved"];
  return allowedOutcomeTags.includes(outcomeTag) ? outcomeTag : "none";
}

function normalizeStationRequestStatus(value) {
  const status = normalizeIssueText(value, "requested").toLowerCase();
  const allowedStatuses = ["requested", "active", "resolved"];
  return allowedStatuses.includes(status) ? status : "requested";
}

function normalizeStationRequestSourceType(value) {
  const sourceType = normalizeIssueText(value, "task").toLowerCase();
  const allowedSourceTypes = ["event", "issue", "task"];
  return allowedSourceTypes.includes(sourceType) ? sourceType : "task";
}

function normalizeRollAttemptSourceType(value) {
  return normalizeStationRequestSourceType(value);
}

function normalizeOptionalDc(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return Math.floor(numericValue);
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
}

function normalizeNullableDegree(value) {
  const degree = normalizeIssueText(value, "").toLowerCase();
  if (degree === "criticalsuccess") {
    return "criticalSuccess";
  }

  if (degree === "criticalfailure") {
    return "criticalFailure";
  }

  if (degree === "success") {
    return "success";
  }

  if (degree === "failure") {
    return "failure";
  }

  return null;
}

function createStationRollAttempt(attemptOrPartial = {}) {
  const fallbackId = `station-roll-attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;

  return {
    id: normalizeIssueText(attemptOrPartial.id, generatedId),
    stationId: normalizeRecommendedStation(attemptOrPartial.stationId),
    sourceType: normalizeRollAttemptSourceType(attemptOrPartial.sourceType),
    sourceId: normalizeIssueText(attemptOrPartial.sourceId, "") || null,
    actorId: normalizeIssueText(attemptOrPartial.actorId, "") || null,
    actorName: normalizeIssueText(attemptOrPartial.actorName, "Unknown Actor"),
    skill: normalizeRecommendedSkill(attemptOrPartial.skill),
    total: normalizeNullableNumber(attemptOrPartial.total),
    degree: normalizeNullableDegree(attemptOrPartial.degree),
    createdAt: Number.isFinite(Number(attemptOrPartial.createdAt)) ? Number(attemptOrPartial.createdAt) : Date.now(),
  };
}

function normalizeArcflightTemplateType(value) {
  const templateType = normalizeIssueText(value, "task").toLowerCase();
  return ARCFLIGHT_TEMPLATE_TYPES.includes(templateType) ? templateType : "task";
}

function normalizeArcflightEffectType(value) {
  const effectType = normalizeIssueText(value, "addLogEntry");
  return ARCFLIGHT_EFFECT_TYPES.includes(effectType) ? effectType : "addLogEntry";
}

function normalizeArcflightEffect(effectOrPartial = {}) {
  const effectType = normalizeArcflightEffectType(effectOrPartial?.type);
  const normalizedEffect = {
    type: effectType,
  };

  if (effectType === "adjustResource") {
    normalizedEffect.key = normalizeIssueText(effectOrPartial.key, "").toLowerCase() || null;
    normalizedEffect.mode = normalizeIssueText(effectOrPartial.mode, "add").toLowerCase();
    normalizedEffect.value = Number.isFinite(Number(effectOrPartial.value)) ? Number(effectOrPartial.value) : 0;
  }

  if (effectType === "adjustArcflightValue") {
    normalizedEffect.key = normalizeIssueText(effectOrPartial.key, "").trim() || null;
    normalizedEffect.mode = normalizeIssueText(effectOrPartial.mode, "add").toLowerCase();
    normalizedEffect.value = Number.isFinite(Number(effectOrPartial.value)) ? Number(effectOrPartial.value) : 0;
  }

  if (effectType === "setStatus") {
    normalizedEffect.status = normalizeIssueText(effectOrPartial.status, "attempted").toLowerCase();
  }

  if (effectType === "spawnTemplate") {
    normalizedEffect.templateId = normalizeIssueText(effectOrPartial.templateId, "") || null;
  }

  if (effectType === "addLogEntry") {
    normalizedEffect.text = normalizeIssueText(effectOrPartial.text, "Arcflight entry logged.") || null;
  }

  return normalizedEffect;
}

function normalizeArcflightOutcome(outcomeOrPartial = {}) {
  const effects = Array.isArray(outcomeOrPartial.effects) ? outcomeOrPartial.effects : [];
  const followUps = Array.isArray(outcomeOrPartial.followUps) ? outcomeOrPartial.followUps : [];

  return {
    summary: normalizeIssueText(outcomeOrPartial.summary, "No outcome summary."),
    effects: effects.map((effect) => normalizeArcflightEffect(effect)),
    followUps: followUps.map((entry) => normalizeIssueText(entry, "")).filter(Boolean),
    logEntry: normalizeTaskNotes(outcomeOrPartial.logEntry),
  };
}

function normalizeResolutionTexts(value = {}) {
  return {
    criticalSuccess: normalizeIssueText(value.criticalSuccess, "Critical success."),
    success: normalizeIssueText(value.success, "Success."),
    failure: normalizeIssueText(value.failure, "Failure."),
    criticalFailure: normalizeIssueText(value.criticalFailure, "Critical failure."),
  };
}

export function createArcflightTemplate(templateOrPartial = {}) {
  const templateType = normalizeArcflightTemplateType(templateOrPartial.type);
  const fallbackId = `arcflight-template-${templateType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const allowedAlternateStations = Array.isArray(templateOrPartial?.stationRules?.allowedAlternateStations)
    ? templateOrPartial.stationRules.allowedAlternateStations
    : [];

  const outcomesInput = templateOrPartial.outcomes && typeof templateOrPartial.outcomes === "object"
    ? templateOrPartial.outcomes
    : {};

  return {
    id: normalizeIssueText(templateOrPartial.id, fallbackId),
    type: templateType,
    title: normalizeIssueText(templateOrPartial.title, "Untitled Arcflight Template"),
    category: normalizeIssueText(templateOrPartial.category, "general"),
    tags: (Array.isArray(templateOrPartial.tags) ? templateOrPartial.tags : [])
      .map((tag) => normalizeIssueText(tag, "").toLowerCase())
      .filter(Boolean),
    severity: normalizeIssueSeverity(templateOrPartial.severity),
    player: {
      summary: normalizeIssueText(templateOrPartial?.player?.summary, "Arcflight situation in progress."),
      risk: normalizeIssueText(templateOrPartial?.player?.risk, "Consequences depend on crew response."),
      resolutionTexts: normalizeResolutionTexts(templateOrPartial?.player?.resolutionTexts ?? {}),
    },
    gm: {
      notes: normalizeTaskNotes(templateOrPartial?.gm?.notes),
    },
    stationRules: {
      recommendedStation: normalizeRecommendedStation(templateOrPartial?.stationRules?.recommendedStation),
      recommendedSkill: normalizeRecommendedSkill(templateOrPartial?.stationRules?.recommendedSkill),
      allowedAlternateStations: allowedAlternateStations
        .map((stationId) => normalizeRecommendedStation(stationId))
        .filter(Boolean),
      offStationPenalty: Number.isFinite(Number(templateOrPartial?.stationRules?.offStationPenalty))
        ? Math.floor(Number(templateOrPartial.stationRules.offStationPenalty))
        : 0,
      assistanceAllowed: Boolean(templateOrPartial?.stationRules?.assistanceAllowed),
    },
    check: {
      dc: normalizeOptionalDc(templateOrPartial?.check?.dc),
      checkType: normalizeCheckType(templateOrPartial?.check?.checkType),
      publicDcVisible: Boolean(templateOrPartial?.check?.publicDcVisible),
    },
    outcomes: ARCFLIGHT_TEMPLATE_OUTCOME_KEYS.reduce((acc, key) => {
      acc[key] = normalizeArcflightOutcome(outcomesInput[key]);
      return acc;
    }, {}),
  };
}

function normalizeArcflightTemplateCollection(templates = []) {
  const seenTemplateIds = new Set();
  const normalizedTemplates = [];

  for (const entry of templates) {
    const normalizedTemplate = createArcflightTemplate(entry);
    if (seenTemplateIds.has(normalizedTemplate.id)) {
      continue;
    }

    seenTemplateIds.add(normalizedTemplate.id);
    normalizedTemplates.push(normalizedTemplate);
  }

  return normalizedTemplates;
}

export function getArcflightTemplates(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return normalizeArcflightTemplateCollection(ARCFLIGHT_STARTER_TEMPLATES);
  }

  const sourceTemplates = Array.isArray(travelState.templates) && travelState.templates.length
    ? travelState.templates
    : ARCFLIGHT_STARTER_TEMPLATES;

  return normalizeArcflightTemplateCollection(sourceTemplates);
}

export function getArcflightTemplateById(index, templateId, options = {}) {
  const normalizedTemplateId = normalizeIssueText(templateId, "");
  if (!normalizedTemplateId) {
    return null;
  }

  return getArcflightTemplates(index, options).find((template) => template.id === normalizedTemplateId) ?? null;
}

function createArcflightInstanceFromTemplate(template, instancePatch = {}) {
  const fallbackId = `arcflight-instance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;
  const templatePlayable = {
    title: template.title,
    severity: template.severity,
    recommendedStation: template.stationRules.recommendedStation,
    recommendedSkill: template.stationRules.recommendedSkill,
    checkType: template.check.checkType,
    dc: template.check.dc,
    summary: template.player.summary,
    notes: template.gm.notes,
    source: "template",
    sourceTemplateId: template.id,
    sourceTemplateType: template.type,
    sourceTemplateCategory: template.category,
    sourceTemplateTags: template.tags,
    sourceTemplateOutcomes: template.outcomes,
    sourceTemplateRisk: template.player.risk,
    sourceTemplateResolutionTexts: template.player.resolutionTexts,
    publicSummary: template.player.summary,
    publicOutcome: template.player.risk,
  };

  return {
    id: normalizeIssueText(instancePatch.id, generatedId),
    templateId: template.id,
    templateType: template.type,
    title: normalizeIssueText(instancePatch.title, templatePlayable.title),
    status: normalizeTravelTaskStatus(instancePatch.status ?? "open"),
    createdAt: Date.now(),
    playable: {
      ...templatePlayable,
      ...instancePatch.playable,
    },
  };
}

export function spawnArcflightTemplateInstance(index, templateOrId, instancePatch = {}, options = {}) {
  const template = typeof templateOrId === "string"
    ? getArcflightTemplateById(index, templateOrId, options)
    : createArcflightTemplate(templateOrId);

  if (!template) {
    return getShipState(index, options);
  }

  const instanceRecord = createArcflightInstanceFromTemplate(template, instancePatch);

  return updateTravelState(
    index,
    (travelState) => {
      const templateInstances = Array.isArray(travelState.templateInstances) ? travelState.templateInstances : [];
      const travelEvents = Array.isArray(travelState.travelEvents) ? travelState.travelEvents : [];
      const travelTasks = Array.isArray(travelState.travelTasks) ? travelState.travelTasks : [];
      const maintenanceIssues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];

      const nextTravelState = {
        ...travelState,
        templateInstances: [...templateInstances, instanceRecord],
      };

      if (template.type === "event") {
        nextTravelState.travelEvents = [
          ...travelEvents,
          createTravelEvent({
            id: instanceRecord.id,
            title: instanceRecord.title,
            severity: instanceRecord.playable.severity,
            eventType: template.category,
            status: instanceRecord.status,
            source: instanceRecord.playable.source,
            recommendedStation: instanceRecord.playable.recommendedStation,
            recommendedSkill: instanceRecord.playable.recommendedSkill,
            checkType: instanceRecord.playable.checkType,
            dc: instanceRecord.playable.dc,
            summary: instanceRecord.playable.summary,
            notes: instanceRecord.playable.notes,
            publicSummary: instanceRecord.playable.publicSummary,
            publicOutcome: instanceRecord.playable.publicOutcome,
          }),
        ];
      }

      if (template.type === "issue") {
        nextTravelState.maintenanceIssues = [
          ...maintenanceIssues,
          createMaintenanceIssue({
            id: instanceRecord.id,
            title: instanceRecord.title,
            severity: instanceRecord.playable.severity,
            status: "open",
            source: instanceRecord.playable.source,
            taskType: template.category,
            checkType: instanceRecord.playable.checkType,
            dc: instanceRecord.playable.dc,
            recommendedStation: instanceRecord.playable.recommendedStation,
            recommendedSkill: instanceRecord.playable.recommendedSkill,
            notes: instanceRecord.playable.notes,
            publicSummary: instanceRecord.playable.publicSummary,
            publicOutcome: instanceRecord.playable.publicOutcome,
          }),
        ];
      }

      if (template.type === "task") {
        nextTravelState.travelTasks = [
          ...travelTasks,
          createTravelTask({
            id: instanceRecord.id,
            title: instanceRecord.title,
            status: instanceRecord.status,
            source: instanceRecord.playable.source,
            taskType: template.category,
            checkType: instanceRecord.playable.checkType,
            dc: instanceRecord.playable.dc,
            recommendedStation: instanceRecord.playable.recommendedStation,
            recommendedSkill: instanceRecord.playable.recommendedSkill,
            summary: instanceRecord.playable.summary,
            notes: instanceRecord.playable.notes,
            publicSummary: instanceRecord.playable.publicSummary,
            publicOutcome: instanceRecord.playable.publicOutcome,
          }),
        ];
      }

      return nextTravelState;
    },
    options,
  );
}

function normalizeArcflightLogEntry(entryOrPartial = {}) {
  const fallbackId = `arcflight-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;

  return {
    id: normalizeIssueText(entryOrPartial.id, generatedId),
    timestamp: Number.isFinite(Number(entryOrPartial.timestamp)) ? Number(entryOrPartial.timestamp) : Date.now(),
    type: normalizeStationRequestSourceType(entryOrPartial.type),
    sourceId: normalizeIssueText(entryOrPartial.sourceId, "") || null,
    sourceTitle: normalizeIssueText(entryOrPartial.sourceTitle, "Arcflight"),
    stationId: normalizeRecommendedStation(entryOrPartial.stationId),
    actorId: normalizeIssueText(entryOrPartial.actorId, "") || null,
    actorName: normalizeIssueText(entryOrPartial.actorName, "Unknown Actor"),
    skill: normalizeRecommendedSkill(entryOrPartial.skill),
    total: normalizeNullableNumber(entryOrPartial.total),
    result: normalizeNullableDegree(entryOrPartial.result),
    text: normalizeIssueText(entryOrPartial.text, "Arcflight log entry."),
  };
}

function trimArcflightLogEntries(entries = []) {
  return entries.slice(Math.max(0, entries.length - ARCFLIGHT_LOG_ENTRY_MAX));
}

export function getArcflightLogEntries(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return [];
  }

  const entries = Array.isArray(travelState.logEntries) ? travelState.logEntries : [];
  return trimArcflightLogEntries(entries);
}

export function addArcflightLogEntry(index, entryOrPartial = {}, options = {}) {
  const nextEntry = normalizeArcflightLogEntry(entryOrPartial);

  return updateTravelState(
    index,
    (travelState) => {
      const logEntries = Array.isArray(travelState.logEntries) ? travelState.logEntries : [];
      return {
        ...travelState,
        logEntries: trimArcflightLogEntries([...logEntries, nextEntry]),
      };
    },
    options,
  );
}

function createMaintenanceIssue(issueOrPartial = {}) {
  const fallbackId = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;

  return {
    id: normalizeIssueText(issueOrPartial.id, generatedId),
    title: normalizeIssueText(issueOrPartial.title, "General Wear"),
    severity: normalizeIssueSeverity(issueOrPartial.severity),
    status: normalizeIssueStatus(issueOrPartial.status),
    source: normalizeIssueText(issueOrPartial.source, "manual"),
    taskType: normalizeTaskType(issueOrPartial.taskType, "maintenance"),
    checkType: normalizeCheckType(issueOrPartial.checkType),
    dc: normalizeOptionalDc(issueOrPartial.dc),
    recommendedStation: normalizeRecommendedStation(issueOrPartial.recommendedStation),
    recommendedSkill: normalizeRecommendedSkill(issueOrPartial.recommendedSkill),
    notes: normalizeTaskNotes(issueOrPartial.notes),
    lastAttemptSummary: normalizeTaskNotes(issueOrPartial.lastAttemptSummary),
    attemptedByStation: normalizeRecommendedStation(issueOrPartial.attemptedByStation),
    attemptedSkill: normalizeRecommendedSkill(issueOrPartial.attemptedSkill),
    resultSummary: normalizeTaskNotes(issueOrPartial.resultSummary),
    publicSummary: normalizePublicBriefingText(issueOrPartial.publicSummary),
    publicOutcome: normalizePublicBriefingText(issueOrPartial.publicOutcome),
    outcomeTag: normalizeOutcomeTag(issueOrPartial.outcomeTag),
  };
}

function createTravelTask(taskOrPartial = {}) {
  const fallbackId = `travel-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;

    return {
    id: normalizeIssueText(taskOrPartial.id, generatedId),
    title: normalizeIssueText(taskOrPartial.title, "General Arcflight Task"),
    status: normalizeTravelTaskStatus(taskOrPartial.status),
    source: normalizeIssueText(taskOrPartial.source, "manual"),
    taskType: normalizeTaskType(taskOrPartial.taskType, "travel"),
    checkType: normalizeCheckType(taskOrPartial.checkType),
    dc: normalizeOptionalDc(taskOrPartial.dc),
    recommendedStation: normalizeRecommendedStation(taskOrPartial.recommendedStation),
    recommendedSkill: normalizeRecommendedSkill(taskOrPartial.recommendedSkill),
    notes: normalizeTaskNotes(taskOrPartial.notes),
    summary: normalizeTaskNotes(taskOrPartial.summary),
    publicSummary: normalizePublicBriefingText(taskOrPartial.publicSummary),
    lastAttemptSummary: normalizeTaskNotes(taskOrPartial.lastAttemptSummary),
    attemptedByStation: normalizeRecommendedStation(taskOrPartial.attemptedByStation),
    attemptedSkill: normalizeRecommendedSkill(taskOrPartial.attemptedSkill),
    resultSummary: normalizeTaskNotes(taskOrPartial.resultSummary),
    publicOutcome: normalizePublicBriefingText(taskOrPartial.publicOutcome),
    outcomeTag: normalizeOutcomeTag(taskOrPartial.outcomeTag),
  };
}

function createTravelEvent(eventOrPartial = {}) {
  const fallbackId = `travel-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;

  const linkedTaskId = normalizeLinkedTaskId(eventOrPartial.linkedTaskId);

  return {
    id: normalizeIssueText(eventOrPartial.id, generatedId),
    title: normalizeIssueText(eventOrPartial.title, "General Arcflight Event"),
    severity: normalizeIssueSeverity(eventOrPartial.severity),
    eventType: normalizeTravelEventType(eventOrPartial.eventType),
    status: normalizeTravelEventStatus(eventOrPartial.status),
    source: normalizeIssueText(eventOrPartial.source, "manual"),
    recommendedStation: normalizeRecommendedStation(eventOrPartial.recommendedStation),
    recommendedSkill: normalizeRecommendedSkill(eventOrPartial.recommendedSkill),
    checkType: normalizeCheckType(eventOrPartial.checkType),
    dc: normalizeOptionalDc(eventOrPartial.dc),
    notes: normalizeTaskNotes(eventOrPartial.notes),
    summary: normalizeTaskNotes(eventOrPartial.summary),
    publicSummary: normalizePublicBriefingText(eventOrPartial.publicSummary),
    lastAttemptSummary: normalizeTaskNotes(eventOrPartial.lastAttemptSummary),
    attemptedByStation: normalizeRecommendedStation(eventOrPartial.attemptedByStation),
    attemptedSkill: normalizeRecommendedSkill(eventOrPartial.attemptedSkill),
    resultSummary: normalizeTaskNotes(eventOrPartial.resultSummary),
    publicOutcome: normalizePublicBriefingText(eventOrPartial.publicOutcome),
    outcomeTag: normalizeOutcomeTag(eventOrPartial.outcomeTag),
    linkedTaskId,
    hasLinkedTask: Boolean(linkedTaskId),
  };
}

function createStationRequest(requestOrPartial = {}) {
  const fallbackId = `station-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedId = globalThis.foundry?.utils?.randomID?.() ?? fallbackId;

  return {
    id: normalizeIssueText(requestOrPartial.id, generatedId),
    stationId: normalizeRecommendedStation(requestOrPartial.stationId),
    sourceType: normalizeStationRequestSourceType(requestOrPartial.sourceType),
    sourceId: normalizeIssueText(requestOrPartial.sourceId, "") || null,
    title: normalizeIssueText(requestOrPartial.title, "Station Request"),
    status: normalizeStationRequestStatus(requestOrPartial.status),
    requestText: normalizeIssueText(requestOrPartial.requestText, "Taking point on this station prompt."),
    summary: normalizeTaskNotes(requestOrPartial.summary),
  };
}

export function isTravelLegComplete(travelState) {
  const legProgressMax = normalizePositiveNumber(travelState?.legProgressMax, 0);
  if (legProgressMax <= 0) {
    return false;
  }

  return (travelState?.legProgress ?? 0) >= legProgressMax;
}

function createDefaultArcflightState() {
  return {
    term: TRAVEL_TERM,
    posture: "standard",
    currentHex: null,
    destination: null,
    legDistance: 1,
    legProgressMax: 1,
    daysElapsed: 0,
    daysIntoCurrentLeg: 0,
    progressPerDay: 1,
    legProgress: 0,
    travelTasks: [],
    travelEvents: [],
    stationRequests: [],
    stationRollAttempts: [],
    templates: normalizeArcflightTemplateCollection(ARCFLIGHT_STARTER_TEMPLATES),
    templateInstances: [],
    logEntries: [],
    maintenancePressure: 0,
    maintenanceIssues: [],
    encounterPressure: 0,
  };
}

/**
 * Creates the container used by the module API to hold multiple ship states.
 * Actor-linking is supported through shipIdByActorId without introducing
 * persistence complexity yet.
 */
export function createEmptyShipStateIndex() {
  return {
    activeShipId: null,
    shipsById: {},
    shipIdByActorId: {},
  };
}

/**
 * Create a default shared ship state.
 * This is intentionally minimal and remains the single state direction for
 * future voyage and combat systems.
 */
export function createDefaultShipState({
  shipId = DEFAULT_SHARED_SHIP_ID,
  actorId = null,
  name = "New Spelljammer",
} = {}) {
  const now = Date.now();

  return {
    identity: {
      shipId,
      actorId,
      name,
      hull: null,
      level: 1,
    },
    crew: {
      stations: createDefaultStationAssignments(),
    },
    arcflight: createDefaultArcflightState(),
    combat: {
      active: false,
      encounterId: null,
    },
    resources: {
      hullPoints: null,
      power: null,
      strain: 0,
      supplies: null,
      cargoSlotsUsed: 0,
      cargoSlotsMax: null,
    },
    flags: {},
    meta: {
      initializedAt: now,
      updatedAt: now,
      source: "api",
    },
  };
}

export function createDefaultStationAssignments() {
  const assignments = {};

  for (const station of STATIONS) {
    assignments[station.id] = {
      actorId: null,
      isNpcCrew: false,
    };
  }

  return assignments;
}

export function initializeShipState(index, { shipId, actorId, name } = {}) {
  const resolvedShipId = shipId ?? actorId ?? DEFAULT_SHARED_SHIP_ID;

  if (!index.shipsById[resolvedShipId]) {
    index.shipsById[resolvedShipId] = createDefaultShipState({
      shipId: resolvedShipId,
      actorId: actorId ?? null,
      name,
    });
  }

  if (actorId) {
    index.shipIdByActorId[actorId] = resolvedShipId;
    index.shipsById[resolvedShipId].identity.actorId = actorId;
  }

  if (!index.activeShipId) {
    index.activeShipId = resolvedShipId;
  }

  return index.shipsById[resolvedShipId];
}

export function getShipState(index, { shipId, actorId } = {}) {
  const resolvedShipId = shipId ?? index.shipIdByActorId[actorId] ?? index.activeShipId;

  if (!resolvedShipId) {
    return null;
  }

  return index.shipsById[resolvedShipId] ?? null;
}

export function setShipState(index, nextState, { shipId, actorId, setActive = true } = {}) {
  const resolvedShipId = shipId ?? actorId ?? nextState?.identity?.shipId ?? DEFAULT_SHARED_SHIP_ID;
  const safeState = cloneData(nextState);

  safeState.identity ??= {};
  safeState.identity.shipId = resolvedShipId;
  safeState.identity.actorId ??= actorId ?? null;
  safeState.meta ??= {};
  safeState.meta.updatedAt = Date.now();

  index.shipsById[resolvedShipId] = safeState;

  if (safeState.identity.actorId) {
    index.shipIdByActorId[safeState.identity.actorId] = resolvedShipId;
  }

  if (setActive) {
    index.activeShipId = resolvedShipId;
  }

  return index.shipsById[resolvedShipId];
}

export function updateShipState(index, updater, { shipId, actorId } = {}) {
  const currentState = getShipState(index, { shipId, actorId });

  if (!currentState) {
    return null;
  }

  const nextState = updater(cloneData(currentState));
  return setShipState(index, nextState, {
    shipId: currentState.identity.shipId,
    actorId: currentState.identity.actorId,
    setActive: true,
  });
}

function isKnownStationId(stationId) {
  return STATIONS.some((station) => station.id === stationId);
}

function normalizeAssignedActorId(actorId) {
  const normalizedActorId = normalizeIssueText(actorId, "");
  return normalizedActorId || null;
}

export function assignStationActor(index, stationId, assignedActorId, options = {}) {
  if (!isKnownStationId(stationId)) {
    return getShipState(index, options);
  }

  return updateShipState(
    index,
    (shipState) => {
      shipState.crew ??= {};
      shipState.crew.stations ??= createDefaultStationAssignments();
      shipState.crew.stations[stationId] ??= {
        actorId: null,
        isNpcCrew: false,
      };

      shipState.crew.stations[stationId].actorId = normalizeAssignedActorId(assignedActorId);
      shipState.crew.stations[stationId].isNpcCrew = Boolean(options.isNpcCrew);

      return shipState;
    },
    options,
  );
}

export function clearStationActor(index, stationId, options = {}) {
  return assignStationActor(index, stationId, null, {
    ...options,
    isNpcCrew: false,
  });
}

export function getTravelState(index, options = {}) {
  const shipState = getShipState(index, options);
  return shipState?.arcflight ?? null;
}

export function updateTravelState(index, updaterOrPartial, options = {}) {
  return updateShipState(
    index,
    (nextState) => {
      const currentTravelState = nextState.arcflight ?? createDefaultArcflightState();
      nextState.arcflight = applyTravelStatePatch(currentTravelState, updaterOrPartial);
      return nextState;
    },
    options,
  );
}

export function setTravelDestination(index, destination, options = {}) {
  const nextDestination = typeof destination === "string" ? destination.trim() : "";

  return updateTravelState(
    index,
    {
      destination: nextDestination || null,
    },
    options,
  );
}

export function setTravelLeg(index, { legDistance, legProgressMax } = {}, options = {}) {
  return updateTravelState(
    index,
    (travelState) => ({
      ...travelState,
      legDistance: normalizePositiveNumber(legDistance, normalizePositiveNumber(travelState.legDistance, 1)),
      legProgressMax: normalizePositiveNumber(
        legProgressMax,
        normalizePositiveNumber(travelState.legProgressMax, 1),
      ),
    }),
    options,
  );
}

export function advanceTravelDay(index, options = {}) {
  return updateShipState(index, (nextState) => {
    const travelState = nextState.arcflight ?? createDefaultArcflightState();

    const progressPerDay = Number.isFinite(travelState.progressPerDay)
      ? travelState.progressPerDay
      : 1;

    nextState.arcflight = {
      ...travelState,
      daysElapsed: (travelState.daysElapsed ?? 0) + 1,
      daysIntoCurrentLeg: (travelState.daysIntoCurrentLeg ?? 0) + 1,
      legProgress: (travelState.legProgress ?? 0) + progressPerDay,
      maintenancePressure: clampPressure((travelState.maintenancePressure ?? 0) + 1),
      encounterPressure: clampPressure((travelState.encounterPressure ?? 0) + 1),
    };

    return nextState;
  }, options);
}

export function getMaintenanceIssues(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return [];
  }

  const issues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];
  if (options.includeResolved) {
    return issues;
  }

  return issues.filter((issue) => normalizeIssueStatus(issue?.status) !== "resolved");
}

export function getTravelTasks(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return [];
  }

  const tasks = Array.isArray(travelState.travelTasks) ? travelState.travelTasks : [];
  if (options.includeResolved) {
    return tasks;
  }

  return tasks.filter((task) => normalizeTravelTaskStatus(task?.status) !== "resolved");
}

export function addTravelTask(index, taskOrPartial = {}, options = {}) {
  return updateTravelState(
    index,
    (travelState) => {
      const travelTasks = Array.isArray(travelState.travelTasks) ? travelState.travelTasks : [];
      const nextTask = createTravelTask(taskOrPartial);

      return {
        ...travelState,
        travelTasks: [...travelTasks, nextTask],
      };
    },
    options,
  );
}

export function updateTravelTask(index, taskId, taskPatch = {}, options = {}) {
  const normalizedTaskId = normalizeIssueText(taskId, "");
  if (!normalizedTaskId) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const travelTasks = Array.isArray(travelState.travelTasks) ? travelState.travelTasks : [];
      return {
        ...travelState,
        travelTasks: travelTasks.map((task) => {
          if (task?.id !== normalizedTaskId) {
            return task;
          }

          return createTravelTask({
            ...task,
            ...taskPatch,
            id: task.id,
          });
        }),
      };
    },
    options,
  );
}

export function attemptTravelTask(index, taskId, attemptPatch = {}, options = {}) {
  return updateTravelTask(
    index,
    taskId,
    {
      status: "attempted",
      lastAttemptSummary: attemptPatch.lastAttemptSummary,
      attemptedByStation: attemptPatch.attemptedByStation,
      attemptedSkill: attemptPatch.attemptedSkill,
      resultSummary: attemptPatch.resultSummary,
      summary: attemptPatch.summary,
    },
    options,
  );
}

export function resolveTravelTask(index, taskId, options = {}) {
  return updateTravelTask(index, taskId, { status: "resolved" }, options);
}

export function getTravelEvents(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return [];
  }

  const events = Array.isArray(travelState.travelEvents) ? travelState.travelEvents : [];
  if (options.includeResolved) {
    return events;
  }

  return events.filter((travelEvent) => normalizeTravelEventStatus(travelEvent?.status) !== "resolved");
}

export function addTravelEvent(index, eventOrPartial = {}, options = {}) {
  return updateTravelState(
    index,
    (travelState) => {
      const travelEvents = Array.isArray(travelState.travelEvents) ? travelState.travelEvents : [];
      const nextEvent = createTravelEvent(eventOrPartial);

      return {
        ...travelState,
        travelEvents: [...travelEvents, nextEvent],
      };
    },
    options,
  );
}

export function updateTravelEvent(index, eventId, eventPatch = {}, options = {}) {
  const normalizedEventId = normalizeIssueText(eventId, "");
  if (!normalizedEventId) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const travelEvents = Array.isArray(travelState.travelEvents) ? travelState.travelEvents : [];
      return {
        ...travelState,
        travelEvents: travelEvents.map((travelEvent) => {
          if (travelEvent?.id !== normalizedEventId) {
            return travelEvent;
          }

          return createTravelEvent({
            ...travelEvent,
            ...eventPatch,
            id: travelEvent.id,
          });
        }),
      };
    },
    options,
  );
}

export function resolveTravelEvent(index, eventId, options = {}) {
  return updateTravelEvent(index, eventId, { status: "resolved" }, options);
}

export function attemptTravelEvent(index, eventId, attemptPatch = {}, options = {}) {
  return updateTravelEvent(
    index,
    eventId,
    {
      status: "attempted",
      lastAttemptSummary: attemptPatch.lastAttemptSummary,
      attemptedByStation: attemptPatch.attemptedByStation,
      attemptedSkill: attemptPatch.attemptedSkill,
      resultSummary: attemptPatch.resultSummary,
      summary: attemptPatch.summary,
    },
    options,
  );
}

export function linkTravelEventToTask(index, eventId, taskId, options = {}) {
  const normalizedTaskId = normalizeLinkedTaskId(taskId);
  if (!normalizedTaskId) {
    return getShipState(index, options);
  }

  return updateTravelEvent(
    index,
    eventId,
    {
      linkedTaskId: normalizedTaskId,
      hasLinkedTask: true,
    },
    options,
  );
}

export function createTravelTaskFromEvent(index, eventId, taskOptions = {}, options = {}) {
  const normalizedEventId = normalizeIssueText(eventId, "");
  if (!normalizedEventId) {
    return getShipState(index, options);
  }

  const travelState = getTravelState(index, options);
  const travelEvents = Array.isArray(travelState?.travelEvents) ? travelState.travelEvents : [];
  const sourceEvent = travelEvents.find((travelEvent) => travelEvent?.id === normalizedEventId);
  if (!sourceEvent) {
    return getShipState(index, options);
  }

  if (sourceEvent.linkedTaskId) {
    const allowDuplicate = Boolean(taskOptions?.allowDuplicateLinkedTask);
    if (!allowDuplicate) {
      return getShipState(index, options);
    }
  }

  const taskTitle = normalizeIssueText(taskOptions?.title, `${sourceEvent.title} Response Task`);
  const travelTaskPatch = {
    title: taskTitle,
    taskType: taskOptions?.taskType ?? normalizeTaskType(sourceEvent.eventType, "travel"),
    checkType: taskOptions?.checkType ?? sourceEvent.checkType,
    recommendedStation: taskOptions?.recommendedStation ?? sourceEvent.recommendedStation,
    recommendedSkill: taskOptions?.recommendedSkill ?? sourceEvent.recommendedSkill,
    summary: taskOptions?.summary ?? sourceEvent.summary ?? sourceEvent.notes,
    publicSummary: taskOptions?.publicSummary ?? sourceEvent.publicSummary,
    notes: taskOptions?.notes ?? sourceEvent.notes,
    publicOutcome: taskOptions?.publicOutcome ?? sourceEvent.publicOutcome,
    source: taskOptions?.source ?? "event-linked",
    status: "open",
  };

  const nextTask = createTravelTask(travelTaskPatch);

  return updateTravelState(
    index,
    (currentTravelState) => {
      const currentTravelTasks = Array.isArray(currentTravelState.travelTasks)
        ? currentTravelState.travelTasks
        : [];
      const currentTravelEvents = Array.isArray(currentTravelState.travelEvents)
        ? currentTravelState.travelEvents
        : [];

      return {
        ...currentTravelState,
        travelTasks: [...currentTravelTasks, nextTask],
        travelEvents: currentTravelEvents.map((travelEvent) => {
          if (travelEvent?.id !== normalizedEventId) {
            return travelEvent;
          }

          return createTravelEvent({
            ...travelEvent,
            linkedTaskId: nextTask.id,
            hasLinkedTask: true,
          });
        }),
      };
    },
    options,
  );
}

export function addMaintenanceIssue(index, issueOrPartial = {}, options = {}) {
  return updateTravelState(
    index,
    (travelState) => {
      const maintenanceIssues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];
      const nextIssue = createMaintenanceIssue(issueOrPartial);

      return {
        ...travelState,
        maintenanceIssues: [...maintenanceIssues, nextIssue],
      };
    },
    options,
  );
}

export function getStationRequests(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return [];
  }

  const requests = Array.isArray(travelState.stationRequests) ? travelState.stationRequests : [];
  if (options.includeResolved) {
    return requests;
  }

  return requests.filter((request) => normalizeStationRequestStatus(request?.status) !== "resolved");
}

export function addStationRequest(index, requestOrPartial = {}, options = {}) {
  const nextRequest = createStationRequest(requestOrPartial);
  if (!nextRequest.stationId || !nextRequest.sourceId) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const stationRequests = Array.isArray(travelState.stationRequests) ? travelState.stationRequests : [];
      const existingRequest = stationRequests.find(
        (request) =>
          request?.stationId === nextRequest.stationId &&
          request?.sourceType === nextRequest.sourceType &&
          request?.sourceId === nextRequest.sourceId &&
          normalizeStationRequestStatus(request?.status) !== "resolved",
      );

      if (existingRequest) {
        return travelState;
      }

      return {
        ...travelState,
        stationRequests: [...stationRequests, nextRequest],
      };
    },
    options,
  );
}

export function getStationRollAttempts(index, options = {}) {
  const travelState = getTravelState(index, options);
  if (!travelState) {
    return [];
  }

  return Array.isArray(travelState.stationRollAttempts) ? travelState.stationRollAttempts : [];
}

export function getLatestStationRollAttempt(index, filter = {}, options = {}) {
  const attempts = getStationRollAttempts(index, options);
  const stationId = normalizeRecommendedStation(filter?.stationId);
  const sourceType = normalizeRollAttemptSourceType(filter?.sourceType);
  const sourceId = normalizeIssueText(filter?.sourceId, "");

  if (!stationId || !sourceId) {
    return null;
  }

  const matchingAttempts = attempts.filter(
    (attempt) =>
      attempt?.stationId === stationId &&
      attempt?.sourceType === sourceType &&
      attempt?.sourceId === sourceId,
  );

  if (!matchingAttempts.length) {
    return null;
  }

  return matchingAttempts.reduce((latest, current) =>
    Number(current?.createdAt ?? 0) > Number(latest?.createdAt ?? 0) ? current : latest);
}

export function recordStationRollAttempt(index, attemptOrPartial = {}, options = {}) {
  const nextAttempt = createStationRollAttempt(attemptOrPartial);
  if (!nextAttempt.stationId || !nextAttempt.sourceId || !nextAttempt.skill) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const stationRollAttempts = Array.isArray(travelState.stationRollAttempts) ? travelState.stationRollAttempts : [];
      const nextAttempts = [...stationRollAttempts, nextAttempt];
      const maxAttempts = 200;

      return {
        ...travelState,
        stationRollAttempts: nextAttempts.slice(Math.max(0, nextAttempts.length - maxAttempts)),
      };
    },
    options,
  );
}

export function updateStationRequest(index, requestId, requestPatch = {}, options = {}) {
  const normalizedRequestId = normalizeIssueText(requestId, "");
  if (!normalizedRequestId) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const stationRequests = Array.isArray(travelState.stationRequests) ? travelState.stationRequests : [];
      return {
        ...travelState,
        stationRequests: stationRequests.map((request) => {
          if (request?.id !== normalizedRequestId) {
            return request;
          }

          return createStationRequest({
            ...request,
            ...requestPatch,
            id: request.id,
          });
        }),
      };
    },
    options,
  );
}

export function updateMaintenanceIssue(index, issueId, issuePatch = {}, options = {}) {
  const normalizedIssueId = normalizeIssueText(issueId, "");
  if (!normalizedIssueId) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const maintenanceIssues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];
      return {
        ...travelState,
        maintenanceIssues: maintenanceIssues.map((issue) => {
          if (issue?.id !== normalizedIssueId) {
            return issue;
          }

          return createMaintenanceIssue({
            ...issue,
            ...issuePatch,
            id: issue.id,
          });
        }),
      };
    },
    options,
  );
}

export function setMaintenanceIssueTask(index, issueId, taskPatch = {}, options = {}) {
  return updateMaintenanceIssue(
    index,
    issueId,
    {
      taskType: taskPatch.taskType,
      checkType: taskPatch.checkType,
      recommendedStation: taskPatch.recommendedStation,
      recommendedSkill: taskPatch.recommendedSkill,
      notes: taskPatch.notes,
    },
    options,
  );
}

export function resolveMaintenanceIssue(index, issueId, options = {}) {
  const normalizedIssueId = normalizeIssueText(issueId, "");
  if (!normalizedIssueId) {
    return getShipState(index, options);
  }

  return updateTravelState(
    index,
    (travelState) => {
      const maintenanceIssues = Array.isArray(travelState.maintenanceIssues) ? travelState.maintenanceIssues : [];
      return {
        ...travelState,
        maintenanceIssues: maintenanceIssues.map((issue) => {
          if (issue?.id !== normalizedIssueId) {
            return issue;
          }

          return createMaintenanceIssue({
            ...issue,
            status: "resolved",
          });
        }),
      };
    },
    options,
  );
}
