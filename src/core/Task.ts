import { Polyomino, Rng } from './geometry';
import {
  TIER_COLOR,
  UrgencyTier,
  daysBetween,
  effectiveDaysLeft,
  tierForDaysLeft,
} from './urgency';

export interface TaskData {
  id: string;
  title: string;
  detail: string;
  due: string; // YYYY-MM-DD、空文字は期限なし
  importance: number; // 1-5
  done: boolean;
  createdAt: number;
  completedAt: number | null;
  /** 完了時に確定したティア。完了後に日付が進んでも報酬は変わらない。 */
  awardedTier: UrgencyTier | null;
}

/** タスク1件。エンティティ（同一性は id）。 */
export class Task {
  constructor(private data: TaskData) {}

  static create(input: {
    title: string;
    detail: string;
    due: string;
    importance: number;
  }): Task {
    return new Task({
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      title: input.title,
      detail: input.detail,
      due: input.due,
      importance: input.importance,
      done: false,
      createdAt: Date.now(),
      completedAt: null,
      awardedTier: null,
    });
  }

  get id() {
    return this.data.id;
  }
  get title() {
    return this.data.title;
  }
  get detail() {
    return this.data.detail;
  }
  get due() {
    return this.data.due;
  }
  get importance() {
    return this.data.importance;
  }
  get done() {
    return this.data.done;
  }
  get createdAt() {
    return this.data.createdAt;
  }

  daysLeft(now: Date): number {
    return daysBetween(this.data.due, now);
  }

  /**
   * 完了済みなら確定済みティア、未完了なら現在時刻での見込みティア。
   * 重要度で実効残日数を補正するので、高重要度ほど早く上位ティア（=大きいミノ）になる。
   */
  tier(now: Date): UrgencyTier {
    if (this.data.awardedTier !== null) return this.data.awardedTier;
    return tierForDaysLeft(effectiveDaysLeft(this.daysLeft(now), this.data.importance));
  }

  /**
   * このタスクを今完了した場合に得られるミノの形。
   * 種は id + ティアなので、リストのプレビューと実際の報酬が必ず一致する。
   * 形状は保存せず毎回再計算する（保存データを小さく保ち、生成規則の変更を即反映するため）。
   */
  polyomino(now: Date): Polyomino {
    const tier = this.tier(now);
    return Polyomino.grow(Rng.fromString(`${this.id}:${tier}`), tier);
  }

  color(now: Date): string {
    return TIER_COLOR[this.tier(now)];
  }

  complete(now: Date): void {
    if (this.data.done) return;
    this.data.awardedTier = tierForDaysLeft(
      effectiveDaysLeft(this.daysLeft(now), this.data.importance)
    );
    this.data.done = true;
    this.data.completedAt = now.getTime();
  }

  toJSON(): TaskData {
    return { ...this.data };
  }

  static fromJSON(d: TaskData): Task {
    return new Task({ ...d });
  }
}

export type SortKey = 'due' | 'importance' | 'created';

/** タスク集合の保持と検索。永続化そのものは World が担当する。 */
export class TaskRepository {
  private items: Task[] = [];

  add(task: Task): void {
    this.items.push(task);
  }

  remove(id: string): void {
    this.items = this.items.filter((t) => t.id !== id);
  }

  find(id: string): Task | undefined {
    return this.items.find((t) => t.id === id);
  }

  all(): readonly Task[] {
    return this.items;
  }

  query(opts: { text?: string; includeDone?: boolean; sort?: SortKey }): Task[] {
    const text = opts.text?.trim() ?? '';
    const list = this.items.filter(
      (t) =>
        (opts.includeDone || !t.done) &&
        (text === '' || (t.title + t.detail).includes(text))
    );
    const cmp: Record<SortKey, (a: Task, b: Task) => number> = {
      due: (a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99'),
      importance: (a, b) => b.importance - a.importance,
      created: (a, b) => b.createdAt - a.createdAt,
    };
    return list.sort(cmp[opts.sort ?? 'due']);
  }

  /** 期限日ごとの未完了タスク。カレンダー描画用。 */
  groupByDue(): Map<string, Task[]> {
    const m = new Map<string, Task[]>();
    for (const t of this.items) {
      if (t.done || !t.due) continue;
      const arr = m.get(t.due) ?? [];
      arr.push(t);
      m.set(t.due, arr);
    }
    return m;
  }

  toJSON(): TaskData[] {
    return this.items.map((t) => t.toJSON());
  }

  static fromJSON(list: TaskData[]): TaskRepository {
    const repo = new TaskRepository();
    for (const d of list) repo.add(Task.fromJSON(d));
    return repo;
  }
}
