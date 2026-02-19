# 재생성 로딩 표시 수정 + Phase 3: Context Builder (학습 적용)

---

## Part 0: 재생성 로딩 표시 수정 (빠른 수정)

### 문제
채널 재가공에서 재생성 버튼 클릭 시 로딩/진행 표시가 없어서 
사용자가 "아무 일도 안 일어난다"고 인식함.

### 수정
RepurposeHub.jsx에서 재생성 실행 중 상태 표시 추가:

1. 재생성 중 state 추가:
```javascript
const [regenerating, setRegenerating] = useState(null); // 채널 ID 또는 null
```

2. 재생성 핸들러에 상태 세팅:
```javascript
const handleRegenerate = async (channel) => {
  setRegenerating(channel);
  try {
    // ... 기존 재생성 로직
  } finally {
    setRegenerating(null);
  }
};
```

3. UI에 표시:
```jsx
{regenerating === channel && (
  <div style={{ padding: '12px', background: '#FFF8E1', borderRadius: '8px', margin: '8px 0' }}>
    🔄 재작성 중... (검수 + 보정 포함, 잠시 기다려주세요)
  </div>
)}
```

4. 재생성 버튼도 비활성화:
```jsx
<button 
  onClick={() => handleRegenerate(channel)} 
  disabled={regenerating !== null}
>
  {regenerating === channel ? '재작성 중...' : '재생성'}
</button>
```

---

## Phase 3: Context Builder (학습 데이터 → 프롬프트 자동 주입)

### 목적

edit_history, brand_voice_rules, fact_database에 쌓인 데이터를
AI 콘텐츠 생성 프롬프트에 자동으로 주입하여, 같은 실수를 반복하지 않도록 한다.

현재: 프롬프트가 prompts.js에 하드코딩된 정적 가이드라인만 사용
변경: DB에서 학습 데이터를 읽어서 동적으로 프롬프트를 보강

### 핵심 개념

```
[기존 프롬프트]
채널 가이드라인 (정적)
  ↓
AI 생성

[Phase 3 적용 후]
채널 가이드라인 (정적)
  + 브랜드 보이스 규칙 (DB) ← brand_voice_rules
  + 최근 수정 패턴 (DB) ← edit_history
  + 팩트 체크 데이터 (DB) ← fact_database
  + 유사 콘텐츠 좋은 예시 (DB) ← channel_contents 승인본
  ↓
AI 생성 (학습 반영)
```

### 구현: src/lib/contextBuilder.js (새 파일)

```javascript
import { supabase } from '../supabase';

/**
 * Context Builder — 학습 데이터를 조합하여 프롬프트 보강 텍스트 생성
 * 
 * @param {string} channel - 채널 ID (DB 형식: 'email', 'naver_blog' 등) 또는 null(보도자료)
 * @param {string} category - 콘텐츠 카테고리 (계약, 학회, 신제품 등) — 선택
 * @param {string} product - 관련 제품 (토르RF, 루미노웨이브 등) — 선택
 * @returns {string} 프롬프트에 추가할 컨텍스트 텍스트
 */
export async function buildContext(channel = null, category = null, product = null) {
  const sections = [];
  
  // 1. 브랜드 보이스 규칙
  const voiceRules = await getBrandVoiceContext(channel);
  if (voiceRules) sections.push(voiceRules);
  
  // 2. 최근 수정 패턴 (빈출 실수)
  const editPatterns = await getEditPatternContext(channel);
  if (editPatterns) sections.push(editPatterns);
  
  // 3. 팩트 데이터
  const facts = await getFactContext(category, product);
  if (facts) sections.push(facts);
  
  // 4. 좋은 예시 (승인된 콘텐츠)
  const examples = await getGoodExampleContext(channel, category);
  if (examples) sections.push(examples);
  
  if (sections.length === 0) return '';
  
  return '\n\n---\n[학습 데이터 — 아래 내용을 반드시 참고하여 생성하세요]\n\n' + sections.join('\n\n');
}
```

### 세부 함수 구현

#### 3-1. 브랜드 보이스 규칙 조회

