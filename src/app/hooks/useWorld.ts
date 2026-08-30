import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { GameLoop, LocalStorageAdapter, World } from '../../core';

/**
 * World（可変なシミュレーション状態）を React に接続する唯一の場所。
 *
 * useSyncExternalStore を使う理由: 状態の持ち主は React ではなく World 側であり、
 * 更新は rAF ループからも来る。外部ストアとして購読する形にしておくと、
 * 並行レンダリング下でも読み取りが破綻せず、World を丸ごと差し替えても UI は変わらない。
 */
export function useWorld(): World {
  const { world, storage } = useMemo(() => {
    const storage = new LocalStorageAdapter();
    return { world: storage.load(), storage };
  }, []);

  useSyncExternalStore(world.subscribe, world.getVersion, world.getVersion);

  useEffect(() => {
    const unsubscribe = world.subscribe(() => storage.scheduleSave(world));
    const loop = new GameLoop((dt) => world.update(dt));
    loop.start();
    return () => {
      loop.stop();
      unsubscribe();
    };
  }, [world, storage]);

  return world;
}
