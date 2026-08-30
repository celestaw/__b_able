import { World, WorldData } from './World';

/**
 * 固定タイムステップのゲームループ。
 *
 * requestAnimationFrame の可変 dt をそのままシミュレーションに渡すと、
 * 端末のリフレッシュレートで落下速度が変わる。累積器で 1/60 秒ずつ消費し、
 * シミュレーション側は常に同じ dt しか見ない構成にしてある。
 * タブが裏に回って dt が巨大化したときの暴走を防ぐため上限も設ける。
 */
export class GameLoop {
  private readonly stepMs = 1000 / 60;
  private readonly maxFrameMs = 250;
  private handle = 0;
  private last = 0;
  private accumulator = 0;
  private running = false;

  constructor(private readonly onStep: (dtMs: number) => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.handle = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.handle);
  }

  private frame = (t: number): void => {
    if (!this.running) return;
    const delta = Math.min(t - this.last, this.maxFrameMs);
    this.last = t;
    this.accumulator += delta;
    while (this.accumulator >= this.stepMs) {
      this.onStep(this.stepMs);
      this.accumulator -= this.stepMs;
    }
    this.handle = requestAnimationFrame(this.frame);
  };
}

const STORAGE_KEY = 'b-able:world:v1';

/**
 * localStorage への保存。書き込みは間引く。
 * 落下中は毎秒 World が更新されるため、都度 JSON.stringify すると無駄が大きい。
 */
export class LocalStorageAdapter {
  private timer: number | null = null;

  constructor(private readonly delayMs = 400) {}

  load(): World {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new World();
      return World.fromJSON(JSON.parse(raw) as WorldData);
    } catch {
      return new World();
    }
  }

  scheduleSave(world: World): void {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(world.toJSON()));
      } catch {
        /* 容量超過などは無視する。保存失敗でアプリを止めない。 */
      }
    }, this.delayMs);
  }
}
