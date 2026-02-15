import { useState, useMemo } from "react";

// ─── 초기 데이터 ───
const INITIAL_CONTENTS = [
  { id: 1, title: "RF 마이크로니들링 vs 전통 마이크로니들링: 임상 비교", track: "A", pillar: "A1", status: "발행완료", channels: { blog: true, linkedin: true, instagram: true, newsletter: false, naver: false, kakao: false }, createdAt: "2025-02-10", publishDate: "2025-02-24", author: "AI+편집", notes: "PubMed 기반 임상 비교" },
  { id: 2, title: "[설문 인사이트 #1] 113명이 말하는 피부과 선택의 진실", track: "B", pillar: "B1", status: "발행준비", channels: { blog: false, linkedin: false, instagram: false, newsletter: true, naver: true, kakao: true }, createdAt: "2025-02-10", publishDate: "2025-02-26", author: "AI+편집", notes: "1주차 뉴스레터" },
  { id: 3, title: "TORR RF: 차별화된 RF 기술의 과학적 근거", track: "A", pillar: "A2", status: "초안작성", channels: { blog: true, linkedin: true, instagram: true, newsletter: false, naver: false, kakao: false }, createdAt: "2025-02-12", publishDate: "2025-03-03", author: "AI+편집", notes: "TORR RF 딥다이브" },
  { id: 4, title: "[설문 #2] '효과없음' 27.4% — 이탈을 막는 커뮤니케이션 전략", track: "B", pillar: "B1", status: "아이디어", channels: { blog: false, linkedin: false, instagram: false, newsletter: true, naver: true, kakao: true }, createdAt: "2025-02-12", publishDate: "2025-03-05", author: "", notes: "2주차 뉴스레터" },
  { id: 5, title: "2025 아시아 미용의료기기 시장 트렌드", track: "A", pillar: "A3", status: "아이디어", channels: { blog: true, linkedin: true, instagram: false, newsletter: false, naver: false, kakao: false }, createdAt: "2025-02-13", publishDate: "2025-03-10", author: "", notes: "태국 중심" },
  { id: 6, title: "[설문 #3] 브랜드 58% vs 장비 4% — 숨겨진 구매 심리", track: "B", pillar: "B1", status: "아이디어", channels: { blog: false, linkedin: false, instagram: false, newsletter: true, naver: true, kakao: true }, createdAt: "2025-02-13", publishDate: "2025-03-12", author: "", notes: "3주차 뉴스레터" },
  { id: 7, title: "RF 에너지 전달 깊이와 콜라겐 리모델링 메커니즘", track: "A", pillar: "A1", status: "아이디어", channels: { blog: true, linkedin: true, instagram: true, newsletter: false, naver: false, kakao: false }, createdAt: "2025-02-14", publishDate: "2025-03-17", author: "", notes: "PubMed 논문 기반" },
  { id: 8, title: "[설문 #4] 부작용 불안 37.2% — 신뢰를 만드는 콘텐츠 전략", track: "B", pillar: "B1", status: "아이디어", channels: { blog: false, linkedin: false, instagram: false, newsletter: true, naver: true, kakao: true }, createdAt: "2025-02-14", publishDate: "2025-03-19", author: "", notes: "4주차 뉴스레터" },
  { id: 9, title: "Before & After: TORR RF 시술 결과 비주얼 가이드", track: "A", pillar: "A4", status: "아이디어", channels: { blog: true, linkedin: false, instagram: true, newsletter: false, naver: false, kakao: false }, createdAt: "2025-02-14", publishDate: "2025-03-24", author: "", notes: "비주얼 중심" },
  { id: 10, title: "[설문 #5] 추천율 70.8%를 매출로 전환하는 액션플랜", track: "B", pillar: "B1", status: "아이디어", channels: { blog: false, linkedin: false, instagram: false, newsletter: true, naver: true, kakao: true }, createdAt: "2025-02-14", publishDate: "2025-03-26", author: "", notes: "5주차 최종 뉴스레터" },
  { id: 11, title: "의료기기 광고 심의 가이드: 2025 주요 변경사항", track: "B", pillar: "B3", status: "아이디어", channels: { blog: false, linkedin: false, instagram: false, newsletter: false, naver: true, kakao: true }, createdAt: "2025-02-14", publishDate: "2025-03-28", author: "", notes: "MADMEDCHECK 연계" },
  { id: 12, title: "Southeast Asia Aesthetic Market Entry Guide 2025", track: "A", pillar: "A3", status: "아이디어", channels: { blog: true, linkedin: true, instagram: false, newsletter: false, naver: false, kakao: false }, createdAt: "2025-02-14", publishDate: "2025-03-31", author: "", notes: "동남아 시장 진출 가이드" }
];

