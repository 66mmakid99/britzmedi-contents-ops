import { PIPELINE_STAGES, CHANNELS } from '../../constants';

export default function Dashboard({ contents, onOpenContent, setActivePage }) {
  const stageCount = (stageId) => contents.filter((c) => c.stage === stageId).length;
  const trackCount = (track) => contents.filter((c) => c.track === track).length;
  const upcoming = [...contents]
    .filter((c) => c.stage !== 'published')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">대시보드</h2>

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
            <div
              key={stage.id}
              className="flex-1 min-w-[100px] bg-snow rounded-lg p-3 text-center"
            >
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
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  item.track === 'A'
                    ? 'bg-track-a/10 text-track-a'
                    : 'bg-track-b/10 text-track-b'
                }`}
              >
                {item.track}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">
                  {item.title}
                </div>
                <div className="text-[11px] text-mist">{item.pillar}</div>
              </div>
              <div className="text-[11px] text-steel whitespace-nowrap">
                {item.date}
              </div>
              <div className="text-sm">
                {PIPELINE_STAGES.find((s) => s.id === item.stage)?.emoji}
              </div>
            </div>
          ))}
          {upcoming.length === 0 && (
            <div className="text-center text-mist text-sm py-8">
              예정된 콘텐츠가 없습니다
            </div>
          )}
        </div>
      </div>
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
