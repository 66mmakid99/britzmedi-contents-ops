# prompts.js 긴급 수정 — 정확한 교체 지시서

## ⚠️ 중요: 이 파일의 코드를 "있는 그대로" 복사-붙여넣기 하세요.
## "참고해서 적용"이 아닙니다. 글자 하나 바꾸지 마세요.
## 기존 코드를 통째로 삭제하고 새 코드를 붙여넣으세요.

---

## 수정 1: getRepurposePrompt 함수 전체 교체

파일: src/utils/prompts.js
위치: getRepurposePrompt 함수 (현재 약 1346~1512줄)
방법: 기존 함수를 통째로 삭제하고 REPLACE-REPURPOSE-PROMPT.js 내용으로 교체

### 구체적 절차:
1. `export function getRepurposePrompt(` 로 시작하는 줄을 찾는다
2. 해당 함수의 닫는 `}` (맨 마지막 줄)까지 전체를 선택한다
3. 전부 삭제한다
4. REPLACE-REPURPOSE-PROMPT.js 파일의 내용을 그 자리에 붙여넣는다

---

## 수정 2: CHANNEL_CONFIGS의 카카오, 인스타 설명 텍스트 수정

파일: src/utils/prompts.js

### kakao (현재 약 258줄):
찾기:
```
  kakao: {
    name: '💬 카카오톡',
    charTarget: '300~500자',
```
의 formatPrompt 내용 중 첫 줄을:
```
## 카카오톡 채널 포스트 포맷 규칙
```
그대로 유지 (이미 V2). 변경 불필요.

### instagram (현재 약 396줄):
찾기:
```
  instagram: {
    name: '📸 Instagram',
    charTarget: '캡션 50~150자 + 해시태그',
```
그대로 유지 (이미 V2). 변경 불필요.

---

## 수정 3: 마크다운 후처리 필터 추가

채널 콘텐츠를 표시하는 컴포넌트를 찾아서 (ChannelRepurpose.jsx 또는 유사 파일)
AI 응답을 state에 저장하기 전에 아래 필터를 적용:

```javascript
// 마크다운 마크업 제거 필터
function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')       // **굵게** → 굵게
    .replace(/\*(.*?)\*/g, '$1')            // *이탤릭* → 이탤릭
    .replace(/^#{1,6}\s+/gm, '')            // ## 제목 → 제목
    .replace(/^[-*+]\s+/gm, '· ')           // - 불릿 → · 불릿
    .replace(/`{1,3}(.*?)`{1,3}/gs, '$1')   // `코드` → 코드
    .replace(/^>\s+/gm, '')                 // > 인용 → 인용
    .replace(/---+/g, '')                   // --- 구분선 → 제거
    .replace(/\n{3,}/g, '\n\n');            // 과도한 빈줄 정리
}
```

AI 응답을 받은 후, 저장 전에:
```javascript
const cleanedContent = stripMarkdown(aiResponse);
// 이 cleanedContent를 state에 저장
```

---

## 수정 4: PDF/Word에서 "제목", "부제목", "본문" 라벨 제거

파일: src/utils/generatePressReleaseDocx.js (또는 PDF 생성 파일)

문제: AI가 출력한 [제목], [부제목], [본문] 라벨이 최종 문서에 그대로 보임.

해결: 문서 생성 시 라벨 텍스트를 제거하는 로직 추가.

```javascript
// 보도자료 섹션 파싱 함수
function parsePressReleaseSections(content) {
  const sections = {};
  
  // [제목] 섹션 추출
  const titleMatch = content.match(/\[제목\]\s*\n?([\s\S]*?)(?=\[부제목\]|\[본문\]|\[회사\s*소개\]|$)/);
  sections.title = titleMatch ? titleMatch[1].trim() : '';
  
  // [부제목] 섹션 추출
  const subMatch = content.match(/\[부제목\]\s*\n?([\s\S]*?)(?=\[본문\]|\[회사\s*소개\]|$)/);
  sections.subtitle = subMatch ? subMatch[1].trim() : '';
  
  // [본문] 섹션 추출
  const bodyMatch = content.match(/\[본문\]\s*\n?([\s\S]*?)(?=\[회사\s*소개\]|\[사진\s*가이드\]|\[첨부파일\s*가이드\]|$)/);
  sections.body = bodyMatch ? bodyMatch[1].trim() : '';
  
  // [회사 소개] 섹션 추출
  const compMatch = content.match(/\[회사\s*소개\]\s*\n?([\s\S]*?)(?=\[사진\s*가이드\]|\[첨부파일\s*가이드\]|\[연락처\]|$)/);
  sections.company = compMatch ? compMatch[1].trim() : '';
  
  return sections;
}
```

