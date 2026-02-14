import { useState, useMemo } from "react";
import { D_DAY_DATE } from "../data/constants";

export default function Calendar({ contents }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 1));

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        day: d,
        date: dateStr,
        contents: contents.filter((c) => c.publishDate === dateStr),
      });
    }
    return days;
  }, [currentMonth, contents]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          ◀
        </button>
        <h3 className="font-bold text-lg">
          {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
        </h3>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          ▶
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
            {d}
          </div>
        ))}
        {calendarData.map((cell, i) => (
          <div
            key={i}
            className={`min-h-[80px] p-1 rounded-lg border ${cell ? "border-gray-100" : "border-transparent"} ${
              cell?.date === D_DAY_DATE ? "bg-red-50 border-red-300 ring-2 ring-red-200" : ""
            }`}
          >
            {cell && (
              <>
                <div
                  className={`text-xs font-medium mb-1 ${
                    cell.date === D_DAY_DATE ? "text-red-600 font-bold" : "text-gray-500"
                  }`}
                >
                  {cell.day}
                  {cell.date === D_DAY_DATE && <span className="ml-1 text-[10px]">D-DAY</span>}
                </div>
                {cell.contents.map((c) => (
                  <div
                    key={c.id}
                    className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${
                      c.track === "A" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {c.title.slice(0, 15)}…
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
