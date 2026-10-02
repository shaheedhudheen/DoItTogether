import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../../api/calendar';
import { cn } from '../../utils/helpers';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';

interface CalendarGridProps {
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
}

export default function CalendarGrid({ onSelectDate, selectedDate }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { user } = useAuthStore();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  
  // Format for API: YYYY-MM-DD
  const fromStr = format(monthStart, 'yyyy-MM-dd');
  const toStr = format(monthEnd, 'yyyy-MM-dd');

  const { data: summaries, isLoading } = useQuery({
    queryKey: ['calendar', 'range', fromStr, toStr],
    queryFn: () => calendarApi.getRange(fromStr, toStr),
    enabled: !!user?.partnershipId,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Pad the beginning of the month with empty cells to align days of week
  const startDayOfWeek = monthStart.getDay();
  const padding = Array.from({ length: startDayOfWeek }).map((_, i) => (
    <div key={`padding-${i}`} className="h-12 w-12" />
  ));

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex space-x-2">
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-slate-400">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <LoadingSpinner className="text-indigo-600 w-8 h-8" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {padding}
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const summary = summaries?.[dateStr];
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDate(day)}
                className={cn(
                  "relative flex flex-col items-center justify-center h-12 w-full rounded-2xl transition-all",
                  !isSameMonth(day, currentMonth) && "text-slate-300",
                  isSelected && "bg-indigo-600 text-white shadow-md font-bold",
                  !isSelected && isToday(day) && "bg-indigo-50 text-indigo-600 font-bold border border-indigo-200",
                  !isSelected && !isToday(day) && "hover:bg-slate-100 text-slate-700"
                )}
              >
                <span className="text-sm">{format(day, 'd')}</span>
                
                {/* Dots indicator container */}
                {summary && (
                  <div className="absolute bottom-1.5 flex space-x-0.5">
                    {summary.totalCommonTasks > 0 && (
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        summary.completedCommonTasks === summary.totalCommonTasks ? "bg-emerald-400" : "bg-amber-400"
                      )} />
                    )}
                    {summary.totalDailyTasks > 0 && (
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        summary.completedDailyTasks === summary.totalDailyTasks ? "bg-emerald-400" : "bg-amber-400"
                      )} />
                    )}
                    {summary.totalPrayers > 0 && (
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        summary.completedPrayers === summary.totalPrayers ? "bg-emerald-400" : "bg-indigo-400"
                      )} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
