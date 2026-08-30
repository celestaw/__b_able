import { Polyomino, Rng, Vec2 } from './geometry';
import { Task } from './Task';
import { TIER_COLOR, UrgencyTier } from './urgency';

export interface MinoSpecData {
  id: string;
  tier: UrgencyTier;
  seed: string;
  sourceTitle: string;
}

/**
 * 手持ちの建材1個。形は seed から再生成するので、保存されるのは seed とティアだけ。
 * 「タスク完了」という出来事を建材という物として持ち歩けるようにするための値オブジェクト。
 */
export class MinoSpec {
  readonly id: string;
  readonly tier: UrgencyTier;
  readonly seed: string;
  readonly sourceTitle: string;
  readonly polyomino: Polyomino;

  constructor(d: MinoSpecData) {
    this.id = d.id;
    this.tier = d.tier;
    this.seed = d.seed;
    this.sourceTitle = d.sourceTitle;
    this.polyomino = Polyomino.grow(Rng.fromString(d.seed), d.tier);
  }

  static fromTask(task: Task, now: Date): MinoSpec {
    const tier = task.tier(now);
    return new MinoSpec({
      id: task.id + ':' + tier,
      tier,
      seed: `${task.id}:${tier}`,
      sourceTitle: task.title,
    });
  }

  get color(): string {
    return TIER_COLOR[this.tier];
  }

  get cells(): readonly Vec2[] {
    return this.polyomino.cells;
  }

  toJSON(): MinoSpecData {
    return {
      id: this.id,
      tier: this.tier,
      seed: this.seed,
      sourceTitle: this.sourceTitle,
    };
  }
}

/** FIFO の建材置き場。next 表示もここから取る。 */
export class Inventory {
  private items: MinoSpec[] = [];

  push(spec: MinoSpec): void {
    this.items.push(spec);
  }

  shift(): MinoSpec | undefined {
    return this.items.shift();
  }

  peek(n: number): readonly MinoSpec[] {
    return this.items.slice(0, n);
  }

  get length(): number {
    return this.items.length;
  }

  toJSON(): MinoSpecData[] {
    return this.items.map((m) => m.toJSON());
  }

  static fromJSON(list: MinoSpecData[]): Inventory {
    const inv = new Inventory();
    for (const d of list) inv.push(new MinoSpec(d));
    return inv;
  }
}
