import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class AnimationManager {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public moveGem(sprite: Phaser.GameObjects.Sprite, x: number, y: number): Promise<void> {
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: sprite,
                x,
                y,
                duration: GameConfig.ANIMATION.SNAP_DURATION,
                ease: 'Power2',
                onComplete: () => resolve()
            });
        });
    }

    public snapToPosition(sprite: Phaser.GameObjects.Sprite, x: number, y: number): Promise<void> {
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: sprite,
                x,
                y,
                duration: GameConfig.ANIMATION.SNAP_DURATION,
                ease: 'Back.easeOut',
                onComplete: () => resolve()
            });
        });
    }

    public gemFall(sprite: Phaser.GameObjects.Sprite, targetY: number, distance: number, gemSize: number): Promise<void> {
        const duration = (distance * gemSize) / GameConfig.ANIMATION.FALL_SPEED * 1000;
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: sprite,
                y: targetY,
                duration,
                ease: 'Bounce.easeOut',
                onComplete: () => resolve()
            });
        });
    }

    public destroyGem(sprite: Phaser.GameObjects.Sprite): Promise<void> {
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: sprite,
                scale: 0,
                alpha: 0,
                duration: GameConfig.ANIMATION.DESTROY_DURATION,
                ease: 'Power2',
                onComplete: () => {
                    sprite.destroy();
                    resolve();
                }
            });
        });
    }
}