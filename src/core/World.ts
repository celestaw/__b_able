import { BabelTower, Command, TowerData, TowerEvent } from './BabelTower';
import { Inventory, MinoSpec, MinoSpecData } from './Mino';
import { Task, TaskData, TaskRepository } from './Task';

export interface WorldData {
  version: 1;
  tasks: TaskData[];
  inventory: MinoSpecData[];
  tower: TowerData;
}

export type WorldEvent = TowerEvent | { type: 'minoAwarded'; spec: MinoSpec };

type Listener = () => void;

/**
 * 集約ルート。タスク・在庫・塔をまとめて1つの整合した状態として扱う。
 *
 * UI からの入力はすべてこのクラスのメソッドを通す。React 側に業務ロジックを置かない。
 * 状態が実際に変わったときだけ version を進めて購読者に通知するので、
 * 毎フレーム走るゲームループがあっても再描画は必要なときにしか起きない。
 */
export class World {
  readonly tasks: TaskRepository;
  readonly inventory: Inventory;
  readonly tower: BabelTower;

  private listeners = new Set<Listener>();
  private version = 0;
  private events: WorldEvent[] = [];

  constructor(tasks = new TaskRepository(), inventory = new Inventory(), tower = new BabelTower()) {
    this.tasks = tasks;
    this.inventory = inventory;
    this.tower = tower;
  }

  // ---- 購読（React の useSyncExternalStore と接続する） ----

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = (): number => this.version;

  private commit(): void {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  /** 直近の update / 操作で発生したイベントを取り出す（トースト表示用）。 */
  drainEvents(): WorldEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ---- ユースケース ----

  addTask(input: { title: string; detail: string; due: string; importance: number }): void {
    this.tasks.add(Task.create(input));
    this.commit();
  }

  removeTask(id: string): void {
    this.tasks.remove(id);
    this.commit();
  }

  /** タスク完了 -> 建材が1つ在庫に入る。この1本が本アプリの報酬経路のすべて。 */
  completeTask(id: string, now = new Date()): void {
    const task = this.tasks.find(id);
    if (!task || task.done) return;
    const spec = MinoSpec.fromTask(task, now);
    task.complete(now);
    this.inventory.push(spec);
    this.events.push({ type: 'minoAwarded', spec });
    this.commit();
  }

  spawnNext(): void {
    if (this.tower.hasActive) return;
    const spec = this.inventory.shift();
    if (!spec) return;
    this.events.push(...this.tower.spawn(spec));
    this.commit();
  }

  dispatch(cmd: Command): void {
    if (!this.tower.hasActive) return;
    this.events.push(...this.tower.execute(cmd));
    this.commit();
  }

  /** ゲームループから固定ステップで呼ばれる。変化がなければ通知しない。 */
  update(dtMs: number): void {
    if (!this.tower.hasActive) return;
    const before = this.tower.activePiece;
    const beforeY = before ? before.y : -1;
    const events = this.tower.update(dtMs);
    const after = this.tower.activePiece;
    const moved = (after ? after.y : -1) !== beforeY;
    if (events.length > 0 || moved) {
      this.events.push(...events);
      this.commit();
    }
  }

  // ---- 永続化 ----

  toJSON(): WorldData {
    return {
      version: 1,
      tasks: this.tasks.toJSON(),
      inventory: this.inventory.toJSON(),
      tower: this.tower.toJSON(),
    };
  }

  static fromJSON(raw: unknown): World {
    try {
      const d = raw as WorldData;
      if (!d || d.version !== 1) return new World();
      return new World(
        TaskRepository.fromJSON(d.tasks ?? []),
        Inventory.fromJSON(d.inventory ?? []),
        BabelTower.fromJSON(d.tower)
      );
    } catch {
      return new World();
    }
  }
}
