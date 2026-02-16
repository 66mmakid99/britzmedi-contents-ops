# Create.jsx 수정 지시서 — 정확한 문자열 교체

이 파일의 지시대로 src/components/create/Create.jsx를 수정해.
각 STEP의 OLD → NEW를 정확히 교체해. 순서대로 실행.

---

## STEP 1: openPrintView 함수 교체 (PDF 라벨 제거)

### OLD (93~108줄 — 이 문자열을 찾아서 교체):

```
function openPrintView(text, title) {
  const clean = filterPlaceholders(text);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:'맑은 고딕',sans-serif;font-size:11pt;line-height:1.8;max-width:700px;margin:40px auto;padding:0 20px;}
h2{font-size:13pt;margin-top:20px;color:#333;border-bottom:1px solid #ddd;padding-bottom:4px;}
p{margin:6px 0;} @media print{body{margin:0;max-width:100%;}}</style></head>
<body><h1>${title}</h1>${clean.split('\n\n').map((block) => {
    const m = block.match(/^\[([^\]]+)\]\n?([\s\S]*)$/);
    if (m) return `<h2>${m[1]}</h2><p>${m[2].replace(/\n/g, '<br>')}</p>`;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('')}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}
```

### NEW:

```
function openPrintView(text, title) {
  const clean = filterPlaceholders(text);
  const w = window.open('', '_blank');
  if (!w) return;

  // 섹션 파싱 (라벨 제거, 내용만 추출)
  const sections = {};
  let currentLabel = null;
  clean.split('\n\n').forEach((block) => {
    const m = block.match(/^\[([^\]]+)\]\n?([\s\S]*)$/);
    if (m) {
      currentLabel = m[1];
      sections[currentLabel] = (sections[currentLabel] || '') + m[2].trim();
    } else if (currentLabel) {
      sections[currentLabel] = (sections[currentLabel] || '') + '\n\n' + block.trim();
    } else {
      sections['_body'] = (sections['_body'] || '') + '\n\n' + block.trim();
    }
  });

  const titleText = sections['제목'] || title;
  const subtitle = sections['부제목'] || '';
  const bodyParts = Object.entries(sections)
    .filter(([k]) => !['제목', '부제목', '회사 소개', '회사 개요', '출처', '날짜', '웹사이트', '소셜 링크', '연락처'].includes(k))
    .map(([, v]) => v.trim())
    .filter(Boolean);
  const companyIntro = sections['회사 소개'] || sections['회사 개요'] || '';
  const contact = sections['연락처'] || '';

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titleText}</title>
<style>
  body{font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:11pt;line-height:1.8;max-width:700px;margin:40px auto;padding:0 20px;color:#222;}
  .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:30px;}
  .header h1{font-size:14pt;letter-spacing:8px;margin:0 0 4px 0;color:#333;}
  .header p{font-size:10pt;color:#666;margin:0;}
  .title{text-align:center;font-size:16pt;font-weight:bold;margin:30px 0 8px 0;}
  .subtitle{text-align:center;font-size:12pt;color:#666;margin:0 0 30px 0;}
  .body p{margin:8px 0;text-align:justify;}
  .divider{border:none;border-top:1px solid #ccc;margin:30px 0 15px 0;}
  .company{color:#666;font-size:10pt;line-height:1.6;}
  .company-title{font-weight:bold;font-size:10pt;color:#666;margin-bottom:4px;}
  .contact-table{width:100%;border-collapse:collapse;font-size:10pt;margin-top:15px;}
  .contact-table td{padding:6px 10px;border:1px solid #ccc;}
  .contact-table .label{background:#f2f2f2;font-weight:bold;width:100px;}
  @media print{body{margin:0;max-width:100%;}}
</style></head>
<body>
  <div class="header">
    <h1>보 도 자 료</h1>
    <p>PRESS RELEASE</p>
  </div>
  <div class="title">${titleText}</div>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  <div class="body">${bodyParts.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>
  ${companyIntro ? `<hr class="divider"><div class="company-title">회사 소개</div><div class="company">${companyIntro.replace(/\n/g, '<br>')}</div>` : ''}
  <table class="contact-table">
    <tr><td class="label">회사명</td><td>BRITZMEDI Co., Ltd. (브릿츠메디 주식회사)</td></tr>
    <tr><td class="label">대표이사</td><td>이신재</td></tr>
    <tr><td class="label">본사</td><td>경기도 성남시 둔촌대로 388 크란츠테크노 1211호</td></tr>
    <tr><td class="label">홈페이지</td><td>www.britzmedi.co.kr / www.britzmedi.com</td></tr>
    <tr><td class="label">미디어 문의</td><td>이성호 CMO<br>sh.lee@britzmedi.co.kr<br>010-6525-9442</td></tr>
  </table>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}
```

