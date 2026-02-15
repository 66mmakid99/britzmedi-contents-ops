import { useState } from 'react';
import { CHANNEL_CONFIGS, FACTORY_CHANNELS, PR_DERIVED_CHANNELS, PR_CATEGORIES } from '../../constants/prompts';
import { generateFromPR, reviewMultiChannel, parseContent, generateFromFacts, reviewV2 } from '../../lib/claude';

// v2 step labels for the stepper
const V2_STEP_LABELS = ['입력', '파싱', '팩트 확인', '생성', '검수', '결과'];
const V2_STEP_INDEX = { input: 0, parsing: 1, confirm: 2, generating: 3, reviewing: 4, results: 5 };

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
  // --- Shared state ---
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [showKey, setShowKey] = useState(false);
  const [editedSections, setEditedSections] = useState({});
  const [prFixed, setPrFixed] = useState({ ...PR_FIXED_DEFAULTS });
  const [copyStatus, setCopyStatus] = useState('');
  const [registered, setRegistered] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('');

  // --- From-PR mode state ---
  const [loading, setLoading] = useState(false);
  const [genResults, setGenResults] = useState(null);
  const [reviewResults, setReviewResults] = useState({});
  const [reviewing, setReviewing] = useState(false);

  // --- v2 factory state ---
  const [v2Step, setV2Step] = useState('input');
  const [sourceText, setSourceText] = useState('');
  const [timing, setTiming] = useState('pre');
  const [parsedResult, setParsedResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [confirmedFields, setConfirmedFields] = useState({});
  const [v2Content, setV2Content] = useState({});
  const [v2Review, setV2Review] = useState({});
  const [v2Error, setV2Error] = useState('');

  const isFromPR = !!prSourceData;

  // Derived: red issues for from-PR mode
  const hasRedIssues = Object.values(reviewResults).some(
    (issues) => issues.some((i) => i.severity === 'red')
  );
  // Derived: red issues for v2 mode
  const v2HasRedIssues = Object.values(v2Review).some(
    (r) => r.issues?.some((i) => i.severity === 'red')
  );

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

  const toggleChannel = (ch) => {
    setSelectedChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  // --- Reset ---
  const resetAll = () => {
    setSelectedChannels([]);
    setEditedSections({});
    setPrFixed({ ...PR_FIXED_DEFAULTS });
    setCopyStatus('');
    setRegistered(false);
    setActiveResultTab('');
    if (isFromPR) {
      setLoading(false);
      setGenResults(null);
      setReviewResults({});
      setReviewing(false);
      onClearPRSource?.();
    } else {
      setV2Step('input');
      setSourceText('');
      setTiming('pre');
      setParsedResult(null);
      setSelectedCategory('general');
      setConfirmedFields({});
      setV2Content({});
      setV2Review({});
      setV2Error('');
    }
  };

  // ===========================================
  // FROM-PR HANDLERS (unchanged)
  // ===========================================

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

  // ===========================================
  // V2 FACTORY HANDLERS
  // ===========================================

  /** STEP 0 → 1 → 2: Parse source text */
  const handleV2Parse = async () => {
    if (!apiKey) { setShowKey(true); return; }
    if (!sourceText.trim()) return;
    setV2Step('parsing');
    setV2Error('');
    try {
      const result = await parseContent({ sourceText, apiKey });
      setParsedResult(result);
      setSelectedCategory(result.category || 'general');
      setConfirmedFields(result.fields || {});
      setV2Step('confirm');
    } catch (e) {
      setV2Error(`파싱 실패: ${e.message}`);
      setV2Step('input');
    }
  };

  /** STEP 2 → 3 → 4 → 5: Generate + Review */
  const handleV2Generate = async () => {
    if (!apiKey) { setShowKey(true); return; }
    if (!selectedChannels.length) return;
    setV2Step('generating');
    setV2Error('');
    setRegistered(false);
    setCopyStatus('');
    setPrFixed((prev) => ({ ...prev, 날짜: new Date().toISOString().split('T')[0] }));

    try {
      // Generate for each channel
      const results = {};
      const errors = {};
      await Promise.all(selectedChannels.map(async (ch) => {
        try {
          results[ch] = await generateFromFacts({
            category: selectedCategory,
            confirmedFields,
            timing,
            channelId: ch,
            apiKey,
          });
        } catch (e) {
          errors[ch] = e.message;
        }
      }));

      setV2Content(results);

      // Parse sections for editor
      const parsed = {};
      for (const [ch, text] of Object.entries(results)) {
        parsed[ch] = parseSections(text);
      }
      setEditedSections(parsed);
      setActiveResultTab(selectedChannels.find((ch) => results[ch]) || selectedChannels[0] || '');

      if (Object.keys(errors).length > 0 && Object.keys(results).length === 0) {
        setV2Error(`생성 실패: ${Object.values(errors).join(', ')}`);
        setV2Step('confirm');
        return;
      }

      // Auto-review
      setV2Step('reviewing');
      const reviews = {};
      await Promise.all(selectedChannels.map(async (ch) => {
        if (!results[ch]) return;
        try {
          reviews[ch] = await reviewV2({
            content: results[ch],
            confirmedFields,
            channelId: ch,
            apiKey,
          });
        } catch {
          reviews[ch] = { summary: { critical: 0, warning: 0, factRatio: '검수 실패' }, issues: [] };
        }
      }));
      setV2Review(reviews);
      setV2Step('results');
    } catch (e) {
      setV2Error(`오류: ${e.message}`);
      setV2Step('confirm');
    }
  };

  /** Export: register to pipeline */
  const handleV2Register = () => {
    if (registered) return;
    const isPR = selectedChannels.includes('pressrelease') && selectedChannels.length === 1;
    if (isPR) {
      // Single press release → publish
      const sections = editedSections.pressrelease || [];
      const fullText = assemblePR(sections, prFixed);
      const titleSec = sections.find((s) => s.label === '제목');
      onAdd({
        id: Date.now(),
        title: titleSec?.text?.trim() || '보도자료',
        track: 'B',
        pillar: 'PR',
        stage: 'published',
        channels: { pressrelease: true },
        date: prFixed.날짜 || new Date().toISOString().split('T')[0],
        draft: fullText,
      });
    } else {
      // Multi-channel or non-PR
      const drafts = {};
      for (const ch of selectedChannels) {
        const sections = editedSections[ch];
        if (!sections) continue;
        drafts[ch] = ch === 'pressrelease' ? assemblePR(sections, prFixed) : assembleSections(sections);
      }
      const firstSections = editedSections[selectedChannels[0]] || [];
      const titleSec = firstSections.find((s) => s.label === '제목' || s.label === '훅' || s.label === '캡션');
      onAdd({
        id: Date.now(),
        title: titleSec?.text?.slice(0, 60)?.trim() || '콘텐츠',
        track: 'B',
        pillar: 'PR',
        stage: selectedChannels.includes('pressrelease') ? 'published' : 'draft',
        channels: selectedChannels.reduce((acc, ch) => ({ ...acc, [ch]: false }), {}),
        date: new Date().toISOString().split('T')[0],
        draft: Object.keys(drafts).length === 1 ? Object.values(drafts)[0] : drafts,
      });
    }
    setRegistered(true);
  };

  // ===========================================
  // RENDER — FROM-PR MODE (unchanged)
  // ===========================================
  if (isFromPR) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">채널 콘텐츠 만들기</h2>
          <button onClick={resetAll} className="text-[12px] text-mist hover:text-steel border-none bg-transparent cursor-pointer">취소</button>
        </div>

        <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
          <div className="text-[11px] font-semibold text-accent mb-1">원본 보도자료</div>
          <div className="text-[13px] font-bold">{prSourceData.title}</div>
          <div className="text-[11px] text-steel mt-1">{prSourceData.date}</div>
        </div>

        <APIKeyBox apiKey={apiKey} setApiKey={setApiKey} showKey={showKey} setShowKey={setShowKey} />

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
  // RENDER — V2 FACTORY MODE (6-step flow)
  // ===========================================
  const v2StepIdx = V2_STEP_INDEX[v2Step] ?? 0;
  const isPRChannel = selectedChannels.includes('pressrelease');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">콘텐츠 팩토리 v2</h2>
        {v2Step !== 'input' && (
          <button onClick={resetAll} className="text-[12px] text-mist hover:text-steel border-none bg-transparent cursor-pointer">처음부터 다시</button>
        )}
      </div>

      <APIKeyBox apiKey={apiKey} setApiKey={setApiKey} showKey={showKey} setShowKey={setShowKey} />

      {/* v2 Stepper */}
      {v2Step !== 'results' && (
        <div className="flex items-center gap-1">
          {V2_STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                i < v2StepIdx ? 'bg-accent text-white' : i === v2StepIdx ? 'bg-dark text-white' : 'bg-pale text-mist'
              }`}>{i + 1}</div>
              <span className={`text-[10px] hidden md:block truncate ${i === v2StepIdx ? 'text-dark font-semibold' : 'text-mist'}`}>{label}</span>
              {i < V2_STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-pale mx-1" />}
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {v2Error && (
        <div className="text-[13px] text-danger bg-danger/5 rounded-xl p-4 border border-danger/20">
          {v2Error}
          <button onClick={() => setV2Error('')} className="ml-2 text-[11px] text-danger/60 border-none bg-transparent cursor-pointer underline">닫기</button>
        </div>
      )}

      {/* ============================== */}
      {/* STEP 0: Input                  */}
      {/* ============================== */}
      {v2Step === 'input' && (
        <div className="space-y-4">
          {/* Source text */}
          <div className="bg-white rounded-xl p-5 border border-pale space-y-3">
            <div>
              <div className="text-[13px] font-bold mb-1">소스 텍스트</div>
              <div className="text-[11px] text-mist">보도자료로 작성할 원본 자료를 붙여넣으세요 (이벤트 정보, 계약 내용, 제품 스펙 등)</div>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="예: BRITZMEDI가 2026년 3월 15-17일 AMWC Monaco 2026에 참가합니다. 부스 번호 H301에서 TORR RF 신제품을 전시합니다..."
              rows={8}
              className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] leading-[1.7] outline-none focus:border-accent bg-snow resize-y"
            />
            <div className="text-[11px] text-mist text-right">{sourceText.length}자</div>
          </div>

          {/* Channel selection */}
          <div className="bg-white rounded-xl p-5 border border-pale space-y-3">
            <div>
              <div className="text-[13px] font-bold mb-1">발행 채널 (복수 가능)</div>
              <div className="text-[11px] text-mist">팩트 기반으로 각 채널 포맷에 맞게 생성됩니다</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FACTORY_CHANNELS.map((ch) => {
                const cfg = CHANNEL_CONFIGS[ch];
                const selected = selectedChannels.includes(ch);
                return (
                  <button key={ch} onClick={() => toggleChannel(ch)}
                    className={`p-3 rounded-lg text-left border cursor-pointer transition-all ${
                      selected ? 'bg-accent/10 border-accent' : 'bg-white border-pale hover:border-silver'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[9px] ${
                        selected ? 'bg-accent border-accent text-white' : 'border-silver bg-white'
                      }`}>{selected ? '✓' : ''}</div>
                      <span className="text-[12px] font-semibold">{cfg.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timing selection */}
          <div className="bg-white rounded-xl p-5 border border-pale space-y-3">
            <div className="text-[13px] font-bold mb-1">시점 (시제)</div>
            <div className="flex gap-3">
              <button onClick={() => setTiming('pre')}
                className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all text-left ${
                  timing === 'pre' ? 'bg-dark text-white border-dark' : 'bg-white border-pale hover:bg-snow'
                }`}>
                <div className="text-[13px] font-bold">예고형 (사전)</div>
                <div className={`text-[11px] mt-0.5 ${timing === 'pre' ? 'text-silver' : 'text-mist'}`}>~할 예정이다, ~에 참가한다</div>
              </button>
              <button onClick={() => setTiming('post')}
                className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all text-left ${
                  timing === 'post' ? 'bg-dark text-white border-dark' : 'bg-white border-pale hover:bg-snow'
                }`}>
                <div className="text-[13px] font-bold">리뷰형 (사후)</div>
                <div className={`text-[11px] mt-0.5 ${timing === 'post' ? 'text-silver' : 'text-mist'}`}>~했다, ~를 선보였다</div>
              </button>
            </div>
          </div>

          {/* Parse button */}
          <button
            onClick={handleV2Parse}
            disabled={!sourceText.trim() || !selectedChannels.length}
            className={`w-full py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
              sourceText.trim() && selectedChannels.length
                ? 'bg-accent text-white hover:bg-accent-dim'
                : 'bg-pale text-mist cursor-not-allowed'
            }`}
          >
            소스 파싱 시작 (STEP 1)
          </button>
        </div>
      )}

      {/* ============================== */}
      {/* STEP 1: Parsing (loading)      */}
      {/* ============================== */}
      {v2Step === 'parsing' && (
        <LoadingCard title="소스 텍스트 파싱 중..." subtitle="AI가 소스에서 구조화된 팩트를 추출하고 있습니다" />
      )}

      {/* ============================== */}
      {/* STEP 2: Fact Confirmation      */}
      {/* ============================== */}
      {v2Step === 'confirm' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-bold">팩트 확인</div>
                <div className="text-[11px] text-mist">AI가 추출한 팩트를 확인하고 수정하세요. 이 정보만으로 콘텐츠가 생성됩니다.</div>
              </div>
              <button onClick={() => { setV2Step('input'); setV2Error(''); }}
                className="text-[11px] text-accent border-none bg-transparent cursor-pointer hover:underline">소스 수정</button>
            </div>

            {/* Category selector */}
            <CategorySelector value={selectedCategory} onChange={setSelectedCategory} />

            {/* Field cards */}
            <div className="space-y-2.5">
              {(PR_CATEGORIES[selectedCategory]?.fields || []).map((fieldDef) => (
                <FieldCard
                  key={fieldDef.key}
                  fieldDef={fieldDef}
                  value={confirmedFields[fieldDef.key]}
                  onChange={(val) => setConfirmedFields((prev) => ({ ...prev, [fieldDef.key]: val }))}
                />
              ))}
            </div>

            {/* Summary: how many facts confirmed */}
            <div className="bg-snow rounded-lg p-3">
              <div className="text-[12px] text-steel">
                확인된 팩트: <span className="font-bold text-accent">
                  {Object.values(confirmedFields).filter((v) => v !== null && v !== '' && v !== undefined).length}
                </span> / {PR_CATEGORIES[selectedCategory]?.fields.length || 0}개 필드
              </div>
              <div className="text-[11px] text-mist mt-1">
                채널: {selectedChannels.map((ch) => CHANNEL_CONFIGS[ch]?.name).join(', ')} | 시점: {timing === 'pre' ? '예고형' : '리뷰형'}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex gap-2">
            <button onClick={() => { setV2Step('input'); setV2Error(''); }}
              className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">이전</button>
            <button onClick={handleV2Generate}
              className="flex-1 py-3 rounded-lg text-[14px] font-bold bg-accent text-white border-none cursor-pointer hover:bg-accent-dim">
              팩트 확인 완료 → 생성 (STEP 3)
            </button>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* STEP 3: Generating (loading)   */}
      {/* ============================== */}
      {v2Step === 'generating' && (
        <LoadingCard title={`팩트 기반 콘텐츠 생성 중... (${selectedChannels.length}채널)`} subtitle="확인된 팩트만으로 콘텐츠를 작성하고 있습니다" />
      )}

      {/* ============================== */}
      {/* STEP 4: Reviewing (loading)    */}
      {/* ============================== */}
      {v2Step === 'reviewing' && (
        <LoadingCard title="AI 검수 진행 중..." subtitle="팩트 비율, 의료법, 표기법을 자동 검수합니다" />
      )}

      {/* ============================== */}
      {/* STEP 5: Results + Export       */}
      {/* ============================== */}
      {v2Step === 'results' && (
        <div className="space-y-4">
          {/* Review Summary (v2) */}
          <ReviewSummaryV2 v2Review={v2Review} selectedChannels={selectedChannels} />

          {/* Channel tabs */}
          {selectedChannels.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {selectedChannels.map((ch) => {
                const cfg = CHANNEL_CONFIGS[ch];
                const review = v2Review[ch];
                const redCount = review?.issues?.filter((i) => i.severity === 'red').length || 0;
                const yellowCount = review?.issues?.filter((i) => i.severity === 'yellow').length || 0;
                const hasContent = !!v2Content[ch];
                return (
                  <button key={ch} onClick={() => { setActiveResultTab(ch); setCopyStatus(''); }}
                    className={`px-4 py-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
                      activeResultTab === ch ? 'bg-dark text-white border-dark' : !hasContent ? 'bg-danger/5 text-danger border-danger/20' : 'bg-white text-slate border-pale hover:bg-snow'
                    }`}>
                    {cfg.name} {!hasContent ? '⚠️' : redCount > 0 ? `🔴${redCount}` : yellowCount > 0 ? `🟡${yellowCount}` : '✅'}
                  </button>
                );
              })}
            </div>
          )}

          {/* Editor + Issue annotations for active channel */}
          {activeResultTab && editedSections[activeResultTab]?.length > 0 && (
            <V2EditorView
              channelId={activeResultTab}
              sections={editedSections[activeResultTab]}
              updateSection={(idx, val) => updateSection(activeResultTab, idx, val)}
              review={v2Review[activeResultTab]}
              isPR={activeResultTab === 'pressrelease'}
              prFixed={prFixed}
              updatePrFixed={updatePrFixed}
              handleCopyAll={() => handleCopyAll(activeResultTab)}
              copyStatus={copyStatus === activeResultTab}
              onRegenerate={handleV2Generate}
            />
          )}

          {/* Export actions */}
          <div className="space-y-3">
            {/* PR-specific export buttons */}
            {isPRChannel && !v2HasRedIssues && (
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
            )}

            {/* Register / Red issues warning */}
            <div className="flex gap-2">
              <button onClick={resetAll} className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">새 콘텐츠 만들기</button>
              {v2HasRedIssues ? (
                <div className="flex-1 py-3 rounded-lg text-[13px] font-bold text-center text-danger bg-danger/5 border border-danger/20">
                  수정 후 내보내기 — 필수 수정 사항을 먼저 해결하세요
                </div>
              ) : (
                <button onClick={handleV2Register} disabled={registered}
                  className={`flex-1 py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                    registered ? 'bg-success text-white cursor-default' : 'bg-dark text-white hover:bg-charcoal'
                  }`}>
                  {registered ? '파이프라인에 등록 완료 ✓' : '파이프라인에 등록'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// V2 Sub-components
// =====================================================

function LoadingCard({ title, subtitle }) {
  return (
    <div className="bg-white rounded-xl p-8 border border-pale flex flex-col items-center gap-3">
      <span className="inline-block w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
      <div className="text-[14px] font-bold text-slate">{title}</div>
      <div className="text-[12px] text-mist">{subtitle}</div>
    </div>
  );
}

function CategorySelector({ value, onChange }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-steel mb-1.5">카테고리</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white cursor-pointer">
        {Object.entries(PR_CATEGORIES).map(([id, cat]) => (
          <option key={id} value={id}>{cat.icon} {cat.label}</option>
        ))}
      </select>
    </div>
  );
}

function FieldCard({ fieldDef, value, onChange }) {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className={`rounded-lg border p-3 transition-colors ${isEmpty ? 'border-pale bg-snow/50' : 'border-accent/20 bg-white'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-semibold text-steel">
          {fieldDef.label}
          {fieldDef.required && <span className="text-danger ml-1">*</span>}
        </label>
        {isEmpty && <span className="text-[10px] text-mist italic">(소스에 없음)</span>}
      </div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        rows={isEmpty ? 1 : 2}
        placeholder={isEmpty ? '소스에서 추출되지 않음 — 직접 입력 가능' : ''}
        className={`w-full px-3 py-2 rounded-lg border text-[12px] leading-[1.6] outline-none resize-none transition-colors ${
          isEmpty ? 'border-pale bg-snow text-mist focus:border-accent focus:text-slate' : 'border-pale bg-white text-slate focus:border-accent'
        }`}
      />
    </div>
  );
}

