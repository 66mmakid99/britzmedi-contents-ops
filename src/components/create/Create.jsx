import { useState } from 'react';
import { CONTENT_PILLARS } from '../../constants';

export default function Create({ onAdd }) {
  const [form, setForm] = useState({
    track: 'A',
    pillar: 'A1',
    title: '',
    date: '',
    brief: '',
  });

  const pillars = CONTENT_PILLARS[form.track] || [];

  const handleTrackChange = (track) => {
    const firstPillar = CONTENT_PILLARS[track]?.[0]?.id || '';
    setForm({ ...form, track, pillar: firstPillar });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    onAdd({
      id: Date.now(),
      title: form.title.trim(),
      track: form.track,
      pillar: form.pillar,
      stage: 'idea',
      channels: {},
      date: form.date || new Date().toISOString().split('T')[0],
    });

    setForm({ track: form.track, pillar: form.pillar, title: '', date: '', brief: '' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">콘텐츠 제작</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-pale space-y-5">
        {/* Track Selection */}
        <div>
          <label className="block text-[12px] font-semibold text-steel mb-2">
            트랙
          </label>
          <div className="flex gap-2">
            {['A', 'B'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTrackChange(t)}
                className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold border cursor-pointer transition-colors ${
                  form.track === t
                    ? t === 'A'
                      ? 'bg-track-a text-white border-track-a'
                      : 'bg-track-b text-white border-track-b'
                    : 'bg-white text-slate border-pale hover:bg-snow'
                }`}
              >
                Track {t} — {t === 'A' ? '해외/글로벌' : '국내 전용'}
              </button>
            ))}
          </div>
        </div>

        {/* Pillar */}
        <div>
          <label className="block text-[12px] font-semibold text-steel mb-2">
            콘텐츠 필라
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {pillars.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm({ ...form, pillar: p.id })}
                className={`p-3 rounded-lg text-left border cursor-pointer transition-colors ${
                  form.pillar === p.id
                    ? 'bg-dark text-white border-dark'
                    : 'bg-white text-slate border-pale hover:bg-snow'
                }`}
              >
                <div className="text-[12px] font-semibold">{p.id}</div>
                <div className={`text-[11px] ${form.pillar === p.id ? 'text-silver' : 'text-mist'}`}>
                  {p.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-[12px] font-semibold text-steel mb-2">
            제목
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="콘텐츠 제목을 입력하세요"
            className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent transition-colors bg-white"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-[12px] font-semibold text-steel mb-2">
            발행 예정일
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent transition-colors bg-white"
          />
        </div>

        {/* Brief */}
        <div>
          <label className="block text-[12px] font-semibold text-steel mb-2">
            브리프 / 메모
          </label>
          <textarea
            value={form.brief}
            onChange={(e) => setForm({ ...form, brief: e.target.value })}
            placeholder="콘텐츠 방향, 키워드, 참고자료 등"
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent transition-colors bg-white resize-none"
          />
        </div>

        {/* AI Generate (placeholder) */}
        <div className="bg-snow rounded-lg p-4 border border-pale">
          <div className="text-[12px] text-steel mb-1">AI 초안 생성</div>
          <div className="text-[11px] text-mist">
            Supabase + Claude API 연동 후 활성화됩니다 (Phase 2)
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-dark text-white text-[14px] font-semibold border-none cursor-pointer hover:bg-charcoal transition-colors"
        >
          콘텐츠 추가
        </button>
      </form>
    </div>
  );
}
