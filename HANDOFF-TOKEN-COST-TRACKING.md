# HANDOFF: 토큰 사용량 & API 비용 실시간 표시

> 이 문서는 HANDOFF-CONTENT-TYPES-EXPANSION.md와 함께 사용합니다.
> Content Factory의 모든 API 호출에서 토큰 사용량을 수집하고,
> 원가(비용)를 실시간으로 UI에 표시하는 기능을 구현합니다.

---

## 목표

```
[콘텐츠 생성 중 / 생성 후]

┌─────────────────────────────────────────────┐
│  📊 API 사용량                               │
│                                             │
│  이번 세션                                   │
│  ├── 입력 토큰: 12,450 tokens               │
│  ├── 출력 토큰: 3,820 tokens                │
│  ├── API 호출: 7회 (생성 5 + 검수 2)         │
│  └── 💰 예상 비용: $0.094 (약 ₩137)         │
│                                             │
│  누적 (오늘)                                 │
│  ├── 입력 토큰: 45,200 tokens               │
│  ├── 출력 토큰: 14,300 tokens               │
│  └── 💰 누적 비용: $0.350 (약 ₩508)         │
└─────────────────────────────────────────────┘
```

마케터가 "이 콘텐츠 한 건 만드는 데 얼마 든다"를 항상 알 수 있어야 한다.

---

## 현재 문제

### API 호출 함수 2개가 usage 데이터를 버리고 있음

#### 1. `src/lib/channelGenerate.js` — `callClaudeForChannel()`
```javascript
// 현재 코드 (문제)
const data = await res.json();
return data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';
// ↑ data.usage를 완전히 버림
```

#### 2. `src/lib/claude.js` — `callClaude()`
```javascript
// 현재 코드 (문제)
const data = await res.json();
return data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';
// ↑ data.usage를 완전히 버림
```

### Claude API가 항상 반환하는 usage 객체
```json
{
  "content": [{ "type": "text", "text": "..." }],
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567
  }
}
```

이 `usage` 필드를 캡처해서 비용을 계산하면 된다.

---

## 가격 기준 (2026년 2월 현재)

### Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

| 항목 | 가격 (USD) | 가격 (KRW, ₩1,450/$ 기준) |
|------|-----------|--------------------------|
| 입력 토큰 1M개 | $3.00 | ₩4,350 |
| 출력 토큰 1M개 | $15.00 | ₩21,750 |
| 입력 토큰 1K개 | $0.003 | ₩4.35 |
| 출력 토큰 1K개 | $0.015 | ₩21.75 |

### 콘텐츠 1건당 예상 비용 (추정치)

| 작업 | API 호출 | 입력 토큰 (추정) | 출력 토큰 (추정) | 비용 (USD) | 비용 (KRW) |
|------|---------|----------------|----------------|-----------|-----------|
| 보도자료 파싱 | 1회 | ~2,000 | ~1,000 | $0.021 | ₩30 |
| 보도자료 생성 | 1회 | ~3,000 | ~2,000 | $0.039 | ₩57 |
| 보도자료 검수 | 1회 | ~4,000 | ~1,000 | $0.027 | ₩39 |
| 채널 1개 생성 | 1회 | ~3,000 | ~1,500 | $0.032 | ₩46 |
| 채널 1개 검수 | 1회 | ~4,000 | ~800 | $0.024 | ₩35 |
| 채널 1개 보정 | 1회 | ~4,000 | ~1,500 | $0.035 | ₩51 |
| **보도자료 + 5채널 전체** | **~13회** | **~40,000** | **~15,000** | **~$0.345** | **~₩500** |

**콘텐츠 1세트(보도자료 + 5채널) ≈ ₩500 (약 $0.35)**
**비-보도자료 + 3채널 ≈ ₩250 (약 $0.17)**

---

## 구현 상세

### Step 1: 토큰 추적 유틸리티 생성

#### 새 파일: `src/lib/tokenTracker.js`

