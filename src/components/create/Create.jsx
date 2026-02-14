import { useState } from 'react';
import { PILLAR_PRESETS, CHANNEL_CONFIGS } from '../../constants/prompts';
import { generateMultiChannel } from '../../lib/claude';

const STEPS = ['필라 선택', '주제 선택', '채널 선택', '추가 설정'];
const CHANNEL_IDS = Object.keys(CHANNEL_CONFIGS);

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
  const parts = [];
  for (const s of sections) {
    parts.push(`[${s.label}]\n${s.text}`);
  }
  parts.push(`[출처]\n${fixed.출처}`);
  parts.push(`[날짜]\n${fixed.날짜}`);
  parts.push(`[웹사이트]\n${fixed.웹사이트}`);
  parts.push(`[소셜 링크]\n${fixed.소셜링크}`);
  parts.push(`[연락처]\n담당자명: ${fixed.담당자명}\n직책: ${fixed.직책}\n이메일: ${fixed.이메일}\n전화번호: ${fixed.전화번호}`);
  return parts.join('\n\n');
}

// =====================================================
// Main Component
// =====================================================
export default function Create({ onAdd, apiKey, setApiKey }) {
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

  // Editable sections per channel: { channelId: [{ label, text }] }
  const [editedSections, setEditedSections] = useState({});
  // PR fixed fields
  const [prFixed, setPrFixed] = useState({ ...PR_FIXED_DEFAULTS });
  const [copyStatus, setCopyStatus] = useState('');

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

  const updatePrFixed = (key, val) => {
    setPrFixed((prev) => ({ ...prev, [key]: val }));
  };

  // --- Copy all ---
  const handleCopyAll = (ch) => {
    const sections = editedSections[ch];
    if (!sections) return;
    const text = ch === 'pressrelease' ? assemblePR(sections, prFixed) : assembleSections(sections);
    navigator.clipboard?.writeText(text);
    setCopyStatus(ch);
    setTimeout(() => setCopyStatus(''), 2000);
  };

  // --- Generate ---
  const handleGenerate = async () => {
    if (!apiKey) { setShowKey(true); return; }
    setLoading(true);
    setGenResults(null);
    setRegistered(false);
    setEditedSections({});
    setCopyStatus('');
    setPrFixed((prev) => ({ ...prev, 날짜: publishDate || new Date().toISOString().split('T')[0] }));
    try {
      const result = await generateMultiChannel({
        pillarId,
        topicPrompt: finalTopicPrompt,
        channels: selectedChannels,
        extraContext,
        apiKey,
      });
      setGenResults(result);
      setActiveResultTab(selectedChannels[0] || '');

      const parsed = {};
      for (const [ch, text] of Object.entries(result.results || {})) {
        parsed[ch] = parseSections(text);
      }
      setEditedSections(parsed);

      // Auto-register press release to pipeline as '초안작성'
      if (selectedChannels.includes('pressrelease') && result.results?.pressrelease) {
        const title = topic?.label || customTopic || `${pillar?.label} 보도자료`;
        onAdd({
          id: Date.now(),
          title,
          track: 'B',
          pillar: pillarId,
          stage: 'draft',
          channels: selectedChannels.reduce((acc, ch) => ({ ...acc, [ch]: false }), {}),
          date: publishDate || new Date().toISOString().split('T')[0],
          draft: { ...result.results },
        });
        setRegistered(true);
      }
    } catch (e) {
      setGenResults({ results: {}, errors: { _global: e.message } });
    } finally {
      setLoading(false);
    }
  };

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
        Object.entries(editedSections).map(([ch, secs]) => [
          ch,
          ch === 'pressrelease' ? assemblePR(secs, prFixed) : assembleSections(secs),
        ])
      ),
    });
    setRegistered(true);
  };

  const resetAll = () => {
    setStep(0);
    setPillarId('');
    setTopicId('');
    setCustomTopic('');
    setSelectedChannels([]);
    setPublishDate('');
    setExtraContext('');
    setGenResults(null);
    setActiveResultTab('');
    setRegistered(false);
    setEditedSections({});
    setPrFixed({ ...PR_FIXED_DEFAULTS });
    setCopyStatus('');
  };

  const toggleChannel = (ch) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">콘텐츠 팩토리</h2>
        {(step > 0 || genResults) && (
          <button onClick={resetAll} className="text-[12px] text-mist hover:text-steel border-none bg-transparent cursor-pointer">
            처음부터 다시
          </button>
        )}
      </div>

      {/* API Key */}
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

      {/* ========================= STEP 0: Pillar ========================= */}
      {!genResults && step === 0 && (
        <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
          <div>
            <div className="text-[13px] font-bold mb-1">콘텐츠 필라를 선택하세요</div>
            <div className="text-[11px] text-mist">어떤 카테고리의 콘텐츠를 만드시겠습니까?</div>
          </div>
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

      {/* ========================= STEP 1: Topic ========================= */}
      {!genResults && step === 1 && pillar && (
        <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
          <div>
            <div className="text-[13px] font-bold mb-1">{pillar.icon} {pillarId}: {pillar.label} — 주제 선택</div>
            <div className="text-[11px] text-mist">프리셋 주제를 선택하거나 직접 입력하세요</div>
          </div>
          <div className="space-y-2">
            {pillar.topics.map((t) => (
              <button key={t.id} onClick={() => setTopicId(t.id)}
                className={`w-full p-3.5 rounded-lg text-left border cursor-pointer transition-colors ${
                  topicId === t.id ? 'bg-dark text-white border-dark' : 'bg-white text-slate border-pale hover:bg-snow'
                }`}>
                <div className="text-[13px] font-medium">{t.label}</div>
                {t.prompt && (
                  <div className={`text-[11px] mt-1 leading-relaxed ${topicId === t.id ? 'text-silver' : 'text-mist'}`}>
                    {t.prompt.length > 80 ? t.prompt.slice(0, 80) + '...' : t.prompt}
                  </div>
                )}
              </button>
            ))}
          </div>
          {isCustomTopic && (
            <textarea value={customTopic} onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="원하는 주제, 키워드, 방향을 자유롭게 입력하세요" rows={3}
              className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-snow resize-none" />
          )}
          <StepNav step={step} setStep={setStep} canProceed={canProceed()} />
        </div>
      )}

      {/* ========================= STEP 2: Channels ========================= */}
      {!genResults && step === 2 && (
        <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
          <div>
            <div className="text-[13px] font-bold mb-1">발행 채널을 선택하세요 (복수 가능)</div>
            <div className="text-[11px] text-mist">채널마다 맞춤 포맷으로 각각 생성됩니다</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {CHANNEL_IDS.map((ch) => {
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

      {/* ========================= STEP 3: Settings ========================= */}
      {!genResults && step === 3 && (
        <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
          <div>
            <div className="text-[13px] font-bold mb-1">추가 설정</div>
            <div className="text-[11px] text-mist">발행일과 참고사항을 입력하세요 (선택)</div>
          </div>
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
            <textarea value={extraContext} onChange={(e) => setExtraContext(e.target.value)}
              placeholder="추가로 반영할 내용, URL, 특별 지시사항 등" rows={3}
              className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)}
              className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">이전</button>
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

      {/* ========================= RESULTS ========================= */}
      {genResults && (
        <div className="space-y-4">
          {genResults.errors?._global && (
            <div className="text-[13px] text-danger bg-danger/5 rounded-xl p-4 border border-danger/20">{genResults.errors._global}</div>
          )}

          {/* PR auto-register notice */}
          {registered && selectedChannels.includes('pressrelease') && (
            <div className="text-[12px] text-success bg-success/5 rounded-lg px-4 py-3 border border-success/20">
              보도자료가 파이프라인 "초안작성" 단계에 자동 등록되었습니다.
            </div>
          )}

          {selectedChannels.length > 0 && !genResults.errors?._global && (
            <>
              {/* Channel Tabs */}
              <div className="flex gap-1.5 overflow-x-auto">
                {selectedChannels.map((ch) => {
                  const cfg = CHANNEL_CONFIGS[ch];
                  const hasError = !!genResults.errors?.[ch];
                  return (
                    <button key={ch} onClick={() => { setActiveResultTab(ch); setCopyStatus(''); }}
                      className={`px-4 py-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
                        activeResultTab === ch
                          ? 'bg-dark text-white border-dark'
                          : hasError ? 'bg-danger/5 text-danger border-danger/20' : 'bg-white text-slate border-pale hover:bg-snow'
                      }`}>
                      {cfg.name} {hasError ? '⚠️' : '✓'}
                    </button>
                  );
                })}
              </div>

              {/* Active channel content */}
              {activeResultTab && (
                <div className="bg-white rounded-xl border border-pale overflow-hidden">
                  {genResults.errors?.[activeResultTab] ? (
                    <div className="p-5 text-[13px] text-danger">생성 실패: {genResults.errors[activeResultTab]}</div>
                  ) : editedSections[activeResultTab]?.length > 0 ? (
                    <div className="p-5 space-y-4">
                      {/* Top bar */}
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-bold">{CHANNEL_CONFIGS[activeResultTab]?.name}</div>
                        <div className="flex gap-2">
                          <button onClick={handleGenerate} disabled={loading}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10">
                            재생성
                          </button>
                        </div>
                      </div>

                      {/* AI-generated sections as textareas */}
                      <div className="text-[11px] font-semibold text-accent mb-1">AI 생성 영역</div>
                      {editedSections[activeResultTab].map((sec, idx) => (
                        <SectionField key={idx} label={sec.label} value={sec.text}
                          onChange={(val) => updateSection(activeResultTab, idx, val)}
                          rows={sec.label === '본문' || sec.label === '전체' ? 12 : sec.label.startsWith('본문') ? 8 : 3} />
                      ))}

                      {/* PR fixed fields */}
                      {activeResultTab === 'pressrelease' && (
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

                      {/* Copy All button */}
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

              {/* Bottom Actions */}
              <div className="flex gap-2">
                <button onClick={resetAll}
                  className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">
                  새 콘텐츠 만들기
                </button>
                {!selectedChannels.includes('pressrelease') && (
                  <button onClick={handleRegisterToPipeline} disabled={registered}
                    className={`flex-1 py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                      registered ? 'bg-success text-white cursor-default' : 'bg-dark text-white hover:bg-charcoal'
                    }`}>
                    {registered ? '파이프라인에 등록 완료 ✓' : '파이프라인에 등록'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// Sub-components
// =====================================================

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
      {step > 0 && (
        <button onClick={() => setStep(step - 1)}
          className="px-5 py-2.5 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">이전</button>
      )}
      <button onClick={() => canProceed && setStep(step + 1)} disabled={!canProceed}
        className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-colors ${
          canProceed ? 'bg-dark text-white hover:bg-charcoal' : 'bg-pale text-mist cursor-not-allowed'
        }`}>
        다음
      </button>
    </div>
  );
}
