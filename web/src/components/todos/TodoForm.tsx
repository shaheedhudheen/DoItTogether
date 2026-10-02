import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateTodoInput, createTodoSchema, Todo } from '@dit/shared';
import { todosApi } from '../../api/todos';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface TodoFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Todo;
}

export default function TodoForm({ isOpen, onClose, initialData }: TodoFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<CreateTodoInput>({
    resolver: zodResolver(createTodoSchema),
    defaultValues: {
      title: '',
      assignedToBoth: true,
      dueDate: undefined,
    }
  });

  const assignedToBoth = watch('assignedToBoth');

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        assignedToBoth: initialData.assignedToBoth,
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : undefined,
      });
    } else {
      reset({
        title: '',
        assignedToBoth: true,
        dueDate: undefined,
      });
    }
  }, [initialData, isOpen, reset]);

  const mutation = useMutation({
    mutationFn: (data: CreateTodoInput) => 
      isEditing 
        ? todosApi.update(initialData.id, data) 
        : todosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      toast.success(isEditing ? 'Task updated' : 'Task created');
      onClose();
    },
    onError: () => {
      toast.error('Failed to save task');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => todosApi.delete(initialData!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      toast.success('Task deleted');
      onClose();
    }
  });

  const onSubmit = (data: CreateTodoInput) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Task" : "New Task"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        <Input 
          label="What needs to be done?" 
          placeholder="e.g. Buy groceries"
          {...register('title')} 
          error={errors.title?.message}
        />

        <Input 
          label="Due Date (Optional)" 
          type="date"
          {...register('dueDate')} 
          error={errors.dueDate?.message}
        />

        <div className="flex items-center space-x-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
          <input
            type="checkbox"
            id="assignedToBoth"
            {...register('assignedToBoth')}
            className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="flex flex-col">
            <label htmlFor="assignedToBoth" className="text-sm font-semibold text-slate-800 cursor-pointer">
              Assign to both of us
            </label>
            <span className="text-xs text-slate-500">
              {assignedToBoth 
                ? "Both partners must check it off to complete" 
                : "For me only (my partner can see it to remind me, but only I can complete it)"}
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-col space-y-2">
          <Button type="submit" className="w-full" isLoading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Task'}
          </Button>
          
          {isEditing && (
            <Button 
              type="button" 
              variant="danger" 
              className="w-full"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('Delete this task forever?')) {
                  deleteMutation.mutate();
                }
              }}
            >
              Delete Task
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
