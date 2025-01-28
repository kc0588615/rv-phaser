import { IGridPosition } from './GridPosition'

export interface ISwapResult {
    success: boolean
    matches?: IGridPosition[][]
}