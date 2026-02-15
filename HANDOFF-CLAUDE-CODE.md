# BRITZMEDI Content Ops — Claude Code 핸드오프 문서

## 프로젝트 개요

BRITZMEDI(미용의료기기 제조/수출 기업)의 **콘텐츠 운영 시스템**을 독립 웹사이트로 구축.
내부 팀(본인 + 2~3명)이 사용하는 도구로, 콘텐츠 일정 관리 + AI 기반 콘텐츠 생산을 한 곳에서 처리.

- **D-Day**: 2/23 첫 콘텐츠 발행 시작
- **우선 채널**: Track B — 이메일 뉴스레터, 네이버 블로그, 카카오톡
- **프로토타입**: React JSX 아티팩트로 UI/로직 검증 완료 (아래 참고)

---

## 기술 스택 (권장)

| 항목 | 기술 | 이유 |
|------|------|------|
| 프레임워크 | React + Vite (또는 Next.js) | 프로토타입이 React로 작성됨 |
| 스타일링 | Tailwind CSS | 프로토타입이 Tailwind 클래스 사용 |
| 데이터베이스 | Supabase (PostgreSQL) | 무료 플랜, Auth 내장, 실시간 가능 |
| AI | Anthropic Claude API (Sonnet) | 콘텐츠 생성용, 이미 프롬프트 설계 완료 |
| 배포 | Cloudflare Pages 또는 Vercel | 무료, 빠른 배포 |

---

## 핵심 기능 5가지

### 1. 📊 대시보드
- D-Day 카운트다운 (2025-02-23)
- 전체 콘텐츠 수, Track A/B 분포, 발행완료 수
- 파이프라인 현황 (상태별 개수 + 프로그레스바)
- 다가오는 콘텐츠 5건 (발행일 기준 정렬)
- 주간 리듬 가이드 (월~금 역할 표시)

### 2. 📅 캘린더
- 월별 달력 뷰
- Track A(인디고) / Track B(오렌지) 색상 구분
- 2/23 D-DAY 하이라이트
- 월 이동 (이전/다음)

### 3. 🔄 파이프라인 (칸반 보드)
- 5단계: 아이디어(💭) → 초안작성(✍️) → 검토편집(👀) → 발행준비(✅) → 발행완료(🚀)
- 카드에서 다음/이전 단계로 이동 버튼
- 각 카드: 트랙 배지, 제목, 필라, 발행일 표시

### 4. 📢 발행관리
- 테이블 형태
- 6채널 체크박스 (블로그, LinkedIn, Instagram, 뉴스레터, 네이버, 카카오톡)
- Track A/B/전체 필터
- 발행일 기준 정렬

### 5. ✨ 콘텐츠 팩토리 (핵심 기능 — 아래 상세 설명)

---

## 콘텐츠 팩토리 상세 스펙

### 개요
주제와 채널만 선택하면 AI가 채널별 맞춤 완성본을 자동 생성하는 시스템.
AI에게 BRITZMEDI 컨텍스트 + 설문 데이터 + 톤앤매너 + 채널별 포맷 규칙을 모두 장착시켜서 고품질 콘텐츠 생산.

### UI 플로우 (4단계)

```
STEP 1: 콘텐츠 필라 선택 (B1~B6 카드형 버튼)
    ↓
STEP 2: 주제 선택 (필라별 프리셋 주제 목록 또는 직접 입력)
    ↓
STEP 3: 발행 채널 선택 — 복수 가능 (뉴스레터 / 네이버 / 카카오톡)
    ↓
STEP 4: 추가 설정 (발행일, 참고사항/소스)
    ↓
[✨ 콘텐츠 생성하기] 버튼
    ↓
채널별 탭으로 결과 표시 → 복사 / 파이프라인 등록 / 재생성
```

### AI 시스템 프롬프트 — BRITZMEDI 컨텍스트

아래 내용이 모든 AI 호출에 자동 포함됩니다:

```
## BRITZMEDI 회사 정보
- 회사: BRITZMEDI (브릿츠메디) — 한국 기반 미용의료기기 제조/수출 기업
- 주력 제품: TORR RF (토르 알에프) — RF 마이크로니들링 의료기기
- TORR RF 핵심 차별점: 비절연 니들 + 독자적 RF 에너지 전달 기술, 콜라겐 리모델링 극대화, 다운타임 최소화
- 타겟 시장: 국내 피부과/에스테틱 + 해외(동남아, 중동) 수출

## 113명 소비자 설문조사 핵심 데이터
- 이탈 1위: "효과없음" 27.4% ↔ 재방문 1위: "효과확실" 38.1% → 효과 입증이 핵심
- 브랜드 영향: 58.4% → 그런데 장비 선택 기준은 4.4%에 불과 → 브랜드와 장비 사이의 인식 갭 존재
- 피부과 선택 3강: 가성비 24.8% / 전문성 23.9% / 후기 20.4%
- 부작용 불안: 37.2% → 가장 큰 심리적 장벽
- 추천 경험: 70.8% → 추천율 높지만 체계적 추천 프로그램은 부재
- 정보채널 1위: 지인추천 48.7% / 온라인후기 33.6%
- 시술 빈도: 월 1회 이상 41.6% → 꽤 높은 재방문율

## 톤앤매너 가이드
- 대상: 국내 피부과 원장님, 디스트리뷰터, 의료기기 관계자
- 톤: 전문적이되 친근한, 데이터 기반, "동료 전문가가 인사이트를 공유하는" 느낌
- 절대 하지 말 것: 과장 광고, 의학적 효능 단정, 비교 광고, 환자 대상 언어
- 반드시 할 것: 출처/데이터 명시, 액셔너블한 인사이트, 원장님이 바로 활용 가능한 팁
```

