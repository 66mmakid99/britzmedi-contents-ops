# CTA 추적 시스템 — 채널별 클릭 추적 + 구글폼 리다이렉트

---

## 개요

Content Ops에 CTA 추적 시스템을 추가한다.
채널 콘텐츠의 CTA 링크를 자동 생성하고, 클릭 시 Supabase에 기록한 뒤 구글폼으로 리다이렉트.

구글폼 URL:
- 데모 신청: https://docs.google.com/forms/d/1NgFb9ooo3WdKejRN1ehNQum0icoOScspsXd5Oo0JtIw/viewform
- 제품 상담: https://docs.google.com/forms/d/1eGOiLCtT4Q72L0NdFypuIeUjA4792BtBEmVLChZy7cU/viewform

---

## Step 1: Supabase 테이블 생성

SQL 파일 생성: supabase-cta-tracking.sql

```sql
-- CTA 클릭 추적 테이블
CREATE TABLE IF NOT EXISTS cta_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 어떤 CTA인지
  cta_type VARCHAR(20) NOT NULL CHECK (cta_type IN ('demo', 'consult')),
  -- 어느 채널에서 왔는지
  channel VARCHAR(50) NOT NULL,
  -- 어떤 캠페인(콘텐츠)인지
  campaign VARCHAR(200),
  -- 어떤 보도자료에서 파생됐는지
  press_release_id UUID REFERENCES press_releases(id) ON DELETE SET NULL,
  -- 클릭 메타
  referrer TEXT,
  user_agent TEXT,
  -- 시간
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_cta_clicks_type ON cta_clicks(cta_type);
CREATE INDEX idx_cta_clicks_channel ON cta_clicks(channel);
CREATE INDEX idx_cta_clicks_campaign ON cta_clicks(campaign);
CREATE INDEX idx_cta_clicks_date ON cta_clicks(clicked_at);

-- RLS
ALTER TABLE cta_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for cta_clicks" ON cta_clicks FOR ALL USING (true) WITH CHECK (true);
```

이 SQL 파일을 프로젝트 루트에 생성하고, 사용자에게 Supabase SQL Editor에서 실행하라고 안내.

---

## Step 2: 리다이렉트 페이지

src/pages/Go.jsx (또는 현재 라우팅 구조에 맞게) 새 파일 생성.

이 페이지는 URL 파라미터를 읽고, Supabase에 클릭 기록 후, 구글폼으로 리다이렉트한다.

URL 형식:
```
/go?type=demo&channel=linkedin&campaign=thailand-deal
/go?type=consult&channel=email&campaign=thailand-deal
/go?type=demo&channel=naver_blog&campaign=lumino-wave-launch
```

파라미터:
- type: 'demo' 또는 'consult' (필수)
- channel: 채널명 (필수)
- campaign: 캠페인/콘텐츠 식별자 (선택)
- pr_id: 보도자료 ID (선택)

```jsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; // 또는 현재 라우팅 방식
import { supabase } from '../lib/supabase'; // 기존 import 경로 확인

const FORM_URLS = {
  demo: 'https://docs.google.com/forms/d/1NgFb9ooo3WdKejRN1ehNQum0icoOScspsXd5Oo0JtIw/viewform',
  consult: 'https://docs.google.com/forms/d/1eGOiLCtT4Q72L0NdFypuIeUjA4792BtBEmVLChZy7cU/viewform'
};

export default function Go() {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    async function trackAndRedirect() {
      const type = searchParams.get('type') || 'consult';
      const channel = searchParams.get('channel') || 'direct';
      const campaign = searchParams.get('campaign') || null;
      const prId = searchParams.get('pr_id') || null;
      
      // Supabase에 클릭 기록 (실패해도 리다이렉트는 진행)
      try {
        await supabase.from('cta_clicks').insert({
          cta_type: type,
          channel: channel,
          campaign: campaign,
          press_release_id: prId,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null
        });
      } catch (err) {
        console.error('[CTA] 클릭 기록 실패:', err);
      }
      
      // 구글폼으로 리다이렉트
      const formUrl = FORM_URLS[type] || FORM_URLS.consult;
      window.location.href = formUrl;
    }
    
    trackAndRedirect();
  }, [searchParams]);
  
  // 리다이렉트 중 잠깐 보이는 화면
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'sans-serif',
      color: '#666'
    }}>
      <p>잠시만 기다려주세요...</p>
    </div>
  );
}
```

### 라우팅 연결

현재 라우팅 구조를 확인하고 /go 경로를 추가.

