# Phase 2: 수정 이력 자동 추적 시스템

## 배경

Content Intelligence 학습 루프의 핵심 데이터를 자동 수집하는 작업.
현재 보도자료 생성 시 검수/보정 데이터가 흐르고 있지만 저장하지 않고 버리고 있음.
채널 콘텐츠는 검수 파이프라인 자체가 없음.

이 작업은 Phase 2-A, 2-B, 2-C 세 파트로 구성.

---

## Phase 2-A: 보도자료 — 기존 검수/보정 데이터 캡처

현재 Create.jsx의 보도자료 생성 흐름:
```
STEP 3 [생성] → generateFromFacts() → 초안 텍스트
STEP 4 [검수] → reviewV2() → { summary, issues[] }
             → autoFixContent() → { fixedContent, fixes[], needsInput[] }
STEP 5 [결과] → 최종 텍스트 표시
```

### 수정 1: Create.jsx — STEP 3 완료 시 초안 캡처

generateFromFacts() 완료 후, 검수 전 초안을 별도 변수에 저장:

```javascript
// STEP 3 완료 시점 (generateFromFacts 결과를 받은 직후)
const aiRawDraft = generatedText; // 검수 전 원본 초안
```

이 값을 state나 ref로 보관해야 STEP 4 이후에도 접근 가능.

### 수정 2: Create.jsx — STEP 4 완료 시 검수 결과 + 보정 결과 캡처

reviewV2() 결과와 autoFixContent() 결과를 저장:

```javascript
// reviewV2 완료 시
const reviewResults = { summary, issues }; // 검수 결과

// autoFixContent 완료 시 (이슈가 있었을 때만)
const aiCorrectedText = fixedContent; // 보정 후 텍스트
const autoFixes = fixes; // 어떤 수정이 적용됐는지
```

### 수정 3: Create.jsx — STEP 5 (결과 저장) 시 edit_history + press_releases 업데이트

savePressRelease() 호출하는 부분을 찾아서, 아래 데이터를 함께 저장:

```javascript
// press_releases 테이블에 저장할 때:
const pressReleaseData = {
  ...기존 데이터,
  ai_draft: aiRawDraft,           // 검수 전 초안 (★ 새로 추가)
  final_text: aiCorrectedText || aiRawDraft,  // 보정본 또는 초안 (이슈 없었으면 초안 그대로)
  // edit_distance, edit_ratio는 아래에서 계산
};
```

### 수정 4: edit_history 자동 저장

savePressRelease() 성공 후, edit_history에도 저장:

```javascript
// autoFix가 실행됐을 때만 (= 검수에서 이슈가 있었을 때만)
if (aiRawDraft && aiCorrectedText && aiRawDraft !== aiCorrectedText) {
  const { editDistance, editRatio } = calculateEditMetrics(aiRawDraft, aiCorrectedText);
  
  // press_releases의 edit_distance, edit_ratio 업데이트
  await updatePressRelease(savedId, {
    edit_distance: editDistance,
    edit_ratio: editRatio,
    quality_score: reviewResults?.summary ? 
      100 - (reviewResults.summary.critical * 10 + reviewResults.summary.warning * 3) : null,
    review_red: reviewResults?.summary?.critical || 0,
    review_yellow: reviewResults?.summary?.warning || 0
  });
  
  // edit_history 저장
  await saveEditHistory({
    content_type: 'press_release',
    content_id: savedId,
    channel: null,
    before_text: aiRawDraft,
    after_text: aiCorrectedText,
    edit_type: 'auto_review',      // ★ 새 타입: 자동 검수 보정
    edit_pattern: autoFixes?.map(f => f.description).join(' | ') || null,
    edit_reason: formatReviewReason(reviewResults)
  });
}
```

### 수정 5: edit_type 확장

supabaseData.js의 saveEditHistory에서 edit_type check constraint와 관계없이 저장해야 함.
(DB의 check constraint에 'auto_review'가 없을 수 있음)

