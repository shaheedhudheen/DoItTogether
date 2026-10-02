import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { CommonTask } from '@dit/shared';
import { commonTasksApi } from '../../api/commonTasks';
import toast from 'react-hot-toast';
import { cn } from '../../utils/helpers';

interface CommonTaskCardProps {
  task: CommonTask;
  onEdit: () => void;
}

export default function CommonTaskCard({ task, onEdit }: CommonTaskCardProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => commonTasksApi.delete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commonTasks'] });
      toast.success('Task deleted');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => commonTasksApi.complete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commonTasks'] });
      toast.success('Task marked as completed!');
    },
  });

  const isCompleted = (task.status || '').toLowerCase() === 'completed';

  return (
    <div className={cn(
      "relative bg-white rounded-2xl shadow-sm border p-4 flex flex-col h-[170px] transition-all overflow-hidden group",
      isCompleted ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 hover:shadow-md"
    )}>
      {/* Decorative top border */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isCompleted ? "bg-emerald-400" : "bg-indigo-400"
      )} />

      <div className="flex justify-between items-start mb-2">
        <span className="text-3xl filter drop-shadow-sm">{task.emoji || '✨'}</span>
        <div className="flex space-x-1 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onEdit}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this task?')) {
                deleteMutation.mutate();
              }
            }}
            className="p-1.5 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <h3 className={cn(
        "font-bold text-sm leading-tight mb-1 line-clamp-1",
        isCompleted ? "text-emerald-900 line-through" : "text-slate-800"
      )}>{task.title}</h3>
      
      <p className="text-xs text-slate-500 line-clamp-2 flex-1">{task.description}</p>
      
      {!isCompleted ? (
        <button 
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
          className="mt-2 w-full py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
        >
          Mark Complete
        </button>
      ) : (
        <div className="mt-2 w-full py-1.5 rounded-xl text-xs font-semibold text-center bg-emerald-100 text-emerald-700">
          Completed ✓
        </div>
      )}
    </div>
  );
}
