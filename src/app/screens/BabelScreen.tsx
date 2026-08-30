import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  BOARD_COLS,
  BOARD_ROWS,
  Command,
  World,
  ZONES,
  zoneOf,
} from '../../core';
import { MinoView } from '../components/MinoView';

export function BabelScreen({ world, demo = false }: { world: World; demo?: boolean }) {
  const [toast, setToast] = useState<string | null>(null);

  // World の更新に合わせてイベントを取り出す。表示用の一時的な文言は UI 側の責務。
  const version = useSyncExternalStore(world.subscribe, world.getVersion, world.getVersion);
  useEffect(() => {
    for (const e of world.drainEvents()) {
      if (e.type === 'floorsBuilt') setToast(`${e.count}階ぶん建設しました`);
      else if (e.type === 'collapsed') setToast('天井に達しました。塔は崩れ、更地に戻ります');
    }
  }, [version, world]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Command> = {
        ArrowLeft: Command.MoveLeft,
        ArrowRight: Command.MoveRight,
        ArrowDown: Command.SoftDrop,
        ArrowUp: Command.RotateCW,
        x: Command.RotateCW,
        ' ': Command.HardDrop,
      };
      const cmd = map[e.key];
      if (cmd === undefined) return;
      e.preventDefault();
      world.dispatch(cmd);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [world]);

  const tower = world.tower;
  // 通常は実際の階数帯。デモモードでは3階ごとに次のゾーンへ圧縮して切り替える
  // （数タップで地上→宇宙まで見せられる。core の階数帯定数はいじらない）。
  const zone = demo
    ? ZONES[Math.min(Math.floor(tower.floors / 3), ZONES.length - 1)]
    : zoneOf(tower.floors);
  const active = tower.activePiece;

  // 確定済み盤面に落下中のミノを重ねた描画用ビュー
  const view = [...tower.board.snapshot()];
  if (active) {
    for (const c of active.poly.cells) {
      const x = active.x + c.x;
      const y = active.y + c.y;
      if (y >= 0 && y < BOARD_ROWS) view[y * BOARD_COLS + x] = active.spec.color;
    }
  }

  return (
    <div className={'screen babel-screen zone-' + zone.key}>
      <div className="babel-hud">
        <div className="floor">
          <b>{tower.floors}</b> F<span className="zone-label">{zone.label}</span>
        </div>
        <div className="stock">
          <span className="stock-label">next</span>
          <div className="stock-list">
            {world.inventory.peek(4).map((m) => (
              <MinoView key={m.id} poly={m.polyomino} color={m.color} unit={7} />
            ))}
            {world.inventory.length === 0 && <span className="stock-empty">なし</span>}
          </div>
        </div>
      </div>

      <div className="field-wrap">
        <div className="play-field" style={{ gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)` }}>
          {view.map((c, i) => (
            <i
              key={i}
              className={'cell' + (c ? ' filled' : '')}
              style={c ? { background: c } : undefined}
            />
          ))}
        </div>
        <div className="bedrock" />
        {toast && <div className="toast">{toast}</div>}
      </div>

      <div className="pad">
        {active ? (
          <>
            <button onClick={() => world.dispatch(Command.MoveLeft)}>←</button>
            <button onClick={() => world.dispatch(Command.RotateCW)}>回転</button>
            <button onClick={() => world.dispatch(Command.MoveRight)}>→</button>
            <button onClick={() => world.dispatch(Command.SoftDrop)}>↓</button>
            <button className="hard" onClick={() => world.dispatch(Command.HardDrop)}>
              設置
            </button>
          </>
        ) : (
          <button
            className="spawn"
            onClick={() => world.spawnNext()}
            disabled={world.inventory.length === 0}
          >
            {world.inventory.length === 0
              ? 'ミノがありません。タスクを完了してください'
              : `ミノを投入（在庫 ${world.inventory.length}）`}
          </button>
        )}
      </div>
      {active && <div className="from-task">建材：{active.spec.sourceTitle}</div>}
    </div>
  );
}
