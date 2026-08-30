import { useState } from 'react';
import { SortKey, TIER_COLOR, TIER_LABEL, World } from '../../core';
import { MinoView } from '../components/MinoView';
import { RequestForm } from '../components/RequestForm';

export function ListScreen({ world }: { world: World }) {
  const [text, setText] = useState('');
  const [sort, setSort] = useState<SortKey>('due');
  const [includeDone, setIncludeDone] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const now = new Date();
  const tasks = world.tasks.query({ text, includeDone, sort });

  return (
    <div className="screen list-screen">
      <div className="board-frame">
        <div className="board-inner">
          <div className="board-controls">
            <input
              className="search"
              placeholder="タスクを検索"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="chip"
              onClick={() => setIncludeDone((v) => !v)}
              aria-pressed={includeDone}
            >
              {includeDone ? '全て' : '未完'}
            </button>
            <select
              className="chip"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="ソート順"
            >
              <option value="due">期限順</option>
              <option value="importance">重要度順</option>
              <option value="created">追加順</option>
            </select>
          </div>

          <ul className="task-list">
            {tasks.length === 0 && (
              <li className="empty">
                依頼書はまだありません。右下の + からタスクを貼り出してください。
              </li>
            )}
            {tasks.map((t) => {
              const tier = t.tier(now);
              const left = t.daysLeft(now);
              return (
                <li key={t.id} className={'task-row' + (t.done ? ' done' : '')}>
                  <div className="stars" aria-label={`重要度${t.importance}`}>
                    {'★'.repeat(t.importance)}
                    <span className="dim">{'☆'.repeat(5 - t.importance)}</span>
                  </div>
                  <div className="task-main">
                    <div className="task-title">{t.title}</div>
                    <div className="task-meta">
                      <span>{t.due ? `~ ${t.due}` : '期限なし'}</span>
                      <span className={'left l' + tier}>
                        {!isFinite(left)
                          ? ''
                          : left < 0
                            ? `${-left}日超過`
                            : left === 0
                              ? '本日'
                              : `残${left}日`}
                        ・{TIER_LABEL[tier]}
                      </span>
                    </div>
                  </div>
                  <div className="task-mino">
                    <MinoView poly={t.polyomino(now)} color={TIER_COLOR[tier]} unit={9} />
                  </div>
                  {t.done ? (
                    <button className="row-btn" onClick={() => world.removeTask(t.id)}>
                      消す
                    </button>
                  ) : (
                    <button
                      className="row-btn go"
                      onClick={() => world.completeTask(t.id)}
                    >
                      完了
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <button
          className="fab"
          onClick={() => setFormOpen(true)}
          aria-label="タスクを追加"
        >
          ＋
        </button>
      </div>

      {formOpen && (
        <RequestForm
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
