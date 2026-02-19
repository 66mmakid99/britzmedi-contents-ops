# HANDOFF 보충: 논문/연구 해설 유형 전면 재설계

> 이 문서는 HANDOFF-CONTENT-TYPES-EXPANSION.md의 `research` 유형을 대체합니다.
> 기존 설계(수동 입력 폼)를 폐기하고, 자동 검색 → 추천 → 원클릭 생성으로 변경합니다.

---

## 문제

기존 설계:
```
마케터가 직접 입력해야 함:
- 논문 제목 (어디서 찾지?)
- 저널/출처 (모르는데?)
- DOI (뭔데?)
- 핵심 결론 (논문을 읽어야 아는데?)
- 관련 제품 (이것만 알아)
- 제품 연결 포인트 (이것도 AI가 해야지)
```

이건 콘텐츠 팩토리가 아니라 **수동 작업 도구**다.

---

## 목표 상태

```
[논문 해설] 탭 클릭
    ↓
AI가 자동으로 BRITZMEDI 제품 관련 최신 논문 검색
    ↓
┌─────────────────────────────────────────────────────┐
│  📑 이번 달 추천 논문                                 │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🔥 추천                                      │    │
│  │ Monopolar RF로 피부 탄력 개선 + 피지 감소     │    │
│  │ J of Cosmetic Dermatology, 2025             │    │
│  │ 핵심: 32명 대상, 콜라겐+탄성섬유 밀도 증가     │    │
│  │ 연결: TORR RF의 모노폴라 고주파 원리 동일     │    │
│  │                                             │    │
│  │  [이 논문으로 콘텐츠 만들기]                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ RF 피부 재생 기술 종합 리뷰 (2026)            │    │
│  │ Health Science Reports, 2026                │    │
│  │ 핵심: 모노폴라/바이폴라/멀티폴라 RF 전체 비교  │    │
│  │ 연결: TORR RF 토로이달 기술의 학술적 근거      │    │
│  │                                             │    │
│  │  [이 논문으로 콘텐츠 만들기]                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 마이크로니들 RF 피부 재생 효과 분석            │    │
│  │ Frontiers in Medicine, 2025                 │    │
│  │ 핵심: 38명 대상, 콜라겐 재배열 + 표피 두께 증가│    │
│  │ 연결: RF 에너지 전달 원리 공유                │    │
│  │                                             │    │
│  │  [이 논문으로 콘텐츠 만들기]                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [🔍 다른 키워드로 검색]  [🔄 새로고침]              │
└─────────────────────────────────────────────────────┘
```

마케터가 하는 일: **"이 논문으로 콘텐츠 만들기" 버튼 클릭** — 끝.

---

## 전체 플로우

```
Step 1: 논문 자동 검색 (PubMed API)
  └→ BRITZMEDI 제품 키워드로 관련 논문 자동 검색
  └→ 최신순 정렬, 최근 2년 필터

Step 2: AI가 논문 요약 + 제품 연결 분석 (1차 API 호출)
  └→ 각 논문의 핵심 결론 한줄 요약
  └→ BRITZMEDI 제품과의 연결 포인트 자동 생성
  └→ 콘텐츠 영향력 점수 (1~5점)

Step 3: 추천 리스트 표시
  └→ 영향력 높은 순으로 정렬
  └→ "🔥 추천" 배지

Step 4: 마케터가 논문 선택 (클릭 하나)

Step 5: AI가 채널별 콘텐츠 자동 생성 (2차 API 호출)
  └→ 선택한 논문 + 제품 연결 포인트를 소스로
  └→ LinkedIn, 네이버 블로그, 뉴스레터 등 채널별 생성

Step 6: 자동 검수 (3차 API 호출)
  └→ 논문 내용 날조 여부 검수
  └→ 의료법 위반 표현 검수

Step 7: 마케터가 복사 → 붙여넣기
```

---

## 기술 구현 상세

### 1. PubMed 논문 검색 함수

#### 새 파일: `src/lib/pubmedSearch.js`

PubMed는 무료 공개 API를 제공합니다 (E-utilities).
API 키 불필요, rate limit만 주의 (초당 3회).

