/**
 * 幾何プリミティブと決定的乱数、ポリオミノ。
 * このファイルは DOM / React / ブラウザ API に一切依存しない。
 * C++ に移す場合そのまま struct Vec2 / class Rng / class Polyomino に対応する。
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/**
 * mulberry32。32bit 状態の決定的 PRNG。
 * Math.random を使わない理由: 同じタスク ID からは常に同じ形を再現する必要があるため。
 * 保存するのは種だけでよく、形状データを永続化しなくて済む。
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** FNV-1a で文字列を 32bit に潰してから種にする */
  static fromString(s: string): Rng {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return new Rng(h >>> 0);
  }

  /** [0,1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [0,n) の整数 */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}

const NEIGHBORS: readonly Vec2[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** 不変オブジェクト。回転・正規化は新しいインスタンスを返す。 */
export class Polyomino {
  readonly cells: readonly Vec2[];

  private constructor(cells: readonly Vec2[]) {
    this.cells = cells;
  }

  static from(cells: readonly Vec2[]): Polyomino {
    return new Polyomino(Polyomino.normalize(cells));
  }

  /**
   * ランダム成長法（random accretion）で size マスのポリオミノを作る。
   * 1マスから始め、既存セルに隣接する空きマスを一様ランダムに1つずつ足す。
   *
   * 全ポリオミノの一様サンプリングではない（Redelmeier 法などが必要）が、
   * ここで欲しいのは「マス数が増えるほど凸凹が増える」という偏りそのものなので、
   * この偏りは仕様として望ましい。計算量は O(size^2)、size <= 8 なので無視できる。
   */
  static grow(rng: Rng, size: number): Polyomino {
    const key = (c: Vec2) => `${c.x},${c.y}`;
    const cells: Vec2[] = [{ x: 0, y: 0 }];
    const used = new Set<string>([key(cells[0])]);

    while (cells.length < size) {
      const candidates: Vec2[] = [];
      for (const c of cells) {
        for (const d of NEIGHBORS) {
          const n = { x: c.x + d.x, y: c.y + d.y };
          if (!used.has(key(n))) candidates.push(n);
        }
      }
      const pick = candidates[rng.int(candidates.length)];
      cells.push(pick);
      used.add(key(pick));
    }
    return Polyomino.from(cells);
  }

  private static normalize(cells: readonly Vec2[]): Vec2[] {
    let minX = Infinity;
    let minY = Infinity;
    for (const c of cells) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
    }
    return cells.map((c) => ({ x: c.x - minX, y: c.y - minY }));
  }

  /** 時計回り 90 度。(x,y) -> (-y,x) の後に正規化。 */
  rotateCW(): Polyomino {
    return Polyomino.from(this.cells.map((c) => ({ x: -c.y, y: c.x })));
  }

  get width(): number {
    return Math.max(...this.cells.map((c) => c.x)) + 1;
  }

  get height(): number {
    return Math.max(...this.cells.map((c) => c.y)) + 1;
  }

  get size(): number {
    return this.cells.length;
  }
}