### 채널별 포맷 규칙

#### 📧 이메일 뉴스레터
- **분량**: 1500~2000자
- **구조**: 제목(50자) → 프리헤더(80자) → 인트로(데이터로 시작) → 본문 섹션 3~4개(소제목+데이터+인사이트+액션팁) → 핵심요약 박스(3줄) → CTA
- **규칙**: 각 섹션에 구체적 숫자/데이터 1개+, 스캔하기 쉽게, [이미지 삽입 위치] 2~3곳 표시, 피드백 유도 문구

#### 📗 네이버 블로그
- **분량**: 2000~3000자
- **구조**: SEO 제목(키워드 앞배치, 40자) → 공감형 도입부 → 소제목 3~5개(데이터→인사이트→팁) → [이미지: 설명] 4곳+ → 핵심요약+CTA → 태그 10개
- **규칙**: SEO 키워드 자연 배치, 짧은 문단(3~4줄), 전문용어 쉬운 설명 병기, 이미지 프롬프트 3개 제공

#### 💬 카카오톡 카드뉴스
- **분량**: 카드 6~8장 (장당 40~80자)
- **구조**: 표지(충격 숫자/질문, 20자) → 본문 카드 5장(각 1메시지) → 요약(3줄) → CTA
- **형식**: 카드 N: [제목] / 메인텍스트 / 강조문구 / [이미지 가이드]
- **규칙**: 모든 카드에 숫자 1개+, 이모지 적극, 전문용어 최소화, 카드별 이미지 프롬프트 제공

### 필라별 주제 프리셋

#### B1: 설문 뉴스레터 (5주 시리즈)
1. **충격 데이터 5선 (1주차)**: 113명 설문 중 가장 충격적 데이터 5개 — 이탈 27.4%, 브랜드 58.4% vs 장비 4.4%, 부작용 불안 37.2%, 추천율 70.8%, 가성비 24.8%
2. **이탈 원인 분석 (2주차)**: 효과없음 27.4% 이탈 vs 효과확실 38.1% 재방문 미러링. 효과 체감 높이는 커뮤니케이션 전략
3. **브랜드 vs 장비 인식 갭 (3주차)**: 브랜드 58.4% vs 장비 4.4% 갭 분석. 원장님 브랜딩 전략 시사점
4. **부작용 불안 해소 전략 (4주차)**: 부작용 불안 37.2% 심리적 장벽 → 사전 커뮤니케이션, 동의서, 팔로업 전략
5. **추천율 70.8% 전환 전략 (5주차)**: 추천 경험 70.8%, 지인추천 48.7% → 체계적 추천 프로그램, 리뷰 관리, 소개 이벤트

#### B2: 시장 트렌드
1. 2025 국내 에스테틱 시장 전망
2. RF 마이크로니들링 시장 동향

#### B3: 규제/심의
1. 2025 의료기기 광고 심의 변경사항
2. 피부과 온라인 마케팅 주의사항

#### B4: 원장님 팁
1. 환자 재방문율 높이는 5가지 전략
2. 신규 장비 도입 의사결정 가이드

#### B5: MADMEDCHECK
1. AI 광고 심의 자동 체크 서비스 소개

#### B6: 성공사례
1. TORR RF 도입 성공사례

---

## 데이터 구조

### contents 테이블 (Supabase)

```sql
CREATE TABLE contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('A', 'B')),
  pillar TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '아이디어'
    CHECK (status IN ('아이디어', '초안작성', '검토편집', '발행준비', '발행완료')),
  channels JSONB DEFAULT '{}',
  -- channels 구조: { blog: bool, linkedin: bool, instagram: bool, newsletter: bool, naver: bool, kakao: bool }
  publish_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  author TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  -- AI 생성 콘텐츠 저장
  ai_drafts JSONB DEFAULT '{}',
  -- ai_drafts 구조: { newsletter: "생성된 텍스트", naver: "...", kakao: "..." }
  created_by UUID REFERENCES auth.users(id)
);
```

### 2트랙 시스템

