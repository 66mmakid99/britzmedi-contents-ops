# Content Intelligence System — DB 재구성에 따른 코드 업데이트

## 배경
Content Intelligence 설계서에 맞게 Supabase DB를 전면 재구성했습니다.
핵심 변경: channels jsonb 컬럼 제거 → channel_contents 별도 테이블로 분리.
새 테이블 6개 추가 (edit_history, brand_voice_rules, fact_database, content_blocks 등).

## 새 DB 스키마 (이미 Supabase에 적용 완료)

### press_releases (변경됨)
- id, source_text, source_files, product, category, timing, parsed_fields
- ai_draft (AI 초안 ★신규), ai_model, ai_version
- final_text (최종본 ★신규), edit_distance, edit_ratio
- title, subtitle, spokesperson, quote_text, image_url, image_urls
- status ('draft','reviewing','approved','published','archived')
- approved_by, approved_at, published_at
- quality_score, review_red, review_yellow
- created_at, updated_at
- ⚠️ channels jsonb 컬럼 삭제됨!
- ⚠️ press_release 컬럼 삭제됨 → ai_draft + final_text로 분리됨

### channel_contents (★ 신규 — 기존 jsonb 대체)
- id, press_release_id (FK CASCADE)
- channel ('email','naver_blog','kakao','instagram','linkedin')
- ai_draft, ai_draft_char_count
- final_text, final_char_count, edit_distance, edit_ratio
- title, hashtags[], seo_keywords[], image_guide
- status, quality_score
- created_at, updated_at
- UNIQUE(press_release_id, channel)

### edit_history (★ 신규)
- id, content_type ('press_release','channel'), content_id, channel
- before_text, after_text
- edit_type ('tone_change','fact_correction','term_replacement','structure_change','addition','deletion','style_polish','other')
- edit_pattern, edit_reason, created_at

### brand_voice_rules (★ 신규 — 초기 데이터 12개 시딩 완료)
- id, rule_type, channel, rule_text, bad_example, good_example
- source ('manual','learned'), confidence, is_active, created_at

### fact_database (★ 신규 — 초기 데이터 5개 시딩 완료)
- id, category, subject, fact_text, fact_pairs[]
- valid_from, valid_until, source_press_release_id, is_active, created_at

### content_blocks (★ 신규)
- id, label, body, category, tags[], source_press_release_id
- use_count, last_used_at, is_active, created_at

### pipeline_items (변경 없음)
- id, press_release_id (FK CASCADE), stage, position, notes, created_at, updated_at

### channel_publish_log (변경 없음)
- id, press_release_id (FK CASCADE), channel, published_at, published_url, created_at


## STEP 1: supabaseData.js 전면 재작성

src/lib/supabaseData.js를 완전히 새로 작성해줘.

### 핵심 변경 사항:
1. channels jsonb 관련 코드 전부 제거
2. channel_contents 테이블 CRUD 추가
3. press_releases의 press_release 컬럼 → ai_draft + final_text 로 분리
4. edit_history, brand_voice_rules, fact_database, content_blocks CRUD 추가

### 필요한 함수 목록:

#### Press Releases
- savePressRelease(data) → insert. 
  data.press_release 값을 ai_draft에 넣고, final_text는 동일하게 초기 세팅.
  data.source는 source_text로 매핑.
- updatePressRelease(id, data) → update
- deletePressRelease(id) → delete (CASCADE로 channel_contents, pipeline도 삭제됨)
- getAllPressReleases() → select, 최신순
- getPressReleaseById(id)

#### Channel Contents (★ 새로운 핵심)
- saveChannelContent(pressReleaseId, channel, content) → upsert
  content(문자열)를 ai_draft에 넣고, final_text도 동일하게 초기 세팅.
  ai_draft_char_count, final_char_count 자동 계산.
  UNIQUE(press_release_id, channel) 이용한 upsert.
- updateChannelFinalText(id, finalText) → 사람이 수정한 최종본 저장
  edit_distance, edit_ratio 자동 계산 (ai_draft와 finalText의 글자수 차이).
- getChannelContents(pressReleaseId) → 해당 보도자료의 모든 채널 콘텐츠
- getChannelContent(pressReleaseId, channel) → 특정 채널 1건
- deleteChannelContent(id)

#### Edit History
- saveEditHistory(data) → insert
  data: { content_type, content_id, channel, before_text, after_text, edit_type, edit_pattern, edit_reason }
- getEditHistory(contentId) → 특정 콘텐츠의 수정 이력
- getEditPatterns(channel) → 특정 채널에서 빈출 수정 패턴 조회

#### Brand Voice Rules
- getAllBrandVoiceRules() → 전체 규칙
- getBrandVoiceRules(channel) → 특정 채널 규칙 (channel 조건 + channel IS NULL 공통규칙)
- saveBrandVoiceRule(data) → insert
- updateBrandVoiceRule(id, data) → update
- deleteBrandVoiceRule(id) → delete

#### Fact Database
- getAllFacts() → 전체 팩트
- getFactsByCategory(category) → 카테고리별
- getFactsBySubject(subject) → 주제별
- saveFact(data) → insert
- updateFact(id, data) → update
- deleteFact(id) → delete

