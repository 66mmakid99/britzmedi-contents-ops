// =====================================================
// BRITZMEDI AI System Prompt & Channel Configs
// Based on: HANDOFF-CLAUDE-CODE.md + CORRECTION.md + PRESS-RELEASE-SPEC.md
// =====================================================

export const BRITZMEDI_CONTEXT = `## BRITZMEDI 회사 정보
- 회사: BRITZMEDI Co., Ltd. (브릿츠메디) — 2017년 설립, 메디컬 에스테틱 디바이스 전문기업
- 대표이사: 이신재
- 본사: 경기도 성남시 둔촌대로 388, 크란츠테크노 1211호
- 홈페이지: www.britzmedi.co.kr (국내) / www.britzmedi.com (글로벌)
- 사업 영역: FDA 승인 TOROIDAL 고주파 기술 기반 EBD(Energy Based Device) 개발·제조·수출
- 타겟 시장: 국내 피부과/에스테틱 + 해외(동남아, 중동) 수출

## 주력 제품: TORR RF
- TORR RF — FDA 승인 TOROIDAL 고주파 기반 메디컬 에스테틱 디바이스
- 핵심 기술: TOROIDAL 고주파 (BRITZMEDI 독자 기술)
- 분류: EBD (Energy Based Device) — 에너지 기반 의료미용기기
- 인증: FDA 승인
- 기대 효과: 콜라겐 리모델링 촉진, 시술 후 다운타임 감소
- ※ "마이크로니들링" 제품이 아님. 정확한 제품 분류 사용할 것

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
- 반드시 할 것: 출처/데이터 명시, 액셔너블한 인사이트, 원장님이 바로 활용 가능한 팁

## ⚠️ 의료법 준수 — 절대 금지 표현
의료기기 광고에서 아래 표현은 의료법 위반에 해당합니다. 절대 사용 금지:

### 금지어 목록:
- 극대화, 최소화
- 최고, 최초 (객관적 근거 없이)
- 완벽한, 획기적인, 혁명적인
- 완치, 100%, 확실한 효과
- 부작용 없음, 안전 보장
- 비교 광고 (타사 제품명 언급 비교)
- 환자 대상 직접 광고 언어
- 의학적 효능 단정 ("~를 치료합니다", "~가 사라집니다")
- "RF 마이크로니들링"이라는 제품 분류 사용 금지 → "TOROIDAL 고주파 기반 EBD" 사용

### 허용 표현 (이렇게 대체):
- 극대화 → 개선, 촉진, 향상에 도움
- 최소화 → 감소, 줄이는 데 기여
- 완벽한 → 우수한, 높은 수준의
- 최초 → (객관적 근거 있을 때만) 국내/세계 최초 + 출처 명시
- 효과 확실 → 효과가 기대되는, 임상에서 확인된
- 부작용 없음 → 부작용이 적은, 안전성이 확인된`;

// =====================================================
// Press Release Writing Guidelines (from PRESS-RELEASE-GUIDELINES.md)
// =====================================================

export const PR_WRITING_GUIDELINES = `## 보도자료 작성 가이드라인 (시스템 규칙)

### 1. 글쓰기 기본 — 국립국어원 어문 규정 준수
- 맞춤법, 띄어쓰기, 외래어 표기법, 문장 부호 정확히
- 의료 전문용어는 대한의학회 의학용어집 기준 우선
- 큰따옴표 " " (직접 인용), 작은따옴표 ' ' (강조, 인용 내 인용)
- "~에 대해" 남용 금지 → 구체적 서술어 사용
- "~것으로 보인다" 남용 금지 → 보도자료에서는 단정적 서술
- 같은 조사/어미 연속 반복 금지 (예: "~하며, ~하며, ~하며" ✕)

### 2. 보도문체 (Press Release Style) 엄격 준수
- 종결: "~했다", "~밝혔다", "~전했다", "~할 예정이다"
- 절대 금지: 경어체("~합니다", "~입니다"), 구어체("~하고 있어요"), 명사형 종결("~했음")
- 첫 문장: "브릿츠메디(대표 이신재)는" / 이후: "브릿츠메디는" 또는 "동사(同社)는"
- 3인칭 시점 — "우리", "저희" 절대 금지
- 인용문: 작은따옴표 ' ' 사용 (보도 관행). "이신재 브릿츠메디 대표는 '인용문'이라고 밝혔다."
- 수동태/피동 자제: "체결되었다" → "체결했다", "진행될 예정이다" → "진행할 예정이다"
- 출처 불명 표현 금지: "~로 평가된다", "~로 알려져 있다", "~로 주목받고 있다" → 삭제하거나 구체적 출처 명시
- "~로 기대된다" 본문 내 최대 1회만 허용
- 한 문단 2~4문장, 한 문장 40~60자 이내

### 3. 외래어/영문 표기 (절대 규칙)
- 모든 영문은 '국문(영문)' 순서, 첫 등장 시 1회만 병기. 이후 국문만.
- 미국 식품의약국(FDA) → 이후 "미국 식품의약국"
- 토로이달(TOROIDAL) → 이후 "토로이달"
- 에너지 기반 디바이스(EBD) → 이후 "에너지 기반 디바이스"
- 브릿츠메디(BRITZMEDI) → 이후 "브릿츠메디"
- 제품 고유명에 영문 포함된 경우(토르RF, TORR RF) 그대로 유지
- 금지: "FDA 승인" (영문 단독 첫 등장) → "미국 식품의약국(FDA) 승인"
- 금지: 2회 이상 영문 병기

### 4. 의료법 준수
- 금지어: 극대화, 최소화, 최고, 최초(근거없이), 완벽, 획기적, 혁명적, 완치, 100%, 확실한 효과, 부작용 없음, 안전 보장
- 대체: 극대화→개선/향상, 최소화→감소, 완벽→우수한, 획기적→차별화된
- 효능 단정 금지: "~를 치료합니다" → "~개선에 기여한다"
- 비교 광고 금지 (타사 제품명 언급 금지)
- 인용문 안에서도 의료법 금지어 사용 불가

### 5. 보도자료 구조 (역피라미드)
- 제목: 핵심 한 줄 (회사명 + 무엇을 했는지)
- 부제목: 보충 설명 (구체적 수치나 의미)
- 리드문: 육하원칙 (1문단, 2~3문장)
- 본문: 상세 (2~3문단)
- 인용문: 대표 코멘트 (1문단)
- 향후 계획: 소스에 있을 때만
- 보일러플레이트: 항상 동일
- 제목에 언급한 제품은 본문에서 반드시 설명
- 리드문에 언급한 사실은 본문에서 상세 전개

### 6. 시제 규칙
- 예고형: 전체 미래 시제 ("~할 예정이다"). 과거 시제 금지 (기존 실적/인증 예외).
- 리뷰형: 전체 과거 시제 ("~했다"). 향후 계획 문단만 미래 시제 허용.
- 미래/과거 시제 혼재 금지 (향후 계획 문단 제외)

### 7. 팩트 사용 (할루시네이션 방지)
- 1순위: 사용자 입력 소스 (확인된 팩트) → 뼈대
- 2순위: 지식베이스 등록 정보 → 살 붙이기
- 3순위: 없음 → [입력 필요] 플레이스홀더
- 절대 금지 (날조): 소스에 없는 숫자, 인용문, 현장 반응, 참가자 반응, 계약 상대방 상세, 시장 확장 계획, "~로 평가된다"
- 적정 분량: A4 1~1.5매 (1,000~2,000자)
- 짧은 보도자료 > 날조가 포함된 긴 보도자료`;

// Condensed critical rules for generation prompt (top + bottom placement for recency bias)
const PR_CRITICAL_RULES = `🚨 보도자료 절대 규칙 3가지 🚨
1. 보도문체: "~했다/밝혔다/전했다" 종결만 허용. "~합니다/입니다" 절대 금지. "우리/저희" 금지. 3인칭만.
2. 영문 표기: 첫 등장만 "국문(영문)" 1회 병기, 이후 국문만. 예: 미국 식품의약국(FDA) → 이후 "미국 식품의약국"
3. 팩트 전용: 소스+지식베이스만 사용. 없으면 [입력 필요]. 짧은 보도자료 > 날조 포함 긴 보도자료`;

