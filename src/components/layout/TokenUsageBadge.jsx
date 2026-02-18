import { useState } from 'react';
import { formatCost, formatTokens, getDailyTotal } from '../../lib/tokenTracker';

function getStepLabel(step) {
  const labels = {
    'parse': '📝 AI 파싱',
    'generate': '✍️ 보도자료 생성',
    'review-pr': '🔍 보도자료 검수',
    'fix-pr': '🔧 보도자료 보정',
    'quote': '💬 인용문 제안',
    'kb-summarize': '📄 KB 문서 요약',
    'channel-homepage': '🌐 홈페이지 생성',
    'channel-linkedin': '🔗 LinkedIn 생성',
    'channel-newsletter': '📧 뉴스레터 생성',
    'channel-naver-blog': '📗 네이버블로그 생성',
    'channel-kakao': '💬 카카오톡 생성',
    'channel-instagram': '📸 인스타그램 생성',
    'review-homepage': '🔍 홈페이지 검수',
    'review-linkedin': '🔍 LinkedIn 검수',
    'review-newsletter': '🔍 뉴스레터 검수',
    'review-naver-blog': '🔍 블로그 검수',
    'review-kakao': '🔍 카카오톡 검수',
    'review-instagram': '🔍 인스타 검수',
    'fix-homepage': '🔧 홈페이지 보정',
    'fix-linkedin': '🔧 LinkedIn 보정',
    'fix-newsletter': '🔧 뉴스레터 보정',
    'fix-naver-blog': '🔧 블로그 보정',
    'fix-kakao': '🔧 카카오톡 보정',
    'fix-instagram': '🔧 인스타 보정',
  };
  return labels[step] || step;
}

export default function TokenUsageBadge({ summary }) {
  const [expanded, setExpanded] = useState(false);
  const daily = getDailyTotal();

  if (!summary || summary.callCount === 0) return null;

  return (
    <div className="bg-white border border-pale rounded-xl p-3 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between border-none bg-transparent cursor-pointer p-0"
      >
        <span className="text-steel">
          📊 API {summary.callCount}회 · {formatTokens(summary.inputTokens + summary.outputTokens)} tokens
        </span>
        <span className="font-bold text-accent">
          💰 {formatCost(summary.totalUSD, summary.totalKRW)}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-pale space-y-2">
          <div>
            <div className="font-semibold text-steel mb-1">이번 콘텐츠</div>
            <div className="grid grid-cols-2 gap-1 text-steel">
              <span>입력 토큰:</span>
              <span className="text-right">{summary.inputTokens.toLocaleString()}</span>
              <span>출력 토큰:</span>
              <span className="text-right">{summary.outputTokens.toLocaleString()}</span>
              <span>API 호출:</span>
              <span className="text-right">{summary.callCount}회</span>
              <span className="font-bold">비용:</span>
              <span className="text-right font-bold text-accent">
                {formatCost(summary.totalUSD, summary.totalKRW)}
              </span>
            </div>
          </div>

          <div>
            <div className="font-semibold text-steel mb-1">오늘 누적</div>
            <div className="grid grid-cols-2 gap-1 text-steel">
              <span>입력 토큰:</span>
              <span className="text-right">{daily.inputTokens.toLocaleString()}</span>
              <span>출력 토큰:</span>
              <span className="text-right">{daily.outputTokens.toLocaleString()}</span>
              <span>API 호출:</span>
              <span className="text-right">{daily.callCount}회</span>
              <span className="font-bold">누적 비용:</span>
              <span className="text-right font-bold">
                {formatCost(daily.totalUSD, daily.totalKRW)}
              </span>
            </div>
          </div>

          {summary.calls.length > 0 && (
            <div>
              <div className="font-semibold text-steel mb-1">호출 상세</div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {summary.calls.map((call, i) => {
                  const cost = (call.inputTokens / 1e6 * 3) + (call.outputTokens / 1e6 * 15);
                  return (
                    <div key={i} className="flex justify-between text-[10px] text-mist">
                      <span>{getStepLabel(call.step)}</span>
                      <span>
                        {call.inputTokens.toLocaleString()}+{call.outputTokens.toLocaleString()} = ${cost.toFixed(4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[10px] text-mist pt-2 border-t border-pale">
            Claude Sonnet 4.5 기준 · 입력 $3/1M · 출력 $15/1M · ₩1,450/$
          </div>
        </div>
      )}
    </div>
  );
}
