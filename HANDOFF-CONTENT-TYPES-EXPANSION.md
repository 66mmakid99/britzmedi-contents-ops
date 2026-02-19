# HANDOFF: Content Factory 콘텐츠 유형 확장

> 이 문서는 Claude Code에 전달하여 구현하는 기술 핸드오프 문서입니다.
> 기존 보도자료 전용 구조를 8가지 콘텐츠 유형으로 확장합니다.
> 기존 기능은 100% 보존하면서 확장합니다.

---

## 목표

```
현재:  보도자료 → 5채널 변환 (보도자료 없으면 채널 콘텐츠 생성 불가)
목표:  [8가지 유형 중 선택] → [자유 텍스트 입력] → [적합 채널 자동 추천 + 콘텐츠 생성]
```

보도자료가 아닌 소재(논문 해설, 납품 소식, 회사 일상, 제품 팁 등)도
Content Factory에서 채널별 콘텐츠를 바로 만들 수 있게 한다.

---

## 구현 순서 (3단계)

### Step 1: CONTENT_TYPES 상수 추가 + 유형 선택 UI
### Step 2: contentSource 범용화 (pressRelease → contentSource)
### Step 3: 유형별 프롬프트 + 검수 기준 분리

---

## Step 1: CONTENT_TYPES 상수 추가

### 파일: `src/constants/contentTypes.js` (신규 생성)

