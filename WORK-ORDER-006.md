# WORK-ORDER-006: BRITZMEDI 콘텐츠 팩토리 — 완전 개발 지시서

> **실행 환경:** Claude Code (바이브 코딩)
> **예상 소요:** 약 60분
> **작성일:** 2026-02-15
> **우선순위:** 순서대로 실행. 각 CHECKPOINT를 반드시 통과한 뒤 다음으로 진행.

---

## 📋 실행 순서 총괄

| 순서 | 작업 | 예상시간 | 상태 |
|------|------|----------|------|
| **STEP 0** | 프로젝트 구조 확인 + 의존성 점검 | 2분 | ⬜ |
| **STEP 1** | 수정 1: 숫자 팩트 누락 방지 | 8분 | ⬜ |
| **STEP 2** | 수정 2: 보일러플레이트 중복 + 태그 삭제 | 8분 | ⬜ |
| **CHECKPOINT A** | Phase A 최종 검증 (3개 테스트 소스) | 5분 | ⬜ |
| **STEP 3** | Phase B: 채널 재가공 — 데이터 모델 + UI 뼈대 | 10분 | ⬜ |
| **STEP 4** | Phase B: 4개 채널 AI 프롬프트 + 생성 로직 | 12분 | ⬜ |
| **STEP 5** | Phase B: 채널별 미리보기 + 복사/다운로드 | 8분 | ⬜ |
| **CHECKPOINT B** | Phase B 통합 검증 | 5분 | ⬜ |
| **STEP 6** | Phase C: 파이프라인 워크플로우 | 10분 | ⬜ |
| **STEP 7** | Phase C: 캘린더 + 대시보드 | 10분 | ⬜ |
| **CHECKPOINT C** | Phase C 통합 검증 + 전체 E2E 테스트 | 5분 | ⬜ |

---

## STEP 0: 프로젝트 구조 확인

```bash
# 1. 프로젝트 루트 확인
ls -la
cat package.json | head -30

# 2. 핵심 파일 존재 확인
ls src/constants/prompts.js
ls src/lib/generatePressReleaseDocx.js
ls src/lib/claude.js
ls src/components/create/Create.jsx

# 3. 빌드 확인
npm run build 2>&1 | tail -20

# 4. 기존 테스트 통과 확인
npm test 2>&1 | tail -30
```

**통과 조건:**
- [ ] `package.json` 존재, React 19 + Vite 7 확인
- [ ] 4개 핵심 파일 모두 존재
- [ ] `npm run build` 에러 없음
- [ ] 기존 29개 테스트 전체 PASS

> ⚠️ 실패 시: 에러 메시지를 읽고 먼저 해결. 빌드가 안 되면 이후 작업 불가.

---

## STEP 1: 숫자 팩트 누락 방지 (prompts.js)

### 1-1. 생성 프롬프트 수정

`src/constants/prompts.js` 파일을 열어서 **보도자료 생성(generation) 프롬프트 함수**를 찾는다.

기존 프롬프트의 규칙 섹션 끝에 다음을 **추가**한다:

```
[숫자 팩트 완전성 규칙 — CRITICAL, 반드시 준수]

소스 텍스트에 포함된 모든 숫자 표현(기간, 수량, 금액, 날짜, 퍼센트, 연도, 면적, 인원)을 절대 누락하지 마라.

실행 순서:
1단계 - 추출: 소스에서 숫자가 포함된 표현을 모두 목록으로 추출하라.
  예: "3년 계약", "연 300대", "4월 15일", "하반기"
2단계 - 작성: 본문을 작성하라.
3단계 - 대조: 1단계 목록의 각 항목이 본문에 포함되었는지 1:1 대조하라.
4단계 - 삽입: 누락된 항목이 있으면 가장 적절한 문단에 반드시 삽입하라.

특별 규칙:
- 기간+수량 조합(예: "3년 계약, 연 300대")은 반드시 쌍으로 함께 언급하라.
- "3년"만 쓰거나 "300대"만 쓰면 불완전. 둘 다 있어야 한다.
- 날짜("4월 15일"), 시기("하반기"), 장소("방콕 본사")도 빠뜨리지 마라.
```

### 1-2. 검수 프롬프트 수정

같은 파일에서 **검수(review) 프롬프트 함수**를 찾는다.

기존 검수 규칙 끝에 다음을 **추가**한다:

```
[숫자 팩트 검증 — severity: critical]

1. 소스 원문에서 모든 숫자 표현을 추출하라 (기간, 수량, 금액, 날짜, 퍼센트, 연도).
2. 생성된 본문에서 각 숫자 표현을 검색하라.
3. 소스에 있는 숫자가 본문에 없으면:
   - severity: "critical"
   - type: "fact_omission"
   - message: "[숫자]가 소스에 있으나 본문에서 누락됨"
   - suggestion: 해당 숫자를 포함하는 수정 문장을 제안
4. 기간+수량 쌍 검증: "3년"과 "300대"가 소스에 함께 있으면, 본문에도 둘 다 있는지 확인.
   하나만 있으면 severity: "critical"로 보고.
```

### 1-3. 자동수정 프롬프트 수정

같은 파일에서 **자동수정(autofix) 프롬프트 함수**를 찾는다.

기존 자동수정 규칙에 다음을 **추가**한다:

```
[숫자 팩트 자동 삽입]

검수에서 severity: "critical", type: "fact_omission"으로 보고된 항목은
자동수정 시 반드시 본문에 삽입하라.

삽입 위치 우선순위:
1. 해당 숫자와 가장 관련 있는 기존 문단에 자연스럽게 추가
2. 적절한 문단이 없으면 본문 중반부에 새 문장으로 추가
3. 삽입 후에도 문장이 자연스럽게 읽히도록 전후 맥락을 조정
```

### 1-4. 테스트 작성

`src/__tests__/` 디렉토리에 `step1-number-facts.test.js` 파일을 **새로 생성**한다:

```javascript
/**
 * STEP 1 검증: 숫자 팩트 누락 방지
 *
 * 테스트 소스 2번(파트너십·계약)을 사용:
 * "태국 방콕 Derma Solutions사와 토르RF 독점유통 계약 체결.
 *  3년 계약, 연 300대 규모. 태국 피부과 시장 진출 본격화.
 *  4월 15일 방콕 본사에서 계약식 진행. 올해 하반기부터 납품 시작 예정."
 */

import { describe, it, expect } from 'vitest';
// 프롬프트 함수 import (실제 경로에 맞게 조정)
import { getGenerationPrompt, getReviewPrompt, getAutofixPrompt } from '../../constants/prompts';

const TEST_SOURCE_2 = `태국 방콕 Derma Solutions사와 토르RF 독점유통 계약 체결. 3년 계약, 연 300대 규모. 태국 피부과 시장 진출 본격화. 4월 15일 방콕 본사에서 계약식 진행. 올해 하반기부터 납품 시작 예정.`;

describe('STEP 1: 숫자 팩트 누락 방지', () => {

  it('생성 프롬프트에 숫자 팩트 완전성 규칙이 포함되어야 한다', () => {
    const prompt = getGenerationPrompt({
      channel: '보도자료',
      category: '파트너십',
      source: TEST_SOURCE_2,
      knowledgeBase: []
    });
    expect(prompt).toContain('숫자 팩트 완전성');
    expect(prompt).toContain('1:1 대조');
    expect(prompt).toContain('기간+수량 조합');
  });

  it('검수 프롬프트에 숫자 팩트 검증 규칙이 포함되어야 한다', () => {
    const prompt = getReviewPrompt({
      source: TEST_SOURCE_2,
      generated: '더미 본문',
      knowledgeBase: []
    });
    expect(prompt).toContain('숫자 팩트 검증');
    expect(prompt).toContain('fact_omission');
    expect(prompt).toContain('severity');
    expect(prompt).toContain('critical');
  });

  it('자동수정 프롬프트에 숫자 팩트 자동 삽입 규칙이 포함되어야 한다', () => {
    const prompt = getAutofixPrompt({
      source: TEST_SOURCE_2,
      generated: '더미 본문',
      reviewResult: { issues: [] }
    });
    expect(prompt).toContain('숫자 팩트 자동 삽입');
    expect(prompt).toContain('fact_omission');
  });

  it('소스 2에서 추출해야 할 핵심 숫자 목록 확인', () => {
    // 이 테스트는 프롬프트가 아니라, 우리가 기대하는 숫자 목록을 문서화
    const expectedNumbers = ['3년', '300대', '4월 15일', '하반기'];
    expectedNumbers.forEach(num => {
      expect(TEST_SOURCE_2).toContain(num);
    });
  });
});
```

**실행:**
```bash
npx vitest run src/__tests__/step1-number-facts.test.js
```

**통과 조건:**
- [ ] 4개 테스트 전체 PASS
- [ ] 기존 29개 테스트도 여전히 PASS (`npx vitest run`)

> ⚠️ import 경로가 실제 프로젝트와 다를 수 있음. 프롬프트 함수명과 파라미터를 `prompts.js` 실제 코드에 맞게 조정할 것.

---

## STEP 2: 보일러플레이트 중복 + 태그 삭제

### 2-1. Word 문서에서 보일러플레이트 텍스트 나열 삭제