App.jsx 또는 라우터 설정:
```jsx
// React Router 사용 시
<Route path="/go" element={<Go />} />
```

현재 프로젝트가 React Router를 사용하는지, 아니면 탭 기반 네비게이션인지 확인.
탭 기반이면 별도 처리 필요 — hash 라우팅 또는 쿼리 파라미터 방식.

중요: /go 페이지는 네비게이션 메뉴에 표시하지 않는다. 외부에서 접근하는 전용 페이지.

---

## Step 3: CTA 링크 자동 생성

### supabaseData.js에 함수 추가

```javascript
/**
 * CTA 추적 링크 생성
 * @param {string} type - 'demo' 또는 'consult'
 * @param {string} channel - 채널명 (DB 형식: email, naver_blog, linkedin, kakao, instagram)
 * @param {string} campaign - 캠페인 식별자 (보도자료 제목 slug)
 * @param {string} prId - 보도자료 UUID (선택)
 * @returns {string} 추적 링크 URL
 */
export function generateCtaLink(type, channel, campaign, prId = null) {
  // 배포 URL (Cloudflare Pages)
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    type,
    channel,
    ...(campaign && { campaign }),
    ...(prId && { pr_id: prId })
  });
  return `${baseUrl}/go?${params.toString()}`;
}

/**
 * 캠페인 식별자 생성 (보도자료 제목 → slug)
 */
export function generateCampaignSlug(title) {
  if (!title) return null;
  return title
    .replace(/[^\w가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .toLowerCase();
}
```

### 채널 콘텐츠 생성 시 CTA 자동 삽입

channelGenerate.js 또는 채널 프롬프트에서, 생성된 콘텐츠의 CTA 부분에 추적 링크를 자동 삽입.

각 채널별 CTA 형식:

```javascript
/**
 * 채널별 CTA 텍스트 생성
 */
export function generateCtaBlock(channel, campaign, prId) {
  const demoLink = generateCtaLink('demo', channel, campaign, prId);
  const consultLink = generateCtaLink('consult', channel, campaign, prId);
  
  switch (channel) {
    case 'email':
      return `\n\n---\n\n` +
        `📋 데모 신청: ${demoLink}\n` +
        `💬 제품 상담: ${consultLink}\n`;
    
    case 'naver_blog':
      return `\n\n---\n\n` +
        `👉 토르RF 데모 신청하기: ${demoLink}\n` +
        `👉 제품 상담 문의하기: ${consultLink}\n`;
    
    case 'linkedin':
      return `\n\n` +
        `🔗 Book a demo: ${demoLink}\n` +
        `🔗 Product inquiry: ${consultLink}\n`;
    
    case 'kakao':
      return `\n\n` +
        `▶ 데모신청: ${demoLink}\n` +
        `▶ 제품문의: ${consultLink}\n`;
    
    case 'instagram':
      return `\n\n` +
        `프로필 링크에서 데모 신청 & 제품 문의 가능!\n`;
      // 인스타는 캡션에 링크가 안 걸리므로 프로필 링크 안내만
    
    default:
      return `\n\n데모 신청: ${demoLink}\n제품 상담: ${consultLink}\n`;
  }
}
```

### CTA 삽입 시점

RepurposeHub.jsx에서 채널 콘텐츠 생성 완료 후, 최종 텍스트에 CTA 블록 추가:

```javascript
// 채널 콘텐츠 생성 + 검수 + 보정 완료 후
const finalText = channelFinalText; // 보정 완료된 텍스트

// CTA 블록 추가
const campaign = generateCampaignSlug(pressReleaseTitle);
const ctaBlock = generateCtaBlock(channelToDb(channel), campaign, pressReleaseId);
const textWithCta = finalText + ctaBlock;

// UI에 표시 + DB 저장 시 CTA 포함
```

CTA 블록은 AI가 생성하는 게 아니라, 코드에서 기계적으로 추가하는 것.
이렇게 해야 링크가 정확하고, 매번 일관된 형식이 보장됨.

---

## Step 4: CTA 클릭 대시보드

### Intelligence 대시보드에 카드 추가

기존 IntelligenceDashboard.jsx에 "CTA 성과" 카드 추가:

```jsx
// 카드 6: CTA 클릭 현황
function CtaPerformance({ data }) {
  // data: cta_clicks 테이블에서 집계
}
```