```javascript
/**
 * 콘텐츠 유형 정의
 * - 기존 PR_CATEGORIES(prompts.js)는 보도자료 하위 카테고리로 유지
 * - CONTENT_TYPES는 상위 레벨 유형 분류
 */

export const CONTENT_TYPES = {
  press_release: {
    label: '보도자료',
    icon: '📰',
    description: '언론 배포용 공식 보도자료',
    track: 'A',
    flow: 'full',  // 6단계 (기존 플로우 유지)
    recommendedChannels: ['linkedin', 'newsletter', 'naver-blog', 'kakao', 'instagram'],
    channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 3, kakao: 2, instagram: 2 },
    // 입력: 기존 Create.jsx 보도자료 플로우 그대로 사용
    fields: null,  // PR_CATEGORIES에서 가져옴
  },

  research: {
    label: '논문/연구 해설',
    icon: '📑',
    description: '피부과/미용의료 논문을 해설하는 교육 콘텐츠',
    track: 'A',
    flow: 'simple',  // 4단계 (입력→생성→검수→결과)
    recommendedChannels: ['linkedin', 'naver-blog', 'newsletter'],
    channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 3, kakao: 1, instagram: 2 },
    fields: [
      { key: 'paperTitle', label: '논문 제목', required: true, placeholder: '예: Radiofrequency for Skin Tightening: A Systematic Review' },
      { key: 'source', label: '저널/출처', placeholder: '예: Journal of Cosmetic Dermatology, 2026' },
      { key: 'doi', label: 'DOI 또는 링크', placeholder: '예: 10.1111/jocd.12345 또는 URL' },
      { key: 'keyFindings', label: '핵심 결론', required: true, type: 'textarea', placeholder: '논문의 핵심 발견/결론을 자유롭게 적어주세요' },
      { key: 'relatedProduct', label: '관련 제품', type: 'product_select' },
      { key: 'connectionPoint', label: '제품 연결 포인트', type: 'textarea', placeholder: '예: 논문의 고주파 원리가 TORR RF에 적용된 기술과 동일' },
    ],
  },

  installation: {
    label: '납품/도입 사례',
    icon: '🏥',
    description: '병원 장비 납품, 도입 소식',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['linkedin', 'naver-blog', 'instagram'],
    channelFit: { linkedin: 3, newsletter: 2, 'naver-blog': 3, kakao: 2, instagram: 3 },
    fields: [
      { key: 'hospitalName', label: '병원/기관명', required: true, placeholder: '예: 미라벨피부과' },
      { key: 'product', label: '도입 제품', required: true, type: 'product_select' },
      { key: 'region', label: '지역', placeholder: '예: 서울 강남' },
      { key: 'installDate', label: '도입 시기', placeholder: '예: 2026년 2월' },
      { key: 'doctorComment', label: '원장님 코멘트 (있으면)', type: 'textarea', placeholder: '도입 이유, 만족도 등' },
      { key: 'background', label: '도입 배경', type: 'textarea', placeholder: '예: 기존 1대 사용 후 만족해서 추가 구매' },
    ],
  },

  company_life: {
    label: '회사 소식/일상',
    icon: '🏢',
    description: '사무실 이전, 워크숍, 행사, 팀 소개 등',
    track: 'B',
    flow: 'simple',
    recommendedChannels: ['instagram', 'linkedin', 'kakao'],
    channelFit: { linkedin: 2, newsletter: 1, 'naver-blog': 2, kakao: 2, instagram: 3 },
    fields: [
      { key: 'subType', label: '소재 유형', type: 'select', required: true,
        options: [
          { value: 'office', label: '사무실/공간' },
          { value: 'team', label: '팀/사람' },
          { value: 'event', label: '사내 행사' },
          { value: 'hiring', label: '채용' },
          { value: 'culture', label: '업무 환경/문화' },
          { value: 'other', label: '기타' },
        ]
      },
      { key: 'tone', label: '톤', type: 'select',
        options: [
          { value: 'bright', label: '밝고 활기찬' },
          { value: 'calm', label: '차분하고 전문적' },
          { value: 'funny', label: '유머러스' },
          { value: 'emotional', label: '감성적' },
        ]
      },
    ],
    // 나머지는 자유 텍스트 + 이미지로 충분
  },

  product_tips: {
    label: '제품 팁/활용법',
    icon: '💡',
    description: '시술 테크닉, 장비 활용법, FAQ',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['naver-blog', 'instagram', 'linkedin'],
    channelFit: { linkedin: 2, newsletter: 2, 'naver-blog': 3, kakao: 2, instagram: 3 },
    fields: [
      { key: 'product', label: '제품', required: true, type: 'product_select' },
      { key: 'tipType', label: '팁 유형', type: 'select', required: true,
        options: [
          { value: 'technique', label: '시술 테크닉' },
          { value: 'consultation', label: '환자 상담 포인트' },
          { value: 'maintenance', label: '장비 관리/세팅' },
          { value: 'faq', label: 'FAQ 답변' },
          { value: 'before_after', label: 'Before/After' },
          { value: 'other', label: '기타' },
        ]
      },
    ],
  },

  industry_trend: {
    label: '업계 트렌드',
    icon: '📊',
    description: '시장 동향, 규제 변화, 전시회 후기',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['linkedin', 'newsletter', 'naver-blog'],
    channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 2, kakao: 1, instagram: 1 },
    fields: [
      { key: 'refLinks', label: '참고 링크 (있으면)', type: 'textarea', placeholder: '뉴스 기사나 보고서 URL' },
    ],
  },

  success_story: {
    label: '고객 성공사례',
    icon: '👨‍⚕️',
    description: '원장님 인터뷰, 사용 후기, 병원 성장 사례',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['naver-blog', 'linkedin', 'newsletter'],
    channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 3, kakao: 2, instagram: 2 },
    fields: [
      { key: 'hospitalName', label: '병원명', required: true },
      { key: 'doctorName', label: '원장님 성함', placeholder: '공개 동의 받은 경우만' },
      { key: 'product', label: '사용 제품', type: 'product_select' },
      { key: 'usagePeriod', label: '사용 기간', placeholder: '예: 6개월' },
    ],
  },

  event_promo: {
    label: '이벤트/프로모션',
    icon: '🎉',
    description: '특가, 체험 이벤트, 세미나 안내, 모집',
    track: 'B',
    flow: 'simple',
    recommendedChannels: ['kakao', 'instagram', 'naver-blog'],
    channelFit: { linkedin: 1, newsletter: 2, 'naver-blog': 2, kakao: 3, instagram: 3 },
    fields: [
      { key: 'eventTitle', label: '이벤트명', required: true, placeholder: '예: TORR RF 체험 이벤트' },
      { key: 'period', label: '기간', required: true, placeholder: '예: 2026.03.01 ~ 03.31' },
      { key: 'target', label: '대상', placeholder: '예: 피부과/에스테틱 원장님' },
      { key: 'benefit', label: '혜택/내용', required: true, type: 'textarea', placeholder: '무료 체험, 할인율, 프로그램 등' },
      { key: 'how', label: '참여 방법', type: 'textarea', placeholder: '신청 방법, 연락처 등' },
    ],
  },
};

/**
 * 제품 선택 옵션 (product_select 타입에서 사용)
 */
export const PRODUCT_OPTIONS = [
  { value: 'torr_rf', label: 'TORR RF' },
  { value: 'newchae', label: 'NEWCHAE (뉴채)' },
  { value: 'ulblanc', label: 'ULBLANC (울블랑)' },
  { value: 'lumino_wave', label: 'LUMINO WAVE (루미노웨이브)' },
  { value: 'other', label: '기타' },
];

/**
 * channelFit 값 의미:
 * 3 = 최적 (자동 체크)
 * 2 = 적합 (체크 가능)
 * 1 = 가능하지만 비추천 (체크 해제)
 * 0 또는 미정의 = 부적합 (숨김)
 */
export function getRecommendedChannels(contentType) {
  const type = CONTENT_TYPES[contentType];
  if (!type) return [];
  return Object.entries(type.channelFit)
    .filter(([, fit]) => fit >= 2)
    .sort(([, a], [, b]) => b - a)
    .map(([channelId]) => channelId);
}

export function getAutoCheckedChannels(contentType) {
  const type = CONTENT_TYPES[contentType];
  if (!type) return [];
  return Object.entries(type.channelFit)
    .filter(([, fit]) => fit >= 3)
    .map(([channelId]) => channelId);
}
```

