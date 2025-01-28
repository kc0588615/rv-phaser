import { IGem } from '../types/Gem'
import { IGridPosition } from '../types/GridPosition'
import { ISwapResult } from '../types/SwapResult'
import { GemTypes } from '../../constants/GemTypes'
import TextureKeys from '../../constants/TextureKeys'
import { MoveAction } from '../types/MoveAction';
import { BackendPuzzleState } from './BackendPuzzleState';
import { ExplodeAndReplacePhase, Match, BackendGem } from './BackendTypes';

interface RowColTransform {
    axis: 'row' | 'col';
    index: number;
    magnitude: number;
}


export default class GridController {
    private scene: Phaser.Scene
    private gems: IGem[][] = []; // Frontend Gem representation
    private backendPuzzleState: BackendPuzzleState; // Backend puzzle state
    private gemSize: number
    private gridWidth: number
    private gridHeight: number
    private margin: number
    private offsetX: number
    private offsetY: number;
    private defaultGemPositions: Phaser.Math.Vector2[][] = []; // Store default positions


    constructor(scene: Phaser.Scene, config: {
        width: number
        height: number
        gemSize: number
        margin?: number
        offsetX?: number
        offsetY?: number
    }) {
        this.scene = scene
        this.gridWidth = config.width
        this.gridHeight = config.height
        this.gemSize = config.gemSize
        this.margin = config.margin || 4
        this.offsetX = config.offsetX || 0
        this.offsetY = config.offsetY || 0;
        this.backendPuzzleState = new BackendPuzzleState(this.gridWidth, this.gridHeight); // Initialize backend state
    }

    public createGrid(): void {
        this.gems = []; // Reset gems array
        this.defaultGemPositions = []; // Reset default positions

        const backendGrid = this.backendPuzzleState.puzzle_state; // Get initial backend grid

        for (let x = 0; x < this.gridWidth; x++) {
            this.gems[x] = [];
            this.defaultGemPositions[x] = [];
            for (let y = 0; y < this.gridHeight; y++) {
                this.createGem(x, y, backendGrid[x][y].gem_type); // Use gem type from backend
            }
        }
        this.storeDefaultGemPositions(); // Store initial positions after creation
    }

