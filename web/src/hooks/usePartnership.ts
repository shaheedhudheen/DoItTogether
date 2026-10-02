import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnershipApi } from '../api/partnership';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export const usePartnership = () => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const { data: partnership, isLoading } = useQuery({
    queryKey: ['partnership'],
    queryFn: async () => {
      const p = await partnershipApi.get();
      if (p && user && user.partnershipId !== p.id) {
        updateUser({ partnershipId: p.id } as any);
      }
      return p;
    },
    enabled: !!user,
  });

  const invite = useMutation({
    mutationFn: partnershipApi.invite,
    onSuccess: (data) => {
      updateUser({ partnershipId: data.partnership.id } as any);
      queryClient.setQueryData(['partnership'], data.partnership);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Invite code generated!');
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate invite');
    },
  });

  const join = useMutation({
    mutationFn: (data: { inviteCode: string }) => partnershipApi.join(data),
    onSuccess: (partnership) => {
      updateUser({ partnershipId: partnership.id } as any);
      queryClient.invalidateQueries({ queryKey: ['partnership'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Successfully joined partnership!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to join partnership');
    },
  });

  const leave = useMutation({
    mutationFn: partnershipApi.leave,
    onSuccess: () => {
      updateUser({ partnershipId: null } as any);
      queryClient.setQueryData(['partnership'], null);
      queryClient.clear();
      toast.success('Partnership dissolved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to dissolve partnership');
    },
  });

  // Determine the partner info from the partnership
  const partner = partnership
    ? partnership.user1Id === user?.id
      ? partnership.user2
      : partnership.user1
    : null;

  return {
    partnership,
    partner,
    isLoading,
    invite,
    join,
    leave,
  };
};