---

## Step 2: contentSource 범용화

### 핵심 개념

기존에 `pressRelease` 객체를 받던 모든 곳을 `contentSource`로 바꾼다.
**단, 보도자료일 때는 기존과 100% 동일하게 동작해야 한다.**

```javascript
// contentSource 통합 객체 구조
const contentSource = {
  // --- 공통 필드 ---
  id: 'uuid',
  type: 'research',              // CONTENT_TYPES의 키. 'press_release'면 기존 보도자료
  title: '제목',
  body: '핵심 내용 (자유 텍스트)',  // 보도자료면 draft/body, 다른 유형이면 자유 입력 텍스트
  date: '2026-02-18',
  images: [],

  // --- 유형별 메타데이터 ---
  metadata: {
    // research 예시:
    paperTitle: '논문 제목',
    doi: '10.1234/...',
    relatedProduct: 'torr_rf',
    connectionPoint: '연결 포인트',
    // installation 예시:
    hospitalName: '미라벨피부과',
    product: 'torr_rf',
    region: '서울 강남',
    // ... 유형별로 다름
  },

  // --- 보도자료 전용 (type === 'press_release'일 때만) ---
  draft: '보도자료 전문',           // 기존 호환
  category: 'exhibition',          // PR_CATEGORIES 키
  parsedFacts: {},                 // 파싱된 팩트
  sections: [],                    // 보도자료 섹션
};
```

### 변경 파일 목록

#### 2-1. `src/App.jsx`

변경 포인트:
- `repurposePR` state를 `repurposeSource`로 이름 변경
- `handleGoToRepurpose`가 contentSource 형태를 받도록 수정
- RepurposeHub에 `contentSource` prop으로 전달

```javascript
// 변경 전
const [repurposePR, setRepurposePR] = useState(null);
// ...
<RepurposeHub pressRelease={repurposePR} ... />

// 변경 후
const [repurposeSource, setRepurposeSource] = useState(null);
// ...
<RepurposeHub contentSource={repurposeSource} ... />
```

`handleCreateFromPR`과 `handleGoToRepurpose` 함수에 `type: 'press_release'`를 추가:
```javascript
const handleCreateFromPR = (prItem) => {
  setRepurposeSource({
    type: 'press_release',  // ← 추가
    id: prItem.id,
    title: prItem.title,
    date: prItem.date,
    body: typeof prItem.draft === 'string' ? prItem.draft : JSON.stringify(prItem.draft),
    draft: typeof prItem.draft === 'string' ? prItem.draft : JSON.stringify(prItem.draft),
  });
  setActivePage('repurpose');
};
```

그리고 비-보도자료 유형을 위한 새 핸들러 추가:
```javascript
const handleGoToRepurposeGeneral = (sourceData) => {
  setRepurposeSource({
    type: sourceData.type,  // 'research', 'installation', 등
    id: sourceData.id || `${sourceData.type}-${Date.now()}`,
    title: sourceData.title || '',
    body: sourceData.body || '',
    date: sourceData.date || new Date().toISOString().slice(0, 10),
    metadata: sourceData.metadata || {},
  });
  setActivePage('repurpose');
};
```

#### 2-2. `src/components/repurpose/RepurposeHub.jsx`

변경 포인트:
- prop 이름: `pressRelease` → `contentSource`
- 내부에서 `pressRelease` 참조하는 20곳을 `contentSource`로 변경
- 보도자료 선택 화면에서 "비-보도자료 소스"도 표시

```javascript
// 변경 전
export default function RepurposeHub({ pressRelease, apiKey, contents, onSelectPR }) {

// 변경 후
export default function RepurposeHub({ contentSource, apiKey, contents, onSelectPR }) {
  // 보도자료 여부 판별
  const isPressRelease = contentSource?.type === 'press_release' || !contentSource?.type;
```

`generateChannelContent` 호출 부분:
```javascript
// 변경 전
const result = await generateChannelContent(pressRelease, channelId, { apiKey });

// 변경 후
const result = await generateChannelContent(contentSource, channelId, { apiKey });
```

#### 2-3. `src/lib/channelGenerate.js`

변경 포인트:
- `generateChannelContent(pressRelease, ...)` → `generateChannelContent(contentSource, ...)`
- 프롬프트 생성 시 유형에 따라 다른 프롬프트 함수 호출

