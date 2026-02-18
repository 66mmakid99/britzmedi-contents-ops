import { useState, useEffect } from 'react';
import { PIPELINE_STAGES } from '../../constants';
import { supabase } from '../../lib/supabase';

const CHANNEL_LABELS = {
  email: '이메일 뉴스레터',
  naver_blog: '네이버 블로그',
  linkedin: '링크드인',
  kakao: '카카오톡',
  instagram: '인스타그램',
};

const EDIT_TYPE_BADGES = {
  auto_review: { label: '자동 검수', color: 'bg-info/15 text-info' },
  auto_channel_review: { label: '채널 검수', color: 'bg-info/15 text-info' },
  manual_regenerate: { label: '수정 포인트', color: 'bg-warn/15 text-warn' },
  tone_change: { label: '톤 변경', color: 'bg-accent-light text-accent-dim' },
  fact_correction: { label: '팩트 수정', color: 'bg-danger/15 text-danger' },
  term_replacement: { label: '용어 교체', color: 'bg-accent-light text-accent-dim' },
  other: { label: '기타', color: 'bg-pale text-steel' },
};

export default function Dashboard({ contents, onOpenContent, setActivePage }) {
  const [tab, setTab] = useState('intelligence');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (tab === 'intelligence') loadDashboard();
  }, [tab]);

  async function loadDashboard() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const [channelData, pressData, editData, recentEdits, assetCounts] = await Promise.all([
        loadChannelStats(),
        loadPressStats(),
        loadEditPatterns(),
        loadRecentEdits(),
        loadAssetCounts(),
      ]);
      setData({ channelData, pressData, editData, recentEdits, assetCounts });
    } catch (err) {
      console.error('[Dashboard] 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">대시보드</h2>
        <div className="flex bg-pale rounded-lg p-0.5">
          <button
            onClick={() => setTab('intelligence')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === 'intelligence' ? 'bg-white text-dark font-semibold shadow-sm' : 'text-steel hover:text-slate'
            }`}
          >
            Intelligence
          </button>
          <button
            onClick={() => setTab('overview')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === 'overview' ? 'bg-white text-dark font-semibold shadow-sm' : 'text-steel hover:text-slate'
            }`}
          >
            콘텐츠 현황
          </button>
        </div>
      </div>

      {tab === 'overview' && (
        <OverviewTab contents={contents} onOpenContent={onOpenContent} />
      )}

      {tab === 'intelligence' && (
        <>
          {!supabase ? (
            <EmptyCard message="Supabase가 연결되지 않았습니다." />
          ) : loading ? (
            <div className="flex items-center justify-center py-16 text-steel text-sm">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mr-3" />
              대시보드 데이터 로딩 중...
            </div>
          ) : data ? (
            <IntelligenceTab data={data} />
          ) : (
            <EmptyCard message="데이터를 불러올 수 없습니다." />
          )}
        </>
      )}
    </div>
  );
}

// =====================================================
// Intelligence Tab
// =====================================================

