import { IGem } from '../types/Gem'
import { IGridPosition } from '../types/GridPosition'
import { ISwapResult } from '../types/SwapResult'
import GemTypes from '../../constants/GemTypes'
import TextureKeys from '../../constants/TextureKeys'

export default class GridController {
    private scene: Phaser.Scene
    private gems: IGem[][]
    private gemSize: number
    private gridWidth: number
    private gridHeight: number
    private margin: number
    private offsetX: number
    private offsetY: number
    
    constructor(scene: Phaser.Scene, config: {
        width: number
        height: number
        gemSize: number
        margin?: number
        offsetX?: number
        offsetY?: number
    }) {
        this.scene = scene
        this.gridWidth = config.width
        this.gridHeight = config.height
        this.gemSize = config.gemSize
        this.margin = config.margin || 4
        this.offsetX = config.offsetX || 0
        this.offsetY = config.offsetY || 0
        this.gems = []
    }

    public createGrid(): void {
        for (let x = 0; x < this.gridWidth; x++) {
            this.gems[x] = []
            for (let y = 0; y < this.gridHeight; y++) {
                this.createGem(x, y)
            }
        }
        
        // Ensure no matches exist at start
        while (this.findAllMatches().length > 0) {
            this.destroyGrid()
            this.createGrid()
        }
    }

