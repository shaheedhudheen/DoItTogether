import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateCommonTaskInput, createCommonTaskSchema, CommonTask } from '@dit/shared';
import { commonTasksApi } from '../../api/commonTasks';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface CommonTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CommonTask;
}

export default function CommonTaskForm({ isOpen, onClose, initialData }: CommonTaskFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateCommonTaskInput>({
    resolver: zodResolver(createCommonTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      emoji: '✨',
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description || '',
        emoji: initialData.emoji || '✨',
      });
    } else {
      reset({
        title: '',
        description: '',
        emoji: '✨',
      });
    }
  }, [initialData, isOpen, reset]);

  const mutation = useMutation({
    mutationFn: (data: CreateCommonTaskInput) => 
      isEditing 
        ? commonTasksApi.update(initialData.id, data) 
        : commonTasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commonTasks'] });
      toast.success(isEditing ? 'Task updated' : 'Task created');
      onClose();
    },
    onError: () => {
      toast.error('Failed to save task');
    }
  });

  const onSubmit = (data: CreateCommonTaskInput) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Task" : "New Common Task"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex space-x-3">
          <div className="w-20">
            <Input 
              label="Emoji" 
              {...register('emoji')} 
              error={errors.emoji?.message}
              className="text-center text-xl"
            />
          </div>
          <div className="flex-1">
            <Input 
              label="Title" 
              placeholder="e.g. Clean the kitchen"
              {...register('title')} 
              error={errors.title?.message}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            {...register('description')}
            className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none"
            placeholder="Details about this task..."
          />
          {errors.description && <p className="text-sm text-rose-500">{errors.description.message}</p>}
        </div>

        <div className="pt-4 flex space-x-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={mutation.isPending}>
            {isEditing ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
