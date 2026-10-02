import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Todo } from '@dit/shared';
import { todosApi } from '../../api/todos';
import TodoItem from './TodoItem';
import TodoForm from './TodoForm';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';

export default function TodosSection() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: todosApi.getAll,
  });

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => setEditingTodo(null), 200);
  };

  if (isLoading) {
    return (
      <div className="py-4 px-6 flex justify-center">
        <LoadingSpinner className="text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  // Sort: Incomplete first, then completed. If both incomplete, sort by dueDate (soonest first)
  const sortedTodos = [...(todos || [])].sort((a, b) => {
    const aDone = (a.status || '').toLowerCase() === 'completed';
    const bDone = (b.status || '').toLowerCase() === 'completed';
    if (aDone !== bDone) {
      return aDone ? 1 : -1;
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="py-4 relative">
      <div className="px-6 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">To-Do List</h2>
      </div>

      <div className="px-6 space-y-3 pb-6">
        {sortedTodos.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-slate-100 border-dashed">
            <p className="text-slate-500 mb-2">No tasks to do!</p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="text-sm font-medium text-indigo-600"
            >
              Add a new task
            </button>
          </div>
        ) : (
          sortedTodos.map(todo => (
            <TodoItem key={todo.id} todo={todo} onEdit={() => handleEdit(todo)} />
          ))
        )}
      </div>

      {/* Floating Action Button (Mobile) / Regular Button (Desktop) */}
      <div className="px-6 flex justify-center">
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="rounded-full shadow-lg h-14 md:h-11 px-6 md:w-full md:rounded-xl md:shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Todo
        </Button>
      </div>

      <TodoForm 
        isOpen={isFormOpen} 
        onClose={handleCloseForm} 
        initialData={editingTodo || undefined} 
      />
    </div>
  );
}
