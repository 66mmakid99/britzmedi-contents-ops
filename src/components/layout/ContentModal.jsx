import { useState } from 'react';
import { PIPELINE_STAGES, CHANNELS, CONTENT_PILLARS } from '../../constants';

export default function ContentModal({ content, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...content });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pillars = CONTENT_PILLARS[form.track] || [];

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-pale">
          <h3 className="text-[15px] font-bold">콘텐츠 상세</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-snow border-none cursor-pointer text-steel hover:bg-pale text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Track */}
          <div className="flex gap-2">
            {['A', 'B'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const firstPillar = CONTENT_PILLARS[t]?.[0]?.id || '';
                  setForm({ ...form, track: t, pillar: firstPillar });
                }}
                className={`flex-1 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer transition-colors ${
                  form.track === t
                    ? t === 'A'
                      ? 'bg-track-a text-white border-track-a'
                      : 'bg-track-b text-white border-track-b'
                    : 'bg-white text-slate border-pale'
                }`}
              >
                Track {t}
              </button>
            ))}
          </div>

          {/* Pillar */}
          <div>
            <label className="block text-[11px] font-semibold text-steel mb-1.5">필라</label>
            <select
              value={form.pillar}
              onChange={(e) => setForm({ ...form, pillar: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] outline-none bg-white"
            >
              {pillars.map((p) => (
                <option key={p.id} value={p.id}>{p.id} - {p.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-steel mb-1.5">제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-[11px] font-semibold text-steel mb-1.5">발행 예정일</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white"
            />
          </div>

          {/* Stage */}
          <div>
            <label className="block text-[11px] font-semibold text-steel mb-1.5">파이프라인 단계</label>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm({ ...form, stage: s.id })}
                  className={`px-3 py-1.5 rounded-lg text-[11px] border cursor-pointer transition-colors ${
                    form.stage === s.id
                      ? 'bg-dark text-white border-dark'
                      : 'bg-white text-slate border-pale hover:bg-snow'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-[11px] font-semibold text-steel mb-1.5">발행 채널</label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map((ch) => (
                <label
                  key={ch.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    form.channels?.[ch.id] ? 'border-accent bg-accent-light/20' : 'border-pale bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!form.channels?.[ch.id]}
                    onChange={() =>
                      setForm({
                        ...form,
                        channels: { ...form.channels, [ch.id]: !form.channels?.[ch.id] },
                      })
                    }
                    className="accent-accent"
                  />
                  <span className="text-[11px]">{ch.label}</span>
                  <span className={`text-[9px] ml-auto ${ch.track === 'A' ? 'text-track-a' : 'text-track-b'}`}>
                    {ch.track}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-5 border-t border-pale">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-lg text-[12px] text-danger border border-danger/30 bg-white cursor-pointer hover:bg-danger/5"
            >
              삭제
            </button>
          ) : (
            <button
              onClick={() => { onDelete(content.id); onClose(); }}
              className="px-4 py-2 rounded-lg text-[12px] text-white bg-danger border-none cursor-pointer"
            >
              정말 삭제
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-[12px] text-white bg-dark border-none cursor-pointer hover:bg-charcoal font-semibold"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
