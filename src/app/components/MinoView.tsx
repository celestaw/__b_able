import { Polyomino } from '../../core';

/** ポリオミノを絶対配置の矩形で描く。純粋な描画コンポーネント。 */
export function MinoView({
  poly,
  color,
  unit = 10,
}: {
  poly: Polyomino;
  color: string;
  unit?: number;
}) {
  return (
    <div
      className="mino-view"
      style={{ width: poly.width * unit, height: poly.height * unit }}
      aria-hidden
    >
      {poly.cells.map((c, i) => (
        <i
          key={i}
          className="blk"
          style={{
            left: c.x * unit,
            top: c.y * unit,
            width: unit,
            height: unit,
            background: color,
          }}
        />
      ))}
    </div>
  );
}