const STATUSES = ["아이디어", "초안작성", "검토편집", "발행준비", "발행완료"];
const STATUS_EMOJI = { "아이디어": "💭", "초안작성": "✍️", "검토편집": "👀", "발행준비": "✅", "발행완료": "🚀" };
const STATUS_COLORS = { "아이디어": "bg-gray-100 text-gray-700", "초안작성": "bg-blue-100 text-blue-700", "검토편집": "bg-yellow-100 text-yellow-700", "발행준비": "bg-green-100 text-green-700", "발행완료": "bg-purple-100 text-purple-700" };

const PILLARS = {
  A1: "Science/임상", A2: "Product/TORR RF", A3: "Market/시장", A4: "Visual/비주얼",
  B1: "설문 뉴스레터", B2: "시장 트렌드", B3: "규제/심의", B4: "원장님 팁", B5: "MADMEDCHECK", B6: "성공사례"
};

const CHANNELS = [
  { key: "blog", label: "블로그", track: "A" },
  { key: "linkedin", label: "LinkedIn", track: "A" },
  { key: "instagram", label: "Instagram", track: "A" },
  { key: "newsletter", label: "뉴스레터", track: "B" },
  { key: "naver", label: "네이버", track: "B" },
  { key: "kakao", label: "카카오톡", track: "B" }
];

