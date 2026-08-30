import { Board, BoardCell } from './Board';
import { Polyomino } from './geometry';
import { MinoSpec, MinoSpecData } from './Mino';

export const BOARD_COLS = 10;
export const BOARD_ROWS = 18;

/** 落下間隔。速く落とす意味がない（落下中に画面遷移できる）ので遅めに固定する。 */
export const DROP_INTERVAL_MS = 1100;

export enum Command {
  MoveLeft,
  MoveRight,
  RotateCW,
  SoftDrop,
  HardDrop,
}

export type TowerEvent =
  | { type: 'locked' }
  | { type: 'floorsBuilt'; count: number }
  | { type: 'collapsed' };

export interface ZoneDef {
  key: string;
  label: string;
  minFloor: number;
}

/** 階数帯。背景の切り替えに使う。 */
export const ZONES: readonly ZoneDef[] = [
  { key: 'ground', label: '地上', minFloor: 0 },
  { key: 'midair', label: '中空', minFloor: 10 },
  { key: 'sky', label: '上空', minFloor: 50 },
  { key: 'atmos', label: '大気圏', minFloor: 100 },
  { key: 'space', label: '宇宙', minFloor: 300 },
];

export function zoneOf(floor: number): ZoneDef {
  let z = ZONES[0];
  for (const cand of ZONES) if (floor >= cand.minFloor) z = cand;
  return z;
}

interface ActivePieceData {
  spec: MinoSpecData;
  rotation: number;
  x: number;
  y: number;
}

/** 落下中のミノ。回転は基準形への適用回数として持つので、状態が壊れない。 */
class ActivePiece {
  readonly spec: MinoSpec;
  rotation: number;
  x: number;
  y: number;
  private cache: Polyomino;
  private cachedRotation: number;

  constructor(spec: MinoSpec, x: number, y: number, rotation = 0) {
    this.spec = spec;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.cache = spec.polyomino;
    this.cachedRotation = 0;
    this.syncCache();
  }

  private syncCache(): void {
    if (this.cachedRotation === this.rotation) return;
    let p = this.spec.polyomino;
    for (let i = 0; i < ((this.rotation % 4) + 4) % 4; i++) p = p.rotateCW();
    this.cache = p;
    this.cachedRotation = this.rotation;
  }

  get poly(): Polyomino {
    this.syncCache();
    return this.cache;
  }

  toJSON(): ActivePieceData {
    return { spec: this.spec.toJSON(), rotation: this.rotation, x: this.x, y: this.y };
  }

  static fromJSON(d: ActivePieceData): ActivePiece {
    return new ActivePiece(new MinoSpec(d.spec), d.x, d.y, d.rotation);
  }
}

export interface TowerData {
  board: BoardCell[];
  floors: number;
  totalCleared: number;
  active: ActivePieceData | null;
}

/**
 * 塔のシミュレーション。
 * 入力は Command としてのみ受け取り、時間経過は update(dt) でのみ進む。
 * 描画層への依存はない。テストからは update を任意の dt で呼べば決定的に再現できる。
 */
export class BabelTower {
  readonly board: Board;
  floors = 0;
  totalCleared = 0;
  private active: ActivePiece | null = null;
  private accumulator = 0;

  constructor(board = new Board(BOARD_COLS, BOARD_ROWS)) {
    this.board = board;
  }

  get activePiece(): { poly: Polyomino; x: number; y: number; spec: MinoSpec } | null {
    if (!this.active) return null;
    return {
      poly: this.active.poly,
      x: this.active.x,
      y: this.active.y,
      spec: this.active.spec,
    };
  }

  get hasActive(): boolean {
    return this.active !== null;
  }

  /** 建材を1つ投入する。天井に入らなければ崩壊。 */
  spawn(spec: MinoSpec): TowerEvent[] {
    if (this.active) return [];
    const x = Math.floor((this.board.cols - spec.polyomino.width) / 2);
    if (this.board.collides(spec.polyomino, x, 0)) {
      // 崩壊ペナルティ：盤面も階数も更地に戻す。totalCleared は生涯累計なので残す。
      this.board.reset();
      this.floors = 0;
      return [{ type: 'collapsed' }];
    }
    this.active = new ActivePiece(spec, x, 0);
    this.accumulator = 0;
    return [];
  }

  execute(cmd: Command): TowerEvent[] {
    const a = this.active;
    if (!a) return [];
    switch (cmd) {
      case Command.MoveLeft:
        if (!this.board.collides(a.poly, a.x - 1, a.y)) a.x -= 1;
        return [];
      case Command.MoveRight:
        if (!this.board.collides(a.poly, a.x + 1, a.y)) a.x += 1;
        return [];
      case Command.RotateCW:
        return this.tryRotate(a);
      case Command.SoftDrop:
        this.accumulator = 0;
        return this.stepDown();
      case Command.HardDrop:
        while (!this.board.collides(a.poly, a.x, a.y + 1)) a.y += 1;
        return this.lock();
    }
  }

  /**
   * 回転。回転後に壁や既存ブロックへ食い込む場合、横に最大2マスずらして再試行する
   * （いわゆるウォールキック）。8マスのポリオミノは外接矩形が大きく、
   * ずらしなしだと壁際で回転がほぼ通らないため必要。
   */
  private tryRotate(a: ActivePiece): TowerEvent[] {
    const rotated = a.poly.rotateCW();
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!this.board.collides(rotated, a.x + dx, a.y)) {
        a.rotation += 1;
        a.x += dx;
        return [];
      }
    }
    return [];
  }

  /** 固定時間ステップで呼ばれる。dt はミリ秒。 */
  update(dtMs: number): TowerEvent[] {
    if (!this.active) return [];
    this.accumulator += dtMs;
    const events: TowerEvent[] = [];
    while (this.accumulator >= DROP_INTERVAL_MS) {
      this.accumulator -= DROP_INTERVAL_MS;
      events.push(...this.stepDown());
      if (!this.active) break;
    }
    return events;
  }

  private stepDown(): TowerEvent[] {
    const a = this.active;
    if (!a) return [];
    if (this.board.collides(a.poly, a.x, a.y + 1)) return this.lock();
    a.y += 1;
    return [];
  }

  private lock(): TowerEvent[] {
    const a = this.active;
    if (!a) return [];
    this.board.merge(a.poly, a.x, a.y, a.spec.color);
    this.active = null;
    this.accumulator = 0;

    const events: TowerEvent[] = [{ type: 'locked' }];
    const cleared = this.board.clearFullRows();
    if (cleared > 0) {
      this.floors += cleared;
      this.totalCleared += cleared;
      events.push({ type: 'floorsBuilt', count: cleared });
    }
    return events;
  }

  toJSON(): TowerData {
    return {
      board: this.board.toJSON(),
      floors: this.floors,
      totalCleared: this.totalCleared,
      active: this.active ? this.active.toJSON() : null,
    };
  }

  static fromJSON(d: TowerData): BabelTower {
    const tower = new BabelTower(
      Board.fromJSON(BOARD_COLS, BOARD_ROWS, d.board ?? [])
    );
    tower.floors = d.floors ?? 0;
    tower.totalCleared = d.totalCleared ?? 0;
    tower.active = d.active ? ActivePiece.fromJSON(d.active) : null;
    return tower;
  }
}
