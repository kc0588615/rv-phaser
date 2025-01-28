import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    init() {
        console.log('Boot: init');
    }

    preload() {
        console.log('Boot: preload started');
        //  The Boot Scene is typically used to load in any assets you require for your Preloader
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        // No assets needed in Boot scene for now
        console.log('Boot: preload completed');
    }

    create() {
        console.log('Boot: starting Preloader scene');
        this.scene.start('Preloader');
    }
}
