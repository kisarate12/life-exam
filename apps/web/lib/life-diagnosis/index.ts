export * from "./types";
export * from "./characters";
export { diagnose, runDiagnosis, getCharacterResult, lifeStatsFromExamRanks } from "./logic";
export type { CharacterResult } from "./logic";
export { getEvolutionTarget, getDegradationTarget } from "./evolution";
export type { EvolutionTarget, DegradationTarget } from "./evolution";
export { getEvolutionMapInfo, SUMMIT_MESSAGE } from "./evolution-map";
export type { EvolutionMapEntry } from "./evolution-map";