```javascript
/**
 * PubMed E-utilities API를 통한 논문 검색
 * https://www.ncbi.nlm.nih.gov/books/NBK25497/
 */

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const ESUM_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

/**
 * BRITZMEDI 제품 관련 사전 정의 검색 쿼리
 * 이 쿼리들로 자동 검색
 */
export const RESEARCH_QUERIES = [
  {
    id: 'rf_skin_tightening',
    label: 'RF 피부 타이트닝',
    query: '(radiofrequency) AND (skin tightening OR skin laxity OR collagen remodeling)',
    products: ['torr_rf'],
    description: '고주파 피부 타이트닝 관련 연구',
  },
  {
    id: 'rf_collagen',
    label: 'RF 콜라겐 재생',
    query: '(radiofrequency) AND (collagen synthesis OR neocollagenesis OR collagen density)',
    products: ['torr_rf'],
    description: 'RF 에너지와 콜라겐 생성 메커니즘',
  },
  {
    id: 'microneedle_rf',
    label: '마이크로니들 RF',
    query: '(microneedle radiofrequency OR fractional RF) AND (skin rejuvenation OR acne scar)',
    products: ['torr_rf', 'newchae'],
    description: '마이크로니들 RF 시술 효과',
  },
  {
    id: 'aesthetic_device_safety',
    label: '미용의료기기 안전성',
    query: '(energy-based device OR aesthetic device) AND (safety OR adverse event) AND (radiofrequency OR RF)',
    products: ['torr_rf', 'ulblanc', 'lumino_wave'],
    description: '에너지 기반 미용의료기기 안전성 연구',
  },
  {
    id: 'body_contouring_rf',
    label: 'RF 바디 컨투어링',
    query: '(radiofrequency) AND (body contouring OR body shaping OR circumference reduction)',
    products: ['torr_rf'],
    description: 'RF를 이용한 바디 컨투어링',
  },
  {
    id: 'skin_rejuvenation_review',
    label: '피부 재생 종합 리뷰',
    query: '(skin rejuvenation) AND (radiofrequency) AND (review OR systematic review OR meta-analysis)',
    products: ['torr_rf', 'lumino_wave'],
    description: 'RF 피부 재생 분야 종합 리뷰 논문',
  },
];

/**
 * PubMed 검색 (Step 1)
 * @param {string} query - 검색 쿼리
 * @param {number} maxResults - 최대 결과 수 (기본 10)
 * @param {number} recentYears - 최근 N년 (기본 2)
 * @returns {Promise<string[]>} PubMed ID 목록
 */
export async function searchPubMed(query, maxResults = 10, recentYears = 2) {
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - recentYears);
  const minDateStr = `${minDate.getFullYear()}/${String(minDate.getMonth() + 1).padStart(2, '0')}/${String(minDate.getDate()).padStart(2, '0')}`;

  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: maxResults.toString(),
    sort: 'date',  // 최신순
    mindate: minDateStr,
    retmode: 'json',
  });

  const res = await fetch(`${ESEARCH_URL}?${params}`);
  if (!res.ok) throw new Error(`PubMed search failed: ${res.status}`);

  const data = await res.json();
  return data.esearchresult?.idlist || [];
}

/**
 * PubMed ID로 논문 상세 정보 가져오기
 * @param {string[]} pmids - PubMed ID 목록
 * @returns {Promise<object[]>} 논문 정보 배열
 */
export async function fetchPaperDetails(pmids) {
  if (!pmids.length) return [];

  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  });

  const res = await fetch(`${ESUM_URL}?${params}`);
  if (!res.ok) throw new Error(`PubMed fetch failed: ${res.status}`);

  const data = await res.json();
  const results = data.result || {};

  return pmids.map(pmid => {
    const paper = results[pmid];
    if (!paper) return null;
    return {
      pmid,
      title: paper.title || '',
      authors: (paper.authors || []).map(a => a.name).join(', '),
      journal: paper.source || '',
      pubDate: paper.pubdate || '',
      doi: (paper.articleids || []).find(id => id.idtype === 'doi')?.value || '',
      abstract: '',  // eSummary에는 초록 없음, 필요하면 eFetch 별도 호출
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    };
  }).filter(Boolean);
}

/**
 * 논문 초록 가져오기 (선택: AI 분석에 필요할 때만)
 * eFetch는 XML 반환하므로 파싱 필요
 */
export async function fetchAbstract(pmid) {
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmid,
    retmode: 'xml',
    rettype: 'abstract',
  });

  const res = await fetch(`${EFETCH_URL}?${params}`);
  if (!res.ok) return '';

  const xml = await res.text();
  // 간단한 XML 파싱 (AbstractText 추출)
  const match = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
  if (!match) return '';

  return match
    .map(m => m.replace(/<[^>]+>/g, '').trim())
    .join(' ');
}

/**
 * 전체 자동 검색 프로세스
 * 사전 정의된 쿼리들로 검색 → 중복 제거 → 논문 정보 반환
 */
export async function autoSearchPapers(queryIds = null, maxPerQuery = 5) {
  const queries = queryIds
    ? RESEARCH_QUERIES.filter(q => queryIds.includes(q.id))
    : RESEARCH_QUERIES;

  const allPmids = new Set();
  const pmidQueryMap = {};  // pmid → 어떤 쿼리에서 나왔는지

  for (const q of queries) {
    try {
      const pmids = await searchPubMed(q.query, maxPerQuery);
      pmids.forEach(pmid => {
        allPmids.add(pmid);
        if (!pmidQueryMap[pmid]) pmidQueryMap[pmid] = [];
        pmidQueryMap[pmid].push(q);
      });
      // PubMed rate limit 준수 (초당 3회)
      await new Promise(r => setTimeout(r, 350));
    } catch (e) {
      console.warn(`Query "${q.label}" failed:`, e);
    }
  }

  const papers = await fetchPaperDetails([...allPmids]);

  // 쿼리 매핑 정보 추가
  return papers.map(paper => ({
    ...paper,
    matchedQueries: pmidQueryMap[paper.pmid] || [],
    relatedProducts: [...new Set(
      (pmidQueryMap[paper.pmid] || []).flatMap(q => q.products)
    )],
  }));
}
```

