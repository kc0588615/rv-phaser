import { GameConfig } from '../config/GameConfig';
import { MoveAction } from './types/MoveAction';
import { GameState } from './GameState';
import GridController from './core/GridController';
import * as Phaser from 'phaser';

export class InputManager {
    private gameState: GameState;
    private gridController: GridController;
    private emitter: Phaser.Events.EventEmitter;
    private dragState: {
        isDragging: boolean;
        startX: number;
        startY: number;
        startPointerX: number;
        startPointerY: number;
        direction: 'row' | 'col' | null;
        selectedGem: Phaser.GameObjects.Sprite | null;
    };

    constructor(gameState: GameState, gridController: GridController, input: Phaser.Input.InputPlugin) {
        this.gameState = gameState;
        this.gridController = gridController;
        this.emitter = new Phaser.Events.EventEmitter();
        this.dragState = {
            isDragging: false,
            startX: 0,
            startY: 0,
            startPointerX: 0,
            startPointerY: 0,
            direction: null,
            selectedGem: null
        };

        if (input) {
            this.setupListeners(input);
        }
    }

    private setupListeners(input: Phaser.Input.InputPlugin): void {
        input.on('pointerdown', this.onPointerDown, this);
        input.on('pointermove', this.onPointerMove, this);
        input.on('pointerup', this.onPointerUp, this);
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.gameState.canAcceptInput()) return;

        const gridPos = this.gridController.pixelToGrid(pointer.x, pointer.y);
        if (!gridPos) return;

        const gem = this.gridController.getGemAt(gridPos.x, gridPos.y);
        if (!gem?.sprite) return;

        this.dragState.isDragging = true;
        this.dragState.startX = gridPos.x;
        this.dragState.startY = gridPos.y;
        this.dragState.startPointerX = pointer.x;
        this.dragState.startPointerY = pointer.y;
        this.dragState.direction = null;
        this.dragState.selectedGem = gem.sprite;

        gem.sprite.setScale(1.1);
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.dragState.isDragging || !this.gameState.canAcceptInput()) return;

        const deltaX = pointer.x - this.dragState.startPointerX;
        const deltaY = pointer.y - this.dragState.startPointerY;
        const dragDistance = Phaser.Math.Distance.Between(
            pointer.x, pointer.y,
            this.dragState.startPointerX,
            this.dragState.startPointerY
        );

        if (!this.dragState.direction && dragDistance > GameConfig.INPUT.DRAG_START_THRESHOLD) {
            const angle = Math.abs(Phaser.Math.RadToDeg(
                Phaser.Math.Angle.Between(0, 0, deltaX, deltaY)
            ));

            if (angle <= GameConfig.INPUT.DIRECTION_ANGLE_THRESHOLD ||
                angle >= 180 - GameConfig.INPUT.DIRECTION_ANGLE_THRESHOLD) {
                this.dragState.direction = 'row';
            } else if (Math.abs(angle - 90) <= GameConfig.INPUT.DIRECTION_ANGLE_THRESHOLD) {
                this.dragState.direction = 'col';
            }
        }

        if (this.dragState.direction) {
            const transform = {
                axis: this.dragState.direction,
                index: this.dragState.direction === 'row' ? this.dragState.startY : this.dragState.startX,
                magnitude: this.dragState.direction === 'row' ? deltaX : deltaY
            };
            this.gridController.applyRowColTransform(transform);
        }
    }

    private async onPointerUp(pointer: Phaser.Input.Pointer): Promise<void> {
        if (!this.dragState.isDragging || !this.gameState.canAcceptInput()) {
            this.cleanupDragState();
            return;
        }

        if (!this.dragState.direction) {
            this.cleanupDragState();
            return;
        }

        const deltaX = pointer.x - this.dragState.startPointerX;
        const deltaY = pointer.y - this.dragState.startPointerY;
        const cellSize = GameConfig.GRID.GEM_SIZE + GameConfig.GRID.MARGIN;
        const movement = this.dragState.direction === 'row' ? deltaX : deltaY;
        const cellsMoved = movement / cellSize;

        try {
            if (Math.abs(cellsMoved) >= GameConfig.INPUT.CELL_MOVE_THRESHOLD) {
                const amount = this.dragState.direction === 'row' ?
                    Math.round(deltaX / cellSize) :
                    -Math.round(deltaY / cellSize);
                const index = this.dragState.direction === 'row' ?
                    this.dragState.startY :
                    this.dragState.startX;

                this.gameState.setState(GameState.STATES.SWAPPING);
                const moveAction = {
                    row_or_col: this.dragState.direction,
                    index,
                    amount
                };
                
                const matches = this.gridController.getMatchesFromMove(moveAction);
                const success = await this.gameState.handleMove(moveAction);
                if (success) {
                    this.emitter.emit('move-completed', moveAction);
                } else {
                    this.emitter.emit('move-reverted', moveAction);
                }
            } else {
                this.emitter.emit('move-reverted', null);
            }
        } catch (error) {
            console.error('Error during move:', error);
            this.emitter.emit('move-reverted', null);
        } finally {
            this.gameState.setState(GameState.STATES.IDLE);
            this.cleanupDragState();
        }
    }

    private cleanupDragState(): void {
        if (this.dragState.selectedGem) {
            this.dragState.selectedGem.setScale(1);
        }
        this.dragState.isDragging = false;
        this.dragState.direction = null;
        this.dragState.selectedGem = null;
        this.gridController.resetGemPositions();
    }

    public on(event: string, callback: Function, context?: any): void {
        this.emitter.on(event, callback, context);
    }

    public off(event: string, callback: Function, context?: any): void {
        this.emitter.off(event, callback, context);
    }
public getListeners(): {[event: string]: number} {
    const result: {[event: string]: number} = {};
    const eventNames = this.emitter.eventNames();
    for (const name of eventNames) {
        if (typeof name === 'string') {
            result[name] = this.emitter.listenerCount(name);
        }
    }
    return result;
}
}