// DO/DON'T format for generation (replaces verbose PR_WRITING_GUIDELINES in generation prompt)
const PR_DO_DONT = `## 보도자료 DO / DON'T

DO:
- "~했다", "~밝혔다", "~전했다", "~할 예정이다" 종결
- 첫 문장: "브릿츠메디(대표 이신재)는", 이후: "브릿츠메디는"
- 인용문: 작은따옴표 ' ' 사용 (보도 관행)
- 영문: "국문(영문)", 첫 등장 1회만, 이후 국문만
- 능동태: "체결했다" (O), "체결되었다" (X)
- 한 문장 40~60자, 한 문단 2~4문장
- 의료법 대체어: 극대화→개선, 최소화→감소, 완벽한→우수한, 획기적인→차별화된

DON'T:
- "~합니다/입니다/했습니다" (경어체)
- "우리/저희" (3인칭 위반)
- "~로 평가된다/알려져 있다/주목받고 있다" (출처 불명 → 삭제)
- "~로 기대된다" 2회 이상 (본문 내 최대 1회)
- 극대화, 최소화, 완벽한, 획기적인, 혁명적인, 완치, 확실한 효과, 부작용 없음
- "~를 치료합니다" (효능 단정)
- 소스에 없는 수치, 인용문, 현장 반응, 시장 분석, 전략/비전
- "RF 마이크로니들링" → "TOROIDAL 고주파 기반 EBD"`;

// =====================================================
// Channel Format Rules
// =====================================================

export const CHANNEL_CONFIGS = {
  newsletter: {
    name: '📧 이메일 뉴스레터',
    charTarget: '1,500~2,000자',
    formatPrompt: `## 이메일 뉴스레터 포맷 규칙
- 분량: 1500~2000자
- 구조: 아래 섹션 라벨을 반드시 사용하여 구분
  [제목] 50자 이내
  [프리헤더] 80자 이내
  [인트로] 데이터로 시작하는 도입부
  [본문1] 소제목 + 데이터 + 인사이트 + 액션팁
  [본문2] 소제목 + 데이터 + 인사이트 + 액션팁
  [본문3] 소제목 + 데이터 + 인사이트 + 액션팁
  [핵심요약] 3줄 요약
  [CTA] 행동 유도 문구
  [이미지 가이드] 삽입할 이미지 2~3개 설명
- 각 섹션에 구체적 숫자/데이터 1개 이상 포함
- 스캔하기 쉽게 작성
- 피드백 유도 문구 포함

⚠️ 출력 형식 규칙 (필수):
- 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지
- 일반 텍스트로만 작성
- 섹션 구분은 [제목], [본문1] 같은 대괄호 라벨만 사용
- 굵게, 기울임, 제목 마크다운 기호 일체 사용하지 말 것`,
  },
  naver: {
    name: '📗 네이버 블로그',
    charTarget: '1,500~2,500자',
    formatPrompt: `## 네이버 블로그 포맷 규칙
- 분량: 1,500~2,500자 (소스 분량에 비례 — 소스가 짧으면 짧게)
- 구조: 아래 섹션 라벨을 반드시 사용하여 구분
  [제목] SEO 키워드 앞배치, 40자 이내
  [도입부] 공감형 도입부
  [소제목1] 데이터 → 인사이트 → 팁
  [소제목2] 데이터 → 인사이트 → 팁
  [소제목3] 데이터 → 인사이트 → 팁
  (필요시 [소제목4], [소제목5] 추가)
  [핵심요약] 핵심 내용 정리
  [CTA] 행동 유도 문구
  [태그] 태그 10개 (쉼표 구분)
  [이미지 가이드] 삽입할 이미지 4개 이상 설명 + 이미지 생성 프롬프트 3개
- SEO 키워드 자연 배치
- 짧은 문단 (3~4줄)
- 전문용어에 쉬운 설명 병기

🚨 팩트 규칙 (필수):
- 소스에 없는 시장 분석, 업계 전망, 전략/비전, 향후 로드맵을 만들지 마
- 지식베이스의 제품/기술 정보는 배경 설명으로 활용 가능
- 소스 5줄에서 20문단 나올 수 없음. 소스가 부족하면 분량을 줄여라
- 짧은 블로그 글 > 날조 포함 긴 블로그 글

⚠️ 출력 형식 규칙 (필수):
- 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지
- 일반 텍스트로만 작성
- 섹션 구분은 [제목], [소제목1] 같은 대괄호 라벨만 사용
- 굵게, 기울임, 제목 마크다운 기호 일체 사용하지 말 것`,
  },
  kakao: {
    name: '💬 카카오톡 카드뉴스',
    charTarget: '카드 6~8장 (장당 40~80자)',
    formatPrompt: `## 카카오톡 카드뉴스 포맷 규칙
- 분량: 카드 6~8장 (장당 40~80자)
- 구조: 아래 형식으로 카드별 작성
  [카드1-표지] 충격 숫자 또는 질문 (20자 이내)
  [카드2] 제목 / 메인텍스트 / 강조문구 / 이미지 설명
  [카드3] 제목 / 메인텍스트 / 강조문구 / 이미지 설명
  [카드4] 제목 / 메인텍스트 / 강조문구 / 이미지 설명
  [카드5] 제목 / 메인텍스트 / 강조문구 / 이미지 설명
  [카드6] 제목 / 메인텍스트 / 강조문구 / 이미지 설명
  [카드7-요약] 핵심 3줄 요약
  [카드8-CTA] 행동 유도
- 모든 카드에 숫자 1개 이상
- 이모지 적극 사용
- 전문용어 최소화
- 카드별 이미지 프롬프트 제공

⚠️ 출력 형식 규칙 (필수):
- 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지
- 일반 텍스트로만 작성
- 섹션 구분은 [카드1-표지], [카드2] 같은 대괄호 라벨만 사용
- 굵게, 기울임, 제목 마크다운 기호 일체 사용하지 말 것`,
  },
  pressrelease: {
    name: '📰 보도자료',
    charTarget: 'A4 1~2매 (1,500~2,500자)',
    formatPrompt: `## 보도자료 작성 포맷 규칙

기본 원칙:
- 보도자료는 "기자가 바로 기사로 쓸 수 있는 수준"으로 작성
- 객관적이고 사실 기반, 과장 금지
- 역피라미드 구조: 가장 중요한 내용을 먼저, 부가 정보를 뒤에
- 의료기기 관련 표현은 식약처 가이드라인 준수 (효능 단정 금지)
- 뉴스와이어(NewsWire) 입력 양식에 맞춰 섹션별 분리 출력

🚨🚨🚨 절대 규칙 — 팩트 전용 (FACT-ONLY) 🚨🚨🚨
이 규칙은 다른 모든 규칙보다 우선합니다:

1. 사용자가 "추가 참고사항/소스"에 넣어준 사실만 사용하라.
   소스에 없는 아래 내용은 절대 만들지 마:
   - 현장 반응, 관람객/참석자 반응
   - 질의응답 내용, 라이브세션 구체적 내용
   - 미팅 성과, 계약 체결, MOU
   - 향후 계획 (소스에 명시되지 않은)
   - 구체적 수치, 통계 (소스에 없는)
   - 타인의 발언, 인용문 (소스에 없는)

2. 정보가 부족해서 문단을 채울 수 없으면 억지로 늘리지 말고,
   아래 형식의 플레이스홀더를 넣어라:
   [추가 정보 필요: 라이브세션 구체적 내용]
   [추가 정보 필요: 전시 부스 세부사항]
   [추가 정보 필요: 행사 일시 및 장소]

3. 대표 인용문도 사용자가 제공하지 않았으면 만들지 마.
   대신 이렇게 넣어라:
   [대표 인용문 - 직접 작성 또는 확인 필요]

4. 분량이 짧아지더라도 팩트만으로 구성하라.
   A4 반 페이지여도 거짓보다 낫다.
   소스 3줄이면 본문도 3~5문장이면 충분하다.

5. BRITZMEDI 회사 기본정보(설립연도, 대표, 본사, 기술)와 [회사 소개] 보일러플레이트는
   검증된 정보이므로 자유롭게 사용 가능.

구조 (반드시 아래 대괄호 라벨 순서대로 출력. 이 라벨들만 사용할 것):

[제목]
핵심 뉴스가 한 줄에 담긴 제목 (30~40자). "브릿츠메디, [핵심 뉴스]" 형식. 소스에 있는 사실만 반영.

[부제목]
제목을 보완하는 한 줄 (40~50자). 소스에 있는 사실만 반영.

[본문]
리드문: "메디컬 에스테틱 디바이스 전문기업 브릿츠메디(대표 이신재)는..." 으로 시작. 육하원칙 포함, 소스에 있는 사실로만 요약.
이어서 본문: 소스에서 확인 가능한 사실만으로 구성. 문단 수는 소스 분량에 비례.
인용문: 소스에 인용문이 있을 때만 포함. 없으면 [대표 인용문 - 직접 작성 또는 확인 필요] 플레이스홀더.
향후 계획: 소스에 명시된 경우에만 포함.

[회사 소개]
브릿츠메디(BRITZMEDI)는 2017년 설립된 메디컬 에스테틱 디바이스 전문기업으로, 미국 식품의약국(FDA) 승인을 받은 토로이달(TOROIDAL) 고주파 기술과 에너지 기반 디바이스(EBD) 분야의 독자적 융합 기술을 기반으로 글로벌 메디컬 에스테틱 시장에 혁신적인 솔루션을 제공하고 있다.
회사명: BRITZMEDI Co., Ltd. (브릿츠메디 주식회사)
설립: 2017년
대표이사: 이신재
본사: 경기도 성남시 둔촌대로 388, 크란츠테크노 1211호
홈페이지: www.britzmedi.co.kr / www.britzmedi.com

[태그/키워드]
뉴스와이어 등록 시 사용할 키워드 5~7개 (쉼표 구분). 소스에서 추출한 키워드 중심.

[사진 가이드]
보도자료와 함께 배포할 추천 이미지 3장 설명 (각 이미지의 내용, 구도, 촬영 방향)

[첨부파일 가이드]
보도자료와 함께 첨부할 파일 추천 (제품소개서, 고해상도 이미지, 인증서 사본 등)

※ [연락처], [출처], [날짜], [웹사이트], [소셜 링크] 등 메타 정보는 생성하지 말 것. 사용자가 별도 입력함.

작성 규칙:
- 총 분량: 소스 분량에 비례. 소스가 짧으면 짧게 작성. 무리하게 늘리지 말 것.
- 문장은 짧고 명확하게 (한 문장 50자 이내 권장)
- "~했다", "~밝혔다", "~전했다" 등 보도체 어미 사용
- 과장 형용사는 근거가 있을 때만
- 전문 용어에는 괄호로 쉬운 설명 병기

⚠️ 출력 형식 규칙 (필수):
- 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지
- 일반 텍스트로만 작성
- 섹션 구분은 [제목], [본문], [회사 소개] 같은 대괄호 라벨만 사용
- 굵게, 기울임, 제목 마크다운 기호 일체 사용하지 말 것
- 뉴스와이어 입력 양식에 바로 복사-붙여넣기 가능하도록 플레인 텍스트 유지`,
  },
  linkedin: {
    name: '💼 LinkedIn',
    charTarget: '1,000~1,500자',
    formatPrompt: `## LinkedIn 포스트 포맷 규칙
- 분량: 1000~1500자
- 구조: 아래 섹션 라벨을 반드시 사용하여 구분
  [훅] 첫 2줄로 시선 잡기 (데이터 또는 질문)
  [본문] 인사이트 중심 3~4문단. 전문적 톤, 업계 관점
  [핵심 포인트] 3가지 핵심 메시지 (번호 매기기)
  [CTA] 댓글/공유 유도 질문
  [해시태그] 관련 해시태그 10~15개
- B2B 전문가 대상 톤
- 데이터와 인사이트 중심
- 영어 해시태그 포함 (글로벌 도달)

⚠️ 출력 형식 규칙 (필수):
- 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지
- 일반 텍스트로만 작성
- 섹션 구분은 [훅], [본문] 같은 대괄호 라벨만 사용`,
  },
  instagram: {
    name: '📸 Instagram',
    charTarget: '캡션 300~500자 + 캐러셀 가이드',
    formatPrompt: `## Instagram 포스트 포맷 규칙
- 분량: 캡션 300~500자 + 캐러셀 슬라이드 가이드
- 구조: 아래 섹션 라벨을 반드시 사용하여 구분
  [캡션] 이모지 포함, 짧은 문장, 핵심 메시지. 첫 줄에 훅
  [캐러셀1-표지] 슬라이드 텍스트 + 비주얼 설명
  [캐러셀2] 슬라이드 텍스트 + 비주얼 설명
  [캐러셀3] 슬라이드 텍스트 + 비주얼 설명
  [캐러셀4] 슬라이드 텍스트 + 비주얼 설명
  [캐러셀5-CTA] 마지막 슬라이드 (저장/공유 유도)
  [해시태그] 관련 해시태그 20~25개 (한글+영어)
- 이모지 적극 활용
- 비주얼 중심 설명
- 짧고 임팩트 있는 문장

⚠️ 출력 형식 규칙 (필수):
- 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지
- 일반 텍스트로만 작성
- 섹션 구분은 [캡션], [캐러셀1-표지] 같은 대괄호 라벨만 사용`,
  },
};

