import { STATIONS, TRAVEL_TERM } from "../config/constants.js";

/**
 * Create the initial shared ship state.
 * This is intentionally minimal and is the single state direction for future
 * voyage and combat systems.
 */
export function createDefaultShipState() {
  return {
    identity: {
      id: null,
      name: "New Spelljammer",
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
