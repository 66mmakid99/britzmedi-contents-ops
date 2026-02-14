import { CHANNELS, PIPELINE_STAGES } from '../../constants';

export default function Publish({ contents, setContents, onOpenContent }) {
  const toggleChannel = (contentId, channelId) => {
    setContents(
      contents.map((c) =>
        c.id === contentId
          ? { ...c, channels: { ...c.channels, [channelId]: !c.channels[channelId] } }
          : c
      )
    );
  };

  const sorted = [...contents].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">발행 관리</h2>

      <div className="bg-white rounded-xl border border-pale overflow-x-auto">
        <table className="w-full text-[12px] md:text-[13px]">
          <thead>
            <tr className="border-b border-pale">
              <th className="text-left p-3 font-semibold text-steel whitespace-nowrap">
                날짜
              </th>
              <th className="text-left p-3 font-semibold text-steel">제목</th>
              <th className="text-center p-3 font-semibold text-steel whitespace-nowrap">
                트랙
              </th>
              <th className="text-center p-3 font-semibold text-steel whitespace-nowrap">
                상태
              </th>
              {CHANNELS.map((ch) => (
                <th
                  key={ch.id}
                  className="text-center p-3 font-semibold text-steel whitespace-nowrap"
                >
                  <div className="text-[10px]">{ch.label}</div>
                  <div
                    className={`text-[8px] ${
                      ch.track === 'A' ? 'text-track-a' : 'text-track-b'
                    }`}
                  >
                    {ch.track}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const stage = PIPELINE_STAGES.find((s) => s.id === item.stage);
              return (
                <tr
                  key={item.id}
                  className="border-b border-pale hover:bg-snow/50"
                >
                  <td className="p-3 whitespace-nowrap text-steel">
                    {item.date}
                  </td>
                  <td className="p-3">
                    <div
                      className="font-medium truncate max-w-[300px] cursor-pointer hover:text-accent"
                      onClick={() => onOpenContent(item)}
                    >
                      {item.title}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.track === 'A'
                          ? 'bg-track-a/10 text-track-a'
                          : 'bg-track-b/10 text-track-b'
                      }`}
                    >
                      {item.track}
                    </span>
                  </td>
                  <td className="p-3 text-center text-sm" title={stage?.label}>
                    {stage?.emoji}
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.id} className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!item.channels[ch.id]}
                        onChange={() => toggleChannel(item.id, ch.id)}
                        className="w-4 h-4 accent-accent cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center text-mist text-sm py-12">
            콘텐츠가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