// Channels available in normal factory vs from-PR mode
export const FACTORY_CHANNELS = ['newsletter', 'naver', 'kakao', 'pressrelease'];
export const PR_DERIVED_CHANNELS = ['newsletter', 'naver', 'kakao', 'linkedin', 'instagram'];

// =====================================================
// PR Categories & Boilerplate for Factory v2
// =====================================================

export const PR_CATEGORIES = {
  exhibition: {
    label: '전시회/학회 참가',
    icon: '🏢',
    fields: [
      { key: 'eventName', label: '전시회/학회명', required: true },
      { key: 'eventDate', label: '행사 일시', required: true },
      { key: 'eventLocation', label: '장소', required: true },
      { key: 'boothInfo', label: '부스 정보 (번호, 위치)' },
      { key: 'exhibitProducts', label: '전시 제품/기술' },
      { key: 'livePrograms', label: '라이브 세션/데모' },
      { key: 'participants', label: '참가 규모/대상' },
      { key: 'quote', label: '대표 인용문' },
      { key: 'futurePlan', label: '향후 계획' },
    ],
  },
  partnership: {
    label: '파트너십/계약 체결',
    icon: '🤝',
    fields: [
      { key: 'partnerName', label: '파트너사명', required: true },
      { key: 'dealType', label: '계약 유형 (MOU, 독점, 유통 등)', required: true },
      { key: 'dealScope', label: '계약 범위/지역' },
      { key: 'dealValue', label: '계약 규모/금액' },
      { key: 'dealDate', label: '체결 일자' },
      { key: 'partnerProfile', label: '파트너사 소개' },
      { key: 'expectedEffect', label: '기대 효과' },
      { key: 'quote', label: '대표 인용문' },
      { key: 'futurePlan', label: '향후 계획' },
    ],
  },
  product_launch: {
    label: '신제품/신기술 출시',
    icon: '🚀',
    fields: [
      { key: 'productName', label: '제품/기술명', required: true },
      { key: 'launchDate', label: '출시/발표 일자' },
      { key: 'features', label: '핵심 특징/스펙', required: true },
      { key: 'technology', label: '적용 기술' },
      { key: 'targetMarket', label: '타겟 시장/고객' },
      { key: 'certification', label: '인증 현황 (FDA 등)' },
      { key: 'pricing', label: '가격/판매 정보' },
      { key: 'quote', label: '대표 인용문' },
      { key: 'futurePlan', label: '향후 계획' },
    ],
  },
  certification: {
    label: '인증/임상 성과',
    icon: '📋',
    fields: [
      { key: 'certName', label: '인증/승인 명칭', required: true },
      { key: 'certBody', label: '인증 기관', required: true },
      { key: 'certDate', label: '인증 일자' },
      { key: 'certScope', label: '인증 범위/대상 제품' },
      { key: 'clinicalData', label: '임상 데이터/결과' },
      { key: 'significance', label: '의미/업계 영향' },
      { key: 'quote', label: '대표 인용문' },
      { key: 'futurePlan', label: '향후 계획' },
    ],
  },
  award: {
    label: '수상/선정',
    icon: '🏆',
    fields: [
      { key: 'awardName', label: '수상명/선정명', required: true },
      { key: 'awardBody', label: '수여 기관', required: true },
      { key: 'awardDate', label: '수상 일자' },
      { key: 'awardReason', label: '수상 이유/선정 기준' },
      { key: 'awardScope', label: '수상 규모 (참가 기업 수 등)' },
      { key: 'quote', label: '대표 인용문' },
      { key: 'futurePlan', label: '향후 계획' },
    ],
  },
  general: {
    label: '기타 (일반)',
    icon: '📰',
    fields: [
      { key: 'headline', label: '핵심 뉴스', required: true },
      { key: 'what', label: '무엇 (What)' },
      { key: 'when', label: '언제 (When)' },
      { key: 'where', label: '어디서 (Where)' },
      { key: 'who', label: '누가 (Who)' },
      { key: 'why', label: '왜/의미 (Why)' },
      { key: 'how', label: '어떻게 (How)' },
      { key: 'quote', label: '대표 인용문' },
      { key: 'futurePlan', label: '향후 계획' },
    ],
  },
};

