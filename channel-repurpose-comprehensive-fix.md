# 채널 재가공 종합 개선

6개 이슈를 모두 수정한다. 하나도 빠뜨리지 마라.

---

## 이슈 1: CTA를 하이퍼링크 텍스트로 변환

현재: `📋 데모 신청하기: https://britzmedi-contents-ops.pages.dev/go?type=demo&channel=...` (URL 노출)
목표: URL은 숨기고 텍스트만 보여야 함

### 수정: channelGenerate.js의 replaceCtaPlaceholders()

채널별 CTA 형식 변경:

**이메일** (HTML 렌더링 가능):
```
<a href="URL" style="display:inline-block;padding:12px 24px;background:#8B7355;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;">📋 데모 신청하기</a>
<a href="URL" style="display:inline-block;padding:12px 24px;background:#555;color:#fff;text-decoration:none;border-radius:6px;">💬 제품 상담하기</a>
```

**네이버 블로그** (마크다운/텍스트):
```
👉 데모 신청하기: URL
👉 제품 상담하기: URL
```
네이버는 URL 자동 링크 변환됨. 별도 줄에 짧게.

**링크드인** (텍스트, CTA 1개만):
```
🔗 데모 신청하기 👇
URL
```
링크드인은 데모 신청만. 제품 상담 제거. URL은 별도 줄에 단독 배치 (링크드인이 자동으로 링크 카드 생성).

**카카오톡** (텍스트, CTA 1개만):
```
▶ 자세히 보기
URL
```
카카오는 짧게. URL 별도 줄.

**인스타그램**: 
CTA 링크 없음. "프로필 링크에서 데모 신청 & 제품 문의 가능!" 텍스트만.

### 프롬프트 수정: prompts.js의 commonRules

기존 CTA 플레이스홀더 지시를 변경:
```
8. 본문 마지막에 CTA를 넣되, {DEMO_LINK}와 {CONSULT_LINK} 플레이스홀더만 사용하라. 
   URL을 직접 작성하지 마라. 시스템이 자동으로 치환한다.
   - 이메일: "데모 신청하기 {DEMO_LINK} | 제품 상담하기 {CONSULT_LINK}" 형태
   - 네이버블로그: "👉 데모 신청하기 {DEMO_LINK}" 줄바꿈 "👉 제품 상담하기 {CONSULT_LINK}"
   - 링크드인: "🔗 데모 신청하기 👇" 줄바꿈 "{DEMO_LINK}" (데모만, 상담 제거)
   - 카카오톡: "▶ 자세히 보기" 줄바꿈 "{DEMO_LINK}" (데모만)
   - 인스타그램: "프로필 링크에서 데모 신청 & 제품 문의 가능!" (링크 없음)
```

### 폴백 수정

AI가 플레이스홀더를 누락했을 때 강제 추가하는 폴백도 위 형식에 맞게 수정.
이메일만 데모+상담 2개. 링크드인/카카오는 데모 1개만.

---

## 이슈 2: 본문 밖 "CTA 추적 링크" 섹션 제거

RepurposeHub.jsx (또는 ChannelPreview.jsx)에서 콘텐츠 미리보기 아래에 표시되는 "CTA 추적 링크" 영역을 완전히 제거한다.

검색: "CTA 추적 링크" 또는 "cta-tracking" 또는 "ctaLinks" 관련 JSX를 찾아서 삭제.

본문 안에 CTA가 포함되므로 밖에 또 있을 필요 없다.

---

## 이슈 3: 보도자료 이미지를 채널 콘텐츠에 연결

### 현재 상태

보도자료 제작 시 사진 첨부 기능이 있음 (최대 5장, JPG/PNG).
press_releases 테이블에 image_url, image_urls[] 컬럼이 있음.
채널 재가공 시 이 이미지를 전혀 사용하지 않음.

### 수정

RepurposeHub.jsx에서 채널 콘텐츠 미리보기에 보도자료의 이미지를 표시한다.

1. 먼저 현재 보도자료의 이미지가 어디에 저장되는지 확인:
   - press_releases.image_urls (배열) 또는 press_releases.image_url (단일)
   - 또는 press_release_images 테이블 (Supabase에 이 테이블 있음)
   - 또는 localStorage에 base64로 저장

2. 채널 콘텐츠 미리보기 상단에 이미지 갤러리 표시:
```jsx
{/* 보도자료 이미지 */}
{images && images.length > 0 && (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
      {images.map((img, i) => (
        <img key={i} src={img} alt={`보도자료 이미지 ${i+1}`} 
             style={{ maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
      ))}
    </div>
    <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
      💡 채널에 게시할 때 위 이미지를 함께 사용하세요
    </p>
  </div>
)}
```

