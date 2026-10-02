import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PRAYER_NAMES, PRAYER_LABELS, PrayerName } from '@dit/shared';
import { prayerApi } from '../../api/prayer';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/helpers';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Check } from 'lucide-react';

export default function PrayerSection() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: prayers, isLoading } = useQuery({
    queryKey: ['prayers', 'today'],
    queryFn: prayerApi.getToday,
    enabled: !!user?.prayerEnabled,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, isCompleting }: { name: PrayerName; isCompleting: boolean }) => 
      isCompleting ? prayerApi.complete(name) : prayerApi.uncomplete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers', 'today'] });
    }
  });

  if (!user?.prayerEnabled) return null;

  if (isLoading) {
    return (
      <div className="py-4 px-6 flex justify-center">
        <LoadingSpinner className="text-indigo-600 w-6 h-6" />
      </div>
    );
  }

  const handleToggle = (name: PrayerName) => {
    const prayer = prayers?.find(p => p.name === name);
    const myCompletion = prayer?.completions?.find(c => c.userId === user.id);
    toggleMutation.mutate({ name, isCompleting: !myCompletion });
  };

  // Calculate overall stats for today
  let completedTogetherCount = 0;
  PRAYER_NAMES.forEach(name => {
    const prayer = prayers?.find(p => p.name === name);
    const me = !!prayer?.completions?.find(c => c.userId === user.id);
    const partner = !!prayer?.completions?.find(c => c.userId !== user.id);
    if (me && partner) completedTogetherCount++;
  });

  return (
    <div className="py-4">
      {/* Header with Title and Progress */}
      <div className="px-6 mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daily Prayers</h2>
          <p className="text-xs text-slate-400">Track 5 daily prayers together</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          {completedTogetherCount}/5 Both Done
        </span>
      </div>

      <div className="px-6 space-y-3">
        {/* Single Unified 5-Prayer Buttons Row */}
        <div className="grid grid-cols-5 gap-2">
          {PRAYER_NAMES.map(name => {
            const prayer = prayers?.find(p => p.name === name);
            const isCompletedByMe = !!prayer?.completions?.find(c => c.userId === user.id);
            const isCompletedByPartner = !!prayer?.completions?.find(c => c.userId !== user.id);

            const count = (isCompletedByMe ? 1 : 0) + (isCompletedByPartner ? 1 : 0);

            // Color scheme based on completion:
            // 🔴 Red accent: Nobody prayed yet (0 of 2)
            // 🟡 Yellow accent: Exactly 1 person prayed (1 of 2)
            // 🟢 Green accent: Both prayed (2 of 2)
            let colorClasses = "border-rose-200 bg-rose-50/70 text-rose-800 hover:border-rose-300";
            let subtext = "None";
            let subtextClasses = "text-rose-400";

            if (count === 2) {
              colorClasses = "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200";
              subtext = "Both ✓";
              subtextClasses = "text-emerald-100";
            } else if (count === 1) {
              colorClasses = "border-amber-300 bg-amber-50 text-amber-900 shadow-sm";
              subtext = isCompletedByMe ? "You ✓" : "Partner ✓";
              subtextClasses = "text-amber-700 font-semibold";
            }

            return (
              <button
                key={name}
                onClick={() => handleToggle(name)}
                className={cn(
                  "py-3 px-1 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-200 active:scale-95 focus:outline-none select-none",
                  colorClasses
                )}
                title={`Tap to toggle your ${PRAYER_LABELS[name]}. Current status: ${count === 2 ? 'Both completed' : count === 1 ? (isCompletedByMe ? 'You completed, partner pending' : 'Partner completed, you pending') : 'Neither completed'}`}
              >
                {/* Checkmark or circle icon */}
                <div className="mb-1">
                  {count === 2 ? (
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                  ) : count === 1 ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-300" />
                  )}
                </div>

                {/* Prayer name inside round button */}
                <span className="text-xs font-bold tracking-tight">
                  {PRAYER_LABELS[name]}
                </span>

                {/* Subtext indicating who completed */}
                <span className={cn("text-[9px] mt-0.5 tracking-tight", subtextClasses)}>
                  {subtext}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