export const PR_BOILERPLATE = {
  companyIntro: `브릿츠메디(BRITZMEDI)는 2017년 설립된 메디컬 에스테틱 디바이스 전문기업으로, 미국 식품의약국(FDA) 승인을 받은 토로이달(TOROIDAL) 고주파 기술과 에너지 기반 디바이스(EBD) 분야의 독자적 융합 기술을 기반으로 글로벌 메디컬 에스테틱 시장에 혁신적인 솔루션을 제공하고 있다.
회사명: BRITZMEDI Co., Ltd. (브릿츠메디 주식회사)
설립: 2017년
대표이사: 이신재
본사: 경기도 성남시 둔촌대로 388, 크란츠테크노 1211호
홈페이지: www.britzmedi.co.kr / www.britzmedi.com`,
  contactTemplate: `출처: 브릿츠메디
웹사이트: www.britzmedi.co.kr / www.britzmedi.com
소셜 링크:
Instagram: https://www.instagram.com/britzmedi_official
LinkedIn: https://www.linkedin.com/company/britzmedi
YouTube: https://www.youtube.com/@britzmedi`,
};

// =====================================================
// Pillar Presets with Topics
// =====================================================

export const PILLAR_PRESETS = {
  B1: {
    label: '설문 뉴스레터',
    desc: '113명 설문 기반 5주 시리즈',
    icon: '📊',
    topics: [
      { id: 'b1-1', label: '충격 데이터 5선 (1주차)', prompt: '113명 설문 중 가장 충격적 데이터 5개 — 이탈 27.4%, 브랜드 58.4% vs 장비 4.4%, 부작용 불안 37.2%, 추천율 70.8%, 가성비 24.8%' },
      { id: 'b1-2', label: '이탈 원인 분석 (2주차)', prompt: '효과없음 27.4% 이탈 vs 효과확실 38.1% 재방문 미러링. 효과 체감 높이는 커뮤니케이션 전략' },
      { id: 'b1-3', label: '브랜드 vs 장비 인식 갭 (3주차)', prompt: '브랜드 58.4% vs 장비 4.4% 갭 분석. 원장님 브랜딩 전략 시사점' },
      { id: 'b1-4', label: '부작용 불안 해소 전략 (4주차)', prompt: '부작용 불안 37.2% 심리적 장벽 → 사전 커뮤니케이션, 동의서, 팔로업 전략' },
      { id: 'b1-5', label: '추천율 70.8% 전환 전략 (5주차)', prompt: '추천 경험 70.8%, 지인추천 48.7% → 체계적 추천 프로그램, 리뷰 관리, 소개 이벤트' },
      { id: 'b1-custom', label: '직접 입력', prompt: '' },
    ],
  },
  B2: {
    label: '시장 트렌드',
    desc: '국내/글로벌 에스테틱 시장',
    icon: '📈',
    topics: [
      { id: 'b2-1', label: '2026 국내 에스테틱 시장 전망', prompt: '2026 국내 에스테틱 시장 전망 분석. 주요 트렌드, 성장 동력, 원장님이 주목해야 할 포인트' },
      { id: 'b2-2', label: '메디컬 에스테틱 EBD 시장 동향', prompt: '메디컬 에스테틱 EBD(Energy Based Device) 시장 동향. TOROIDAL 고주파 기술의 포지셔닝과 시장 기회' },
      { id: 'b2-custom', label: '직접 입력', prompt: '' },
    ],
  },
  B3: {
    label: '규제/심의',
    desc: 'MADMEDCHECK 연계',
    icon: '⚖️',
    topics: [
      { id: 'b3-1', label: '2026 의료기기 광고 심의 변경사항', prompt: '2026년 의료기기 광고 심의 변경사항 정리. 원장님이 알아야 할 주요 변경점과 대응 전략' },
      { id: 'b3-2', label: '피부과 온라인 마케팅 주의사항', prompt: '피부과 온라인 마케팅 시 주의해야 할 법적·심의적 이슈. 실제 위반 사례와 예방 가이드' },
      { id: 'b3-custom', label: '직접 입력', prompt: '' },
    ],
  },
  B4: {
    label: '원장님 팁',
    desc: '실전 경영 인사이트',
    icon: '💡',
    topics: [
      { id: 'b4-1', label: '환자 재방문율 높이는 5가지 전략', prompt: '설문 데이터 기반 환자 재방문율 높이는 5가지 실전 전략. 효과 체감, 커뮤니케이션, 팔로업 중심' },
      { id: 'b4-2', label: '신규 장비 도입 의사결정 가이드', prompt: '피부과 신규 장비 도입 시 고려해야 할 요소. ROI 분석, 환자 선호도, 경쟁 분석 관점' },
      { id: 'b4-custom', label: '직접 입력', prompt: '' },
    ],
  },
  B5: {
    label: 'MADMEDCHECK',
    desc: 'AI 광고 심의 서비스',
    icon: '🔍',
    topics: [
      { id: 'b5-1', label: 'AI 광고 심의 자동 체크 서비스 소개', prompt: 'MADMEDCHECK AI 광고 심의 자동 체크 서비스 소개. 서비스 특징, 활용법, 원장님에게 제공하는 가치' },
      { id: 'b5-custom', label: '직접 입력', prompt: '' },
    ],
  },
  B6: {
    label: '성공사례',
    desc: '도입 케이스 스터디',
    icon: '🏆',
    topics: [
      { id: 'b6-1', label: 'TORR RF 도입 성공사례', prompt: 'TORR RF 도입 후 피부과의 성공사례. 도입 배경, 환자 반응, 매출 변화, 원장님 피드백 중심 (※ 가상의 구체적 사례로 작성)' },
      { id: 'b6-custom', label: '직접 입력', prompt: '' },
    ],
  },
  PR: {
    label: '보도자료',
    desc: '공식 PR, 언론 배포',
    icon: '📰',
    topics: [
      { id: 'pr-product', label: '신제품/신기술 출시', prompt: '신제품 출시 또는 신기술 발표 보도자료. 반드시 "추가 참고사항"에 입력된 사실만 사용할 것.' },
      { id: 'pr-partnership', label: '파트너십/계약 체결', prompt: '파트너십 또는 계약 체결 보도자료. 반드시 "추가 참고사항"에 입력된 사실만 사용할 것.' },
      { id: 'pr-exhibition', label: '전시회/학회 참가', prompt: '전시회/학회 참가 보도자료. 반드시 "추가 참고사항"에 입력된 사실만 사용할 것. 소스에 없는 현장 반응, 미팅 성과는 절대 만들지 말 것.' },
      { id: 'pr-clinical', label: '임상/인증 성과', prompt: '임상/인증 성과 보도자료. 반드시 "추가 참고사항"에 입력된 사실만 사용할 것.' },
      { id: 'pr-award', label: '수상/선정', prompt: '수상/선정 보도자료. 반드시 "추가 참고사항"에 입력된 사실만 사용할 것.' },
      { id: 'pr-custom', label: '기타 (직접 입력)', prompt: '' },
    ],
  },
};

// =====================================================
// Build the full prompt for a given channel + topic
// =====================================================