const formatDate = (d) => { if (!d) return ""; const date = new Date(d); return `${date.getMonth() + 1}/${date.getDate()}`; };
const getDaysUntil = (d) => { const t = new Date(d); const today = new Date(); t.setHours(0,0,0,0); today.setHours(0,0,0,0); return Math.ceil((t - today) / 86400000); };

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>{STATUS_EMOJI[status]} {status}</span>
);
const TrackBadge = ({ track }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${track === "A" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"}`}>{track === "A" ? "🌏 A" : "🇰🇷 B"}</span>
);

// ═══════════════════════════════════════════
// 콘텐츠 팩토리 - AI 시스템 프롬프트 & 채널 설정
// ═══════════════════════════════════════════

const BRITZMEDI_CONTEXT = `
## BRITZMEDI 회사 정보
- 회사: BRITZMEDI (브릿츠메디) — 한국 기반 미용의료기기 제조/수출 기업
- 주력 제품: TORR RF (토르 알에프) — RF 마이크로니들링 의료기기
- TORR RF 핵심 차별점: 비절연 니들 + 독자적 RF 에너지 전달 기술, 콜라겐 리모델링 극대화, 다운타임 최소화
- 타겟 시장: 국내 피부과/에스테틱 + 해외(동남아, 중동) 수출

## 113명 소비자 설문조사 핵심 데이터
- 이탈 1위: "효과없음" 27.4% ↔ 재방문 1위: "효과확실" 38.1% → 효과 입증이 핵심
- 브랜드 영향: 58.4% → 그런데 장비 선택 기준은 4.4%에 불과 → 브랜드와 장비 사이의 인식 갭 존재
- 피부과 선택 3강: 가성비 24.8% / 전문성 23.9% / 후기 20.4%
- 부작용 불안: 37.2% → 가장 큰 심리적 장벽
- 추천 경험: 70.8% → 추천율 높지만 체계적 추천 프로그램은 부재
- 정보채널 1위: 지인추천 48.7% / 온라인후기 33.6%
- 시술 빈도: 월 1회 이상 41.6% → 꽤 높은 재방문율

## 톤앤매너 가이드
- 대상: 국내 피부과 원장님, 디스트리뷰터, 의료기기 관계자
- 톤: 전문적이되 친근한, 데이터 기반, "동료 전문가가 인사이트를 공유하는" 느낌
- 절대 하지 말 것: 과장 광고, 의학적 효능 단정, 비교 광고, 환자 대상 언어
- 반드시 할 것: 출처/데이터 명시, 액셔너블한 인사이트, 원장님이 바로 활용 가능한 팁
`.trim();

const CHANNEL_CONFIGS = {
  newsletter: {
    name: "📧 이메일 뉴스레터",
    description: "Track B 핵심 채널. 피부과 원장님 대상 데이터 기반 인사이트 뉴스레터.",
    formatPrompt: `
## 이메일 뉴스레터 포맷 규칙

### 구조 (반드시 이 순서로):
1. **제목**: 숫자 또는 충격적 데이터가 포함된 제목 (50자 이내)
2. **프리헤더**: 이메일 미리보기 텍스트 (80자 이내)
3. **인트로**: 2~3문장으로 "왜 이걸 읽어야 하는지" — 데이터로 시작
4. **본문 섹션 3~4개**: 각 섹션은 소제목 + 핵심 데이터 + 인사이트 + 원장님 액션팁
5. **핵심 요약 박스**: 3줄 이내 불릿포인트
6. **CTA (Call to Action)**: 다음 뉴스레터 예고 또는 회신 유도

### 작성 규칙:
- 총 분량: 1500~2000자
- 각 섹션에 반드시 1개 이상의 구체적 숫자/데이터 포함
- 스캔하기 쉽게: 짧은 문단, 볼드 강조, 이모지 적절히 활용
- 마지막에 "이 내용이 도움되셨나요? 답장으로 의견 들려주세요" 류의 피드백 유도
- [이미지 삽입 위치]를 본문 중 2~3곳에 표시하고, 어떤 이미지가 들어가면 좋을지 설명
    `.trim(),
    outputLabel: "뉴스레터 원고",
    charTarget: "1,500~2,000자"
  },
  naver: {
    name: "📗 네이버 블로그",
    description: "Track B SEO 채널. 검색 유입 + 전문성 어필.",
    formatPrompt: `
## 네이버 블로그 포맷 규칙

### 구조 (반드시 이 순서로):
1. **제목**: 네이버 SEO 최적화 제목 — 핵심 키워드 앞배치 (40자 이내)
2. **도입부**: 공감형 질문 또는 충격 데이터로 시작 (3~4줄)
3. **본문**: 소제목 3~5개로 구분된 정보 밀도 높은 글
4. **각 소제목 아래**: 데이터/근거 → 인사이트 → 실전 적용 팁 구조
5. **이미지 가이드**: 각 소제목 사이에 [이미지: 설명] 형태로 삽입 위치 + 이미지 설명
6. **마무리**: 핵심 요약 + "더 알고 싶으시다면" CTA
7. **태그 추천**: 네이버 블로그 태그 10개

### 작성 규칙:
- 총 분량: 2000~3000자
- SEO 키워드를 제목, 도입부, 소제목에 자연스럽게 배치
- 문단은 3~4줄 이내로 짧게
- 전문 용어는 괄호로 쉬운 설명 병기 예: "RF 마이크로니들링(고주파 미세침 시술)"
- [이미지: 설명] 최소 4곳 삽입 — 어떤 시각 자료가 들어가야 하는지 구체적으로 서술
- 마지막에 이미지 프롬프트 섹션: Canva 또는 AI 이미지 도구용 프롬프트 3개 제공
    `.trim(),
    outputLabel: "네이버 블로그 원고",
    charTarget: "2,000~3,000자"
  },
  kakao: {
    name: "💬 카카오톡 채널",
    description: "Track B 모바일 채널. 짧고 임팩트 있는 카드뉴스 텍스트.",
    formatPrompt: `
## 카카오톡 카드뉴스 포맷 규칙

### 구조 (카드 6~8장):
- **카드 1 (표지)**: 충격적 숫자 또는 질문 — 한 줄 (20자 이내)
- **카드 2~6 (본문)**: 각 카드당 핵심 메시지 1개
- **카드 7 (요약)**: 핵심 3줄 정리
- **카드 8 (CTA)**: 행동 유도 — "뉴스레터 구독하기" 또는 "자세한 내용은 블로그에서"

### 각 카드 형식:
카드 N: [제목]
- 메인 텍스트: (40~60자)
- 강조 숫자/문구: (볼드 처리할 핵심)
- [이미지 가이드: 어떤 비주얼이 들어가야 하는지]

### 작성 규칙:
- 카드당 텍스트 최대 80자 (모바일에서 한 눈에 읽히는 분량)
- 모든 카드에 숫자 또는 데이터 1개 이상 포함
- 이모지 적극 활용
- 전문 용어 최소화 — 원장님이 환자에게 보여줄 수도 있는 톤
- 마지막에 이미지 프롬프트 섹션: 각 카드별 Canva/AI 이미지 프롬프트 제공
    `.trim(),
    outputLabel: "카드뉴스 텍스트",
    charTarget: "카드 6~8장 (장당 40~80자)"
  }
};

// 필라별 주제 프리셋
const PILLAR_PRESETS = {
  B1: {
    label: "설문 뉴스레터",
    topics: [
      { id: "b1-1", label: "충격 데이터 5선 (1주차)", prompt: "113명 설문 결과 중 가장 충격적인 데이터 5개를 선별하여 피부과 원장님이 놀랄만한 인사이트로 전달. 이탈율 27.4%, 브랜드 영향 58.4% vs 장비 4.4%, 부작용 불안 37.2%, 추천율 70.8%, 가성비 24.8% 데이터를 활용." },
      { id: "b1-2", label: "이탈 원인 분석 (2주차)", prompt: "효과없음 27.4% 이탈 데이터 심층 분석. 효과없음 이탈 vs 효과확실 38.1% 재방문의 미러링 효과. 원장님이 환자 커뮤니케이션에서 '효과 체감'을 높이는 구체적 전략 제시." },
      { id: "b1-3", label: "브랜드 vs 장비 인식 갭 (3주차)", prompt: "브랜드 영향 58.4% vs 장비 선택 기준 4.4%의 거대한 갭 분석. 환자는 '어떤 장비'보다 '어떤 병원'으로 선택한다는 인사이트. 원장님 브랜딩 전략에 주는 시사점." },
      { id: "b1-4", label: "부작용 불안 해소 전략 (4주차)", prompt: "부작용 불안 37.2% — 환자의 가장 큰 심리적 장벽 분석. 불안을 줄이는 사전 커뮤니케이션, 동의서 설명법, 시술 후 팔로업 전략. 신뢰 구축 실전 팁." },
      { id: "b1-5", label: "추천율 70.8% 전환 전략 (5주차)", prompt: "추천 경험 70.8%, 지인추천 정보채널 1위 48.7% 데이터 활용. 높은 추천율을 체계적 매출로 전환하는 추천 프로그램 설계, 리뷰 관리, 소개 이벤트 액션플랜." }
    ]
  },
  B2: { label: "시장 트렌드", topics: [
    { id: "b2-1", label: "2025 국내 에스테틱 시장 전망", prompt: "2025년 국내 피부과/에스테틱 시장의 주요 트렌드 분석. RF 시술 수요 증가, 비침습 시술 선호도, 장비 투자 트렌드를 다루되 원장님이 사업 전략에 바로 반영할 수 있는 인사이트 중심으로." },
    { id: "b2-2", label: "RF 마이크로니들링 시장 동향", prompt: "RF 마이크로니들링 시장의 최신 동향. 기존 레이저 대비 장점, 환자 선호도 변화, 신규 장비 트렌드. TORR RF의 비절연 니들 기술 우위를 자연스럽게 포지셔닝." }
  ]},
  B3: { label: "규제/심의", topics: [
    { id: "b3-1", label: "2025 의료기기 광고 심의 변경사항", prompt: "2025년 의료기기 광고 규제/심의 주요 변경사항 정리. 원장님이 블로그, SNS, 원내 광고에서 주의해야 할 점. MADMEDCHECK 서비스 자연스럽게 소개." },
    { id: "b3-2", label: "피부과 온라인 마케팅 주의사항", prompt: "피부과 온라인 마케팅(블로그, 인스타, 카카오)에서 자주 적발되는 광고 위반 사례와 예방법. 실제 심의 사례 기반 실전 가이드." }
  ]},
  B4: { label: "원장님 팁", topics: [
    { id: "b4-1", label: "환자 재방문율 높이는 5가지 전략", prompt: "113명 설문 데이터 기반 환자 재방문율을 높이는 실전 전략 5가지. 효과 체감 극대화, 커뮤니케이션, 팔로업, 후기 관리, 가격 전략. 데이터 근거와 함께 바로 실행 가능한 팁." },
    { id: "b4-2", label: "신규 장비 도입 의사결정 가이드", prompt: "신규 미용의료기기 도입 시 고려해야 할 체크리스트. ROI 계산법, 환자 수요 예측, 경쟁원 분석, 교육/AS 조건. RF 마이크로니들링(TORR RF) 도입 시나리오를 예시로 활용." }
  ]},
  B5: { label: "MADMEDCHECK", topics: [
    { id: "b5-1", label: "AI 광고 심의 자동 체크 소개", prompt: "MADMEDCHECK — AI 기반 의료 광고 심의 자동 체크 서비스 소개. 156개 위반 패턴 자동 감지, 블로그/SNS/원내 광고 검수. 원장님이 광고 심의 걱정 없이 마케팅할 수 있는 방법." }
  ]},
  B6: { label: "성공사례", topics: [
    { id: "b6-1", label: "TORR RF 도입 성공사례", prompt: "TORR RF를 도입한 피부과의 성공 사례. 도입 전후 환자 만족도, 재방문율, 매출 변화. (참고: 실제 사례가 없으면 시나리오 기반으로 작성하되 명시할 것)" }
  ]}
};

// ═══════════════════════════════════════════
// 콘텐츠 팩토리 컴포넌트
// ═══════════════════════════════════════════

const ContentFactory = ({ contents, setContents }) => {
  const [step, setStep] = useState(1); // 1: 설정, 2: 생성중/결과
  const [pillar, setPillar] = useState("B1");
  const [topicId, setTopicId] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [selectedChannels, setSelectedChannels] = useState(["newsletter"]);
  const [extraContext, setExtraContext] = useState("");
  const [publishDate, setPublishDate] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState({}); // { newsletter: "...", naver: "...", kakao: "..." }
  const [activeResultTab, setActiveResultTab] = useState("newsletter");
  const [error, setError] = useState("");

  const currentPillar = PILLAR_PRESETS[pillar];
  const selectedTopic = currentPillar?.topics.find(t => t.id === topicId);

  const toggleChannel = (ch) => {
    setSelectedChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
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
    setError("");
    setStep(2);

    const newResults = {};

    for (const channelKey of selectedChannels) {
      try {
        const userPrompt = buildPrompt(channelKey);
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            messages: [{ role: "user", content: userPrompt }]
          })
        });

        const data = await response.json();
        const text = data.content?.map(item => item.text || "").join("\n") || "응답을 받지 못했습니다.";
        newResults[channelKey] = text;
        setResults(prev => ({ ...prev, [channelKey]: text }));
      } catch (err) {
        newResults[channelKey] = `⚠️ 생성 오류: ${err.message}`;
        setResults(prev => ({ ...prev, [channelKey]: `⚠️ 생성 오류: ${err.message}` }));
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
        blog: false, linkedin: false, instagram: false,
        newsletter: selectedChannels.includes("newsletter"),
        naver: selectedChannels.includes("naver"),
        kakao: selectedChannels.includes("kakao")
      },
      createdAt: new Date().toISOString().split("T")[0],
      publishDate: publishDate || "",
      author: "AI+편집",
      notes: `AI 초안 생성 완료 (${selectedChannels.map(c => CHANNEL_CONFIGS[c].name).join(", ")})`
    };
    setContents(prev => [...prev, newContent]);
  };

  const resetFactory = () => {
    setStep(1);
    setTopicId("");
    setCustomTopic("");
    setExtraContext("");
    setPublishDate("");
    setResults({});
    setError("");
  };

  // ─── Step 1: 설정 ───
  if (step === 1) {
    return (
      <div className="space-y-5">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-5 text-white">
          <h2 className="text-xl font-bold">✨ 콘텐츠 팩토리</h2>
          <p className="text-orange-100 text-sm mt-1">주제와 채널만 선택하면 AI가 채널별 맞춤 완성본을 생성합니다</p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="bg-white/20 px-2 py-1 rounded">🧠 BRITZMEDI 컨텍스트 장착</span>
            <span className="bg-white/20 px-2 py-1 rounded">📊 설문 113명 데이터 내장</span>
            <span className="bg-white/20 px-2 py-1 rounded">📐 채널별 포맷 자동 적용</span>
          </div>
        </div>

        {/* Step 1: 콘텐츠 필라 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">STEP 1</span>
            <h3 className="font-bold text-gray-900">콘텐츠 필라 선택</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(PILLAR_PRESETS).map(([key, val]) => (
              <button key={key} onClick={() => { setPillar(key); setTopicId(""); }}
                className={`p-3 rounded-lg text-left text-sm border-2 transition ${pillar === key ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className="font-bold text-gray-900">{key}</div>
                <div className="text-gray-500 text-xs mt-0.5">{val.label}</div>
                <div className="text-gray-400 text-xs mt-0.5">{val.topics.length}개 주제</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: 주제 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">STEP 2</span>
            <h3 className="font-bold text-gray-900">주제 선택</h3>
          </div>

          {currentPillar && (
            <div className="space-y-2 mb-4">
              {currentPillar.topics.map(topic => (
                <button key={topic.id} onClick={() => { setTopicId(topic.id); setCustomTopic(""); }}
                  className={`w-full p-3 rounded-lg text-left border-2 transition ${topicId === topic.id ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
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
            <textarea value={customTopic}
              onChange={e => { setCustomTopic(e.target.value); setTopicId(""); }}
              rows={2} placeholder="원하는 주제를 직접 입력하세요 (예: TORR RF의 비절연 니들 기술 장점을 원장님 관점에서 설명하는 글)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2 focus:ring-2 focus:ring-orange-300 focus:border-orange-300" />
          </div>
        </div>

        {/* Step 3: 채널 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">STEP 3</span>
            <h3 className="font-bold text-gray-900">발행 채널 선택 (복수 가능)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(CHANNEL_CONFIGS).map(([key, config]) => (
              <button key={key} onClick={() => toggleChannel(key)}
                className={`p-4 rounded-lg text-left border-2 transition ${selectedChannels.includes(key) ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
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

        {/* Step 4: 추가 설정 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">STEP 4</span>
            <h3 className="font-bold text-gray-900">추가 설정 (선택)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">발행 예정일</label>
              <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">추가 참고사항 / 소스</label>
              <input value={extraContext} onChange={e => setExtraContext(e.target.value)}
                placeholder="특정 논문, 추가 데이터, 강조할 포인트 등"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* 생성 버튼 */}
        <button onClick={generateContent}
          disabled={selectedChannels.length === 0 || (!selectedTopic && !customTopic.trim())}
          className={`w-full py-4 rounded-xl text-base font-bold transition shadow-lg ${
            selectedChannels.length > 0 && (selectedTopic || customTopic.trim())
              ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}>
          {selectedChannels.length > 0 && (selectedTopic || customTopic.trim())
            ? `✨ ${selectedChannels.length}개 채널 콘텐츠 생성하기`
            : "주제와 채널을 선택해주세요"}
        </button>

        {/* 프리뷰: AI에게 전달될 정보 */}
        {(selectedTopic || customTopic.trim()) && selectedChannels.length > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <h4 className="text-xs font-bold text-gray-500 mb-2">🔍 AI에게 전달될 컨텍스트 미리보기</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>✅ BRITZMEDI 회사 정보 + TORR RF 제품 스펙</p>
              <p>✅ 113명 설문 핵심 데이터 7개 항목</p>
              <p>✅ 톤앤매너 가이드 (전문적+친근, 데이터 기반)</p>
              <p>✅ 주제: <strong>{selectedTopic ? selectedTopic.label : customTopic.slice(0, 40)}</strong></p>
              {selectedChannels.map(ch => (
                <p key={ch}>✅ {CHANNEL_CONFIGS[ch].name} 포맷 규칙 ({CHANNEL_CONFIGS[ch].charTarget})</p>
              ))}
              {extraContext && <p>✅ 추가 참고: {extraContext}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Step 2: 생성 결과 ───
  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {isGenerating ? "⏳ AI 콘텐츠 생성 중..." : "✅ 콘텐츠 생성 완료"}
          </h2>
          <p className="text-sm text-gray-500">
            {selectedTopic ? selectedTopic.label : customTopic.slice(0, 40)}
          </p>
        </div>
        <button onClick={resetFactory}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
          ← 새로 만들기
        </button>
      </div>

      {/* 생성 진행 상태 */}
      {isGenerating && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full" />
            <div>
              <p className="text-sm font-medium text-orange-700">
                {selectedChannels.length}개 채널 콘텐츠를 순차 생성 중...
              </p>
              <p className="text-xs text-orange-500 mt-0.5">
                채널별로 포맷·분량·톤이 모두 다르게 생성됩니다
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {selectedChannels.map(ch => (
              <span key={ch} className={`text-xs px-2 py-1 rounded-full ${results[ch] ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600 animate-pulse"}`}>
                {results[ch] ? "✅" : "⏳"} {CHANNEL_CONFIGS[ch].name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 채널 탭 + 결과 */}
      {Object.keys(results).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 채널 탭 */}
          <div className="flex border-b border-gray-200">
            {selectedChannels.map(ch => (
              <button key={ch} onClick={() => setActiveResultTab(ch)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeResultTab === ch ? "bg-white text-orange-600 border-b-2 border-orange-500" : "bg-gray-50 text-gray-500 hover:text-gray-700"}`}>
                {CHANNEL_CONFIGS[ch].name}
                {results[ch] && <span className="ml-1 text-green-500">✓</span>}
              </button>
            ))}
          </div>

          {/* 결과 콘텐츠 */}
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
                <button onClick={() => navigator.clipboard?.writeText(results[activeResultTab])}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">
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

      {/* 등록 + 액션 */}
      {!isGenerating && Object.keys(results).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-3">🚀 다음 단계</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={() => { registerContent(); }}
              className="p-3 rounded-lg bg-green-50 border-2 border-green-200 text-green-700 text-sm font-medium hover:bg-green-100 transition">
              ✅ 파이프라인에 등록
              <span className="block text-xs text-green-500 mt-0.5">"초안작성" 상태로 추가</span>
            </button>
            <button onClick={resetFactory}
              className="p-3 rounded-lg bg-blue-50 border-2 border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition">
              🔄 다시 생성하기
              <span className="block text-xs text-blue-500 mt-0.5">같은 주제, 다른 결과</span>
            </button>
            <button onClick={() => { setStep(1); }}
              className="p-3 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition">
              ✨ 새 콘텐츠 만들기
              <span className="block text-xs text-gray-500 mt-0.5">다른 주제로 이동</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════
// 나머지 컴포넌트들 (대시보드, 캘린더, 파이프라인, 발행관리)
// ═══════════════════════════════════════════

const Dashboard = ({ contents, setActiveTab }) => {
  const stats = useMemo(() => {
    const byStatus = {};
    STATUSES.forEach(s => byStatus[s] = contents.filter(c => c.status === s).length);
    const upcoming = contents.filter(c => c.status !== "발행완료" && c.publishDate).sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate)).slice(0, 5);
    return { byStatus, trackA: contents.filter(c => c.track === "A").length, trackB: contents.filter(c => c.track === "B").length, total: contents.length, upcoming };
  }, [contents]);
  const dDay = getDaysUntil("2025-02-23");

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium">BRITZMEDI 콘텐츠 발행 D-Day</p>
            <p className="text-3xl font-bold mt-1">2월 23일 (일)</p>
            <p className="text-indigo-200 mt-1">Track A 블로그 + Track B 뉴스레터 동시 런칭</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black">{dDay > 0 ? `D-${dDay}` : dDay === 0 ? "D-DAY!" : `D+${Math.abs(dDay)}`}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "전체", val: stats.total, color: "text-gray-900" },
          { label: "🌏 Track A", val: stats.trackA, color: "text-indigo-600" },
          { label: "🇰🇷 Track B", val: stats.trackB, color: "text-orange-600" },
          { label: "🚀 발행완료", val: stats.byStatus["발행완료"], color: "text-green-600" }
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.val}건</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4">📊 파이프라인</h3>
        <div className="flex gap-2">
          {STATUSES.map(s => (
            <div key={s} className="flex-1 text-center">
              <div className="text-2xl font-bold">{stats.byStatus[s]}</div>
              <div className="text-xs text-gray-500 mt-1">{STATUS_EMOJI[s]} {s}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">📅 다가오는 콘텐츠</h3>
          <button onClick={() => setActiveTab("calendar")} className="text-indigo-600 text-sm hover:underline">전체 보기 →</button>
        </div>
        <div className="space-y-3">
          {stats.upcoming.map(c => {
            const days = getDaysUntil(c.publishDate);
            return (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className={`w-1 h-10 rounded-full ${c.track === "A" ? "bg-indigo-500" : "bg-orange-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1"><TrackBadge track={c.track} /><StatusBadge status={c.status} /></div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-700">{formatDate(c.publishDate)}</p>
                  <p className={`text-xs ${days <= 3 ? "text-red-500 font-bold" : "text-gray-400"}`}>{days > 0 ? `${days}일 후` : "오늘!"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Calendar = ({ contents }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 1));
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, date: dateStr, contents: contents.filter(c => c.publishDate === dateStr) });
    }
    return days;
  }, [currentMonth, contents]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">◀</button>
        <h3 className="font-bold text-lg">{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</h3>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["일","월","화","수","목","금","토"].map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>)}
        {calendarData.map((cell, i) => (
          <div key={i} className={`min-h-[80px] p-1 rounded-lg border ${cell ? "border-gray-100" : "border-transparent"} ${cell?.date === "2025-02-23" ? "bg-red-50 border-red-300 ring-2 ring-red-200" : ""}`}>
            {cell && (<>
              <div className={`text-xs font-medium mb-1 ${cell.date === "2025-02-23" ? "text-red-600 font-bold" : "text-gray-500"}`}>
                {cell.day}{cell.date === "2025-02-23" && <span className="ml-1 text-[10px]">D-DAY</span>}
              </div>
              {cell.contents.map(c => <div key={c.id} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${c.track === "A" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"}`}>{c.title.slice(0, 15)}…</div>)}
            </>)}
          </div>
        ))}
      </div>
    </div>
  );
};

const Pipeline = ({ contents, setContents }) => {
  const moveStatus = (id, s) => setContents(prev => prev.map(c => c.id === id ? { ...c, status: s } : c));
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map(status => {
        const items = contents.filter(c => c.status === status);
        return (
          <div key={status} className="flex-shrink-0 w-64 bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-gray-700">{STATUS_EMOJI[status]} {status}</h4>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map(c => (
                <div key={c.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <TrackBadge track={c.track} />
                  <p className="text-sm font-medium text-gray-900 mt-2 line-clamp-2">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{PILLARS[c.pillar]} · {formatDate(c.publishDate)}</p>
                  <div className="flex gap-1 mt-2">
                    {STATUSES.map((s, idx) => {
                      const ci = STATUSES.indexOf(status);
                      if (idx !== ci + 1 && idx !== ci - 1) return null;
                      return <button key={s} onClick={() => moveStatus(c.id, s)} className={`text-[10px] px-2 py-1 rounded ${idx === ci + 1 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>{idx === ci + 1 ? `→ ${s}` : `← ${s}`}</button>;
                    })}
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">비어있음</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Publishing = ({ contents, setContents }) => {
  const [filter, setFilter] = useState("all");
  const toggleChannel = (id, ch) => setContents(prev => prev.map(c => c.id === id ? { ...c, channels: { ...c.channels, [ch]: !c.channels[ch] } } : c));
  const filtered = filter === "all" ? contents : contents.filter(c => c.track === filter);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <h3 className="font-bold text-gray-900">📢 발행 관리</h3>
        <div className="ml-auto flex gap-1">
          {[["all","전체"],["A","Track A"],["B","Track B"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1 rounded-lg text-xs font-medium ${filter === v ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-500">콘텐츠</th>
              <th className="text-center px-2 py-3 text-xs text-gray-500">상태</th>
              <th className="text-center px-2 py-3 text-xs text-gray-500">발행일</th>
              {CHANNELS.filter(ch => filter === "all" || ch.track === filter).map(ch => (
                <th key={ch.key} className="text-center px-2 py-3 text-xs text-gray-500">{ch.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate)).map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><TrackBadge track={c.track} /><span className="text-sm truncate max-w-xs">{c.title}</span></div></td>
                <td className="text-center px-2 py-3"><StatusBadge status={c.status} /></td>
                <td className="text-center px-2 py-3 text-xs text-gray-500">{formatDate(c.publishDate)}</td>
                {CHANNELS.filter(ch => filter === "all" || ch.track === filter).map(ch => (
                  <td key={ch.key} className="text-center px-2 py-3">
                    <button onClick={() => toggleChannel(c.id, ch.key)} className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${c.channels[ch.key] ? "bg-green-500 border-green-500 text-white" : "border-gray-300 text-transparent"}`}>✓</button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════
// 메인 앱
// ═══════════════════════════════════════════

export default function ContentOpsApp() {
  const [contents, setContents] = useState(INITIAL_CONTENTS);
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", label: "📊 대시보드" },
    { id: "calendar", label: "📅 캘린더" },
    { id: "pipeline", label: "🔄 파이프라인" },
    { id: "publishing", label: "📢 발행관리" },
    { id: "factory", label: "✨ 콘텐츠 팩토리" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">BRITZMEDI Content Ops</h1>
              <p className="text-xs text-gray-500">2트랙 콘텐츠 운영 시스템</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">콘텐츠 {contents.length}건</p>
              <p className="text-xs font-bold text-indigo-600">D-{Math.max(0, getDaysUntil("2025-02-23"))}</p>
            </div>
          </div>
          <nav className="flex gap-1 mt-3 -mb-px overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition ${activeTab === tab.id ? "bg-gray-50 text-gray-900 border border-gray-200 border-b-gray-50 -mb-px" : "text-gray-500 hover:text-gray-700"}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && <Dashboard contents={contents} setActiveTab={setActiveTab} />}
        {activeTab === "calendar" && <Calendar contents={contents} />}
        {activeTab === "pipeline" && <Pipeline contents={contents} setContents={setContents} />}
        {activeTab === "publishing" && <Publishing contents={contents} setContents={setContents} />}
        {activeTab === "factory" && <ContentFactory contents={contents} setContents={setContents} />}
      </main>
    </div>
  );
}