    private destroyGrid(): void {
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if (this.gems[x][y]) {
                    this.gems[x][y].sprite.destroy();
                }
            }
        }
        this.gems = [];
        this.defaultGemPositions = [];
    }

    private createGem(gridX: number, gridY: number, gemType: GemTypes): IGem { // Added gemType parameter
        const textureKey = this.getTextureKeyForType(gemType);

        const sprite = this.scene.add.sprite(
            this.gridToPixelX(gridX),
            this.gridToPixelY(gridY),
            textureKey
        )
        .setInteractive();

        sprite.setDisplaySize(this.gemSize, this.gemSize);

        const gem: IGem = {
            type: gemType,
            sprite,
            gridX,
            gridY,
            isMatched: false,
            isFalling: false
        };

        this.gems[gridX][gridY] = gem;
        return gem;
    }

    private getTextureKeyForType(type: GemTypes): TextureKeys {
        switch (type) {
            case GemTypes.BLUE:
                return TextureKeys.BLUE_GEM
            case GemTypes.GREEN:
                return TextureKeys.GREEN_GEM
            case GemTypes.PURPLE:
                return TextureKeys.PURPLE_GEM
            case GemTypes.RED:
                return TextureKeys.RED_GEM
            case GemTypes.YELLOW:
                return TextureKeys.YELLOW_GEM
            default:
                return TextureKeys.BLUE_GEM // Default fallback
        }
    }

    private getRandomGemType(): GemTypes {
        const types = Object.values(GemTypes);
        return types[Math.floor(Math.random() * types.length)];
    }

    public getGemAt(gridX: number, gridY: number): IGem | null {
        return this.gems[gridX]?.[gridY] || null;
    }


    // --- New Sliding and Wrapping Logic ---

    public applyRowColTransform(rowColTransform: RowColTransform): void {
        if (rowColTransform.axis === 'row') {
            this.applyRowTransform(rowColTransform.index, rowColTransform.magnitude);
        } else if (rowColTransform.axis === 'col') {
            this.applyColTransform(rowColTransform.index, rowColTransform.magnitude);
        }
    }

    private applyRowTransform(rowIndex: number, magnitude: number): void {
        for (let x = 0; x < this.gridWidth; x++) {
            const gem = this.gems[x][rowIndex];
            if (gem) {
                gem.sprite.x = this.getWrappedPixelX(gem.gridX, rowIndex, magnitude);
            }
        }
    }

    private applyColTransform(colIndex: number, magnitude: number): void {
        for (let y = 0; y < this.gridHeight; y++) {
            const gem = this.gems[colIndex][y];
            if (gem) {
                gem.sprite.y = this.getWrappedPixelY(colIndex, gem.gridY, magnitude);
            }
        }
    }

    private getWrappedPixelX(gridX: number, gridY: number, magnitude: number): number {
        const defaultX = this.defaultGemPositions[gridX][gridY].x;
        let newX = defaultX + magnitude;
        const gridWidthPixels = this.gridWidth * (this.gemSize + this.margin);
        
        // Allow movement beyond grid boundaries for smooth wrapping
        if (newX < this.offsetX - this.gemSize) {
            newX += gridWidthPixels;
        } else if (newX > this.offsetX + gridWidthPixels) {
            newX -= gridWidthPixels;
        }
        
        return newX;
    }

    private getWrappedPixelY(gridX: number, gridY: number, magnitude: number): number {
        const defaultY = this.defaultGemPositions[gridX][gridY].y;
        let newY = defaultY + magnitude;
        const gridHeightPixels = this.gridHeight * (this.gemSize + this.margin);
        
        // Allow movement beyond grid boundaries for smooth wrapping
        if (newY < this.offsetY - this.gemSize) {
            newY += gridHeightPixels;
        } else if (newY > this.offsetY + gridHeightPixels) {
            newY -= gridHeightPixels;
        }
        
        return newY;
    }

    private wrapValue(value: number, min: number, max: number): number {
        const range = max - min;
        while (value < min) value += range;
        while (value > max) value -= range;
        return value;
    }

    public resetGemPositions(): void {
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                const gem = this.gems[x][y];
                if (gem) {
                    gem.sprite.setPosition(this.defaultGemPositions[x][y].x, this.defaultGemPositions[x][y].y);
                }
            }
        }
    }

    private storeDefaultGemPositions(): void {
        for (let x = 0; x < this.gridWidth; x++) {
            this.defaultGemPositions[x] = [];
            for (let y = 0; y < this.gridHeight; y++) {
                this.defaultGemPositions[x][y] = new Phaser.Math.Vector2(this.gems[x][y].sprite.x, this.gems[x][y].sprite.y);
            }
        }
    }

    public update(): void {
        // Update logic if needed (e.g., for smooth wrapping or animations)
    }

    public getMoveFromRowColTransform(rowColTransform: RowColTransform): MoveAction | null {
        const cellSize = this.gemSize + this.margin;
        let amount = 0;
        
        if (rowColTransform.axis === 'row') {
            // Calculate amount based on total width for smoother wrapping
            const totalWidth = this.gridWidth * cellSize;
            let normalizedMagnitude = rowColTransform.magnitude % totalWidth;
            if (normalizedMagnitude > totalWidth / 2) normalizedMagnitude -= totalWidth;
            if (normalizedMagnitude < -totalWidth / 2) normalizedMagnitude += totalWidth;
            amount = Math.round(normalizedMagnitude / cellSize);
        } else if (rowColTransform.axis === 'col') {
            // Calculate amount based on total height for smoother wrapping
            const totalHeight = this.gridHeight * cellSize;
            let normalizedMagnitude = rowColTransform.magnitude % totalHeight;
            if (normalizedMagnitude > totalHeight / 2) normalizedMagnitude -= totalHeight;
            if (normalizedMagnitude < -totalHeight / 2) normalizedMagnitude += totalHeight;
            amount = -Math.round(normalizedMagnitude / cellSize); // Negative for column movement
        }

        if (amount !== 0) {
            return {
                row_or_col: rowColTransform.axis,
                index: rowColTransform.index,
                amount: amount
            };
        }
        return null;
    }

    public applyBackendMove(moveAction: MoveAction): void {
        this.backendPuzzleState.applyMove(moveAction); // Method to apply move in backend
    }

    public frontendApplyMoveActions(moveActions: MoveAction[]): void {
        for (const moveAction of moveActions) {
            this.applyMoveToGrid(moveAction);
        }
    }

    private applyMoveToGrid(moveAction: MoveAction): void {
        if (moveAction.row_or_col === 'row') {
            const width = this.gridWidth;
            const amount = moveAction.amount % width;
            const rowIndex = moveAction.index;

            if (amount !== 0) {
                const row = this.gems.map(col => col[rowIndex]);
                const movedRow = [...row.slice(-amount), ...row.slice(0, row.length - amount)];

                for (let x = 0; x < width; x++) {
                    this.gems[x][rowIndex] = movedRow[x];
                    if (this.gems[x][rowIndex]) {
                        this.gems[x][rowIndex].gridX = x; // Update gridX after move
                        this.gems[x][rowIndex].gridY = rowIndex; // Update gridY after move
                    }
                }
            }


        } else if (moveAction.row_or_col === 'col') {
            const height = this.gridHeight;
            const amount = moveAction.amount % height;
            const colIndex = moveAction.index;

             if (amount !== 0) {
                const movedColGems = [...this.gems[colIndex].slice(amount), ...this.gems[colIndex].slice(0, amount)];
                this.gems[colIndex] = movedColGems;
                 for (let y = 0; y < height; y++) {
                     if (this.gems[colIndex][y]) {
                        this.gems[colIndex][y].gridX = colIndex; // Update gridX after move
                        this.gems[colIndex][y].gridY = y; // Update gridY after move
                     }
                 }
            }
        }
    }

     public getMatchesFromMove(moveAction: MoveAction): Match[] {
        return this.backendPuzzleState.getMatchesFromHypotheticalMove(moveAction);
    }

    public async processExplodeAndReplace(moveAction: MoveAction): Promise<void> {
        const explodeAndReplacePhase = this.backendPuzzleState.getExplodeAndReplacePhase([moveAction]);

        if (!explodeAndReplacePhase.isNothingToDo()) {
            await this.removeMatches(explodeAndReplacePhase.matches);
            await this.dropGems(); // If needed for falling effect after slide, might not be necessary for slide-only
            await this.fillEmptySpaces(); // If needed, might not be necessary for slide-only
        }
    }

    // --- Match Processing (Simplified - adapt as needed for slide-match) ---
    // You might need to adjust these based on how matches are detected after sliding
    private findAllMatches(): IGridPosition[][] {
        // ... (Adapt the match finding logic if needed for sliding grid) ...
        return []; // Placeholder - adapt or reuse existing logic if suitable
    }

    private async removeMatches(matches: Match[]): Promise<void> {
        // ... (Adapt gem removal for sliding grid) ...
        return Promise.resolve(); // Placeholder - adapt or reuse existing logic if suitable
    }

    private async dropGems(): Promise<void> {
        // ... (Adapt gem dropping for sliding grid - might not be needed) ...
        return Promise.resolve(); // Placeholder - adapt or reuse existing logic if suitable
    }

    private async fillEmptySpaces(): Promise<void> {
        // ... (Adapt filling empty spaces for sliding grid - might not be needed) ...
        return Promise.resolve(); // Placeholder - adapt or reuse existing logic if suitable
    }


    private gridToPixelX(gridX: number): number {
        return gridX * (this.gemSize + this.margin) + this.gemSize / 2 + this.offsetX
    }

    private gridToPixelY(gridY: number): number {
        return gridY * (this.gemSize + this.margin) + this.gemSize / 2 + this.offsetY
    }

    public pixelToGrid(x: number, y: number): IGridPosition | null {
        const gridX = Math.floor((x - this.offsetX) / (this.gemSize + this.margin))
        const gridY = Math.floor((y - this.offsetY) / (this.gemSize + this.margin))

        if (gridX < 0 || gridX >= this.gridWidth ||
            gridY < 0 || gridY >= this.gridHeight) {
            return null
        }

        return { x: gridX, y: gridY }
    }
}