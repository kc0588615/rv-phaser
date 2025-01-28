export interface MoveAction {
    row_or_col: 'row' | 'col';
    index: number;
    amount: number;
}