```javascript
async function getBrandVoiceContext(channel) {
  // channel에 해당하는 규칙 + 공통 규칙(channel IS NULL) 조회
  let query = supabase
    .from('brand_voice_rules')
    .select('rule_type, rule_text, bad_example, good_example')
    .eq('is_active', true);
  
  if (channel) {
    // 해당 채널 규칙 + 공통 규칙
    query = query.or(`channel.eq.${channel},channel.is.null`);
  } else {
    // 공통 규칙만
    query = query.is('channel', null);
  }
  
  const { data, error } = await query.order('rule_type');
  if (error || !data?.length) return null;
  
  let text = '## 브랜드 보이스 규칙 (반드시 준수)\n';
  
  // 금지어
  const banned = data.filter(r => r.rule_type === 'banned_term');
  if (banned.length) {
    text += '\n### 금지 표현\n';
    banned.forEach(r => {
      text += `- ${r.rule_text}`;
      if (r.bad_example && r.good_example) {
        text += ` (❌ "${r.bad_example}" → ✅ "${r.good_example}")`;
      }
      text += '\n';
    });
  }
  
  // 선호 용어
  const preferred = data.filter(r => r.rule_type === 'preferred_term');
  if (preferred.length) {
    text += '\n### 선호 표현\n';
    preferred.forEach(r => {
      text += `- ${r.rule_text}\n`;
    });
  }
  
  // 톤 규칙
  const tone = data.filter(r => r.rule_type === 'tone_rule');
  if (tone.length) {
    text += '\n### 톤/문체 규칙\n';
    tone.forEach(r => {
      text += `- ${r.rule_text}`;
      if (r.bad_example && r.good_example) {
        text += ` (❌ "${r.bad_example}" → ✅ "${r.good_example}")`;
      }
      text += '\n';
    });
  }
  
  // 구조 규칙
  const structure = data.filter(r => r.rule_type === 'structure_rule');
  if (structure.length) {
    text += '\n### 구조 규칙\n';
    structure.forEach(r => {
      text += `- ${r.rule_text}`;
      if (r.bad_example && r.good_example) {
        text += ` (❌ "${r.bad_example}" → ✅ "${r.good_example}")`;
      }
      text += '\n';
    });
  }
  
  // 채널 특수 규칙
  const channelSpecific = data.filter(r => r.rule_type === 'channel_specific');
  if (channelSpecific.length) {
    text += '\n### 채널 특수 규칙\n';
    channelSpecific.forEach(r => {
      text += `- ${r.rule_text}\n`;
    });
  }
  
  return text;
}
```

#### 3-2. 최근 수정 패턴 조회

```javascript
async function getEditPatternContext(channel) {
  // 최근 30건의 edit_history에서 빈출 패턴 추출
  let query = supabase
    .from('edit_history')
    .select('edit_type, edit_pattern, edit_reason, channel')
    .not('edit_pattern', 'is', null)  // 패턴이 있는 것만
    .order('created_at', { ascending: false })
    .limit(30);
  
  if (channel) {
    query = query.eq('channel', channel);
  }
  
  const { data, error } = await query;
  if (error || !data?.length) return null;
  
  // 빈출 패턴 집계
  const patternCounts = {};
  data.forEach(row => {
    // edit_pattern을 ' | '로 분리하여 개별 패턴 카운트
    if (row.edit_pattern) {
      row.edit_pattern.split(' | ').forEach(pattern => {
        const key = pattern.trim();
        if (key) {
          patternCounts[key] = (patternCounts[key] || 0) + 1;
        }
      });
    }
  });
  
  // 빈도순 정렬, 상위 10개
  const topPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (!topPatterns.length) return null;
  
  let text = '## 최근 자주 발생하는 수정 사항 (같은 실수 반복 금지)\n';
  topPatterns.forEach(([pattern, count]) => {
    text += `- [${count}회 반복] ${pattern}\n`;
  });
  
  // edit_reason에서도 빈출 이슈 추출
  const reasonCounts = {};
  data.forEach(row => {
    if (row.edit_reason) {
      // 🔴, 🟡 태그된 개별 이슈 분리
      row.edit_reason.split(' | ').forEach(reason => {
        const key = reason.trim();
        if (key) {
          reasonCounts[key] = (reasonCounts[key] || 0) + 1;
        }
      });
    }
  });
  
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (topReasons.length) {
    text += '\n### 검수에서 자주 적발되는 이슈\n';
    topReasons.forEach(([reason, count]) => {
      text += `- [${count}회] ${reason}\n`;
    });
  }
  
  return text;
}
```

