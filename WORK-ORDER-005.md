# 작업지시서 #005: 보도자료 품질 완성 + Word 전문 양식

> 이 문서를 처음부터 끝까지 읽고, 섹션 순서대로 실행하라.
> 각 섹션 끝에 검증 항목이 있다. 검증 PASS 후 다음 섹션으로 진행.
> 최종 섹션의 통합 테스트 7개가 전부 PASS 나올 때까지 수정 반복.

---

## 목차

1. [사전 점검] 현재 코드베이스 확인
2. [수정 A] 외래어 표기 — 모든 외국 이름에 국문(영문) 적용
3. [수정 B] 오타 방지 — "다이나스" 근절
4. [수정 C] 소스 팩트 누락 방지
5. [수정 D] 인용문 레이블 제거
6. [수정 E] 담당자명 "이상호" → "이성호" 수정
7. [수정 F] Word 다운로드 — docx-js 전문 보도자료 양식
8. [통합 테스트] 7개 시나리오 전체 PASS 필수

---

## 1. 사전 점검

작업 전에 현재 상태를 파악한다.

```bash
# 1-1. 프로젝트 구조 확인
ls -la src/constants/prompts.js src/lib/claude.js src/components/create/Create.jsx src/constants/knowledgeBase.js

# 1-2. "다이나스" 오타 존재 여부
grep -r "다이나스" src/ --include="*.js" --include="*.jsx"

# 1-3. "이상호" 오타 존재 여부 (올바른 이름은 "이성호")
grep -r "이상호" src/ --include="*.js" --include="*.jsx"

# 1-4. docx 패키지 설치 여부
cat package.json | grep '"docx"'

# 1-5. 현재 Word 다운로드 방식 확인
grep -n "download\|\.doc\|word\|Word\|docx" src/components/create/Create.jsx | head -30
```

**결과를 기록하고 다음으로 진행.**

---

## 2. 수정 A: 외래어 표기 — 모든 외국 이름에 국문(영문) 적용

### 문제

현재 영문 표기 규칙이 자사 제품명(토르RF, 루미노웨이브)에만 적용되고,
파트너사/외국 기관/행사명에는 적용되지 않는다.

예시:
- ❌ "Derma Solutions사와 계약을 체결했다"
- ✅ "더마 솔루션스(Derma Solutions)사와 계약을 체결했다"

### 수정 대상: `src/constants/prompts.js`

#### 2-1. 생성 프롬프트 수정

`buildFactBasedPrompt` 또는 `buildPrompt` 함수에서 보도자료 채널 프롬프트를 찾아,
영문 표기 규칙 섹션에 아래 내용을 추가한다:

```
== 영문 표기 규칙 (절대 규칙) ==

본문에 등장하는 모든 영문 이름은 예외 없이 이 규칙을 따른다:
- 회사명, 기관명, 행사명, 기술명, 제품명 전부 해당
- 첫 등장: '국문 음역(영문)' 형태 → 이후: 국문으로만 표기

적용 예시:
| 첫 등장 (1회만) | 이후 전부 |
| 더마 솔루션스(Derma Solutions) | 더마 솔루션스 |
| 아이엠카스(IMCAS) | 아이엠카스 |
| 미국 식품의약국(FDA) | 미국 식품의약국 |
| 토로이달(TOROIDAL) | 토로이달 |
| 토르RF(TORR RF) | 토르RF |
| 루미노웨이브(LuminoWave) | 루미노웨이브 |
| 브릿츠메디(BRITZMEDI) | 브릿츠메디 |

※ 제품명에 영문이 포함된 경우(토르RF)는 고유명사이므로 그대로 유지
※ 외국 파트너사 이름도 반드시 한글 음역을 붙인다

금지:
- "FDA 승인" (영문 단독, 첫 등장) → "미국 식품의약국(FDA) 승인"
- "Derma Solutions" (영문만) → "더마 솔루션스(Derma Solutions)"
- 2회 이상 영문 병기 → 첫 등장 1회만, 이후 국문만
```

#### 2-2. 검수 프롬프트 수정

`buildV2ReviewPrompt` 함수의 [NOTATION] 카테고리에 추가:

```
- 영문 회사명/기관명이 한글 음역 없이 단독 사용 → severity: "critical", 자동 수정 대상
- 파트너사, 외국 기관, 행사명도 자사 제품과 동일 규칙 적용
```

