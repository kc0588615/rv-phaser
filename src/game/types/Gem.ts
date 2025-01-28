import GemTypes from '../../constants/GemTypes'

export interface IGem {
    type: GemTypes
    sprite: Phaser.GameObjects.Sprite
    gridX: number
    gridY: number
    isMatched: boolean
    isFalling: boolean
}