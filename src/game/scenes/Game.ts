import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import GridController from '../core/GridController';
import { IGem } from '../types/Gem';
import { IGridPosition } from '../types/GridPosition';

// Define interfaces similar to Python's RowColTransform and TweenedRowColTransform
interface RowColTransform {
    axis: 'row' | 'col';
    index: number;
    magnitude: number;
}

interface TweenedRowColTransform {
    axis: 'row' | 'col';
    index: number;
    maxMagnitude: number;
    secondsSinceRelease: number;
    tweenTime: number;
}

export class Game extends Scene {
    private gridController!: GridController;
    private selectedGem: IGem | null = null;
    private canInput: boolean = true;
    private isDragging: boolean = false;
    private dragStartPos: Phaser.Math.Vector2 | null = null;
    private currentDragPos: Phaser.Math.Vector2 | null = null;
    private rowColTransform: RowColTransform | null = null; // Track current drag transform

    constructor() {
        super('Game');
    }

    create(): void {
        const { width, height } = this.scale;

        this.gridController = new GridController(this, {
            width: 7, // Adjusted width to match Python example
            height: 8, // Adjusted height to match Python example
            gemSize: 64,
            margin: 4,
            offsetX: (width - (7 * 68)) / 2, // Adjusted for new width
            offsetY: (height - (8 * 68)) / 2
        });

        this.gridController.createGrid();
        this.setupInput();

        EventBus.emit('current-scene-ready', this);
    }

    private setupInput(): void {
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.canInput) return;

        const gridPos = this.gridController.pixelToGrid(pointer.x, pointer.y);
        if (!gridPos) return;

        const gem = this.gridController.getGemAt(gridPos.x, gridPos.y);
        if (!gem) return;

        this.selectedGem = gem;
        this.isDragging = true;
        this.dragStartPos = new Phaser.Math.Vector2(pointer.x, pointer.y);
        this.currentDragPos = new Phaser.Math.Vector2(pointer.x, pointer.y);
        this.rowColTransform = null; // Reset transform on new drag

        gem.sprite.setScale(1.1);
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.isDragging || !this.selectedGem || !this.dragStartPos) return;

        this.currentDragPos = new Phaser.Math.Vector2(pointer.x, pointer.y);
        const dragVector = this.currentDragPos.subtract(this.dragStartPos);

        this.rowColTransform = this.getRowColTransformFromDragVector(dragVector, this.selectedGem.gridX, this.selectedGem.gridY);

        if (this.rowColTransform) {
            this.gridController.applyRowColTransform(this.rowColTransform);
        }
    }

    private handlePointerUp(): void {
        if (this.isDragging && this.selectedGem && this.rowColTransform) {
            this.snapRowColTransform(this.rowColTransform); // Snap animation (can be immediate for minimal example)
            // After snap, process matches - will be implemented later
            this.processSlideMove(this.rowColTransform);
        }
        this.resetSelectedGem();
    }

    private resetSelectedGem(): void {
        if (this.selectedGem) {
            this.selectedGem.sprite.setScale(1);
            this.selectedGem = null;
        }
        this.isDragging = false;
        this.dragStartPos = null;
        this.currentDragPos = null;
        this.rowColTransform = null;
        this.gridController.resetGemPositions(); // Reset to default positions after drag end
    }

    private getRowColTransformFromDragVector(dragVector: Phaser.Math.Vector2, clickedGridX: number, clickedGridY: number): RowColTransform | null {
        const angleInRads = Phaser.Math.Angle.Between(0, 0, dragVector.x, dragVector.y);
        const angleInDegrees = Phaser.Math.RadToDeg(angleInRads);
        const directionalScalingFactor = Math.abs(Math.cos(angleInDegrees * 2 * Math.PI / 180)); // Convert to radians for Math.cos

        if (Math.abs(dragVector.x) > Math.abs(dragVector.y)) {
            return {
                axis: 'row',
                index: clickedGridY,
                magnitude: dragVector.x * directionalScalingFactor
            };
        } else if (Math.abs(dragVector.y) > Math.abs(dragVector.x)) { // Added condition for vertical drag
            return {
                axis: 'col',
                index: clickedGridX,
                magnitude: dragVector.y * directionalScalingFactor
            };
        }
        return null; // No significant drag
    }

    private snapRowColTransform(rowColTransform: RowColTransform): void {
        // For minimal example, we can directly snap without tweening.
        // In a real game, you'd use tweens for smooth snapping.
        this.gridController.resetGemPositions(); // Reset to default positions
        const moveAction = this.gridController.getMoveFromRowColTransform(rowColTransform);
        if (moveAction) {
           this.gridController.applyBackendMove(moveAction); // Apply move to backend grid representation
           this.gridController.frontendApplyMoveActions([moveAction]); // Apply to frontend gem positions for final snap
        }
    }

    private async processSlideMove(rowColTransform: RowColTransform): Promise<void> {
        if (!this.canInput) return;
        this.canInput = false;

        const moveAction = this.gridController.getMoveFromRowColTransform(rowColTransform);

        if (moveAction) {
            const matches = this.gridController.getMatchesFromMove(moveAction);

            if (matches.length > 0) {
                await this.gridController.processExplodeAndReplace(moveAction);
            }
        }

        this.canInput = true;
    }


    update(): void {
        if (this.rowColTransform) {
            this.gridController.applyRowColTransform(this.rowColTransform);
        }
        this.gridController.update(); // Update gem positions based on applied transform and falling
    }
}