```javascript
// 변경 후
export async function generateChannelContent(contentSource, channelId, options = {}) {
  const { apiKey } = options;
  if (!apiKey) throw new Error('API 키가 필요합니다');

  const channel = REPURPOSE_CHANNELS.find(c => c.id === channelId);
  if (!channel) throw new Error(`알 수 없는 채널: ${channelId}`);

  // Phase 3: 학습 데이터 컨텍스트 주입
  const dbChannel = channelToDb[channelId] || channelId;
  const learningContext = await buildContext(dbChannel, null, null);

  // ★ 유형에 따라 다른 프롬프트 생성
  const sourceType = contentSource.type || 'press_release';
  const prompt = sourceType === 'press_release'
    ? getRepurposePrompt(channelId, contentSource, options)  // 기존 보도자료 프롬프트
    : getGeneralContentPrompt(channelId, contentSource, options);  // 새 범용 프롬프트

  const fullPrompt = prompt + learningContext;

  // 이하 동일 (maxTokens, API 호출, 후처리)
  // ...
}
```

#### 2-4. `src/constants/prompts.js`

변경 포인트:
- 기존 `getRepurposePrompt` 함수는 100% 유지 (보도자료 전용)
- 새로 `getGeneralContentPrompt` 함수 추가 (비-보도자료용)

```javascript
/**
 * 비-보도자료 콘텐츠의 채널별 프롬프트 생성
 * @param {string} channelId - 채널 ID
 * @param {object} contentSource - 콘텐츠 소스 (type, body, metadata 포함)
 * @param {object} options
 */
export function getGeneralContentPrompt(channelId, contentSource, options = {}) {
  const { type, title, body, metadata = {} } = contentSource;

  // 유형별 소스 텍스트 조립
  const sourceText = buildSourceText(type, body, metadata);

  // 공통 금지 규칙 (기존 commonRules와 동일)
  const commonRules = getCommonRules();

  // 유형별 추가 규칙
  const typeRules = getTypeSpecificRules(type);

  // 채널별 프롬프트 (기존 채널 프롬프트 구조를 재활용하되, "보도자료"→"원본 소재"로 변경)
  const channelPrompt = getChannelPromptForType(channelId, type, sourceText, title);

  return `${channelPrompt}\n\n${commonRules}\n\n${typeRules}`;
}
```

---

## Step 3: 유형별 프롬프트 + 검수 기준

### 3-1. 유형별 소스 텍스트 조립 함수

```javascript
function buildSourceText(type, body, metadata) {
  let source = '';

  switch (type) {
    case 'research':
      source += `[논문 정보]\n`;
      if (metadata.paperTitle) source += `제목: ${metadata.paperTitle}\n`;
      if (metadata.source) source += `출처: ${metadata.source}\n`;
      if (metadata.doi) source += `DOI: ${metadata.doi}\n`;
      source += `\n[핵심 발견/결론]\n${metadata.keyFindings || body}\n`;
      if (metadata.relatedProduct) source += `\n[관련 제품]: ${metadata.relatedProduct}\n`;
      if (metadata.connectionPoint) source += `[제품 연결 포인트]: ${metadata.connectionPoint}\n`;
      break;

    case 'installation':
      source += `[납품 정보]\n`;
      if (metadata.hospitalName) source += `병원: ${metadata.hospitalName}\n`;
      if (metadata.product) source += `제품: ${metadata.product}\n`;
      if (metadata.region) source += `지역: ${metadata.region}\n`;
      if (metadata.installDate) source += `시기: ${metadata.installDate}\n`;
      if (metadata.doctorComment) source += `\n[원장님 코멘트]\n${metadata.doctorComment}\n`;
      if (metadata.background) source += `\n[도입 배경]\n${metadata.background}\n`;
      if (body) source += `\n[추가 정보]\n${body}\n`;
      break;

    case 'company_life':
      if (metadata.subType) source += `[소재 유형]: ${metadata.subType}\n`;
      if (metadata.tone) source += `[톤]: ${metadata.tone}\n`;
      source += `\n[내용]\n${body}\n`;
      break;

    case 'product_tips':
      if (metadata.product) source += `[제품]: ${metadata.product}\n`;
      if (metadata.tipType) source += `[팁 유형]: ${metadata.tipType}\n`;
      source += `\n[내용]\n${body}\n`;
      break;

    case 'industry_trend':
      source += `[트렌드/동향 내용]\n${body}\n`;
      if (metadata.refLinks) source += `\n[참고 링크]\n${metadata.refLinks}\n`;
      break;

    case 'success_story':
      if (metadata.hospitalName) source += `[병원]: ${metadata.hospitalName}\n`;
      if (metadata.doctorName) source += `[원장님]: ${metadata.doctorName}\n`;
      if (metadata.product) source += `[사용 제품]: ${metadata.product}\n`;
      if (metadata.usagePeriod) source += `[사용 기간]: ${metadata.usagePeriod}\n`;
      source += `\n[내용/후기]\n${body}\n`;
      break;

    case 'event_promo':
      if (metadata.eventTitle) source += `[이벤트명]: ${metadata.eventTitle}\n`;
      if (metadata.period) source += `[기간]: ${metadata.period}\n`;
      if (metadata.target) source += `[대상]: ${metadata.target}\n`;
      if (metadata.benefit) source += `[혜택]\n${metadata.benefit}\n`;
      if (metadata.how) source += `[참여 방법]\n${metadata.how}\n`;
      if (body) source += `\n[추가 정보]\n${body}\n`;
      break;

    default:
      source = body || '';
  }

  return source;
}
```

