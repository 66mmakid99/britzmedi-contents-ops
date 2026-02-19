# Phase 4: Content Intelligence 대시보드

## 목적

edit_history, channel_contents, brand_voice_rules, fact_database, press_releases에 쌓인 
학습 데이터를 시각화하여, 시스템이 얼마나 똑똑해지고 있는지 한눈에 보여준다.

기존 "대시보드" 탭이 네비게이션에 이미 있으므로, 해당 컴포넌트를 찾아서 교체/확장한다.

---

## 대시보드 구성 — 5개 카드

### 카드 1: 채널별 평균 수정률 (edit_ratio)

데이터 소스: channel_contents 테이블

```javascript
// 채널별 평균 edit_ratio 조회
const { data } = await supabase
  .from('channel_contents')
  .select('channel, edit_ratio')
  .not('edit_ratio', 'is', null);

// JS에서 채널별 그룹핑 + 평균 계산
const channelStats = {};
data.forEach(row => {
  if (!channelStats[row.channel]) {
    channelStats[row.channel] = { total: 0, count: 0 };
  }
  channelStats[row.channel].total += parseFloat(row.edit_ratio);
  channelStats[row.channel].count += 1;
});

// 결과: { email: { avg: 0.15, count: 3 }, naver_blog: { avg: 0.38, count: 2 }, ... }
```

UI: 수평 바 차트
- 각 채널명 (한글) + 퍼센트 바 + 수치
- 색상: 0-15% 녹색, 15-30% 노랑, 30%+ 빨강
- 바 아래에 "(N건 기준)" 표시
- 데이터 없으면: "아직 채널 콘텐츠 데이터가 없습니다. 콘텐츠를 생성하면 자동으로 수집됩니다."

채널명 매핑 (DB → 한글):
```javascript
const channelLabels = {
  'email': '이메일 뉴스레터',
  'naver_blog': '네이버 블로그',
  'linkedin': '링크드인',
  'kakao': '카카오톡',
  'instagram': '인스타그램'
};
```

### 카드 2: 보도자료 검수 결과 요약

데이터 소스: press_releases 테이블

```javascript
const { data } = await supabase
  .from('press_releases')
  .select('quality_score, review_red, review_yellow, created_at')
  .not('quality_score', 'is', null)
  .order('created_at', { ascending: true });
```

UI: 
- 평균 품질 점수 (큰 숫자)
- 최근 5건의 품질 점수 추이 (간단한 라인 또는 점 그래프)
- 평균 🔴 건수, 평균 🟡 건수
- "검수 통과" 비율 (review_red === 0인 건 / 전체)
- 데이터 없으면: "아직 검수 데이터가 없습니다."

추이 그래프는 CSS만으로 간단하게:
```jsx
{/* 점 그래프 */}
<div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '60px' }}>
  {scores.map((score, i) => (
    <div key={i} style={{
      width: '24px',
      height: `${score * 0.6}px`, // 100점 기준 60px
      background: score >= 90 ? '#4CAF50' : score >= 70 ? '#FFC107' : '#F44336',
      borderRadius: '4px 4px 0 0'
    }}>
      <span style={{ fontSize: '10px' }}>{score}</span>
    </div>
  ))}
</div>
```

### 카드 3: 빈출 수정 패턴 TOP 5

데이터 소스: edit_history 테이블

```javascript
const { data } = await supabase
  .from('edit_history')
  .select('edit_type, edit_pattern, edit_reason, channel')
  .order('created_at', { ascending: false })
  .limit(50);
```

JS에서 빈출 패턴 집계:
```javascript
// edit_reason에서 개별 이슈 분리 (🔴, 🟡 태그 기준)
const issueCounts = {};
data.forEach(row => {
  if (row.edit_reason) {
    row.edit_reason.split(' | ').forEach(reason => {
      const key = reason.trim();
      if (key) issueCounts[key] = (issueCounts[key] || 0) + 1;
    });
  }
});

// 상위 5개
const top5 = Object.entries(issueCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
```

UI: 리스트
- 각 항목: 이모지(🔴/🟡) + 패턴 설명 + 횟수 뱃지
- 횟수에 따라 뱃지 색상 변화 (3회 이상 빨강)
- 데이터 없으면: "아직 수정 패턴 데이터가 없습니다."

### 카드 4: 학습 자산 현황

데이터 소스: 여러 테이블 count

```javascript
const [rules, facts, edits, blocks, contents] = await Promise.all([
  supabase.from('brand_voice_rules').select('id', { count: 'exact', head: true }).eq('is_active', true),
  supabase.from('fact_database').select('id', { count: 'exact', head: true }).eq('is_active', true),
  supabase.from('edit_history').select('id', { count: 'exact', head: true }),
  supabase.from('content_blocks').select('id', { count: 'exact', head: true }).eq('is_active', true),
  supabase.from('press_releases').select('id', { count: 'exact', head: true }),
]);
```