```javascript
/**
 * Token Usage Tracker
 * - 세션별 / 일별 토큰 사용량 추적
 * - 비용 계산 (USD + KRW)
 * - localStorage에 일별 누적 저장
 */

// Claude Sonnet 4.5 가격 (USD per 1M tokens)
const PRICING = {
  'claude-sonnet-4-5-20250929': {
    input: 3.00,    // $3.00 / 1M input tokens
    output: 15.00,  // $15.00 / 1M output tokens
    label: 'Claude Sonnet 4.5',
  },
  // 향후 모델 추가 가능
  'claude-haiku-4-5-20251001': {
    input: 1.00,
    output: 5.00,
    label: 'Claude Haiku 4.5',
  },
};

// 환율 (수동 설정, 필요 시 업데이트)
const KRW_PER_USD = 1450;

/**
 * 비용 계산
 */
export function calculateCost(inputTokens, outputTokens, model = 'claude-sonnet-4-5-20250929') {
  const pricing = PRICING[model] || PRICING['claude-sonnet-4-5-20250929'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalUSD = inputCost + outputCost;
  const totalKRW = totalUSD * KRW_PER_USD;

  return {
    inputCost,
    outputCost,
    totalUSD,
    totalKRW,
    model: pricing.label,
  };
}

/**
 * 비용 포맷팅
 */
export function formatCost(totalUSD, totalKRW) {
  const usd = totalUSD < 0.01 ? `$${totalUSD.toFixed(4)}` : `$${totalUSD.toFixed(3)}`;
  const krw = `₩${Math.round(totalKRW).toLocaleString()}`;
  return `${usd} (${krw})`;
}

export function formatTokens(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

/**
 * 세션 트래커 클래스
 * - 한 번의 콘텐츠 생성 세션 (예: 보도자료 + 5채널) 동안의 사용량 추적
 */
export class SessionTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.calls = [];
    this.totalInput = 0;
    this.totalOutput = 0;
    this.callCount = 0;
  }

  /**
   * API 호출 결과 기록
   * @param {string} step - 호출 단계 (예: 'parse', 'generate', 'review', 'channel-linkedin')
   * @param {object} usage - { input_tokens, output_tokens }
   */
  addCall(step, usage) {
    if (!usage) return;
    const entry = {
      step,
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      timestamp: Date.now(),
    };
    this.calls.push(entry);
    this.totalInput += entry.inputTokens;
    this.totalOutput += entry.outputTokens;
    this.callCount += 1;

    // 일별 누적에도 추가
    addToDailyTotal(entry.inputTokens, entry.outputTokens);
  }

  getSummary() {
    const cost = calculateCost(this.totalInput, this.totalOutput);
    return {
      inputTokens: this.totalInput,
      outputTokens: this.totalOutput,
      callCount: this.callCount,
      calls: this.calls,
      ...cost,
    };
  }
}

/**
 * 일별 누적 (localStorage)
 */
const DAILY_KEY_PREFIX = 'bm-token-usage-';

function getTodayKey() {
  return DAILY_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

function addToDailyTotal(inputTokens, outputTokens) {
  const key = getTodayKey();
  const existing = JSON.parse(localStorage.getItem(key) || '{"input":0,"output":0,"calls":0}');
  existing.input += inputTokens;
  existing.output += outputTokens;
  existing.calls += 1;
  localStorage.setItem(key, JSON.stringify(existing));
}

export function getDailyTotal() {
  const key = getTodayKey();
  const data = JSON.parse(localStorage.getItem(key) || '{"input":0,"output":0,"calls":0}');
  const cost = calculateCost(data.input, data.output);
  return {
    inputTokens: data.input,
    outputTokens: data.output,
    callCount: data.calls,
    ...cost,
  };
}

/**
 * 최근 N일 사용량 가져오기 (대시보드용)
 */
export function getUsageHistory(days = 7) {
  const history = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = DAILY_KEY_PREFIX + date.toISOString().slice(0, 10);
    const data = JSON.parse(localStorage.getItem(key) || '{"input":0,"output":0,"calls":0}');
    const cost = calculateCost(data.input, data.output);
    history.push({
      date: date.toISOString().slice(0, 10),
      ...data,
      ...cost,
    });
  }
  return history.reverse();
}
```