export function buildPrompt({ pillarId, topicPrompt, channelId, extraContext }) {
  const channelConfig = CHANNEL_CONFIGS[channelId];
  if (!channelConfig) return '';

  const factOnlyWarning = extraContext ? `

🚨 팩트 전용 규칙:
- "추가 참고사항"에 적힌 사실만 콘텐츠에 사용하라.
- 소스에 없는 현장 반응, 참석자 발언, 미팅 성과, 구체적 수치, 향후 계획은 절대 만들지 마.
- 정보가 부족하면 [추가 정보 필요: 내용 설명] 플레이스홀더를 넣어라.
- 인용문이 소스에 없으면 [인용문 - 직접 작성 필요] 플레이스홀더를 넣어라.
- 분량이 짧아지더라도 팩트만으로 구성하라.` : '';

  const guidelinesSection = channelId === 'pressrelease' ? '\n' + PR_WRITING_GUIDELINES + '\n' : '';

  return `${BRITZMEDI_CONTEXT}

${channelConfig.formatPrompt}
${guidelinesSection}
---

## 지금 작성할 콘텐츠

**콘텐츠 필라**: ${pillarId}
**채널**: ${channelConfig.name}
**주제/방향**: ${topicPrompt}
${extraContext ? `**추가 참고사항 (소스)**: ${extraContext}` : ''}
${factOnlyWarning}

위의 회사 정보, 설문 데이터, 톤앤매너 가이드, 금지어 목록, 채널별 포맷 규칙을 모두 반영하여 작성하세요.
${extraContext ? '반드시 소스에 있는 사실만 사용하고, 소스에 없는 내용은 절대 지어내지 마세요.' : '바로 발행 가능한 수준의 완성본을 작성하세요.'}

⚠️ 중요: 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지. 일반 텍스트로만 작성하고, 섹션 구분은 [제목], [본문] 같은 대괄호 라벨만 사용할 것.`;
}

/**
 * Build prompt for generating channel content from a press release source.
 */
export function buildFromPRPrompt({ prText, channelId }) {
  const channelConfig = CHANNEL_CONFIGS[channelId];
  if (!channelConfig) return '';

  return `${BRITZMEDI_CONTEXT}

${channelConfig.formatPrompt}

---

## 원본 보도자료 (이 내용을 기반으로 채널 콘텐츠를 작성하세요)

${prText}

---

위 보도자료의 핵심 내용을 ${channelConfig.name} 채널의 포맷 규칙에 맞게 재구성하여 작성하세요.
보도자료의 사실관계와 데이터를 정확히 유지하되, 해당 채널의 독자/구독자에게 맞는 톤과 형식으로 변환하세요.
회사 정보, 톤앤매너 가이드, 금지어 목록을 반드시 준수하세요.

⚠️ 중요: 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지. 일반 텍스트로만 작성하고, 섹션 구분은 대괄호 라벨만 사용할 것.`;
}

// =====================================================
// Review / QA prompt
// =====================================================

const CHANNEL_SPECIFIC_RULES = {
  pressrelease: '- 회사 소개(보일러플레이트) 섹션이 포함되어 있는가? 없으면 red "회사 소개 누락"\n- 연락처 정보가 포함되어 있는가? 없으면 red "연락처 누락"\n- 리드문이 "메디컬 에스테틱 디바이스 전문기업 브릿츠메디(대표 이신재)는..."으로 시작하는가?',
  newsletter: '- CTA(행동 유도 문구) 섹션이 포함되어 있는가? 없으면 red "CTA 누락"',
  naver: '- 태그가 10개 포함되어 있는가? 없거나 부족하면 yellow "태그 부족"\n- SEO 키워드가 제목 앞부분에 배치되었는가?',
  kakao: '- 카드가 6장 이상인가? 부족하면 yellow "카드 수 부족"',
  linkedin: '- 해시태그가 포함되어 있는가? 없으면 yellow "해시태그 누락"',
  instagram: '- 해시태그 20개 이상 포함되어 있는가? 부족하면 yellow "해시태그 부족"\n- 캐러셀 가이드가 포함되어 있는가?',
};

export function buildReviewPrompt({ content, channelId, userSourceText }) {
  const chRules = CHANNEL_SPECIFIC_RULES[channelId] || '';
  const hasSource = !!userSourceText && userSourceText.trim() !== '';

  return `당신은 BRITZMEDI의 콘텐츠 품질 검수 전문가입니다.
아래 콘텐츠를 검수하여 문제점을 JSON 배열로 반환하세요.

## 검수 규칙

### 🚨 0. 소스 대비 팩트 검증 (최우선 — 반드시 가장 먼저 수행)
${hasSource ? `사용자가 제공한 소스 원문이 있습니다. 아래 절차를 반드시 수행하세요:

(A) 생성된 콘텐츠의 [본문] 영역을 문장 단위로 분리하세요.
(B) 각 문장이 아래 중 어디에 해당하는지 판단하세요:
    - 소스에 직접 근거가 있는 문장 → 팩트 (카운트)
    - BRITZMEDI 회사 기본정보(설립연도, 대표, 본사, 기술, 회사소개 보일러플레이트) → 팩트 (카운트)
    - 113명 설문조사 데이터(이탈 27.4%, 브랜드 58.4% 등 시스템 프롬프트에 있는 데이터) → 팩트 (카운트)
    - 위 어디에도 해당하지 않는 문장 → 출처 없음 (🔴)
(C) 출처 없는 각 문장을 개별 이슈로 보고하세요:
    severity: "red", category: "출처 없는 내용", message: "소스에 근거 없음: [문장 요약]", quote: "[해당 문장 앞 20자]", section: "본문"
(D) 팩트 비율을 계산하세요:
    팩트 문장 수 / 전체 본문 문장 수 = 비율
    이것을 JSON 배열의 첫 번째 항목으로 넣으세요:
    { "severity": 비율 < 0.5 ? "red" : "yellow", "category": "팩트 비율", "message": "팩트 비율: XX% (팩트 N문장 / 전체 M문장)${' '}— 50% 미만이면 신뢰도 경고", "quote": "", "section": "" }

특히 아래 유형의 날조를 엄격히 잡아내세요:
- 현장 반응, 참석자/관람객 반응 (소스에 없는)
- 질의응답 내용, 세미나/세션 구체 내용 (소스에 없는)
- 미팅 성과, 계약, MOU (소스에 없는)
- 타인의 발언, 인용문 (소스에 없는)
- 구체적 수치, 통계 (소스에 없는)
- 향후 계획 (소스에 명시되지 않은)` : `소스가 제공되지 않았습니다. 아래 기본 사실 검증만 수행하세요:
- AI가 만들어낸 것으로 보이는 구체적 수치, 날짜, 인용문이 있는가 → severity: "red", category: "사실 검증"
- 실존 여부 확인 필요한 행사명, 기관명, 인물명이 있는가 → severity: "yellow", category: "사실 검증"`}

### 1. 사실 검증
- 사용자가 소스에 넣지 않은 숫자, 통계, 인용문이 있는가 → severity: "red", category: "사실 검증", message: "출처 없는 사실: [해당 내용 요약]"
- 실존 여부 확인 필요한 행사명, 기관명, 인물명이 있는가 → severity: "yellow", category: "사실 검증", message: "사실 확인 필요: [해당 항목]"
- 단, 113명 설문조사 데이터(이탈 27.4%, 브랜드 58.4%, 가성비 24.8% 등)와 BRITZMEDI 회사 정보는 검증된 사실이므로 문제로 표시하지 말 것

### 2. [STYLE] 보도문체 검증
- 경어체 사용 ("~합니다", "~입니다", "~했습니다") → severity: "red", category: "보도문체", message: "경어체 사용: [해당 문장]"
- 구어체 사용 ("~하고 있어요", "~인데요") → severity: "red", category: "보도문체"
- "우리", "저희" 사용 → severity: "red", category: "보도문체", message: "3인칭 위반: [해당 문장]"
- 출처 불명 표현 ("~로 평가된다", "~로 알려져 있다", "~로 주목받고 있다") → severity: "red", category: "출처 불명"
- "~로 기대된다" 2회 이상 → severity: "yellow"
- 수동태 3회 이상 ("~되었다", "~된 것으로") → severity: "yellow", category: "수동태"

### 3. 시제/시점
- 예고형 보도자료인데 과거 시제가 섞여 있는가 → severity: "red", message: "시제 불일치: [해당 문장]"
- 리뷰형인데 소스에 없는 현장 반응/결과를 지어냈는가 → severity: "red", message: "팩트 없는 리뷰 내용: [해당 문장]"

### 4. 의료법 준수
- 금지어 사용: 극대화, 최소화, 최고, 최초(근거없이), 완벽한, 획기적인, 혁명적인, 완치, 100%, 확실한 효과, 부작용 없음, 안전 보장 → severity: "red", message: "의료법 위반 표현: [해당 단어]"
- 효능 단정 표현 ("~를 치료합니다", "~가 사라집니다") → severity: "red", message: "효능 단정: [해당 문장]"
- "RF 마이크로니들링" 사용 → severity: "red", message: "제품 분류 오류: RF 마이크로니들링 → TOROIDAL 고주파 기반 EBD"
- 비교 광고 (타사 제품명 언급 비교) → severity: "red", message: "비교 광고: [해당 내용]"

### 5. 표기법
- 영문 단독 사용 (첫 등장에서 국문(영문) 형태 아님) → severity: "red", message: "영문 표기 규칙 위반: [해당 단어]"
- 영문이 국문보다 앞에 옴 → severity: "red"
- 2회 이상 영문 병기 → severity: "yellow", message: "영문 표기 규칙 위반: [해당 단어]"
- 회사명이 "브릿츠메디" 또는 "BRITZMEDI"로 일관적인가
- 제품명이 "TORR RF" 또는 "토르RF"로 통일되었는가

### 6. 구조 검증
- 제목/리드문에 언급한 제품이 본문에서 설명되어 있는가 → severity: "red", message: "언급만 하고 설명 없음: [제품명]"
${chRules ? `- 채널별 검증:\n${chRules}` : ''}

### 7. 데이터 관련성
- 113명 설문 데이터가 사용됐다면, 콘텐츠 주제와 직접 관련 있는가 → severity: "yellow", message: "설문 데이터 관련성 낮음: [해당 데이터]"

### 8. 중복/품질
- 같은 내용이 문단을 달리해서 반복되는가 → severity: "yellow", message: "내용 중복: [반복 내용 요약]"
- 한 문장이 60자를 초과하는가 → severity: "yellow", message: "장문(60자 초과): [해당 문장 앞 30자...]"

---

## 사용자가 제공한 소스/참고사항
${userSourceText || '(없음)'}

## 검수 대상 콘텐츠
${content}

---

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트 없이 JSON만:

[
  { "severity": "red", "category": "카테고리명", "message": "문제 설명", "quote": "문제가 있는 원문 일부 (20자 이내)", "section": "해당 섹션 라벨" },
  ...
]

${hasSource ? '팩트 비율 항목을 반드시 배열의 첫 번째로 넣으세요.' : ''}
문제가 없으면 빈 배열 [] 을 반환하세요.
severity는 "red"(반드시 수정) 또는 "yellow"(확인 권장)만 사용하세요.`;
}

