import { BackendGem, ExplodeAndReplacePhase, Match, IBackendGem, IExplodeAndReplacePhase } from './BackendTypes';
import { GemTypes } from '../../constants/GemTypes';
import { MoveAction } from '../types/MoveAction';
import { IGridPosition } from '../types/GridPosition';

import * as Phaser from 'phaser';


export { BackendPuzzleState };

class BackendPuzzleState {
    puzzle_state: BackendGem[][];
    width: number;
    height: number;
    next_gems_to_spawn: GemTypes[];

    constructor(width: number, height: number) {
        this.puzzle_state = this.getInitialPuzzleStateWithNoMatches(width, height);
        this.width = width;
        this.height = height;
        this.next_gems_to_spawn = [];
    }

    private getInitialPuzzleStateWithNoMatches(width: number, height: number): BackendGem[][] {
        const gemTypes = Object.values(GemTypes).filter(v => typeof v === 'string') as GemTypes[]; // Filter out enum keys

        const grid: BackendGem[][] = [];
        for (let x = 0; x < width; x++) {
            grid[x] = [];
            for (let y = 0; y < height; y++) {
                let possibleGems = [...gemTypes];

                if (y >= 2 && grid[x][y - 1].gem_type === grid[x][y - 2].gem_type) {
                    possibleGems = possibleGems.filter(gem => gem !== grid[x][y - 1].gem_type);
                }

                if (x >= 2 && grid[x - 1][y].gem_type === grid[x - 2][y].gem_type) {
                    possibleGems = possibleGems.filter(gem => gem !== grid[x - 1][y].gem_type);
                }

                const randomGemType = possibleGems[Math.floor(Math.random() * possibleGems.length)] || gemTypes[0]; // Fallback if no possible gems
                grid[x].push(new BackendGem(randomGemType));
            }
        }
        return grid;
    }

    public getExplodeAndReplacePhase(actions: MoveAction[]): ExplodeAndReplacePhase {
        for (const action of actions) {
            this.puzzle_state = this.getPuzzleStateAfterMove(this.puzzle_state, action);
        }

        let matches = this.getMatches(this.puzzle_state);
        let replacements: [number, GemTypes[]][] = [];
        let processedColumns: Set<number> = new Set();

        while (matches.length > 0) {
            const gemsToRemove = new Set<IGridPosition>();
            for (const match of matches) {
                match.forEach(pos => gemsToRemove.add(pos));
            }

            const columnGemCounts: Map<number, number> = new Map();
            gemsToRemove.forEach(pos => {
                columnGemCounts.set(pos.x, (columnGemCounts.get(pos.x) || 0) + 1);
            });

            replacements = [];
            columnGemCounts.forEach((count, col) => {
                const replacementGems = Array(count).fill(null).map(() => this.getNextGemToSpawn().gem_type);
                replacements.push([col, replacementGems]);
                processedColumns.add(col); // Track columns with replacements
            });


            this.applyExplodeAndReplacePhase(new ExplodeAndReplacePhase(matches, replacements));
            const nextMatches = this.getMatches(this.puzzle_state);
            if (nextMatches.length === matches.length) { // Prevent infinite loop if no new matches are formed
                break;
            }
            matches = nextMatches; // Process new matches in cascade
        }


        return new ExplodeAndReplacePhase(matches, replacements);
    }


    public getMatchesFromHypotheticalMove(moveAction: MoveAction): Match[] {
        const hypotheticalState = this.getPuzzleStateAfterMove(this.puzzle_state, moveAction);
        return this.getMatches(hypotheticalState);
    }

    private getNextGemToSpawn(): BackendGem {
        if (this.next_gems_to_spawn.length > 0) {
            return new BackendGem(this.next_gems_to_spawn.shift()!);
        }
        const gemTypes = Object.values(GemTypes).filter(v => typeof v === 'string') as GemTypes[];
        return new BackendGem(gemTypes[Math.floor(Math.random() * gemTypes.length)] || GemTypes.BLUE); // Default to BLUE if no types
    }


    public addNextGemToSpawn(gemType: GemTypes): void {
        this.next_gems_to_spawn.push(gemType);
    }

    public addNextGemsToSpawn(gemTypes: GemTypes[]): void {
        this.next_gems_to_spawn.push(...gemTypes);
    }

    private getMatches(puzzleState: BackendGem[][]): Match[] {
        const matches: Match[] = [];
        const width = puzzleState.length;
        const height = puzzleState[0].length;

        // Horizontal matches
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let match: IGridPosition[] = [];
                for (let dx = 0; x + dx < width && puzzleState[x + dx][y].equals(puzzleState[x][y]); dx++) {
                    match.push({ x: x + dx, y });
                }
                if (match.length >= 3) {
                    matches.push(match);
                    x += match.length - 1; // Skip matched gems
                }
            }
        }


        // Vertical matches
        for (let x = 0; x < width; x++) {
             for (let y = 0; y < height; y++) {
                let match: IGridPosition[] = [];
                for (let dy = 0; y + dy < height && puzzleState[x][y + dy].equals(puzzleState[x][y]); dy++) {
                    match.push({ x, y: y + dy });
                }
                if (match.length >= 3) {
                    matches.push(match);
                    y += match.length - 1; // Skip matched gems
                }
            }
        }

        return matches;
    }


    private getPuzzleStateAfterMove(puzzleState: BackendGem[][], moveAction: MoveAction): BackendGem[][] {
        const stateAfterMove: BackendGem[][] = puzzleState.map(col => [...col]); // Deep copy columns

        if (moveAction.row_or_col === 'row') {
            const width = this.width;
            const amount = moveAction.amount % width;
            const rowIndex = moveAction.index;

            const row = stateAfterMove.map(col => col[rowIndex]);
            const movedRow = [...row.slice(-amount), ...row.slice(0, row.length - amount)];


            for (let x = 0; x < width; x++) {
                stateAfterMove[x][rowIndex] = movedRow[x];
            }


        } else if (moveAction.row_or_col === 'col') {
            const height = this.height;
            const amount = moveAction.amount % height;
            const colIndex = moveAction.index;


            const movedCol = [...stateAfterMove[colIndex].slice(amount), ...stateAfterMove[colIndex].slice(0, amount)];
             stateAfterMove[colIndex] = movedCol;

        }

        return stateAfterMove;
    }


    private applyExplodeAndReplacePhase(phase: ExplodeAndReplacePhase): void {
        const explodePositions = new Set<string>(); // Use string key for Set

        phase.matches.forEach(match => {
            match.forEach(pos => explodePositions.add(`${pos.x},${pos.y}`)); // Store positions as "x,y"
        });

        phase.replacements.forEach(([colIndex, replacementGems]) => {
            const currentColumn = [...this.puzzle_state[colIndex]]; // Copy column
            const gemsToRemoveCount = replacementGems.length;


            const updatedColumn: BackendGem[] = currentColumn.filter((_, index) => !explodePositions.has(`${colIndex},${index}`)); // Filter out exploded gems in this column

             // Add new gems at the top
            const newGems = replacementGems.map(gemType => new BackendGem(gemType));
            updatedColumn.unshift(...newGems);


            if (updatedColumn.length > this.height) {
                updatedColumn.length = this.height; // Trim if column became too long
            }


             this.puzzle_state[colIndex] = updatedColumn; // Assign updated column back

        });
    }


    public reset(): void {
        this.puzzle_state = this.getInitialPuzzleStateWithNoMatches(this.width, this.height);
    }
}