### 3-2. 유형별 검수 규칙

```javascript
function getTypeSpecificRules(type) {
  const rules = {
    research: `[논문 해설 전용 규칙]
1. 논문 원문에 없는 효과/수치 절대 추가 금지. 논문 내용만 사실로 인용.
2. "~한 것으로 나타났다", "~라는 연구 결과가 있다" 등 인용 문체 사용.
3. 제품명 직접 연결 시 "이 원리를 적용한 장비로는 ○○이 있다" 수준까지만.
   "○○이 이 효과를 낸다"는 과대광고이므로 금지.
4. 원문 DOI/출처 반드시 포함.
5. "치료", "완치", "효과 보장" 등 의료법 위반 표현 금지.`,

    installation: `[납품 사례 전용 규칙]
1. 입력된 정보만 사용. 병원 정보를 추가로 생성하거나 추측하지 마라.
2. "국내 최고", "최초", "유일" 등 과장 표현 금지.
3. 병원명, 원장님 이름은 입력값 그대로만 사용.
4. 도입 이유를 AI가 추측하지 마라. 입력되지 않았으면 언급하지 마라.
5. 축하/환영의 톤을 유지하되, 과도한 찬사 금지.`,

    company_life: `[회사 일상 전용 규칙]
1. 자연스럽고 진정성 있는 톤. 기업 PR/홍보 느낌 배제.
2. 직원 개인정보(이름, 직급 등) 노출 주의. 입력된 것만 사용.
3. 사진 설명은 입력된 내용만. AI가 사진 내용을 추측하지 마라.
4. "성장하는 기업", "열정 가득한 팀" 같은 기업 PR 클리셰 금지.
5. 채널별 톤 차별화: Instagram은 캐주얼, LinkedIn은 기업문화 브랜딩.`,

    product_tips: `[제품 팁 전용 규칙]
1. 의료법 위반 표현 자동 검수: "치료", "효과 보장", "완치" 등 금지.
2. 시술 결과를 약속하는 표현 금지. "~할 수 있습니다" 수준까지만.
3. 입력된 팁 내용만 사용. AI가 시술 방법을 추가로 창작하지 마라.
4. 전문 의료인 대상임을 전제. 환자용 표현이 아닌 의사용 표현 사용.
5. 구체적 세팅값(주파수, 에너지량 등)은 입력된 것만 사용.`,

    industry_trend: `[업계 트렌드 전용 규칙]
1. 출처 명시 필수. 참고 링크가 있으면 반드시 포함.
2. 주관적 예측과 객관적 데이터를 명확히 구분.
3. "~로 전망된다"는 출처 있을 때만. 출처 없으면 "~될 수 있다" 수준.
4. 경쟁사 비방 금지. 객관적 비교만.
5. 자사 제품 연결은 자연스럽게, 1~2문장 이내.`,

    success_story: `[성공 사례 전용 규칙]
1. 인터뷰/후기 원문에 충실. 과장하거나 미화하지 마라.
2. 환자 정보 절대 노출 금지.
3. "치료 효과" 직접 언급 금지. "만족도", "사용 경험" 수준으로.
4. 병원 동의 없는 정보 추측 금지.
5. 원장님 말투를 AI가 지어내지 마라. 코멘트가 있으면 원문 사용.`,

    event_promo: `[이벤트/프로모션 전용 규칙]
1. 일시, 장소, 혜택, 참여 방법의 정확성이 최우선.
2. 입력되지 않은 조건(가격, 수량 등)을 AI가 만들지 마라.
3. CTA(행동 유도)를 명확하게.
4. 긴급성 과장 금지 ("지금 바로!", "마감 임박!" 남발 금지).
5. 이벤트 정보에 없는 혜택을 추가하지 마라.`,
  };

  return rules[type] || '';
}
```

### 3-3. 채널별 프롬프트 매핑 (비-보도자료용)

기존 채널 프롬프트의 구조를 재활용하되, "보도자료 본문"을 "원본 소재"로 바꿉니다.

```javascript
function getChannelPromptForType(channelId, contentType, sourceText, title) {
  // 유형별 역할 설정
  const roleMap = {
    research: '피부과/메디컬 에스테틱 분야의 논문 해설 전문 콘텐츠 작가',
    installation: '의료기기 기업의 비즈니스 소식 전문 콘텐츠 작가',
    company_life: '기업 브랜딩 및 소셜미디어 콘텐츠 전문 작가',
    product_tips: '의료기기 전문가이자 시술 교육 콘텐츠 작가',
    industry_trend: '메디컬 에스테틱 업계 전문 애널리스트이자 콘텐츠 작가',
    success_story: '의료기기 도입 사례 스토리텔링 전문 작가',
    event_promo: '이벤트 마케팅 전문 카피라이터',
  };

  const role = roleMap[contentType] || '전문 콘텐츠 작가';

  // 기존 채널별 포맷/톤 규칙은 그대로 사용
  // newsletter, linkedin, naver-blog, kakao, instagram 각각의
  // [독자 페르소나], [톤앤매너], [포맷 규칙], [출력 형식]은 기존 것 재활용

  // "원본 보도자료 본문" → "원본 소재" 로 라벨만 변경
  return `당신은 ${role}입니다.