---

## STEP 2: enforceFactPairs 함수 추가 (openPrintView 바로 위, filterPlaceholders 아래)

### 찾을 위치: `function openPrintView` 바로 앞에 추가

### OLD:

```
function openPrintView(text, title) {
```

### NEW:

```
/** 소스에 있는 기간+수량 쌍이 생성 결과에도 있는지 확인, 없으면 삽입 */
function enforceFactPairs(content, source) {
  if (!source || !content) return content;
  let result = content;

  // "N년" 패턴 (3년 계약, 3년간, 3년 동안 등)
  const periodMatch = source.match(/(\d+)년\s*(계약|간|동안)/);
  const volumeMatch = source.match(/연\s*(\d+)대/);

  if (periodMatch && volumeMatch) {
    const num = periodMatch[1]; // "3"
    // 본문에 "N년"이 없으면 "연 XXX대" 앞에 삽입
    if (!result.includes(num + '년')) {
      result = result.replace(/연\s*(\d+)대/, num + '년간 연 $1대');
    }
  }

  return result;
}

function openPrintView(text, title) {
```

---

## STEP 3: 생성 결과에 enforceFactPairs 적용

### OLD (약 351줄):

```
      setV2Content(results);

      // Parse sections for editor
      const parsed = {};
      for (const [ch, text] of Object.entries(results)) {
        parsed[ch] = parseSections(text);
      }
```

### NEW:

```
      // 팩트 쌍 강제 (예: "3년" 누락 방지)
      for (const ch of Object.keys(results)) {
        results[ch] = enforceFactPairs(results[ch], sourceText);
      }

      setV2Content(results);

      // Parse sections for editor
      const parsed = {};
      for (const [ch, text] of Object.entries(results)) {
        parsed[ch] = parseSections(text);
      }
```

---

## STEP 4: 자동수정 결과에도 enforceFactPairs 적용

### OLD (약 442~460줄):

```
        // Update editedSections and v2Content with fixed content
        setEditedSections((prev) => {
          const copy = { ...prev };
          for (const [ch, fixResult] of Object.entries(fixResults)) {
            if (fixResult?.fixedContent) {
              copy[ch] = parseSections(fixResult.fixedContent);
            }
          }
          return copy;
        });
        setV2Content((prev) => {
          const copy = { ...prev };
          for (const [ch, fixResult] of Object.entries(fixResults)) {
            if (fixResult?.fixedContent) {
              copy[ch] = fixResult.fixedContent;
            }
          }
          return copy;
        });
```

### NEW:

```
        // Update editedSections and v2Content with fixed content + 팩트 쌍 강제
        setEditedSections((prev) => {
          const copy = { ...prev };
          for (const [ch, fixResult] of Object.entries(fixResults)) {
            if (fixResult?.fixedContent) {
              const enforced = enforceFactPairs(fixResult.fixedContent, sourceText);
              copy[ch] = parseSections(enforced);
            }
          }
          return copy;
        });
        setV2Content((prev) => {
          const copy = { ...prev };
          for (const [ch, fixResult] of Object.entries(fixResults)) {
            if (fixResult?.fixedContent) {
              copy[ch] = enforceFactPairs(fixResult.fixedContent, sourceText);
            }
          }
          return copy;
        });
```

---

## STEP 5: 빌드 + 배포

```bash
npm run build
npx wrangler pages deploy dist --project-name=britzmedi-contents-ops --branch=main
git add . && git commit -m "fix: PDF labels removed, 3년 fact enforcement" && git push
```