Supabase SQL Editor에서 실행할 ALTER문도 생성해줘:
```sql
ALTER TABLE edit_history DROP CONSTRAINT IF EXISTS edit_history_edit_type_check;
ALTER TABLE edit_history ADD CONSTRAINT edit_history_edit_type_check 
  CHECK (edit_type IN (
    'tone_change', 'fact_correction', 'term_replacement', 'structure_change',
    'addition', 'deletion', 'style_polish', 'other',
    'auto_review',        -- Phase 2-A: 자동 검수 보정
    'auto_channel_review', -- Phase 2-B: 채널 자동 검수 보정  
    'manual_regenerate'    -- Phase 2-C: 수정 포인트 재생성
  ));
```

이 SQL을 파일로 저장: supabase-phase2-alter.sql

### 수정 6: 유틸 함수 생성

src/lib/editUtils.js 파일 생성:

```javascript
/**
 * 두 텍스트의 변경량을 계산
 */
export function calculateEditMetrics(before, after) {
  if (!before || !after) return { editDistance: 0, editRatio: 0 };
  
  const beforeLen = before.length;
  const afterLen = after.length;
  
  let changes = 0;
  const maxLen = Math.max(beforeLen, afterLen);
  const minLen = Math.min(beforeLen, afterLen);
  
  for (let i = 0; i < minLen; i++) {
    if (before[i] !== after[i]) changes++;
  }
  changes += (maxLen - minLen);
  
  return {
    editDistance: changes,
    editRatio: maxLen > 0 ? parseFloat((changes / maxLen).toFixed(4)) : 0
  };
}

/**
 * 검수 결과를 edit_reason 문자열로 포맷
 */
export function formatReviewReason(reviewResults) {
  if (!reviewResults?.issues?.length) return null;
  
  const reds = reviewResults.issues
    .filter(i => i.severity === 'red' || i.severity === 'critical')
    .map(i => `🔴${i.category}: ${i.message}`);
  const yellows = reviewResults.issues
    .filter(i => i.severity === 'yellow')
    .map(i => `🟡${i.category}: ${i.message}`);
  
  return [...reds, ...yellows].join(' | ');
}

/**
 * autoFix 결과를 edit_pattern 문자열로 포맷
 */
export function formatFixPattern(fixes) {
  if (!fixes?.length) return null;
  return fixes.map(f => f.description).join(' | ');
}
```

---

## Phase 2-B: 채널 콘텐츠 — 검수/보정 파이프라인 추가

현재 RepurposeHub.jsx 흐름:
```
채널 선택 → generateChannelContent() → 후처리 → 끝 (검수 없음)
```

변경 후:
```
채널 선택 → generateChannelContent() (V1) → 검수 → 보정 (V2) → 저장
```

### 수정 1: 채널 검수 함수 확인

claude.js에 reviewMultiChannel() 또는 reviewV2()가 이미 있음.
채널 콘텐츠에 적합한 검수 함수가 있는지 확인:
- reviewMultiChannel()이 있으면 그대로 사용
- 없으면 reviewV2()를 채널용으로 래핑

### 수정 2: 채널 자동 보정 함수 확인

autoFixContent()가 채널 콘텐츠에도 사용 가능한지 확인.
보도자료용이라 채널에 맞지 않을 수 있음 → 필요시 채널용 autoFix 생성.

### 수정 3: RepurposeHub.jsx 수정

각 채널 콘텐츠 생성 후, 검수 + 보정 파이프라인 추가:

```javascript
// 현재 흐름
const channelText = await generateChannelContent(channel, pressRelease);
// → 여기서 끝

// 변경 후
const channelRawDraft = await generateChannelContent(channel, pressRelease); // V1

// 검수 실행
const reviewResult = await reviewChannelContent(channel, channelRawDraft, pressRelease);

let channelFinalText = channelRawDraft;
let autoFixes = null;

// 이슈가 있으면 보정
if (reviewResult.issues?.length > 0) {
  const fixResult = await autoFixChannelContent(channel, channelRawDraft, reviewResult);
  channelFinalText = fixResult.fixedContent || channelRawDraft;
  autoFixes = fixResult.fixes;
}

// DB 저장 (ai_draft = V1, final_text = V2)
await saveChannelContent(pressReleaseId, channel, channelRawDraft); // ai_draft로 저장

// final_text 업데이트 (보정본이 있으면)
if (channelRawDraft !== channelFinalText) {
  // channel_contents의 final_text, edit_distance, edit_ratio 업데이트
  const { editDistance, editRatio } = calculateEditMetrics(channelRawDraft, channelFinalText);
  
  await supabase
    .from('channel_contents')
    .update({
      final_text: channelFinalText,
      final_char_count: channelFinalText.length,
      edit_distance: editDistance,
      edit_ratio: editRatio,
      quality_score: 100 - ((reviewResult.summary?.critical || 0) * 10 + (reviewResult.summary?.warning || 0) * 3)
    })
    .eq('press_release_id', pressReleaseId)
    .eq('channel', channelToDb(channel));
  
  // edit_history 저장
  await saveEditHistory({
    content_type: 'channel',
    content_id: channelContentId, // saveChannelContent의 반환값에서 id 가져오기
    channel: channelToDb(channel),
    before_text: channelRawDraft,
    after_text: channelFinalText,
    edit_type: 'auto_channel_review',
    edit_pattern: formatFixPattern(autoFixes),
    edit_reason: formatReviewReason(reviewResult)
  });
}

// UI에는 최종본(channelFinalText)을 표시
```

### 수정 4: 채널 검수/보정 함수 구현

claude.js 또는 channelGenerate.js에 추가:

```javascript
/**
 * 채널 콘텐츠 검수
 * 보도자료용 reviewV2를 채널에 맞게 래핑
 */
export async function reviewChannelContent(channel, channelText, originalPressRelease) {
  // 채널별 검수 포인트:
  // 공통: 금지어, 의료법, 팩트 대조(원본 보도자료 기준)
  // naver_blog: 해요체 여부, 질문형 소제목, 글자수(2500-3500)
  // email: 격식체, Subject line 존재, 글자수(1500-2500)
  // linkedin: 영문 표현, 해시태그, 글자수(800-1200)
  // kakao: 글자수(300-500)
  // instagram: 글자수(50-150), 해시태그
  
  // reviewV2() 또는 reviewMultiChannel()을 활용하되,
  // 채널별 특화 검수 항목을 프롬프트에 추가
}

/**
 * 채널 콘텐츠 자동 보정
 */
export async function autoFixChannelContent(channel, channelText, reviewResult) {
  // autoFixContent()를 채널용으로 래핑
  // 채널별 톤/문체 규칙을 프롬프트에 포함
}
```

### 수정 5: saveChannelContent 반환값에 id 포함

현재 saveChannelContent()가 id를 반환하는지 확인.
edit_history.content_id에 넣어야 하므로, upsert 후 생성된 row의 id를 반환해야 함.

```javascript
// saveChannelContent 수정
const { data, error } = await supabase
  .from('channel_contents')
  .upsert({...}, { onConflict: 'press_release_id,channel' })
  .select('id')  // ★ id 반환 추가
  .single();

return data; // { id: '...' }
```

### 수정 6: UI 업데이트 — 검수 중 상태 표시

채널 생성 시 검수가 추가되면 시간이 좀 더 걸림.
사용자에게 진행 상태를 보여줘야 함:

```
"링크드인 생성 중..." → "링크드인 검수 중..." → "링크드인 보정 중..." → 완료
```

기존 로딩 상태에 단계 표시 추가.

### ⚠️ 중요: API 호출 횟수 증가

채널당 1회 → 최대 3회(생성+검수+보정)로 증가.
5채널 전체 생성 시: 5회 → 최대 15회.