데이터 조회:
```javascript
async function loadCtaStats() {
  const { data, error } = await supabase
    .from('cta_clicks')
    .select('cta_type, channel, campaign, clicked_at')
    .order('clicked_at', { ascending: false });
  
  if (error || !data) return null;
  
  // 채널별 클릭 수 집계
  const byChannel = {};
  data.forEach(row => {
    const key = row.channel;
    if (!byChannel[key]) byChannel[key] = { demo: 0, consult: 0, total: 0 };
    byChannel[key][row.cta_type]++;
    byChannel[key].total++;
  });
  
  // 캠페인별 클릭 수 집계
  const byCampaign = {};
  data.forEach(row => {
    const key = row.campaign || '(직접)';
    if (!byCampaign[key]) byCampaign[key] = { demo: 0, consult: 0, total: 0 };
    byCampaign[key][row.cta_type]++;
    byCampaign[key].total++;
  });
  
  // 최근 7일 일별 추이
  const daily = {};
  data.forEach(row => {
    const day = row.clicked_at.split('T')[0];
    daily[day] = (daily[day] || 0) + 1;
  });
  
  return { byChannel, byCampaign, daily, total: data.length, recent: data.slice(0, 10) };
}
```

UI 레이아웃:
```
┌─ CTA 성과 ──────────────────────────────────────────────┐
│                                                           │
│  전체 클릭: 47건  │  데모: 28건  │  상담: 19건            │
│                                                           │
│  채널별 클릭                                              │
│  이메일      ████████████ 18건  (데모 12 / 상담 6)       │
│  네이버블로그 ██████████ 15건   (데모 9 / 상담 6)        │
│  링크드인    ████████ 10건      (데모 5 / 상담 5)        │
│  카카오톡    ████ 4건           (데모 2 / 상담 2)        │
│                                                           │
│  캠페인별 TOP 3                                           │
│  태국-독점유통-계약  22건                                  │
│  루미노웨이브-출시   15건                                  │
│  FDA-승인          10건                                   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

데이터 없을 때: "CTA 클릭 데이터가 아직 없습니다. 채널 콘텐츠를 배포하면 자동으로 추적됩니다."

---

## Step 5: 채널 콘텐츠 미리보기에 CTA 링크 표시

RepurposeHub.jsx의 채널 미리보기 하단에 CTA 링크 표시:

```jsx
{/* CTA 링크 미리보기 */}
<div style={{ 
  marginTop: '16px', 
  padding: '12px', 
  background: '#F5F0EB', 
  borderRadius: '8px',
  fontSize: '13px'
}}>
  <strong>📊 CTA 추적 링크</strong>
  <div style={{ marginTop: '8px' }}>
    <span>데모 신청: </span>
    <a href={demoLink} target="_blank" rel="noopener noreferrer" 
       style={{ color: '#8B7355', wordBreak: 'break-all' }}>
      {demoLink}
    </a>
  </div>
  <div style={{ marginTop: '4px' }}>
    <span>제품 상담: </span>
    <a href={consultLink} target="_blank" rel="noopener noreferrer"
       style={{ color: '#8B7355', wordBreak: 'break-all' }}>
      {consultLink}
    </a>
  </div>
</div>
```

---

## 빌드 + 테스트

### Step 1 테스트:
- supabase-cta-tracking.sql을 Supabase SQL Editor에서 실행

### Step 2 테스트:
1. 브라우저에서 직접 접근: /go?type=demo&channel=test&campaign=test-campaign
2. 구글폼 데모 신청 페이지로 리다이렉트 확인
3. Supabase cta_clicks 테이블에 row 생성 확인

### Step 3 테스트:
1. 채널 콘텐츠 생성
2. 미리보기 하단에 CTA 추적 링크 표시 확인
3. 복사 버튼으로 텍스트 복사 시 CTA 링크 포함 확인

### Step 4 테스트:
1. 대시보드 → CTA 성과 카드 확인
2. 위 Step 2에서 테스트 클릭한 건이 표시되는지 확인

배포 + git push.

---

## 파일 목록 (예상)

1. supabase-cta-tracking.sql — 새 파일 (Supabase 실행용)
2. src/pages/Go.jsx — 새 파일 (리다이렉트 페이지)
3. src/lib/supabaseData.js — generateCtaLink, generateCampaignSlug 추가
4. src/lib/ctaUtils.js — 새 파일 (generateCtaBlock)
5. src/components/repurpose/RepurposeHub.jsx — CTA 블록 삽입 + 미리보기
6. src/components/dashboard/IntelligenceDashboard.jsx — CTA 성과 카드
7. App.jsx 또는 라우터 — /go 경로 추가