#### 2-3. 자동 수정 프롬프트 수정

`buildAutoFixPrompt` 함수에 추가:

```
- 영문 회사명/기관명이 한글 음역 없이 사용된 경우: 한글 음역을 추가하고 '국문(영문)' 형태로 수정
  예: "Derma Solutions" → "더마 솔루션스(Derma Solutions)" (첫 등장) / "더마 솔루션스" (이후)
```

### 검증 A

```bash
# 프롬프트에 파트너사 관련 영문 표기 규칙이 포함되었는지 확인
grep -c "파트너사\|외국.*회사\|음역" src/constants/prompts.js
# 결과: 3 이상이면 PASS
```

---

## 3. 수정 B: 오타 방지 — "다이나스" 근절

### 문제

"에너지 기반 디바이스"가 "에너지 기반 다이나스"로 생성되는 오타가 반복 발생했다.

### 수정

#### 3-1. 코드 전체 검색 및 수정

```bash
grep -r "다이나스" src/ --include="*.js" --include="*.jsx"
```

발견되면 전부 "디바이스"로 수정.

#### 3-2. 생성 프롬프트에 오타 방지 규칙 추가

`buildFactBasedPrompt` 또는 PR_DO_DONT / PR_CRITICAL_RULES에 추가:

```
== 오표기 금지 ==
- "디바이스(Device)" → 올바른 표기: "디바이스"
- 절대 금지: "다이나스", "디나이스", "다바이스" 등 오표기
```

#### 3-3. 검수 프롬프트에 추가

```
- [WRITING] "다이나스", "디나이스" 등 "디바이스" 오표기 발견 시 → severity: "critical", 자동 수정
```

### 검증 B

```bash
# "다이나스" 완전 제거 확인
grep -r "다이나스" src/ --include="*.js" --include="*.jsx"
# 결과: 0건이면 PASS

# 프롬프트에 오표기 금지 규칙 포함 확인
grep -c "다이나스\|디나이스\|오표기" src/constants/prompts.js
# 결과: 1 이상이면 PASS
```

---

## 4. 수정 C: 소스 팩트 누락 방지

### 문제

소스에 "3년 계약, 연 300대 규모"라고 했는데 본문에 "연 300대"만 나오고 "3년"이 빠짐.
소스의 숫자/기간/수량이 누락되는 문제.

### 수정 대상: `src/constants/prompts.js`

#### 4-1. 생성 프롬프트에 추가

PR_DO_DONT 또는 팩트 규칙 섹션에:

```
== 소스 팩트 완전 반영 (절대 규칙) ==
DO: 소스의 모든 숫자(금액, 기간, 수량, 날짜)를 빠짐없이 본문에 반영
DO: 생성 후 소스 원문의 숫자를 하나씩 대조하여 누락 여부 확인
DON'T: 소스에 있는 팩트를 생략하거나 요약으로 뭉뚱그리기
```

#### 4-2. 검수 프롬프트에 추가

```
- [FACT] 소스 원문의 숫자(기간, 수량, 금액, 날짜)가 생성된 본문에 모두 포함되어 있는지 대조
  - 누락 발견 시 → severity: "critical", 자동 수정으로 누락된 팩트 삽입
```

### 검증 C

```bash
# 프롬프트에 숫자/팩트 누락 방지 규칙 포함 확인
grep -c "숫자.*빠짐없이\|숫자.*누락\|팩트.*완전" src/constants/prompts.js
# 결과: 1 이상이면 PASS
```

---

## 5. 수정 D: 인용문 레이블 제거

### 문제

사용자가 인용문 3개 중 하나를 선택한 후에도,
Word 다운로드 파일에 "[대표 인용문 - 직접 작성 또는 확인 필요]"라는 h2 헤딩이 그대로 노출됨.

### 수정 대상: `src/components/create/Create.jsx`

#### 5-1. 인용문 선택 후 레이블 제거

인용문을 선택하면:
1. "[대표 인용문 - 직접 작성 또는 확인 필요]" 텍스트를 본문에서 제거
2. 선택된 인용문을 본문의 적절한 위치에 삽입
3. 인용문 형식: `이신재 브릿츠메디 대표는 '인용문 내용'이라고 밝혔다.` (본문 문단으로)

#### 5-2. Word 다운로드 시 레이블 제거