`src/lib/generatePressReleaseDocx.js` 파일을 연다.

보일러플레이트(회사 소개) 섹션을 찾는다. 현재 3중 구조:

```
① 서술형 소개문: "브릿츠메디는 2017년 설립된..." → 유지
② 텍스트 나열: "회사명: / 설립: / 대표이사: / 본사: / 홈페이지:" → 삭제
③ 하단 연락처 테이블: 회사 정보 포함 → 유지
```

**작업:** ②번 텍스트 나열 부분을 찾아서 완전히 삭제한다.

찾는 방법: "회사명:" 또는 "설립:" 또는 "대표이사:" 키워드로 검색. 해당 Paragraph 블록들을 통째로 제거.

### 2-2. Word 문서에서 [태그] 섹션 삭제

같은 `generatePressReleaseDocx.js` 파일에서 태그(tag/hashtag) 관련 섹션을 찾는다.

**작업:**
1. `[태그]`, `태그:`, `#` 해시태그 섹션을 생성하는 코드를 찾아서 제거
2. AI가 생성한 본문에 `[태그: ...]` 텍스트가 남아있을 수 있으므로, Word 생성 직전에 필터링 로직 추가:

```javascript
// generatePressReleaseDocx.js 안에서 본문 텍스트를 받는 부분에 추가
// 태그 섹션 필터링
const cleanBody = bodyText
  .replace(/\[태그[:\s].*?\]/g, '')
  .replace(/\n태그[:\s].*$/gm, '')
  .replace(/\n#\S+(\s+#\S+)*/g, '')
  .trim();
```

### 2-3. 생성 프롬프트에서 태그 금지

`src/constants/prompts.js` — 생성 프롬프트에 다음 규칙을 **추가**:

```
[태그 금지 — 보도자료 채널 전용]
보도자료 채널에서는 태그, 해시태그, [태그: ...] 섹션을 절대 생성하지 마라.
보도자료는 공식 보도문이므로 SNS형 태그가 들어가면 안 된다.
```

### 2-4. Create.jsx에서 보도자료 선택 시 태그 필드 숨김 확인

`src/components/create/Create.jsx`를 열어서 태그 입력 필드가 있는지 확인.

- 보도자료 채널 선택 시 태그 관련 UI가 이미 숨겨져 있으면 → 패스
- 숨겨져 있지 않으면 → 조건부 렌더링 추가:

```jsx
{channel !== '보도자료' && (
  <div className="tag-input-section">
    {/* 태그 입력 UI */}
  </div>
)}
```

### 2-5. 테스트 작성

`src/__tests__/step2-boilerplate-tags.test.js` 파일을 **새로 생성**:

```javascript
/**
 * STEP 2 검증: 보일러플레이트 중복 제거 + 태그 삭제
 */

import { describe, it, expect } from 'vitest';
import { getGenerationPrompt } from '../../constants/prompts';

describe('STEP 2: 보일러플레이트 & 태그', () => {

  it('생성 프롬프트에 태그 금지 규칙이 포함되어야 한다', () => {
    const prompt = getGenerationPrompt({
      channel: '보도자료',
      category: '파트너십',
      source: '테스트 소스',
      knowledgeBase: []
    });
    expect(prompt).toContain('태그');
    expect(prompt.toLowerCase()).toMatch(/태그.*금지|태그.*생성하지/);
  });

  it('태그 필터링 함수가 [태그: ...] 패턴을 제거해야 한다', () => {
    const testBody = `
브릿츠메디가 태국 시장에 진출한다.
본문 내용이 여기에 있다.