    private destroyGrid(): void {
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if (this.gems[x][y]) {
                    this.gems[x][y].sprite.destroy()
                }
            }
        }
        this.gems = []
    }

    private createGem(gridX: number, gridY: number): IGem {
        const type = this.getRandomGemType()
        const textureKey = this.getTextureKeyForType(type)
        
        const sprite = this.scene.add.sprite(
            this.gridToPixelX(gridX),
            this.gridToPixelY(gridY),
            textureKey
        )
        .setInteractive()

        sprite.setDisplaySize(this.gemSize, this.gemSize)

        const gem: IGem = {
            type,
            sprite,
            gridX,
            gridY,
            isMatched: false,
            isFalling: false
        }

        this.gems[gridX][gridY] = gem
        return gem
    }

    private getTextureKeyForType(type: GemTypes): TextureKeys {
        switch (type) {
            case GemTypes.BLUE:
                return TextureKeys.BLUE_GEM
            case GemTypes.GREEN:
                return TextureKeys.GREEN_GEM
            case GemTypes.PURPLE:
                return TextureKeys.PURPLE_GEM
            case GemTypes.RED:
                return TextureKeys.RED_GEM
            case GemTypes.YELLOW:
                return TextureKeys.YELLOW_GEM
        }
    }

    private getRandomGemType(): GemTypes {
        const types = Object.values(GemTypes)
        return types[Math.floor(Math.random() * types.length)]
    }

    public getGemAt(gridX: number, gridY: number): IGem | null {
        return this.gems[gridX]?.[gridY] || null
    }

    public async handleSwap(gem1: IGem, gem2: IGem): Promise<ISwapResult> {
        if (!this.areGemsAdjacent(gem1, gem2)) {
            return { success: false }
        }

        await this.swapGemPositions(gem1, gem2)
        
        const matches = this.findAllMatches()
        if (matches.length === 0) {
            await this.swapGemPositions(gem1, gem2) // Swap back
            return { success: false }
        }

        return { success: true, matches }
    }

    private areGemsAdjacent(gem1: IGem, gem2: IGem): boolean {
        const xDiff = Math.abs(gem1.gridX - gem2.gridX)
        const yDiff = Math.abs(gem1.gridY - gem2.gridY)
        return (xDiff === 1 && yDiff === 0) || (xDiff === 0 && yDiff === 1)
    }

    private async swapGemPositions(gem1: IGem, gem2: IGem): Promise<void> {
        return new Promise(resolve => {
            const tempX = gem1.gridX
            const tempY = gem1.gridY
            
            gem1.gridX = gem2.gridX
            gem1.gridY = gem2.gridY
            gem2.gridX = tempX
            gem2.gridY = tempY

            this.gems[gem1.gridX][gem1.gridY] = gem1
            this.gems[gem2.gridX][gem2.gridY] = gem2

            this.scene.tweens.add({
                targets: gem1.sprite,
                x: this.gridToPixelX(gem1.gridX),
                y: this.gridToPixelY(gem1.gridY),
                duration: 200,
                ease: 'Power2'
            })

            this.scene.tweens.add({
                targets: gem2.sprite,
                x: this.gridToPixelX(gem2.gridX),
                y: this.gridToPixelY(gem2.gridY),
                duration: 200,
                ease: 'Power2',
                onComplete: () => resolve()
            })
        })
    }

    private findAllMatches(): IGridPosition[][] {
        const matches: IGridPosition[][] = []
        
        // Check horizontal matches
        for (let y = 0; y < this.gridHeight; y++) {
            let matchLength = 1
            let currentType = null
            let matchStart = 0
            
            for (let x = 0; x < this.gridWidth; x++) {
                const checkType = this.gems[x][y]?.type
                
                if (checkType === currentType && checkType !== null) {
                    matchLength++
                } else {
                    if (matchLength >= 3) {
                        const match: IGridPosition[] = []
                        for (let i = matchStart; i < x; i++) {
                            match.push({ x: i, y })
                        }
                        matches.push(match)
                    }
                    currentType = checkType
                    matchStart = x
                    matchLength = 1
                }
            }
            
            if (matchLength >= 3) {
                const match: IGridPosition[] = []
                for (let i = matchStart; i < this.gridWidth; i++) {
                    match.push({ x: i, y })
                }
                matches.push(match)
            }
        }

        // Check vertical matches
        for (let x = 0; x < this.gridWidth; x++) {
            let matchLength = 1
            let currentType = null
            let matchStart = 0
            
            for (let y = 0; y < this.gridHeight; y++) {
                const checkType = this.gems[x][y]?.type
                
                if (checkType === currentType && checkType !== null) {
                    matchLength++
                } else {
                    if (matchLength >= 3) {
                        const match: IGridPosition[] = []
                        for (let i = matchStart; i < y; i++) {
                            match.push({ x, y: i })
                        }
                        matches.push(match)
                    }
                    currentType = checkType
                    matchStart = y
                    matchLength = 1
                }
            }
            
            if (matchLength >= 3) {
                const match: IGridPosition[] = []
                for (let i = matchStart; i < this.gridHeight; i++) {
                    match.push({ x, y: i })
                }
                matches.push(match)
            }
        }

        return matches
    }

    public async processMatches(): Promise<void> {
        let matches: IGridPosition[][] = []
        do {
            matches = this.findAllMatches()
            if (matches.length > 0) {
                await this.removeMatches(matches)
                await this.dropGems()
                await this.fillEmptySpaces()
            }
        } while (matches.length > 0)
    }

    private async removeMatches(matches: IGridPosition[][]): Promise<void> {
        return new Promise(resolve => {
            let totalGems = 0
            let destroyedGems = 0

            matches.forEach(match => {
                match.forEach(pos => {
                    const gem = this.gems[pos.x][pos.y]
                    if (gem) {
                        totalGems++
                        this.scene.tweens.add({
                            targets: gem.sprite,
                            alpha: 0,
                            scale: 0,
                            duration: 200,
                            onComplete: () => {
                                gem.sprite.destroy()
                                destroyedGems++
                                if (destroyedGems === totalGems) {
                                    match.forEach(pos => {
                                        this.gems[pos.x][pos.y] = null
                                    })
                                    resolve()
                                }
                            }
                        })
                    }
                })
            })

            if (totalGems === 0) {
                resolve()
            }
        })
    }

    private async dropGems(): Promise<void> {
        return new Promise(resolve => {
            let falling = 0
            let landed = 0

            for (let x = 0; x < this.gridWidth; x++) {
                let shift = 0
                for (let y = this.gridHeight - 1; y >= 0; y--) {
                    const gem = this.gems[x][y]
                    if (!gem) {
                        shift++
                        continue
                    }

                    if (shift > 0) {
                        falling++
                        gem.gridY += shift
                        this.gems[x][y + shift] = gem
                        this.gems[x][y] = null

                        this.scene.tweens.add({
                            targets: gem.sprite,
                            y: this.gridToPixelY(gem.gridY),
                            duration: 200,
                            ease: 'Bounce.Out',
                            onComplete: () => {
                                landed++
                                if (landed === falling) {
                                    resolve()
                                }
                            }
                        })
                    }
                }
            }

            if (falling === 0) {
                resolve()
            }
        })
    }

    private async fillEmptySpaces(): Promise<void> {
        return new Promise(resolve => {
            let newGems = 0
            let appeared = 0

            for (let x = 0; x < this.gridWidth; x++) {
                for (let y = 0; y < this.gridHeight; y++) {
                    if (!this.gems[x][y]) {
                        newGems++
                        const gem = this.createGem(x, y)
                        gem.sprite.setPosition(
                            this.gridToPixelX(x),
                            this.gridToPixelY(-1)
                        )
                        gem.sprite.setAlpha(0)

                        this.scene.tweens.add({
                            targets: gem.sprite,
                            y: this.gridToPixelY(y),
                            alpha: 1,
                            duration: 200,
                            ease: 'Bounce.Out',
                            onComplete: () => {
                                appeared++
                                if (appeared === newGems) {
                                    resolve()
                                }
                            }
                        })
                    }
                }
            }

            if (newGems === 0) {
                resolve()
            }
        })
    }

    private gridToPixelX(gridX: number): number {
        return gridX * (this.gemSize + this.margin) + this.gemSize / 2 + this.offsetX
    }

    private gridToPixelY(gridY: number): number {
        return gridY * (this.gemSize + this.margin) + this.gemSize / 2 + this.offsetY
    }

    public pixelToGrid(x: number, y: number): IGridPosition | null {
        const gridX = Math.floor((x - this.offsetX) / (this.gemSize + this.margin))
        const gridY = Math.floor((y - this.offsetY) / (this.gemSize + this.margin))

        if (gridX < 0 || gridX >= this.gridWidth || 
            gridY < 0 || gridY >= this.gridHeight) {
            return null
        }

        return { x: gridX, y: gridY }
    }
}