#### Content Blocks
- getAllContentBlocks() → 전체 블럭
- getContentBlocksByCategory(category) → 카테고리별
- saveContentBlock(data) → insert
- incrementBlockUsage(id) → use_count + 1, last_used_at 업데이트
- deleteContentBlock(id) → delete

#### Pipeline (기존 유지)
- savePipelineItem(data) → insert
- updatePipelineStage(id, newStage) → update
- getAllPipelineItems() → select with press_release join
- deletePipelineItem(id) → delete

#### Utility
- isUUID(str) → UUID 형식 검증 (기존 유지)
- migrateLocalToSupabase() → localStorage → Supabase 마이그레이션
  ⚠️ 기존 channels jsonb 데이터가 있으면 channel_contents 테이블로 분리 저장

모든 함수에 try/catch + console.error 포함.


## STEP 2: App.jsx 수정

### 데이터 로딩 변경:
- 기존: getAllPressReleases() → 각 item에 channels jsonb가 포함
- 변경: getAllPressReleases() 호출 후, 각 item에 대해 getChannelContents(id) 호출하여 channels 객체 구성
  → 기존 코드와의 호환성을 위해, 로딩 시 channels 객체를 press release 객체에 붙여서 반환

### 또는 (더 나은 방법):
getAllPressReleases() 함수 안에서 channel_contents도 함께 조회하여,
반환값에 channels 프로퍼티를 자동으로 구성해주면 기존 컴포넌트 코드 변경을 최소화할 수 있음.

```javascript
// getAllPressReleases 내부에서:
const pressReleases = ... // select from press_releases
for (const pr of pressReleases) {
  const { data: channels } = await supabase
    .from('channel_contents')
    .select('*')
    .eq('press_release_id', pr.id);
  
  // 기존 호환 형태로 변환
  pr.channels = {};
  channels?.forEach(ch => {
    pr.channels[ch.channel] = ch.final_text || ch.ai_draft;
  });
}
```

### handleAddContent:
- savePressRelease() 호출 (기존과 동일, 내부 매핑만 변경됨)

### handleDeleteContent:
- deletePressRelease() 호출 (CASCADE로 channel_contents, pipeline 자동 삭제)


## STEP 3: RepurposeHub.jsx (채널 재가공 컴포넌트) 수정

### 기존: updateChannelContent(id, channelId, content) → channels jsonb 업데이트
### 변경: saveChannelContent(pressReleaseId, channel, content) → channel_contents 테이블에 upsert

```javascript
// 기존
await updateChannelContent(item.id, channelId, generatedContent);

// 변경
await saveChannelContent(item.id, channelId, generatedContent);
```

채널 콘텐츠 표시할 때도:
```javascript
// 기존: item.channels?.linkedin
// 변경: 로딩 시 이미 channels 프로퍼티가 구성되어 있으므로 동일하게 작동
// 단, 채널 콘텐츠 생성 직후에는 로컬 state도 업데이트 필요
```


## STEP 4: press_release 컬럼명 매핑

기존 코드에서 `press_release` 컬럼을 사용하는 모든 곳을 찾아서:
- 보도자료 본문 저장 시: ai_draft + final_text 둘 다에 저장
- 보도자료 본문 읽기 시: final_text 우선, 없으면 ai_draft

```javascript
// savePressRelease 내부:
const dbData = {
  ...data,
  source_text: data.source || data.raw_input || data.source_text,
  ai_draft: data.press_release || data.ai_draft,
  final_text: data.press_release || data.final_text || data.ai_draft,
  // press_release 키는 제거 (DB에 없음)
};
delete dbData.press_release;
delete dbData.source;
delete dbData.raw_input;
delete dbData.channels;  // jsonb 컬럼 제거됨
```

```javascript
// getAllPressReleases 반환 시 호환성:
pressReleases.forEach(pr => {
  pr.press_release = pr.final_text || pr.ai_draft;  // 기존 코드 호환
  pr.source = pr.source_text;  // 기존 코드 호환
});
```


## STEP 5: 빌드 테스트

변경 후 반드시:
1. npm run build → 에러 없는지 확인
2. 보도자료 생성 → press_releases 테이블에 ai_draft, final_text 저장 확인
3. 채널 재가공 → channel_contents 테이블에 별도 row 생성 확인
4. 파이프라인 → pipeline_items 정상 동작 확인
5. 삭제 → CASCADE 동작 확인

빌드 성공 후 git push + 배포.

## 주의사항

- channels jsonb 관련 코드 완전 제거해야 함. 기존 updateChannelContent()의 jsonb 패치 로직은 더 이상 불필요
- 기존 컴포넌트에서 item.channels?.linkedin 등으로 접근하는 코드가 있으면, getAllPressReleases()에서 channels 프로퍼티를 자동 구성해주는 호환 레이어로 해결
- edit_history, brand_voice_rules, fact_database, content_blocks는 CRUD 함수만 만들어두고, UI는 나중에 추가 예정. 지금은 함수만 준비.
