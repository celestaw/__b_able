import { useMemo, useState } from 'react';
import { TIER_COLOR, World, toDateKey } from '../../core';
import { MinoView } from '../components/MinoView';
import { RequestForm } from '../components/RequestForm';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export function CalendarScreen({ world }: { world: World }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  /** 月頭の曜日ぶん前から 6 週 42 マス。月ごとの分岐が要らないので処理が単純になる。 */
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const now = new Date();
  const byDue = world.tasks.groupByDue();
  const todayKey = toDateKey(now);
  const selectedTasks = selected ? (byDue.get(selected) ?? []) : [];

  return (
    <div className="screen calendar-screen">
      <div className="signboard">
        <button
          className="nav"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          aria-label="前の月"
        >
          ◀
        </button>
        <div className="signboard-date">
          {cursor.getFullYear()}年{cursor.getMonth() + 1}月
        </div>
        <button
          className="nav"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          aria-label="次の月"
        >
          ▶
        </button>
      </div>

      <div className="cal-grid">
        {WEEK.map((w, i) => (
          <div
            key={w}
            className={'cal-head' + (i === 0 ? ' sun' : '') + (i === 6 ? ' sat' : '')}
          >
            {w}
          </div>
        ))}
        {cells.map((d) => {
          const key = toDateKey(d);
          const list = byDue.get(key) ?? [];
          const dow = d.getDay();
          return (
            <button
              key={key}
              className={
                'cal-cell' +
                (d.getMonth() !== cursor.getMonth() ? ' off' : '') +
                (key === todayKey ? ' today' : '') +
                (key === selected ? ' sel' : '') +
                (dow === 0 ? ' sun' : '') +
                (dow === 6 ? ' sat' : '')
              }
              onClick={() => setSelected(key === selected ? null : key)}
            >
              <span className="dnum">{d.getDate()}</span>
              <span className="dminos">
                {list.slice(0, 3).map((t) => (
                  <i
                    key={t.id}
                    className="dot"
                    style={{ background: TIER_COLOR[t.tier(now)] }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="day-detail">
        {selected === null && (
          <p className="hint">日付を選ぶと、その日が期限のタスクが出ます。</p>
        )}
        {selected !== null && selectedTasks.length === 0 && (
          <p className="hint">{selected} に期限のタスクはありません。</p>
        )}
        {selectedTasks.map((t) => (
          <div key={t.id} className="day-row">
            <MinoView poly={t.polyomino(now)} color={TIER_COLOR[t.tier(now)]} unit={8} />
            <span className="day-title">{t.title}</span>
            <span className="day-star">{'★'.repeat(t.importance)}</span>
          </div>
        ))}
      </div>

      <button
        className="fab"
        onClick={() => setFormOpen(true)}
        aria-label="タスクを追加"
      >
        ＋
      </button>

      {formOpen && (
        <RequestForm
          initialDue={selected ?? undefined}
          onClose={() => setFormOpen(false)}
          onSubmit={(input) => {
            world.addTask(input);
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}
