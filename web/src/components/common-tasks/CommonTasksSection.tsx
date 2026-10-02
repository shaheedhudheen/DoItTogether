import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { commonTasksApi } from '../../api/commonTasks';
import CommonTaskCard from './CommonTaskCard';
import CommonTaskForm from './CommonTaskForm';
import { CommonTask } from '@dit/shared';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function CommonTasksSection() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CommonTask | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['commonTasks'],
    queryFn: commonTasksApi.getAll,
  });

  const handleEdit = (task: CommonTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => setEditingTask(null), 200); // delay to prevent flash
  };

  if (isLoading) {
    return (
      <div className="py-4 px-6 flex justify-center">
        <LoadingSpinner className="text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="px-6 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Our Common Tasks</h2>
      </div>
      
      <div className="flex overflow-x-auto px-6 pb-4 pt-1 space-x-4 snap-x snap-mandatory no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-x-0 md:px-6">
        {tasks?.map((task) => (
          <div key={task.id} className="snap-start shrink-0 w-[160px] md:w-auto">
            <CommonTaskCard task={task} onEdit={() => handleEdit(task)} />
          </div>
        ))}
        
        <div className="snap-start shrink-0 w-[160px] md:w-auto">
          <button 
            onClick={() => setIsFormOpen(true)}
            className="w-full h-full min-h-[160px] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-medium text-sm">Add Task</span>
          </button>
        </div>
      </div>

      <CommonTaskForm 
        isOpen={isFormOpen} 
        onClose={handleCloseForm} 
        initialData={editingTask || undefined} 
      />
    </div>
  );
}
