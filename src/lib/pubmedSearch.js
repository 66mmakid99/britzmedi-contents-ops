/**
 * PubMed E-utilities API 클라이언트
 * BRITZMEDI 관련 논문 자동 검색
 */

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PROXY_URL = 'https://britzmedi-api-proxy.mmakid.workers.dev';

// BRITZMEDI 제품 관련 사전 검색어
export const RESEARCH_QUERIES = [
  { id: 'rf_tightening', label: 'RF 피부 타이트닝', query: 'radiofrequency skin tightening clinical' },
  { id: 'collagen', label: '콜라겐 재생', query: 'collagen regeneration radiofrequency dermatology' },
  { id: 'microneedle_rf', label: '마이크로니들 RF', query: 'microneedle radiofrequency fractional skin' },
  { id: 'device_safety', label: '디바이스 안전성', query: 'energy based device safety dermatology' },
  { id: 'body_contouring', label: '바디 컨투어링', query: 'radiofrequency body contouring noninvasive' },
  { id: 'rejuvenation', label: '피부 리주버네이션', query: 'skin rejuvenation radiofrequency treatment' },
];

/**
 * PubMed esearch → PMID 리스트 반환
 */
export async function searchPubMed(query, maxResults = 10, dateFrom = null) {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: String(maxResults),
    retmode: 'json',
    sort: 'date',
  });
  if (dateFrom) params.set('mindate', dateFrom);
  if (dateFrom) params.set('datetype', 'pdat');

  let data;
  try {
    const res = await fetch(`${PUBMED_BASE}/esearch.fcgi?${params}`);
    if (!res.ok) throw new Error(`PubMed search error ${res.status}`);
    data = await res.json();
  } catch (e) {
    // CORS 실패 시 프록시 폴백
    const res = await fetch(`${PROXY_URL}/pubmed/esearch?${params}`);
    if (!res.ok) throw new Error(`PubMed proxy search error ${res.status}`);
    data = await res.json();
  }

  return data?.esearchresult?.idlist || [];
}

/**
 * PubMed esummary → 논문 메타데이터 반환
 */
export async function fetchPaperDetails(pmids) {
  if (!pmids.length) return [];

  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  });

  let data;
  try {
    const res = await fetch(`${PUBMED_BASE}/esummary.fcgi?${params}`);
    if (!res.ok) throw new Error(`PubMed summary error ${res.status}`);
    data = await res.json();
  } catch (e) {
    const res = await fetch(`${PROXY_URL}/pubmed/esummary?${params}`);
    if (!res.ok) throw new Error(`PubMed proxy summary error ${res.status}`);
    data = await res.json();
  }

  const result = data?.result || {};
  return pmids
    .map(id => {
      const item = result[id];
      if (!item) return null;
      const doi = (item.elocationid || '').replace('doi: ', '');
      return {
        pmid: id,
        title: item.title || '',
        journal: item.fulljournalname || item.source || '',
        pubDate: item.pubdate || '',
        doi,
        authors: (item.authors || []).map(a => a.name).slice(0, 5).join(', '),
      };
    })
    .filter(Boolean);
}

/**
 * PubMed efetch → 초록 추출 (XML 파싱)
 */
export async function fetchAbstract(pmid) {
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmid,
    retmode: 'xml',
    rettype: 'abstract',
  });

  let text;
  try {
    const res = await fetch(`${PUBMED_BASE}/efetch.fcgi?${params}`);
    if (!res.ok) throw new Error(`PubMed fetch error ${res.status}`);
    text = await res.text();
  } catch (e) {
    const res = await fetch(`${PROXY_URL}/pubmed/efetch?${params}`);
    if (!res.ok) throw new Error(`PubMed proxy fetch error ${res.status}`);
    text = await res.text();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  const abstractTexts = doc.querySelectorAll('AbstractText');
  if (!abstractTexts.length) return '';

  return Array.from(abstractTexts)
    .map(node => {
      const label = node.getAttribute('Label');
      const content = node.textContent.trim();
      return label ? `${label}: ${content}` : content;
    })
    .join('\n');
}

/**
 * 전체 자동 검색 파이프라인
 * 카테고리별 검색 → 중복 제거 → 초록 가져오기
 */
export async function autoSearchPapers(categories = null) {
  const queries = categories
    ? RESEARCH_QUERIES.filter(q => categories.includes(q.id))
    : RESEARCH_QUERIES;

  // 최근 2년 논문만
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const dateFrom = `${twoYearsAgo.getFullYear()}/${String(twoYearsAgo.getMonth() + 1).padStart(2, '0')}`;

  const seenPmids = new Set();
  const allPapers = [];

  for (const q of queries) {
    try {
      const pmids = await searchPubMed(q.query, 5, dateFrom);
      const newPmids = pmids.filter(id => !seenPmids.has(id));
      newPmids.forEach(id => seenPmids.add(id));

      if (newPmids.length > 0) {
        const details = await fetchPaperDetails(newPmids);
        for (const paper of details) {
          paper.category = q.id;
          paper.categoryLabel = q.label;
          allPapers.push(paper);
        }
      }
    } catch (e) {
      console.warn(`PubMed search failed for "${q.label}":`, e.message);
    }

    // API rate limit 방어 (350ms 딜레이)
    await new Promise(r => setTimeout(r, 350));
  }

  // 상위 10개에 대해 초록 가져오기
  const topPapers = allPapers.slice(0, 10);
  for (const paper of topPapers) {
    try {
      paper.abstract = await fetchAbstract(paper.pmid);
    } catch (e) {
      paper.abstract = '';
    }
    await new Promise(r => setTimeout(r, 200));
  }

  return topPapers;
}
