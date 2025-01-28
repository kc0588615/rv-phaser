import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';

function App() {
    const phaserRef = useRef<IRefPhaserGame>(null);

    const handleSceneChange = (scene: Phaser.Scene) => {
        console.log('Current active scene:', scene.scene.key);
    };

    return (
        <div className="app">
            <PhaserGame ref={phaserRef} currentActiveScene={handleSceneChange} />
        </div>
    );
}

export default App;