---

### Step 2: API 호출 함수 수정 (usage 반환)

#### `src/lib/channelGenerate.js` — `callClaudeForChannel()` 수정

```javascript
// 변경 전
async function callClaudeForChannel(prompt, apiKey, maxTokens = 2000) {
  // ...
  const data = await res.json();
  return data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';
}

// 변경 후: 텍스트와 usage를 함께 반환
async function callClaudeForChannel(prompt, apiKey, maxTokens = 2000) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';
  const usage = data.usage || null;  // ← 추가: usage 캡처

  return { text, usage };  // ← 변경: 객체 반환
}
```

**⚠️ 중요**: `callClaudeForChannel`의 반환값이 `string`에서 `{ text, usage }`로 바뀌므로,
이 함수를 호출하는 모든 곳을 수정해야 한다.

#### `generateChannelContent()` 수정

```javascript
export async function generateChannelContent(contentSource, channelId, options = {}) {
  const { apiKey, tracker } = options;  // ← tracker 추가
  // ... (프롬프트 생성 등 동일)

  const { text: response, usage } = await callClaudeForChannel(prompt, apiKey, maxTokens);
  // ↑ 구조 분해 할당으로 text와 usage 분리

  // 토큰 추적
  if (tracker && usage) {
    tracker.addCall(`channel-${channelId}`, usage);
  }

  // 이하 후처리 동일 (stripMarkdown 등은 response 대신 response → 이미 text로 받음)
  const cleaned = stripMarkdown(response);
  // ...
}
```

#### `reviewChannelContent()` 수정

```javascript
export async function reviewChannelContent(channelId, generatedText, sourceBody, apiKey, contentType, tracker) {
  // ... 프롬프트 생성
  const { text: raw, usage } = await callClaudeForChannel(prompt, apiKey, 2000);

  // 토큰 추적
  if (tracker && usage) {
    tracker.addCall(`review-${channelId}`, usage);
  }

  // 이하 동일
}
```

#### `autoFixChannelContent()` 수정

```javascript
export async function autoFixChannelContent(channelId, original, reviewResult, sourceBody, apiKey, tracker) {
  // ...
  const { text: raw, usage } = await callClaudeForChannel(prompt, apiKey, 3000);

  if (tracker && usage) {
    tracker.addCall(`fix-${channelId}`, usage);
  }
  // ...
}
```

#### `src/lib/claude.js` — `callClaude()` 동일하게 수정

```javascript
async function callClaude(prompt, apiKey, maxTokens = 4000, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    // ... fetch 동일

    const data = await res.json();
    const text = data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';
    const usage = data.usage || null;
    return { text, usage };  // ← 변경
  }
  throw new Error('API 과부하 상태입니다.');
}
```

**`callClaude()`를 호출하는 모든 함수도 수정:**
- `parseContent()` — tracker.addCall('parse', usage)
- `generateFromFacts()` — tracker.addCall('generate', usage)
- `reviewV2()` — tracker.addCall('review-pr', usage)
- `autoFixContent()` — tracker.addCall('fix-pr', usage)
- `generateQuoteSuggestions()` — tracker.addCall('quote', usage)
- `generateMultiChannel()` — tracker.addCall(`factory-${channelId}`, usage)

---

### Step 3: SessionTracker를 컴포넌트에 연결

#### `src/App.jsx`에 세션 트래커 관리

```javascript
import { SessionTracker, getDailyTotal } from './lib/tokenTracker';

// App 컴포넌트 내부
const sessionTrackerRef = useRef(new SessionTracker());
const [tokenSummary, setTokenSummary] = useState(null);

// 토큰 요약 업데이트 함수 (자식 컴포넌트에서 호출)
const updateTokenSummary = () => {
  setTokenSummary(sessionTrackerRef.current.getSummary());
};

// 새 세션 시작 (새 콘텐츠 생성 시작할 때)
const resetSession = () => {
  sessionTrackerRef.current.reset();
  setTokenSummary(null);
};
```

