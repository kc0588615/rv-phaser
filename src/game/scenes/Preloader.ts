import { Scene } from 'phaser';
import TextureKeys from '../../constants/TextureKeys';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload(): void {
        console.log('Preloader: preload started');
        // Load gem textures
        this.load.image(TextureKeys.BLUE_GEM, '/assets/blue_gem.png');
        this.load.image(TextureKeys.GREEN_GEM, '/assets/green_gem.png');
        this.load.image(TextureKeys.PURPLE_GEM, '/assets/purple_gem.png');
        this.load.image(TextureKeys.RED_GEM, '/assets/red_gem.png');
        this.load.image(TextureKeys.YELLOW_GEM, '/assets/yellow_gem.png');

        this.load.on('complete', () => {
            console.log('Preloader: all assets loaded');
        });
    }

    create(): void {
        console.log('Preloader: starting Game scene');
        this.scene.start('Game');
    }
}