아래 원본 소재를 ${getChannelLabel(channelId)}에 맞는 콘텐츠로 변환하세요.

[원본 소재 제목]
${title || '(제목 없음)'}

[원본 소재]
${sourceText}

${getExistingChannelRules(channelId)}`;
  // getExistingChannelRules: 기존 channelPrompts 객체에서 해당 채널의
  // [독자 페르소나], [톤앤매너], [포맷 규칙], [출력 형식] 부분을 반환
}
```

---

## Step 4: Create.jsx에 유형 선택 UI 추가

### UI 플로우

```
Create 페이지 진입
    ↓
[유형 선택 그리드] — 8개 아이콘 카드
    ↓
├── 📰 보도자료 선택 → 기존 6단계 플로우 그대로 실행
│
└── 📑📑🏥🏢💡📊👨‍⚕️🎉 다른 유형 선택 →
         ↓
    [간소화된 입력 폼]
    · 유형별 필수 필드 (CONTENT_TYPES[type].fields)
    · 자유 텍스트 입력 (공통)
    · 이미지 첨부 (공통)
    · 채널 자동 추천 (channelFit 기반)
         ↓
    [생성하기] 버튼 클릭
         ↓
    → contentSource 객체 조립
    → App.jsx의 handleGoToRepurposeGeneral 호출
    → RepurposeHub로 이동 (채널 생성 + 검수)
```

### Create.jsx 변경 내용

```jsx
// 상단에 추가
import { CONTENT_TYPES, PRODUCT_OPTIONS, getAutoCheckedChannels } from '../../constants/contentTypes';

// state 추가
const [selectedType, setSelectedType] = useState(null);

// 유형 선택 전이면 유형 선택 그리드 표시
if (!selectedType) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">콘텐츠 팩토리</h2>
      <p className="text-sm text-steel">어떤 콘텐츠를 만들까요?</p>
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(CONTENT_TYPES).map(([key, type]) => (
          <button
            key={key}
            onClick={() => setSelectedType(key)}
            className="flex flex-col items-center gap-1 p-4 bg-white rounded-xl border border-pale hover:border-accent transition-colors"
          >
            <span className="text-2xl">{type.icon}</span>
            <span className="text-xs font-medium">{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 보도자료 선택 시: 기존 플로우 그대로
if (selectedType === 'press_release') {
  return (
    <>
      {/* 뒤로가기 버튼 */}
      <button onClick={() => setSelectedType(null)} className="text-sm text-steel mb-2">
        ← 유형 다시 선택
      </button>
      {/* 기존 보도자료 Create 컴포넌트 내용 전체 */}
      {/* ... 기존 코드 그대로 ... */}
    </>
  );
}

// 다른 유형 선택 시: 간소화된 입력 폼
return (
  <GeneralContentForm
    contentType={selectedType}
    onBack={() => setSelectedType(null)}
    onSubmit={handleGoToRepurposeGeneral}  // App.jsx에서 받은 핸들러
    apiKey={apiKey}
  />
);
```

### GeneralContentForm 컴포넌트 (신규)

`src/components/create/GeneralContentForm.jsx` 신규 파일:

