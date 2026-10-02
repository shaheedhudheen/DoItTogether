import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, CheckCircle2, PlusCircle, Check, Circle } from 'lucide-react';
import { calendarApi } from '../../api/calendar';
import LoadingSpinner from '../ui/LoadingSpinner';
import { cn } from '../../utils/helpers';
import { PRAYER_LABELS } from '@dit/shared';
import { useAuthStore } from '../../store/authStore';

interface CalendarDayDetailProps {
  date: Date | null;
  onClose: () => void;
}

export default function CalendarDayDetail({ date, onClose }: CalendarDayDetailProps) {
  const { user } = useAuthStore();
  if (!date) return null;

  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', 'day', dateStr],
    queryFn: () => calendarApi.getDay(dateStr),
    enabled: !!user?.partnershipId,
  });

  return (
    <div className={cn(
      "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out flex flex-col md:relative md:rounded-3xl md:shadow-sm md:border md:border-slate-100",
      date ? "translate-y-0" : "translate-y-full md:translate-y-0 md:opacity-0 md:pointer-events-none"
    )} style={{ maxHeight: '82vh' }}>
      
      {/* Mobile top pill handle */}
      <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800">
            {format(date, 'EEEE, MMM d')}
          </h3>
          <p className="text-xs text-slate-400">Activity snapshot for this day</p>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner className="text-indigo-600 w-8 h-8" />
          </div>
        ) : !data ? (
          <div className="text-center py-10 text-slate-500">No activity recorded for this day.</div>
        ) : (
          <>
            {/* 1. Daily Routines Progress */}
            {data.dailyTasks && data.dailyTasks.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    Daily Routines Progress
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {data.dailyTasks.filter(t => t.completedByMe && t.completedByPartner).length}/{data.dailyTasks.length} Both Done
                  </span>
                </div>

                <div className="space-y-2">
                  {data.dailyTasks.map(task => {
                    const isBoth = task.completedByMe && task.completedByPartner;
                    const isOne = (task.completedByMe || task.completedByPartner) && !isBoth;
                    const isNone = !task.completedByMe && !task.completedByPartner;

                    let accentColor = "bg-rose-500";
                    let badgeText = "Not Done";
                    let badgeStyle = "bg-rose-50 text-rose-700 border-rose-200/60";

                    if (isBoth) {
                      accentColor = "bg-emerald-500";
                      badgeText = "Both Done ✓";
                      badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
                    } else if (isOne) {
                      accentColor = "bg-amber-500";
                      badgeText = task.completedByMe ? "You Done (1/2)" : "Partner Done (1/2)";
                      badgeStyle = "bg-amber-50 text-amber-800 border-amber-200/60";
                    }

                    return (
                      <div 
                        key={task.taskId} 
                        className={cn(
                          "rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex items-center justify-between p-3.5 transition-all",
                          isBoth && "bg-emerald-50/10 border-emerald-100"
                        )}
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-3">
                          <div className={cn("w-1.5 h-7 rounded-full shrink-0", accentColor)} />
                          <div className="min-w-0">
                            <p className={cn(
                              "font-semibold text-sm truncate",
                              isBoth ? "text-slate-800" : isNone ? "text-slate-600" : "text-slate-700"
                            )}>
                              {task.title}
                            </p>
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-1",
                              badgeStyle
                            )}>
                              {badgeText}
                            </span>
                          </div>
                        </div>

                        {/* Partner & You Completion Badges */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                            task.completedByMe 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "border-slate-200 text-slate-300 bg-slate-50"
                          )} title={task.completedByMe ? "Completed by You" : "Not completed by You"}>
                            {task.completedByMe ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : "Me"}
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                            task.completedByPartner 
                              ? "bg-emerald-500 border-emerald-500 text-white" 
                              : "border-slate-200 text-slate-300 bg-slate-50"
                          )} title={task.completedByPartner ? "Completed by Partner" : "Not completed by Partner"}>
                            {task.completedByPartner ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : "P"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 2. Common Tasks Completed on this day */}
            {data.commonTasksCompleted && data.commonTasksCompleted.length > 0 && (
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Common Tasks Completed ({data.commonTasksCompleted.length})
                </h4>
                <div className="space-y-2">
                  {data.commonTasksCompleted.map(task => (
                    <div key={task.id} className="flex items-center bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-2xl">
                      <span className="text-2xl mr-3 filter drop-shadow-sm">{task.emoji || '✨'}</span>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-sm text-slate-800 line-clamp-1">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                        Completed ✓
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. Common Tasks Added on this day */}
            {data.commonTasksAdded && data.commonTasksAdded.length > 0 && (
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-500" />
                  Common Tasks Added ({data.commonTasksAdded.length})
                </h4>
                <div className="space-y-2">
                  {data.commonTasksAdded.map(task => (
                    <div key={task.id} className="flex items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                      <span className="text-2xl mr-3">{task.emoji || '✨'}</span>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-sm text-slate-800 line-clamp-1">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                        {task.createdBy?.displayName ? `Added by ${task.createdBy.displayName}` : 'New task'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Prayers on this day (if prayers exist) */}
            {data.prayers && data.prayers.length > 0 && (
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Daily Prayers
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {data.prayers.map(prayer => {
                    const isBoth = prayer.completedByMe && prayer.completedByPartner;
                    const isOne = (prayer.completedByMe || prayer.completedByPartner) && !isBoth;

                    let colorClasses = "border-rose-200 bg-rose-50/70 text-rose-800";
                    let subtext = "None";

                    if (isBoth) {
                      colorClasses = "border-emerald-500 bg-emerald-500 text-white";
                      subtext = "Both ✓";
                    } else if (isOne) {
                      colorClasses = "border-amber-300 bg-amber-50 text-amber-900";
                      subtext = prayer.completedByMe ? "You ✓" : "Partner ✓";
                    }

                    return (
                      <div
                        key={prayer.name}
                        className={cn(
                          "py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center border-2 text-center",
                          colorClasses
                        )}
                      >
                        <span className="text-xs font-bold tracking-tight">
                          {PRAYER_LABELS[prayer.name]}
                        </span>
                        <span className="text-[9px] mt-0.5 tracking-tight font-medium opacity-90">
                          {subtext}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty state when absolutely nothing on this day */}
            {(!data.dailyTasks || data.dailyTasks.length === 0) &&
             (!data.commonTasksCompleted || data.commonTasksCompleted.length === 0) &&
             (!data.commonTasksAdded || data.commonTasksAdded.length === 0) &&
             (!data.prayers || data.prayers.length === 0) && (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Circle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">No activity recorded on this day.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
