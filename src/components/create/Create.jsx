import { useState } from 'react';
import { PILLAR_PRESETS, CHANNEL_CONFIGS, FACTORY_CHANNELS, PR_DERIVED_CHANNELS } from '../../constants/prompts';
import { generateMultiChannel, generateFromPR, reviewMultiChannel } from '../../lib/claude';

const STEPS = ['필라 선택', '주제 선택', '채널 선택', '추가 설정'];

// =====================================================
// Press Release fixed fields (NewsWire form defaults)
// =====================================================
const PR_FIXED_DEFAULTS = {
  출처: '브릿츠메디',
  날짜: '',
  웹사이트: 'www.britzmedi.co.kr / www.britzmedi.com',
  소셜링크: 'Instagram: https://www.instagram.com/britzmedi_official\nLinkedIn: https://www.linkedin.com/company/britzmedi\nYouTube: https://www.youtube.com/@britzmedi',
  담당자명: '',
  직책: '',
  이메일: '',
  전화번호: '010-6525-9442',
};

// =====================================================
// Section parser
// =====================================================
function parseSections(raw) {
  if (!raw) return [];
  const regex = /\[([^\]]+)\]/g;
  const sections = [];
  let lastIdx = 0;
  let lastLabel = null;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    if (lastLabel !== null) {
      sections.push({ label: lastLabel, text: raw.slice(lastIdx, match.index).trim() });
    }
    lastLabel = match[1];
    lastIdx = match.index + match[0].length;
  }
  if (lastLabel !== null) {
    sections.push({ label: lastLabel, text: raw.slice(lastIdx).trim() });
  }
  if (sections.length === 0 && raw.trim()) {
    sections.push({ label: '전체', text: raw.trim() });
  }
  return sections;
}

function assembleSections(sections) {
  return sections.map((s) => `[${s.label}]\n${s.text}`).join('\n\n');
}

function assemblePR(sections, fixed) {
  const parts = sections.map((s) => `[${s.label}]\n${s.text}`);
  parts.push(`[출처]\n${fixed.출처}`);
  parts.push(`[날짜]\n${fixed.날짜}`);
  parts.push(`[웹사이트]\n${fixed.웹사이트}`);
  parts.push(`[소셜 링크]\n${fixed.소셜링크}`);
  parts.push(`[연락처]\n담당자명: ${fixed.담당자명}\n직책: ${fixed.직책}\n이메일: ${fixed.이메일}\n전화번호: ${fixed.전화번호}`);
  return parts.join('\n\n');
}