이건 품질을 위해 필요한 비용이지만, 이슈 없으면 보정 스킵하므로 실제로는 10회 정도.

---

## Phase 2-C: 수정 포인트 (재생성 시)

### 수정 1: 재생성 버튼 영역에 텍스트 입력 추가

보도자료와 채널 콘텐츠 모두, 재생성 버튼 근처에:

```jsx
{showRegenerateOptions && (
  <div>
    <textarea
      placeholder="수정 포인트 (선택): 예) 태국 시장 부분을 더 강조해줘"
      value={editPoint}
      onChange={(e) => setEditPoint(e.target.value)}
      rows={2}
      style={{ width: '100%', marginBottom: '8px' }}
    />
    <button onClick={handleRegenerate}>재생성</button>
  </div>
)}
```

### 수정 2: 재생성 로직에 수정 포인트 주입

```javascript
const handleRegenerate = async () => {
  const beforeText = currentText; // 재생성 전 텍스트
  
  // 수정 포인트가 있으면 프롬프트에 추가
  const extraInstruction = editPoint 
    ? `\n\n[사용자 수정 포인트]\n${editPoint}\n위 포인트를 반드시 반영하여 수정하세요.`
    : '';
  
  // 재생성 실행 (기존 재생성 로직 + extraInstruction 주입)
  const newText = await regenerate(pressRelease, channel, extraInstruction);
  
  // edit_history 저장
  if (beforeText !== newText) {
    await saveEditHistory({
      content_type: isChannel ? 'channel' : 'press_release',
      content_id: contentId,
      channel: isChannel ? channelToDb(channel) : null,
      before_text: beforeText,
      after_text: newText,
      edit_type: 'manual_regenerate',
      edit_pattern: null,
      edit_reason: editPoint || '재생성 (수정 포인트 없음)'
    });
  }
  
  setEditPoint(''); // 입력 필드 초기화
};
```

---

## 빌드 + 테스트

### Phase 2-A 테스트:
1. 보도자료 생성 (검수에서 이슈가 나올 만한 소스 사용)
2. Supabase 확인:
   - press_releases: ai_draft ≠ final_text (보정이 있었으면)
   - press_releases: edit_distance, edit_ratio 값 존재
   - press_releases: review_red, review_yellow 값 존재
   - edit_history: content_type='press_release' row 존재
   - edit_history: edit_reason에 🔴🟡 검수 결과 요약 존재

### Phase 2-B 테스트:
1. 채널 콘텐츠 생성 (아무 채널 1개)
2. UI에 "검수 중..." 상태 표시 확인
3. Supabase 확인:
   - channel_contents: ai_draft(초안) ≠ final_text(보정본)
   - channel_contents: edit_distance, edit_ratio 값 존재
   - edit_history: content_type='channel', channel='naver_blog' 등 row 존재

### Phase 2-C 테스트:
1. 재생성 버튼 옆 수정 포인트 입력 필드 존재 확인
2. 수정 포인트 입력 후 재생성
3. edit_history: edit_type='manual_regenerate', edit_reason에 수정 포인트 텍스트 존재

supabase-phase2-alter.sql은 별도 파일로 생성해줘.
전체 빌드 + 배포 + git push.

---

## 파일 수정 목록 (예상)

1. src/lib/editUtils.js — 새 파일 (calculateEditMetrics, formatReviewReason, formatFixPattern)
2. src/lib/supabaseData.js — saveChannelContent 반환값 수정, 필요시 함수 보강
3. src/components/Create.jsx — Phase 2-A (초안/검수결과/보정결과 캡처 + DB 저장)
4. src/components/RepurposeHub.jsx — Phase 2-B (검수/보정 파이프라인 추가)
5. src/lib/claude.js 또는 channelGenerate.js — Phase 2-B (채널 검수/보정 함수)
6. supabase-phase2-alter.sql — edit_type constraint 확장