---

### 2. AI 분석 함수 (논문 요약 + 제품 연결)

#### `src/lib/researchAnalyzer.js` (신규)

```javascript
/**
 * AI가 논문을 분석하여 콘텐츠 추천 생성
 */
import { fetchAbstract } from './pubmedSearch';

/**
 * 논문 배치를 AI로 분석 (1회 API 호출로 여러 논문 처리)
 * @param {object[]} papers - PubMed 논문 목록
 * @param {string} apiKey - Claude API key
 * @returns {Promise<object[]>} 분석된 논문 + 추천 정보
 */
export async function analyzePapers(papers, apiKey) {
  // 초록이 없는 논문은 가져오기
  const papersWithAbstract = await Promise.all(
    papers.slice(0, 10).map(async (paper) => {  // 최대 10개만
      if (!paper.abstract) {
        paper.abstract = await fetchAbstract(paper.pmid);
      }
      return paper;
    })
  );

  // 초록이 있는 논문만 필터
  const validPapers = papersWithAbstract.filter(p => p.abstract && p.abstract.length > 50);

  if (validPapers.length === 0) return [];

  const paperList = validPapers.map((p, i) => 
    `[논문 ${i + 1}]
제목: ${p.title}
저널: ${p.journal} (${p.pubDate})
DOI: ${p.doi}
관련 제품: ${p.relatedProducts.join(', ')}
초록: ${p.abstract.slice(0, 500)}...`
  ).join('\n\n');

  const prompt = `당신은 BRITZMEDI(의료기기 전문기업)의 콘텐츠 전략가입니다.

BRITZMEDI 제품:
- TORR RF: FDA 승인 토로이달(TOROIDAL) 고주파 의료기기. 피부 타이트닝/리프팅.
- NEWCHAE (뉴채): 피부 관리 디바이스
- ULBLANC (울블랑): 에스테틱 디바이스
- LUMINO WAVE (루미노웨이브): 에너지 기반 디바이스 (2세대)

아래 논문들을 분석하여, 각 논문이 BRITZMEDI 마케팅 콘텐츠로 활용 가능한지 평가하세요.

${paperList}

[출력 형식 — JSON 배열로만 응답]
[
  {
    "index": 1,
    "summary_kr": "한국어 핵심 결론 1~2문장",
    "product_connection": "이 논문과 BRITZMEDI 제품의 연결 포인트 1문장",
    "content_angle": "이 논문으로 만들 수 있는 콘텐츠 각도 1문장",
    "impact_score": 4,  // 1~5 (5=매우 높음). 최신성, 신뢰도, 제품 연관성, 독자 관심도 종합
    "recommended_channels": ["linkedin", "naver-blog"],
    "headline_suggestion": "콘텐츠 제목 제안"
  }
]