// =====================================================
// Factory v2 Prompts — 3-pass: Parse → Generate → Review
// =====================================================

/**
 * STEP 1: Parse source text into structured facts (JSON response).
 */
export function buildParsingPrompt(sourceText) {
  const categoryList = Object.entries(PR_CATEGORIES)
    .map(([id, cat]) => `- ${id}: ${cat.label}`)
    .join('\n');

  const fieldsByCategory = Object.entries(PR_CATEGORIES)
    .map(([id, cat]) => {
      const fields = cat.fields
        .map((f) => `    "${f.key}": "${f.label}${f.required ? ' (필수)' : ''}"`)
        .join(',\n');
      return `  "${id}": {\n${fields}\n  }`;
    })
    .join(',\n');

  return `당신은 보도자료 소스 텍스트에서 구조화된 팩트를 추출하는 파서입니다.

## 카테고리 목록
${categoryList}

## 카테고리별 추출 필드
{
${fieldsByCategory}
}

## 규칙
1. 소스 텍스트를 읽고 가장 적합한 카테고리를 판단하세요.
2. 해당 카테고리의 각 필드에 대해 소스에서 관련 정보를 추출하세요.
3. 소스에 해당 정보가 없으면 반드시 null을 넣으세요 (절대 지어내지 마세요).
4. 추출한 값은 소스 원문의 표현을 최대한 유지하세요.
5. 하나의 필드에 여러 항목이 있으면 쉼표나 줄바꿈으로 나열하세요.

## 소스 텍스트
${sourceText}

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트 없이 JSON만:

{
  "category": "카테고리ID",
  "fields": {
    "필드key": "추출된 값 또는 null",
    ...
  }
}`;
}

/**
 * STEP 3: Generate content from facts (skeleton) + knowledge base (flesh).
 */
export function buildFactBasedPrompt({ category, confirmedFields, timing, channelId, kbText }) {
  const channelConfig = CHANNEL_CONFIGS[channelId];
  if (!channelConfig) return '';

  const catDef = PR_CATEGORIES[category];
  const timingLabel = timing === 'pre' ? '예고형 (미래 시제)' : '리뷰형 (과거 시제)';

  const factsSection = Object.entries(confirmedFields || {})
    .filter(([, val]) => val !== null && val !== '' && val !== undefined)
    .map(([key, val]) => {
      const fieldDef = catDef?.fields.find((f) => f.key === key);
      return `- ${fieldDef?.label || key}: ${val}`;
    })
    .join('\n');

  const kbSection = kbText ? '\n' + kbText + '\n' : '';
  const criticalRules = channelId === 'pressrelease' ? PR_CRITICAL_RULES + '\n\n' : '';
  const guidelinesSection = channelId === 'pressrelease' ? '\n' + PR_DO_DONT + '\n' : '';
  const bottomReminder = channelId === 'pressrelease' ? '\n\n' + PR_CRITICAL_RULES : '';

  return `${criticalRules}${BRITZMEDI_CONTEXT}

${channelConfig.formatPrompt}
${guidelinesSection}${kbSection}
---

## 콘텐츠 생성 규칙 — 뼈대(팩트) + 살(지식베이스)

### 정보 계층 (반드시 준수)

🦴 뼈대 = 소스에서 온 "확인된 팩트" (아래 나열)
→ 본문의 핵심 구조. 반드시 포함. 왜곡/변형 금지.

🔵 살 = 지식 베이스에 등록된 정보 + 위의 BRITZMEDI 회사 정보
→ 본문을 풍성하게 만드는 배경 설명. 자유롭게 활용하세요.
  예시:
  - 회사 소개/연혁: "2017년 설립 이래 메디컬 에스테틱 디바이스 분야에서..."
  - 제품 기술 설명: "토르RF(TORR RF)는 브릿츠메디가 독자 개발한 토로이달(TOROIDAL) 고주파 기술을 적용한 에너지 기반 디바이스(EBD)로..."
  - FDA 승인: "미국 식품의약국(FDA) 승인을 받은 기술력을 바탕으로..."
  - 제품 효과: "콜라겐 리모델링 촉진과 시술 후 다운타임 감소에 기여하는 것으로 알려져 있으며..."
  - 시장 맥락: 지식베이스에 시장 정보가 있으면 맥락으로 활용

🚫 날조 = 확인된 팩트에도 없고 지식 베이스에도 없는 정보
→ 절대 만들지 마세요. 이 경우 [추가 정보 필요: 설명] 플레이스홀더를 넣으세요.
  예: 소스에 '루미노웨이브 전시'만 있고, 지식베이스에 루미노웨이브 정보가 없으면
  → [추가 정보 필요: 루미노웨이브 제품 특징]

### 확인된 팩트 (🦴 뼈대)
카테고리: ${catDef?.label || category}
시점: ${timingLabel}

${factsSection || '(확인된 팩트 없음)'}

### 시제 규칙
${timing === 'pre'
    ? '- 예고형: "~할 예정이다", "~에 참가한다", "~를 선보인다" 등 미래 시제 사용\n- "~했다" 등 과거형 절대 금지'
    : '- 리뷰형: "~했다", "~를 선보였다", "~에 참가했다" 등 과거 시제 사용\n- "~할 예정이다" 등 미래형 절대 금지'}

### 작성 방법
1. 리드문: "메디컬 에스테틱 디바이스 전문기업 브릿츠메디(대표 이신재)는..." + 확인된 팩트의 핵심 뉴스
2. 핵심 팩트 전개: 확인된 팩트를 문단별로 풀어서 서술
3. 배경 설명 삽입: 각 팩트 사이에 지식베이스/회사정보로 맥락을 보강
   - 제품이 언급되면 → 해당 제품의 기술/특징을 지식베이스에서 가져와 1~2문장 설명
   - 회사가 주어이면 → 설립 연혁, 사업 영역 등 배경 자연스럽게 포함
   - 인증이 언급되면 → FDA 등 기존 인증 실적 언급
4. 인용문: 확인된 팩트에 없으면 [대표 인용문 - 직접 작성 또는 확인 필요] 플레이스홀더
5. 알 수 없는 정보: [추가 정보 필요: 구체적 설명] 플레이스홀더
6. 분량 (엄격): 목표 ${channelConfig.charTarget}. 단, 소스 분량에 비례.
   - 소스 5줄 → 본문 5~10문장이 적정. 20문단은 과다(날조 의심).
   - 소스에 없는 시장 분석, 업계 전망, 전략/비전을 주 내용으로 넣지 마.
   - 소스가 부족하면 목표 분량 미달이어도 OK. 짧은 글 > 날조 포함 긴 글.
7. 영문 표기: 첫 등장 시 "국문(영문)" 형태, 이후 국문만.

[회사 소개] 보일러플레이트:
${PR_BOILERPLATE.companyIntro}

위의 회사 정보, 톤앤매너 가이드, 금지어 목록, 채널별 포맷 규칙을 모두 반영하여 작성하세요.
금지하는 건 "날조"이지 "배경 설명"이 아닙니다. 지식베이스에 있는 정보는 적극 활용하세요.

⚠️ 중요: 마크다운 문법(**, ##, ###, ---, *, > 등) 절대 사용 금지. 일반 텍스트로만 작성하고, 섹션 구분은 대괄호 라벨만 사용할 것.${bottomReminder}`;
}

