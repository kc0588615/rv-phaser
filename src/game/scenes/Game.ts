import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import GridController from '../core/GridController';
import { IGem } from '../types/Gem';

export class Game extends Scene {
    private gridController!: GridController;
    private selectedGem: IGem | null = null;
    private canInput: boolean = true;
    private isDragging: boolean = false;
    private dragStartPos: Phaser.Math.Vector2 | null = null;

    constructor() {
        super('Game');
    }

    create(): void {
        const { width, height } = this.scale;

        // Initialize grid with centered position
        this.gridController = new GridController(this, {
            width: 8,
            height: 8,
            gemSize: 64,
            margin: 4,
            offsetX: (width - (8 * 68)) / 2,
            offsetY: (height - (8 * 68)) / 2
        });

        this.gridController.createGrid();
        this.setupInput();

        // Let React know the scene is ready
        EventBus.emit('current-scene-ready', this);
    }

    private setupInput(): void {
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
    }

    private async handlePointerDown(pointer: Phaser.Input.Pointer): Promise<void> {
        if (!this.canInput) return;

        const gridPos = this.gridController.pixelToGrid(pointer.x, pointer.y);
        if (!gridPos) return;

        const gem = this.gridController.getGemAt(gridPos.x, gridPos.y);
        if (!gem) return;

        this.selectedGem = gem;
        this.isDragging = true;
        this.dragStartPos = new Phaser.Math.Vector2(pointer.x, pointer.y);

        // Visual feedback
        gem.sprite.setScale(1.1);
    }

    private async handlePointerMove(pointer: Phaser.Input.Pointer): Promise<void> {
        if (!this.isDragging || !this.selectedGem || !this.dragStartPos) return;

        const dragThreshold = 30; // Minimum drag distance to trigger swap
        const dragDelta = new Phaser.Math.Vector2(
            pointer.x - this.dragStartPos.x,
            pointer.y - this.dragStartPos.y
        );

        if (dragDelta.length() > dragThreshold) {
            // Determine drag direction
            const angle = Phaser.Math.RadToDeg(dragDelta.angle());
            const gridPos = {
                x: this.selectedGem.gridX,
                y: this.selectedGem.gridY
            };

            // Convert angle to grid direction
            if (angle > -45 && angle <= 45) { // Right
                gridPos.x += 1;
            } else if (angle > 45 && angle <= 135) { // Down
                gridPos.y += 1;
            } else if (angle > 135 || angle <= -135) { // Left
                gridPos.x -= 1;
            } else { // Up
                gridPos.y -= 1;
            }

            // Attempt swap
            const targetGem = this.gridController.getGemAt(gridPos.x, gridPos.y);
            if (targetGem) {
                await this.trySwapGems(this.selectedGem, targetGem);
            }

            this.resetSelectedGem();
        }
    }

    private async handlePointerUp(): Promise<void> {
        this.resetSelectedGem();
    }

    private resetSelectedGem(): void {
        if (this.selectedGem) {
            this.selectedGem.sprite.setScale(1);
            this.selectedGem = null;
        }
        this.isDragging = false;
        this.dragStartPos = null;
    }

    private async trySwapGems(gem1: IGem, gem2: IGem): Promise<void> {
        if (!this.canInput) return;

        this.canInput = false;

        const swapResult = await this.gridController.handleSwap(gem1, gem2);

        if (swapResult.success) {
            await this.gridController.processMatches();
        }

        this.canInput = true;
    }
}