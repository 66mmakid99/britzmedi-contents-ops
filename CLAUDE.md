# CLAUDE.md — BRITZMEDI Content Ops 프로젝트 규칙

이 파일은 Claude Code가 매 세션마다 자동으로 읽는 프로젝트 규칙입니다.
모든 코드 수정, 생성, 리뷰 시 아래 규칙을 반드시 따르세요.

---

## 프로젝트 기본 정보

- **프로젝트:** BRITZMEDI Content Factory (보도자료 생성 + 5채널 재가공 SaaS)
- **스택:** Astro 5 + React 19 + Tailwind CSS 4
- **호스팅:** Cloudflare Pages
- **빌드:** `npm run build`
- **배포:** `npx wrangler pages deploy dist --project-name=britzmedi-contents-ops --branch=main`
- **Git:** 모든 변경은 반드시 commit + push

---

## 작업 원칙

### 1. 실제로 변경했는지 반드시 확인
- 파일을 수정했다고 보고하기 전에 `head -5 <파일경로>`로 변경이 적용됐는지 확인
- 빌드 에러가 있으면 반드시 수정 후 재빌드
- "Done"이라고 말하기 전에 빌드 성공 + 배포 완료 확인

### 2. 수정 파일이 제공되면 그대로 복사
- REPLACE-FILES/ 폴더에 수정된 파일이 있으면 **내용을 변경하지 말고 그대로 덮어쓰기**
- 자체적으로 "개선"하거나 "최적화"하지 말 것

### 3. 빌드-배포-푸시 항상 세트로
```bash
npm run build
# 에러 있으면 수정 후 재빌드
npx wrangler pages deploy dist --project-name=britzmedi-contents-ops --branch=main
git add .
git commit -m "변경 내용 요약"
git push
```

---

## 콘텐츠 품질 규칙

### 절대 금지 용어 (AI 프롬프트 및 생성 콘텐츠 모두)
| 금지 | 대체 |
|------|------|
| 뷰티 디바이스 / Beauty Device | 전문 의료기기 / Medical Device |
| K-뷰티 / K-Beauty | 메디컬 에스테틱 / Medical Aesthetics |
| 뷰티테크 | 에너지 기반 디바이스(EBD) |
| 미용기기 | 의료기기 |

### 마크다운 금지
채널 재가공 콘텐츠에 아래 기호 노출 금지:
- `**굵게**`, `*이탤릭*`, `## 제목`, `- 불릿`, `` `코드` ``, `> 인용`, `---`
- stripMarkdown 함수로 이중 방어 적용할 것

### 팩트 완전성
- 소스 텍스트의 숫자(기간, 수량, 금액, 날짜)는 반드시 모두 포함
- 기간+수량은 쌍으로: "3년간 연 300대" (하나만 쓰면 안 됨)
- enforceFactPairs 함수로 코드 레벨 강제

### 고정 정보 (절대 변경 금지)
- 대표이사: **이신재** (이상호 아님)
- 미디어 연락처: **이성호 CMO** / sh.lee@britzmedi.co.kr / 010-6525-9442
- 회사명: BRITZMEDI Co., Ltd. (브릿츠메디 주식회사)
- 본사: 경기도 성남시 둔촌대로 388 크란츠테크노 1211호
- 홈페이지: www.britzmedi.co.kr / www.britzmedi.com

---

## 채널별 규칙

### 보도자료 (pressrelease)
- 5단락 역피라미드 구조
- 4단락에 대표 인용문 포함
- 보도문체: ~했다, ~밝혔다, ~전망이다
- Word: generatePressReleaseDocx.js (정상 작동)
- PDF: openPrintView (Create.jsx) — 라벨 없이 Word와 동일 포맷

### 이메일 뉴스레터 (newsletter)
- "원장님, 안녕하세요. 브릿츠메디입니다."로 시작
- 1,500~2,500자

### 네이버 블로그 (naver-blog)
- SEO 키워드 포함, 2,000~3,500자
- [IMAGE: 설명] 플레이스홀더 3개

### 카카오톡 (kakao)
- TEXT 포스트 (카드뉴스 아님), 300~500자
- [카드1], [슬라이드1] 등 구조 태그 금지

### 인스타그램 (instagram)
- 단일 피드 포스트 (캐러셀 아님), 캡션 50~150자
- 해시태그 15~20개
- 필수: #브릿츠메디 #BRITZMEDI #토르RF #TORRRF

### 링크드인 (linkedin)
- B2B 전문가 톤, 800~1,200자
- Hook → Context → News → Insight → CTA 구조

---

## 주요 파일 경로

```
src/components/create/Create.jsx          ← 보도자료 생성 메인
src/components/pipeline/PipelineBoard.jsx ← 파이프라인 보드
src/components/repurpose/RepurposeHub.jsx ← 채널재가공 허브
src/components/repurpose/ChannelPreview.jsx ← 채널 미리보기
src/constants/prompts.js                  ← 모든 프롬프트
src/constants/channels.js                 ← 채널 설정
src/lib/channelGenerate.js                ← 채널 생성 + stripMarkdown
src/lib/claude.js                         ← Claude API 호출
src/lib/generatePressReleaseDocx.js       ← Word 생성
```
