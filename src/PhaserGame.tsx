import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import { Game } from 'phaser';
import { EventBus } from './EventBus';
import { Preloader } from './game/scenes/Preloader';
import { Game as GameScene } from './game/scenes/Game';

export interface IRefPhaserGame {
    game: Game | null;
    scene: Phaser.Scene | null;
}

interface IProps {
    currentActiveScene?: (scene: Phaser.Scene) => void;
}

const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 600,
    backgroundColor: '#333333',
    scene: [Preloader, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(({ currentActiveScene }, ref) => {
    const gameRef = useRef<Game | null>(null);

    useLayoutEffect(() => {
        if (!gameRef.current) {
            gameRef.current = new Game(gameConfig);

            if (typeof ref === 'function') {
                ref({ game: gameRef.current, scene: null });
            } else if (ref) {
                ref.current = { game: gameRef.current, scene: null };
            }
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [ref]);

    useEffect(() => {
        const handleSceneReady = (scene: Phaser.Scene) => {
            if (currentActiveScene) {
                currentActiveScene(scene);
            }

            if (typeof ref === 'function') {
                ref({ game: gameRef.current, scene });
            } else if (ref) {
                ref.current = { game: gameRef.current, scene };
            }
        };

        EventBus.on('current-scene-ready', handleSceneReady);
        
        return () => {
            EventBus.off('current-scene-ready', handleSceneReady);
        };
    }, [currentActiveScene, ref]);

    return <div id="game-container" />;
});