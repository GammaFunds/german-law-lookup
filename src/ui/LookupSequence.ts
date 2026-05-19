export class LookupSequence {
  private currentId = 0;

  next(): number {
    this.currentId += 1;
    return this.currentId;
  }

  isCurrent(id: number): boolean {
    return id === this.currentId;
  }
}