Word 파일 생성 로직에서:
- "[대표 인용문 - 직접 작성 또는 확인 필요]" 텍스트가 포함되어 있으면 제외
- "[입력 필요: ...]" 플레이스홀더도 Word에서는 노란색 하이라이트 또는 제외 처리

### 검증 D

```bash
# Word 생성 코드에서 인용문 레이블 처리 확인
grep -n "인용문.*직접\|확인 필요\|입력 필요" src/components/create/Create.jsx | head -10
# 결과: 필터링/제거 로직이 있으면 PASS
```

---

## 6. 수정 E: 담당자명 수정

### 문제

미디어 연락처 담당자명이 "이상호"로 되어 있음. 올바른 이름은 **"이성호"**.

### 수정

```bash
# 전체 검색
grep -rn "이상호" src/ --include="*.js" --include="*.jsx"
```

발견되는 모든 곳에서 "이상호" → "이성호"로 수정.

주요 수정 대상:
- `src/components/create/Create.jsx` — PR_FIXED_DEFAULTS
- `src/constants/knowledgeBase.js` — 초기 데이터 연락처
- `src/constants/prompts.js` — 보일러플레이트 연락처

### 검증 E

```bash
# "이상호" 완전 제거 확인
grep -r "이상호" src/ --include="*.js" --include="*.jsx"
# 결과: 0건이면 PASS

# "이성호" 존재 확인
grep -r "이성호" src/ --include="*.js" --include="*.jsx"
# 결과: 1건 이상이면 PASS
```

---

## 7. 수정 F: Word 다운로드 — docx-js 전문 보도자료 양식

### 문제

현재 Word 다운로드가 HTML을 .doc 확장자로 저장하는 방식.
- 진짜 .docx가 아님
- 표/그리드 레이아웃 없음
- 뉴스와이어나 기자에게 바로 보낼 수 없는 상태

### 목표

docx-js(npm `docx` 패키지)로 전문적인 보도자료 .docx 파일을 생성한다.

### 7-1. 패키지 설치

```bash
npm install docx file-saver
# file-saver: 브라우저에서 파일 다운로드용
```

### 7-2. Word 생성 모듈 생성

새 파일: `src/lib/generatePressReleaseDocx.js`

### 7-3. 문서 레이아웃 상세

**용지 설정:**
- A4: width 11906 DXA, height 16838 DXA
- 여백: 상하좌우 2cm (1134 DXA)
- 콘텐츠 폭: 11906 - 1134 - 1134 = 9638 DXA

