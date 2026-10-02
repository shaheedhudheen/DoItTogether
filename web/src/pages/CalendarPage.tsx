import { useState } from 'react';
import CalendarGrid from '../components/calendar/CalendarGrid';
import CalendarDayDetail from '../components/calendar/CalendarDayDetail';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  return (
    <div className="w-full h-full flex flex-col pt-safe animate-in fade-in duration-500 relative">
      <header className="px-6 py-4 shrink-0">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Calendar</h1>
        <p className="text-sm font-medium text-slate-500">Review your past activity</p>
      </header>

      <div className="px-4 pb-24 md:pb-6 flex-1 flex flex-col md:flex-row gap-6 max-w-5xl mx-auto w-full">
        {/* Left Side: Grid */}
        <div className="flex-1 md:max-w-md shrink-0">
          <CalendarGrid onSelectDate={setSelectedDate} selectedDate={selectedDate} />
        </div>

        {/* Right Side / Bottom Sheet: Detail */}
        {selectedDate && (
          <div className="flex-1 z-50">
            {/* Dark overlay for mobile */}
            <div 
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm md:hidden z-40 transition-opacity" 
              onClick={() => setSelectedDate(null)}
            />
            
            <div className="relative z-50 w-full h-full max-h-full">
              <CalendarDayDetail date={selectedDate} onClose={() => setSelectedDate(null)} />
            </div>
          </div>
        )}
        
        {/* Desktop empty state when no date selected */}
        {!selectedDate && (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
            <p>Select a date to view activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