| 구분 | Track A: 해외/글로벌 | Track B: 국내 전용 |
|------|---------------------|-------------------|
| 타겟 | 해외 바이어, 의료진, 관련사업자 | 국내 피부과 원장님, 디스트리뷰터 |
| 채널 | britzmedi.com 블로그, LinkedIn, Instagram | 이메일 뉴스레터, 네이버 블로그, 카카오톡 |
| 언어 | 영문 | 한국어 |

### 콘텐츠 필라

**Track A**: A1(Science), A2(Product/TORR RF), A3(Market), A4(Visual)
**Track B**: B1(설문 뉴스레터), B2(시장 트렌드), B3(규제/심의), B4(원장님 팁), B5(MADMEDCHECK), B6(성공사례)

### 주간 리듬

- 월: Track A 발행 (블로그+LinkedIn+Instagram)
- 화: 소재 발굴 (PubMed, 뉴스 스캔)
- 수: Track B 발행 (뉴스레터+네이버+카카오톡)
- 목: 다음 주 콘텐츠 제작
- 금: 선택적 추가 발행

---

## Claude API 호출 방식

### 엔드포인트
```
POST https://api.anthropic.com/v1/messages
```

### 요청 구조
```javascript
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 4000,
  messages: [{
    role: "user",
    content: `${BRITZMEDI_CONTEXT}\n\n${CHANNEL_FORMAT_RULES}\n\n---\n\n## 지금 작성할 콘텐츠\n\n**콘텐츠 필라**: ${pillar}\n**채널**: ${channel}\n**주제/방향**: ${topicPrompt}\n${extraContext ? `**추가 참고사항**: ${extraContext}` : ""}\n\n위의 회사 정보, 설문 데이터, 톤앤매너 가이드, 채널별 포맷 규칙을 모두 반영하여 바로 발행 가능한 수준의 완성본을 작성하세요.`
  }]
}
```

### API 키 관리
- 환경변수: `VITE_ANTHROPIC_API_KEY` (또는 서버사이드에서 `ANTHROPIC_API_KEY`)
- **중요**: API 키는 .env에 저장, .gitignore에 추가
- Anthropic 콘솔: https://console.anthropic.com

### 비용 추정
- Sonnet 모델: 입력 $3/MTok, 출력 $15/MTok
- 콘텐츠 1건(1채널): 입력 ~2K tokens, 출력 ~2K tokens ≈ $0.04 (~₩50)
- 3채널 동시: ~₩150
- 월 예상 (주 2~3건): ~₩5,000~10,000

---

## 인증/접근 제어

- Supabase Auth 사용 (이메일+비밀번호 방식)
- 사용자: 본인 + 팀원 2~3명
- 초대 방식: 관리자가 이메일로 초대 또는 회원가입 링크 공유
- 모든 DB 쿼리에 RLS(Row Level Security) 적용 권장

---

## 초기 데이터 (시드)

프로토타입에 12건의 샘플 콘텐츠가 있음. 배포 시 옵션:
- A) 빈 상태로 시작 (추천)
- B) 샘플 12건 시드

---

## 배포 설정

### Cloudflare Pages (권장)
```bash
# 빌드 명령어 (Vite 기준)
npm run build

# 출력 디렉토리
dist
```

### 환경변수 (Cloudflare Dashboard에서 설정)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### 커스텀 도메인 (선택)
```
content-ops.britzmedi.com
```

---

## 프로토타입 코드 참조

아래 파일을 참조용으로 사용하되, Supabase 연동 + 라우팅 + 인증 등을 추가하여 풀스택으로 재구축할 것.

프로토타입 위치: 이 프로젝트 폴더의 `prototype/content-ops-v4.jsx`

---

## 구축 순서 (권장)

### Phase 1: 기본 셋업
1. Vite + React + Tailwind 프로젝트 초기화
2. Supabase 프로젝트 생성 + DB 테이블 생성
3. Supabase Auth 설정 (이메일/비밀번호)
4. 기본 레이아웃 + 라우팅 (탭 네비게이션)

### Phase 2: 관리 기능 (대시보드, 캘린더, 파이프라인, 발행관리)
5. Supabase CRUD 연동
6. 대시보드 구현
7. 캘린더 구현
8. 칸반 파이프라인 구현
9. 발행관리 테이블 구현

### Phase 3: 콘텐츠 팩토리
10. 콘텐츠 팩토리 UI (4단계 플로우)
11. Claude API 연동 (서버사이드 프록시 권장 — API 키 보호)
12. 생성 결과 → Supabase에 ai_drafts로 저장
13. 파이프라인 자동 등록

### Phase 4: 배포
14. Cloudflare Pages 또는 Vercel 배포
15. 환경변수 설정
16. 커스텀 도메인 연결 (선택)

---

## 참고: 기존 BRITZMEDI 기술 스택

- **MADMEDCHECK** (의료 광고 심의): Hono + TypeScript + D1, 배포: Cloudflare Workers
- **britzmedi.com**: Astro5 + React19 + Tailwind4, CMS: Keystatic, 배포: Cloudflare Pages

이 프로젝트는 위와 독립적인 새 사이트로 구축.
