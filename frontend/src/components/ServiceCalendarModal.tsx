import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface ServiceCalendarModalProps {
  services: any[];
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

export const ServiceCalendarModal: React.FC<ServiceCalendarModalProps> = ({
  services,
  onSelectDate,
  onClose,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate calendar days
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Convert Sunday=0 to Monday=0 indexing (Mon=0, Tue=1 ... Sun=6)
  const startOffset = (firstDayOfMonth + 6) % 7;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group services count by date string YYYY-MM-DD
  const countsByDate: Record<string, number> = {};
  services.forEach((s) => {
    if (s.serviceDueDate) {
      const dStr = new Date(s.serviceDueDate).toISOString().split('T')[0];
      countsByDate[dStr] = (countsByDate[dStr] || 0) + 1;
    }
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">Service Scheduling Calendar</h2>
              <p className="text-xs text-slate-400 font-medium">Click any date to view scheduled service jobs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center px-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 bg-white hover:bg-slate-200 border rounded-xl font-bold text-xs flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Prev Month
          </button>

          <h3 className="text-base font-black text-slate-900 font-mono">
            {monthNames[month]} {year}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-2 bg-white hover:bg-slate-200 border rounded-xl font-bold text-xs flex items-center gap-1 transition"
          >
            Next Month <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="p-6 text-xs flex-1">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center font-extrabold uppercase text-[10px] text-gray-500 tracking-wider">
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
            <div>SUN</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty Offset Days */}
            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`offset-${idx}`} className="h-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 opacity-40"></div>
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateObj = new Date(year, month, dayNum);
              const dateStr = dateObj.toISOString().split('T')[0];
              const dueCount = countsByDate[dateStr] || 0;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    onSelectDate(dateStr);
                    onClose();
                  }}
                  className={`h-20 p-2 rounded-2xl border flex flex-col justify-between cursor-pointer transition transform hover:-translate-y-0.5 hover:shadow-md ${
                    isToday
                      ? 'bg-amber-50/80 border-amber-400 font-bold ring-2 ring-amber-400'
                      : dueCount > 0
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-white border-gray-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-mono text-xs font-black ${isToday ? 'text-amber-900' : 'text-gray-800'}`}>
                      {dayNum}
                    </span>
                    {isToday && <span className="text-[9px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded">TODAY</span>}
                  </div>

                  {dueCount > 0 && (
                    <div className="bg-emerald-700 text-white font-mono text-[10px] font-extrabold py-1 px-1.5 rounded-xl text-center shadow-sm">
                      {dueCount} Service{dueCount > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
          >
            Close Calendar
          </button>
        </div>

      </div>
    </div>
  );
};
