import { Polyomino } from './geometry';

export type BoardCell = string | null;

/**
 * 盤面。1次元配列で持ち、index = y * cols + x。
 * 2次元配列より参照が速く、C++ で std::vector<uint8_t> に移すときも形が変わらない。
 */
export class Board {
  readonly cols: number;
  readonly rows: number;
  private cells: BoardCell[];

  constructor(cols: number, rows: number, cells?: BoardCell[]) {
    this.cols = cols;
    this.rows = rows;
    this.cells = cells ?? new Array<BoardCell>(cols * rows).fill(null);
  }

  at(x: number, y: number): BoardCell {
    return this.cells[y * this.cols + x];
  }

  private set(x: number, y: number, v: BoardCell): void {
    this.cells[y * this.cols + x] = v;
  }

  /**
   * ポリオミノを (ox, oy) に置いたときに壁・床・既存ブロックと衝突するか。
   * y < 0 は場外上方として許容する（出現直後に一部がはみ出していてよい）。
   */
  collides(poly: Polyomino, ox: number, oy: number): boolean {
    for (const c of poly.cells) {
      const x = ox + c.x;
      const y = oy + c.y;
      if (x < 0 || x >= this.cols || y >= this.rows) return true;
      if (y < 0) continue;
      if (this.at(x, y) !== null) return true;
    }
    return false;
  }

  merge(poly: Polyomino, ox: number, oy: number, color: string): void {
    for (const c of poly.cells) {
      const x = ox + c.x;
      const y = oy + c.y;
      if (y >= 0 && y < this.rows) this.set(x, y, color);
    }
  }

  /**
   * 埋まった行を消し、消した数を返す。
   * 残す行だけを集めて上に空行を足す方式。1回の走査で済む。
   */
  clearFullRows(): number {
    const kept: BoardCell[] = [];
    let cleared = 0;
    for (let y = 0; y < this.rows; y++) {
      const row = this.cells.slice(y * this.cols, (y + 1) * this.cols);
      if (row.every((c) => c !== null)) cleared++;
      else kept.push(...row);
    }
    const pad = new Array<BoardCell>(cleared * this.cols).fill(null);
    this.cells = [...pad, ...kept];
    return cleared;
  }

  reset(): void {
    this.cells.fill(null);
  }

  /** 描画用の読み取り専用ビュー。 */
  snapshot(): readonly BoardCell[] {
    return this.cells;
  }

  toJSON(): BoardCell[] {
    return [...this.cells];
  }

  static fromJSON(cols: number, rows: number, cells: BoardCell[]): Board {
    if (cells.length !== cols * rows) return new Board(cols, rows);
    return new Board(cols, rows, [...cells]);
  }
}
