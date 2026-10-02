import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Check } from 'lucide-react';
import { DailyTask } from '@dit/shared';
import { dailyTasksApi } from '../../api/dailyTasks';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/helpers';

interface DailyTaskRowProps {
  task: DailyTask;
  onEdit: () => void;
}

export default function DailyTaskRow({ task, onEdit }: DailyTaskRowProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (isCompleting: boolean) => 
      isCompleting ? dailyTasksApi.complete(task.id) : dailyTasksApi.uncomplete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyTasks'] });
    }
  });

  if (!user) return null;

  const myCompletion = task.completions?.find(c => c.userId === user.id);
  const partnerCompletion = task.completions?.find(c => c.userId !== user.id);

  const isCompletedByMe = !!myCompletion;
  const isCompletedByPartner = !!partnerCompletion;

  const compCount = (isCompletedByMe ? 1 : 0) + (isCompletedByPartner ? 1 : 0);

  const handleToggle = () => {
    toggleMutation.mutate(!isCompletedByMe);
  };

  // Accent color scheme (matching the rest of the app):
  // 🟢 Green: Both done (or individual completed)
  // 🟡 Yellow: 1 person done
  // 🔴 Red: Nobody done
  let accentColor = "bg-rose-500";
  let statusBadgeText = "Not done";
  let statusBadgeStyle = "bg-rose-50 text-rose-700 border-rose-200/60";

  if (task.isShared) {
    if (compCount === 2) {
      accentColor = "bg-emerald-500";
      statusBadgeText = "Both done ✓";
      statusBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    } else if (compCount === 1) {
      accentColor = "bg-amber-500";
      statusBadgeText = isCompletedByMe ? "You done (1/2)" : "Partner done (1/2)";
      statusBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200/60";
    }
  } else {
    if (isCompletedByMe) {
      accentColor = "bg-emerald-500";
      statusBadgeText = "Done ✓";
      statusBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    }
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex group transition-all hover:shadow-md",
      compCount === 2 && "bg-emerald-50/10 border-emerald-100"
    )}>
      {/* Left Accent Color Strip: Red, Yellow, or Green */}
      <div className={cn("w-1.5 flex-shrink-0 transition-colors", accentColor)} />

      <div className="p-4 flex-1 flex items-center justify-between">
        {/* Checkbox and Routine Title */}
        <div className="flex-1 min-w-0 pr-3 flex items-center">
          <button
            onClick={handleToggle}
            className={cn(
              "w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 mr-3.5 transition-all active:scale-90",
              isCompletedByMe 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                : "border-slate-300 bg-slate-50 hover:border-indigo-400"
            )}
            title={isCompletedByMe ? "Mark incomplete" : "Mark complete"}
          >
            {isCompletedByMe && <Check className="w-4 h-4" strokeWidth={3} />}
          </button>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <p className={cn(
                "font-semibold text-sm transition-colors",
                isCompletedByMe ? "text-slate-400 line-through" : "text-slate-800"
              )}>
                {task.title}
              </p>
              
              {/* Colorful status pill */}
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                statusBadgeStyle
              )}>
                {statusBadgeText}
              </span>
            </div>
          </div>
        </div>

        {/* Partner Status & Actions */}
        <div className="flex items-center space-x-3">
          {task.isShared && (
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-colors",
                isCompletedByPartner 
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                  : "border-slate-200 bg-slate-50"
              )}
              title={isCompletedByPartner ? "Partner completed" : "Partner pending"}
              >
                {isCompletedByPartner && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>
              <span className="text-[9px] font-medium text-slate-400 mt-0.5">Partner</span>
            </div>
          )}

          {/* Desktop Edit Button */}
          <button 
            onClick={onEdit}
            className="p-2 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity md:flex hidden rounded-xl hover:bg-slate-100"
            title="Edit Routine"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Mobile Edit Button */}
          <button 
            onClick={onEdit}
            className="p-2 text-slate-300 hover:text-slate-600 ml-0.5 md:hidden"
            title="Edit Routine"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