function ReviewSummaryV2({ v2Review, selectedChannels }) {
  if (!v2Review || Object.keys(v2Review).length === 0) return null;

  let totalCritical = 0;
  let totalWarning = 0;
  let totalChannels = 0;
  let passedChannels = 0;
  const factRatios = [];

  for (const ch of selectedChannels) {
    const review = v2Review[ch];
    if (!review) continue;
    totalChannels++;
    const critical = review.summary?.critical || review.issues?.filter((i) => i.severity === 'red').length || 0;
    const warning = review.summary?.warning || review.issues?.filter((i) => i.severity === 'yellow').length || 0;
    totalCritical += critical;
    totalWarning += warning;
    if (critical === 0 && warning === 0) passedChannels++;
    if (review.summary?.factRatio) {
      const ratio = review.summary.factRatio;
      const pct = parseInt(ratio) || 0;
      factRatios.push({
        ch,
        message: `팩트 비율: ${ratio}`,
        severity: pct < 50 ? 'red' : 'yellow',
      });
    }
  }

  if (totalChannels === 0) return null;
  const allPass = totalCritical === 0 && totalWarning === 0;

  return (
    <div className={`rounded-xl p-4 border ${
      totalCritical > 0 ? 'bg-danger/5 border-danger/20' : totalWarning > 0 ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'
    }`}>
      <div className="text-[12px] font-bold mb-2">AI 검수 결과 (v2)</div>
      <div className="flex items-center gap-4 text-[13px] flex-wrap">
        {totalCritical > 0 && <span className="font-bold text-danger">🔴 {totalCritical}건 (반드시 수정)</span>}
        {totalWarning > 0 && <span className="font-bold text-warning">🟡 {totalWarning}건 (확인 권장)</span>}
        {allPass && <span className="font-bold text-success">✅ 전체 통과 ({passedChannels}채널)</span>}
      </div>
      {factRatios.length > 0 && (
        <div className="mt-2 space-y-1">
          {factRatios.map((fr, i) => (
            <div key={i} className={`text-[12px] font-semibold ${fr.severity === 'red' ? 'text-danger' : 'text-warning'}`}>
              📊 {CHANNEL_CONFIGS[fr.ch]?.name}: {fr.message}
            </div>
          ))}
        </div>
      )}
      {totalCritical > 0 && (
        <div className="text-[11px] text-danger mt-2">🔴 필수 수정 사항이 있습니다. 수정 후 내보내기가 가능합니다.</div>
      )}
    </div>
  );
}

