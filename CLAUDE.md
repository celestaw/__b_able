# CLAUDE.md

B ABLE — タスク管理ゲーミフィケーションアプリ。
設計の全体像と選定理由は `ARCHITECTURE.md` にある。作業前に必ず読むこと。

## 絶対に守る規約

1. **ゲームロジックを `src/app` に書かない。** ルール・状態遷移・計算はすべて `src/core` に置く。
   React コンポーネントがやってよいのは、`World` の読み取りと `World` のメソッド呼び出しだけ。
2. **`src/core` から DOM / React / ブラウザ API を参照しない。**
   例外は `GameLoop.ts` の `requestAnimationFrame` と `LocalStorageAdapter` のみ。
   この2つは意図的にプラットフォーム依存を1ファイルへ隔離したもの。新たに増やさない。
3. **`core` に `Date.now()` を直接書かない。** 現在時刻は引数で受け取る（`now: Date`）。
   テストの再現性が壊れる。
4. **形状データを永続化しない。** ミノの形は seed から再生成する。
   `MinoSpec` に座標を持たせる変更は行わない。
5. **状態変更は必ず `World` のメソッドを通す。** `world.tower.floors = 5` のような
   直接代入をすると購読者へ通知が飛ばず、UI が更新されない。
6. **バランス数値は `src/core/urgency.ts` に集約する。** 閾値やマス数を他所へ散らさない。

## 変更手順

- `npm run build`（`tsc -b && vite build`）が通ることを毎回確認する。
- `core` を変更したら、Node から直接 import して挙動を確認する:
  `npx tsx script.ts` で `src/core/index.ts` を import できる。
- UI を変更したら `npm run dev` で3画面すべてを開く。特に、落下中にタブを切り替えて
  戻ったとき状態が保持されているかを確認する（この挙動は仕様の中核）。

## よくある依頼と着手先

| 依頼 | 触るファイル |
| --- | --- |
| 期限の閾値・ミノのマス数・色を変える | `core/urgency.ts` |
| ミノの形の出方を変える | `core/geometry.ts` の `Polyomino.grow` |
| 落下速度・盤面サイズ・階数帯を変える | `core/BabelTower.ts` の定数 |
| 操作を追加する（ホールド等） | `core/BabelTower.ts` に `Command` を足し、`BabelScreen` にボタンを足す |
| 重要度の効き方を変える | `core/urgency.ts` の `effectiveDaysLeft`（星3基準で実効残日数を補正）。既にティア計算へ接続済み |
| 見た目・ドット絵化 | `src/styles.css` と `src/app/` のみ。`core` は触らない |

## 未確定の設計判断（勝手に決めないこと）
- 期限なしタスクの扱い。現在は残日数が無限大となり Relaxed 固定。

これらに触れる変更が必要になったら、実装する前に選択肢と影響範囲を提示すること。
