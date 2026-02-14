import { useState } from "react";
import { PILLARS } from "../data/constants";
import { BRITZMEDI_CONTEXT, CHANNEL_CONFIGS, PILLAR_PRESETS } from "../data/factoryConfig";

export default function ContentFactory({ contents, setContents }) {
  const [step, setStep] = useState(1);
  const [pillar, setPillar] = useState("B1");
  const [topicId, setTopicId] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [selectedChannels, setSelectedChannels] = useState(["newsletter"]);
  const [extraContext, setExtraContext] = useState("");
  const [publishDate, setPublishDate] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState({});
  const [activeResultTab, setActiveResultTab] = useState("newsletter");

  const currentPillar = PILLAR_PRESETS[pillar];
  const selectedTopic = currentPillar?.topics.find((t) => t.id === topicId);

  const toggleChannel = (ch) => {
    setSelectedChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const buildPrompt = (channelKey) => {
    const channelConfig = CHANNEL_CONFIGS[channelKey];
    const topicPrompt = selectedTopic ? selectedTopic.prompt : customTopic;
    return `${BRITZMEDI_CONTEXT}

${channelConfig.formatPrompt}

---

## 지금 작성할 콘텐츠

**콘텐츠 필라**: ${PILLARS[pillar]}
**채널**: ${channelConfig.name}
**주제/방향**: ${topicPrompt}
${extraContext ? `**추가 참고사항**: ${extraContext}` : ""}

위의 회사 정보, 설문 데이터, 톤앤매너 가이드, 채널별 포맷 규칙을 모두 반영하여 바로 발행 가능한 수준의 완성본을 작성하세요. 반드시 포맷 규칙에 명시된 구조와 분량을 지켜주세요.`;
  };

  const generateContent = async () => {
    if (selectedChannels.length === 0) return;
    if (!selectedTopic && !customTopic.trim()) return;

    setIsGenerating(true);
    setResults({});
    setStep(2);

    for (const channelKey of selectedChannels) {
      try {
        const userPrompt = buildPrompt(channelKey);
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });
        const data = await response.json();
        const text = data.content?.map((item) => item.text || "").join("\n") || "응답을 받지 못했습니다.";
        setResults((prev) => ({ ...prev, [channelKey]: text }));
      } catch (err) {
        setResults((prev) => ({ ...prev, [channelKey]: `⚠️ 생성 오류: ${err.message}` }));
      }
    }

    setActiveResultTab(selectedChannels[0]);
    setIsGenerating(false);
  };

  const registerContent = () => {
    const title = selectedTopic ? selectedTopic.label : customTopic.slice(0, 50);
    const newContent = {
      id: Date.now(),
      title: `[${PILLARS[pillar]}] ${title}`,
      track: "B",
      pillar,
      status: "초안작성",
      channels: {
        blog: false,
        linkedin: false,
        instagram: false,
        newsletter: selectedChannels.includes("newsletter"),
        naver: selectedChannels.includes("naver"),
        kakao: selectedChannels.includes("kakao"),
      },
      createdAt: new Date().toISOString().split("T")[0],
      publishDate: publishDate || "",
      author: "AI+편집",
      notes: `AI 초안 생성 완료 (${selectedChannels.map((c) => CHANNEL_CONFIGS[c].name).join(", ")})`,
    };
    setContents((prev) => [...prev, newContent]);
  };

  const resetFactory = () => {
    setStep(1);
    setTopicId("");
    setCustomTopic("");
    setExtraContext("");
    setPublishDate("");
    setResults({});
  };

  if (step === 1) {
    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-5 text-white">
          <h2 className="text-xl font-bold">✨ 콘텐츠 팩토리</h2>
          <p className="text-orange-100 text-sm mt-1">주제와 채널만 선택하면 AI가 채널별 맞춤 완성본을 생성합니다</p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="bg-white/20 px-2 py-1 rounded">🧠 BRITZMEDI 컨텍스트 장착</span>
            <span className="bg-white/20 px-2 py-1 rounded">📊 설문 113명 데이터 내장</span>
            <span className="bg-white/20 px-2 py-1 rounded">📐 채널별 포맷 자동 적용</span>
          </div>
        </div>

        {/* STEP 1: 필라 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">STEP 1</span>
            <h3 className="font-bold text-gray-900">콘텐츠 필라 선택</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(PILLAR_PRESETS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => {
                  setPillar(key);
                  setTopicId("");
                }}
                className={`p-3 rounded-lg text-left text-sm border-2 transition ${
                  pillar === key ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-bold text-gray-900">{key}</div>
                <div className="text-gray-500 text-xs mt-0.5">{val.label}</div>
                <div className="text-gray-400 text-xs mt-0.5">{val.topics.length}개 주제</div>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2: 주제 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">STEP 2</span>
            <h3 className="font-bold text-gray-900">주제 선택</h3>
          </div>
          {currentPillar && (
            <div className="space-y-2 mb-4">
              {currentPillar.topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => {
                    setTopicId(topic.id);
                    setCustomTopic("");
                  }}
                  className={`w-full p-3 rounded-lg text-left border-2 transition ${
                    topicId === topic.id ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{topic.label}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{topic.prompt.slice(0, 80)}…</div>
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="absolute inset-x-0 top-0 flex items-center justify-center -mt-3">
              <span className="bg-white px-3 text-xs text-gray-400">또는 직접 입력</span>
            </div>
            <textarea
              value={customTopic}
              onChange={(e) => {
                setCustomTopic(e.target.value);
                setTopicId("");
              }}
              rows={2}
              placeholder="원하는 주제를 직접 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2 focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            />
          </div>
        </div>

        {/* STEP 3: 채널 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">STEP 3</span>
            <h3 className="font-bold text-gray-900">발행 채널 선택 (복수 가능)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(CHANNEL_CONFIGS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => toggleChannel(key)}
                className={`p-4 rounded-lg text-left border-2 transition ${
                  selectedChannels.includes(key)
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-bold text-sm">{config.name}</div>
                <div className="text-xs text-gray-500 mt-1">{config.description}</div>
                <div className="text-xs text-gray-400 mt-2">📏 {config.charTarget}</div>
                {selectedChannels.includes(key) && (
                  <div className="text-xs text-orange-600 font-bold mt-2">✓ 선택됨</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* STEP 4: 추가 설정 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">STEP 4</span>
            <h3 className="font-bold text-gray-900">추가 설정 (선택)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">발행 예정일</label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">추가 참고사항 / 소스</label>
              <input
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="특정 논문, 추가 데이터, 강조할 포인트 등"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={generateContent}
          disabled={selectedChannels.length === 0 || (!selectedTopic && !customTopic.trim())}
          className={`w-full py-4 rounded-xl text-base font-bold transition shadow-lg ${
            selectedChannels.length > 0 && (selectedTopic || customTopic.trim())
              ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {selectedChannels.length > 0 && (selectedTopic || customTopic.trim())
            ? `✨ ${selectedChannels.length}개 채널 콘텐츠 생성하기`
            : "주제와 채널을 선택해주세요"}
        </button>

        {/* AI 컨텍스트 미리보기 */}
        {(selectedTopic || customTopic.trim()) && selectedChannels.length > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <h4 className="text-xs font-bold text-gray-500 mb-2">🔍 AI에게 전달될 컨텍스트 미리보기</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>✅ BRITZMEDI 회사 정보 + TORR RF 제품 스펙</p>
              <p>✅ 113명 설문 핵심 데이터 7개 항목</p>
              <p>✅ 톤앤매너 가이드 (전문적+친근, 데이터 기반)</p>
              <p>
                ✅ 주제: <strong>{selectedTopic ? selectedTopic.label : customTopic.slice(0, 40)}</strong>
              </p>
              {selectedChannels.map((ch) => (
                <p key={ch}>
                  ✅ {CHANNEL_CONFIGS[ch].name} 포맷 규칙 ({CHANNEL_CONFIGS[ch].charTarget})
                </p>
              ))}
              {extraContext && <p>✅ 추가 참고: {extraContext}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 2: 생성 결과
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {isGenerating ? "⏳ AI 콘텐츠 생성 중..." : "✅ 콘텐츠 생성 완료"}
          </h2>
          <p className="text-sm text-gray-500">{selectedTopic ? selectedTopic.label : customTopic.slice(0, 40)}</p>
        </div>
        <button onClick={resetFactory} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
          ← 새로 만들기
        </button>
      </div>

      {isGenerating && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full" />
            <div>
              <p className="text-sm font-medium text-orange-700">
                {selectedChannels.length}개 채널 콘텐츠를 순차 생성 중...
              </p>
              <p className="text-xs text-orange-500 mt-0.5">채널별로 포맷·분량·톤이 모두 다르게 생성됩니다</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {selectedChannels.map((ch) => (
              <span
                key={ch}
                className={`text-xs px-2 py-1 rounded-full ${
                  results[ch] ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600 animate-pulse"
                }`}
              >
                {results[ch] ? "✅" : "⏳"} {CHANNEL_CONFIGS[ch].name}
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            {selectedChannels.map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveResultTab(ch)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeResultTab === ch
                    ? "bg-white text-orange-600 border-b-2 border-orange-500"
                    : "bg-gray-50 text-gray-500 hover:text-gray-700"
                }`}
              >
                {CHANNEL_CONFIGS[ch].name}
                {results[ch] && <span className="ml-1 text-green-500">✓</span>}
              </button>
            ))}
          </div>
          {results[activeResultTab] && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">{CHANNEL_CONFIGS[activeResultTab].outputLabel}</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-400">{CHANNEL_CONFIGS[activeResultTab].charTarget}</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-400">실제: {results[activeResultTab].length}자</span>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(results[activeResultTab])}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
                >
                  📋 복사
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 text-sm text-gray-700 whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">
                {results[activeResultTab]}
              </div>
            </div>
          )}
        </div>
      )}

      {!isGenerating && Object.keys(results).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-3">🚀 다음 단계</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={registerContent}
              className="p-3 rounded-lg bg-green-50 border-2 border-green-200 text-green-700 text-sm font-medium hover:bg-green-100 transition"
            >
              ✅ 파이프라인에 등록
              <span className="block text-xs text-green-500 mt-0.5">"초안작성" 상태로 추가</span>
            </button>
            <button
              onClick={resetFactory}
              className="p-3 rounded-lg bg-blue-50 border-2 border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
            >
              🔄 다시 생성하기
              <span className="block text-xs text-blue-500 mt-0.5">같은 주제, 다른 결과</span>
            </button>
            <button
              onClick={() => setStep(1)}
              className="p-3 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition"
            >
              ✨ 새 콘텐츠 만들기
              <span className="block text-xs text-gray-500 mt-0.5">다른 주제로 이동</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