[규칙]
1. 논문에 없는 내용을 추가하지 마라.
2. 제품 연결이 억지스러우면 impact_score를 낮게 줘라.
3. 실제 마케팅에 쓸 수 없는 논문(너무 오래됐거나, 관련 없거나)은 impact_score 1을 줘라.
4. JSON만 출력. 다른 텍스트 없이.`;

  const res = await fetch('https://britzmedi-api-proxy.mmakid.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.map(b => b.text || '').join('') || '';
  const usage = data.usage || null;

  // JSON 파싱
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const analyses = JSON.parse(cleaned);

    // 논문 데이터에 분석 결과 합치기
    return validPapers.map((paper, i) => {
      const analysis = analyses.find(a => a.index === i + 1) || {};
      return {
        ...paper,
        summaryKr: analysis.summary_kr || '',
        productConnection: analysis.product_connection || '',
        contentAngle: analysis.content_angle || '',
        impactScore: analysis.impact_score || 1,
        recommendedChannels: analysis.recommended_channels || [],
        headlineSuggestion: analysis.headline_suggestion || '',
      };
    }).sort((a, b) => b.impactScore - a.impactScore);  // 영향력 순 정렬
  } catch (e) {
    console.error('AI analysis parse failed:', e);
    return validPapers.map(p => ({ ...p, impactScore: 0, summaryKr: '분석 실패' }));
  }
}
```

---

### 3. UI 컴포넌트: ResearchExplorer

#### 새 파일: `src/components/create/ResearchExplorer.jsx`

기존 수동 입력 폼을 완전히 대체합니다.