Word/PDF 생성 시:
- "제목"이라는 글자를 Heading으로 출력하지 말고, sections.title 값만 큰 글씨로 출력
- "부제목"이라는 글자를 출력하지 말고, sections.subtitle 값만 중간 글씨로 출력
- "본문"이라는 글자를 출력하지 말고, sections.body 값만 본문으로 출력

현재 코드에서 grep -n "제목\|부제목\|본문" src/utils/generatePressReleaseDocx.js 로
라벨을 직접 출력하는 부분을 찾아서 제거.

---

## 수정 5: "3년" 누락 방지 — buildFactBasedPrompt 강화

파일: src/utils/prompts.js
위치: buildFactBasedPrompt 함수 내 (현재 약 963줄 부근)

이미 "[숫자 팩트 완전성 규칙]" 섹션이 있으나 AI가 무시함.
→ 함수 시작부의 criticalRules 변수에 추가:

현재:
```javascript
const criticalRules = channelId === 'pressrelease' ? PR_CRITICAL_RULES + '\n\n' : '';
```

변경:
```javascript
const factCompletenessRule = `🚨🚨🚨 [최우선 규칙 — 숫자 팩트 완전성] 🚨🚨🚨
아래 확인된 팩트에 기간(년, 월), 수량(대, 개), 금액(원, 달러), 날짜가 있으면
리드(1단락)에 반드시 모두 포함하라. 하나라도 빠지면 보도자료 무효.
예: 팩트에 "3년 계약, 연 300대"가 있으면 → 리드에 "3년간 연 300대 규모" 필수.
"연 300대"만 쓰고 "3년"을 빼면 팩트 왜곡이다.\n\n`;

const criticalRules = channelId === 'pressrelease' ? factCompletenessRule + PR_CRITICAL_RULES + '\n\n' : '';
```

---

## 수정 6: UI 리디자인 (채널재가공 페이지)

ChannelRepurpose.jsx (또는 해당 컴포넌트)에서:

### 상단 채널 카드 영역:
- 5개 카드를 균일한 크기로 2열 그리드 배치
- 각 카드: 채널 아이콘 + 이름 + 설명 + 상태(미생성/완료) + 버튼
- Tailwind: grid grid-cols-2 gap-3 lg:grid-cols-3

```jsx
{/* 채널 카드 그리드 */}
<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
  {channels.map(ch => (
    <div 
      key={ch.id}
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        selectedChannel === ch.id 
          ? 'border-blue-500 bg-blue-50 shadow-sm' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedChannel(ch.id)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{ch.icon}</span>
        <span className="font-medium text-sm">{ch.name}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{ch.description}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded ${
          ch.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {ch.status === 'done' ? '완료' : '미생성'}
        </span>
        <button 
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={(e) => { e.stopPropagation(); handleGenerate(ch.id); }}
        >
          {ch.status === 'done' ? '재생성' : '생성하기'}
        </button>
      </div>
    </div>
  ))}
</div>
```

### 하단 미리보기 영역:
- 선택된 채널의 콘텐츠만 깔끔하게 표시
- 편집/복사 버튼 우측 상단
- 글자수 카운터 우측 하단

---

## 실행 순서

1. prompts.js의 getRepurposePrompt 함수를 REPLACE-REPURPOSE-PROMPT.js 내용으로 교체
2. buildFactBasedPrompt에 factCompletenessRule 추가 
3. stripMarkdown 필터 함수를 채널 콘텐츠 표시 컴포넌트에 추가
4. PDF/Word 라벨 제거
5. UI 리디자인
6. npm run build (에러 확인)
7. npx wrangler pages deploy dist --project-name=britzmedi-contents-ops --branch=main
8. git add . && git commit -m "V2 channel prompts, markdown filter, UI redesign" && git push