**폰트 설정:**
- 기본: '맑은 고딕' (Malgun Gothic), 11pt (22 half-pt)
- 제목: 14pt 굵은 글씨
- 부제목: 12pt
- 보일러플레이트: 10pt 회색(#666666)

**문서 구조 (위에서 아래로):**

```
┌──────────────────────────────────────────────────┐
│            보 도 자 료                              │
│           PRESS RELEASE                           │
│ ─────────────────────────────────────             │
├──────────────────────────────────────────────────┤
│ ┌──────────┬────────────────────────────┐        │
│ │ 배포일    │ 2026년 X월 X일              │        │
│ ├──────────┼────────────────────────────┤        │
│ │ 발신      │ 브릿츠메디 주식회사          │        │
│ ├──────────┼────────────────────────────┤        │
│ │ 담당자    │ 이성호 CMO                  │        │
│ ├──────────┼────────────────────────────┤        │
│ │ 연락처    │ 010-6525-9442              │        │
│ │          │ sh.lee@britzmedi.co.kr     │        │
│ ├──────────┼────────────────────────────┤        │
│ │ 배포 조건 │ 즉시 배포 가능               │        │
│ └──────────┴────────────────────────────┘        │
├──────────────────────────────────────────────────┤
│                                                  │
│        [제목] 14pt 굵은 가운데 정렬                 │
│        [부제목] 12pt 회색 가운데 정렬               │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  [본문]                                           │
│  11pt, 줄간격 1.6, 문단별 Paragraph                │
│                                                  │
│  [인용문 문단]                                     │
│  — 들여쓰기 1cm, 이탤릭                             │
│                                                  │
│  [향후 계획 문단]                                   │
│                                                  │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐     │
│ │ 📷 사진 가이드                 (회색 배경 헤더) │     │
│ ├───┬──────────────────────────────────────┤     │
│ │ 1 │ 계약 체결 현장 사진 설명...              │     │
│ ├───┼──────────────────────────────────────┤     │
│ │ 2 │ TORR RF 제품 이미지 설명...             │     │
│ ├───┼──────────────────────────────────────┤     │
│ │ 3 │ 회사 로고/전경...                       │     │
│ └───┴──────────────────────────────────────┘     │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐     │
│ │ 📎 첨부파일 가이드              (회색 배경 헤더) │     │
│ ├───┬──────────────────────────────────────┤     │
│ │ 1 │ TORR RF 제품소개서(PDF)               │     │
│ ├───┼──────────────────────────────────────┤     │
│ │ 2 │ FDA 승인서 사본(PDF)                   │     │
│ └───┴──────────────────────────────────────┘     │
├──────────────────────────────────────────────────┤
│ ───────── 구분선 ─────────                        │
│                                                  │
│ [회사 소개] — 10pt 회색                            │
│ 브릿츠메디(BRITZMEDI)는 2017년 설립된...            │
│                                                  │
├──────────────────────────────────────────────────┤
│ ┌──────────┬────────────────────────────┐        │
│ │ 회사명    │ BRITZMEDI Co., Ltd.        │        │
│ ├──────────┼────────────────────────────┤        │
│ │ 대표이사  │ 이신재                      │        │
│ ├──────────┼────────────────────────────┤        │
│ │ 본사      │ 경기도 성남시 둔촌대로 388   │        │
│ │          │ 크란츠테크노 1211호          │        │
│ ├──────────┼────────────────────────────┤        │
│ │ 홈페이지  │ www.britzmedi.co.kr        │        │
│ ├──────────┼────────────────────────────┤        │
│ │ 미디어    │ 이성호 CMO                  │        │
│ │ 문의      │ sh.lee@britzmedi.co.kr     │        │
│ │          │ 010-6525-9442              │        │
│ └──────────┴────────────────────────────┘        │
├──────────────────────────────────────────────────┤
│ [태그] 브릿츠메디, TORR RF, 태국 수출...           │
├──────────────────────────────────────────────────┤
│          BRITZMEDI Co., Ltd. — 1/1              │
└──────────────────────────────────────────────────┘
```

### 7-4. docx-js 코드 구조

```javascript
// src/lib/generatePressReleaseDocx.js

const {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell,
  Header, Footer,
  AlignmentType, WidthType, ShadingType, BorderStyle,
  PageNumber, HeadingLevel, VerticalAlign
} = require('docx');

// === 상수 ===
const A4_WIDTH = 11906;        // A4 폭 (DXA)
const MARGIN = 1134;           // 2cm 여백 (DXA)
const CONTENT_WIDTH = 9638;    // A4_WIDTH - MARGIN*2
const LABEL_COL = 2400;        // 왼쪽 라벨 열 폭 (~4.2cm)
const VALUE_COL = 7238;        // 오른쪽 값 열 폭
const NUM_COL = 600;           // 번호 열 폭
const DESC_COL = 9038;         // 설명 열 폭

const BORDER_LIGHT = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS_ALL = { top: BORDER_LIGHT, bottom: BORDER_LIGHT, left: BORDER_LIGHT, right: BORDER_LIGHT };
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

const LABEL_SHADING = { fill: "F2F2F2", type: ShadingType.CLEAR };
const HEADER_SHADING = { fill: "E8E8E8", type: ShadingType.CLEAR };

// === 헬퍼 함수 ===

function labelCell(text) {
  return new TableCell({
    borders: BORDERS_ALL,
    width: { size: LABEL_COL, type: WidthType.DXA },
    shading: LABEL_SHADING,
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, font: "Malgun Gothic", size: 20 })]
    })]
  });
}

function valueCell(text, colWidth = VALUE_COL) {
  // text가 여러 줄이면 별도 Paragraph으로 분리 (절대 \n 사용 금지)
  const lines = text.split('\n').filter(Boolean);
  return new TableCell({
    borders: BORDERS_ALL,
    width: { size: colWidth, type: WidthType.DXA },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children: lines.map(line => new Paragraph({
      children: [new TextRun({ text: line, font: "Malgun Gothic", size: 20 })]
    }))
  });
}

function infoRow(label, value) {
  return new TableRow({
    children: [labelCell(label), valueCell(value)]
  });
}

function infoTable(rows) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_COL, VALUE_COL],
    rows: rows.map(([label, value]) => infoRow(label, value))
  });
}

function numberedTable(headerText, items) {
  const headerRow = new TableRow({
    children: [new TableCell({
      borders: BORDERS_ALL,
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      shading: HEADER_SHADING,
      margins: CELL_MARGINS,
      columnSpan: 2,
      children: [new Paragraph({
        children: [new TextRun({ text: headerText, bold: true, font: "Malgun Gothic", size: 20 })]
      })]
    })]
  });

  const itemRows = items.map((item, i) => new TableRow({
    children: [
      new TableCell({
        borders: BORDERS_ALL,
        width: { size: NUM_COL, type: WidthType.DXA },
        margins: CELL_MARGINS,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(i + 1), font: "Malgun Gothic", size: 20 })]
        })]
      }),
      new TableCell({
        borders: BORDERS_ALL,
        width: { size: DESC_COL, type: WidthType.DXA },
        margins: CELL_MARGINS,
        children: [new Paragraph({
          children: [new TextRun({ text: item, font: "Malgun Gothic", size: 20 })]
        })]
      })
    ]
  }));

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [NUM_COL, DESC_COL],
    rows: [headerRow, ...itemRows]
  });
}

// === 메인 함수 ===

export async function generatePressReleaseDocx(data) {
  // data = { title, subtitle, body, quote, companyIntro,
  //          photoGuide[], attachGuide[], tags, contact,
  //          date, website, socialLinks }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Malgun Gothic", size: 22 }  // 11pt
        }
      }
    },
    sections: [{
      properties: {
        page: {
          size: { width: A4_WIDTH, height: 16838 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
        }
      },
      headers: {
        default: new Header({ children: [] })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "BRITZMEDI Co., Ltd. — ", font: "Malgun Gothic", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Malgun Gothic", size: 16, color: "999999" })
            ]
          })]
        })
      },
      children: [

        // ■ 문서 유형 헤더
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "보 도 자 료", bold: true, font: "Malgun Gothic", size: 32 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "333333", space: 8 } },
          children: [new TextRun({ text: "PRESS RELEASE", font: "Malgun Gothic", size: 24, color: "666666" })]
        }),

        // ■ 발신 정보 테이블
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        infoTable([
          ["배포일", data.date || "2026년 X월 X일"],
          ["발신", "브릿츠메디 주식회사"],
          ["담당자", "이성호 CMO"],
          ["연락처", "010-6525-9442\nsh.lee@britzmedi.co.kr"],
          ["배포 조건", "즉시 배포 가능"]
        ]),

        // ■ 제목
        new Paragraph({ spacing: { before: 400 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: data.title, bold: true, font: "Malgun Gothic", size: 28 })]
        }),

        // ■ 부제목
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: data.subtitle, font: "Malgun Gothic", size: 24, color: "666666" })]
        }),

        // ■ 본문 (문단별 Paragraph — \n으로 split)
        ...data.body.split('\n\n').filter(Boolean).map(para =>
          new Paragraph({
            spacing: { after: 200, line: 384 },  // 줄간격 1.6
            children: [new TextRun({ text: para.trim(), font: "Malgun Gothic", size: 22 })]
          })
        ),

        // ■ 인용문 (있으면)
        ...(data.quote ? [
          new Paragraph({
            spacing: { before: 200, after: 200, line: 384 },
            indent: { left: 720 },  // 들여쓰기 1.27cm
            children: [new TextRun({ text: data.quote, italics: true, font: "Malgun Gothic", size: 22 })]
          })
        ] : []),

        // ■ 사진 가이드 테이블
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        ...(data.photoGuide && data.photoGuide.length > 0
          ? [numberedTable("📷 사진 가이드", data.photoGuide)]
          : []),

        // ■ 첨부파일 가이드 테이블
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        ...(data.attachGuide && data.attachGuide.length > 0
          ? [numberedTable("📎 첨부파일 가이드", data.attachGuide)]
          : []),

        // ■ 구분선
        new Paragraph({
          spacing: { before: 400 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "CCCCCC", space: 8 } },
          children: []
        }),

        // ■ 회사 소개 (보일러플레이트)
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: "회사 소개", bold: true, font: "Malgun Gothic", size: 20, color: "666666" })]
        }),
        new Paragraph({
          spacing: { after: 200, line: 360 },
          children: [new TextRun({ text: data.companyIntro, font: "Malgun Gothic", size: 20, color: "666666" })]
        }),

        // ■ 하단 연락처 테이블
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        infoTable([
          ["회사명", "BRITZMEDI Co., Ltd. (브릿츠메디 주식회사)"],
          ["대표이사", "이신재"],
          ["본사", "경기도 성남시 둔촌대로 388\n크란츠테크노 1211호"],
          ["홈페이지", data.website || "www.britzmedi.co.kr / www.britzmedi.com"],
          ["미디어 문의", "이성호 CMO\nsh.lee@britzmedi.co.kr\n010-6525-9442"]
        ]),

        // ■ 태그
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({ text: "[태그] ", bold: true, font: "Malgun Gothic", size: 20, color: "666666" }),
            new TextRun({ text: data.tags || "", font: "Malgun Gothic", size: 20, color: "666666" })
          ]
        })

      ]
    }]
  });

  // Buffer 생성
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
```

### 7-5. Create.jsx 연동

기존 HTML→.doc 다운로드 함수를 `generatePressReleaseDocx` 호출로 교체:

```javascript
import { generatePressReleaseDocx } from '../lib/generatePressReleaseDocx';
import { saveAs } from 'file-saver';

async function handleWordDownload() {
  const data = {
    title: result.title,
    subtitle: result.subtitle,
    body: result.body,
    quote: selectedQuote || null,         // 선택된 인용문
    companyIntro: result.companyIntro,
    photoGuide: result.photoGuide || [],   // 배열
    attachGuide: result.attachGuide || [], // 배열
    tags: result.tags,
    contact: result.contact,
    date: result.date,
    website: result.website,
    socialLinks: result.socialLinks
  };

  const buffer = await generatePressReleaseDocx(data);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  saveAs(blob, `${data.title || '보도자료'}.docx`);
}
```

### 7-6. docx-js 필수 규칙 (반드시 준수)

1. **WidthType.DXA만 사용** — PERCENTAGE 금지 (Google Docs에서 깨짐)
2. **ShadingType.CLEAR 사용** — SOLID 금지 (검은 배경 됨)
3. **`\n` 직접 사용 금지** — 반드시 별도 Paragraph으로 분리
4. **columnWidths 합 = 테이블 width** — 정확히 일치해야 함
5. **셀 margins 반드시 설정** — `{ top: 80, bottom: 80, left: 120, right: 120 }`
6. **유니코드 불릿 금지** — LevelFormat.BULLET 사용
7. **PageBreak는 Paragraph 안에** — 독립 사용 시 invalid XML

### 검증 F

```bash
# 1. docx 패키지 설치 확인
cat package.json | grep '"docx"'
# 결과: 버전 표시되면 PASS

# 2. 새 파일 존재 확인
ls -la src/lib/generatePressReleaseDocx.js
# 결과: 파일 있으면 PASS

# 3. HTML .doc 방식 완전 제거 확인
grep -n "text/html\|xmlns:o=\|xmlns:w=" src/components/create/Create.jsx
# 결과: 0건이면 PASS (기존 HTML 방식 제거됨)

# 4. docx-js import 확인
grep -n "generatePressReleaseDocx\|from 'docx'\|require('docx')" src/components/create/Create.jsx src/lib/generatePressReleaseDocx.js
# 결과: import 문이 있으면 PASS

# 5. 빌드 테스트
npm run build
# 결과: 에러 없이 빌드 완료되면 PASS

# 6. 실제 다운로드 테스트 (브라우저에서)
# Word 파일 다운로드 후 열어서 확인:
# - 파일 확장자가 .docx인지 (not .doc)
# - "보 도 자 료 / PRESS RELEASE" 헤더가 있는지
# - 발신 정보 테이블이 2열로 나오는지
# - 본문이 11pt 맑은고딕으로 나오는지
# - 사진/첨부 가이드가 번호 테이블로 나오는지
# - 하단 연락처 테이블이 있는지
# - 푸터에 페이지 번호가 있는지
```

---

## 8. 통합 테스트

위 수정 A~F 전부 완료 후, 아래 7개 테스트를 실행한다.
**전체 PASS가 나올 때까지 수정 반복.**

### 테스트 소스

```
태국 방콕 Derma Solutions사와 토르RF 독점유통 계약 체결. 3년 계약, 연 300대 규모. 태국 피부과 시장 진출 본격화. 4월 15일 방콕 본사에서 계약식 진행. 올해 하반기부터 납품 시작 예정.
```

### 테스트 1: 외래어 표기 (수정 A)

- 본문에서 "Derma Solutions"가 한글 음역 없이 나오는지 확인
- 기대: 첫 등장 "더마 솔루션스(Derma Solutions)", 이후 "더마 솔루션스"
- 기대: 첫 등장 "미국 식품의약국(FDA)", 이후 "미국 식품의약국"
- 기대: 첫 등장 "토로이달(TOROIDAL)", 이후 "토로이달"
- ❌ FAIL 조건: 영문이 한글 음역 없이 단독 사용 / 2회 이상 영문 병기

### 테스트 2: 오타 없음 (수정 B)

- 생성된 본문 전체에서 "다이나스" 검색
- ❌ FAIL 조건: "다이나스", "디나이스" 등 오표기 발견

### 테스트 3: 소스 팩트 완전 반영 (수정 C)

- 소스의 모든 숫자를 본문에서 대조:
  - "3년" 계약 → 본문에 있는지
  - "연 300대" 규모 → 본문에 있는지
  - "4월 15일" → 본문에 있는지
  - "하반기" 납품 → 본문에 있는지
- ❌ FAIL 조건: 소스의 숫자/기간 중 하나라도 누락

### 테스트 4: 인용문 (수정 D)

- 인용문 3개 제안 UI가 나오는지
- 하나 선택 후 본문에 삽입되는지
- "[대표 인용문 - 직접 작성 또는 확인 필요]" 레이블이 최종본에서 사라졌는지
- 선택한 인용문이 보도문체인지 ("이신재 대표는 '...'이라고 밝혔다")
- ❌ FAIL 조건: 레이블 잔존 / 인용문 미삽입

### 테스트 5: 담당자명 (수정 E)

- 연락처에 "이성호"가 표시되는지
- ❌ FAIL 조건: "이상호"가 어디서든 노출

### 테스트 6: Word 다운로드 (수정 F)

- Word 다운로드 실행
- 다운로드된 파일이 .docx 확장자인지 (not .doc)
- Word에서 열었을 때:
  - "보 도 자 료 / PRESS RELEASE" 헤더 있는지
  - 발신 정보 2열 테이블 있는지
  - 제목/부제목 가운데 정렬인지
  - 본문 문단 분리가 정상인지
  - 사진 가이드 번호 테이블 있는지
  - 첨부파일 가이드 번호 테이블 있는지
  - 회사 소개 (보일러플레이트) 있는지
  - 하단 연락처 2열 테이블 있는지
  - 푸터에 페이지 번호 있는지
  - "[입력 필요]" 플레이스홀더가 제목으로 노출되지 않는지
- ❌ FAIL 조건: 위 항목 중 하나라도 미충족

### 테스트 7: 할루시네이션 종합

- 본문에서 소스 + 지식베이스에 없는 구체적 정보가 있는지
- 허용: 유추 가능한 일반적 설명 (유통 계약 → "유통 파트너사")
- 허용: 지역권 언급 (태국 → 동남아시아)
- 금지: 구체적 회사 상세 (설립연도, 직원수, 매출), 시장 데이터, 현장 반응
- 수정 리포트: 5건 이하
- ❌ FAIL 조건: 구체적 날조 발견 / 수정 리포트 10건 이상

### 결과 보고 형식

```
=== 통합 테스트 결과 ===
테스트 1 (외래어 표기): ✅ PASS / ❌ FAIL — (사유)
테스트 2 (오타 없음):   ✅ PASS / ❌ FAIL — (사유)
테스트 3 (팩트 반영):   ✅ PASS / ❌ FAIL — (사유)
테스트 4 (인용문):      ✅ PASS / ❌ FAIL — (사유)
테스트 5 (담당자명):    ✅ PASS / ❌ FAIL — (사유)
테스트 6 (Word 양식):   ✅ PASS / ❌ FAIL — (사유)
테스트 7 (할루시네이션): ✅ PASS / ❌ FAIL — (사유)
전체: X/7 통과
```

**❌ 1건이라도 있으면 수정 후 재실행. 전체 7/7 PASS가 나올 때까지 반복.**

---

## 끝.