UI: 그리드 카드 (4~5개 숫자)
```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ 보이스 규칙│  팩트 DB  │ 수정 이력 │ 콘텐츠 블록│ 보도자료  │
│    12    │    5     │    2     │    0     │    3     │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

### 카드 5: 최근 수정 이력 (타임라인)

데이터 소스: edit_history 테이블

```javascript
const { data } = await supabase
  .from('edit_history')
  .select('edit_type, channel, edit_reason, created_at')
  .order('created_at', { ascending: false })
  .limit(10);
```

UI: 타임라인 리스트
- 날짜/시간 + 채널명(한글) + edit_type 뱃지 + edit_reason 요약 (50자 truncate)
- edit_type 뱃지:
  - auto_review → "🤖 자동 검수" (파란색)
  - auto_channel_review → "🤖 채널 검수" (파란색)
  - manual_regenerate → "✏️ 수정 포인트" (주황색)
- 데이터 없으면: "아직 수정 이력이 없습니다."

---

## 레이아웃

전체 레이아웃:
```jsx
<div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
  <h1>Content Intelligence</h1>
  <p style={{ color: '#666' }}>AI 학습 데이터가 쌓일수록 콘텐츠 품질이 올라갑니다.</p>
  
  {/* 카드 4: 학습 자산 현황 — 맨 위 (숫자 요약) */}
  <AssetOverview />
  
  {/* 2열 그리드 */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
    {/* 카드 1: 채널별 수정률 */}
    <ChannelEditRatio />
    
    {/* 카드 2: 검수 결과 요약 */}
    <ReviewSummary />
  </div>
  
  {/* 2열 그리드 */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
    {/* 카드 3: 빈출 수정 패턴 */}
    <TopEditPatterns />
    
    {/* 카드 5: 최근 수정 이력 */}
    <RecentEditHistory />
  </div>
</div>
```

카드 공통 스타일:
```jsx
const cardStyle = {
  background: '#fff',
  border: '1px solid #E8E0D8',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

const cardTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  marginBottom: '16px',
  color: '#1a1a1a'
};
```

기존 BRITZMEDI 디자인과 맞추기:
- 배경: 약간 따뜻한 톤 (#FAF8F5 또는 기존 배경색 사용)
- 테두리: #E8E0D8 (기존 카드 스타일 참고)
- 폰트: 기존 시스템 폰트 유지
- 색상: 기존 브라운/골드 톤 유지하되, 데이터 시각화에는 녹/노/빨 사용

---

## 구현 방식

### 방법 A: 기존 대시보드 컴포넌트 교체

현재 대시보드 컴포넌트가 어디에 있는지 먼저 확인:
- src/components/Dashboard.jsx
- src/components/dashboard/Dashboard.jsx
- 또는 App.jsx에서 '대시보드' 탭이 렌더하는 컴포넌트

해당 컴포넌트의 내용을 Content Intelligence 대시보드로 교체.

### 방법 B: 기존 대시보드에 탭 추가

기존 대시보드에 유용한 내용이 있다면, "Intelligence" 탭을 추가.

→ 먼저 기존 대시보드 컴포넌트를 확인하고, 적절한 방법을 선택해라.

---

## 데이터 로딩

컴포넌트 마운트 시 한 번에 모든 데이터 로드:

```javascript
const [loading, setLoading] = useState(true);
const [dashboardData, setDashboardData] = useState(null);

useEffect(() => {
  async function loadDashboard() {
    setLoading(true);
    try {
      const [channelData, pressData, editData, assetCounts] = await Promise.all([
        loadChannelStats(),
        loadPressStats(),
        loadEditHistory(),
        loadAssetCounts()
      ]);
      setDashboardData({ channelData, pressData, editData, assetCounts });
    } catch (err) {
      console.error('[Dashboard] 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }
  loadDashboard();
}, []);
```

로딩 중 표시:
```jsx
if (loading) return <div>📊 대시보드 데이터 로딩 중...</div>;
```

---

## Supabase import

이미 프로젝트에 Supabase client가 설정되어 있음.
import 경로를 기존 파일들 (supabaseData.js 등)에서 확인하고 동일하게 사용.

---

## 모바일 대응

2열 그리드는 모바일에서 1열로:
```css
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

또는 인라인 스타일 대신 className 사용하고, 기존 프로젝트의 스타일링 방식을 따라라.

---

## 빌드 + 테스트

빌드 성공 확인 후:

1. 대시보드 탭 클릭 → 5개 카드 모두 렌더링
2. 학습 자산 현황: brand_voice_rules 12개, fact_database 5개, edit_history 2건 표시
3. 채널별 수정률: edit_ratio 데이터가 있는 채널 표시
4. 빈출 수정 패턴: edit_history에서 추출한 패턴 표시
5. 최근 수정 이력: 2건 타임라인 표시

배포 + git push.

---

## 파일 목록 (예상)

1. src/components/dashboard/IntelligenceDashboard.jsx — 새 파일 또는 기존 대시보드 수정
2. 기존 대시보드 컴포넌트 — 라우팅 연결 확인
