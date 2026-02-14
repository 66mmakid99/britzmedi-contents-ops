import { useState } from 'react';
import { CONTENT_PILLARS } from '../../constants';
import { generateDraft } from '../../lib/claude';

export default function Create({ onAdd, apiKey, setApiKey }) {
  const [form, setForm] = useState({
    track: 'A',
    pillar: 'A1',
    title: '',
    date: '',
    brief: '',
  });
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const pillars = CONTENT_PILLARS[form.track] || [];

  const handleTrackChange = (track) => {
    const firstPillar = CONTENT_PILLARS[track]?.[0]?.id || '';
    setForm({ ...form, track, pillar: firstPillar });
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError('API 키를 먼저 입력하세요');
      setShowKey(true);
      return;
    }
    setLoading(true);
    setError('');
    setDraft(null);
    try {
      const result = await generateDraft({ ...form, apiKey });
      setDraft(result);
      if (result.title && !form.title) {
        setForm((f) => ({ ...f, title: result.title }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    onAdd({
      id: Date.now(),
      title: form.title.trim(),
      track: form.track,
      pillar: form.pillar,
      stage: draft ? 'draft' : 'idea',
      channels: {},
      date: form.date || new Date().toISOString().split('T')[0],
      draft: draft || null,
    });

    setForm({ track: form.track, pillar: form.pillar, title: '', date: '', brief: '' });
    setDraft(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">콘텐츠 제작</h2>

      {/* API Key */}
      <div className="bg-white rounded-xl p-4 border border-pale">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-steel">Claude API Key</span>
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-[11px] text-accent border-none bg-transparent cursor-pointer"
          >
            {showKey ? '숨기기' : apiKey ? '변경' : '설정'}
          </button>
        </div>
        {showKey ? (
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api..."
            className="w-full px-3 py-2 rounded-lg border border-pale text-[12px] outline-none focus:border-accent bg-snow"
          />
        ) : (
          <div className="text-[11px] text-mist">
            {apiKey ? '••••••••' + apiKey.slice(-8) : '키가 설정되지 않았습니다'}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-pale space-y-5">
        {/* Track */}
        <div>
          <label className="block text-[12px] font-semibold text-steel mb-2">트랙</label>
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
          <label className="block text-[12px] font-semibold text-steel mb-2">콘텐츠 필라</label>
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
          <label className="block text-[12px] font-semibold text-steel mb-2">제목</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="콘텐츠 제목을 입력하세요 (AI가 생성할 수도 있습니다)"
            className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-[12px] font-semibold text-steel mb-2">발행 예정일</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white"
          />
        </div>

        {/* Brief */}
        <div>
          <label className="block text-[12px] font-semibold text-steel mb-2">브리프 / 메모</label>
          <textarea
            value={form.brief}
            onChange={(e) => setForm({ ...form, brief: e.target.value })}
            placeholder="콘텐츠 방향, 키워드, 참고자료 등"
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white resize-none"
          />
        </div>

        {/* AI Generate */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-[14px] font-semibold border-none cursor-pointer transition-colors ${
            loading
              ? 'bg-mist text-white cursor-wait'
              : 'bg-accent text-white hover:bg-accent-dim'
          }`}
        >
          {loading ? '생성 중...' : 'AI 초안 생성'}
        </button>

        {error && (
          <div className="text-[12px] text-danger bg-danger/5 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Draft Preview */}
        {draft && (
          <div className="bg-snow rounded-xl p-5 border border-pale space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold">AI 생성 초안</h4>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-[11px] text-mist border-none bg-transparent cursor-pointer hover:text-steel"
              >
                닫기
              </button>
            </div>
            {draft.title && (
              <div>
                <div className="text-[10px] text-steel mb-1">제목</div>
                <div className="text-[14px] font-bold">{draft.title}</div>
              </div>
            )}
            {draft.body && (
              <div>
                <div className="text-[10px] text-steel mb-1">본문</div>
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {draft.body}
                </div>
              </div>
            )}
            {draft.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {draft.hashtags.map((tag, i) => (
                  <span key={i} className="text-[10px] text-accent bg-accent-light/30 px-2 py-0.5 rounded-full">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}
            {draft.cta && (
              <div className="text-[11px] text-steel italic">{draft.cta}</div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-dark text-white text-[14px] font-semibold border-none cursor-pointer hover:bg-charcoal transition-colors"
        >
          {draft ? '초안과 함께 추가' : '콘텐츠 추가'}
        </button>
      </form>
    </div>
  );
}