#### 3-3. 팩트 데이터 조회

```javascript
async function getFactContext(category, product) {
  let query = supabase
    .from('fact_database')
    .select('category, subject, fact_text, fact_pairs')
    .eq('is_active', true);
  
  // valid_until이 NULL이거나 미래인 것만
  // (Supabase에서 OR 조건이 복잡하므로, 가져온 후 필터링)
  
  const { data, error } = await query.order('category');
  if (error || !data?.length) return null;
  
  // valid_until 필터 (JS에서)
  const now = new Date().toISOString().split('T')[0];
  const validFacts = data.filter(f => !f.valid_until || f.valid_until >= now);
  
  if (!validFacts.length) return null;
  
  let text = '## 팩트 데이터 (반드시 정확하게 사용)\n';
  
  // 카테고리별 그룹핑
  const grouped = {};
  validFacts.forEach(f => {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  });
  
  // 제품 관련 팩트 우선 표시
  if (product) {
    const productFacts = validFacts.filter(f => 
      f.subject?.includes(product) || f.fact_text?.includes(product)
    );
    if (productFacts.length) {
      text += `\n### ${product} 관련 팩트\n`;
      productFacts.forEach(f => {
        text += `- ${f.fact_text}`;
        if (f.fact_pairs?.length) {
          text += ` (반드시 함께 사용: ${f.fact_pairs.join(', ')})`;
        }
        text += '\n';
      });
    }
  }
  
  // 인물 정보 (항상 포함 — 이름 오류 방지)
  if (grouped['personnel']) {
    text += '\n### 인물 정보 (이름 정확히 표기)\n';
    grouped['personnel'].forEach(f => {
      text += `- ${f.fact_text}\n`;
    });
  }
  
  // 회사 정보
  if (grouped['company']) {
    text += '\n### 회사 정보\n';
    grouped['company'].forEach(f => {
      text += `- ${f.fact_text}\n`;
    });
  }
  
  // 인증 정보 (의료기기 필수)
  if (grouped['certification']) {
    text += '\n### 인증/승인 정보 (정확히 표기)\n';
    grouped['certification'].forEach(f => {
      text += `- ${f.fact_text}\n`;
    });
  }
  
  return text;
}
```

#### 3-4. 좋은 예시 조회

```javascript
async function getGoodExampleContext(channel, category) {
  if (!channel) return null; // 보도자료는 예시 주입 안 함 (길이가 너무 김)
  
  // 해당 채널에서 승인된(또는 edit_ratio가 낮은) 콘텐츠 가져오기
  // edit_ratio가 낮을수록 = 수정이 적었다 = 품질이 좋았다
  const { data, error } = await supabase
    .from('channel_contents')
    .select('final_text, channel, quality_score, edit_ratio')
    .eq('channel', channel)
    .not('final_text', 'is', null)
    .order('quality_score', { ascending: false, nullsFirst: false })
    .limit(3);
  
  if (error || !data?.length) return null;
  
  // final_text가 있는 것 중 상위 1개만 예시로 사용 (토큰 절약)
  const best = data[0];
  if (!best?.final_text) return null;
  
  // 너무 길면 앞부분만 (500자)
  const exampleText = best.final_text.length > 500 
    ? best.final_text.substring(0, 500) + '...(이하 생략)'
    : best.final_text;
  
  let text = '## 참고 예시 (이전 승인된 콘텐츠 — 톤과 구조를 참고)\n';
  text += '```\n' + exampleText + '\n```\n';
  if (best.quality_score) {
    text += `(품질 점수: ${best.quality_score}점)\n`;
  }
  
  return text;
}
```

### Context Builder 연결

#### 보도자료 생성 시 (Create.jsx → prompts.js 또는 claude.js)

보도자료 생성 프롬프트를 조립하는 곳을 찾아서, buildContext() 결과를 추가:

```javascript
import { buildContext } from '../lib/contextBuilder';

