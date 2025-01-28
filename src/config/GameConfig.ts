export const GameConfig = {
    INPUT: {
        DRAG_START_THRESHOLD: 10, // Minimum pixels moved before drag is recognized
        DIRECTION_ANGLE_THRESHOLD: 30, // Angle threshold for determining row vs column drag
        CELL_MOVE_THRESHOLD: 0.5, // Minimum cell movement required to trigger a move
    },
    GRID: {
        GEM_SIZE: 64,
        MARGIN: 4,
        WIDTH: 7,
        HEIGHT: 8,
    },
    ANIMATION: {
        SNAP_DURATION: 200, // Duration of snap animation in ms
        FALL_SPEED: 800, // Pixels per second for falling gems
        DESTROY_DURATION: 300, // Duration of gem destroy animation in ms
    }
};