function IntelligenceTab({ data }) {
  const { channelData, pressData, editData, recentEdits, assetCounts } = data;

  return (
    <div className="space-y-4">
      <p className="text-xs text-steel -mt-2">AI 학습 데이터가 쌓일수록 콘텐츠 품질이 올라갑니다.</p>

      {/* 카드 4: 학습 자산 현황 */}
      <AssetOverview counts={assetCounts} />

      {/* 2열 그리드 — 수정률 + 검수 결과 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChannelEditRatio stats={channelData} />
        <ReviewSummary stats={pressData} />
      </div>

      {/* 2열 그리드 — 빈출 패턴 + 최근 이력 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopEditPatterns patterns={editData} />
        <RecentEditHistory edits={recentEdits} />
      </div>
    </div>
  );
}

// =====================================================
// 카드 4: 학습 자산 현황
// =====================================================

function AssetOverview({ counts }) {
  const items = [
    { label: '보이스 규칙', value: counts.rules, icon: '📋' },
    { label: '팩트 DB', value: counts.facts, icon: '📊' },
    { label: '수정 이력', value: counts.edits, icon: '📝' },
    { label: '콘텐츠 블록', value: counts.blocks, icon: '🧩' },
    { label: '보도자료', value: counts.prs, icon: '📰' },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map(item => (
        <div key={item.label} className="bg-white rounded-xl border border-pale p-3 text-center">
          <div className="text-lg mb-0.5">{item.icon}</div>
          <div className="text-xl font-bold text-dark">{item.value}</div>
          <div className="text-[10px] text-steel mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// 카드 1: 채널별 평균 수정률
// =====================================================

function ChannelEditRatio({ stats }) {
  return (
    <Card title="채널별 평균 수정률">
      {Object.keys(stats).length === 0 ? (
        <EmptyMessage text="아직 채널 콘텐츠 데이터가 없습니다. 콘텐츠를 생성하면 자동으로 수집됩니다." />
      ) : (
        <div className="space-y-3">
          {Object.entries(stats).map(([ch, { avg, count }]) => {
            const pct = Math.round(avg * 100);
            const barColor = pct <= 15 ? 'bg-success' : pct <= 30 ? 'bg-warn' : 'bg-danger';
            return (
              <div key={ch}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate">{CHANNEL_LABELS[ch] || ch}</span>
                  <span className="text-xs text-steel">{pct}%</span>
                </div>
                <div className="w-full h-2 bg-pale rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="text-[10px] text-mist mt-0.5">{count}건 기준</div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// =====================================================
// 카드 2: 보도자료 검수 결과 요약
// =====================================================

function ReviewSummary({ stats }) {
  const { avgScore, scores, avgRed, avgYellow, passRate, total } = stats;

  if (total === 0) {
    return (
      <Card title="보도자료 검수 결과">
        <EmptyMessage text="아직 검수 데이터가 없습니다." />
      </Card>
    );
  }

  return (
    <Card title="보도자료 검수 결과">
      <div className="flex items-start gap-5">
        {/* 평균 점수 */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${avgScore >= 90 ? 'text-success' : avgScore >= 70 ? 'text-warn' : 'text-danger'}`}>
            {avgScore}
          </div>
          <div className="text-[10px] text-steel">평균 품질</div>
        </div>

        {/* 추이 그래프 */}
        <div className="flex-1">
          <div className="flex items-end gap-1.5" style={{ height: '52px' }}>
            {scores.map((score, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end">
                <span className="text-[9px] text-steel mb-0.5">{score}</span>
                <div
                  className={`w-full rounded-t ${score >= 90 ? 'bg-success' : score >= 70 ? 'bg-warn' : 'bg-danger'}`}
                  style={{ height: `${Math.max(score * 0.45, 4)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="text-[9px] text-mist text-center mt-1">최근 {scores.length}건</div>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-pale">
        <div className="text-center">
          <div className="text-sm font-semibold text-danger">{avgRed}</div>
          <div className="text-[10px] text-steel">평균 치명적</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-warn">{avgYellow}</div>
          <div className="text-[10px] text-steel">평균 주의</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-success">{passRate}%</div>
          <div className="text-[10px] text-steel">검수 통과</div>
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// 카드 3: 빈출 수정 패턴 TOP 5
// =====================================================

function TopEditPatterns({ patterns }) {
  return (
    <Card title="빈출 수정 패턴 TOP 5">
      {patterns.length === 0 ? (
        <EmptyMessage text="아직 수정 패턴 데이터가 없습니다." />
      ) : (
        <div className="space-y-2">
          {patterns.map(([reason, count], i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                count >= 3 ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn'
              }`}>
                {count}회
              </span>
              <span className="text-slate leading-relaxed">{reason}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// =====================================================
// 카드 5: 최근 수정 이력 타임라인
// =====================================================

function RecentEditHistory({ edits }) {
  return (
    <Card title="최근 수정 이력">
      {edits.length === 0 ? (
        <EmptyMessage text="아직 수정 이력이 없습니다." />
      ) : (
        <div className="space-y-3">
          {edits.map((edit, i) => {
            const badge = EDIT_TYPE_BADGES[edit.edit_type] || EDIT_TYPE_BADGES.other;
            const channelName = edit.channel ? (CHANNEL_LABELS[edit.channel] || edit.channel) : '보도자료';
            const reason = edit.edit_reason
              ? (edit.edit_reason.length > 50 ? edit.edit_reason.slice(0, 50) + '...' : edit.edit_reason)
              : '';
            const dateStr = edit.created_at
              ? new Date(edit.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-mist">{dateStr}</span>
                    <span className="text-[10px] font-medium text-slate">{channelName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                  </div>
                  {reason && (
                    <div className="text-[11px] text-steel mt-0.5 truncate">{reason}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// =====================================================
// Overview Tab (기존 대시보드)
// =====================================================

function OverviewTab({ contents, onOpenContent }) {
  const stageCount = (stageId) => contents.filter((c) => c.stage === stageId).length;
  const trackCount = (track) => contents.filter((c) => c.track === track).length;
  const upcoming = [...contents]
    .filter((c) => c.stage !== 'published')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="전체 콘텐츠" value={contents.length} />
        <SummaryCard label="Track A (해외)" value={trackCount('A')} color="text-track-a" />
        <SummaryCard label="Track B (국내)" value={trackCount('B')} color="text-track-b" />
        <SummaryCard label="발행 완료" value={stageCount('published')} color="text-success" />
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white rounded-xl p-5 border border-pale">
        <h3 className="text-sm font-semibold mb-4">파이프라인 현황</h3>
        <div className="flex gap-2 overflow-x-auto">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="flex-1 min-w-[100px] bg-snow rounded-lg p-3 text-center">
              <div className="text-xl mb-1">{stage.emoji}</div>
              <div className="text-[11px] text-steel">{stage.label}</div>
              <div className="text-lg font-bold mt-1">{stageCount(stage.id)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Content */}
      <div className="bg-white rounded-xl p-5 border border-pale">
        <h3 className="text-sm font-semibold mb-4">다가오는 콘텐츠</h3>
        <div className="space-y-2">
          {upcoming.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-snow cursor-pointer hover:bg-pale/50 transition-colors"
              onClick={() => onOpenContent(item)}
            >
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                item.track === 'A' ? 'bg-track-a/10 text-track-a' : 'bg-track-b/10 text-track-b'
              }`}>
                {item.track}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{item.title}</div>
                <div className="text-[11px] text-mist">{item.pillar}</div>
              </div>
              <div className="text-[11px] text-steel whitespace-nowrap">{item.date}</div>
              <div className="text-sm">{PIPELINE_STAGES.find((s) => s.id === item.stage)?.emoji}</div>
            </div>
          ))}
          {upcoming.length === 0 && (
            <div className="text-center text-mist text-sm py-8">예정된 콘텐츠가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Shared UI
// =====================================================

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-pale p-5">
      <h3 className="text-sm font-semibold text-dark mb-4">{title}</h3>
      {children}
    </div>
  );
}

function SummaryCard({ label, value, color = '' }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-pale">
      <div className="text-[11px] text-steel mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function EmptyCard({ message }) {
  return (
    <div className="text-center py-16 text-steel text-sm bg-white rounded-xl border border-pale">{message}</div>
  );
}

function EmptyMessage({ text }) {
  return <div className="text-xs text-mist py-4 text-center">{text}</div>;
}

// =====================================================
// Data loaders
// =====================================================

async function loadChannelStats() {
  const { data, error } = await supabase
    .from('channel_contents')
    .select('channel, edit_ratio')
    .not('edit_ratio', 'is', null);
  if (error || !data?.length) return {};

  const grouped = {};
  data.forEach(row => {
    if (!grouped[row.channel]) grouped[row.channel] = { total: 0, count: 0 };
    grouped[row.channel].total += parseFloat(row.edit_ratio || 0);
    grouped[row.channel].count += 1;
  });

  const result = {};
  for (const [ch, { total, count }] of Object.entries(grouped)) {
    result[ch] = { avg: count > 0 ? total / count : 0, count };
  }
  return result;
}

async function loadPressStats() {
  const { data, error } = await supabase
    .from('press_releases')
    .select('quality_score, review_red, review_yellow, created_at')
    .not('quality_score', 'is', null)
    .order('created_at', { ascending: true });

  if (error || !data?.length) return { avgScore: 0, scores: [], avgRed: 0, avgYellow: 0, passRate: 0, total: 0 };

  const total = data.length;
  const scores = data.slice(-8).map(d => d.quality_score);
  const avgScore = Math.round(data.reduce((s, d) => s + d.quality_score, 0) / total);
  const avgRed = (data.reduce((s, d) => s + (d.review_red || 0), 0) / total).toFixed(1);
  const avgYellow = (data.reduce((s, d) => s + (d.review_yellow || 0), 0) / total).toFixed(1);
  const passed = data.filter(d => (d.review_red || 0) === 0).length;
  const passRate = Math.round((passed / total) * 100);

  return { avgScore, scores, avgRed, avgYellow, passRate, total };
}

async function loadEditPatterns() {
  const { data, error } = await supabase
    .from('edit_history')
    .select('edit_type, edit_pattern, edit_reason, channel')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data?.length) return [];

  const counts = {};
  data.forEach(row => {
    if (row.edit_reason) {
      row.edit_reason.split(' | ').forEach(reason => {
        const key = reason.trim();
        if (key) counts[key] = (counts[key] || 0) + 1;
      });
    }
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

async function loadRecentEdits() {
  const { data, error } = await supabase
    .from('edit_history')
    .select('edit_type, channel, edit_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return [];
  return data || [];
}

async function loadAssetCounts() {
  const [rules, facts, edits, blocks, prs] = await Promise.all([
    supabase.from('brand_voice_rules').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('fact_database').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('edit_history').select('id', { count: 'exact', head: true }),
    supabase.from('content_blocks').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('press_releases').select('id', { count: 'exact', head: true }),
  ]);

  return {
    rules: rules.count || 0,
    facts: facts.count || 0,
    edits: edits.count || 0,
    blocks: blocks.count || 0,
    prs: prs.count || 0,
  };
}