```jsx
/**
 * ResearchExplorer: 논문 자동 검색 → 추천 → 원클릭 콘텐츠 생성
 * GeneralContentForm의 research 유형 대신 이 컴포넌트를 사용
 */
import { useState, useEffect } from 'react';
import { RESEARCH_QUERIES, autoSearchPapers } from '../../lib/pubmedSearch';
import { analyzePapers } from '../../lib/researchAnalyzer';

export default function ResearchExplorer({ onSelect, apiKey, onBack }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');  // '검색 중...' | '분석 중...'
  const [error, setError] = useState(null);
  const [selectedQueryIds, setSelectedQueryIds] = useState(null);  // null = 전체

  // 초기 로드: 자동 검색 + AI 분석
  useEffect(() => {
    if (apiKey) {
      handleSearch();
    }
  }, []);

  const handleSearch = async (queryIds = null) => {
    setLoading(true);
    setError(null);
    setPapers([]);

    try {
      // Step 1: PubMed 검색
      setLoadingStage('🔍 PubMed에서 관련 논문 검색 중...');
      const rawPapers = await autoSearchPapers(queryIds, 5);

      if (rawPapers.length === 0) {
        setError('관련 논문을 찾지 못했습니다.');
        setLoading(false);
        return;
      }

      // Step 2: AI 분석
      setLoadingStage(`📑 ${rawPapers.length}개 논문 분석 중... (AI가 읽고 있어요)`);
      const analyzed = await analyzePapers(rawPapers, apiKey);

      setPapers(analyzed);
    } catch (e) {
      setError(`검색 실패: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  // 논문 선택 → contentSource 생성 → 채널 재가공으로 이동
  const handleSelectPaper = (paper) => {
    onSelect({
      type: 'research',
      title: paper.headlineSuggestion || paper.title,
      body: `[논문 제목]\n${paper.title}\n\n[저널] ${paper.journal} (${paper.pubDate})\n[DOI] ${paper.doi}\n[PubMed] ${paper.url}\n\n[핵심 결론]\n${paper.summaryKr}\n\n[초록]\n${paper.abstract}\n\n[제품 연결]\n${paper.productConnection}\n\n[콘텐츠 각도]\n${paper.contentAngle}`,
      metadata: {
        pmid: paper.pmid,
        paperTitle: paper.title,
        journal: paper.journal,
        doi: paper.doi,
        pubDate: paper.pubDate,
        url: paper.url,
        summaryKr: paper.summaryKr,
        productConnection: paper.productConnection,
        contentAngle: paper.contentAngle,
        relatedProducts: paper.relatedProducts,
      },
      channels: paper.recommendedChannels,
      date: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-steel">←</button>
        <span className="text-2xl">📑</span>
        <h2 className="text-lg font-bold">논문 기반 콘텐츠</h2>
      </div>
      <p className="text-sm text-steel">
        PubMed에서 BRITZMEDI 제품 관련 최신 논문을 자동으로 검색하고,
        AI가 콘텐츠 소재로 추천합니다.
      </p>

      {/* 검색 카테고리 필터 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setSelectedQueryIds(null); handleSearch(null); }}
          className={`px-3 py-1.5 rounded-full text-xs border ${
            !selectedQueryIds ? 'bg-dark text-white' : 'bg-white text-steel border-pale'
          }`}
        >
          전체
        </button>
        {RESEARCH_QUERIES.map(q => (
          <button
            key={q.id}
            onClick={() => { setSelectedQueryIds([q.id]); handleSearch([q.id]); }}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              selectedQueryIds?.includes(q.id) ? 'bg-dark text-white' : 'bg-white text-steel border-pale'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-2xl mb-3">⚙️</div>
          <p className="text-sm text-steel">{loadingStage}</p>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* 논문 추천 리스트 */}
      {!loading && papers.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-steel">{papers.length}개 논문 분석 완료</p>

          {papers.map((paper, i) => (
            <div key={paper.pmid} className="bg-white border border-pale rounded-xl p-4 space-y-2">
              {/* 영향력 배지 */}
              <div className="flex items-center gap-2">
                {paper.impactScore >= 4 && (
                  <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    🔥 추천
                  </span>
                )}
                {paper.impactScore === 3 && (
                  <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ⭐ 활용 가능
                  </span>
                )}
                <span className="text-[10px] text-mist">
                  영향력 {'★'.repeat(paper.impactScore)}{'☆'.repeat(5 - paper.impactScore)}
                </span>
              </div>

              {/* 제목 (한글 요약) */}
              <h3 className="font-bold text-sm">{paper.headlineSuggestion || paper.summaryKr}</h3>

              {/* 원문 제목 */}
              <p className="text-xs text-mist line-clamp-2">{paper.title}</p>

              {/* 저널 + 날짜 */}
              <p className="text-xs text-steel">{paper.journal} · {paper.pubDate}</p>

              {/* 핵심 결론 */}
              <p className="text-sm text-dark">{paper.summaryKr}</p>

              {/* 제품 연결 */}
              <div className="bg-blue-50 p-2 rounded-lg">
                <p className="text-xs text-blue-700">
                  🔗 <span className="font-medium">제품 연결:</span> {paper.productConnection}
                </p>
              </div>

              {/* 추천 채널 */}
              <div className="flex gap-1">
                {paper.recommendedChannels.map(ch => (
                  <span key={ch} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">
                    {ch === 'linkedin' ? 'LinkedIn' : ch === 'naver-blog' ? '네이버블로그' : ch === 'newsletter' ? '뉴스레터' : ch}
                  </span>
                ))}
              </div>

              {/* 콘텐츠 만들기 버튼 */}
              <button
                onClick={() => handleSelectPaper(paper)}
                className="w-full py-2.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent/90 transition-colors"
              >
                이 논문으로 콘텐츠 만들기 →
              </button>

              {/* PubMed 원문 링크 */}
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-500 underline"
              >
                PubMed 원문 보기 ↗
              </a>
            </div>
          ))}
        </div>
      )}

      {/* 수동 입력 폴백 (혹시 특정 논문을 직접 넣고 싶을 때) */}
      {!loading && (
        <details className="text-sm">
          <summary className="text-steel cursor-pointer">
            💡 특정 논문을 직접 입력하고 싶다면
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
            <p className="text-xs text-mist">
              PubMed URL 또는 DOI를 붙여넣으면 자동으로 정보를 가져옵니다.
            </p>
            <input
              type="text"
              placeholder="예: https://pubmed.ncbi.nlm.nih.gov/41014039/ 또는 10.1111/jocd.70463"
              className="w-full p-2 border border-pale rounded text-xs"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  // DOI 또는 PMID 추출 → fetchPaperDetails → analyzePapers → 추가
                  // 구현은 Claude Code에서
                }
              }}
            />
          </div>
        </details>
      )}
    </div>
  );
}
```

---

### 4. Create.jsx 연결 변경

```jsx
// 기존: 모든 비-보도자료 유형에 GeneralContentForm 사용
// 변경: research 유형만 ResearchExplorer 사용

if (selectedType === 'research') {
  return (
    <ResearchExplorer
      onBack={() => setSelectedType(null)}
      onSelect={handleGoToRepurposeGeneral}
      apiKey={apiKey}
    />
  );
}