#### `RepurposeHub.jsx`에 tracker 전달

```javascript
// App.jsx에서 RepurposeHub로 전달
<RepurposeHub
  contentSource={repurposeSource}
  apiKey={apiKey}
  contents={contents}
  onSelectPR={(item) => setRepurposeSource(item)}
  tracker={sessionTrackerRef.current}
  onTokenUpdate={updateTokenSummary}
/>
```

```javascript
// RepurposeHub.jsx 내부에서 사용
const result = await generateChannelContent(contentSource, channelId, { 
  apiKey, 
  tracker  // ← 전달
});
onTokenUpdate?.();  // ← 부모에게 알림 → UI 업데이트

const reviewResult = await reviewChannelContent(
  channelId, rawText, prBody, apiKey, contentSource.type, tracker
);
onTokenUpdate?.();
```

---

### Step 4: 비용 표시 UI 컴포넌트

#### 새 파일: `src/components/layout/TokenUsageBadge.jsx`

```jsx
/**
 * 토큰 사용량 & 비용 실시간 표시 배지
 * - RepurposeHub 상단 또는 하단에 고정 표시
 * - 세션(이번 콘텐츠) + 오늘 누적 2단 표시
 */
import { useState } from 'react';
import { formatCost, formatTokens, getDailyTotal } from '../../lib/tokenTracker';

export default function TokenUsageBadge({ summary }) {
  const [expanded, setExpanded] = useState(false);
  const daily = getDailyTotal();

  if (!summary || summary.callCount === 0) return null;

  return (
    <div className="bg-white border border-pale rounded-xl p-3 text-xs">
      {/* 요약 바 (항상 보임) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <span className="text-steel">
          📊 API {summary.callCount}회 호출 · 
          {formatTokens(summary.inputTokens + summary.outputTokens)} tokens
        </span>
        <span className="font-bold text-accent">
          💰 {formatCost(summary.totalUSD, summary.totalKRW)}
        </span>
      </button>

      {/* 상세 (펼치면 보임) */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-pale space-y-2">
          {/* 이번 세션 */}
          <div>
            <div className="font-semibold text-steel mb-1">이번 콘텐츠</div>
            <div className="grid grid-cols-2 gap-1 text-steel">
              <span>입력 토큰:</span>
              <span className="text-right">{summary.inputTokens.toLocaleString()}</span>
              <span>출력 토큰:</span>
              <span className="text-right">{summary.outputTokens.toLocaleString()}</span>
              <span>API 호출:</span>
              <span className="text-right">{summary.callCount}회</span>
              <span className="font-bold">비용:</span>
              <span className="text-right font-bold text-accent">
                {formatCost(summary.totalUSD, summary.totalKRW)}
              </span>
            </div>
          </div>

          {/* 오늘 누적 */}
          <div>
            <div className="font-semibold text-steel mb-1">오늘 누적</div>
            <div className="grid grid-cols-2 gap-1 text-steel">
              <span>입력 토큰:</span>
              <span className="text-right">{daily.inputTokens.toLocaleString()}</span>
              <span>출력 토큰:</span>
              <span className="text-right">{daily.outputTokens.toLocaleString()}</span>
              <span>API 호출:</span>
              <span className="text-right">{daily.callCount}회</span>
              <span className="font-bold">누적 비용:</span>
              <span className="text-right font-bold">
                {formatCost(daily.totalUSD, daily.totalKRW)}
              </span>
            </div>
          </div>

          {/* 호출 상세 로그 */}
          {summary.calls.length > 0 && (
            <div>
              <div className="font-semibold text-steel mb-1">호출 상세</div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {summary.calls.map((call, i) => {
                  const cost = (call.inputTokens / 1e6 * 3) + (call.outputTokens / 1e6 * 15);
                  return (
                    <div key={i} className="flex justify-between text-[10px] text-mist">
                      <span>{getStepLabel(call.step)}</span>
                      <span>
                        {call.inputTokens.toLocaleString()}+{call.outputTokens.toLocaleString()} 
                        = ${cost.toFixed(4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 단가 참고 */}
          <div className="text-[10px] text-mist pt-2 border-t border-pale">
            💡 Claude Sonnet 4.5 기준 · 입력 $3/1M · 출력 $15/1M · ₩1,450/$
          </div>
        </div>
      )}
    </div>
  );
}

// 호출 단계 한글 라벨
function getStepLabel(step) {
  const labels = {
    'parse': '📝 AI 파싱',
    'generate': '✍️ 보도자료 생성',
    'review-pr': '🔍 보도자료 검수',
    'fix-pr': '🔧 보도자료 보정',
    'quote': '💬 인용문 제안',
    'channel-linkedin': '🔗 LinkedIn 생성',
    'channel-newsletter': '📧 뉴스레터 생성',
    'channel-naver-blog': '📗 네이버블로그 생성',
    'channel-kakao': '💬 카카오톡 생성',
    'channel-instagram': '📸 인스타그램 생성',
    'review-linkedin': '🔍 LinkedIn 검수',
    'review-newsletter': '🔍 뉴스레터 검수',
    'review-naver-blog': '🔍 블로그 검수',
    'review-kakao': '🔍 카카오톡 검수',
    'review-instagram': '🔍 인스타 검수',
    'fix-linkedin': '🔧 LinkedIn 보정',
    'fix-newsletter': '🔧 뉴스레터 보정',
    'fix-naver-blog': '🔧 블로그 보정',
    'fix-kakao': '🔧 카카오톡 보정',
    'fix-instagram': '🔧 인스타 보정',
  };
  return labels[step] || step;
}
```

