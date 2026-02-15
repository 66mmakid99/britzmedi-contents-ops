import { useState } from 'react';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function Calendar({ contents, onOpenContent }) {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const contentsOnDay = (day) =>
    contents.filter((c) => c.date === dateStr(day));

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const today = new Date();
  const isToday = (day) =>
    day &&
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">캘린더</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="w-8 h-8 rounded-lg bg-white border border-pale flex items-center justify-center text-sm cursor-pointer hover:bg-snow"
          >
            ‹
          </button>
          <span className="text-sm font-semibold min-w-[120px] text-center">
            {year}년 {month + 1}월
          </span>
          <button
            onClick={next}
            className="w-8 h-8 rounded-lg bg-white border border-pale flex items-center justify-center text-sm cursor-pointer hover:bg-snow"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex gap-3 text-[11px]">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-track-a" /> Track A (해외)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-track-b" /> Track B (국내)
        </span>
      </div>

      <div className="bg-white rounded-xl border border-pale overflow-hidden">
        <div className="grid grid-cols-7">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[11px] text-steel font-medium py-2 border-b border-pale"
            >
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const items = day ? contentsOnDay(day) : [];
            return (
              <div
                key={i}
                className={`min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r border-pale ${
                  !day ? 'bg-snow/50' : ''
                } ${isToday(day) ? 'bg-accent/5' : ''}`}
              >
                {day && (
                  <>
                    <div
                      className={`text-[11px] mb-1 ${
                        isToday(day)
                          ? 'font-bold text-accent'
                          : 'text-steel'
                      }`}
                    >
                      {day}
                    </div>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-70 ${
                          item.track === 'A'
                            ? 'bg-track-a/10 text-track-a'
                            : 'bg-track-b/10 text-track-b'
                        }`}
                        title={item.title}
                        onClick={() => onOpenContent(item)}
                      >
                        {item.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