// 나머지 유형은 기존 GeneralContentForm 사용
return (
  <GeneralContentForm
    contentType={selectedType}
    onBack={() => setSelectedType(null)}
    onSubmit={handleGoToRepurposeGeneral}
    apiKey={apiKey}
  />
);
```

---

### 5. CONTENT_TYPES에서 research 필드 변경

```javascript
// contentTypes.js에서 research 수정
research: {
  label: '논문/연구 해설',
  icon: '📑',
  description: 'AI가 최신 논문을 자동으로 찾아 콘텐츠를 추천합니다',
  track: 'A',
  flow: 'research_explorer',  // ← 'simple'이 아닌 전용 플로우
  recommendedChannels: ['linkedin', 'naver-blog', 'newsletter'],
  channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 3, kakao: 1, instagram: 2 },
  fields: null,  // ← 수동 입력 필드 없음 (ResearchExplorer가 대신)
},
```

---

### 6. 논문 해설 전용 채널 프롬프트

기존 getTypeSpecificRules의 research 규칙은 유지하되,
프롬프트에 논문 원문 정보(초록, DOI)가 자동 포함되므로 더 정확한 결과가 나옵니다.

```javascript
// getChannelPromptForType에서 research 전용 처리
if (contentType === 'research') {
  return `당신은 피부과/메디컬 에스테틱 분야의 논문 해설 전문 콘텐츠 작가입니다.

아래 논문을 ${getChannelLabel(channelId)} 독자에게 맞는 교육 콘텐츠로 변환하세요.

${sourceText}

[핵심 규칙]
1. 논문 원문(초록)에 있는 내용만 사용. 없는 효과/수치 절대 추가 금지.
2. "~한 것으로 나타났다", "~라는 연구 결과가 발표됐다" 등 인용 문체.
3. 제품 연결: "[제품 연결]"에 명시된 각도로만 연결. 
   "이 원리를 적용한 장비로는 ○○이 있다" 수준. 
   "○○이 이 효과를 낸다"는 과대광고 → 금지.
4. 출처(저널명, DOI, PubMed URL) 반드시 포함.
5. 의료법 위반 표현 금지: "치료", "완치", "효과 보장" 등.

${getExistingChannelRules(channelId)}`;
}
```

---

## 비용 추정

| 단계 | API 호출 | 토큰 (추정) | 비용 |
|------|---------|------------|------|
| PubMed 검색 | 0 (무료 API) | 0 | $0 |
| 논문 10개 AI 분석 | 1회 | ~5,000 in / ~2,000 out | $0.045 |
| 채널 3개 생성 | 3회 | ~9,000 in / ~4,500 out | $0.095 |
| 채널 3개 검수 | 3회 | ~12,000 in / ~2,400 out | $0.072 |
| **논문 콘텐츠 1세트** | **~7회** | **~26,000 in / ~9,000 out** | **~$0.21 (₩305)** |

---

## 구현 체크리스트

```
□ 1. src/lib/pubmedSearch.js 신규 생성 (PubMed API 클라이언트)
□ 2. src/lib/researchAnalyzer.js 신규 생성 (AI 분석 함수)
□ 3. src/components/create/ResearchExplorer.jsx 신규 생성 (UI)
□ 4. src/components/create/Create.jsx에서 research 유형일 때 ResearchExplorer 렌더
□ 5. src/constants/contentTypes.js에서 research.flow = 'research_explorer' 변경
□ 6. src/constants/prompts.js에서 research 전용 채널 프롬프트 추가
□ 7. CORS 확인: PubMed API가 브라우저에서 직접 호출 가능한지 확인
     - 불가능하면 → Cloudflare Worker 프록시 경유
□ 8. 테스트: "RF 피부 타이트닝" 카테고리로 검색 → 논문 추천 → 콘텐츠 생성
```

---

## CORS 대비: PubMed 프록시

PubMed E-utilities는 CORS를 공식 지원하지 않을 수 있습니다.
브라우저에서 직접 호출이 안 되면, 기존 `britzmedi-api-proxy.mmakid.workers.dev`에
PubMed 프록시 경로를 추가하세요:

```javascript
// Cloudflare Worker에 추가
if (url.pathname.startsWith('/pubmed/')) {
  const pubmedUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/' + url.pathname.replace('/pubmed/', '');
  const params = url.search;
  const res = await fetch(pubmedUrl + params);
  return new Response(res.body, {
    headers: {
      ...res.headers,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

그러면 프론트엔드에서:
```javascript
const PUBMED_PROXY = 'https://britzmedi-api-proxy.mmakid.workers.dev/pubmed/';
// fetch(`${PUBMED_PROXY}esearch.fcgi?...`)
```
