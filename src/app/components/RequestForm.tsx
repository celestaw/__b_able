import { useState } from 'react';
import { toDateKey } from '../../core';

export type RequestInput = {
  title: string;
  detail: string;
  due: string;
  importance: number;
};

/** 依頼書ポップアップ。カレンダー / リストの右下 + から開く。 */
export function RequestForm({
  onClose,
  onSubmit,
  initialDue,
}: {
  onClose: () => void;
  onSubmit: (t: RequestInput) => void;
  initialDue?: string;
}) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [due, setDue] = useState(initialDue ?? toDateKey(new Date()));
  const [importance, setImportance] = useState(3);

  return (
    <div className="modal-back" onClick={onClose}>
      <form
        className="paper"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSubmit({ title: title.trim(), detail, due, importance });
        }}
      >
        <h2 className="paper-title">依頼書</h2>
        <label className="field">
          <span>題目</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>内容</span>
          <textarea
            rows={4}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>期限</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label className="field">
          <span>重要度</span>
          <select
            value={importance}
            onChange={(e) => setImportance(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
        </label>
        <div className="paper-note">
          期限が近いほど、そして重要度が高いほど、完了時に手に入るミノのマス数が増えます。
          大きいミノは積みにくいので、重要で急ぎのものほど早く終わらせてください。
        </div>
        <div className="paper-actions">
          <button type="button" className="ghost" onClick={onClose}>
            やめる
          </button>
          <button type="submit" className="primary">
            貼り出す
          </button>
        </div>
      </form>
    </div>
  );
}