3. 네이버 블로그의 [IMAGE: 설명] 플레이스홀더 위치에 실제 이미지 인라인 표시:
   - 본문에서 [IMAGE: ...] 패턴을 찾아서
   - 해당 위치에 이미지 태그로 치환하여 미리보기에 표시
   - 복사 시에는 [IMAGE: 설명] 텍스트 유지 (네이버 에디터에서 직접 이미지 삽입해야 하므로)

4. 보도자료에서 채널 재가공으로 넘어갈 때 이미지 URL/데이터를 함께 전달:
   - RepurposeHub가 받는 props 또는 state에 이미지 정보 포함
   - pressRelease 객체에서 image_urls 또는 관련 필드 읽기

---

## 이슈 4: 카카오톡 글자 수 축소

현재: 857자 (권장 300~500자)

### 수정: channels.js의 카카오톡 채널 설정

maxLength를 강화하고, 프롬프트에 더 강한 제약 추가:

```javascript
// 카카오톡 채널 설정
{
  id: 'kakao',
  maxLength: 400, // 500 → 400으로 축소
  // ...
}
```

### 수정: prompts.js의 카카오톡 프롬프트

기존 프롬프트에 추가:
```
카카오톡 메시지는 반드시 400자 이내로 작성하라. 
구조: 한 줄 제목 + 핵심 2~3문장 + CTA 링크
절대 보도자료를 축약하지 마라. 완전히 새로운 짧은 메시지로 작성하라.
예시:
"[브릿츠메디] 토르RF 태국 독점유통 계약 체결 🎉
3년간 연 300대 규모, 하반기부터 납품 시작됩니다.
FDA 승인 토로이달 고주파 기술에 관심 있으시면 👇

▶ 자세히 보기
{DEMO_LINK}"
```

---

## 이슈 5: 링크드인 CTA 1개만

위 이슈 1에서 이미 처리됨. 링크드인은 "데모 신청하기" 1개만.
replaceCtaPlaceholders()에서 linkedin 채널은 CONSULT_LINK를 삽입하지 않는다.

---

## 이슈 6: 인스타그램 이미지 가이드 분리

현재: 본문 캡션에 "🔥 이미지 가이드: 계약 체결 현장 사진..." 텍스트가 포함되어 있음.
이건 게시할 때 참고 정보이지 캡션에 들어갈 내용이 아님.

### 수정: channelGenerate.js 또는 prompts.js

인스타그램 프롬프트에 추가:
```
인스타그램 캡션은 50~150자 이내로 작성하라.
이미지 가이드는 캡션과 별도로 --- 구분선 아래에 작성하라.

형식:
[캡션 텍스트 + 해시태그]
---
🔥 이미지 가이드: [설명]
```

RepurposeHub.jsx 미리보기에서 --- 구분선 이후는 "📸 이미지 가이드" 별도 영역으로 분리 표시:
```jsx
{channel === 'instagram' && content.includes('---') && (
  <>
    {/* 캡션 */}
    <div>{content.split('---')[0]}</div>
    {/* 이미지 가이드 (분리) */}
    <div style={{ 
      marginTop: '12px', 
      padding: '12px', 
      background: '#FFF8E7', 
      borderRadius: '8px',
      fontSize: '13px' 
    }}>
      <strong>📸 이미지 가이드 (게시 참고용)</strong>
      <div>{content.split('---')[1]}</div>
    </div>
  </>
)}
```

복사 버튼은 캡션 부분만 복사 (--- 이전까지).

---

## 빌드 + 테스트

모든 수정 완료 후:

1. 채널 재가공에서 5채널 전체 생성 (기존 콘텐츠 삭제 후 새로 생성)
2. 확인 항목:
   - 이메일: CTA가 HTML 버튼 형태, URL 노출 없음, 데모+상담 2개
   - 네이버블로그: CTA URL이 별도 줄에 짧게, 이미지 있으면 미리보기에 표시
   - 카카오톡: 400자 이내, CTA 1개 (데모만)
   - 인스타그램: 150자 이내 캡션, 이미지 가이드 분리, CTA 링크 없음
   - 링크드인: CTA 1개 (데모만), URL 별도 줄
   - 모든 채널: 본문 밖 "CTA 추적 링크" 섹션 없음
   - 보도자료 이미지가 채널 미리보기에 표시됨

3. F12 콘솔 에러 없음 확인

배포 + git push.
