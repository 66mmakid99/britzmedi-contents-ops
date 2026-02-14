import { STATUSES, STATUS_EMOJI, PILLARS } from "../data/constants";
import { formatDate } from "../lib/utils";
import { TrackBadge } from "./badges";

export default function Pipeline({ contents, setContents }) {
  const moveStatus = (id, s) =>
    setContents((prev) => prev.map((c) => (c.id === id ? { ...c, status: s } : c)));

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map((status) => {
        const items = contents.filter((c) => c.status === status);
        return (
          <div key={status} className="flex-shrink-0 w-64 bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-gray-700">
                {STATUS_EMOJI[status]} {status}
              </h4>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((c) => (
                <div key={c.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <TrackBadge track={c.track} />
                  <p className="text-sm font-medium text-gray-900 mt-2 line-clamp-2">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {PILLARS[c.pillar]} · {formatDate(c.publishDate)}
                  </p>
                  <div className="flex gap-1 mt-2">
                    {STATUSES.map((s, idx) => {
                      const ci = STATUSES.indexOf(status);
                      if (idx !== ci + 1 && idx !== ci - 1) return null;
                      return (
                        <button
                          key={s}
                          onClick={() => moveStatus(c.id, s)}
                          className={`text-[10px] px-2 py-1 rounded ${
                            idx === ci + 1 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {idx === ci + 1 ? `→ ${s}` : `← ${s}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">비어있음</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