---

### Step 5: 대시보드에 비용 요약 추가 (선택)

`src/components/dashboard/Dashboard.jsx`에 최근 7일 API 비용 차트 추가 가능:

```jsx
import { getUsageHistory, formatCost } from '../../lib/tokenTracker';

// 대시보드 어딘가에 추가
const usageHistory = getUsageHistory(7);
const totalWeekUSD = usageHistory.reduce((sum, d) => sum + d.totalUSD, 0);
const totalWeekKRW = usageHistory.reduce((sum, d) => sum + d.totalKRW, 0);

// 주간 요약 카드
<div className="bg-white rounded-xl border border-pale p-4">
  <h3 className="text-sm font-bold">📊 이번 주 API 비용</h3>
  <div className="text-2xl font-bold text-accent mt-1">
    {formatCost(totalWeekUSD, totalWeekKRW)}
  </div>
  <div className="text-xs text-steel mt-1">
    총 {usageHistory.reduce((s, d) => s + d.calls, 0)}회 호출
  </div>
  {/* 일별 막대 차트 (간단한 CSS 바) */}
  <div className="flex items-end gap-1 h-12 mt-3">
    {usageHistory.map((day, i) => {
      const maxCost = Math.max(...usageHistory.map(d => d.totalUSD), 0.01);
      const height = (day.totalUSD / maxCost) * 100;
      return (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div
            className="w-full bg-accent/20 rounded-t"
            style={{ height: `${Math.max(height, 2)}%` }}
          />
          <span className="text-[8px] text-mist mt-0.5">
            {day.date.slice(8)}일
          </span>
        </div>
      );
    })}
  </div>
</div>
```

---

## TokenUsageBadge 표시 위치

