import { Scene } from 'phaser';
import TextureKeys from '../../constants/TextureKeys';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload(): void {
        // Load gem textures
        this.load.setPath('assets');
        this.load.image(TextureKeys.BLUE_GEM, 'blue_gem.png');
        this.load.image(TextureKeys.GREEN_GEM, 'green_gem.png');
        this.load.image(TextureKeys.PURPLE_GEM, 'purple_gem.png');
        this.load.image(TextureKeys.RED_GEM, 'red_gem.png');
        this.load.image(TextureKeys.YELLOW_GEM, 'yellow_gem.png');
    }

    create(): void {
        this.scene.start('Game');
    }
}