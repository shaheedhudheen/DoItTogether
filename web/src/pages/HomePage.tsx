import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePartnership } from '../hooks/usePartnership';
import CommonTasksSection from '../components/common-tasks/CommonTasksSection';
import DailyTasksSection from '../components/daily-tasks/DailyTasksSection';
import PrayerSection from '../components/prayer/PrayerSection';
import TodosSection from '../components/todos/TodosSection';
import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { user } = useAuthStore();
  const { partnership } = usePartnership();

  if (!user?.partnershipId) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleCopyCode = () => {
    if (partnership?.inviteCode) {
      navigator.clipboard.writeText(partnership.inviteCode);
      toast.success('Invite code copied to clipboard!');
    }
  };

  return (
    <div className="w-full pb-6 animate-in fade-in duration-500">
      {/* Header */}
      <header className="px-6 py-4 pt-safe flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-30">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Today</h1>
          <p className="text-sm font-medium text-slate-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border-2 border-indigo-200">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Pending Partner Banner */}
      {partnership?.status === 'pending' && (
        <div className="mx-6 mb-4 p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Waiting for partner</p>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Share code with your partner: <span className="font-mono font-black text-indigo-700 text-base tracking-widest">{partnership.inviteCode}</span>
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-white text-indigo-600 font-semibold text-xs border border-indigo-200 shadow-xs hover:bg-indigo-50 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy Code
          </button>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-2">
        <CommonTasksSection />
        
        <div className="h-px bg-slate-200 mx-6" />
        
        <DailyTasksSection />
        
        {user.prayerEnabled && (
          <>
            <div className="h-px bg-slate-200 mx-6" />
            <PrayerSection />
          </>
        )}
        
        <div className="h-px bg-slate-200 mx-6" />
        
        <TodosSection />
      </div>
    </div>
  );
}