// =====================================================
// Word/PDF export helpers
// =====================================================
function downloadAsWord(text, filename) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${filename}</title>
<style>body{font-family:'맑은 고딕',sans-serif;font-size:11pt;line-height:1.6;margin:2cm;}
h1{font-size:16pt;margin-bottom:4pt;} h2{font-size:13pt;margin-top:12pt;margin-bottom:4pt;color:#333;}
p{margin:4pt 0;}</style></head>
<body>${text.split('\n\n').map((block) => {
    const m = block.match(/^\[([^\]]+)\]\n?([\s\S]*)$/);
    if (m) return `<h2>${m[1]}</h2><p>${m[2].replace(/\n/g, '<br>')}</p>`;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('')}</body></html>`;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function openPrintView(text, title) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:'맑은 고딕',sans-serif;font-size:11pt;line-height:1.8;max-width:700px;margin:40px auto;padding:0 20px;}
h2{font-size:13pt;margin-top:20px;color:#333;border-bottom:1px solid #ddd;padding-bottom:4px;}
p{margin:6px 0;} @media print{body{margin:0;max-width:100%;}}</style></head>
<body><h1>${title}</h1>${text.split('\n\n').map((block) => {
    const m = block.match(/^\[([^\]]+)\]\n?([\s\S]*)$/);
    if (m) return `<h2>${m[1]}</h2><p>${m[2].replace(/\n/g, '<br>')}</p>`;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('')}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// =====================================================
// Main Component
// =====================================================
export default function Create({ onAdd, apiKey, setApiKey, prSourceData, onClearPRSource }) {
  // --- Normal factory state ---
  const [step, setStep] = useState(0);
  const [pillarId, setPillarId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [publishDate, setPublishDate] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [loading, setLoading] = useState(false);
  const [genResults, setGenResults] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('');
  const [registered, setRegistered] = useState(false);
  const [editedSections, setEditedSections] = useState({});
  const [prFixed, setPrFixed] = useState({ ...PR_FIXED_DEFAULTS });
  const [copyStatus, setCopyStatus] = useState('');
  const [reviewResults, setReviewResults] = useState({});
  const [reviewing, setReviewing] = useState(false);

  // Derived: any red issues across all channels?
  const hasRedIssues = Object.values(reviewResults).some(
    (issues) => issues.some((i) => i.severity === 'red')
  );

  // --- From-PR mode state ---
  const isFromPR = !!prSourceData;

  const pillar = PILLAR_PRESETS[pillarId];
  const topic = pillar?.topics.find((t) => t.id === topicId);
  const isCustomTopic = topic && !topic.prompt;
  const finalTopicPrompt = isCustomTopic ? customTopic : (topic?.prompt || '');

  const canProceed = () => {
    if (step === 0) return !!pillarId;
    if (step === 1) return !!topicId && (!isCustomTopic || customTopic.trim());
    if (step === 2) return selectedChannels.length > 0;
    return true;
  };

  // --- Section edit helpers ---
  const updateSection = (ch, idx, newText) => {
    setEditedSections((prev) => {
      const copy = { ...prev };
      copy[ch] = [...(copy[ch] || [])];
      copy[ch][idx] = { ...copy[ch][idx], text: newText };
      return copy;
    });
  };
  const updatePrFixed = (key, val) => setPrFixed((prev) => ({ ...prev, [key]: val }));

  // --- Copy all ---
  const handleCopyAll = (ch) => {
    const sections = editedSections[ch];
    if (!sections) return;
    const text = ch === 'pressrelease' ? assemblePR(sections, prFixed) : assembleSections(sections);
    navigator.clipboard?.writeText(text);
    setCopyStatus(ch);
    setTimeout(() => setCopyStatus(''), 2000);
  };

  // --- Generate (normal factory) ---
  const handleGenerate = async () => {
    if (!apiKey) { setShowKey(true); return; }
    setLoading(true);
    setGenResults(null);
    setRegistered(false);
    setEditedSections({});
    setCopyStatus('');
    setReviewResults({});
    setReviewing(false);
    setPrFixed((prev) => ({ ...prev, 날짜: publishDate || new Date().toISOString().split('T')[0] }));
    try {
      const result = await generateMultiChannel({
        pillarId, topicPrompt: finalTopicPrompt, channels: selectedChannels, extraContext, apiKey,
      });
      setGenResults(result);
      setActiveResultTab(selectedChannels[0] || '');
      const parsed = {};
      for (const [ch, text] of Object.entries(result.results || {})) parsed[ch] = parseSections(text);
      setEditedSections(parsed);

      // 2nd pass: AI review
      if (Object.keys(result.results || {}).length > 0) {
        setReviewing(true);
        try {
          const reviews = await reviewMultiChannel({
            contentByChannel: result.results,
            channelIds: Object.keys(result.results),
            userSourceText: finalTopicPrompt,
            apiKey,
          });
          setReviewResults(reviews);
        } catch { /* review failure is non-blocking */ }
        setReviewing(false);
      }
    } catch (e) {
      setGenResults({ results: {}, errors: { _global: e.message } });
    } finally {
      setLoading(false);
    }
  };

  // --- Generate (from PR) ---
  const handleGenerateFromPR = async () => {
    if (!apiKey) { setShowKey(true); return; }
    if (!selectedChannels.length) return;
    setLoading(true);
    setGenResults(null);
    setRegistered(false);
    setEditedSections({});
    setReviewResults({});
    setReviewing(false);
    try {
      const result = await generateFromPR({ prText: prSourceData.draft, channels: selectedChannels, apiKey });
      setGenResults(result);
      setActiveResultTab(selectedChannels[0] || '');
      const parsed = {};
      for (const [ch, text] of Object.entries(result.results || {})) parsed[ch] = parseSections(text);
      setEditedSections(parsed);

      // 2nd pass: AI review
      if (Object.keys(result.results || {}).length > 0) {
        setReviewing(true);
        try {
          const reviews = await reviewMultiChannel({
            contentByChannel: result.results,
            channelIds: Object.keys(result.results),
            userSourceText: prSourceData.draft,
            apiKey,
          });
          setReviewResults(reviews);
        } catch { /* review failure is non-blocking */ }
        setReviewing(false);
      }
    } catch (e) {
      setGenResults({ results: {}, errors: { _global: e.message } });
    } finally {
      setLoading(false);
    }
  };

  // --- PR export: register as 발행완료 ---
  const handlePublishPR = () => {
    if (!genResults || registered) return;
    const sections = editedSections.pressrelease || [];
    const fullText = assemblePR(sections, prFixed);
    const titleSec = sections.find((s) => s.label === '제목');
    const title = titleSec?.text?.trim() || topic?.label || customTopic || '보도자료';
    onAdd({
      id: Date.now(),
      title,
      track: 'B',
      pillar: 'PR',
      stage: 'published',
      channels: { pressrelease: true },
      date: prFixed.날짜 || new Date().toISOString().split('T')[0],
      draft: fullText,
    });
    setRegistered(true);
  };

  // --- From-PR: register each channel as 초안작성 ---
  const handleRegisterFromPR = () => {
    if (!genResults || registered) return;
    for (const ch of selectedChannels) {
      const sections = editedSections[ch];
      if (!sections) continue;
      const text = assembleSections(sections);
      const titleSec = sections.find((s) => s.label === '제목' || s.label === '훅' || s.label === '캡션');
      const title = titleSec?.text?.slice(0, 60)?.trim() || `${prSourceData.title} — ${CHANNEL_CONFIGS[ch]?.name}`;
      onAdd({
        id: Date.now() + Math.random(),
        title,
        track: 'B',
        pillar: 'PR',
        stage: 'draft',
        channels: { [ch]: false },
        date: new Date().toISOString().split('T')[0],
        draft: text,
      });
    }
    setRegistered(true);
  };

  // --- Normal factory: register non-PR content ---
  const handleRegisterToPipeline = () => {
    if (!genResults || registered) return;
    const title = topic?.label || customTopic || `${pillar?.label} 콘텐츠`;
    onAdd({
      id: Date.now(),
      title,
      track: 'B',
      pillar: pillarId,
      stage: 'draft',
      channels: selectedChannels.reduce((acc, ch) => ({ ...acc, [ch]: false }), {}),
      date: publishDate || new Date().toISOString().split('T')[0],
      draft: Object.fromEntries(
        Object.entries(editedSections).map(([ch, secs]) => [ch, assembleSections(secs)])
      ),
    });
    setRegistered(true);
  };

  const resetAll = () => {
    setStep(0); setPillarId(''); setTopicId(''); setCustomTopic('');
    setSelectedChannels([]); setPublishDate(''); setExtraContext('');
    setGenResults(null); setActiveResultTab(''); setRegistered(false);
    setEditedSections({}); setPrFixed({ ...PR_FIXED_DEFAULTS }); setCopyStatus('');
    setReviewResults({}); setReviewing(false);
    if (isFromPR) onClearPRSource?.();
  };

  const toggleChannel = (ch) => {
    setSelectedChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const isPRResult = !isFromPR && selectedChannels.includes('pressrelease') && activeResultTab === 'pressrelease';

  // ===========================================
  // RENDER — FROM-PR MODE
  // ===========================================
  if (isFromPR) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">채널 콘텐츠 만들기</h2>
          <button onClick={resetAll} className="text-[12px] text-mist hover:text-steel border-none bg-transparent cursor-pointer">취소</button>
        </div>

        {/* PR Source Summary */}
        <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
          <div className="text-[11px] font-semibold text-accent mb-1">원본 보도자료</div>
          <div className="text-[13px] font-bold">{prSourceData.title}</div>
          <div className="text-[11px] text-steel mt-1">{prSourceData.date}</div>
        </div>

        {/* API Key */}
        <APIKeyBox apiKey={apiKey} setApiKey={setApiKey} showKey={showKey} setShowKey={setShowKey} />

        {/* Channel Selection (if not generated yet) */}
        {!genResults && (
          <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
            <div>
              <div className="text-[13px] font-bold mb-1">채널을 선택하세요 (복수 가능)</div>
              <div className="text-[11px] text-mist">보도자료 원문을 각 채널 포맷으로 AI가 재가공합니다</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PR_DERIVED_CHANNELS.map((ch) => {
                const cfg = CHANNEL_CONFIGS[ch];
                const selected = selectedChannels.includes(ch);
                return (
                  <button key={ch} onClick={() => toggleChannel(ch)}
                    className={`p-4 rounded-xl text-left border cursor-pointer transition-all ${
                      selected ? 'bg-accent/10 border-accent shadow-sm' : 'bg-white border-pale hover:border-silver'
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-[11px] ${
                        selected ? 'bg-accent border-accent text-white' : 'border-silver bg-white'
                      }`}>{selected ? '✓' : ''}</div>
                      <span className="text-[13px] font-bold">{cfg.name}</span>
                    </div>
                    <div className="text-[11px] text-mist mt-1.5 ml-7">{cfg.charTarget}</div>
                  </button>
                );
              })}
            </div>
            <button onClick={handleGenerateFromPR} disabled={loading || !selectedChannels.length}
              className={`w-full py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                loading ? 'bg-mist text-white cursor-wait' : selectedChannels.length ? 'bg-accent text-white hover:bg-accent-dim' : 'bg-pale text-mist cursor-not-allowed'
              }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {selectedChannels.length}개 채널 생성 중...
                </span>
              ) : `채널 콘텐츠 생성하기 (${selectedChannels.length}채널)`}
            </button>
          </div>
        )}

        {/* Results */}
        {genResults && (
          <ResultsView
            genResults={genResults} selectedChannels={selectedChannels}
            activeResultTab={activeResultTab} setActiveResultTab={setActiveResultTab}
            editedSections={editedSections} updateSection={updateSection}
            handleCopyAll={handleCopyAll} copyStatus={copyStatus} setCopyStatus={setCopyStatus}
            loading={loading} onRegenerate={handleGenerateFromPR}
            isPR={false} prFixed={prFixed} updatePrFixed={updatePrFixed}
            reviewResults={reviewResults} reviewing={reviewing} hasRedIssues={hasRedIssues}
            bottomActions={
              <div className="flex gap-2">
                <button onClick={resetAll} className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">취소</button>
                {hasRedIssues ? (
                  <div className="flex-1 py-3 rounded-lg text-[13px] font-bold text-center text-danger bg-danger/5 border border-danger/20">
                    수정 후 내보내기 — 필수 수정 사항을 먼저 해결하세요
                  </div>
                ) : (
                  <button onClick={handleRegisterFromPR} disabled={registered}
                    className={`flex-1 py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                      registered ? 'bg-success text-white cursor-default' : 'bg-dark text-white hover:bg-charcoal'
                    }`}>
                    {registered ? '파이프라인에 등록 완료 ✓' : `${selectedChannels.length}개 채널 콘텐츠 파이프라인에 등록`}
                  </button>
                )}
              </div>
            }
          />
        )}
      </div>
    );
  }

  // ===========================================
  // RENDER — NORMAL FACTORY MODE
  // ===========================================
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">콘텐츠 팩토리</h2>
        {(step > 0 || genResults) && (
          <button onClick={resetAll} className="text-[12px] text-mist hover:text-steel border-none bg-transparent cursor-pointer">처음부터 다시</button>
        )}
      </div>

      <APIKeyBox apiKey={apiKey} setApiKey={setApiKey} showKey={showKey} setShowKey={setShowKey} />

      {/* Stepper */}
      {!genResults && (
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                i < step ? 'bg-accent text-white' : i === step ? 'bg-dark text-white' : 'bg-pale text-mist'
              }`}>{i + 1}</div>
              <span className={`text-[10px] hidden md:block truncate ${i === step ? 'text-dark font-semibold' : 'text-mist'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-pale mx-1" />}
            </div>
          ))}
        </div>
      )}

      {/* STEP 0: Pillar */}
      {!genResults && step === 0 && (
        <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
          <div><div className="text-[13px] font-bold mb-1">콘텐츠 필라를 선택하세요</div><div className="text-[11px] text-mist">어떤 카테고리의 콘텐츠를 만드시겠습니까?</div></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {Object.entries(PILLAR_PRESETS).map(([id, p]) => (
              <button key={id} onClick={() => { setPillarId(id); setTopicId(''); }}
                className={`p-4 rounded-xl text-left border cursor-pointer transition-all ${
                  pillarId === id ? 'bg-dark text-white border-dark shadow-md' : 'bg-white text-slate border-pale hover:border-silver hover:shadow-sm'
                }`}>
                <div className="text-xl mb-1.5">{p.icon}</div>
                <div className="text-[13px] font-bold">{id}: {p.label}</div>
                <div className={`text-[11px] mt-0.5 ${pillarId === id ? 'text-silver' : 'text-mist'}`}>{p.desc}</div>
              </button>
            ))}
          </div>
          <StepNav step={step} setStep={setStep} canProceed={canProceed()} />
        </div>
      )}

      {/* STEP 1: Topic */}
      {!genResults && step === 1 && pillar && (
        <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
          <div><div className="text-[13px] font-bold mb-1">{pillar.icon} {pillarId}: {pillar.label} — 주제 선택</div><div className="text-[11px] text-mist">프리셋 주제를 선택하거나 직접 입력하세요</div></div>
          <div className="space-y-2">
            {pillar.topics.map((t) => (
              <button key={t.id} onClick={() => setTopicId(t.id)}
                className={`w-full p-3.5 rounded-lg text-left border cursor-pointer transition-colors ${
                  topicId === t.id ? 'bg-dark text-white border-dark' : 'bg-white text-slate border-pale hover:bg-snow'
                }`}>
                <div className="text-[13px] font-medium">{t.label}</div>
                {t.prompt && <div className={`text-[11px] mt-1 leading-relaxed ${topicId === t.id ? 'text-silver' : 'text-mist'}`}>{t.prompt.length > 80 ? t.prompt.slice(0, 80) + '...' : t.prompt}</div>}
              </button>
            ))}
          </div>
          {isCustomTopic && (
            <textarea value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="원하는 주제, 키워드, 방향을 자유롭게 입력하세요" rows={3}
              className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-snow resize-none" />
          )}
          <StepNav step={step} setStep={setStep} canProceed={canProceed()} />
        </div>
      )}

      {/* STEP 2: Channels */}
      {!genResults && step === 2 && (
        <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
          <div><div className="text-[13px] font-bold mb-1">발행 채널을 선택하세요 (복수 가능)</div><div className="text-[11px] text-mist">채널마다 맞춤 포맷으로 각각 생성됩니다</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {FACTORY_CHANNELS.map((ch) => {
              const cfg = CHANNEL_CONFIGS[ch];
              const selected = selectedChannels.includes(ch);
              return (
                <button key={ch} onClick={() => toggleChannel(ch)}
                  className={`p-4 rounded-xl text-left border cursor-pointer transition-all ${
                    selected ? 'bg-accent/10 border-accent shadow-sm' : 'bg-white border-pale hover:border-silver'
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-[11px] ${
                      selected ? 'bg-accent border-accent text-white' : 'border-silver bg-white'
                    }`}>{selected ? '✓' : ''}</div>
                    <span className="text-[13px] font-bold">{cfg.name}</span>
                  </div>
                  <div className="text-[11px] text-mist mt-1.5 ml-7">{cfg.charTarget}</div>
                </button>
              );
            })}
          </div>
          <StepNav step={step} setStep={setStep} canProceed={canProceed()} />
        </div>
      )}

      {/* STEP 3: Settings */}
      {!genResults && step === 3 && (
        <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
          <div><div className="text-[13px] font-bold mb-1">추가 설정</div><div className="text-[11px] text-mist">발행일과 참고사항을 입력하세요 (선택)</div></div>
          <div className="bg-snow rounded-lg p-4 space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-steel">필라</span><span className="font-semibold">{pillar?.icon} {pillarId}: {pillar?.label}</span></div>
            <div className="flex justify-between"><span className="text-steel">주제</span><span className="font-semibold truncate ml-4 max-w-[250px]">{topic?.label}</span></div>
            <div className="flex justify-between"><span className="text-steel">채널</span><span className="font-semibold">{selectedChannels.map((ch) => CHANNEL_CONFIGS[ch]?.name).join(', ')}</span></div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-steel mb-2">발행 예정일</label>
            <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-steel mb-2">참고사항 / 소스</label>
            <textarea value={extraContext} onChange={(e) => setExtraContext(e.target.value)} placeholder="추가로 반영할 내용, URL, 특별 지시사항 등" rows={3}
              className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">이전</button>
            <button onClick={handleGenerate} disabled={loading}
              className={`flex-1 py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                loading ? 'bg-mist text-white cursor-wait' : 'bg-accent text-white hover:bg-accent-dim'
              }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {selectedChannels.length}개 채널 생성 중...
                </span>
              ) : `콘텐츠 생성하기 (${selectedChannels.length}채널)`}
            </button>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {genResults && (
        <ResultsView
          genResults={genResults} selectedChannels={selectedChannels}
          activeResultTab={activeResultTab} setActiveResultTab={setActiveResultTab}
          editedSections={editedSections} updateSection={updateSection}
          handleCopyAll={handleCopyAll} copyStatus={copyStatus} setCopyStatus={setCopyStatus}
          loading={loading} onRegenerate={handleGenerate}
          isPR={isPRResult} prFixed={prFixed} updatePrFixed={updatePrFixed}
          reviewResults={reviewResults} reviewing={reviewing} hasRedIssues={hasRedIssues}
          bottomActions={
            isPRResult ? (
              /* PR export actions */
              <div className="space-y-3">
                {hasRedIssues ? (
                  <div className="py-3 rounded-lg text-[13px] font-bold text-center text-danger bg-danger/5 border border-danger/20">
                    수정 후 내보내기 — 필수 수정 사항을 먼저 해결하세요
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const sections = editedSections.pressrelease || [];
                        const text = assemblePR(sections, prFixed);
                        const titleSec = sections.find((s) => s.label === '제목');
                        downloadAsWord(text, titleSec?.text?.trim() || '보도자료');
                      }} className="flex-1 py-3 rounded-lg text-[13px] font-semibold text-slate border border-pale bg-white cursor-pointer hover:bg-snow">
                        Word 다운로드
                      </button>
                      <button onClick={() => {
                        const sections = editedSections.pressrelease || [];
                        const text = assemblePR(sections, prFixed);
                        const titleSec = sections.find((s) => s.label === '제목');
                        openPrintView(text, titleSec?.text?.trim() || '보도자료');
                      }} className="flex-1 py-3 rounded-lg text-[13px] font-semibold text-slate border border-pale bg-white cursor-pointer hover:bg-snow">
                        PDF 다운로드
                      </button>
                    </div>
                    <button onClick={handlePublishPR} disabled={registered}
                      className={`w-full py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                        registered ? 'bg-success text-white cursor-default' : 'bg-dark text-white hover:bg-charcoal'
                      }`}>
                      {registered ? '발행완료로 등록됨 ✓' : '발행완료로 파이프라인 등록'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Non-PR register */
              <div className="flex gap-2">
                <button onClick={resetAll} className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">새 콘텐츠 만들기</button>
                {hasRedIssues ? (
                  <div className="flex-1 py-3 rounded-lg text-[13px] font-bold text-center text-danger bg-danger/5 border border-danger/20">
                    수정 후 내보내기
                  </div>
                ) : (
                  <button onClick={handleRegisterToPipeline} disabled={registered}
                    className={`flex-1 py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                      registered ? 'bg-success text-white cursor-default' : 'bg-dark text-white hover:bg-charcoal'
                    }`}>
                    {registered ? '파이프라인에 등록 완료 ✓' : '파이프라인에 등록'}
                  </button>
                )}
              </div>
            )
          }
        />
      )}
    </div>
  );
}

// =====================================================
// Shared sub-components
// =====================================================

function APIKeyBox({ apiKey, setApiKey, showKey, setShowKey }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-pale">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-semibold text-steel">Claude API Key</span>
        <button type="button" onClick={() => setShowKey(!showKey)} className="text-[11px] text-accent border-none bg-transparent cursor-pointer">
          {showKey ? '숨기기' : apiKey ? '변경' : '설정'}
        </button>
      </div>
      {showKey ? (
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-api..."
          className="w-full px-3 py-2 rounded-lg border border-pale text-[12px] outline-none focus:border-accent bg-snow" />
      ) : (
        <div className="text-[11px] text-mist">{apiKey ? '••••••••' + apiKey.slice(-8) : '키가 설정되지 않았습니다'}</div>
      )}
    </div>
  );
}

function ResultsView({ genResults, selectedChannels, activeResultTab, setActiveResultTab, editedSections, updateSection, handleCopyAll, copyStatus, setCopyStatus, loading, onRegenerate, isPR, prFixed, updatePrFixed, reviewResults, reviewing, hasRedIssues, bottomActions }) {
  const activeReview = reviewResults?.[activeResultTab] || [];

  // Group issues by section label for per-section annotations
  const issuesBySection = {};
  activeReview.forEach((issue) => {
    const key = issue.section || '_general';
    if (!issuesBySection[key]) issuesBySection[key] = [];
    issuesBySection[key].push(issue);
  });

  return (
    <div className="space-y-4">
      {genResults.errors?._global && (
        <div className="text-[13px] text-danger bg-danger/5 rounded-xl p-4 border border-danger/20">{genResults.errors._global}</div>
      )}
      {selectedChannels.length > 0 && !genResults.errors?._global && (
        <>
          {/* Review Summary Card */}
          <ReviewSummary reviewResults={reviewResults} reviewing={reviewing} selectedChannels={selectedChannels} />

          <div className="flex gap-1.5 overflow-x-auto">
            {selectedChannels.map((ch) => {
              const cfg = CHANNEL_CONFIGS[ch];
              const hasError = !!genResults.errors?.[ch];
              const chIssues = reviewResults?.[ch] || [];
              const redCount = chIssues.filter((i) => i.severity === 'red').length;
              const yellowCount = chIssues.filter((i) => i.severity === 'yellow').length;
              return (
                <button key={ch} onClick={() => { setActiveResultTab(ch); setCopyStatus(''); }}
                  className={`px-4 py-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
                    activeResultTab === ch ? 'bg-dark text-white border-dark' : hasError ? 'bg-danger/5 text-danger border-danger/20' : 'bg-white text-slate border-pale hover:bg-snow'
                  }`}>
                  {cfg.name} {hasError ? '⚠️' : redCount > 0 ? `🔴${redCount}` : yellowCount > 0 ? `🟡${yellowCount}` : '✅'}
                </button>
              );
            })}
          </div>
          {activeResultTab && (
            <div className="bg-white rounded-xl border border-pale overflow-hidden">
              {genResults.errors?.[activeResultTab] ? (
                <div className="p-5 text-[13px] text-danger">생성 실패: {genResults.errors[activeResultTab]}</div>
              ) : editedSections[activeResultTab]?.length > 0 ? (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-bold">{CHANNEL_CONFIGS[activeResultTab]?.name}</div>
                    <button onClick={onRegenerate} disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10">재생성</button>
                  </div>

                  {/* General issues (no specific section) */}
                  {issuesBySection._general?.length > 0 && (
                    <IssueAnnotations issues={issuesBySection._general} />
                  )}

                  <div className="text-[11px] font-semibold text-accent mb-1">AI 생성 영역</div>
                  {editedSections[activeResultTab].map((sec, idx) => (
                    <div key={idx}>
                      <SectionField label={sec.label} value={sec.text}
                        onChange={(val) => updateSection(activeResultTab, idx, val)}
                        rows={sec.label === '본문' || sec.label === '전체' ? 12 : sec.label.startsWith('본문') || sec.label.startsWith('소제목') ? 8 : 3} />
                      {issuesBySection[sec.label]?.length > 0 && (
                        <IssueAnnotations issues={issuesBySection[sec.label]} />
                      )}
                    </div>
                  ))}
                  {isPR && (
                    <>
                      <div className="border-t border-pale pt-4 mt-4">
                        <div className="text-[11px] font-semibold text-steel mb-3">뉴스와이어 입력 필드</div>
                      </div>
                      <SectionField label="출처" value={prFixed.출처} onChange={(v) => updatePrFixed('출처', v)} rows={1} />
                      <SectionField label="날짜" value={prFixed.날짜} onChange={(v) => updatePrFixed('날짜', v)} rows={1} />
                      <SectionField label="웹사이트" value={prFixed.웹사이트} onChange={(v) => updatePrFixed('웹사이트', v)} rows={1} />
                      <SectionField label="소셜 링크" value={prFixed.소셜링크} onChange={(v) => updatePrFixed('소셜링크', v)} rows={3} />
                      <div className="bg-snow rounded-lg p-4 space-y-3">
                        <div className="text-[12px] font-semibold text-steel">연락처</div>
                        <div className="grid grid-cols-2 gap-3">
                          <LabelInput label="담당자명" value={prFixed.담당자명} onChange={(v) => updatePrFixed('담당자명', v)} placeholder="이름 입력" />
                          <LabelInput label="직책" value={prFixed.직책} onChange={(v) => updatePrFixed('직책', v)} placeholder="직책 입력" />
                          <LabelInput label="이메일" value={prFixed.이메일} onChange={(v) => updatePrFixed('이메일', v)} placeholder="email@britzmedi.co.kr" />
                          <LabelInput label="전화번호" value={prFixed.전화번호} onChange={(v) => updatePrFixed('전화번호', v)} placeholder="010-0000-0000" />
                        </div>
                      </div>
                    </>
                  )}
                  <button onClick={() => handleCopyAll(activeResultTab)}
                    className={`w-full py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                      copyStatus === activeResultTab ? 'bg-success text-white' : 'bg-dark text-white hover:bg-charcoal'
                    }`}>
                    {copyStatus === activeResultTab ? '전체 복사 완료 ✓' : `전체 복사 — ${CHANNEL_CONFIGS[activeResultTab]?.name}`}
                  </button>
                </div>
              ) : (
                <div className="p-5 text-[13px] text-mist">생성된 내용이 없습니다</div>
              )}
            </div>
          )}
          {bottomActions}
        </>
      )}
    </div>
  );
}

function ReviewSummary({ reviewResults, reviewing, selectedChannels }) {
  if (reviewing) {
    return (
      <div className="bg-accent/5 rounded-xl p-4 border border-accent/20 flex items-center gap-3">
        <span className="inline-block w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <span className="text-[13px] font-semibold text-accent">AI 검수 진행 중...</span>
      </div>
    );
  }

  if (!reviewResults || Object.keys(reviewResults).length === 0) return null;

  let totalRed = 0;
  let totalYellow = 0;
  let totalChannels = 0;
  let passedChannels = 0;

  for (const ch of selectedChannels) {
    const issues = reviewResults[ch];
    if (!issues) continue;
    totalChannels++;
    const reds = issues.filter((i) => i.severity === 'red').length;
    const yellows = issues.filter((i) => i.severity === 'yellow').length;
    totalRed += reds;
    totalYellow += yellows;
    if (reds === 0 && yellows === 0) passedChannels++;
  }

  if (totalChannels === 0) return null;

  const allPass = totalRed === 0 && totalYellow === 0;

  return (
    <div className={`rounded-xl p-4 border ${
      totalRed > 0 ? 'bg-danger/5 border-danger/20' : totalYellow > 0 ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'
    }`}>
      <div className="text-[12px] font-bold mb-2">AI 검수 결과</div>
      <div className="flex items-center gap-4 text-[13px]">
        {totalRed > 0 && (
          <span className="font-bold text-danger">🔴 {totalRed}건 (반드시 수정)</span>
        )}
        {totalYellow > 0 && (
          <span className="font-bold text-warning">🟡 {totalYellow}건 (확인 권장)</span>
        )}
        {allPass && (
          <span className="font-bold text-success">✅ 전체 통과 ({passedChannels}채널)</span>
        )}
      </div>
      {totalRed > 0 && (
        <div className="text-[11px] text-danger mt-2">🔴 필수 수정 사항이 있습니다. 수정 후 내보내기가 가능합니다.</div>
      )}
    </div>
  );
}

function IssueAnnotations({ issues }) {
  if (!issues || issues.length === 0) return null;
  return (
    <div className="space-y-1.5 mt-1 mb-2">
      {issues.map((issue, i) => (
        <div key={i} className={`rounded-lg px-3 py-2 text-[11px] leading-relaxed border ${
          issue.severity === 'red' ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-warning/5 border-warning/20 text-warning'
        }`}>
          <div className="flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">{issue.severity === 'red' ? '🔴' : '🟡'}</span>
            <div>
              <span className="font-bold">[{issue.category}]</span> {issue.message}
              {issue.quote && (
                <div className={`mt-1 text-[10px] italic ${issue.severity === 'red' ? 'text-danger/70' : 'text-warning/70'}`}>
                  &quot;{issue.quote}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionField({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate mb-1.5">[{label}]</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] leading-[1.7] outline-none focus:border-accent bg-snow resize-y" />
    </div>
  );
}

function LabelInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[11px] text-mist mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-pale text-[12px] outline-none focus:border-accent bg-white" />
    </div>
  );
}

function StepNav({ step, setStep, canProceed }) {
  return (
    <div className="flex gap-2 pt-2">
      {step > 0 && <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">이전</button>}
      <button onClick={() => canProceed && setStep(step + 1)} disabled={!canProceed}
        className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-colors ${
          canProceed ? 'bg-dark text-white hover:bg-charcoal' : 'bg-pale text-mist cursor-not-allowed'
        }`}>다음</button>
    </div>
  );
}