/**
 * STEP 4: Review generated content against confirmed facts (v2 JSON format).
 */
export function buildV2ReviewPrompt({ content, confirmedFields, channelId }) {
  const chRules = CHANNEL_SPECIFIC_RULES[channelId] || '';

  const factsRef = Object.entries(confirmedFields || {})
    .filter(([, val]) => val !== null && val !== '' && val !== undefined)
    .map(([key, val]) => `- ${key}: ${val}`)
    .join('\n');

  return `당신은 BRITZMEDI의 콘텐츠 품질 검수 전문가입니다.
아래 콘텐츠를 "확인된 팩트" 목록 대비 검수하여 결과를 JSON으로 반환하세요.

## 확인된 팩트 (소스에서 온 뼈대 정보)
${factsRef || '(없음)'}

## 허용되는 배경 정보 (지식 베이스 / 회사 기본정보)
아래에 해당하는 내용은 검증된 정보이므로 "출처 없음"으로 표시하지 마세요:
- BRITZMEDI 회사 기본정보 (설립연도, 대표, 본사, 기술, 사업 영역)
- [회사 소개] 보일러플레이트
- 지식 베이스에 등록된 제품 정보 (토르RF 기술 설명, FDA 승인, 제품 특징 등)
- 지식 베이스에 등록된 시장 정보, 톤앤매너 규칙
- 위 정보를 활용한 배경 설명, 맥락 보강 문장

## 검수 규칙

### 0. 날조 검증 (최우선)
"날조"란: 확인된 팩트에도 없고, 회사 기본정보에도 없고, 지식 베이스에도 없는 정보를 AI가 만들어낸 것.
(A) 콘텐츠의 [본문] 영역을 문장 단위로 분리하세요.
(B) 각 문장이 아래 중 어디에 해당하는지 판단:
    - "확인된 팩트"에 직접 근거가 있는 문장 → OK
    - BRITZMEDI 회사 기본정보 / 지식 베이스 정보를 활용한 배경 설명 → OK
    - [회사 소개] 보일러플레이트 내용 → OK
    - 위 어디에도 해당하지 않는, AI가 만들어낸 구체적 사실 → 날조 🔴
(C) 날조된 각 문장을 개별 이슈로 보고 (severity: "red", category: "날조")
(D) 참고: 확인된 팩트 + 지식베이스 배경 설명은 모두 정상. 오직 어디에도 근거 없는 정보만 "날조"로 잡으세요.

### 1. [WRITING] 맞춤법/문체
- 맞춤법, 띄어쓰기 오류 확인 → severity: "yellow"
- 같은 조사/어미 연속 반복 ("~하며, ~하며, ~하며") → severity: "yellow"

### 2. [STYLE] 보도문체 검증
- 경어체 사용 ("~합니다", "~입니다", "~했습니다") → severity: "red", category: "보도문체"
- 구어체 사용 ("~하고 있어요", "~인데요") → severity: "red", category: "보도문체"
- 명사형 종결 ("~했음", "~임") → severity: "red", category: "보도문체"
- "우리", "저희" 사용 (3인칭 위반) → severity: "red", category: "보도문체"
- 출처 불명 표현: "~로 평가된다", "~로 알려져 있다", "~로 주목받고 있다", "업계에서는 ~로 보고 있다" → severity: "red", category: "출처 불명"
- "~로 기대된다" 2회 이상 사용 → severity: "yellow"
- 수동태 과다: "~되었다", "~된 것으로" 등이 3회 이상 → severity: "yellow", category: "수동태"

### 3. [LAW] 의료법 준수
- 금지어: 극대화, 최소화, 최고, 최초(근거없이), 완벽한, 획기적인, 혁명적인, 완치, 100%, 확실한 효과, 부작용 없음, 안전 보장
- 효능 단정: "~를 치료합니다", "~가 사라집니다"
- "RF 마이크로니들링" → "TOROIDAL 고주파 기반 EBD"

### 4. [NOTATION] 영문 표기
- 첫 등장 시 "국문(영문)" 형태인가, 이후 국문만 사용하는가
- 영문 단독 사용 (첫 등장에서 국문(영문) 아닌 영문만) → severity: "red"
- 영문이 국문보다 앞에 옴 (FDA(미국식품의약국) 대신 미국식품의약국(FDA)여야 함) → severity: "red"
- 2회 이상 영문 병기 → severity: "yellow"

### 5. [TIME] 시제 일관성
- 예고형이면 미래 시제, 리뷰형이면 과거 시제가 일관적인가

### 6. [STRUCT] 구조 검증
${chRules || '- 필수 섹션이 모두 포함되었는가'}

### 7. [FACT] 중복/품질
- 같은 내용 반복 → severity: "yellow"
- 60자 초과 장문 → severity: "yellow"

## 검수 대상 콘텐츠
${content}

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트 없이 JSON만:

{
  "summary": {
    "critical": 0,
    "warning": 0,
    "factRatio": "XX% (N/M문장)"
  },
  "issues": [
    { "severity": "red", "category": "카테고리", "message": "설명", "quote": "원문 20자", "section": "섹션" },
    ...
  ]
}

severity는 "red"(반드시 수정) 또는 "yellow"(확인 권장)만 사용.
문제가 없으면 issues를 빈 배열로, summary의 critical/warning은 0으로 반환.`;
}

// =====================================================
// Auto-Fix Prompt — 4th API call: fix issues found in review
// =====================================================

/**
 * STEP 4.5: Auto-fix content based on review issues.
 * Returns { fixedContent, fixes[], needsInput[] }
 */
