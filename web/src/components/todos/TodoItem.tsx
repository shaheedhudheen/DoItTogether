import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Calendar as CalendarIcon, Check, Users, Eye, Lock } from 'lucide-react';
import { Todo } from '@dit/shared';
import { todosApi } from '../../api/todos';
import { useAuthStore } from '../../store/authStore';
import { cn, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface TodoItemProps {
  todo: Todo;
  onEdit: () => void;
}

export default function TodoItem({ todo, onEdit }: TodoItemProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (isCompleting: boolean) => 
      isCompleting ? todosApi.complete(todo.id) : todosApi.uncomplete(todo.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Cannot modify this task');
    }
  });

  if (!user) return null;

  const isMyTask = todo.createdById === user.id;
  const canInteract = todo.assignedToBoth || isMyTask;

  // Completion statuses
  const myCompletion = todo.completions?.find(c => c.userId === user.id);
  const isCompletedByMe = !!myCompletion;

  // For individual task assigned to partner: has the partner completed it?
  const isCompletedByOwner = !!todo.completions?.find(c => c.userId === todo.createdById);

  // Is this item visually considered done for the current viewer?
  const isMarkedDone = canInteract ? isCompletedByMe : isCompletedByOwner;

  const handleToggle = () => {
    if (!canInteract) {
      toast('This task is for your partner only. You can view it to remind them!', {
        icon: '👀',
      });
      return;
    }
    toggleMutation.mutate(!isCompletedByMe);
  };

  // Determine status color based on overall status:
  // - Green: Fully completed
  // - Yellow: Assigned to both and only 1 has completed
  // - Red: Not completed
  const statusLower = (todo.status || '').toLowerCase();
  let statusColor = "bg-rose-500"; // not completed / pending
  if (todo.assignedToBoth) {
    if (statusLower === 'completed') statusColor = "bg-emerald-500";
    else if (statusLower === 'partial') statusColor = "bg-amber-500";
  } else {
    // Single assignee task: green if completed, red if pending
    if (statusLower === 'completed' || isCompletedByOwner) statusColor = "bg-emerald-500";
  }

  const partnerName = todo.createdBy?.displayName || 'Partner';

  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex group transition-all",
      !canInteract && "bg-slate-50/40"
    )}>
      {/* Status indicator line on the left */}
      <div className={cn("w-1.5 flex-shrink-0 transition-colors", statusColor)} />
      
      <div className="p-4 flex-1 flex items-start">
        {/* Checkbox button */}
        {canInteract ? (
          <button
            onClick={handleToggle}
            className={cn(
              "mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mr-3 transition-all active:scale-90",
              isCompletedByMe 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                : "border-slate-300 bg-slate-50 hover:border-indigo-400"
            )}
            title={isCompletedByMe ? "Mark incomplete" : "Mark complete"}
          >
            {isCompletedByMe && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
          </button>
        ) : (
          <div
            onClick={handleToggle}
            className={cn(
              "mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mr-3 cursor-not-allowed transition-colors",
              isCompletedByOwner
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-slate-200 bg-slate-100/70 text-slate-300"
            )}
            title={`${partnerName}'s task (view only)`}
          >
            {isCompletedByOwner ? (
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            ) : (
              <Lock className="w-2.5 h-2.5 text-slate-400" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 pr-2">
          <p className={cn(
            "font-semibold text-sm transition-colors",
            isMarkedDone ? "text-slate-400 line-through" : "text-slate-800"
          )}>
            {todo.title}
          </p>

          {todo.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {todo.description}
            </p>
          )}
          
          <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-slate-500">
            {/* Due date if set */}
            {todo.dueDate && (
              <span className="flex items-center text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                <CalendarIcon className="w-3 h-3 mr-1 text-slate-400" />
                {formatDate(todo.dueDate)}
              </span>
            )}
            
            {/* Assignment Badge */}
            {todo.assignedToBoth ? (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-indigo-100">
                <Users className="w-3 h-3" />
                Both of us
              </span>
            ) : isMyTask ? (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-slate-200">
                For You
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-200/60" title="Only partner can complete this task">
                <Eye className="w-3 h-3" />
                {partnerName}'s task
              </span>
            )}

            {/* In-progress hint if assigned to both and 1 completed */}
            {todo.assignedToBoth && statusLower === 'partial' && (
              <span className="text-[10px] font-medium text-amber-600">
                {isCompletedByMe ? "Waiting for partner..." : "Partner completed! Your turn"}
              </span>
            )}
          </div>
        </div>

        {/* Edit button: Only the task owner or either partner if assignedToBoth */}
        {canInteract && (
          <button 
            onClick={onEdit}
            className="p-2 -mt-1 -mr-2 text-slate-300 hover:text-indigo-600 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-lg hover:bg-slate-50"
            title="Edit task"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
