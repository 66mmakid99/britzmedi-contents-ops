import { PIPELINE_STAGES } from '../../constants';

export default function Pipeline({ contents, setContents, onOpenContent, onCreateFromPR }) {
  const handleDrop = (contentId, newStage) => {
    setContents(
      contents.map((c) =>
        c.id === contentId ? { ...c, stage: newStage } : c
      )
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">파이프라인</h2>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const items = contents.filter((c) => c.stage === stage.id);
          return (
            <div
              key={stage.id}
              className="min-w-[220px] flex-1 bg-snow rounded-xl p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = Number(e.dataTransfer.getData('contentId'));
                if (id) handleDrop(id, stage.id);
              }}
            >
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-pale">
                <span className="text-base">{stage.emoji}</span>
                <span className="text-[13px] font-semibold">{stage.label}</span>
                <span className="ml-auto text-[11px] text-mist bg-white rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {items.map((item) => {
                  const isPRPublished = item.stage === 'published' && (item.pillar === 'PR' || item.channels?.pressrelease);
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('contentId', String(item.id))}
                      className="bg-white rounded-lg p-3 border border-pale cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          item.track === 'A' ? 'bg-track-a/10 text-track-a' : 'bg-track-b/10 text-track-b'
                        }`}>{item.track}</span>
                        <span className="text-[10px] text-mist">{item.pillar}</span>
                      </div>
                      <div
                        className="text-[12px] font-medium leading-snug cursor-pointer hover:text-accent"
                        onClick={() => onOpenContent(item)}
                      >
                        {item.title}
                      </div>
                      <div className="text-[10px] text-steel mt-1.5">{item.date}</div>
                      {isPRPublished && onCreateFromPR && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onCreateFromPR(item); }}
                          className="mt-2 w-full py-1.5 rounded-md text-[11px] font-semibold text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10 transition-colors"
                        >
                          채널 콘텐츠 만들기
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
