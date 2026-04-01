import { STATIONS, TRAVEL_TERM } from "../config/constants.js";

export const DEFAULT_SHARED_SHIP_ID = "shared-default";

function cloneData(data) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data));
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
    arcflight: {
      term: TRAVEL_TERM,
      currentSector: null,
      daysElapsed: 0,
    },
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
