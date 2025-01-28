import { GemTypes } from '../../constants/GemTypes';
import { IGridPosition } from '../types/GridPosition';

export interface IBackendGem {
    gem_type: GemTypes;
}

export class BackendGem implements IBackendGem {
    gem_type: GemTypes;

    constructor(gem_type: GemTypes) {
        this.gem_type = gem_type;
    }

    equals(other: BackendGem): boolean {
        return this.gem_type === other.gem_type;
    }
}


export interface IExplodeAndReplacePhase {
    matches: Match[];
    replacements: [number, GemTypes[]][];
    isNothingToDo(): boolean;
}

export class ExplodeAndReplacePhase implements IExplodeAndReplacePhase {
    matches: Match[];
    replacements: [number, GemTypes[]][];

    constructor(matches: Match[], replacements: [number, GemTypes[]][]) {
        this.matches = matches;
        this.replacements = replacements;
    }

    isNothingToDo(): boolean {
        return this.matches.length === 0;
    }
}


export type Match = IGridPosition[];