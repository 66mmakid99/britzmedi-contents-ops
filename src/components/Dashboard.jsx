import { useMemo } from "react";
import { STATUSES, STATUS_EMOJI, D_DAY_DATE } from "../data/constants";
import { formatDate, getDaysUntil } from "../lib/utils";
import { StatusBadge, TrackBadge } from "./badges";

export default function Dashboard({ contents, setActiveTab }) {
  const stats = useMemo(() => {
    const byStatus = {};
    STATUSES.forEach((s) => (byStatus[s] = contents.filter((c) => c.status === s).length));
    const upcoming = contents
      .filter((c) => c.status !== "발행완료" && c.publishDate)
      .sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate))
      .slice(0, 5);
    return {
      byStatus,
      trackA: contents.filter((c) => c.track === "A").length,
      trackB: contents.filter((c) => c.track === "B").length,
      total: contents.length,
      upcoming,
    };
  }, [contents]);

  const dDay = getDaysUntil(D_DAY_DATE);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium">BRITZMEDI 콘텐츠 발행 D-Day</p>
            <p className="text-3xl font-bold mt-1">2월 23일 (일)</p>
            <p className="text-indigo-200 mt-1">Track A 블로그 + Track B 뉴스레터 동시 런칭</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black">
              {dDay > 0 ? `D-${dDay}` : dDay === 0 ? "D-DAY!" : `D+${Math.abs(dDay)}`}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "전체", val: stats.total, color: "text-gray-900" },
          { label: "🌏 Track A", val: stats.trackA, color: "text-indigo-600" },
          { label: "🇰🇷 Track B", val: stats.trackB, color: "text-orange-600" },
          { label: "🚀 발행완료", val: stats.byStatus["발행완료"], color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.val}건</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4">📊 파이프라인</h3>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <div key={s} className="flex-1 text-center">
              <div className="text-2xl font-bold">{stats.byStatus[s]}</div>
              <div className="text-xs text-gray-500 mt-1">
                {STATUS_EMOJI[s]} {s}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">📅 다가오는 콘텐츠</h3>
          <button onClick={() => setActiveTab("calendar")} className="text-indigo-600 text-sm hover:underline">
            전체 보기 →
          </button>
        </div>
        <div className="space-y-3">
          {stats.upcoming.map((c) => {
            const days = getDaysUntil(c.publishDate);
            return (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className={`w-1 h-10 rounded-full ${c.track === "A" ? "bg-indigo-500" : "bg-orange-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TrackBadge track={c.track} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-700">{formatDate(c.publishDate)}</p>
                  <p className={`text-xs ${days <= 3 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                    {days > 0 ? `${days}일 후` : "오늘!"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
