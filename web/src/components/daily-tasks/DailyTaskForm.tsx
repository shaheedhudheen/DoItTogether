import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateDailyTaskInput, createDailyTaskSchema, DailyTask } from '@dit/shared';
import { dailyTasksApi } from '../../api/dailyTasks';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface DailyTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: DailyTask;
}

export default function DailyTaskForm({
  isOpen,
  onClose,
  initialData,
}: DailyTaskFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateDailyTaskInput>({
    resolver: zodResolver(createDailyTaskSchema),
    defaultValues: {
      title: '',
      isShared: true,
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        isShared: initialData.isShared ?? true,
      });
    } else {
      reset({
        title: '',
        isShared: true,
      });
    }
  }, [initialData, isOpen, reset]);

  const mutation = useMutation({
    mutationFn: (data: CreateDailyTaskInput) => 
      isEditing 
        ? dailyTasksApi.update(initialData.id, data) 
        : dailyTasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyTasks'] });
      toast.success(isEditing ? 'Routine updated' : 'Routine created');
      onClose();
    },
    onError: () => {
      toast.error('Failed to save routine');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => dailyTasksApi.delete(initialData!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyTasks'] });
      toast.success('Routine deleted');
      onClose();
    }
  });

  const onSubmit = (data: CreateDailyTaskInput) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Routine" : "New Daily Routine"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        
        {/* Title */}
        <Input 
          label="Routine Title" 
          placeholder="e.g. 30m Workout, Eat dinner together, Read 15 pages"
          {...register('title')} 
          error={errors.title?.message}
          autoFocus
        />

        {/* Shared checkbox */}
        <div className="flex items-center space-x-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
          <input
            type="checkbox"
            id="isShared"
            {...register('isShared')}
            className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="flex flex-col">
            <label htmlFor="isShared" className="text-sm font-semibold text-slate-800 cursor-pointer">
              Both of us do this routine
            </label>
            <span className="text-xs text-slate-500">
              Track completions for both You and your Partner
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col space-y-2">
          <Button type="submit" className="w-full" isLoading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Routine'}
          </Button>
          
          {isEditing && (
            <Button 
              type="button" 
              variant="danger" 
              className="w-full"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('Delete this routine forever?')) {
                  deleteMutation.mutate();
                }
              }}
            >
              Delete Routine
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
