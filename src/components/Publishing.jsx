import { useState } from "react";
import { CHANNELS } from "../data/constants";
import { formatDate } from "../lib/utils";
import { StatusBadge, TrackBadge } from "./badges";

export default function Publishing({ contents, setContents }) {
  const [filter, setFilter] = useState("all");

  const toggleChannel = (id, ch) =>
    setContents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, channels: { ...c.channels, [ch]: !c.channels[ch] } } : c))
    );

  const filtered = filter === "all" ? contents : contents.filter((c) => c.track === filter);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <h3 className="font-bold text-gray-900">📢 발행 관리</h3>
        <div className="ml-auto flex gap-1">
          {[
            ["all", "전체"],
            ["A", "Track A"],
            ["B", "Track B"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                filter === v ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-500">콘텐츠</th>
              <th className="text-center px-2 py-3 text-xs text-gray-500">상태</th>
              <th className="text-center px-2 py-3 text-xs text-gray-500">발행일</th>
              {CHANNELS.filter((ch) => filter === "all" || ch.track === filter).map((ch) => (
                <th key={ch.key} className="text-center px-2 py-3 text-xs text-gray-500">
                  {ch.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered
              .sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate))
              .map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TrackBadge track={c.track} />
                      <span className="text-sm truncate max-w-xs">{c.title}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="text-center px-2 py-3 text-xs text-gray-500">{formatDate(c.publishDate)}</td>
                  {CHANNELS.filter((ch) => filter === "all" || ch.track === filter).map((ch) => (
                    <td key={ch.key} className="text-center px-2 py-3">
                      <button
                        onClick={() => toggleChannel(c.id, ch.key)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
                          c.channels[ch.key]
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 text-transparent"
                        }`}
                      >
                        ✓
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
