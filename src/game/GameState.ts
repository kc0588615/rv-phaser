export class GameState {
    public static readonly STATES = {
        IDLE: 'idle',
        SWAPPING: 'swapping',
        MATCHING: 'matching',
        FALLING: 'falling',
        GAME_OVER: 'game_over'
    };

    private currentState: string;

    constructor() {
        this.currentState = GameState.STATES.IDLE;
    }

    public setState(state: string): void {
        if (Object.values(GameState.STATES).includes(state)) {
            this.currentState = state;
        } else {
            console.warn(`Invalid state: ${state}`);
        }
    }

    public getState(): string {
        return this.currentState;
    }

    public canAcceptInput(): boolean {
        return this.currentState === GameState.STATES.IDLE;
    }

    public async handleMove(moveAction: any): Promise<boolean> {
        // This will be implemented to handle the move logic
        // For now, return true to indicate success
        return true;
    }
}