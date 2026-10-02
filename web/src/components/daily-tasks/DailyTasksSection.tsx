import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { DailyTask } from '@dit/shared';
import { dailyTasksApi } from '../../api/dailyTasks';
import { useAuthStore } from '../../store/authStore';
import DailyTaskRow from './DailyTaskRow';
import DailyTaskForm from './DailyTaskForm';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function DailyTasksSection() {
  const { user } = useAuthStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['dailyTasks'],
    queryFn: dailyTasksApi.getAll,
  });

  const handleEdit = (task: DailyTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => setEditingTask(null), 200);
  };

  if (isLoading) {
    return (
      <div className="py-4 px-6 flex justify-center">
        <LoadingSpinner className="text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  // Count how many shared routines are completed by both partners today
  const totalRoutines = tasks?.length || 0;
  const completedTogetherCount = tasks?.filter(t => {
    const me = t.completions?.some(c => c.userId === user?.id);
    const partner = t.completions?.some(c => c.userId !== user?.id);
    return t.isShared ? (me && partner) : me;
  }).length || 0;

  return (
    <div className="py-4">
      <div className="px-6 mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daily Routines</h2>
          <p className="text-xs text-slate-400">Repeating daily habits</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {totalRoutines > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {completedTogetherCount}/{totalRoutines} Done
            </span>
          )}
          <button 
            onClick={() => setIsFormOpen(true)}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors shadow-sm"
            title="Add Routine"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-6 space-y-2.5">
        {!tasks || tasks.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-slate-100 border-dashed">
            <p className="text-slate-500 mb-2">No daily routines yet.</p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              + Add your first routine
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <DailyTaskRow key={task.id} task={task} onEdit={() => handleEdit(task)} />
          ))
        )}
      </div>

      <DailyTaskForm 
        isOpen={isFormOpen} 
        onClose={handleCloseForm} 
        initialData={editingTask || undefined} 
      />
    </div>
  );
}