// 보도자료 생성 전
const learningContext = await buildContext(null, category, product);

// 기존 프롬프트 + 학습 컨텍스트
const fullPrompt = basePrompt + learningContext;
```

보도자료 생성은 prompts.js의 buildPressReleasePrompt() 또는 
claude.js의 generateFromFacts()에서 프롬프트를 조립할 것이다.
해당 함수를 찾아서 learningContext를 system 프롬프트 끝에 추가.

#### 채널 콘텐츠 생성 시 (channelGenerate.js)

채널 콘텐츠 생성 프롬프트를 조립하는 곳을 찾아서, buildContext() 결과를 추가:

```javascript
import { buildContext } from '../lib/contextBuilder';
import { channelToDb } from '../lib/supabaseData'; // 채널명 매핑

// 채널 콘텐츠 생성 전
const dbChannel = channelToDb(channel);
const learningContext = await buildContext(dbChannel, category, product);

// 기존 채널 프롬프트 + 학습 컨텍스트
const fullPrompt = channelPrompt + learningContext;
```

channelGenerate.js의 callClaudeForChannel() 또는 해당 함수에서
system 프롬프트 끝에 learningContext를 추가.

#### 채널 검수 시 (reviewChannelContent)

검수 프롬프트에도 팩트 데이터를 주입하면 검수 정확도가 올라감:

```javascript
const factContext = await getFactContext(category, product);
// 검수 프롬프트에 factContext 추가
```

### channelToDb export 확인

contextBuilder.js에서 channelToDb 매핑을 사용하지 않음 (이미 DB 형식으로 받음).
하지만 호출하는 쪽에서 매핑해서 전달해야 함.

supabaseData.js에서 channelToDb 함수가 export되어 있는지 확인.
안 되어 있으면 export 추가.

### 에러 처리

contextBuilder.js의 모든 함수는 에러 시 null 반환 (프롬프트 생성을 중단하면 안 됨):

```javascript
async function getBrandVoiceContext(channel) {
  try {
    // ... 로직
  } catch (err) {
    console.warn('[ContextBuilder] brand voice 조회 실패:', err);
    return null;
  }
}
```

모든 함수에 동일하게 try/catch 적용.

### 디버그 로그

buildContext() 결과를 콘솔에 출력하여 실제로 뭐가 주입되는지 확인:

```javascript
export async function buildContext(channel, category, product) {
  // ... 조합 후
  const result = sections.join('\n\n');
  console.log('[ContextBuilder] 주입 컨텍스트:', {
    channel,
    category,
    product,
    sectionsCount: sections.length,
    totalLength: result.length
  });
  return result;
}
```

---

## 빌드 + 테스트

### Part 0 테스트:
1. 채널 재가공에서 재생성 클릭 → "재작성 중..." 표시 확인
2. 버튼이 비활성화되는지 확인

### Phase 3 테스트:
1. 보도자료 새로 생성
2. F12 콘솔에서 [ContextBuilder] 로그 확인:
   - sectionsCount가 1 이상 (최소한 brand_voice_rules가 12개 시딩되어 있음)
   - totalLength가 0이 아닌지
3. 채널 콘텐츠 생성
4. F12 콘솔에서 [ContextBuilder] 로그 확인:
   - channel별 규칙이 포함되는지

### 실제 효과 확인:
- 생성된 콘텐츠에 "뷰티 디바이스" 대신 "메디컬 에스테틱 디바이스"가 사용되면 → brand_voice_rules 반영 성공
- CEO 이름이 "이신재"로 정확하면 → fact_database 반영 성공
- 네이버 블로그에서 해요체가 사용되면 → 채널별 톤 규칙 반영 성공

빌드 + 배포 + git push.

---

## 파일 목록

1. src/lib/contextBuilder.js — 새 파일 (핵심)
2. src/components/repurpose/RepurposeHub.jsx — 재생성 로딩 표시 추가
3. src/lib/channelGenerate.js — buildContext() 연결
4. src/constants/prompts.js 또는 src/lib/claude.js — 보도자료 생성에 buildContext() 연결