[태그: #브릿츠메디 #토르RF #태국 #피부과]
    `.trim();

    const cleaned = testBody
      .replace(/\[태그[:\s].*?\]/g, '')
      .replace(/\n태그[:\s].*$/gm, '')
      .replace(/\n#\S+(\s+#\S+)*/g, '')
      .trim();

    expect(cleaned).not.toContain('[태그');
    expect(cleaned).not.toContain('#브릿츠메디');
    expect(cleaned).toContain('브릿츠메디가 태국 시장에 진출한다');
  });
});
```

**실행:**
```bash
npx vitest run src/__tests__/step2-boilerplate-tags.test.js
```

**통과 조건:**
- [ ] 2개 테스트 PASS
- [ ] 기존 + STEP 1 테스트도 전체 PASS

---

## ✅ CHECKPOINT A: Phase A 최종 검증

STEP 1, 2를 모두 완료한 뒤 전체 검증한다.

```bash
# 1. 전체 테스트 실행
npx vitest run

# 2. 빌드 확인
npm run build

# 3. 수동 확인 (빌드 성공 후 콘솔에서 프롬프트 확인)
node -e "
  const p = require('./src/constants/prompts.js');
  // 생성 프롬프트에 숫자 팩트 규칙 있는지 확인
  const gen = p.getGenerationPrompt({channel:'보도자료', category:'파트너십', source:'test', knowledgeBase:[]});
  console.log('=== 생성 프롬프트 숫자팩트 규칙 ===');
  console.log(gen.includes('숫자 팩트 완전성') ? '✅ 포함됨' : '❌ 누락');
  console.log(gen.includes('태그') ? '✅ 태그 규칙 포함됨' : '❌ 태그 규칙 누락');
"
```

**CHECKPOINT A 통과 조건:**
- [ ] 전체 테스트 PASS (기존 29개 + 새 테스트 6개 = 35개+)
- [ ] 빌드 에러 없음
- [ ] 생성 프롬프트에 "숫자 팩트 완전성" 포함 확인
- [ ] 생성 프롬프트에 "태그" 금지 규칙 포함 확인
- [ ] `generatePressReleaseDocx.js`에서 텍스트 나열(②번) 코드 제거 확인

> 🛑 CHECKPOINT A 실패 시 Phase B로 진행하지 마라. 여기서 멈추고 문제를 먼저 해결.

---

## STEP 3: Phase B — 데이터 모델 + UI 뼈대

### 3-0. Phase B 개요

보도자료 발행 완료 후 → "채널 콘텐츠 만들기" 버튼 → 4개 채널 재가공.

| 채널 | 형식 | 분량 | 톤 |
|------|------|------|-----|
| 네이버 블로그 | SEO 최적화, 소제목/이미지 위치 지정 | 1,500~2,500자 | 정보 전달형, 친근하되 전문적 |
| 카카오톡 채널 | 카드뉴스형 요약 | 300~500자 | 간결, 핵심 포인트 강조 |
| 인스타그램 | 캐러셀 슬라이드 텍스트 | 슬라이드 5~7장 | 임팩트, 비주얼 중심 텍스트 |
| 링크드인 | 전문가 톤, 영문 가능 | 800~1,200자 | 비즈니스 전문가, 인사이트 중심 |

### 3-1. 채널 재가공 상태 관리용 상수 추가

`src/constants/channels.js` 파일을 **새로 생성**:

```javascript
/**
 * 채널 재가공 상수
 * Phase B: 보도자료 → 4개 채널 재가공
 */

export const REPURPOSE_CHANNELS = [
  {
    id: 'naver-blog',
    name: '네이버 블로그',
    icon: '📝',
    format: 'SEO 최적화 블로그 포스트',
    charRange: { min: 1500, max: 2500 },
    tone: '정보 전달형, 친근하되 전문적',
    features: ['소제목 자동 생성', '이미지 위치 지정', 'SEO 키워드 삽입'],
    outputFormat: 'html', // 네이버 블로그 에디터 붙여넣기용
  },
  {
    id: 'kakao',
    name: '카카오톡 채널',
    icon: '💬',
    format: '카드뉴스형 요약',
    charRange: { min: 300, max: 500 },
    tone: '간결하고 핵심 강조',
    features: ['핵심 문장 3-5개', '이모지 활용', 'CTA 문구'],
    outputFormat: 'text',
  },
  {
    id: 'instagram',
    name: '인스타그램',
    icon: '📸',
    format: '캐러셀 슬라이드 텍스트',
    charRange: { min: 50, max: 150 }, // 슬라이드당
    slideCount: { min: 5, max: 7 },
    tone: '임팩트, 비주얼 중심',
    features: ['슬라이드별 텍스트', '해시태그 세트', '첫 슬라이드 훅'],
    outputFormat: 'slides', // 슬라이드 배열
  },
  {
    id: 'linkedin',
    name: '링크드인',
    icon: '💼',
    format: '전문가 포스트',
    charRange: { min: 800, max: 1200 },
    tone: '비즈니스 전문가, 인사이트 중심',
    features: ['영문 옵션', '전문가 코멘트', '산업 인사이트'],
    outputFormat: 'text',
    languageOptions: ['ko', 'en', 'ko+en'], // 한국어, 영문, 이중언어
  },
];

export const REPURPOSE_STATUS = {
  IDLE: 'idle',
  GENERATING: 'generating',
  GENERATED: 'generated',
  EDITING: 'editing',
  APPROVED: 'approved',
  PUBLISHED: 'published',
};
```

### 3-2. Supabase 테이블 추가

Supabase 대시보드 또는 SQL Editor에서 실행할 마이그레이션:

```sql
-- Phase B: 채널 재가공 콘텐츠 테이블
CREATE TABLE IF NOT EXISTS channel_contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  press_release_id UUID REFERENCES press_releases(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('naver-blog', 'kakao', 'instagram', 'linkedin')),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'generating', 'generated', 'editing', 'approved', 'published')),
  language TEXT DEFAULT 'ko' CHECK (language IN ('ko', 'en', 'ko+en')),

  -- 생성된 콘텐츠
  title TEXT,
  body TEXT,
  slides JSONB,              -- 인스타그램 슬라이드 배열
  hashtags TEXT[],            -- 해시태그 배열
  seo_keywords TEXT[],        -- SEO 키워드 (블로그용)
  image_positions JSONB,      -- 이미지 위치 지정 정보

  -- 메타
  char_count INTEGER,
  ai_model TEXT DEFAULT 'claude',
  generated_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(press_release_id, channel)  -- 보도자료 1개당 채널 1개씩
);

-- 인덱스
CREATE INDEX idx_channel_contents_press_release ON channel_contents(press_release_id);
CREATE INDEX idx_channel_contents_status ON channel_contents(status);
CREATE INDEX idx_channel_contents_channel ON channel_contents(channel);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_channel_contents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channel_contents_updated
  BEFORE UPDATE ON channel_contents
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_contents_timestamp();
```

> ⚠️ Supabase SQL Editor에서 실행. `press_releases` 테이블이 이미 있어야 함. 없으면 참조 제약 제거 후 실행.

### 3-3. 채널 재가공 UI 컴포넌트 생성

`src/components/repurpose/` 디렉토리를 새로 만든다.

#### 3-3-1. `RepurposeHub.jsx` — 메인 허브

```jsx
/**
 * RepurposeHub: 보도자료 선택 → 4채널 재가공 허브
 *
 * 구조:
 * ┌─────────────────────────────────────────────┐
 * │  📰 원본 보도자료 요약 (접을 수 있음)          │
 * ├─────────────────────────────────────────────┤
 * │  📝 네이버블로그  │ 💬 카카오톡  │ 📸 인스타  │ 💼 링크드인 │
 * │  [생성하기]       │ [생성하기]   │ [생성하기]  │ [생성하기]  │
 * │   ✅ 완료        │  ⬜ 미생성   │  🔄 생성중  │  ⬜ 미생성  │
 * └─────────────────────────────────────────────┘
 */

import React, { useState, useEffect } from 'react';
import { REPURPOSE_CHANNELS, REPURPOSE_STATUS } from '../../constants/channels';
import ChannelCard from './ChannelCard';
import ChannelPreview from './ChannelPreview';

export default function RepurposeHub({ pressRelease }) {
  const [channelStates, setChannelStates] = useState({});
  const [activeChannel, setActiveChannel] = useState(null);
  const [generatedContents, setGeneratedContents] = useState({});

  // 각 채널의 상태 초기화
  useEffect(() => {
    if (pressRelease) {
      const initial = {};
      REPURPOSE_CHANNELS.forEach(ch => {
        initial[ch.id] = REPURPOSE_STATUS.IDLE;
      });
      setChannelStates(initial);
      // TODO: Supabase에서 기존 생성 내역 로드
    }
  }, [pressRelease]);

  const handleGenerate = async (channelId) => {
    setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATING }));
    setActiveChannel(channelId);

    try {
      // Claude API 호출 (STEP 4에서 구현)
      const result = await generateChannelContent(pressRelease, channelId);
      setGeneratedContents(prev => ({ ...prev, [channelId]: result }));
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATED }));
    } catch (error) {
      console.error(`채널 생성 실패: ${channelId}`, error);
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.IDLE }));
    }
  };

  if (!pressRelease) {
    return (
      <div className="text-center py-12 text-gray-500">
        보도자료를 먼저 선택해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 원본 보도자료 요약 */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="font-semibold cursor-pointer">
          📰 원본 보도자료: {pressRelease.title}
        </summary>
        <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">
          {pressRelease.body?.substring(0, 500)}...
        </div>
      </details>

      {/* 4채널 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {REPURPOSE_CHANNELS.map(channel => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            status={channelStates[channel.id]}
            isActive={activeChannel === channel.id}
            onGenerate={() => handleGenerate(channel.id)}
            onSelect={() => setActiveChannel(channel.id)}
            hasContent={!!generatedContents[channel.id]}
          />
        ))}
      </div>

      {/* 선택된 채널 미리보기 */}
      {activeChannel && generatedContents[activeChannel] && (
        <ChannelPreview
          channel={REPURPOSE_CHANNELS.find(c => c.id === activeChannel)}
          content={generatedContents[activeChannel]}
          onEdit={(updated) => {
            setGeneratedContents(prev => ({ ...prev, [activeChannel]: updated }));
            setChannelStates(prev => ({ ...prev, [activeChannel]: REPURPOSE_STATUS.EDITING }));
          }}
        />
      )}
    </div>
  );
}
```

#### 3-3-2. `ChannelCard.jsx` — 개별 채널 카드

```jsx
import React from 'react';
import { REPURPOSE_STATUS } from '../../constants/channels';

const STATUS_LABELS = {
  [REPURPOSE_STATUS.IDLE]: { text: '미생성', color: 'bg-gray-100 text-gray-500' },
  [REPURPOSE_STATUS.GENERATING]: { text: '생성 중...', color: 'bg-blue-100 text-blue-600' },
  [REPURPOSE_STATUS.GENERATED]: { text: '완료', color: 'bg-green-100 text-green-600' },
  [REPURPOSE_STATUS.EDITING]: { text: '수정 중', color: 'bg-yellow-100 text-yellow-600' },
  [REPURPOSE_STATUS.APPROVED]: { text: '승인됨', color: 'bg-purple-100 text-purple-600' },
  [REPURPOSE_STATUS.PUBLISHED]: { text: '발행됨', color: 'bg-indigo-100 text-indigo-600' },
};

export default function ChannelCard({ channel, status, isActive, onGenerate, onSelect, hasContent }) {
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS[REPURPOSE_STATUS.IDLE];

  return (
    <div
      className={`
        rounded-xl border-2 p-4 cursor-pointer transition-all
        ${isActive ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={hasContent ? onSelect : undefined}
    >
      <div className="text-3xl mb-2">{channel.icon}</div>
      <h3 className="font-bold text-sm">{channel.name}</h3>
      <p className="text-xs text-gray-500 mt-1">{channel.format}</p>
      <p className="text-xs text-gray-400">
        {channel.slideCount
          ? `${channel.slideCount.min}-${channel.slideCount.max}장`
          : `${channel.charRange.min.toLocaleString()}-${channel.charRange.max.toLocaleString()}자`
        }
      </p>

      {/* 상태 배지 */}
      <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>

      {/* 생성 버튼 */}
      {(status === REPURPOSE_STATUS.IDLE || status === REPURPOSE_STATUS.GENERATED) && (
        <button
          onClick={(e) => { e.stopPropagation(); onGenerate(); }}
          className="mt-3 w-full py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
        >
          {status === REPURPOSE_STATUS.GENERATED ? '재생성' : '생성하기'}
        </button>
      )}

      {status === REPURPOSE_STATUS.GENERATING && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-600">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          AI 생성 중...
        </div>
      )}
    </div>
  );
}
```

#### 3-3-3. `ChannelPreview.jsx` — 미리보기 + 편집 + 복사 (뼈대)

```jsx
import React, { useState } from 'react';

