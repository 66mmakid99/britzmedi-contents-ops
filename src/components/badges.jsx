import { STATUS_COLORS, STATUS_EMOJI } from "../data/constants";

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_EMOJI[status]} {status}
    </span>
  );
}

export function TrackBadge({ track }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
        track === "A"
          ? "bg-indigo-100 text-indigo-700"
          : "bg-orange-100 text-orange-700"
      }`}
    >
      {track === "A" ? "🌏 A" : "🇰🇷 B"}
    </span>
  );
}
