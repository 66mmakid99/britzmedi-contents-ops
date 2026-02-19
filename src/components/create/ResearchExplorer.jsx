/**
 * 논문 탐색 UI 컴포넌트
 * PubMed 자동 검색 + Claude AI 분석 → 원클릭 콘텐츠 생성
 */
import { useState } from 'react';
import { RESEARCH_QUERIES, autoSearchPapers, searchPubMed, fetchPaperDetails, fetchAbstract } from '../../lib/pubmedSearch';
import { analyzePapers } from '../../lib/researchAnalyzer';
import { getAutoCheckedChannels } from '../../constants/contentTypes';

const IMPACT_BADGES = {
  5: { label: '매우 높음', color: 'bg-red-100 text-red-700' },
  4: { label: '높음', color: 'bg-orange-100 text-orange-700' },
  3: { label: '보통', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: '낮음', color: 'bg-gray-100 text-gray-500' },
  1: { label: '매우 낮음', color: 'bg-gray-50 text-gray-400' },
};

const CHANNEL_LABELS = {
  homepage: '홈페이지',
  newsletter: '뉴스레터',
  'naver-blog': '네이버블로그',
  linkedin: '링크드인',
  instagram: '인스타그램',
  kakao: '카카오톡',
};

export default function ResearchExplorer({ onBack, onSubmit, apiKey, tracker, onTokenUpdate }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [manualInput, setManualInput] = useState('');

  const handleSearch = async (categoryId = null) => {
    if (!apiKey) {
      setError('Claude API Key를 먼저 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setPapers([]);
    setSelectedCategory(categoryId);

    try {
      // Stage 1: PubMed 검색
      setLoadingStage('PubMed에서 최신 논문 검색 중...');
      const categories = categoryId ? [categoryId] : null;
      const rawPapers = await autoSearchPapers(categories);

      if (!rawPapers.length) {
        setError('검색 결과가 없습니다. 다른 카테고리를 시도해보세요.');
        setLoading(false);
        return;
      }

      // Stage 2: AI 분석
      setLoadingStage(`${rawPapers.length}개 논문 AI 분석 중...`);
      const analyzed = await analyzePapers(rawPapers, apiKey, tracker);
      onTokenUpdate?.();

      // 영향도 순 정렬
      analyzed.sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
      setPapers(analyzed);
    } catch (e) {
      setError(`검색 실패: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleSelectPaper = (paper) => {
    const autoChannels = paper.recommendedChannels?.length
      ? paper.recommendedChannels
      : getAutoCheckedChannels('research');

    onSubmit({
      type: 'research',
      title: paper.headlineSuggestion || paper.title,
      body: paper.summaryKr || paper.abstract || '',
      metadata: {
        paperTitle: paper.title,
        journal: paper.journal,
        pubDate: paper.pubDate,
        doi: paper.doi,
        url: paper.doi ? `https://doi.org/${paper.doi}` : '',
        abstract: paper.abstract || '',
        summaryKr: paper.summaryKr || '',
        contentAngle: paper.contentAngle || '',
        productConnection: paper.productConnection || '',
        relatedProducts: 'TORR RF',
        source: paper.journal,
        keyFindings: paper.summaryKr || '',
      },
      channels: autoChannels,
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;
    if (!apiKey) {
      setError('Claude API Key를 먼저 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setLoadingStage('논문 정보 조회 중...');

    try {
      // DOI 또는 PMID 추출
      let pmid = null;
      const doiMatch = manualInput.match(/10\.\d{4,}\/[^\s]+/);
      const pmidMatch = manualInput.match(/\/(\d{7,8})\/?/) || manualInput.match(/^(\d{7,8})$/);

      if (pmidMatch) {
        pmid = pmidMatch[1];
      } else if (doiMatch) {
        // DOI로 PubMed 검색
        const ids = await searchPubMed(`${doiMatch[0]}[doi]`, 1);
        if (ids.length) pmid = ids[0];
      }

      if (!pmid) {
        // 일반 텍스트로 검색
        const ids = await searchPubMed(manualInput.trim(), 5);
        if (!ids.length) {
          setError('논문을 찾을 수 없습니다. DOI나 PubMed ID를 확인해주세요.');
          setLoading(false);
          return;
        }

        const details = await fetchPaperDetails(ids);
        for (const p of details) {
          p.abstract = await fetchAbstract(p.pmid);
          await new Promise(r => setTimeout(r, 200));
        }

        setLoadingStage('AI 분석 중...');
        const analyzed = await analyzePapers(details, apiKey, tracker);
        onTokenUpdate?.();
        setPapers(analyzed);
        setLoading(false);
        return;
      }

      const details = await fetchPaperDetails([pmid]);
      if (!details.length) {
        setError('논문 정보를 가져올 수 없습니다.');
        setLoading(false);
        return;
      }

      details[0].abstract = await fetchAbstract(pmid);

      setLoadingStage('AI 분석 중...');
      const analyzed = await analyzePapers(details, apiKey, tracker);
      onTokenUpdate?.();
      setPapers(analyzed);
    } catch (e) {
      setError(`조회 실패: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-steel text-sm border-none bg-transparent cursor-pointer hover:text-dark">
          ← 성격 다시 선택
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl">📑</span>
        <h2 className="text-lg font-bold">논문/연구 탐색</h2>
      </div>
      <p className="text-[12px] text-mist">AI가 최신 논문을 자동으로 찾아 콘텐츠를 추천합니다</p>

      {/* 카테고리 필터 */}
      <div className="bg-white rounded-xl p-4 border border-pale space-y-3">
        <div className="text-[13px] font-medium text-dark">카테고리 선택</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSearch(null)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full text-[12px] border cursor-pointer transition-colors ${
              selectedCategory === null && papers.length > 0
                ? 'bg-dark text-white border-dark'
                : 'bg-white text-steel border-pale hover:bg-snow'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            전체
          </button>
          {RESEARCH_QUERIES.map(q => (
            <button
              key={q.id}
              onClick={() => handleSearch(q.id)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-full text-[12px] border cursor-pointer transition-colors ${
                selectedCategory === q.id
                  ? 'bg-dark text-white border-dark'
                  : 'bg-white text-steel border-pale hover:bg-snow'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="bg-white rounded-xl p-8 border border-pale text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
          <div className="text-[13px] text-steel">{loadingStage}</div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 text-red-700 text-[13px] p-3 rounded-lg">{error}</div>
      )}

      {/* 논문 카드 목록 */}
      {!loading && papers.length > 0 && (
        <div className="space-y-3">
          <div className="text-[13px] text-steel">{papers.length}개 논문 발견</div>
          {papers.map((paper, idx) => {
            const badge = IMPACT_BADGES[paper.impactScore] || IMPACT_BADGES[3];
            return (
              <div key={paper.pmid || idx} className="bg-white rounded-xl p-4 border border-pale space-y-2.5 hover:border-accent/50 transition-colors">
                {/* 제목 + 영향도 */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-dark leading-snug flex-1">
                    {paper.title}
                  </h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                {/* 저널 + 발행일 */}
                <div className="text-[11px] text-mist">
                  {paper.journal} · {paper.pubDate}
                  {paper.doi && (
                    <> · <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">DOI</a></>
                  )}
                </div>

                {/* AI 요약 */}
                {paper.summaryKr && (
                  <p className="text-[12px] text-steel leading-relaxed bg-snow p-2.5 rounded-lg">
                    {paper.summaryKr}
                  </p>
                )}

                {/* 제품 연결 + 콘텐츠 앵글 */}
                {paper.productConnection && (
                  <div className="text-[11px] text-mist">
                    <span className="font-medium">TORR RF 연결:</span> {paper.productConnection}
                  </div>
                )}
                {paper.contentAngle && (
                  <div className="text-[11px] text-mist">
                    <span className="font-medium">콘텐츠 앵글:</span> {paper.contentAngle}
                  </div>
                )}

                {/* 추천 채널 */}
                {paper.recommendedChannels?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {paper.recommendedChannels.map(ch => (
                      <span key={ch} className="px-1.5 py-0.5 bg-snow text-[10px] text-steel rounded">
                        {CHANNEL_LABELS[ch] || ch}
                      </span>
                    ))}
                  </div>
                )}

                {/* 선택 버튼 */}
                <button
                  onClick={() => handleSelectPaper(paper)}
                  className="w-full mt-1 py-2 bg-accent text-white text-[12px] font-medium rounded-lg border-none cursor-pointer hover:bg-accent/90 transition-colors"
                >
                  이 논문으로 콘텐츠 만들기
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 수동 입력 폴백 */}
      <div className="bg-white rounded-xl p-4 border border-pale space-y-3">
        <div className="text-[13px] font-medium text-dark">직접 입력</div>
        <p className="text-[11px] text-mist">PubMed URL, DOI, 또는 검색어를 직접 입력할 수 있습니다</p>
        <div className="flex gap-2">
          <input
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="예: 10.1111/jocd.12345 또는 논문 제목"
            className="flex-1 px-3 py-2 border border-pale rounded-lg text-[13px] outline-none focus:border-accent bg-snow"
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
          />
          <button
            onClick={handleManualSubmit}
            disabled={loading || !manualInput.trim()}
            className="px-4 py-2 bg-dark text-white text-[12px] rounded-lg border-none cursor-pointer hover:bg-dark/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            검색
          </button>
        </div>
      </div>
    </div>
  );
}