```jsx
/**
 * 보도자료 외 콘텐츠 유형의 입력 폼
 * CONTENT_TYPES[type].fields를 기반으로 동적 폼 생성
 */
import { useState } from 'react';
import { CONTENT_TYPES, PRODUCT_OPTIONS, getAutoCheckedChannels } from '../../constants/contentTypes';
import { REPURPOSE_CHANNELS } from '../../constants/channels';

export default function GeneralContentForm({ contentType, onBack, onSubmit }) {
  const typeConfig = CONTENT_TYPES[contentType];
  const [metadata, setMetadata] = useState({});
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [selectedChannels, setSelectedChannels] = useState(
    getAutoCheckedChannels(contentType)
  );

  const handleFieldChange = (key, value) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onSubmit({
      type: contentType,
      title: title || `${typeConfig.label} - ${new Date().toLocaleDateString('ko-KR')}`,
      body,
      metadata,
      channels: selectedChannels,
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const canSubmit = () => {
    // 필수 필드 체크
    const requiredFields = (typeConfig.fields || []).filter(f => f.required);
    const allFilled = requiredFields.every(f => metadata[f.key]?.trim());
    // 자유 텍스트 또는 필수 필드 중 하나는 있어야 함
    return (body.trim() || allFilled) && selectedChannels.length > 0;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-steel">←</button>
        <span className="text-2xl">{typeConfig.icon}</span>
        <h2 className="text-lg font-bold">{typeConfig.label}</h2>
      </div>
      <p className="text-sm text-steel">{typeConfig.description}</p>

      {/* 제목 (공통) */}
      <div>
        <label className="text-sm font-medium">제목 (선택)</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="비워두면 자동 생성됩니다"
          className="w-full mt-1 p-2 border border-pale rounded-lg text-sm"
        />
      </div>

      {/* 유형별 필드 (동적 렌더링) */}
      {typeConfig.fields?.map(field => (
        <div key={field.key}>
          <label className="text-sm font-medium">
            {field.label} {field.required && <span className="text-red-400">*</span>}
          </label>
          {renderField(field, metadata[field.key] || '', (val) => handleFieldChange(field.key, val))}
        </div>
      ))}

      {/* 자유 텍스트 (공통) */}
      <div>
        <label className="text-sm font-medium">내용 (자유 입력)</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
          placeholder="대충 적어도 AI가 정리합니다. 핵심 내용만 자유롭게 적어주세요."
          className="w-full mt-1 p-3 border border-pale rounded-lg text-sm"
        />
      </div>

      {/* 채널 선택 (자동 추천 + 수동 변경) */}
      <div>
        <label className="text-sm font-medium">발행 채널</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {REPURPOSE_CHANNELS.map(ch => {
            const fit = typeConfig.channelFit[ch.id] || 0;
            if (fit === 0) return null;  // 부적합 채널 숨김
            const isSelected = selectedChannels.includes(ch.id);
            return (
              <button
                key={ch.id}
                onClick={() => setSelectedChannels(prev =>
                  isSelected ? prev.filter(id => id !== ch.id) : [...prev, ch.id]
                )}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  isSelected ? 'bg-accent text-white border-accent' : 'bg-white text-steel border-pale'
                }`}
              >
                {ch.label} {fit === 3 ? '★' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit()}
        className="w-full py-3 bg-accent text-white rounded-xl font-bold disabled:opacity-40"
      >
        {selectedChannels.length}개 채널 콘텐츠 생성하기
      </button>
    </div>
  );
}

