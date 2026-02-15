/**
 * ContentCalendar: 월별 콘텐츠 캘린더
 * Phase C enhanced version
 */

import { useState, useMemo } from 'react';

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, events: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.scheduled_date === dateStr);
      days.push({ day: d, date: dateStr, events: dayEvents });
    }

    return days;
  }, [year, month, events]);

  const navigateMonth = (delta) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">&larr;</button>
        <h2 className="text-lg font-bold">{year}년 {month + 1}월</h2>
        <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">&rarr;</button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">{day}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, index) => (
          <div
            key={index}
            className={`
              min-h-[80px] rounded-lg p-1 text-sm cursor-pointer transition
              ${!cell.day ? 'bg-transparent' : 'hover:bg-blue-50'}
              ${cell.date === todayStr ? 'bg-blue-50 ring-2 ring-blue-500' : ''}
              ${cell.date === selectedDate ? 'bg-blue-100' : ''}
            `}
            onClick={() => cell.day && setSelectedDate(cell.date)}
          >
            {cell.day && (
              <>
                <span className={`text-xs ${cell.date === todayStr ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                  {cell.day}
                </span>
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {cell.events.slice(0, 3).map((evt, i) => (
                    <span
                      key={i}
                      className="block w-full text-xs truncate px-1 rounded bg-blue-100 text-blue-700"
                      title={evt.title}
                    >
                      {evt.content_type === 'press_release' ? '📰' : '📢'} {evt.title?.substring(0, 8)}
                    </span>
                  ))}
                  {cell.events.length > 3 && (
                    <span className="text-xs text-gray-400">+{cell.events.length - 3}</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 선택된 날짜의 이벤트 상세 */}
      {selectedDate && (
        <div className="mt-4 border-t pt-4">
          <h3 className="font-bold text-sm mb-2">{selectedDate}</h3>
          {events.filter(e => e.scheduled_date === selectedDate).length === 0 ? (
            <p className="text-sm text-gray-400">예정된 콘텐츠가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {events.filter(e => e.scheduled_date === selectedDate).map(evt => (
                <div key={evt.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span>{evt.content_type === 'press_release' ? '📰' : '📢'}</span>
                  <div>
                    <p className="text-sm font-medium">{evt.title}</p>
                    <p className="text-xs text-gray-500">{evt.stage} · {evt.channel || '보도자료'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