export function buildAutoFixPrompt({ content, issues, confirmedFields, channelId, kbText }) {
  const channelConfig = CHANNEL_CONFIGS[channelId];

  const issuesText = issues
    .filter((i) => i.category !== '팩트 비율')
    .map((i, idx) => `${idx + 1}. [${i.severity === 'red' ? '🔴' : '🟡'}] [${i.category}] ${i.message}${i.quote ? ` (원문: "${i.quote}")` : ''}${i.section ? ` [섹션: ${i.section}]` : ''}`)
    .join('\n');

  const factsRef = Object.entries(confirmedFields || {})
    .filter(([, val]) => val !== null && val !== '' && val !== undefined)
    .map(([key, val]) => `- ${key}: ${val}`)
    .join('\n');

  return `당신은 BRITZMEDI 콘텐츠 자동 수정 전문가입니다.
AI 검수에서 발견된 문제를 자동으로 수정하여 완성본을 만드세요.

## 확인된 팩트 (이 사실만 사용 가능)
${factsRef || '(없음)'}
${kbText ? `\n## 지식 베이스 (참조 가능한 검증된 정보)\n${kbText}\n` : ''}
## 채널
${channelConfig?.name || channelId}

## 검수에서 발견된 문제
${issuesText || '(수정 대상 이슈 없음)'}

## 수정 대상 콘텐츠
${content}

## 수정 규칙
1. 각 이슈를 분석하고 AI가 수정할 수 있는 것은 모두 수정하세요.
2. 수정 가능한 이슈:
   - [FACT] "출처 없는 내용" / "소스에 근거 없음" → 해당 문장을 삭제하거나 확인된 팩트/지식 베이스 정보로 대체
   - [LAW] 의료법 금지어 → 허용 표현으로 교체 (극대화→개선, 최소화→감소, 완벽한→우수한, 획기적인→차별화된, 혁명적인→혁신적인(주의하여), 완치→개선/호전, 확실한 효과→기대되는 효과, 부작용 없음→삭제, 안전 보장→안전성 확인)
   - [LAW] 효능 단정 → 완화 표현으로 수정 ("~를 치료합니다" → "~개선에 기여한다")
   - [LAW] 비교 광고 → 타사 언급 제거
   - [STYLE] 경어체/구어체 → 보도문체로 변환 ("~합니다"→"~했다"/"~이다", "~하고 있어요"→삭제/보도체)
   - [STYLE] 출처 불명 표현 → 삭제 또는 사실 기반 표현으로 변환 ("~로 평가된다"→삭제, "~로 알려져 있다"→삭제, "~로 주목받고 있다"→삭제)
   - [STYLE] 수동태 과다 → 능동태로 변환 ("체결되었다"→"체결했다", "진행될 예정이다"→"진행할 예정이다")
   - [STYLE] "우리", "저희" → "브릿츠메디는", "동사(同社)는"
   - [NOTATION] 영문 표기 규칙 위반 → 첫 등장 시 "국문(영문)" 형태로 수정, 이후 국문만
   - [NOTATION] 2회 이상 영문 병기 → 2회차부터 국문으로만 변환
   - [TIME] 시제 불일치 → 올바른 시제로 수정
   - [WRITING] "RF 마이크로니들링" → "TOROIDAL 고주파 기반 EBD"
   - [WRITING] 장문(60자 초과) → 문장 분리
   - [WRITING] 내용 중복 → 중복 제거
3. 수정 불가능한 이슈 (사용자 입력 필요):
   - 확인된 팩트와 지식 베이스 어디에도 없는 정보가 필요한 경우
   - 이 경우 해당 부분을 [입력 필요: 구체적 설명] 플레이스홀더로 표시
4. [대표 인용문 - 직접 작성 또는 확인 필요] 플레이스홀더는 절대 수정하지 마세요 (별도 기능으로 처리됨).
5. 수정된 콘텐츠는 원래 섹션 라벨([제목], [본문] 등)을 그대로 유지하세요.
6. 마크다운 문법 절대 사용 금지. 일반 텍스트만.

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트 없이 JSON만:

{
  "fixedContent": "수정된 전체 콘텐츠 (섹션 라벨 포함, 원본과 동일한 구조)",
  "fixes": [
    { "type": "auto", "description": "수정 설명 (예: \\"콜라겐 리모델링 촉진\\" 삭제 — 소스에 없는 내용)" }
  ],
  "needsInput": [
    { "type": "input", "description": "입력이 필요한 이유", "placeholder": "[입력 필요: 구체적 설명]" }
  ]
}

- fixes: AI가 자동으로 수정 완료한 항목들 (이미 fixedContent에 반영됨)
- needsInput: 사용자 입력이 필요한 항목들 (fixedContent에 플레이스홀더로 표시됨)
- fixes나 needsInput이 없으면 빈 배열 []
- 수정할 내용이 없으면 fixedContent에 원본을 그대로, fixes와 needsInput을 빈 배열로`;
}

// =====================================================
// Quote Suggestions Prompt
// =====================================================

/**
 * Generate 3 quote suggestions for the CEO when quote field is empty.
 */
// =====================================================
// Document Summary Prompt — KB file upload
// =====================================================

/**
 * Build prompt for AI to summarize an uploaded document for KB storage.
 * rawText is truncated to 80,000 chars to stay within token limits.
 */
export function buildDocumentSummaryPrompt(rawText, fileName) {
  const truncated = rawText.length > 80000 ? rawText.slice(0, 80000) + '\n\n[...이하 생략 (80,000자 초과)]' : rawText;

  return `당신은 문서 요약 전문가입니다.
아래 문서의 내용을 분석하여 지식 베이스 항목으로 저장할 수 있도록 구조화된 요약을 생성하세요.

## 파일명
${fileName}

## 문서 원문
${truncated}

## 출력 규칙
1. title: 문서의 핵심 주제를 나타내는 제목 (30자 이내)
2. category: 아래 중 가장 적합한 것 1개 선택
   - company (회사 정보)
   - product (제품 정보)
   - technology (기술 정보)
   - certification (인증/임상)
   - market (시장 정보)
   - guidelines (톤앤매너/규칙)
3. summary: 핵심 내용 요약 (500~1500자). 다른 AI가 참고 자료로 활용할 수 있도록 팩트 중심으로 작성.
4. extractedData: 문서에서 추출된 구조화 데이터 (선택). 키워드, 수치, 날짜 등.

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트 없이 JSON만:

{
  "title": "문서 제목",
  "category": "카테고리ID",
  "summary": "요약 내용 (500~1500자)",
  "extractedData": {
    "keywords": ["키워드1", "키워드2"],
    "keyFacts": ["핵심 사실1", "핵심 사실2"],
    "numbers": ["수치 데이터1", "수치 데이터2"]
  }
}`;
}

export function buildQuoteSuggestionsPrompt({ category, confirmedFields, generatedContent, timing }) {
  const catDef = PR_CATEGORIES[category];

  const factsRef = Object.entries(confirmedFields || {})
    .filter(([, val]) => val !== null && val !== '' && val !== undefined)
    .map(([key, val]) => {
      const fieldDef = catDef?.fields.find((f) => f.key === key);
      return `- ${fieldDef?.label || key}: ${val}`;
    })
    .join('\n');

  return `당신은 BRITZMEDI 보도자료의 대표 인용문 전문 작성가입니다.
아래 보도자료 본문과 확인된 팩트를 분석하여, "이신재 브릿츠메디 대표" 명의로 자연스러운 인용문 3개를 제안하세요.

## 카테고리
${catDef?.label || category}

## 시점
${timing === 'pre' ? '예고형 (미래 시제)' : '리뷰형 (과거 시제)'}

## 확인된 팩트
${factsRef || '(없음)'}

## 생성된 보도자료 본문
${generatedContent}

## 인용문 작성 규칙
1. 보도체 어미 사용: "~라고 밝혔다", "~라고 말했다", "~라고 전했다"
2. 인용문은 반드시 작은따옴표 ' ' 사용 (보도 관행). 큰따옴표 " " 사용 금지.
3. 형식: "이신재 브릿츠메디 대표는 '인용문 내용'이라며 '인용문 내용'이라고 밝혔다." 또는 "이신재 대표는 '인용문 내용'이라고 전했다."
4. 의료법 금지어 절대 사용 금지 (극대화, 최소화, 완벽한, 획기적인, 혁명적인, 완치, 100%, 확실한 효과, 부작용 없음 등)
5. 본문에 이미 나온 내용을 그대로 반복하지 말고, 대표의 시각/비전/포부를 담을 것
6. 2~3문장으로 작성
7. 확인된 팩트 범위 내에서만 언급 (없는 사실 만들지 않음)
8. ${timing === 'pre' ? '미래 시제로 작성 ("~하겠다", "~할 것이다")' : '과거/현재 시제로 작성 ("~했다", "~하고 있다")'}

## 3가지 톤
- A안: 성과/자부심 강조 ("이번 OO은 브릿츠메디의 OO을 보여주는 성과다")
- B안: 비전/미래 강조 ("앞으로도 OO 분야에서 OO에 기여하겠다")
- C안: 파트너/시장 강조 ("OO과의 협력을 통해 OO 시장에서 OO을 강화할 것")

## 출력 형식
반드시 아래 JSON 배열만 출력하세요. 다른 텍스트 없이:

[
  { "label": "A", "tone": "성과/자부심", "text": "이신재 브릿츠메디 대표는 '인용문 내용'이라며 '인용문 내용'이라고 밝혔다." },
  { "label": "B", "tone": "비전/미래", "text": "이신재 브릿츠메디 대표는 '인용문 내용'이라고 말했다." },
  { "label": "C", "tone": "파트너/시장", "text": "이신재 브릿츠메디 대표는 '인용문 내용'이라고 전했다." }
]`;
}