// 필드 타입별 렌더링 헬퍼
function renderField(field, value, onChange) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={field.placeholder || ''}
          className="w-full mt-1 p-2 border border-pale rounded-lg text-sm"
        />
      );

    case 'select':
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full mt-1 p-2 border border-pale rounded-lg text-sm"
        >
          <option value="">선택하세요</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'product_select':
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full mt-1 p-2 border border-pale rounded-lg text-sm"
        >
          <option value="">제품 선택</option>
          {PRODUCT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className="w-full mt-1 p-2 border border-pale rounded-lg text-sm"
        />
      );
  }
}
```

---

## 검수 기준 분리

### reviewChannelContent 수정 (channelGenerate.js)

기존 검수 프롬프트에 유형별 규칙을 추가:

```javascript
export async function reviewChannelContent(channelId, generatedText, sourceBody, apiKey, contentType) {
  // contentType이 있으면 유형별 검수 규칙 추가
  const typeReviewRules = contentType && contentType !== 'press_release'
    ? getTypeSpecificRules(contentType)
    : '';

  // 기존 검수 프롬프트 + 유형별 규칙
  const prompt = getReviewPrompt(channelId, generatedText, sourceBody) + '\n\n' + typeReviewRules;
  // ... 이하 동일
}
```

---

## Supabase 스키마 변경

`press_releases` 테이블에 `type` 컬럼 추가:

```sql
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'press_release';
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pr_content_type ON press_releases(content_type);
```

---

## 테스트 시나리오

구현 후 아래 8개 시나리오를 테스트하세요:

### 테스트 1: 보도자료 (기존 플로우 무결성)
```
유형: 📰 보도자료
입력: "태국 방콕 Derma Solutions사와 토르RF 독점유통 계약 체결. 3년 계약, 연 300대 규모."
기대: 기존 6단계 플로우 그대로 작동. 5채널 변환 정상.
```

### 테스트 2: 논문 해설
```
유형: 📑 논문/연구 해설
논문 제목: "Radiofrequency-Induced Collagen Remodeling: A Systematic Review"
핵심 결론: "432명 대상 메타분석에서 RF 시술 후 콜라겐 밀도 평균 23% 증가"
관련 제품: TORR RF
연결 포인트: "토로이달 고주파 원리가 이 논문의 RF 원리와 동일"
채널: LinkedIn, 네이버 블로그, 뉴스레터
기대: 논문 인용 문체, DOI 포함, 과대광고 표현 없음
```

### 테스트 3: 납품 사례
```
유형: 🏥 납품/도입 사례
병원: 미라벨피부과
제품: TORR RF
지역: 서울 강남
배경: "기존 1대 사용 후 만족해서 2대 추가 구매"
채널: LinkedIn, Instagram, 네이버 블로그
기대: 축하 톤, 병원 정보 정확, 과장 없음
```

### 테스트 4: 회사 일상
```
유형: 🏢 회사 소식/일상
소재: 사무실/공간
톤: 밝고 활기찬
입력: "판교 새 사무실로 이전. 넓어졌고 회의실 3개. 직원 반응 좋음. 입주 파티도 했음."
채널: Instagram, LinkedIn, 카카오톡
기대: 자연스러운 톤, PR 느낌 없음, 채널별 톤 차별화
```

### 테스트 5: 제품 팁
```
유형: 💡 제품 팁/활용법
제품: TORR RF
팁 유형: 시술 테크닉
입력: "턱라인 따라 천천히 올리면 리프팅 효과가 좋다. 속도는 1cm/s. 3패스 권장."
채널: 네이버 블로그, Instagram
기대: 의료인 대상 전문 톤, 의료법 위반 없음
```

### 테스트 6: 업계 트렌드
```
유형: 📊 업계 트렌드
입력: "2026년 미용의료기기 시장 전망. 글로벌 RF 시장 연 12% 성장. 아시아 시장이 가장 빠르게 성장 중."
채널: LinkedIn, 뉴스레터
기대: 전문가 인사이트 톤, 출처 명시
```

### 테스트 7: 성공 사례
```
유형: 👨‍⚕️ 고객 성공사례
병원: 가로수피부과
원장님: 김민수
제품: TORR RF
사용 기간: 6개월
입력: "도입 후 고주파 시술 예약이 40% 증가. 환자 만족도도 높아서 재방문율 올라갔다고 하심."
채널: 네이버 블로그, LinkedIn, 뉴스레터
기대: 스토리텔링 톤, 인터뷰 원문 충실
```

### 테스트 8: 이벤트
```
유형: 🎉 이벤트/프로모션
이벤트명: TORR RF 무료 체험 이벤트
기간: 2026.03.01 ~ 03.31
대상: 피부과/에스테틱 원장님
혜택: 무료 시연 + 1개월 임대 체험
참여 방법: 이메일 신청 (sh.lee@britzmedi.co.kr)
채널: 카카오톡, Instagram
기대: CTA 명확, 정보 정확, 긴급성 과장 없음
```

---

## 구현 순서 체크리스트

```
□ 1. src/constants/contentTypes.js 신규 생성 (CONTENT_TYPES + 헬퍼 함수)
□ 2. src/components/create/GeneralContentForm.jsx 신규 생성
□ 3. src/components/create/Create.jsx에 유형 선택 그리드 추가
     - 보도자료 선택 시 기존 플로우 100% 유지
     - 다른 유형 선택 시 GeneralContentForm 렌더링
□ 4. src/App.jsx 수정
     - repurposePR → repurposeSource 리네임
     - handleGoToRepurposeGeneral 핸들러 추가
     - RepurposeHub에 contentSource prop 전달
□ 5. src/components/repurpose/RepurposeHub.jsx 수정
     - pressRelease → contentSource로 prop 변경 (20곳)
     - 보도자료 여부 판별 로직 추가
□ 6. src/constants/prompts.js에 추가
     - getGeneralContentPrompt() 함수
     - buildSourceText() 함수
     - getTypeSpecificRules() 함수
     - getChannelPromptForType() 함수
□ 7. src/lib/channelGenerate.js 수정
     - generateChannelContent의 프롬프트 분기 (press_release vs 기타)
     - reviewChannelContent에 유형별 검수 규칙 주입
□ 8. 테스트 (8개 시나리오)
     - 테스트 1: 보도자료 기존 플로우 무결성 확인 (최우선)
     - 테스트 2~8: 각 유형별 생성 + 검수 확인
□ 9. (선택) Supabase 스키마 업데이트 (content_type, metadata 컬럼)
```

---

## 주의사항

1. **기존 보도자료 플로우를 절대 깨뜨리지 마라.**
   - press_release일 때는 기존 코드 100% 그대로 동작해야 한다.
   - pressRelease → contentSource 리네임 시 모든 참조를 빠짐없이 변경.

2. **프롬프트 품질이 핵심이다.**
   - 유형별 프롬프트를 대충 쓰면 결과물 품질이 떨어진다.
   - 특히 `research` (논문 해설)과 `product_tips` (제품 팁)은 의료법 검수가 중요.

3. **점진적으로 구현하라.**
   - Step 1 (유형 선택 UI) → 빌드 확인 → Step 2 (범용화) → 빌드 확인 → Step 3 (프롬프트)
   - 한꺼번에 다 바꾸지 말고 단계별로.

4. **getRepurposePrompt는 건드리지 마라.**
   - 기존 보도자료 전용 프롬프트는 그대로 둔다.
   - 새 유형용 프롬프트(getGeneralContentPrompt)를 별도로 만든다.
