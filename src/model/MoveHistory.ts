export interface Move {
  bridgeKey: string;
  previousCount: number;
  newCount: number;
}

export class MoveHistory {
  private undoStack: Move[] = [];
  private redoStack: Move[] = [];

  push(move: Move): void {
    this.undoStack.push(move);
    this.redoStack.length = 0;
  }

  undo(): Move | undefined {
    const move = this.undoStack.pop();
    if (move) {
      this.redoStack.push(move);
    }
    return move;
  }

  redo(): Move | undefined {
    const move = this.redoStack.pop();
    if (move) {
      this.undoStack.push(move);
    }
    return move;
  }

  get moveCount(): number {
    return this.undoStack.length;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