export default function ChannelPreview({ channel, content, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleCopy = () => {
    const textToCopy = channel.id === 'instagram'
      ? content.slides?.map((s, i) => `[슬라이드 ${i + 1}] ${s}`).join('\n\n')
      : content.body || '';

    navigator.clipboard.writeText(textToCopy);
    // TODO: 토스트 알림
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">
          {channel.icon} {channel.name} 미리보기
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
          >
            {isEditing ? '미리보기' : '편집'}
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            복사
          </button>
        </div>
      </div>

      {/* 콘텐츠 영역: STEP 5에서 채널별 렌더링 구현 */}
      <div className="prose max-w-none">
        {channel.id === 'instagram' ? (
          <InstagramPreview slides={content.slides} hashtags={content.hashtags} isEditing={isEditing} />
        ) : (
          <div>
            {content.title && <h4 className="font-bold mb-2">{content.title}</h4>}
            {isEditing ? (
              <textarea
                className="w-full h-64 border rounded-lg p-3 text-sm"
                value={editedContent.body || ''}
                onChange={(e) => setEditedContent({ ...editedContent, body: e.target.value })}
              />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{content.body}</div>
            )}
            {content.hashtags?.length > 0 && (
              <div className="mt-3 text-sm text-blue-600">
                {content.hashtags.map(tag => `#${tag}`).join(' ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 글자수 카운터 */}
      <div className="mt-3 text-xs text-gray-400 text-right">
        {(content.body || '').length}자
        ({channel.charRange.min}~{channel.charRange.max}자 권장)
      </div>
    </div>
  );
}

function InstagramPreview({ slides = [], hashtags = [], isEditing }) {
  return (
    <div className="space-y-3">
      {slides.map((slide, index) => (
        <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
          <span className="text-xs font-bold text-purple-600">슬라이드 {index + 1}</span>
          <p className="mt-1 text-sm font-medium">{slide}</p>
        </div>
      ))}
      {hashtags?.length > 0 && (
        <div className="text-sm text-blue-600">
          {hashtags.map(tag => `#${tag}`).join(' ')}
        </div>
      )}
    </div>
  );
}
```

### 3-4. 네비게이션 연결

`Create.jsx` 또는 메인 라우터에서 보도자료 발행 완료 후 → RepurposeHub로 이동하는 버튼/탭을 추가.

보도자료 생성 완료 상태일 때 "채널 콘텐츠 만들기" 버튼이 활성화되도록:

```jsx
// Create.jsx 또는 해당 컴포넌트에서
{pressReleaseCompleted && (
  <button
    onClick={() => setActiveTab('repurpose')}
    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
  >
    📢 채널 콘텐츠 만들기
  </button>
)}
```

### 3-5. 빌드 확인

```bash
npm run build
```

**통과 조건:**
- [ ] 빌드 에러 없음
- [ ] `src/components/repurpose/` 디렉토리에 3개 파일 존재
- [ ] `src/constants/channels.js` 파일 존재
- [ ] 기존 기능 깨지지 않음

---

## STEP 4: Phase B — 4개 채널 AI 프롬프트 + 생성 로직

### 4-1. 채널별 프롬프트 추가

`src/constants/prompts.js` 파일에 **채널 재가공 프롬프트 함수를 추가**한다.

```javascript
/**
 * 채널 재가공 프롬프트 생성기
 * @param {string} channelId - 'naver-blog' | 'kakao' | 'instagram' | 'linkedin'
 * @param {object} pressRelease - 원본 보도자료 { title, body, source, category }
 * @param {object} options - { language: 'ko'|'en'|'ko+en' }
 */
export function getRepurposePrompt(channelId, pressRelease, options = {}) {
  const { language = 'ko' } = options;

  const baseContext = `
아래는 이미 발행된 보도자료이다. 이 보도자료를 기반으로 채널 콘텐츠를 재가공하라.

[원본 보도자료 제목]
${pressRelease.title}

[원본 보도자료 본문]
${pressRelease.body}

[공통 규칙]
1. 원본 보도자료의 팩트만 사용하라. 새로운 팩트를 만들지 마라.
2. 숫자, 날짜, 고유명사는 원본과 동일하게 유지하라.
3. 의료법 금지어(최고, 최초, 유일, 획기적, 혁신적, 완치 등) 사용 금지.
4. 자사 제품명은 정확히 표기: 토르RF, 루미노웨이브, 뉴채, 울블랑.
5. 영문 표기: 첫 등장 시 '국문(영문)', 이후 국문만.
`;

  const channelPrompts = {
    'naver-blog': `
${baseContext}

[채널: 네이버 블로그]
형식: SEO 최적화 블로그 포스트
분량: 1,500~2,500자

요구사항:
1. 제목: SEO 키워드가 포함된 매력적인 블로그 제목 (보도자료 제목과 다르게)
2. 소제목: 3~5개의 H2 소제목으로 구조화
3. 본문: 각 소제목 아래 2~3개 문단. 친근하되 전문적인 톤.
4. 이미지 위치: 각 소제목 사이에 [IMAGE: 설명] 플레이스홀더 삽입
5. SEO 키워드: 5~8개 추출 (본문에 자연스럽게 분포)
6. CTA: 마지막에 자연스러운 행동 유도 문구
7. 보도문체 금지: "~했다", "~밝혔다" 등 보도문체 대신 블로그 톤("~인데요", "~했습니다")

출력 형식:
---
제목: (블로그 제목)
SEO키워드: (쉼표 구분)
---
(본문 - 소제목, 이미지위치 포함)
`,

    'kakao': `
${baseContext}

[채널: 카카오톡 채널]
형식: 카드뉴스형 요약 메시지
분량: 300~500자

요구사항:
1. 첫 줄: 한 줄 임팩트 헤드라인 (10~20자)
2. 핵심 포인트: 3~5개 불릿 요약 (각 1~2줄)
3. 이모지: 각 불릿 앞에 적절한 이모지 1개
4. CTA: 마지막에 "자세히 보기 👉" 같은 행동 유도
5. 톤: 간결하고 명확. 군더더기 없이 핵심만.
6. 줄바꿈: 가독성을 위해 적절히 활용

출력 형식:
(첫 줄 헤드라인)

(불릿 요약들)

(CTA)
`,

    'instagram': `
${baseContext}

[채널: 인스타그램 캐러셀]
형식: 슬라이드 5~7장 텍스트
분량: 슬라이드당 50~150자

요구사항:
1. 슬라이드 1 (커버): 한 줄 훅 + 부제목. 스크롤을 멈추게 하는 문장.
2. 슬라이드 2~5: 핵심 메시지를 한 슬라이드에 하나씩. 짧고 임팩트있게.
3. 슬라이드 6 (또는 마지막): CTA + 브랜드 태그
4. 각 슬라이드는 독립적으로 읽혀도 의미가 통해야 함
5. 해시태그: 슬라이드 밖에 15~20개 (산업 관련 + 브랜드 + 일반)

출력 형식 (JSON):
{
  "slides": [
    "슬라이드 1 텍스트",
    "슬라이드 2 텍스트",
    ...
  ],
  "hashtags": ["태그1", "태그2", ...],
  "caption": "피드 캡션 텍스트 (선택)"
}
`,

    'linkedin': `
${baseContext}

[채널: 링크드인]
형식: 전문가 포스트
분량: 800~1,200자
언어: ${language === 'en' ? '영문' : language === 'ko+en' ? '한국어 + 영문 번역 모두' : '한국어'}

요구사항:
1. 첫 줄: 강렬한 훅 (스크롤을 멈추는 질문이나 통계)
2. 본문: 전문가 관점에서 산업 인사이트를 녹여서 작성
3. 톤: 비즈니스 전문가가 자사 소식을 공유하는 느낌
4. 구조: 훅 → 맥락 → 핵심 소식 → 의미/인사이트 → CTA
5. 줄바꿈: 링크드인 특성상 짧은 문단 + 빈 줄 활용
6. 마무리: "이 소식에 대해 어떻게 생각하시나요?" 같은 인게이지먼트 질문
7. 해시태그: 3~5개 (산업 전문 태그)

${language === 'ko+en' ? `
이중언어 출력 형식:
---한국어---
(한국어 본문)
---English---
(영문 본문)
` : ''}

출력 형식:
(본문)

(해시태그)
`,
  };

  return channelPrompts[channelId] || '';
}
```

### 4-2. 채널 콘텐츠 생성 함수

`src/lib/channelGenerate.js` 파일을 **새로 생성**:

```javascript
/**
 * 채널 콘텐츠 생성 함수
 * 보도자료 → Claude API → 채널별 콘텐츠
 */

import { callClaude } from './claude';
import { getRepurposePrompt } from '../constants/prompts';
import { REPURPOSE_CHANNELS } from '../constants/channels';

/**
 * 단일 채널 콘텐츠 생성
 */
export async function generateChannelContent(pressRelease, channelId, options = {}) {
  const channel = REPURPOSE_CHANNELS.find(c => c.id === channelId);
  if (!channel) throw new Error(`알 수 없는 채널: ${channelId}`);

  const prompt = getRepurposePrompt(channelId, pressRelease, options);

  const response = await callClaude({
    prompt,
    maxTokens: channelId === 'kakao' ? 1000 : 2000,
    temperature: 0.7,
  });

  // 채널별 응답 파싱
  return parseChannelResponse(channelId, response);
}

/**
 * 전체 채널 일괄 생성
 */
export async function generateAllChannels(pressRelease, options = {}) {
  const results = {};
  const errors = {};

  for (const channel of REPURPOSE_CHANNELS) {
    try {
      results[channel.id] = await generateChannelContent(pressRelease, channel.id, options);
    } catch (error) {
      errors[channel.id] = error.message;
      console.error(`[${channel.name}] 생성 실패:`, error);
    }
  }

  return { results, errors };
}

/**
 * 채널별 응답 파싱
 */
function parseChannelResponse(channelId, rawResponse) {
  const text = typeof rawResponse === 'string' ? rawResponse : rawResponse?.content || '';

  switch (channelId) {
    case 'naver-blog':
      return parseNaverBlog(text);
    case 'kakao':
      return parseKakao(text);
    case 'instagram':
      return parseInstagram(text);
    case 'linkedin':
      return parseLinkedin(text);
    default:
      return { body: text };
  }
}

function parseNaverBlog(text) {
  // --- 헤더 파싱 ---
  const titleMatch = text.match(/제목:\s*(.+)/);
  const keywordsMatch = text.match(/SEO키워드:\s*(.+)/);

  // --- 이후 본문 ---
  const bodyStart = text.indexOf('---', text.indexOf('---') + 3);
  const body = bodyStart > 0 ? text.substring(bodyStart + 3).trim() : text;

  // 이미지 위치 추출
  const imagePositions = [];
  const imageRegex = /\[IMAGE:\s*(.+?)\]/g;
  let match;
  while ((match = imageRegex.exec(body)) !== null) {
    imagePositions.push({ position: match.index, description: match[1] });
  }

  return {
    title: titleMatch?.[1]?.trim() || '',
    body,
    seoKeywords: keywordsMatch?.[1]?.split(',').map(k => k.trim()).filter(Boolean) || [],
    imagePositions,
    charCount: body.length,
  };
}

function parseKakao(text) {
  return {
    body: text.trim(),
    charCount: text.trim().length,
  };
}

function parseInstagram(text) {
  // JSON 파싱 시도
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        slides: parsed.slides || [],
        hashtags: parsed.hashtags || [],
        caption: parsed.caption || '',
        charCount: parsed.slides?.join('').length || 0,
      };
    }
  } catch (e) {
    // JSON 파싱 실패 시 텍스트 기반 파싱
  }

  // 폴백: 슬라이드 텍스트 파싱
  const slides = text.split(/\n\n+/)
    .filter(s => s.trim())
    .map(s => s.replace(/^슬라이드\s*\d+[:\s]*/i, '').trim());

  const hashtagLine = slides.find(s => s.startsWith('#'));
  const hashtags = hashtagLine
    ? hashtagLine.match(/#(\S+)/g)?.map(t => t.replace('#', '')) || []
    : [];

  return {
    slides: slides.filter(s => !s.startsWith('#')),
    hashtags,
    caption: '',
    charCount: slides.join('').length,
  };
}

function parseLinkedin(text) {
  // 해시태그 추출
  const hashtagRegex = /#(\S+)/g;
  const hashtags = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  // 이중언어 파싱
  const koMatch = text.match(/---한국어---\s*([\s\S]*?)---English---/);
  const enMatch = text.match(/---English---\s*([\s\S]*?)$/);

  if (koMatch && enMatch) {
    return {
      body: koMatch[1].trim(),
      bodyEn: enMatch[1].trim(),
      hashtags,
      language: 'ko+en',
      charCount: koMatch[1].trim().length,
    };
  }

  return {
    body: text.trim(),
    hashtags,
    charCount: text.trim().length,
  };
}
```

### 4-3. RepurposeHub에 생성 함수 연결

`src/components/repurpose/RepurposeHub.jsx`의 `handleGenerate` 함수에서 실제 `generateChannelContent`를 import하고 호출하도록 수정:

```javascript
import { generateChannelContent } from '../../lib/channelGenerate';
```

### 4-4. 테스트 작성

`src/__tests__/step4-channel-prompts.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { getRepurposePrompt } from '../../constants/prompts';

const MOCK_PRESS_RELEASE = {
  title: '브릿츠메디, 태국 더마 솔루션스와 토르RF 독점유통 계약 체결',
  body: '브릿츠메디가 태국 방콕 소재 더마 솔루션스와 3년간 연 300대 규모의 토르RF 독점유통 계약을 체결했다. 4월 15일 방콕 본사에서 계약식이 진행되었으며, 올해 하반기부터 납품을 시작할 예정이다.',
  source: '태국 방콕 Derma Solutions사와 토르RF 독점유통 계약 체결.',
  category: '파트너십',
};

describe('STEP 4: 채널 재가공 프롬프트', () => {

  it('네이버 블로그 프롬프트가 SEO, 소제목, 이미지위치를 포함해야 한다', () => {
    const prompt = getRepurposePrompt('naver-blog', MOCK_PRESS_RELEASE);
    expect(prompt).toContain('SEO');
    expect(prompt).toContain('소제목');
    expect(prompt).toContain('IMAGE');
    expect(prompt).toContain('1,500~2,500자');
  });

  it('카카오톡 프롬프트가 300~500자, 이모지, 불릿을 포함해야 한다', () => {
    const prompt = getRepurposePrompt('kakao', MOCK_PRESS_RELEASE);
    expect(prompt).toContain('300~500자');
    expect(prompt).toContain('이모지');
    expect(prompt).toContain('헤드라인');
  });

  it('인스타그램 프롬프트가 슬라이드, JSON 출력을 포함해야 한다', () => {
    const prompt = getRepurposePrompt('instagram', MOCK_PRESS_RELEASE);
    expect(prompt).toContain('슬라이드');
    expect(prompt).toContain('5~7');
    expect(prompt).toContain('해시태그');
    expect(prompt).toContain('JSON');
  });

  it('링크드인 프롬프트가 전문가 톤, 인사이트를 포함해야 한다', () => {
    const prompt = getRepurposePrompt('linkedin', MOCK_PRESS_RELEASE);
    expect(prompt).toContain('전문가');
    expect(prompt).toContain('인사이트');
    expect(prompt).toContain('800~1,200자');
  });

  it('링크드인 영문 옵션이 동작해야 한다', () => {
    const prompt = getRepurposePrompt('linkedin', MOCK_PRESS_RELEASE, { language: 'en' });
    expect(prompt).toContain('영문');
  });

  it('링크드인 이중언어 옵션이 동작해야 한다', () => {
    const prompt = getRepurposePrompt('linkedin', MOCK_PRESS_RELEASE, { language: 'ko+en' });
    expect(prompt).toContain('한국어');
    expect(prompt).toContain('English');
  });

  it('모든 채널 프롬프트에 공통 규칙(팩트, 의료법, 영문표기)이 있어야 한다', () => {
    const channels = ['naver-blog', 'kakao', 'instagram', 'linkedin'];
    channels.forEach(ch => {
      const prompt = getRepurposePrompt(ch, MOCK_PRESS_RELEASE);
      expect(prompt).toContain('팩트만 사용');
      expect(prompt).toContain('의료법 금지어');
      expect(prompt).toContain('영문 표기');
    });
  });

  it('존재하지 않는 채널 ID는 빈 문자열을 반환해야 한다', () => {
    const prompt = getRepurposePrompt('twitter', MOCK_PRESS_RELEASE);
    expect(prompt).toBe('');
  });
});
```

**실행:**
```bash
npx vitest run src/__tests__/step4-channel-prompts.test.js
```

**통과 조건:**
- [ ] 8개 테스트 전체 PASS
- [ ] 빌드 에러 없음

---

## STEP 5: Phase B — 채널별 미리보기 + 복사/다운로드

### 5-1. 네이버 블로그 미리보기 컴포넌트

`src/components/repurpose/previews/NaverBlogPreview.jsx`:

```jsx
/**
 * 네이버 블로그 미리보기
 * - HTML 렌더링 (소제목, 이미지 위치 표시)
 * - "네이버 블로그에 붙여넣기" 버튼 (HTML 클립보드)
 */
import React from 'react';

export default function NaverBlogPreview({ content, isEditing, onEdit }) {
  if (isEditing) {
    return (
      <textarea
        className="w-full h-96 border rounded-lg p-4 text-sm font-mono"
        value={content.body || ''}
        onChange={(e) => onEdit({ ...content, body: e.target.value })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* SEO 키워드 배지 */}
      {content.seoKeywords?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-500 mr-1">SEO:</span>
          {content.seoKeywords.map((kw, i) => (
            <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 블로그 본문 렌더링 */}
      <div className="prose max-w-none">
        {content.body?.split('\n').map((line, i) => {
          if (line.startsWith('## ')) {
            return <h2 key={i} className="text-lg font-bold mt-6 mb-2">{line.replace('## ', '')}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={i} className="text-base font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
          }
          if (line.match(/\[IMAGE:.*\]/)) {
            return (
              <div key={i} className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 my-3 text-center text-sm text-gray-500">
                📷 {line.match(/\[IMAGE:\s*(.+?)\]/)?.[1]}
              </div>
            );
          }
          if (line.trim()) {
            return <p key={i} className="text-sm leading-relaxed">{line}</p>;
          }
          return <br key={i} />;
        })}
      </div>
    </div>
  );
}
```

### 5-2. 인스타그램 캐러셀 미리보기

`src/components/repurpose/previews/InstagramPreview.jsx`:

```jsx
/**
 * 인스타그램 캐러셀 미리보기
 * - 슬라이드 카드 형태
 * - 좌우 스크롤 (실제 인스타 느낌)
 */
import React, { useState } from 'react';

export default function InstagramCarouselPreview({ content, isEditing, onEdit }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = content.slides || [];

  if (isEditing) {
    return (
      <div className="space-y-3">
        {slides.map((slide, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-xs font-bold text-purple-600 pt-2 w-12">#{i + 1}</span>
            <textarea
              className="flex-1 border rounded-lg p-2 text-sm h-20"
              value={slide}
              onChange={(e) => {
                const newSlides = [...slides];
                newSlides[i] = e.target.value;
                onEdit({ ...content, slides: newSlides });
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* 캐러셀 뷰 */}
      <div className="relative bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl aspect-square max-w-sm mx-auto flex items-center justify-center p-8">
        <div className="text-center text-white">
          <p className="text-xs font-bold opacity-70 mb-2">슬라이드 {currentSlide + 1}/{slides.length}</p>
          <p className="text-lg font-bold leading-relaxed">{slides[currentSlide]}</p>
        </div>

        {/* 좌우 버튼 */}
        {currentSlide > 0 && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/30 rounded-full w-8 h-8 text-white"
            onClick={() => setCurrentSlide(prev => prev - 1)}
          >←</button>
        )}
        {currentSlide < slides.length - 1 && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/30 rounded-full w-8 h-8 text-white"
            onClick={() => setCurrentSlide(prev => prev + 1)}
          >→</button>
        )}
      </div>

      {/* 슬라이드 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`w-2 h-2 rounded-full transition ${i === currentSlide ? 'bg-purple-600' : 'bg-gray-300'}`}
            onClick={() => setCurrentSlide(i)}
          />
        ))}
      </div>

      {/* 해시태그 */}
      {content.hashtags?.length > 0 && (
        <div className="mt-4 text-sm text-blue-600 leading-relaxed">
          {content.hashtags.map(tag => `#${tag}`).join(' ')}
        </div>
      )}
    </div>
  );
}
```

### 5-3. ChannelPreview.jsx 업데이트

기존 `ChannelPreview.jsx`를 수정하여 채널별 미리보기 컴포넌트를 연결:

```jsx
// 상단 import 추가
import NaverBlogPreview from './previews/NaverBlogPreview';
import InstagramCarouselPreview from './previews/InstagramPreview';

// 콘텐츠 렌더링 영역에서 채널별 분기:
const renderPreview = () => {
  switch (channel.id) {
    case 'naver-blog':
      return <NaverBlogPreview content={content} isEditing={isEditing} onEdit={handleEdit} />;
    case 'instagram':
      return <InstagramCarouselPreview content={content} isEditing={isEditing} onEdit={handleEdit} />;
    case 'kakao':
    case 'linkedin':
    default:
      // 기존 텍스트 기반 미리보기 유지
      return (/* 기존 코드 */);
  }
};
```

### 5-4. 복사 기능 채널별 최적화

`ChannelPreview.jsx`의 `handleCopy` 함수를 채널별로 분기:

```javascript
const handleCopy = async () => {
  let textToCopy = '';

  switch (channel.id) {
    case 'naver-blog':
      // HTML 형태로 복사 (네이버 블로그 에디터 붙여넣기 호환)
      textToCopy = content.body || '';
      break;
    case 'kakao':
      textToCopy = content.body || '';
      break;
    case 'instagram':
      textToCopy = [
        ...(content.slides || []).map((s, i) => `[슬라이드 ${i + 1}]\n${s}`),
        '',
        '---해시태그---',
        (content.hashtags || []).map(t => `#${t}`).join(' ')
      ].join('\n\n');
      break;
    case 'linkedin':
      textToCopy = content.body || '';
      if (content.bodyEn) {
        textToCopy += '\n\n---English---\n\n' + content.bodyEn;
      }
      break;
    default:
      textToCopy = content.body || '';
  }

  await navigator.clipboard.writeText(textToCopy);
  // TODO: 복사 완료 토스트 알림
};
```

### 5-5. 빌드 확인

```bash
npm run build
```

**통과 조건:**
- [ ] 빌드 에러 없음
- [ ] 미리보기 컴포넌트 4개 파일 존재

---

## ✅ CHECKPOINT B: Phase B 통합 검증

```bash
# 1. 전체 테스트
npx vitest run

# 2. 빌드
npm run build

# 3. 파일 구조 확인
find src/components/repurpose -type f | sort
find src/lib/channelGenerate* -type f
cat src/constants/channels.js | head -5

# 4. import 체인 확인 (순환 참조 없는지)
npx madge --circular src/
```

**CHECKPOINT B 통과 조건:**
- [ ] 전체 테스트 PASS (기존 29 + 신규 ~16 = 45개+)
- [ ] 빌드 에러 없음
- [ ] 순환 참조 없음 (madge 설치 실패하면 빌드 성공으로 대체 확인)
- [ ] `src/components/repurpose/` 구조:
  ```
  repurpose/
  ├── RepurposeHub.jsx
  ├── ChannelCard.jsx
  ├── ChannelPreview.jsx
  └── previews/
      ├── NaverBlogPreview.jsx
      └── InstagramPreview.jsx
  ```
- [ ] `src/lib/channelGenerate.js` 존재
- [ ] `src/constants/channels.js` 존재

> 🛑 CHECKPOINT B 실패 시 Phase C로 진행하지 마라.

---

## STEP 6: Phase C — 파이프라인 워크플로우

### 6-0. Phase C 개요

| 기능 | 설명 |
|------|------|
| 파이프라인 | 초안→검토→승인→발행 4단계 워크플로우 |
| 캘린더 | 월별 콘텐츠 일정 관리 |
| 대시보드 | 발행 현황 통계 |

### 6-1. Supabase 테이블: 파이프라인

```sql
-- Phase C: 파이프라인 상태 관리
CREATE TABLE IF NOT EXISTS pipeline_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('press_release', 'channel_content')),
  content_id UUID NOT NULL,  -- press_releases.id 또는 channel_contents.id
  channel TEXT,               -- 채널명 (channel_content인 경우)

  -- 파이프라인 상태
  stage TEXT NOT NULL DEFAULT 'draft' CHECK (stage IN ('draft', 'review', 'approved', 'published')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- 일정
  scheduled_date DATE,
  scheduled_time TIME,
  deadline DATE,

  -- 담당자 (향후 확장)
  assignee TEXT,
  reviewer TEXT,

  -- 히스토리
  stage_history JSONB DEFAULT '[]',
  -- 예: [{"from":"draft","to":"review","at":"2026-02-15T10:00:00Z","by":"user"}]

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipeline_stage ON pipeline_items(stage);
CREATE INDEX idx_pipeline_scheduled ON pipeline_items(scheduled_date);
CREATE INDEX idx_pipeline_content ON pipeline_items(content_type, content_id);

-- 캘린더 이벤트 뷰 (파이프라인 + 일정이 있는 항목)
CREATE OR REPLACE VIEW calendar_events AS
SELECT
  p.id,
  p.content_type,
  p.content_id,
  p.channel,
  p.stage,
  p.priority,
  p.scheduled_date,
  p.scheduled_time,
  p.deadline,
  p.assignee,
  CASE
    WHEN p.content_type = 'press_release' THEN pr.title
    WHEN p.content_type = 'channel_content' THEN cc.title
  END AS title,
  CASE
    WHEN p.content_type = 'channel_content' THEN cc.channel
  END AS content_channel
FROM pipeline_items p
LEFT JOIN press_releases pr ON p.content_type = 'press_release' AND p.content_id = pr.id
LEFT JOIN channel_contents cc ON p.content_type = 'channel_content' AND p.content_id = cc.id
WHERE p.scheduled_date IS NOT NULL;

-- updated_at 트리거
CREATE TRIGGER pipeline_items_updated
  BEFORE UPDATE ON pipeline_items
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_contents_timestamp();
```

### 6-2. 파이프라인 상수

`src/constants/pipeline.js` 파일을 **새로 생성**:

```javascript
export const PIPELINE_STAGES = [
  { id: 'draft', name: '초안', icon: '📝', color: 'bg-gray-100 text-gray-600' },
  { id: 'review', name: '검토', icon: '🔍', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'approved', name: '승인', icon: '✅', color: 'bg-green-100 text-green-700' },
  { id: 'published', name: '발행', icon: '🚀', color: 'bg-blue-100 text-blue-700' },
];

export const PRIORITY_LEVELS = [
  { id: 'low', name: '낮음', color: 'text-gray-400' },
  { id: 'normal', name: '보통', color: 'text-blue-500' },
  { id: 'high', name: '높음', color: 'text-orange-500' },
  { id: 'urgent', name: '긴급', color: 'text-red-600' },
];
```

### 6-3. 파이프라인 UI — 칸반 보드

`src/components/pipeline/PipelineBoard.jsx`:

```jsx
/**
 * PipelineBoard: 칸반 스타일 파이프라인 보드
 *
 * ┌──────────┬──────────┬──────────┬──────────┐
 * │  📝 초안  │  🔍 검토  │  ✅ 승인  │  🚀 발행  │
 * │          │          │          │          │
 * │  [카드]   │  [카드]   │  [카드]   │  [카드]   │
 * │  [카드]   │          │  [카드]   │          │
 * └──────────┴──────────┴──────────┴──────────┘
 *
 * 카드를 드래그해서 다음 단계로 이동 (또는 버튼 클릭)
 */

import React, { useState, useEffect } from 'react';
import { PIPELINE_STAGES, PRIORITY_LEVELS } from '../../constants/pipeline';

export default function PipelineBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipelineItems();
  }, []);

  const loadPipelineItems = async () => {
    setLoading(true);
    try {
      // TODO: Supabase에서 pipeline_items 로드
      // const { data } = await supabase.from('pipeline_items').select('*, press_releases(title), channel_contents(title, channel)');
      // setItems(data || []);
      setItems([]); // 초기 빈 상태
    } catch (error) {
      console.error('파이프라인 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const moveToStage = async (itemId, newStage) => {
    // 단계 이동 로직
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const history = [...(item.stage_history || []), {
          from: item.stage,
          to: newStage,
          at: new Date().toISOString(),
        }];
        return { ...item, stage: newStage, stage_history: history };
      }
      return item;
    }));

    // TODO: Supabase 업데이트
    // await supabase.from('pipeline_items').update({ stage: newStage, stage_history }).eq('id', itemId);
  };

  const getItemsByStage = (stageId) => items.filter(item => item.stage === stageId);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">파이프라인 로딩 중...</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map(stage => (
        <div key={stage.id} className="flex-shrink-0 w-72">
          {/* 컬럼 헤더 */}
          <div className={`rounded-t-lg px-3 py-2 font-bold text-sm flex items-center gap-2 ${stage.color}`}>
            <span>{stage.icon}</span>
            <span>{stage.name}</span>
            <span className="ml-auto bg-white/50 rounded-full px-2 text-xs">
              {getItemsByStage(stage.id).length}
            </span>
          </div>

          {/* 카드 목록 */}
          <div className="bg-gray-50 rounded-b-lg p-2 min-h-[200px] space-y-2">
            {getItemsByStage(stage.id).map(item => (
              <PipelineCard
                key={item.id}
                item={item}
                stage={stage}
                onMove={(newStage) => moveToStage(item.id, newStage)}
              />
            ))}

            {getItemsByStage(stage.id).length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400">
                아직 항목이 없습니다
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineCard({ item, stage, onMove }) {
  const nextStageIndex = PIPELINE_STAGES.findIndex(s => s.id === stage.id) + 1;
  const nextStage = PIPELINE_STAGES[nextStageIndex];
  const priority = PRIORITY_LEVELS.find(p => p.id === item.priority);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-sm line-clamp-2">{item.title || '제목 없음'}</h4>
        {priority && (
          <span className={`text-xs ${priority.color}`}>{priority.name}</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span>{item.content_type === 'press_release' ? '📰' : '📢'}</span>
        {item.channel && <span>{item.channel}</span>}
        {item.scheduled_date && <span>📅 {item.scheduled_date}</span>}
      </div>

      {nextStage && (
        <button
          onClick={() => onMove(nextStage.id)}
          className="mt-2 w-full py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
        >
          → {nextStage.name}으로 이동
        </button>
      )}
    </div>
  );
}
```

### 6-4. 테스트

`src/__tests__/step6-pipeline.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { PIPELINE_STAGES, PRIORITY_LEVELS } from '../../constants/pipeline';

describe('STEP 6: 파이프라인 상수', () => {

  it('파이프라인 4단계가 올바른 순서로 정의되어야 한다', () => {
    expect(PIPELINE_STAGES).toHaveLength(4);
    expect(PIPELINE_STAGES[0].id).toBe('draft');
    expect(PIPELINE_STAGES[1].id).toBe('review');
    expect(PIPELINE_STAGES[2].id).toBe('approved');
    expect(PIPELINE_STAGES[3].id).toBe('published');
  });

  it('각 단계에 name, icon, color가 있어야 한다', () => {
    PIPELINE_STAGES.forEach(stage => {
      expect(stage.name).toBeTruthy();
      expect(stage.icon).toBeTruthy();
      expect(stage.color).toBeTruthy();
    });
  });

  it('우선순위 레벨이 4개 정의되어야 한다', () => {
    expect(PRIORITY_LEVELS).toHaveLength(4);
    const ids = PRIORITY_LEVELS.map(p => p.id);
    expect(ids).toContain('low');
    expect(ids).toContain('normal');
    expect(ids).toContain('high');
    expect(ids).toContain('urgent');
  });
});
```

**실행:**
```bash
npx vitest run src/__tests__/step6-pipeline.test.js
```

---

## STEP 7: Phase C — 캘린더 + 대시보드

### 7-1. 캘린더 컴포넌트

`src/components/calendar/ContentCalendar.jsx`:

```jsx
/**
 * ContentCalendar: 월별 콘텐츠 캘린더
 *
 * ┌─ 2026년 2월 ──────────────────────────────┐
 * │ 일  월  화  수  목  금  토                   │
 * │              1   2   3   4                  │
 * │  5   6   7   8   9  10  11                  │
 * │ 12  13  14 [15] 16  17  18                  │
 * │ 19  20  21  22  23  24  25                  │
 * │ 26  27  28                                  │
 * └─────────────────────────────────────────────┘
 *
 * [15]에 보도자료 아이콘 + 채널 콘텐츠 아이콘 표시
 */

import React, { useState, useMemo } from 'react';

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 달력 그리드 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=일요일
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // 이전 달 빈 칸
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, events: [] });
    }

    // 이번 달
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.scheduled_date === dateStr);
      days.push({ day: d, date: dateStr, events: dayEvents });
    }

    return days;
  }, [year, month, events]);

  const navigateMonth = (delta) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
        <h2 className="text-lg font-bold">{year}년 {month + 1}월</h2>
        <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">{day}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, index) => (
          <div
            key={index}
            className={`
              min-h-[80px] rounded-lg p-1 text-sm cursor-pointer transition
              ${!cell.day ? 'bg-transparent' : 'hover:bg-blue-50'}
              ${cell.date === todayStr ? 'bg-blue-50 ring-2 ring-blue-500' : ''}
              ${cell.date === selectedDate ? 'bg-blue-100' : ''}
            `}
            onClick={() => cell.day && setSelectedDate(cell.date)}
          >
            {cell.day && (
              <>
                <span className={`text-xs ${cell.date === todayStr ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                  {cell.day}
                </span>
                {/* 이벤트 도트 */}
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {cell.events.slice(0, 3).map((evt, i) => (
                    <span
                      key={i}
                      className="block w-full text-xs truncate px-1 rounded bg-blue-100 text-blue-700"
                      title={evt.title}
                    >
                      {evt.content_type === 'press_release' ? '📰' : '📢'} {evt.title?.substring(0, 8)}
                    </span>
                  ))}
                  {cell.events.length > 3 && (
                    <span className="text-xs text-gray-400">+{cell.events.length - 3}</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 선택된 날짜의 이벤트 상세 */}
      {selectedDate && (
        <div className="mt-4 border-t pt-4">
          <h3 className="font-bold text-sm mb-2">📅 {selectedDate}</h3>
          {events.filter(e => e.scheduled_date === selectedDate).length === 0 ? (
            <p className="text-sm text-gray-400">예정된 콘텐츠가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {events.filter(e => e.scheduled_date === selectedDate).map(evt => (
                <div key={evt.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span>{evt.content_type === 'press_release' ? '📰' : '📢'}</span>
                  <div>
                    <p className="text-sm font-medium">{evt.title}</p>
                    <p className="text-xs text-gray-500">{evt.stage} · {evt.channel || '보도자료'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 7-2. 대시보드 컴포넌트

`src/components/dashboard/Dashboard.jsx`:

```jsx
/**
 * Dashboard: 콘텐츠 발행 현황 통계
 *
 * ┌──────────┬──────────┬──────────┬──────────┐
 * │ 총 콘텐츠 │ 발행 완료 │ 진행 중   │ 이번 주   │
 * │    24    │    18    │     4    │     2    │
 * └──────────┴──────────┴──────────┴──────────┘
 *
 * [채널별 발행 현황 차트]
 * [최근 활동 피드]
 */

import React, { useState, useEffect } from 'react';
import { REPURPOSE_CHANNELS } from '../../constants/channels';
import { PIPELINE_STAGES } from '../../constants/pipeline';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    inProgress: 0,
    thisWeek: 0,
    byChannel: {},
    byStage: {},
    recentActivity: [],
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    // TODO: Supabase에서 통계 로드
    // 현재는 초기 빈 상태
    setStats({
      total: 0,
      published: 0,
      inProgress: 0,
      thisWeek: 0,
      byChannel: {
        'press_release': 0,
        'naver-blog': 0,
        'kakao': 0,
        'instagram': 0,
        'linkedin': 0,
      },
      byStage: {
        draft: 0,
        review: 0,
        approved: 0,
        published: 0,
      },
      recentActivity: [],
    });
  };

  return (
    <div className="space-y-6">
      {/* 상단 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="총 콘텐츠" value={stats.total} icon="📄" color="bg-gray-50" />
        <StatCard label="발행 완료" value={stats.published} icon="🚀" color="bg-green-50" />
        <StatCard label="진행 중" value={stats.inProgress} icon="🔄" color="bg-yellow-50" />
        <StatCard label="이번 주" value={stats.thisWeek} icon="📅" color="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 채널별 발행 현황 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold mb-4">📊 채널별 발행 현황</h3>
          <div className="space-y-3">
            <ChannelBar label="📰 보도자료" count={stats.byChannel['press_release'] || 0} total={stats.total || 1} color="bg-gray-500" />
            {REPURPOSE_CHANNELS.map(ch => (
              <ChannelBar
                key={ch.id}
                label={`${ch.icon} ${ch.name}`}
                count={stats.byChannel[ch.id] || 0}
                total={stats.total || 1}
                color="bg-blue-500"
              />
            ))}
          </div>
        </div>

        {/* 파이프라인 단계별 현황 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold mb-4">📈 파이프라인 현황</h3>
          <div className="space-y-3">
            {PIPELINE_STAGES.map(stage => (
              <div key={stage.id} className="flex items-center gap-3">
                <span className="text-lg">{stage.icon}</span>
                <span className="text-sm w-12">{stage.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${stage.color.replace('text-', 'bg-').replace('100', '400')}`}
                    style={{ width: `${stats.total ? ((stats.byStage[stage.id] || 0) / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-8 text-right">{stats.byStage[stage.id] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold mb-4">🕐 최근 활동</h3>
        {stats.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">아직 활동 내역이 없습니다. 보도자료를 생성해보세요!</p>
        ) : (
          <div className="space-y-2">
            {stats.recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-gray-400">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`${color} rounded-xl p-4`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ChannelBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-32 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-mono w-8 text-right">{count}</span>
    </div>
  );
}
```

### 7-3. 메인 네비게이션 업데이트

앱의 메인 네비게이션(사이드바 또는 탭)에 새 메뉴를 추가.

기존 메뉴 구조에 맞춰서 추가:

```jsx
const NAV_ITEMS = [
  { id: 'create', label: '콘텐츠 생성', icon: '✍️', component: Create },
  { id: 'repurpose', label: '채널 재가공', icon: '📢', component: RepurposeHub },    // NEW
  { id: 'knowledgebase', label: '지식베이스', icon: '📚', component: KnowledgeBase },
  { id: 'pipeline', label: '파이프라인', icon: '🔄', component: PipelineBoard },     // NEW
  { id: 'calendar', label: '캘린더', icon: '📅', component: ContentCalendar },       // NEW
  { id: 'dashboard', label: '대시보드', icon: '📊', component: Dashboard },          // NEW
];
```

> ⚠️ 실제 프로젝트의 라우팅 구조(React Router, 탭 기반 등)에 맞게 조정할 것.

### 7-4. 테스트

`src/__tests__/step7-calendar-dashboard.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { PIPELINE_STAGES } from '../../constants/pipeline';
import { REPURPOSE_CHANNELS } from '../../constants/channels';

describe('STEP 7: 캘린더 & 대시보드 데이터 정합성', () => {

  it('모든 채널이 대시보드 byChannel 키와 매칭되어야 한다', () => {
    const expectedKeys = ['press_release', ...REPURPOSE_CHANNELS.map(c => c.id)];
    expect(expectedKeys).toContain('press_release');
    expect(expectedKeys).toContain('naver-blog');
    expect(expectedKeys).toContain('kakao');
    expect(expectedKeys).toContain('instagram');
    expect(expectedKeys).toContain('linkedin');
  });

  it('파이프라인 단계가 대시보드 byStage 키와 매칭되어야 한다', () => {
    const stageIds = PIPELINE_STAGES.map(s => s.id);
    expect(stageIds).toEqual(['draft', 'review', 'approved', 'published']);
  });

  it('캘린더 날짜 유틸: 월의 첫 날 요일 계산이 정확해야 한다', () => {
    // 2026년 2월 1일 = 일요일 (0)
    const firstDay = new Date(2026, 1, 1).getDay();
    expect(firstDay).toBe(0);
  });

  it('캘린더 날짜 유틸: 월의 일수 계산이 정확해야 한다', () => {
    // 2026년 2월 = 28일
    const daysInFeb = new Date(2026, 2, 0).getDate();
    expect(daysInFeb).toBe(28);
  });
});
```

**실행:**
```bash
npx vitest run src/__tests__/step7-calendar-dashboard.test.js
```

---

## ✅ CHECKPOINT C: 전체 통합 검증

### C-1. 전체 테스트

```bash
npx vitest run 2>&1 | tee test-results.txt
echo "---"
echo "총 테스트 결과:"
grep -E "Tests|Test Files" test-results.txt
```

**기대 결과:** 모든 테스트 PASS (기존 29 + 신규 ~20 = 49개+)

### C-2. 빌드 검증

```bash
npm run build 2>&1 | tee build-results.txt
echo "빌드 결과: $(grep -c 'error' build-results.txt) errors"
```

### C-3. 파일 구조 최종 확인

```bash
echo "=== 전체 프로젝트 구조 ==="
find src -name "*.jsx" -o -name "*.js" | sort

echo ""
echo "=== Phase B 파일 ==="
find src/components/repurpose -type f | sort
ls src/lib/channelGenerate.js
ls src/constants/channels.js

echo ""
echo "=== Phase C 파일 ==="
find src/components/pipeline -type f | sort
find src/components/calendar -type f | sort
find src/components/dashboard -type f | sort
ls src/constants/pipeline.js

echo ""
echo "=== 테스트 파일 ==="
find src/__tests__ -type f | sort
```

**기대 구조:**
```
src/
├── components/
│   ├── create/
│   │   └── Create.jsx              ← 수정됨 (태그 필드 숨김, 재가공 버튼)
│   ├── knowledgebase/
│   │   └── KnowledgeBase.jsx
│   ├── repurpose/                   ← NEW (Phase B)
│   │   ├── RepurposeHub.jsx
│   │   ├── ChannelCard.jsx
│   │   ├── ChannelPreview.jsx
│   │   └── previews/
│   │       ├── NaverBlogPreview.jsx
│   │       └── InstagramPreview.jsx
│   ├── pipeline/                    ← NEW (Phase C)
│   │   └── PipelineBoard.jsx
│   ├── calendar/                    ← NEW (Phase C)
│   │   └── ContentCalendar.jsx
│   └── dashboard/                   ← NEW (Phase C)
│       └── Dashboard.jsx
├── constants/
│   ├── prompts.js                   ← 수정됨 (숫자팩트 + 태그금지 + 채널프롬프트)
│   ├── channels.js                  ← NEW
│   ├── pipeline.js                  ← NEW
│   └── knowledgeBase.js
├── lib/
│   ├── claude.js
│   ├── generatePressReleaseDocx.js  ← 수정됨 (보일러플레이트 정리, 태그 필터)
│   ├── channelGenerate.js           ← NEW
│   ├── fileExtract.js
│   └── rawTextStorage.js
└── __tests__/
    ├── v2-spec-section10.test.js    ← 기존 29개
    ├── step1-number-facts.test.js   ← NEW
    ├── step2-boilerplate-tags.test.js ← NEW
    ├── step4-channel-prompts.test.js  ← NEW
    ├── step6-pipeline.test.js        ← NEW
    └── step7-calendar-dashboard.test.js ← NEW
```

### C-4. CHECKPOINT C 통과 조건 체크리스트

```
Phase A 수정:
- [ ] prompts.js에 숫자 팩트 완전성 규칙 추가됨
- [ ] prompts.js에 태그 금지 규칙 추가됨
- [ ] generatePressReleaseDocx.js에서 보일러플레이트 ② 삭제됨
- [ ] generatePressReleaseDocx.js에서 태그 필터링 로직 추가됨

Phase B:
- [ ] channels.js — 4개 채널 상수 정의
- [ ] channelGenerate.js — 생성 + 파싱 함수
- [ ] prompts.js — getRepurposePrompt() 함수 추가
- [ ] RepurposeHub.jsx — 4채널 허브 UI
- [ ] ChannelCard.jsx — 개별 채널 카드
- [ ] ChannelPreview.jsx — 미리보기 + 편집 + 복사
- [ ] NaverBlogPreview.jsx — 블로그 전용 미리보기
- [ ] InstagramPreview.jsx — 캐러셀 전용 미리보기

Phase C:
- [ ] pipeline.js — 파이프라인 상수
- [ ] PipelineBoard.jsx — 칸반 보드 UI
- [ ] ContentCalendar.jsx — 월별 캘린더
- [ ] Dashboard.jsx — 통계 대시보드

테스트:
- [ ] 전체 테스트 PASS
- [ ] 빌드 에러 없음
```

---

## 📝 Supabase SQL 실행 메모

아래 SQL은 Supabase 대시보드 > SQL Editor에서 수동 실행이 필요합니다.
Claude Code에서는 실행 불가.

```sql
-- 1. Phase B: channel_contents 테이블 (STEP 3-2 참조)
-- 2. Phase C: pipeline_items 테이블 + calendar_events 뷰 (STEP 6-1 참조)
```

작업 완료 후 사용자에게 "Supabase SQL 2건 수동 실행 필요" 안내할 것.

---

## 🔥 긴급 트러블슈팅

### import 에러가 나는 경우

```bash
# ESM vs CommonJS 확인
grep '"type"' package.json
# "module"이면 import/export, 없으면 require/module.exports
```

### 빌드 시 "module not found"

```bash
# 순환 참조 확인
npx madge --circular src/

# 없는 파일 참조 확인
npx madge --orphans src/
```

### 기존 테스트가 깨지는 경우

```bash
# 어떤 테스트가 깨졌는지 확인
npx vitest run --reporter=verbose 2>&1 | grep "FAIL"

# 해당 테스트만 단독 실행
npx vitest run src/__tests__/[깨진파일].test.js
```

**원칙: 기존 29개 테스트를 절대 깨뜨리지 마라.** 새 코드가 기존 테스트에 영향을 주면 새 코드를 수정한다.

---

## 끝.

이 문서를 Claude Code에 넣고 실행하세요:
"WORK-ORDER-006.md를 읽고 STEP 0부터 순서대로 실행해줘. 각 CHECKPOINT를 반드시 통과한 뒤 다음으로 진행. 에러 나면 멈추지 말고 해결하고 계속 진행."