```
RepurposeHub 화면:

┌──────────────────────────────────────┐
│  채널 재가공                          │
│                                      │
│  [LinkedIn] [뉴스레터] [블로그] ...   │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  (채널 콘텐츠 미리보기)        │    │
│  │  ...                         │    │
│  │  [복사] [재생성]              │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │  ← 여기에 TokenUsageBadge
│  │ 📊 API 7회 · 56K tokens      │    │
│  │              💰 $0.345 (₩500) │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

Create.jsx (보도자료 생성 중)에서도 동일하게 표시.

---

## 구현 순서 체크리스트

```
□ 1. src/lib/tokenTracker.js 신규 생성
     - PRICING 상수, calculateCost, formatCost, formatTokens
     - SessionTracker 클래스
     - localStorage 일별 누적 함수

□ 2. src/lib/channelGenerate.js 수정
     - callClaudeForChannel(): string → { text, usage } 반환으로 변경
     - generateChannelContent(): tracker 파라미터 추가, usage 기록
     - reviewChannelContent(): tracker 파라미터 추가, usage 기록
     - autoFixChannelContent(): tracker 파라미터 추가, usage 기록
     ⚠️ callClaudeForChannel 반환값 변경으로 인한 모든 호출부 수정 필수

□ 3. src/lib/claude.js 수정
     - callClaude(): string → { text, usage } 반환으로 변경
     - parseContent, generateFromFacts, reviewV2 등 모든 호출부 수정
     ⚠️ callClaude 반환값 변경으로 인한 모든 호출부 수정 필수

□ 4. src/components/layout/TokenUsageBadge.jsx 신규 생성

□ 5. src/App.jsx에 SessionTracker 관리 로직 추가
     - sessionTrackerRef, tokenSummary state
     - RepurposeHub, Create에 tracker prop 전달

□ 6. src/components/repurpose/RepurposeHub.jsx에 tracker 연결
     - generateChannelContent, reviewChannelContent 호출 시 tracker 전달
     - TokenUsageBadge 렌더링

□ 7. src/components/create/Create.jsx에 tracker 연결
     - parseContent, generateFromFacts 등 호출 시 tracker 전달
     - TokenUsageBadge 렌더링

□ 8. (선택) src/components/dashboard/Dashboard.jsx에 주간 비용 차트 추가
```

---

## 주의사항

1. **callClaude / callClaudeForChannel 반환값 변경이 가장 위험한 부분**
   - 기존에 `string`을 반환하던 것이 `{ text, usage }`로 바뀌므로
   - 이 함수를 호출하는 모든 곳(~15곳)을 빠짐없이 수정해야 함
   - 하나라도 놓치면 `undefined` 에러 발생

2. **환율은 하드코딩**
   - KRW_PER_USD = 1450 (수동 업데이트 필요)
   - 나중에 필요하면 환율 API 연동 가능하지만 지금은 불필요

3. **Proxy 서버가 usage를 패스스루하는지 확인**
   - `britzmedi-api-proxy.mmakid.workers.dev`가 Claude API의 `usage` 필드를 
     응답에 포함시키는지 확인 필요
   - Cloudflare Workers에서 response를 그대로 패스스루하면 문제 없음
   - 만약 usage가 안 오면 → Proxy 수정 필요

4. **localStorage 정리 정책**
   - 30일 이상 된 일별 데이터는 자동 삭제하는 로직 추가 권장
   - 구현: 앱 초기화 시 오래된 `bm-token-usage-YYYY-MM-DD` 키 삭제
```

---

## 비용 추정 참고표 (마케터용)

이 표를 UI 어딘가에 "ℹ️ 비용 안내" 토글로 넣으면 유용:

| 작업 | 예상 비용 (건당) |
|------|-----------------|
| 보도자료 1건 (6단계 전체) | ₩80~120 |
| 채널 콘텐츠 1개 (생성+검수+보정) | ₩80~130 |
| 보도자료 + 5채널 풀세트 | ₩400~600 |
| 비-보도자료 + 3채널 | ₩200~350 |
| **월 30건 기준** | **₩8,000~15,000** |

> 참고: 실제 비용은 입력 텍스트 길이와 채널 수에 따라 달라집니다.
> Claude Sonnet 4.5 기준, 환율 ₩1,450/$ 기준.
