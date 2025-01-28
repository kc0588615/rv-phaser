import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import GridController from '../core/GridController';
import { GameState } from '../GameState';
import { InputManager } from '../InputManager';
import { MoveAction } from '../types/MoveAction';

export class Game extends Scene {
    private gridController!: GridController;
    private gameState!: GameState;
    private inputManager!: InputManager;

    constructor() {
        super('Game');
    }

    create(): void {
        console.log('Game: create started');
        const { width, height } = this.scale;

        try {
            console.log('Game: initializing GridController');
            this.gridController = new GridController(this, {
                width: 7,
                height: 8,
                gemSize: 64,
                margin: 4,
                offsetX: (width - (7 * 68)) / 2,
                offsetY: (height - (8 * 68)) / 2
            });

            console.log('Game: initializing GameState');
            this.gameState = new GameState();
            
            console.log('Game: initializing InputManager');
            this.inputManager = new InputManager(
                this.gameState,
                this.gridController,
                this.input
            );

            console.log('Game: creating grid');
            this.gridController.createGrid();

            // Listen for move events
            this.inputManager.on('move-completed', this.onMoveCompleted, this);
            this.inputManager.on('move-reverted', this.onMoveReverted, this);

            console.log('Game: setup complete, emitting ready event');
            EventBus.emit('current-scene-ready', this);
        } catch (error) {
            console.error('Game: Error during initialization:', error);
        }
    }

    private onMoveCompleted(moveAction: MoveAction): void {
        // Apply the move to both backend and frontend
        this.gridController.applyBackendMove(moveAction);
        this.gridController.frontendApplyMoveActions([moveAction]);
        
        // Process any matches that occurred
        this.gridController.processExplodeAndReplace(moveAction);
    }

    private onMoveReverted(moveAction: MoveAction | null): void {
        // Reset the grid to its previous state
        this.gridController.resetGemPositions();
    }

    update(): void {
        this.gridController.update();
    }
}