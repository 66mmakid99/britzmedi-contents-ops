/**
 * Claude API 기반 논문 배치 분석
 * channelGenerate.js의 callClaudeForChannel 패턴 재사용
 */

const API_URL = 'https://britzmedi-api-proxy.mmakid.workers.dev';

/**
 * 논문 목록을 Claude에 전송하여 BRITZMEDI 관점에서 분석
 * @param {Array} papers - fetchPaperDetails + abstract 포함 논문 배열
 * @param {string} apiKey - Claude API key
 * @param {object} tracker - 토큰 추적기
 * @returns {Array} 분석 결과가 추가된 논문 배열
 */
export async function analyzePapers(papers, apiKey, tracker) {
  if (!papers.length) return [];
  if (!apiKey) throw new Error('API 키가 필요합니다');

  // 최대 10개, 초록 500자 제한
  const batch = papers.slice(0, 10).map((p, i) => ({
    index: i,
    title: p.title,
    journal: p.journal,
    pubDate: p.pubDate,
    abstract: (p.abstract || '').slice(0, 500),
  }));

  const prompt = `당신은 BRITZMEDI(메디컬 에스테틱 디바이스 전문기업)의 리서치 분석가입니다.
BRITZMEDI의 핵심 제품은 TORR RF(TOROIDAL 고주파 기반 EBD)입니다.

아래 ${batch.length}개 논문을 분석하여, 각 논문에 대해 JSON 배열로 응답하세요.

## 논문 목록
${batch.map(p => `[${p.index}] "${p.title}" — ${p.journal} (${p.pubDate})
초록: ${p.abstract || '(초록 없음)'}`).join('\n\n')}

## 각 논문에 대해 아래 필드를 포함:
- index: 논문 번호 (0부터)
- summaryKr: 한국어 핵심 요약 (2-3문장)
- productConnection: BRITZMEDI TORR RF와의 연결 포인트 (1문장)
- contentAngle: 콘텐츠화 시 추천 각도/앵글 (1문장)
- impactScore: 영향도 점수 (1-5, 5가 최고)
- recommendedChannels: 추천 채널 배열 (homepage, newsletter, naver-blog, linkedin, instagram, kakao 중 선택)
- headlineSuggestion: 한국어 헤드라인 제안 (1줄)

반드시 JSON 배열만 응답하세요. 다른 텍스트 없이.
[{"index":0, ...}, ...]`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.map(b => (b.type === 'text' ? b.text : '')).join('') || '';
  const usage = data.usage || null;
  tracker?.addCall('research-analyze', usage);

  // JSON 배열 추출
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('분석 결과를 해석할 수 없습니다');

  const analyses = JSON.parse(jsonMatch[0]);

  // 분석 결과를 원본 논문에 병합
  return papers.slice(0, 10).map((paper, i) => {
    const analysis = analyses.find(a => a.index === i) || {};
    return {
      ...paper,
      summaryKr: analysis.summaryKr || '',
      productConnection: analysis.productConnection || '',
      contentAngle: analysis.contentAngle || '',
      impactScore: analysis.impactScore || 3,
      recommendedChannels: analysis.recommendedChannels || ['naver-blog', 'linkedin'],
      headlineSuggestion: analysis.headlineSuggestion || '',
    };
  });
}