function V2EditorView({ channelId, sections, updateSection, review, isPR, prFixed, updatePrFixed, handleCopyAll, copyStatus, onRegenerate }) {
  const issues = review?.issues || [];
  const issuesBySection = {};
  issues.forEach((issue) => {
    const key = issue.section || '_general';
    if (!issuesBySection[key]) issuesBySection[key] = [];
    issuesBySection[key].push(issue);
  });

  return (
    <div className="bg-white rounded-xl border border-pale overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-bold">{CHANNEL_CONFIGS[channelId]?.name}</div>
          <button onClick={onRegenerate}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10">재생성</button>
        </div>

        {issuesBySection._general?.length > 0 && (
          <IssueAnnotations issues={issuesBySection._general} />
        )}

        <div className="text-[11px] font-semibold text-accent mb-1">AI 생성 영역</div>
        {sections.map((sec, idx) => (
          <div key={idx}>
            <SectionField label={sec.label} value={sec.text}
              onChange={(val) => updateSection(idx, val)}
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

        <button onClick={handleCopyAll}
          className={`w-full py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
            copyStatus ? 'bg-success text-white' : 'bg-dark text-white hover:bg-charcoal'
          }`}>
          {copyStatus ? '전체 복사 완료 ✓' : `전체 복사 — ${CHANNEL_CONFIGS[channelId]?.name}`}
        </button>
      </div>
    </div>
  );
}

// =====================================================
// Shared sub-components (preserved)
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
  const factRatios = [];

  for (const ch of selectedChannels) {
    const issues = reviewResults[ch];
    if (!issues) continue;
    totalChannels++;
    const reds = issues.filter((i) => i.severity === 'red').length;
    const yellows = issues.filter((i) => i.severity === 'yellow').length;
    totalRed += reds;
    totalYellow += yellows;
    if (reds === 0 && yellows === 0) passedChannels++;
    const factItem = issues.find((i) => i.category === '팩트 비율');
    if (factItem) factRatios.push({ ch, message: factItem.message, severity: factItem.severity });
  }

  if (totalChannels === 0) return null;

  const allPass = totalRed === 0 && totalYellow === 0;

  return (
    <div className={`rounded-xl p-4 border ${
      totalRed > 0 ? 'bg-danger/5 border-danger/20' : totalYellow > 0 ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'
    }`}>
      <div className="text-[12px] font-bold mb-2">AI 검수 결과</div>
      <div className="flex items-center gap-4 text-[13px] flex-wrap">
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
      {factRatios.length > 0 && (
        <div className="mt-2 space-y-1">
          {factRatios.map((fr, i) => (
            <div key={i} className={`text-[12px] font-semibold ${fr.severity === 'red' ? 'text-danger' : 'text-warning'}`}>
              📊 {fr.message}
            </div>
          ))}
        </div>
      )}
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
